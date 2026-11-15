import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import LanguageSelect from '../components/LanguageSelect.jsx'

export default function AboutSpherex() {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <section id="screen-about" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>{t('ui.back')}</button>
      <div className="top-right">
        <LanguageSelect />
        <span className="brand-small">OpenSPHEREx</span>
      </div>

      <article className="about-content">
        <h1 className="page-title anim" style={{ '--i': 0 }}>{t('ui.aboutTitle')}</h1>

        <section className="info-card anim" style={{ '--i': 1 }}>
          <h2>{t('ui.aboutWhatTitle')}</h2>
          <p>{t('ui.aboutWhat1')}<strong>{t('ui.aboutWhatStrong')}</strong>{t('ui.aboutWhat2')}</p>
        </section>

        <section className="info-card anim" style={{ '--i': 2 }}>
          <h2>{t('ui.aboutHowTitle')}</h2>
          <p>{t('ui.aboutHow1')}<strong>{t('ui.aboutHowStrong')}</strong>{t('ui.aboutHow2')}</p>
        </section>

        <section className="info-card anim" style={{ '--i': 3 }}>
          <h2>{t('ui.aboutWhyTitle')}</h2>
          <ul className="reason-list">
            <li><b>{t('ui.aboutWhyOriginsB')}</b>{t('ui.aboutWhyOrigins')}</li>
            <li><b>{t('ui.aboutWhyGalaxiesB')}</b>{t('ui.aboutWhyGalaxies')}</li>
            <li><b>{t('ui.aboutWhyLifeB')}</b>{t('ui.aboutWhyLife')}</li>
          </ul>
        </section>
      </article>
    </section>
  )
}
