import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Envuelve un control y muestra su explicación (textos en src/help.js).
//
// Cómo se abre (pensado para que funcione para todos):
//   · pasando el mouse por el control (con una pequeña demora, para no molestar),
//   · al llegar con el teclado (Tab) a cualquier control de adentro,
//   · tocando / haciendo clic en el ícono ⓘ (en celulares no hay "hover"): queda fija hasta
//     tocar afuera, volver a tocar el ícono o apretar Escape.
// Pautas WCAG 1.4.13: se puede cerrar con Escape, se puede pasar el mouse por encima de la ayuda
// sin que se cierre, y no desaparece sola mientras el control tiene el foco.
// Lectores de pantalla: el texto completo queda asociado al control con aria-describedby.
//
// Props: help ({ title, does, see, tip }), as (etiqueta del contenedor interno, p. ej. 'form'),
// className/style van al envoltorio (para las animaciones), innerClassName al contenedor interno,
// y el resto de las props (onSubmit, etc.) también al contenedor interno.

const OPEN_DELAY = 300 // ms antes de mostrar al pasar el mouse
const CLOSE_GRACE = 150 // ms para poder mover el mouse del control a la ayuda
const GAP = 10

export default function WithHelp({ help, as: Tag = 'div', className = '', style, innerClassName = '', children, ...rest }) {
  const id = useId()
  const descId = `help-${id}`
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const timers = useRef({})
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false) // Escape: ocultar hasta que el usuario se vaya y vuelva
  const [pos, setPos] = useState(null)
  const open = (hovered || focused || pinned) && !dismissed

  const clear = (k) => clearTimeout(timers.current[k])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  // Asociar la descripción al primer control de adentro (para lectores de pantalla)
  useEffect(() => {
    const ctl = wrapRef.current?.querySelector('input, select, textarea, button:not(.help-icon)')
    if (!ctl) return
    const prev = ctl.getAttribute('aria-describedby')
    const ids = new Set((prev ?? '').split(' ').filter(Boolean))
    ids.add(descId)
    ctl.setAttribute('aria-describedby', [...ids].join(' '))
    return () => { if (prev) ctl.setAttribute('aria-describedby', prev); else ctl.removeAttribute('aria-describedby') }
  }, [descId])

  // Posición: a la derecha del control si hay lugar, si no a la izquierda, si no debajo.
  const place = useCallback(() => {
    const wrap = wrapRef.current, tip = tipRef.current
    if (!wrap || !tip) return
    const r = wrap.getBoundingClientRect()
    const w = tip.offsetWidth, h = tip.offsetHeight
    const vw = window.innerWidth, vh = window.innerHeight
    let left, top
    if (r.right + GAP + w <= vw - 8) { left = r.right + GAP; top = r.top }
    else if (r.left - GAP - w >= 8) { left = r.left - GAP - w; top = r.top }
    else {
      left = Math.min(Math.max(8, r.left), vw - w - 8)
      top = r.bottom + GAP
      if (top + h > vh - 8 && r.top - GAP - h >= 8) top = r.top - GAP - h // arriba si abajo no entra
    }
    top = Math.min(Math.max(8, top), Math.max(8, vh - h - 8))
    setPos({ left, top })
  }, [])

  useLayoutEffect(() => { if (open) place(); else setPos(null) }, [open, place])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { setDismissed(true); setPinned(false) } }
    const onDown = (e) => {
      if (!pinned) return
      if (!wrapRef.current?.contains(e.target) && !tipRef.current?.contains(e.target)) setPinned(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true) // también el scroll de la barra lateral
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, pinned, place])

  const enter = () => {
    clear('close')
    clear('open')
    timers.current.open = setTimeout(() => setHovered(true), OPEN_DELAY)
  }
  const leave = () => {
    clear('open')
    timers.current.close = setTimeout(() => { setHovered(false); setDismissed(false) }, CLOSE_GRACE)
  }

  return (
    <div
      ref={wrapRef}
      className={`help-wrap ${className}`}
      style={style}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') enter() }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') leave() }}
      // solo foco de teclado (:focus-visible): con el mouse ya está el hover, y así el clic en ⓘ
      // para cerrar la ayuda no la deja abierta por el foco
      onFocus={(e) => { if (e.target.matches?.(':focus-visible') && !e.target.classList.contains('help-icon')) setFocused(true) }}
      onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget)) { setFocused(false); setDismissed(false) } }}
    >
      <Tag className={innerClassName} {...rest}>{children}</Tag>
      <button
        type="button"
        className={`help-icon${open ? ' on' : ''}`}
        tabIndex={-1} // con teclado la ayuda ya se abre al llegar al control: el ícono no suma paradas al Tab
        aria-label={`What is “${help.title}”?`}
        aria-expanded={pinned}
        onClick={() => { setDismissed(false); setPinned((p) => !p) }}
      >
        i
      </button>
      {/* Texto para lectores de pantalla (siempre presente, no se ve) */}
      <span id={descId} className="sr-only">
        {`${help.does} What you will see: ${help.see}${help.tip ? ` Tip: ${help.tip}` : ''}`}
      </span>
      {open && createPortal(
        <div
          ref={tipRef}
          className="help-tip"
          role="tooltip"
          aria-hidden="true"
          style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
          onPointerEnter={() => clear('close')}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') leave() }}
        >
          <p className="help-title">{help.title}</p>
          <p className="help-label">What it does</p>
          <p>{help.does}</p>
          <p className="help-label">What you will see</p>
          <p>{help.see}</p>
          {help.tip && <p className="help-tipline"><span aria-hidden="true">💡 </span>{help.tip}</p>}
        </div>,
        document.body,
      )}
    </div>
  )
}
