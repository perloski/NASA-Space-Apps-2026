import { useNavigate } from 'react-router-dom'

const TEAM = [
  { name: 'Emiliano', role: 'Backend Dev' },
  { name: 'Lazaro', role: 'Backend Dev' },
  { name: 'Alma', role: 'Designer' },
  { name: 'Perla', role: 'Frontend Dev' },
]

export default function Team() {
  const navigate = useNavigate()
  return (
    <section id="screen-team" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>← BACK</button>
      <span className="brand-small">OpenSPHEREx</span>

      <div className="about-content" style={{ maxWidth: 960 }}>
        <h1 className="page-title anim" style={{ '--i': 0 }}>About us</h1>
        <p className="page-subtitle anim" style={{ '--i': 1 }}>Team Athenas IV · NASA Space Apps Challenge 2026</p>

        <div className="team-grid">
          {TEAM.map((m, i) => (
            <article key={m.name} className="team-card anim" style={{ '--i': 2 + i }}>
              <div className="avatar" aria-hidden="true">{m.name[0]}</div>
              <h2 className="member-name">{m.name}</h2>
              <p className="member-role">{m.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
