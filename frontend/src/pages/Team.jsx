import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'
import gatoEmi from '../images/Gatos-presentacion-Emi.png'
import gatoLaza from '../images/Gatos-presentacion-Laza.png'
import gatoPerla from '../images/Gatos-presentacion-Perla.png'
import gatoAlma from '../images/Gatos-presentacion.png'

const TEAM = [
  { name: 'Emiliano', role: 'roleBackend', cat: gatoEmi },
  { name: 'Lazaro', role: 'roleBackend', cat: gatoLaza },
  { name: 'Alma', role: 'roleDesigner', cat: gatoAlma },
  { name: 'Perla', role: 'roleFrontend', cat: gatoPerla },
]

export default function Team() {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <section id="screen-team" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>{t('ui.back')}</button>
      <div className="top-right">
        <LanguageSelect />
        <span className="brand-small">OpenSPHEREx</span>
      </div>

      <div className="about-content" style={{ maxWidth: 960 }}>
        <h1 className="page-title anim" style={{ '--i': 0 }}>{t('ui.teamTitle')}</h1>
        <p className="page-subtitle anim" style={{ '--i': 1 }}>{t('ui.teamSubtitle')}</p>

        <div className="team-grid">
          {TEAM.map((p, i) => (
            <article key={p.name} className="team-card anim" style={{ '--i': 2 + i }}>
              <div className="avatar" aria-hidden="true">{p.name[0]}</div>
              <div className="team-card-info">
                <h2 className="member-name">{p.name}</h2>
                <p className="member-role">{t(`ui.${p.role}`)}</p>
              </div>
              <img src={p.cat} alt="" className="team-card-cat" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
