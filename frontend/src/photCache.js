// Caché de la fotometría (espectro / curva de luz) en el navegador.
//
// Medir puede tardar minutos la primera vez. Si el usuario sale del visor (glosario, otra
// pantalla, recarga, otra pestaña) y vuelve, el resultado se recupera sin volver a medir.
//   · Datos: localStorage (sobrevive recargas y pestañas), con copia en memoria por si
//     localStorage no está disponible (modo privado, almacenamiento bloqueado).
//   · Mediciones en curso: si se sale a la mitad, el pedido sigue y su resultado se guarda; al
//     volver, el visor se engancha a ese mismo pedido en vez de empezar otro.

// v2: antes se guardaban mediciones vacías (estrellas saturadas como R Draconis daban 0 puntos)
const STORAGE_KEY = 'openspherex.photometry.v2'
const MAX_ENTRIES = 20

const memory = new Map() // clave -> entrada (también funciona sin localStorage)
const pending = new Map() // clave -> Promise de una medición en curso

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // lleno o bloqueado: queda la copia en memoria
  }
}

/** Clave de una medición: posición, campo de visión y detector(es) medidos. */
export function photKey(query, det) {
  if (!query) return null
  return `${query.ra_deg.toFixed(6)}|${query.dec_deg.toFixed(6)}|${query.fov_arcmin}|${det}`
}

/** { data, view, lcDet, open, savedAt } o null. */
export function getPhot(key) {
  if (!key) return null
  return memory.get(key) ?? readAll()[key] ?? null
}

/** Guarda (o actualiza parte de) una entrada y conserva solo las MAX_ENTRIES más recientes. */
export function savePhot(key, patch) {
  if (!key) return
  const prev = getPhot(key) ?? {}
  const entry = { ...prev, ...patch, savedAt: Date.now() }
  memory.set(key, entry)
  const all = readAll()
  all[key] = entry
  const keys = Object.keys(all).sort((a, b) => (all[b].savedAt ?? 0) - (all[a].savedAt ?? 0))
  for (const k of keys.slice(MAX_ENTRIES)) delete all[k]
  writeAll(all)
}

/** Mide (o se engancha a una medición en curso) y guarda el resultado aunque nadie lo espere ya. */
export function measureOnce(key, fetcher) {
  if (pending.has(key)) return pending.get(key)
  const p = fetcher()
    .then((data) => {
      if (data?.points?.length) savePhot(key, { data, open: true }) // un resultado vacío no se guarda
      return data
    })
    .finally(() => pending.delete(key))
  pending.set(key, p)
  return p
}

export function isMeasuring(key) {
  return pending.has(key)
}
