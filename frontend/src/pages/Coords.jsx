import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTargets } from '../api.js'
import WithHelp from '../components/WithHelp.jsx'
import Tour, { TOUR_KEYS, tourAlreadySeen } from '../components/Tour.jsx'
import { cleanCoords } from '../coords.js'
import { useI18n } from '../i18n/index.jsx'

// Respaldo si el backend no responde: mismas coordenadas que el prototipo (sin movimiento propio).
const FALLBACK = [
  { id: 'barnard', ra_deg: 269.4521, dec_deg: 4.6934 },
  { id: 'epsindib', ra_deg: 331.0438, dec_deg: -56.7827 },
  { id: 'wise0855', ra_deg: 133.786245, dec_deg: -7.244373 },
  { id: 'rdra', ra_deg: 248.1783, dec_deg: 66.755 },
  { id: 'rwaur', ra_deg: 76.9567, dec_deg: 30.4014 },
]
const EXAMPLE = '133.786245 -7.244373'
const fmtSigned = (v) => (v >= 0 ? '+' : '') + v

export default function Coords() {
  const navigate = useNavigate()
  const { t, m, lang } = useI18n()
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const [targets, setTargets] = useState(FALLBACK)
  const [fromBackend, setFromBackend] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const name = (id) => m.targetNames[id] ?? id

  useEffect(() => {
    fetchTargets()
      .then((d) => { setTargets(d.targets); setFromBackend(true) })
      .catch(() => { /* se quedan los de respaldo */ })
  }, [])

  // el recorrido se abre solo la primera vez en cada idioma (después de la animación de entrada)
  useEffect(() => {
    if (tourAlreadySeen(TOUR_KEYS.explore, lang)) return
    const tm = setTimeout(() => setTourOpen(true), 1200)
    return () => clearTimeout(tm)
  }, [lang])

  // Recorrido de esta pantalla: para qué sirve el campo y qué son los botones de ejemplo
  const steps = useMemo(() => {
    const x = m.tours.explore
    return [
      { sel: '[data-tour="coords-input"]', title: x.input.title, text: x.input.text, items: [[x.input.exampleLabel, x.input.example]] },
      { sel: '[data-tour="examples"]', title: x.examples.title, text: x.examples.text },
      {
        sel: '[data-tour="examples"]', title: x.each.title, text: x.each.text,
        items: ['barnard', 'epsindib', 'wise0855', 'rwaur', 'rdra'].map((id) => [name(id), m.blurbs[id]]),
      },
      { sel: '#screen-coords .help-icon', title: x.help.title, text: x.help.text },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m])

  function submit(e) {
    e.preventDefault()
    const parts = text.trim().split(/[\s,]+/).map(Number)
    if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v)) || Math.abs(parts[1]) > 90) {
      setError(true)
      return
    }
    navigate(`/view?ra=${parts[0]}&dec=${parts[1]}`)
  }

  function open(tg) {
    // Con el backend: por id (coordenadas ya corregidas por movimiento propio)
    navigate(fromBackend ? `/view?target=${tg.id}` : `/view?ra=${tg.ra_deg}&dec=${tg.dec_deg}`)
  }

  return (
    <section id="screen-coords" className="screen active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>{t('ui.back')}</button>
      <span className="brand-small">OpenSPHEREx</span>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="heading anim" style={{ '--i': 0 }}>{t('ui.enterCoords')}</h2>
        <WithHelp help={m.help.coordsInput} className="anim help-center" style={{ '--i': 1 }} data-tour="coords-input">
          <input
            className="input" type="text" autoComplete="off" aria-label={t('ui.coordsAria')}
            value={text} onChange={(e) => { setText(cleanCoords(e.target.value)); setError(false) }}
            spellCheck={false}
          />
        </WithHelp>
        <p className="format-hint anim" style={{ '--i': 2 }}>
          {error ? t('ui.coordsError', { example: EXAMPLE }) : t('ui.suggestedFormat', { example: EXAMPLE })}
        </p>
      </form>

      <div className="try-row" data-tour="examples">
        <WithHelp help={m.help.targets} className="anim" style={{ '--i': 3 }}>
          <span className="try-label">{t('ui.orTry')}</span>
        </WithHelp>
        <div className="try-buttons">
          {targets.map((tg, i) => (
            <button
              key={tg.id} className="btn btn-chip anim" style={{ '--i': 4 + i }}
              data-coords={[m.blurbs[tg.id], t('ui.coordsTooltip', { ra: tg.ra_deg, dec: fmtSigned(tg.dec_deg) })].filter(Boolean).join('\n')}
              aria-description={m.blurbs[tg.id]}
              onClick={() => open(tg)}
            >
              {name(tg.id)}
            </button>
          ))}
        </div>
      </div>

      <button className="link tour-replay anim" style={{ '--i': 10 }} onClick={() => setTourOpen(true)}>
        {t('ui.howItWorks')}
      </button>

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={steps} storageKey={TOUR_KEYS.explore} />
    </section>
  )
}
