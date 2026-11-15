import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './locales/en.js'

// Idiomas de la interfaz. Los textos de cada uno están en locales/<code>.js con la misma
// estructura que en.js (el inglés es la referencia: si a un idioma le falta un texto, se usa el
// inglés en lugar de romperse). Cada traducción se carga recién cuando se elige ese idioma.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
  { code: 'de-CH', name: 'Deutsch (Schweiz)' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'sv', name: 'Svenska' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
]
const CODES = LANGUAGES.map((l) => l.code)
const STORAGE_KEY = 'openspherex.lang'
const loaders = import.meta.glob('./locales/*.js')

// Alemán estándar suizo (Schweizer Hochdeutsch): se escribe "ss" en lugar de "ß".
function swissify(value) {
  if (typeof value === 'string') return value.replace(/ß/g, 'ss')
  if (Array.isArray(value)) return value.map(swissify)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swissify(v)]))
  return value
}

async function loadLocale(code) {
  if (code === 'en') return {}
  if (code === 'de-CH') return swissify((await loaders['./locales/de.js']()).default)
  const load = loaders[`./locales/${code}.js`]
  return load ? (await load()).default : {}
}

function deepMerge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base
  const out = { ...base }
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base?.[k] ? deepMerge(base[k], v) : v
  }
  return out
}

export function detectLanguage() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (fromUrl && CODES.includes(fromUrl)) return fromUrl
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && CODES.includes(saved)) return saved
  } catch { /* sin localStorage: se sigue con el idioma del sistema */ }
  for (const pref of navigator.languages ?? [navigator.language]) {
    if (CODES.includes(pref)) return pref
    const base = pref?.split('-')[0]
    if (CODES.includes(base)) return base
  }
  return 'en'
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage)
  const [messages, setMessages] = useState(en)

  useEffect(() => {
    let cancelled = false
    loadLocale(lang).then((loc) => { if (!cancelled) setMessages(deepMerge(en, loc)) })
    document.documentElement.lang = lang
    return () => { cancelled = true }
  }, [lang])

  const setLang = useCallback((code) => {
    if (!CODES.includes(code)) return
    try { localStorage.setItem(STORAGE_KEY, code) } catch { /* no pasa nada */ }
    setLangState(code)
  }, [])

  // t('ui.clave', { var }) -> texto con {var} reemplazado
  const t = useCallback((path, vars) => {
    let s = path.split('.').reduce((o, k) => o?.[k], messages)
    if (typeof s !== 'string') s = path.split('.').reduce((o, k) => o?.[k], en) ?? path
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
  }, [messages])

  const value = useMemo(() => ({ lang, setLang, t, m: messages }), [lang, setLang, t, messages])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

/** Agrega ?lang= a un enlace interno, para que se abra en el mismo idioma (p. ej. el glosario). */
export function withLang(href, lang) {
  const [pathAndQuery, hash] = href.split('#')
  const [path, query = ''] = pathAndQuery.split('?')
  const sp = new URLSearchParams(query)
  sp.set('lang', lang)
  return `${path}?${sp}${hash ? `#${hash}` : ''}`
}

/** Fecha MJD -> "may 2025" en el idioma elegido. */
export function monthLabel(mjd, lang) {
  const d = new Date((mjd - 40587) * 86400000)
  return new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

/** Fecha ISO -> fecha y hora (UTC) en el idioma elegido. */
export function dateTimeLabel(iso, lang) {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso))
}
