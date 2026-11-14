import { useEffect, useRef, useState } from 'react'
import A from 'aladin-lite'

// ÚNICO componente que toca la API de Aladin Lite (v3.8.2, fijada en package.json).
// El resto de la app le pasa props y nunca llama a Aladin directamente.
//
// Props:
//   ra, dec, fovArcmin   centro y campo del visor
//   layers               [{ key, url, label }] secuencia de imágenes (una capa por elemento)
//   wcs                  WCS común de la grilla (sky.grid.wcs), igual para todas las capas
//   activeIndex          capa visible; el resto queda con opacidad 0 (regla 4: no se recrean)
//   opacity              opacidad de la capa visible (0–1), para comparar con el fondo
//   invert               invierte la escala de grises
//   background           URL de un HiPS de fondo, o 'none'
//   gaiaSources          [{ ra, dec, source_id, g_mag }] ya resueltas para la época, o null
//   onStatus             ({ loaded, total, errors }) progreso de carga de las capas
//   marker               { ra, dec, radiusDeg } círculo sobre el objetivo, o null
//   arrow                { fromRa, fromDec, toRa, toDec } hacia dónde se mueve el objetivo, o null

const GAIA_COLOR = '#4fc3f7'
const MARK_COLOR = '#ff8a4c' // naranja de la marca, distinto del azul de Gaia
// Imágenes pedidas al backend a la vez. Una zona nueva se baja por la conexión del servidor:
// pidiendo de a 2 el total tarda lo mismo, pero la primera época aparece mucho antes.
const MAX_IN_FLIGHT = 2
const FALLBACK_SURVEY = 'https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/RGB-W4-W2-W1'

function applyLook({ layer }, i, { activeIndex, opacity, invert }) {
  layer.setOpacity(i === activeIndex ? opacity : 0)
  layer.setColormap('grayscale', { reversed: invert })
}

