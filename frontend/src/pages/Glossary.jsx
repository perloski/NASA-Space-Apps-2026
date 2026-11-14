import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GLOSSARY } from '../glossary.js'

// Glosario en lenguaje simple. Se llega desde los enlaces "Learn more" de las ayudas
// (/glossary#<id>, se abre en otra pestaña) o desde los enlaces de la app.
export default function Glossary() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  const target = decodeURIComponent(hash.replace('#', ''))

  const items = useMemo(() => {
    const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((g) => `${g.term} ${g.short} ${g.text}`.toLowerCase().includes(q))
  }, [query])

  // Ir al término pedido en la URL (#id) y resaltarlo
  useEffect(() => {
    if (!target) return
    const t = setTimeout(() => {
      const el = document.getElementById(target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }, 500) // después de la animación de entrada
    return () => clearTimeout(t)
  }, [target])

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <section id="screen-glossary" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={back}>← BACK</button>
      <span className="brand-small">OpenSPHEREx</span>

      <article className="about-content">
        <h1 className="page-title anim" style={{ '--i': 0 }}>Glossary</h1>
        <p className="page-subtitle anim" style={{ '--i': 1 }}>Space words used in this viewer, in plain language</p>

        <div className="glossary-search anim" style={{ '--i': 2 }}>
          <label htmlFor="g-search" className="sr-only">Search the glossary</label>
          <input
            id="g-search" className="vinput" type="search" placeholder="Search a word… (e.g. infrared)"
            value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
          />
          <span className="hint" aria-live="polite">{items.length} of {GLOSSARY.length} words</span>
        </div>

        <dl className="glossary-list">
          {items.map((g, i) => (
            <div
              key={g.id} id={g.id} tabIndex={-1}
              className={`info-card glossary-item anim${g.id === target ? ' highlight' : ''}`}
              style={{ '--i': Math.min(3 + i, 12) }}
            >
              <dt><h2>{g.term}</h2></dt>
              <dd>
                <p className="glossary-short">{g.short}</p>
                <p>{g.text}</p>
                {g.example && <p className="glossary-example"><b>Example:</b> {g.example}</p>}
              </dd>
            </div>
          ))}
          {items.length === 0 && <p className="hint">No words match “{query}”.</p>}
        </dl>
      </article>
    </section>
  )
}
