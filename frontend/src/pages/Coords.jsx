import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTargets } from '../api.js'

// Respaldo si el backend no responde: mismas coordenadas que el prototipo (sin movimiento propio).
const FALLBACK = [
  { id: 'barnard', name: "Barnard's Star", ra_deg: 269.4521, dec_deg: 4.6934 },
  { id: 'epsindib', name: 'Epsilon Indi B', ra_deg: 331.0438, dec_deg: -56.7827 },
  { id: 'wise0855', name: 'WISE 0855', ra_deg: 133.786245, dec_deg: -7.244373 },
  { id: 'rdra', name: 'R Draconis', ra_deg: 248.1783, dec_deg: 66.755 },
  { id: 'rwaur', name: 'RW Aurigae', ra_deg: 76.9567, dec_deg: 30.4014 },
]

const fmtSigned = (v) => (v >= 0 ? '+' : '') + v

export default function Coords() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [targets, setTargets] = useState(FALLBACK)
  const [fromBackend, setFromBackend] = useState(false)

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
        <input
          className="input anim" style={{ '--i': 1 }} type="text" autoComplete="off" aria-label="Sky coordinates"
          value={text} onChange={(e) => { setText(e.target.value); setError('') }}
        />
        <p className="format-hint anim" style={{ '--i': 2 }}>
          {error || 'Suggested format: 133.786245 -7.244373'}
        </p>
      </form>

      <div className="try-row">
        <span className="try-label anim" style={{ '--i': 3 }}>or try:</span>
        <div className="try-buttons">
          {targets.map((t, i) => (
            <button
              key={t.id} className="btn btn-chip anim" style={{ '--i': 4 + i }}
              data-coords={`RA ${t.ra_deg}°  Dec ${fmtSigned(t.dec_deg)}°`}
              onClick={() => open(t)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
