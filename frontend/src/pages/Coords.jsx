import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTargets } from '../api.js'
import WithHelp from '../components/WithHelp.jsx'
import { HELP, TARGET_BLURBS } from '../help.js'
import Tour, { TOUR_KEYS, tourAlreadySeen } from '../components/Tour.jsx'
import { cleanCoords } from '../coords.js'

// Respaldo si el backend no responde: mismas coordenadas que el prototipo (sin movimiento propio).
const FALLBACK = [
  { id: 'barnard', name: "Barnard's Star", ra_deg: 269.4521, dec_deg: 4.6934 },
  { id: 'epsindib', name: 'Epsilon Indi B', ra_deg: 331.0438, dec_deg: -56.7827 },
  { id: 'wise0855', name: 'WISE 0855', ra_deg: 133.786245, dec_deg: -7.244373 },
  { id: 'rdra', name: 'R Draconis', ra_deg: 248.1783, dec_deg: 66.755 },
  { id: 'rwaur', name: 'RW Aurigae', ra_deg: 76.9567, dec_deg: 30.4014 },
]

const fmtSigned = (v) => (v >= 0 ? '+' : '') + v

// Recorrido de esta pantalla: para qué sirve el campo y qué son los botones de ejemplo
const EXPLORE_STEPS = [
  {
    sel: '[data-tour="coords-input"]',
    title: 'Where do you want to look?',
    text: 'Type the position of a spot in the sky as two numbers separated by a space: first Right Ascension (RA, from 0 to 360), then Declination (Dec, from −90 to +90). Only numbers, + and − are accepted. Press Enter and the viewer opens with that spot in the center.',
    items: [['Example', '133.786245 -7.244373 is where the brown dwarf WISE 0855 is.']],
  },
  {
    sel: '[data-tour="examples"]',
    title: 'Or pick a famous object',
    text: 'Don’t know any coordinates? These buttons already have them: each one opens the viewer centered on an object chosen by NASA for this challenge. Hover a button to see what it is and where it is.',
  },
  {
    sel: '[data-tour="examples"]',
    title: 'What is each one?',
    text: 'Pick one depending on what you want to see:',
    items: Object.entries({
      "Barnard's Star": TARGET_BLURBS.barnard,
      'Epsilon Indi B': TARGET_BLURBS.epsindib,
      'WISE 0855': TARGET_BLURBS.wise0855,
      'RW Aurigae': TARGET_BLURBS.rwaur,
      'R Draconis': TARGET_BLURBS.rdra,
    }),
  },
  {
    sel: '#screen-coords .help-icon',
    title: 'Help is always at hand',
    text: 'Hover anything with an ⓘ icon (or tap the icon on a phone) to see what it is for, in plain words. You can replay this tour any time with “How does this work?”.',
  },
]

export default function Coords() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [targets, setTargets] = useState(FALLBACK)
  const [fromBackend, setFromBackend] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  // el recorrido se abre solo la primera vez (después de la animación de entrada)
  useEffect(() => {
    if (tourAlreadySeen(TOUR_KEYS.explore)) return
    const t = setTimeout(() => setTourOpen(true), 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetchTargets()
      .then((d) => { setTargets(d.targets); setFromBackend(true) })
      .catch(() => { /* se quedan los de respaldo */ })
  }, [])

  function submit(e) {
    e.preventDefault()
    const parts = text.trim().split(/[\s,]+/).map(Number)
    if (parts.length !== 2 || parts.some((v) => !Number.isFinite(v)) || Math.abs(parts[1]) > 90) {
      setError('Use decimal degrees: "RA Dec", e.g. 133.786245 -7.244373')
      return
    }
    navigate(`/view?ra=${parts[0]}&dec=${parts[1]}`)
  }

  function open(t) {
    // Con el backend: por id (coordenadas ya corregidas por movimiento propio)
    navigate(fromBackend ? `/view?target=${t.id}` : `/view?ra=${t.ra_deg}&dec=${t.dec_deg}`)
  }

  return (
    <section id="screen-coords" className="screen active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>← BACK</button>
      <span className="brand-small">OpenSPHEREx</span>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="heading anim" style={{ '--i': 0 }}>Enter sky coordinates</h2>
        <WithHelp help={HELP.coordsInput} className="anim help-center" style={{ '--i': 1 }} data-tour="coords-input">
          <input
            className="input" type="text" autoComplete="off" aria-label="Sky coordinates"
            value={text} onChange={(e) => { setText(cleanCoords(e.target.value)); setError('') }}
            spellCheck={false}
          />
        </WithHelp>
        <p className="format-hint anim" style={{ '--i': 2 }}>
          {error || 'Suggested format: 133.786245 -7.244373'}
        </p>
      </form>

      <div className="try-row" data-tour="examples">
        <WithHelp help={HELP.targets} className="anim" style={{ '--i': 3 }}>
          <span className="try-label">or try:</span>
        </WithHelp>
        <div className="try-buttons">
          {targets.map((t, i) => (
            <button
              key={t.id} className="btn btn-chip anim" style={{ '--i': 4 + i }}
              data-coords={[TARGET_BLURBS[t.id], `RA ${t.ra_deg}°  Dec ${fmtSigned(t.dec_deg)}°`].filter(Boolean).join('\n')}
              aria-description={TARGET_BLURBS[t.id]}
              onClick={() => open(t)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button className="link tour-replay anim" style={{ '--i': 10 }} onClick={() => setTourOpen(true)}>
        🧭 How does this work?
      </button>

      <Tour open={tourOpen} onClose={() => setTourOpen(false)} steps={EXPLORE_STEPS} storageKey={TOUR_KEYS.explore} />
    </section>
  )
}
