import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiUrl, diffUrl, fetchPhotometry, fetchSky, fetchTargets, withParams } from '../api.js'
import AladinView from '../components/AladinView.jsx'
import PhotometryChart from '../components/PhotometryChart.jsx'
import PlayerControls from '../components/PlayerControls.jsx'
import Sidebar, { backgroundUrl } from '../components/Sidebar.jsx'
import WithHelp from '../components/WithHelp.jsx'
import ViewCaption from '../components/ViewCaption.jsx'
import { HELP } from '../help.js'

// Estado del visor = parámetros de la URL (copiar el link reproduce la misma vista).
const DEFAULTS = {
  fov: 10, det: 'ALL', mode: 'blink', stretch: 'asinh', speed: 500,
  opacity: 1, bg: 'allwise', gaia: true, invert: false, mark: true,
}
const MIN_ARROW_SPEED = 0.5 // arcsec/año: más lento que esto la flecha no se vería
const MAX_FRAMES = 40 // modo "frames": cada frame es una capa; más que esto satura el navegador

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

  useEffect(() => {
    if (!queryQs) { setSkyState({ loading: false, error: 'Enter coordinates to start.' }); return }
    let cancelled = false
    setSkyState({ loading: true, error: null })
    const t = setTimeout(() => {
      fetchSky(queryQs)
        .then((data) => { if (!cancelled) { setSky(data); setSkyState({ loading: false, error: null }) } })
        .catch((e) => { if (!cancelled) { setSky(null); setSkyState({ loading: false, error: e.message }) } })
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [queryQs])

  // ---- Objetivos del reto: tipo de objeto y hacia dónde se mueve (para la marca y la leyenda)
  const [targetList, setTargetList] = useState(null)
  useEffect(() => { fetchTargets().then((d) => setTargetList(d.targets)).catch(() => {}) }, [])
  const targetInfo = s.target ? targetList?.find((t) => t.id === s.target) ?? null : null

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
      const la = epochs.find((e) => e.id === epochA)?.label
      const lb = epochs.find((e) => e.id === epochB)?.label
      return [{
        key: `diff-${epochA}-${epochB}-${s.det}`, url: apiUrl(diffUrl(sky, epochA, epochB, s.det)),
        label: `${lb} − ${la}`, epochId: epochB,
      }]
    }
    if (s.mode === 'frames') {
      const frames = sky.frames.filter((f) => f.detector === effDet).sort((x, y) => x.mjd - y.mjd)
      return sample(frames, MAX_FRAMES).map((f) => ({
        key: `${f.id}-${s.stretch}`, url: apiUrl(withParams(f.image_url, stretch)),
        label: f.date_utc.slice(0, 16).replace('T', ' '), epochId: f.epoch_id, frame: f,
        sub: f.wavelength_at_target_um ? `${f.detector} · λ ${f.wavelength_at_target_um.toFixed(3)} µm` : f.detector,
      }))
    }
    return epochs.filter((e) => e.stacks[s.det]).map((e) => ({
      key: `${e.id}-${s.det}-${s.stretch}`, url: apiUrl(withParams(e.stacks[s.det].image_url, stretch)),
      label: e.label, epochId: e.id, sub: `${s.det} · ${e.stacks[s.det].n_frames} frames stacked`,
    }))
  }, [sky, s.mode, s.det, s.stretch, effDet, epochs, epochA, epochB])

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
    if (!s.gaia || !sky || !cur) return null
    return sky.overlays.gaia.sources.map((g) => {
      const p = g.pos_by_epoch?.[cur.epochId] ?? g
      return { ra: p.ra_deg, dec: p.dec_deg, source_id: g.source_id, g_mag: g.g_mag }
    })
  }, [s.gaia, sky, cur?.epochId])

  // ---- Fotometría (lenta la primera vez: baja todos los cutouts)
  const [phot, setPhot] = useState({ loading: false, data: null, error: null })
  const [photView, setPhotView] = useState('spectrum')
  const [lcDet, setLcDet] = useState('D5')
  const [photOpen, setPhotOpen] = useState(true) // plegar el panel sin perder los datos medidos
  const mainRef = useRef(null)
  const photRef = useRef(null)
  useEffect(() => { setPhot({ loading: false, data: null, error: null }); setPhotOpen(true) }, [queryQs])

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
    fetchPhotometry(p.toString())
      .then((data) => { setPhot({ loading: false, data, error: null }); openPhot() })
      .catch((e) => setPhot({ loading: false, data: null, error: e.message }))
  }

  const photPoints = useMemo(() => {
    const pts = phot.data?.points ?? []
    return photView === 'lightcurve' ? pts.filter((p) => p.detector === lcDet) : pts
  }, [phot.data, photView, lcDet])

  // ---- Acciones de la barra lateral
  function onGo(text) {
    const parts = text.trim().split(/[\s,]+/).map(Number)
    if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v))) {
      setSkyState({ loading: false, error: 'Use decimal degrees: "RA Dec", e.g. 133.786245 -7.244373' })
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
    navigator.clipboard?.writeText(window.location.href)
      .then(() => setShareMsg('Link copied!'), () => setShareMsg('Copy failed'))
    setTimeout(() => setShareMsg(''), 2000)
  }

  // ---- Render
  const q = sky?.query
  const title = q?.target_name ?? (s.target ? 'Loading…' : 'Custom coordinates')
  const centerRa = q?.ra_deg ?? s.ra ?? 0
  const centerDec = q?.dec_deg ?? s.dec ?? 0

  let status = null
  if (skyState.loading) status = <><span className="spinner" />Querying SPHEREx archive…</>
  else if (skyState.error) status = skyState.error
  else if (s.mode === 'diff' && epochA === epochB) status = 'Pick two different epochs.'
  else if (layerStatus?.errors.length) status = `Some images failed: ${layerStatus.errors[0]}`
  else if (layerStatus && layerStatus.loaded < layerStatus.total) {
    status = <><span className="spinner" />Loading SPHEREx images {layerStatus.loaded}/{layerStatus.total}… (the first time can take ~30 s)</>
  }
  const statusIsError = !skyState.loading && (skyState.error || layerStatus?.errors.length)

  return (
    <section id="screen-viewer" className="screen active">
      <Sidebar
        s={{ ...s, a: epochA, b: epochB, coordsText: s.coordsText || (sky ? `${sky.query.ra_deg} ${sky.query.dec_deg}` : '') }}
        set={set} sky={sky} onGo={onGo}
        onDefaults={onDefaults} onShare={onShare} shareMsg={shareMsg} current={cur?.frame}
      />

      <main className="viewer-main" ref={mainRef}>
        <button className="btn btn-corner btn-left" onClick={() => navigate('/explore')}>← BACK</button>
        <span className="brand-small">OpenSPHEREx</span>

        <h2 className="viewer-title anim" style={{ '--i': 2 }}>{title}</h2>
        <p className="viewer-sub anim" style={{ '--i': 3 }}>
          {q ? `RA ${q.ra_deg.toFixed(5)}°  ·  Dec ${q.dec_deg.toFixed(5)}°` : (s.coordsText || '–')}
          {`  ·  FOV ${s.fov}′  ·  ${s.mode === 'frames' ? effDet : s.det}`}
          {q?.coord_epoch ? `  ·  coords ${q.coord_epoch}` : ''}
        </p>

        <div className="viewer-frame live anim" style={{ '--i': 4 }}>
          <AladinView
            ra={centerRa} dec={centerDec} fovArcmin={s.fov}
            layers={seq} wcs={sky?.grid.wcs} activeIndex={index}
            opacity={s.opacity} invert={s.invert}
            background={s.bg === 'none' ? 'none' : backgroundUrl(s.bg)}
            gaiaSources={gaiaSources} onStatus={setLayerStatus}
            marker={marker} arrow={arrow}
          />
          {status && <div className={`viewer-status${statusIsError ? ' error' : ''}`}>{status}</div>}
        </div>

        <WithHelp help={HELP.player} className="player-help">
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
          <section className="phot-panel anim" style={{ '--i': 5 }} ref={photRef}>
            <div className="phot-head">
              <h3>{photView === 'spectrum' ? 'Spectrum' : 'Light curve'}</h3>
              {phot.data && photOpen && (
                <WithHelp help={HELP.photViews} innerClassName="tabs" role="tablist">
                  <button className={`tab${photView === 'spectrum' ? ' on' : ''}`} onClick={() => setPhotView('spectrum')}>Spectrum</button>
                  <button className={`tab${photView === 'lightcurve' ? ' on' : ''}`} onClick={() => setPhotView('lightcurve')}>Light curve</button>
                </WithHelp>
              )}
              {phot.data && photOpen && photView === 'lightcurve' && (
                <select className="vselect" aria-label="Light curve detector" value={lcDet} onChange={(e) => setLcDet(e.target.value)}>
                  {sky.detectors.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}
                </select>
              )}
              {!phot.data && (
                <WithHelp help={HELP.photometry}>
                  <button className="btn" onClick={loadPhotometry} disabled={phot.loading}>
                    {phot.loading ? 'Measuring…' : 'Measure target flux'}
                  </button>
                </WithHelp>
              )}
              {phot.data && (photOpen
                ? <button className="btn btn-ghost" onClick={closePhot} aria-label="Close spectrum panel">✕ Close</button>
                : <button className="btn" onClick={openPhot}>Show {photView === 'spectrum' ? 'spectrum' : 'light curve'}</button>)}
            </div>

            {phot.loading && (
              <p className="phot-note"><span className="spinner" />Measuring the target in every frame
                {s.det !== 'ALL' ? ` of ${s.det}` : ''}. The first time can take a few minutes.</p>
            )}
            {phot.error && <p className="err-text">{phot.error}</p>}
            {!phot.data && !phot.loading && !phot.error && (
              <p className="phot-note">
                Flux at the target position in each frame: plot it against wavelength (spectrum, e.g. methane
                and water absorption in brown dwarfs) or against time (light curve, for variable stars).
              </p>
            )}
            {phot.data && !photOpen && (
              <p className="phot-note">{phot.data.points.length} points measured. Open the panel to see the chart and the data.</p>
            )}
            {phot.data && photOpen && (
              <>
                <PhotometryChart points={photPoints} view={photView} detectors={sky.detectors} />
                <p className="phot-note">
                  {photPoints.length} points · ● good · ○ flagged pixel in aperture · flux in {phot.data.flux_units}
                </p>
                <details className="phot-note">
                  <summary>Show data table</summary>
                  <div className="data-table-wrap" tabIndex={0} aria-label="Photometry data table">
                    <table className="data-table">
                      <thead><tr><th>Frame</th><th>Det</th><th>λ (µm)</th><th>MJD</th><th>Flux</th><th>Err</th><th>Flag</th></tr></thead>
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
    </section>
  )
}
