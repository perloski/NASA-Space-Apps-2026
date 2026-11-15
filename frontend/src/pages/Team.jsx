import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

const TEAM = [
  { name: 'Emiliano', role: 'roleBackend' },
  { name: 'Lazaro', role: 'roleBackend' },
  { name: 'Alma', role: 'roleDesigner' },
  { name: 'Perla', role: 'roleFrontend' },
]

export default function Team() {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <section id="screen-team" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>{t('ui.back')}</button>
      <span className="brand-small">OpenSPHEREx</span>

      <div className="about-content" style={{ maxWidth: 960 }}>
        <h1 className="page-title anim" style={{ '--i': 0 }}>{t('ui.teamTitle')}</h1>
        <p className="page-subtitle anim" style={{ '--i': 1 }}>{t('ui.teamSubtitle')}</p>

        <div className="team-grid">
          {TEAM.map((p, i) => (
            <article key={p.name} className="team-card anim" style={{ '--i': 2 + i }}>
              <div className="avatar" aria-hidden="true">{p.name[0]}</div>
              <h2 className="member-name">{p.name}</h2>
              <p className="member-role">{t(`ui.${p.role}`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
