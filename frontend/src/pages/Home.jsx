import { useNavigate } from 'react-router-dom'
import AnimatedTitle from '../components/AnimatedTitle.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'
import { useI18n } from '../i18n/index.jsx'
import gatitoOjos from '../images/gatito-ojos.png'

export default function Home() {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <section id="screen-home" className="screen active">
      <div className="top-right"><LanguageSelect /></div>

      <p className="kicker anim" style={{ '--i': 0 }}>{t('ui.kicker')}</p>
      <div className="title-wrap">
        <AnimatedTitle text="OpenSPHEREx" />
        <span className="tagline">{t('ui.tagline')}</span>
      </div>

      <button className="btn btn-start" onClick={() => navigate('/explore')}>{t('ui.start')}</button>

      <nav className="footer-links">
        <button className="link anim" style={{ '--i': 14 }} onClick={() => navigate('/about')}>{t('ui.aboutSpherex')}</button>
        <a className="link anim" style={{ '--i': 15 }} href="https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/" target="_blank" rel="noopener noreferrer">{t('ui.aboutChallenge')}</a>
        <button className="link anim" style={{ '--i': 16 }} onClick={() => navigate('/team')}>{t('ui.aboutTeam')}</button>
        <button className="link anim" style={{ '--i': 17 }} onClick={() => navigate('/glossary')}>{t('ui.glossary')}</button>
      </nav>

      <img src={gatitoOjos} alt="Gatito con ojos" className="home-gatito anim" style={{ '--i': 18 }} />
    </section>
  )
}
