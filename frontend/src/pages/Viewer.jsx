import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiUrl, diffUrl, fetchGaia, fetchPhotometry, fetchSky, fetchTargets, withParams } from '../api.js'
import AladinView from '../components/AladinView.jsx'
import PhotometryChart from '../components/PhotometryChart.jsx'
import PlayerControls from '../components/PlayerControls.jsx'
import Sidebar, { backgroundUrl } from '../components/Sidebar.jsx'
import WithHelp from '../components/WithHelp.jsx'
import ViewCaption from '../components/ViewCaption.jsx'
import Tour, { TOUR_KEYS, VIEWER_TOUR, tourAlreadySeen } from '../components/Tour.jsx'
import { getPhot, isMeasuring, measureOnce, photKey, savePhot } from '../photCache.js'
import { dateTimeLabel, monthLabel, useI18n, withLang } from '../i18n/index.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'

// Estado del visor = parámetros de la URL (copiar el link reproduce la misma vista).
const DEFAULTS = {
  fov: 10, det: 'ALL', mode: 'blink', stretch: 'asinh', speed: 500,
  opacity: 1, bg: 'none', gaia: true, invert: false, mark: true,
}
// Columnas de la tabla de fotometría: [encabezado, término del glosario, qué es]
const TABLE_COLUMNS = [
  ['colFrame', 'frame'], ['colDet', 'detector'], ['colWave', 'wavelength'], ['colMjd', 'mjd'],
  ['colFlux', 'flux'], ['colErr', 'uncertainty'], ['colFlag', 'flagged-pixel'],
]
const MIN_ARROW_SPEED = 0.5 // arcsec/año: más lento que esto la flecha no se vería
const LOADER_SPACE = 56 + 24 // ancho del gatito de carga + separación con el recuadro
const CAPTURE_SPACE = 170 + 24 // ancho del panel "Capturalo" + separación con el recuadro
const MAX_FRAMES = 40 // modo "frames": cada frame es una capa; más que esto satura el navegador
const SLOW_QUERY_MS = 12000 // si /api/sky tarda más que esto, se avisa que el lento es el archivo de SPHEREx

function readState(sp) {
  const num = (k, d) => {
    const v = parseFloat(sp.get(k))
    return Number.isFinite(v) ? v : d
  }
  const ra = num('ra', null)
  const dec = num('dec', null)
  return {
    target: sp.get('target'),
    ra, dec,
    coordsText: ra != null && dec != null ? `${ra} ${dec}` : '',
    fov: Math.min(30, Math.max(1, num('fov', DEFAULTS.fov))),
    det: sp.get('det') ?? DEFAULTS.det,
    mode: sp.get('mode') ?? DEFAULTS.mode,
    stretch: sp.get('stretch') ?? DEFAULTS.stretch,
    speed: num('speed', DEFAULTS.speed),
    opacity: num('opacity', DEFAULTS.opacity),
    bg: sp.get('bg') ?? DEFAULTS.bg,
    gaia: sp.get('gaia') !== '0',
    invert: sp.get('invert') === '1',
    mark: sp.get('mark') !== '0',
    a: sp.get('a'),
    b: sp.get('b'),
  }
}

// Mantiene la URL corta: los valores por defecto no se escriben.
function writeParams(sp, patch) {
  const next = new URLSearchParams(sp)
  for (const [k, v] of Object.entries(patch)) {
    const val = typeof v === 'boolean' ? (v ? '1' : '0') : v
    const def = DEFAULTS[k]
    const isDefault = def !== undefined && String(typeof def === 'boolean' ? (def ? '1' : '0') : def) === String(val)
    if (val == null || val === '' || isDefault) next.delete(k)
    else next.set(k, val)
  }
  return next
}

function sample(list, n) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))])
}

