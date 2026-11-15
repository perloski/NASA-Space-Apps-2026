import { LANGUAGES, useI18n } from '../i18n/index.jsx'

// Selector de idioma. Está arriba a la derecha en todas las pantallas (por si se llega a cualquiera
// pantallas directamente con un link). Los nombres van en su propio idioma.
export default function LanguageSelect({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  return (
    <label className={`lang-select ${className}`}>
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">{t('ui.language')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('ui.language')}>
        {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
      </select>
    </label>
  )
}
