// Todo pedido al backend pasa por acá (docs/CONTRATO_API.md v1.1).
// Las URLs de imágenes vienen armadas en el JSON: solo se les antepone la base.

const BASE = import.meta.env.VITE_API_BASE ?? '' // vacío en dev/preview (usa el proxy)
export const apiUrl = (path) => `${BASE}${path}`

async function get(path) {
  let r
  try {
    r = await fetch(apiUrl(path))
  } catch {
    throw new Error('Cannot reach the backend. Is it running on port 8000?')
  }
  let body = null
  try { body = await r.json() } catch { /* respuesta no JSON */ }
  if (!r.ok) throw new Error(body?.error?.message ?? `Error ${r.status}`)
  return body
}

export const fetchTargets = () => get('/api/targets')
export const fetchSky = (qs) => get(`/api/sky?${qs}`)
export const fetchPhotometry = (qs) => get(`/api/photometry?${qs}`)

// Agrega/reemplaza parámetros (p. ej. stretch) en una URL que vino del backend.
export function withParams(url, params) {
  const [path, query = ''] = url.split('?')
  const sp = new URLSearchParams(query)
  for (const [k, v] of Object.entries(params)) if (v != null) sp.set(k, v)
  return `${path}?${sp}`
}

// /api/diff.png no viene en /api/sky: se arma con los parámetros de la consulta.
export function diffUrl(sky, a, b, detector) {
  const q = sky.query
  const sp = new URLSearchParams({
    ra: q.ra_deg, dec: q.dec_deg, fov_arcmin: q.fov_arcmin, a, b, detector,
  })
  return `/api/diff.png?${sp}`
}
