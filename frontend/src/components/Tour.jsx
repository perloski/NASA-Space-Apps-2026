import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Recorrido guiado: ilumina una parte de la pantalla por vez (elementos con data-tour="...") y
// la explica. Se abre solo la primera vez (recordado en localStorage) y con el botón "Take the tour".
// Accesible: diálogo con foco en "Next", Escape para salir, el foco vuelve a donde estaba.

// Pasos del visor (cada pantalla puede pasar los suyos con la prop "steps")
export const TOUR_STEPS = [
  { sel: '[data-tour="sky"]', title: 'This is the sky',
    text: 'A small patch of sky photographed by NASA’s SPHEREx telescope in infrared light. Drag to move around, scroll to zoom in and out.' },
  { sel: '[data-tour="player"]', title: 'Pictures from different dates',
    text: 'SPHEREx photographs the whole sky every six months. These controls play those dates like a flipbook: stars stay still and anything that moved seems to jump.' },
  { sel: '[data-tour="caption"]', title: 'What am I looking at?',
    text: 'This box always describes, in plain words, what is on screen right now and what to look for.' },
  { sel: '[data-tour="recipes"]', title: 'Quick recipes',
    text: 'Not sure where to start? Each recipe changes several settings at once for a common task, like spotting something that moves.' },
  { sel: '[data-tour="mode"]', title: 'Viewing mode',
    text: '“Blink” animates the dates, “Single frames” shows each photo, and “Difference” subtracts two dates so only what changed stands out.' },
  { sel: '[data-tour="detector"]', title: 'Infrared “colors”',
    text: 'SPHEREx has six detectors, each sensitive to a different infrared color. Cold objects like brown dwarfs shine most in D5 and D6.' },
  { sel: '[data-tour="photometry"]', title: 'Measure the brightness',
    text: 'Measures how bright the object in the center is in every photo, to draw its spectrum (brightness by color) or its light curve (brightness over time).' },
  { sel: '.sidebar .help-icon', title: 'Help is everywhere',
    text: 'Hover any control, reach it with the Tab key, or tap its ⓘ icon to see what it does. The “Glossary” link explains every space word in simple terms.' },
]

// Cada recorrido recuerda por separado si ya se vio (visor, pantalla de coordenadas, ...)
export const TOUR_KEYS = { viewer: 'openspherex.tourDone', explore: 'openspherex.tourExploreDone' }
export function tourAlreadySeen(key = TOUR_KEYS.viewer) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
function markSeen(key) {
  try { localStorage.setItem(key, '1') } catch { /* modo privado, etc.: no pasa nada */ }
}

const PAD = 6

export default function Tour({ open, onClose, steps: allSteps = TOUR_STEPS, storageKey = TOUR_KEYS.viewer }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const cardRef = useRef(null)
  const nextRef = useRef(null)
  const returnFocus = useRef(null)
  const [cardPos, setCardPos] = useState(null)

  // Pasos cuyo elemento existe ahora (p. ej. sin datos todavía no hay leyenda)
  const steps = allSteps.filter((s) => open && document.querySelector(s.sel))
  const cur = steps[Math.min(step, steps.length - 1)]

  const close = useCallback(() => {
    markSeen(storageKey)
    onClose()
    setStep(0)
    returnFocus.current?.focus?.()
  }, [onClose, storageKey])

  useEffect(() => {
    if (open) returnFocus.current = document.activeElement
  }, [open])

  const measure = useCallback(() => {
    const el = cur && document.querySelector(cur.sel)
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ left: r.left - PAD, top: r.top - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD })
  }, [cur])

  // Al cambiar de paso: llevar el elemento a la vista y medirlo
  useEffect(() => {
    if (!open || !cur) return
    const el = document.querySelector(cur.sel)
    // elementos altos (el visor en celular) van arriba, así la tarjeta entra debajo sin taparlos
    const tall = el && el.getBoundingClientRect().height > window.innerHeight * 0.45
    el?.scrollIntoView({ behavior: 'smooth', block: tall ? 'start' : 'center', inline: 'nearest' })
    const t = setTimeout(measure, 380)
    measure()
    nextRef.current?.focus()
    return () => clearTimeout(t)
  }, [open, cur, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, close, measure, steps.length])

  // Tarjeta: debajo del elemento si entra, si no arriba, si no a un costado
  useLayoutEffect(() => {
    if (!open || !rect || !cardRef.current) return
    const w = cardRef.current.offsetWidth, h = cardRef.current.offsetHeight
    const vw = window.innerWidth, vh = window.innerHeight
    let top, left
    if (rect.top + rect.height + 12 + h <= vh - 8) top = rect.top + rect.height + 12
    else if (rect.top - 12 - h >= 8) top = rect.top - 12 - h
    else if (rect.left + rect.width + 12 + w <= vw - 8) { left = rect.left + rect.width + 12; top = rect.top }
    else top = vh - h - 8
    if (left === undefined) left = rect.left + rect.width / 2 - w / 2
    left = Math.min(Math.max(8, left), vw - w - 8)
    top = Math.min(Math.max(8, top), vh - h - 8)
    setCardPos({ left, top })
  }, [open, rect, step])

  if (!open || !cur) return null
  const last = step >= steps.length - 1

  return createPortal(
    <div className="tour-layer">
      {rect && <div className="tour-spot" style={rect} aria-hidden="true" />}
      <div
        ref={cardRef}
        className={`tour-card${cur.items ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={cardPos ?? { left: -9999, top: 0 }}
        onKeyDown={(e) => {
          // el foco no sale del diálogo mientras está abierto
          if (e.key !== 'Tab') return
          const f = [...cardRef.current.querySelectorAll('button')]
          const i = f.indexOf(document.activeElement)
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
        }}
      >
        <p className="tour-count">Step {step + 1} of {steps.length}</p>
        <h3 id="tour-title">{cur.title}</h3>
        <p id="tour-text">{cur.text}</p>
        {cur.items && (
          <ul className="tour-items">
            {cur.items.map(([name, what]) => <li key={name}><b>{name}</b> — {what}</li>)}
          </ul>
        )}
        <div className="tour-actions">
          <button className="link" onClick={close}>Skip tour</button>
          <span style={{ flex: 1 }} />
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button ref={nextRef} className="btn" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
