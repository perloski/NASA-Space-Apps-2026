import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/index.jsx'

// Recorrido guiado: ilumina una parte de la pantalla por vez (elementos con data-tour="...") y
// la explica. Se abre solo la primera vez (recordado en localStorage) y con el botón "Take the tour".
// Accesible: diálogo con foco en "Next", Escape para salir, el foco vuelve a donde estaba.

// Partes del visor que ilumina su recorrido (los textos están en i18n: tours.viewer.<id>)
export const VIEWER_TOUR = [
  { id: 'sky', sel: '[data-tour="sky"]' },
  { id: 'player', sel: '[data-tour="player"]' },
  { id: 'caption', sel: '[data-tour="caption"]' },
  { id: 'recipes', sel: '[data-tour="recipes"]' },
  { id: 'mode', sel: '[data-tour="mode"]' },
  { id: 'detector', sel: '[data-tour="detector"]' },
  { id: 'photometry', sel: '[data-tour="photometry"]' },
  { id: 'help', sel: '.sidebar .help-icon' },
]

// Cada recorrido recuerda por separado si ya se vio (visor, pantalla de coordenadas, ...), y
// también por idioma: quien lo vio en inglés y entra en español lo ve una vez más, en español.
export const TOUR_KEYS = { viewer: 'openspherex.tourDone', explore: 'openspherex.tourExploreDone' }
export function tourAlreadySeen(key, lang) {
  try { return localStorage.getItem(`${key}.${lang}`) === '1' } catch { return false }
}
function markSeen(key, lang) {
  try { localStorage.setItem(`${key}.${lang}`, '1') } catch { /* modo privado, etc.: no pasa nada */ }
}

const PAD = 6

// steps: [{ sel, title, text, items? }] ya traducidos por quien abre el recorrido
export default function Tour({ open, onClose, steps: allSteps, storageKey = TOUR_KEYS.viewer }) {
  const { t, lang } = useI18n()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const cardRef = useRef(null)
  const nextRef = useRef(null)
  const returnFocus = useRef(null)
  const [cardPos, setCardPos] = useState(null)

  // Pasos cuyo elemento existe ahora (p. ej. sin datos todavía no hay leyenda)
  const steps = allSteps.filter((s) => open && document.querySelector(s.sel))
  const cur = steps[Math.min(step, steps.length - 1)]
  // los pasos llegan como objetos nuevos en cada render (vienen traducidos): los efectos dependen
  // del selector, que es estable, para no repetirse en cada render
  const curSel = cur?.sel

  const close = useCallback(() => {
    markSeen(storageKey, lang)
    onClose()
    setStep(0)
    returnFocus.current?.focus?.()
  }, [onClose, storageKey, lang])

  useEffect(() => {
    if (open) returnFocus.current = document.activeElement
  }, [open])

  const measure = useCallback(() => {
    const el = cur && document.querySelector(cur.sel)
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ left: r.left - PAD, top: r.top - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD })
  }, [curSel]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [open, curSel, step, measure]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <p className="tour-count">{t('ui.stepOf', { n: step + 1, total: steps.length })}</p>
        <h3 id="tour-title">{cur.title}</h3>
        <p id="tour-text">{cur.text}</p>
        {cur.items && (
          <ul className="tour-items">
            {cur.items.map(([name, what]) => <li key={name}><b>{name}</b> — {what}</li>)}
          </ul>
        )}
        <div className="tour-actions">
          <button className="link" onClick={close}>{t('ui.skipTour')}</button>
          <span style={{ flex: 1 }} />
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>{t('ui.tourBack')}</button>}
          <button ref={nextRef} className="btn" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? t('ui.tourDone') : t('ui.tourNext')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