export default function AladinView({
  ra, dec, fovArcmin, layers, wcs, activeIndex = 0, opacity = 1, invert = false,
  background = 'none', gaiaSources = null, onStatus, marker = null, arrow = null,
}) {
  const divRef = useRef(null)
  const aladinRef = useRef(null)
  const gaiaRef = useRef(null)
  const markRef = useRef(null)
  const imgLayersRef = useRef([])   // [{ name, layer }]
  const genRef = useRef(0)          // generación de capas: ignora callbacks de capas viejas
  const onStatusRef = useRef(onStatus)
  const viewRef = useRef({ activeIndex, opacity, invert }) // estado visual actual, para capas que se agregan tarde
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState(null)
  onStatusRef.current = onStatus
  viewRef.current = { activeIndex, opacity, invert }

  // 1) Crear el visor UNA sola vez (A.init es asíncrono; StrictMode monta el efecto dos veces)
  useEffect(() => {
    let cancelled = false
    A.init.then(() => {
      if (cancelled || aladinRef.current) return
      const aladin = A.aladin(divRef.current, {
        target: `${ra} ${dec}`,
        fov: fovArcmin / 60,
        // Aladin siempre tiene una capa base; con 'none' se crea igual y se deja transparente
        survey: background === 'none' ? FALLBACK_SURVEY : background,
        cooFrame: 'ICRS',
        showReticle: true,
        showCooGridControl: false,
        showProjectionControl: false,
        showSimbadPointerControl: false,
        showSettingsControl: false,
        showShareControl: false,
        showGotoControl: false,
        showFrame: false,
        showZoomControl: true,
        showFullscreenControl: true,
        showLayersControl: true,
      })
      const gaia = A.catalog({ name: 'Gaia DR3', sourceSize: 12, color: GAIA_COLOR, shape: 'circle' })
      aladin.addCatalog(gaia)
      const mark = A.graphicOverlay({ name: 'Target', color: MARK_COLOR, lineWidth: 2 })
      aladin.addOverlay(mark)
      markRef.current = mark
      aladinRef.current = aladin
      if (import.meta.env.DEV) window.__aladin = aladin // depuración desde la consola
      gaiaRef.current = gaia
      setReady(true)
    }).catch((e) => {
      if (!cancelled) setInitError(String(e))
    })
    return () => {
      cancelled = true
      // desmontaje real (o el primer montaje de StrictMode): limpiar para no duplicar el visor
      if (aladinRef.current && divRef.current) divRef.current.innerHTML = ''
      aladinRef.current = null
      gaiaRef.current = null
      markRef.current = null
      imgLayersRef.current = []
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) Centro y campo
  useEffect(() => {
    const aladin = aladinRef.current
    if (!ready || !aladin) return
    aladin.gotoRaDec(ra, dec)
    aladin.setFoV(fovArcmin / 60)
  }, [ready, ra, dec, fovArcmin])

  // 3) Fondo (otra misión: AllWISE por defecto)
  useEffect(() => {
    const aladin = aladinRef.current
    if (!ready || !aladin) return
    if (background !== 'none') aladin.setBaseImageLayer(background)
    aladin.getBaseImageLayer()?.setOpacity(background === 'none' ? 0 : 1)
  }, [ready, background])

  // 4) Capas de SPHEREx: se (re)crean solo cuando cambia la secuencia, no en cada cuadro
  const layersKey = layers.map((l) => l.key).join('|')
  useEffect(() => {
    const aladin = aladinRef.current
    if (!ready || !aladin) return
    const gen = ++genRef.current

    for (const { name, added } of imgLayersRef.current) if (added) aladin.removeImageLayer(name)
    imgLayersRef.current = []

    const status = { loaded: 0, total: layers.length, errors: [] }
    const report = () => { if (gen === genRef.current) onStatusRef.current?.({ ...status }) }
    report()

    // Las capas se crean todas, pero se agregan a Aladin (= se piden al backend) de a MAX_IN_FLIGHT,
    // en orden de época: cuando una termina (bien o mal) se agrega la siguiente.
    let next = 0
    const addNext = () => {
      if (gen !== genRef.current || next >= imgLayersRef.current.length) return
      const entry = imgLayersRef.current[next++]
      aladin.setOverlayImageLayer(entry.layer, entry.name)
      entry.added = true
      applyLook(entry, entry.index, viewRef.current)
    }
    const done = () => { report(); addNext() }

    imgLayersRef.current = layers.map((l, i) => {
      const layer = A.image(l.url, {
        name: l.label,
        imgFormat: 'png',
        wcs,
        successCallback: () => { status.loaded += 1; done() },
        errorCallback: (e) => { status.errors.push(`${l.label}: ${e}`); done() },
      })
      return { name: `spherex-${gen}-${i}`, layer, index: i, added: false }
    })
    for (let k = 0; k < MAX_IN_FLIGHT; k++) addNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, layersKey, wcs])

  // 5) Animación: solo cambia la opacidad (rápido, sin parpadeo)
  useEffect(() => {
    imgLayersRef.current.forEach((entry, i) => { if (entry.added) applyLook(entry, i, viewRef.current) })
  }, [activeIndex, opacity, invert, layersKey, ready])

  // 6) Gaia: un solo catálogo que se vacía y rellena con las posiciones de la época visible
  useEffect(() => {
    const gaia = gaiaRef.current
    if (!ready || !gaia) return
    gaia.removeAll()
    if (gaiaSources?.length) {
      gaia.addSources(gaiaSources.map((s) =>
        A.source(s.ra, s.dec, { source_id: s.source_id, g_mag: s.g_mag })))
    }
  }, [ready, gaiaSources])

  // 7) Marca del objetivo y flecha de movimiento
  const markKey = JSON.stringify([marker, arrow])
  useEffect(() => {
    const mark = markRef.current
    if (!ready || !mark) return
    mark.removeAll()
    if (marker) mark.add(A.circle(marker.ra, marker.dec, marker.radiusDeg, { color: MARK_COLOR, lineWidth: 2 }))
    if (arrow) mark.add(A.vector(arrow.fromRa, arrow.fromDec, arrow.toRa, arrow.toDec, { color: MARK_COLOR, lineWidth: 2 }))
    mark.reportChange?.()
    aladinRef.current?.view?.requestRedraw?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markKey])

  return (
    <>
      {/* Aladin cambia el position de su div: se lo envuelve para que conserve el tamaño del marco */}
      <div className="aladin-host">
        <div ref={divRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {initError && (
        <div className="viewer-status error">Aladin could not start: {initError}</div>
      )}
    </>
  )
}
