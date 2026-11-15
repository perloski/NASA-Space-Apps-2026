import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LanguageSelect from '../components/LanguageSelect.jsx'
import { useI18n } from '../i18n/index.jsx'

// Glosario en lenguaje simple. Se llega desde los enlaces "Learn more" de las ayudas
// (/glossary?lang=xx#<id>, se abre en otra pestaña) o desde los enlaces de la app.
// Los ids de los términos (el #ancla) son los mismos en todos los idiomas.
export default function Glossary() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { t, m, lang } = useI18n()
  const [query, setQuery] = useState('')
  const target = decodeURIComponent(hash.replace('#', ''))
  const all = useMemo(() => Object.entries(m.glossary).map(([id, g]) => ({ id, ...g })), [m])

  const items = useMemo(() => {
    const sorted = [...all].sort((a, b) => a.term.localeCompare(b.term, lang))
    const q = query.trim().toLocaleLowerCase(lang)
    if (!q) return sorted
    return sorted.filter((g) => `${g.term} ${g.short} ${g.text}`.toLocaleLowerCase(lang).includes(q))
  }, [all, query, lang])

  // Ir al término pedido en la URL (#id) y resaltarlo
  useEffect(() => {
    if (!target) return
    const tm = setTimeout(() => {
      const el = document.getElementById(target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    }, 500) // después de la animación de entrada
    return () => clearTimeout(tm)
  }, [target])

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <section id="screen-glossary" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={back}>{t('ui.back')}</button>
      <div className="top-right">
        <LanguageSelect />
        <span className="brand-small">OpenSPHEREx</span>
      </div>

      <article className="about-content">
        <h1 className="page-title anim" style={{ '--i': 0 }}>{t('ui.glossary')}</h1>
        <p className="page-subtitle anim" style={{ '--i': 1 }}>{t('ui.glossarySubtitle')}</p>

        <div className="glossary-search anim" style={{ '--i': 2 }}>
          <label htmlFor="g-search" className="sr-only">{t('ui.searchLabel')}</label>
          <input
            id="g-search" className="vinput" type="search" placeholder={t('ui.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
          />
          <span className="hint" aria-live="polite">{t('ui.wordsCount', { n: items.length, total: all.length })}</span>
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
                {g.example && <p className="glossary-example"><b>{t('ui.example')}</b> {g.example}</p>}
              </dd>
            </div>
          ))}
          {items.length === 0 && <p className="hint">{t('ui.noMatch', { q: query })}</p>}
        </dl>
      </article>
    </section>
  )
}