export default function Viewer() {
  const { t, m, lang } = useI18n()
  const H = m.help
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const s = useMemo(() => readState(sp), [sp])
  const set = useCallback((patch) => setSp((cur) => writeParams(cur, patch), { replace: true }), [setSp])

  // ---- /api/sky (con un pequeño debounce para el campo de FOV)
  const queryQs = useMemo(() => {
    const p = new URLSearchParams({ fov_arcmin: s.fov })
    if (s.target) p.set('target', s.target)
    else if (s.ra != null && s.dec != null) { p.set('ra', s.ra); p.set('dec', s.dec) }
    else return null
    return p.toString()
  }, [s.target, s.ra, s.dec, s.fov])

  const [sky, setSky] = useState(null)
  const [skyState, setSkyState] = useState({ loading: false, error: null })
  const [skySlow, setSkySlow] = useState(false)
  useEffect(() => {
    setSkySlow(false)
    if (!skyState.loading) return
    const id = setTimeout(() => setSkySlow(true), SLOW_QUERY_MS)
    return () => clearTimeout(id)
  }, [skyState.loading, queryQs])

  useEffect(() => {
    if (!queryQs) { setSkyState({ loading: false, error: { key: 'ui.enterToStart' } }); return }
    let cancelled = false
    setSkyState({ loading: true, error: null })
    const t = setTimeout(() => {
      fetchSky(queryQs)
        .then((data) => { if (!cancelled) { setSky(data); setSkyState({ loading: false, error: null }) } })
        .catch((e) => { if (!cancelled) { setSky(null); setSkyState({ loading: false, error: { key: `errors.${e.code ?? 'INTERNAL'}` } }) } })
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [queryQs])

  // ---- Gaia: llega aparte, sin frenar las imágenes. Si /api/sky ya la trajo (caché del servidor),
  // status "ok"; si no, "pending" y se pide a sky.overlays.gaia.url. Lo ya bajado se guarda por URL.
  const gaiaCache = useRef(new Map())
  const [gaiaRetry, setGaiaRetry] = useState(0)
  const [gaia, setGaia] = useState({ status: 'idle', data: null, error: null })
  useEffect(() => {
    const g = sky?.overlays?.gaia
    if (!g) { setGaia({ status: 'idle', data: null, error: null }); return }
    if (g.status !== 'pending') { setGaia({ status: 'ok', data: g, error: null }); return }
    const hit = gaiaCache.current.get(g.url)
    if (hit) { setGaia({ status: 'ok', data: hit, error: null }); return }
    let cancelled = false
    setGaia({ status: 'loading', data: null, error: null })
    fetchGaia(g.url)
      .then((d) => { gaiaCache.current.set(g.url, d); if (!cancelled) setGaia({ status: 'ok', data: d, error: null }) })
      .catch((e) => { if (!cancelled) setGaia({ status: 'error', data: null, error: e.code ?? 'INTERNAL' }) })
    return () => { cancelled = true }
  }, [sky, gaiaRetry])

  // ---- Objetivos del reto: tipo de objeto y hacia dónde se mueve (para la marca y la leyenda)
  const [targetList, setTargetList] = useState(null)
  useEffect(() => { fetchTargets().then((d) => setTargetList(d.targets)).catch(() => {}) }, [])
  const targetInfo = s.target ? targetList?.find((t) => t.id === s.target) ?? null : null

  // ---- Recorrido guiado: la primera vez en cada idioma, cuando ya hay algo para mostrar
  const [tourOpen, setTourOpen] = useState(false)
  useEffect(() => {
    if (!sky || tourAlreadySeen(TOUR_KEYS.viewer, lang)) return
    const t = setTimeout(() => setTourOpen(true), 900)
    return () => clearTimeout(t)
  }, [sky, lang])

  // ---- Secuencia de capas según el modo
  const effDet = s.mode === 'frames' && s.det === 'ALL' ? 'D5' : s.det
  const epochs = sky?.epochs ?? []
  const epochA = s.a && epochs.some((e) => e.id === s.a) ? s.a : epochs[0]?.id
  const epochB = s.b && epochs.some((e) => e.id === s.b) ? s.b : epochs[epochs.length - 1]?.id

  const seq = useMemo(() => {
    if (!sky) return []
    const stretch = { stretch: s.stretch }
    if (s.mode === 'diff') {
      if (!epochA || !epochB || epochA === epochB) return []
      const la = monthLabel(epochs.find((e) => e.id === epochA).mjd_mid, lang)
      const lb = monthLabel(epochs.find((e) => e.id === epochB).mjd_mid, lang)
      return [{
        key: `diff-${epochA}-${epochB}-${s.det}`, url: apiUrl(diffUrl(sky, epochA, epochB, s.det)),
        label: `${lb} − ${la}`, epochId: epochB,
      }]
    }
    if (s.mode === 'frames') {
      const frames = sky.frames.filter((f) => f.detector === effDet).sort((x, y) => x.mjd - y.mjd)
      return sample(frames, MAX_FRAMES).map((f) => ({
        key: `${f.id}-${s.stretch}`, url: apiUrl(withParams(f.image_url, stretch)),
        label: dateTimeLabel(f.date_utc, lang), epochId: f.epoch_id, frame: f,
        sub: f.wavelength_at_target_um ? `${f.detector} · λ ${f.wavelength_at_target_um.toFixed(3)} µm` : f.detector,
      }))
    }
    return epochs.filter((e) => e.stacks[s.det]).map((e) => ({
      key: `${e.id}-${s.det}-${s.stretch}`, url: apiUrl(withParams(e.stacks[s.det].image_url, stretch)),
      label: monthLabel(e.mjd_mid, lang), epochId: e.id, sub: t('ui.framesStacked', { det: s.det, n: e.stacks[s.det].n_frames }),
    }))
  }, [sky, s.mode, s.det, s.stretch, effDet, epochs, epochA, epochB, lang, t])

  const marker = useMemo(() => {
    if (!s.mark || !sky) return null
    const q = sky.query
    return { ra: q.ra_deg, dec: q.dec_deg, radiusDeg: Math.max(15, s.fov * 60 * 0.035) / 3600 }
  }, [s.mark, s.fov, sky])
  const moving = (targetInfo?.motion?.arcsec_per_year ?? 0) >= MIN_ARROW_SPEED
  const arrow = useMemo(() => {
    if (!marker || !moving) return null
    const m = targetInfo.motion
    return { fromRa: marker.ra, fromDec: marker.dec, toRa: m.to_ra_deg, toDec: m.to_dec_deg }
  }, [marker, moving, targetInfo])

  const seqKey = seq.map((l) => l.key).join('|')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [layerStatus, setLayerStatus] = useState(null)
  useEffect(() => { setIndex(0) }, [seqKey]) // el estado de carga lo resetea AladinView al recrear capas

  const count = seq.length
  const cur = seq[Math.min(index, count - 1)]
  const next = useCallback(() => setIndex((i) => (count ? (i + 1) % count : 0)), [count])
  const prev = useCallback(() => setIndex((i) => (count ? (i - 1 + count) % count : 0)), [count])

  useEffect(() => {
    if (!playing || count < 2) return
    const id = setInterval(next, Math.max(100, s.speed))
    return () => clearInterval(id)
  }, [playing, count, s.speed, next])

  // ---- Gaia: posiciones de la época visible
  const gaiaSources = useMemo(() => {
    if (!s.gaia || !gaia.data || !cur) return null
    return gaia.data.sources.map((g) => {
      const p = g.pos_by_epoch?.[cur.epochId] ?? g
      return { ra: p.ra_deg, dec: p.dec_deg, source_id: g.source_id, g_mag: g.g_mag }
    })
  }, [s.gaia, gaia.data, cur?.epochId])

  // ---- Fotometría (lenta la primera vez: baja todos los cutouts)
  const [phot, setPhot] = useState({ loading: false, data: null, error: null })
  const [photView, setPhotView] = useState('spectrum')
  const [lcDet, setLcDet] = useState('D5')
  const [photOpen, setPhotOpen] = useState(true) // plegar el panel sin perder los datos medidos
  const mainRef = useRef(null)
  const photRef = useRef(null)
  // Caché de la fotometría: al volver a esta posición/campo/detector se recupera lo medido
  // (y cómo estaba el panel) sin volver a medir. Ver photCache.js.
  const pKey = useMemo(() => photKey(sky?.query, s.det), [sky, s.det])
  const pKeyRef = useRef(pKey)
  pKeyRef.current = pKey
  useEffect(() => {
    const cached = getPhot(pKey)
    if (cached?.data) {
      setPhot({ loading: false, data: cached.data, error: null })
      if (cached.view) setPhotView(cached.view)
      if (cached.lcDet) setLcDet(cached.lcDet)
      setPhotOpen(cached.open ?? true)
    } else if (pKey && isMeasuring(pKey)) {
      // se salió a la mitad de una medición: engancharse a ese mismo pedido
      setPhot({ loading: true, data: null, error: null })
      attach(pKey, measureOnce(pKey))
    } else {
      setPhot({ loading: false, data: null, error: null })
      setPhotOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pKey])
  // detectores que realmente tienen mediciones (la curva de luz se grafica de a uno)
  const photDets = useMemo(
    () => [...new Set((phot.data?.points ?? []).map((p) => p.detector))].sort(),
    [phot.data],
  )
  useEffect(() => {
    if (photDets.length && !photDets.includes(lcDet)) setLcDet(photDets[0])
  }, [photDets, lcDet])

  // recordar cómo quedó el panel (abierto/cerrado, espectro o curva de luz, detector)
  useEffect(() => {
    if (phot.data?.points?.length) savePhot(pKey, { view: photView, lcDet, open: photOpen })
  }, [pKey, phot.data, photView, lcDet, photOpen])

  function attach(key, promise) {
    promise
      .then((data) => { if (pKeyRef.current === key) { setPhot({ loading: false, data, error: null }); openPhot() } })
      .catch((e) => { if (pKeyRef.current === key) setPhot({ loading: false, data: null, error: e.code ?? 'INTERNAL' }) })
  }

  function closePhot() {
    setPhotOpen(false)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) // volver al visor
  }
  function openPhot() {
    setPhotOpen(true)
    requestAnimationFrame(() => photRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  function loadPhotometry() {
    if (!sky) return
    const q = sky.query
    const p = new URLSearchParams({ ra: q.ra_deg, dec: q.dec_deg, fov_arcmin: q.fov_arcmin })
    if (s.det !== 'ALL') p.set('detectors', s.det)
    setPhot({ loading: true, data: null, error: null })
    // measureOnce guarda el resultado en la caché aunque el usuario ya se haya ido del visor
    attach(pKey, measureOnce(pKey, () => fetchPhotometry(p.toString())))
  }

  const photPoints = useMemo(() => {
    const pts = phot.data?.points ?? []
    return photView === 'lightcurve' ? pts.filter((p) => p.detector === lcDet) : pts
  }, [phot.data, photView, lcDet])

  // ---- Recetas (botones de la barra lateral)
  const RECIPE_PARAMS = {
    move: { mode: 'blink', det: 'ALL', speed: 400 },
    confirm: { mode: 'diff', det: 'ALL', a: epochs[0]?.id, b: epochs[epochs.length - 1]?.id },
    cold: { mode: 'blink', det: 'D5', bg: 'allwise-w2' },
    variable: { mode: 'blink', det: 'D2', stretch: 'linear' },
  }
  function applyRecipe(id) {
    // cada receta parte de los valores por defecto (no hereda la anterior): solo se conservan
    // la posición y el campo de visión
    setSp((cur) => {
      const base = new URLSearchParams()
      for (const k of ['target', 'ra', 'dec', 'fov']) if (cur.get(k)) base.set(k, cur.get(k))
      return writeParams(base, RECIPE_PARAMS[id])
    }, { replace: true })
    if (id === 'variable') { setPhotView('lightcurve'); setLcDet('D2') }
    setPlaying(true)
  }

  // ---- Acciones de la barra lateral
  function onGo(text) {
    const parts = text.trim().split(/[\s,]+/).map(Number)
    if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v))) {
      setSkyState({ loading: false, error: { key: 'ui.coordsError', vars: { example: '133.786245 -7.244373' } } })
      return
    }
    setSp((cur) => { const n = writeParams(cur, { ra: parts[0], dec: parts[1] }); n.delete('target'); return n })
  }

  function onDefaults() {
    setSp((cur) => {
      const n = new URLSearchParams()
      for (const k of ['target', 'ra', 'dec']) if (cur.get(k)) n.set(k, cur.get(k))
      return n
    }, { replace: true })
  }

  const [shareMsg, setShareMsg] = useState('')
  function onShare() {
    // el link compartido lleva el idioma, para que se abra igual
    navigator.clipboard?.writeText(window.location.origin + withLang(window.location.pathname + window.location.search, lang))
      .then(() => setShareMsg(t('ui.linkCopied')), () => setShareMsg(t('ui.copyFailed')))
    setTimeout(() => setShareMsg(''), 2000)
  }

  // ¿Entra el gatito de carga a la izquierda del recuadro? (56px + 24px de separación). Si no
  // (pantallas angostas), va adentro, en la esquina superior izquierda.
  const frameWrapRef = useRef(null)
  const [loaderInside, setLoaderInside] = useState(false)
  // Lo mismo para el panel "¿Te gusta lo que ves?" a la derecha (el recuadro está centrado: el
  // espacio a la derecha es igual al de la izquierda). Si no entra, va debajo del recuadro.
  const [captureBelow, setCaptureBelow] = useState(false)
  useEffect(() => {
    const wrap = frameWrapRef.current
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const check = () => {
      setLoaderInside(wrap.offsetLeft < LOADER_SPACE)
      setCaptureBelow(wrap.offsetLeft < CAPTURE_SPACE)
    }
    const ro = new ResizeObserver(check)
    ro.observe(wrap)
    if (wrap.offsetParent) ro.observe(wrap.offsetParent)
    check()
    return () => ro.disconnect()
  }, [])

  // ---- Captura: descarga un PNG de lo que se ve en el visor en este momento
  const captureRef = useRef(null)
  const [capture, setCapture] = useState({ busy: false, failed: false })
  async function onCapture() {
    if (!captureRef.current) return
    setCapture({ busy: true, failed: false })
    try {
      const blob = await captureRef.current()
      const name = [
        'openspherex', s.target || 'coords', s.mode === 'frames' ? effDet : s.det, cur?.label,
      ].filter(Boolean).join('_').replace(/[^\p{L}\p{N}._-]+/gu, '-')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setCapture({ busy: false, failed: false })
    } catch {
      setCapture({ busy: false, failed: true })
    }
  }

  // ---- Render
  const q = sky?.query
  const title = q?.target_name
    ? (m.targetNames[s.target] ?? q.target_name)
    : (s.target ? t('ui.loading') : t('ui.customCoords'))
  const centerRa = q?.ra_deg ?? s.ra ?? 0
  const centerDec = q?.dec_deg ?? s.dec ?? 0

  let status = null
  if (skyState.loading) status = skySlow ? t('ui.queryingSlow') : t('ui.querying')
  else if (skyState.error) status = t(skyState.error.key, skyState.error.vars)
  else if (s.mode === 'diff' && epochA === epochB) status = t('ui.pickTwo')
  else if (layerStatus?.errors.length) status = t('ui.someFailed', { error: layerStatus.errors[0] })
  else if (layerStatus && layerStatus.loaded < layerStatus.total) {
    status = t('ui.loadingImages', { loaded: layerStatus.loaded, total: layerStatus.total })
  }
  // El gatito de carga va encima del visor (esquina superior derecha, fuera del recuadro)
  const viewerLoading = skyState.loading
    || (!skyState.error && !layerStatus?.errors.length && layerStatus && layerStatus.loaded < layerStatus.total)
  const statusIsError = !skyState.loading && (skyState.error || layerStatus?.errors.length)
  // Estado de Gaia, aparte del de las imágenes (solo si las estrellas de Gaia están activadas)
  const gaiaMsg = s.gaia && sky && (gaia.status === 'loading' || gaia.status === 'error') ? gaia.status : null

  return (
    <section id="screen-viewer" className="screen active">
      <Sidebar
        s={{ ...s, a: epochA, b: epochB, coordsText: s.coordsText || (sky ? `${sky.query.ra_deg} ${sky.query.dec_deg}` : '') }}
        set={set} sky={sky} onGo={onGo} onRecipe={applyRecipe}
        onDefaults={onDefaults} onShare={onShare} shareMsg={shareMsg} current={cur?.frame} gaia={gaia}
      />

      <main className="viewer-main" ref={mainRef}>
        <button className="btn btn-corner btn-left" onClick={() => navigate('/explore')}>{t('ui.back')}</button>
        <div className="top-right">
          <LanguageSelect />
          <span className="brand-small">OpenSPHEREx</span>
        </div>

        <h2 className="viewer-title anim" style={{ '--i': 2 }}>{title}</h2>
        <p className="viewer-sub anim" style={{ '--i': 3 }}>
          {q ? t('ui.coordsTooltip', { ra: q.ra_deg.toFixed(5), dec: q.dec_deg.toFixed(5) }) : (s.coordsText || '–')}
          {`  ·  ${t('ui.fovShort', { fov: s.fov })}  ·  ${s.mode === 'frames' ? effDet : s.det}`}
          {q?.coord_epoch ? `  ·  ${t('ui.coordsEpoch', { epoch: q.coord_epoch })}` : ''}
        </p>
        <div className="viewer-tools anim" style={{ '--i': 3 }}>
          <WithHelp help={H.tour}>
            <button className="link" onClick={() => setTourOpen(true)}>{t('ui.takeTour')}</button>
          </WithHelp>
          <WithHelp help={H.glossary}>
            <a className="link" href={withLang('/glossary', lang)} target="_blank" rel="noopener">{t('ui.glossaryLink')}</a>
          </WithHelp>
        </div>

        {/* Contenedor sin overflow: el gatito de carga va afuera del recuadro, a su izquierda */}
        <div className={`viewer-frame-wrap${loaderInside ? ' loader-inside' : ''}`} ref={frameWrapRef}>
        <div className="viewer-frame live anim" style={{ '--i': 4 }} data-tour="sky">
          <AladinView
            ra={centerRa} dec={centerDec} fovArcmin={s.fov}
            layers={seq} wcs={sky?.grid.wcs} activeIndex={index}
            opacity={s.opacity} invert={s.invert}
            background={s.bg === 'none' ? 'none' : backgroundUrl(s.bg)}
            gaiaSources={gaiaSources} onStatus={setLayerStatus}
            marker={marker} arrow={arrow} captureRef={captureRef}
          />
          {(status || gaiaMsg) && (
            <div className="viewer-statuses" role="status" aria-live="polite">
              {status && <div className={`viewer-status${statusIsError ? ' error' : ''}`}>{status}</div>}
              {gaiaMsg === 'loading' && (
                <div className="viewer-status gaia-status">
                  <span className="gaia-dot" aria-hidden="true" />{t('ui.gaiaLoading')}
                </div>
              )}
              {gaiaMsg === 'error' && (
                <div className="viewer-status gaia-status warn">
                  <span>⚠ {gaia.error === 'NETWORK' ? t('errors.NETWORK') : t('ui.gaiaFailed')}</span>
                  <button className="gaia-retry" onClick={() => setGaiaRetry((n) => n + 1)}>{t('ui.gaiaRetry')}</button>
                </div>
              )}
            </div>
          )}
        </div>
          {viewerLoading && <div className="frame-loader spinner" role="status" aria-label={status} />}
          <div className={`capture-panel${captureBelow ? ' below' : ''}`}>
            <p className="capture-title">{t('ui.captureTitle')}</p>
            <button className="btn capture-btn" onClick={onCapture} disabled={!seq.length || capture.busy}>
              📷 {t('ui.captureBtn')}
            </button>
            {capture.failed && <p className="err-text capture-err">{t('ui.captureFailed')}</p>}
          </div>
        </div>

        <WithHelp help={H.player} className="player-help" data-tour="player">
          <PlayerControls
            playing={playing} onToggle={() => setPlaying((p) => !p)} onPrev={prev} onNext={next}
            onSelect={setIndex} index={Math.min(index, Math.max(0, count - 1))} count={count}
            label={cur?.label} sublabel={cur?.sub}
          />
        </WithHelp>

        <ViewCaption
          sky={sky} mode={s.mode} det={s.det} effDet={effDet} cur={cur}
          index={Math.min(index, Math.max(0, count - 1))} count={count}
          speed={s.speed} playing={playing} targetInfo={targetInfo} markerOn={s.mark} moving={moving}
        />

        {sky && (
          <section className="phot-panel anim" style={{ '--i': 5 }} ref={photRef} data-tour="photometry">
            <div className="phot-head">
              <h3>{photView === 'spectrum' ? t('ui.spectrum') : t('ui.lightCurve')}</h3>
              {phot.data && photOpen && (
                <WithHelp help={H.photViews} innerClassName="tabs" role="tablist">
                  <button className={`tab${photView === 'spectrum' ? ' on' : ''}`} onClick={() => setPhotView('spectrum')}>{t('ui.spectrum')}</button>
                  <button className={`tab${photView === 'lightcurve' ? ' on' : ''}`} onClick={() => setPhotView('lightcurve')}>{t('ui.lightCurve')}</button>
                </WithHelp>
              )}
              {phot.data && photOpen && photView === 'lightcurve' && (
                <select className="vselect" aria-label={t('ui.lcDetAria')} value={lcDet} onChange={(e) => setLcDet(e.target.value)}>
                  {photDets.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              {!phot.data && (
                <WithHelp help={H.photometry}>
                  <button className="btn" onClick={loadPhotometry} disabled={phot.loading}>
                    {phot.loading ? t('ui.measuring') : t('ui.measure')}
                  </button>
                </WithHelp>
              )}
              {phot.data && (photOpen
                ? <button className="btn btn-ghost" onClick={closePhot} aria-label={t('ui.closeAria')}>{t('ui.close')}</button>
                : <button className="btn" onClick={openPhot}>{photView === 'spectrum' ? t('ui.showSpectrum') : t('ui.showLightCurve')}</button>)}
            </div>

            {phot.loading && (
              <p className="phot-note"><span className="spinner" />
                {s.det !== 'ALL' ? t('ui.measuringNoteDet', { det: s.det }) : t('ui.measuringNote')}</p>
            )}
            {phot.error && <p className="err-text">{t(`errors.${phot.error}`)}</p>}
            {!phot.data && !phot.loading && !phot.error && (
              <p className="phot-note">{t('ui.photIntro')}</p>
            )}
            {phot.data && !photOpen && (
              <p className="phot-note">{t('ui.pointsMeasured', { n: phot.data.points.length })}</p>
            )}
            {phot.data && photOpen && (
              <>
                <PhotometryChart points={photPoints} view={photView} detectors={sky.detectors} />
                <p className="phot-note">
                  {t('ui.pointsLegend', { n: photPoints.length, units: phot.data.flux_units })}
                </p>
                {photPoints.some((p) => p.saturated) && (
                  <p className="phot-warning" role="note">
                    {t('ui.saturated1')} <b>{t('ui.saturatedBold')}</b> {t('ui.saturated2')}
                  </p>
                )}
                <details className="phot-note">
                  <summary>{t('ui.showTable')}</summary>
                  <div className="data-table-wrap" tabIndex={0} aria-label={t('ui.tableAria')}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {TABLE_COLUMNS.map(([col, term]) => [t(`ui.${col}`), term, t(`ui.${col}What`)]).map(([label, term, what]) => (
                            <th key={label}>
                              <a href={withLang(`/glossary#${term}`, lang)} target="_blank" rel="noopener"
                                title={`${what} ${t('ui.opensGlossary')}`} aria-label={`${label}: ${what}. ${t('ui.opensGlossaryTab')}`}>
                                {label}
                              </a>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {photPoints.map((p) => (
                          <tr key={p.frame_id}>
                            <td>{p.frame_id}</td><td>{p.detector}</td>
                            <td>{p.wavelength_um?.toFixed(3) ?? '–'}</td>
                            <td>{p.mjd.toFixed(3)}</td>
                            <td>{p.flux.toFixed(4)}</td>
                            <td>{p.flux_err?.toFixed(4) ?? '–'}</td>
                            <td>{p.flagged ? '⚑' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </section>
        )}
      </main>
      <Tour
        open={tourOpen} onClose={() => setTourOpen(false)}
        steps={VIEWER_TOUR.map((st) => ({ sel: st.sel, ...m.tours.viewer[st.id] }))}
      />
    </section>
  )
}
