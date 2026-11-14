# Stack tecnológico — Frontend OpenSPHEREx

> Team Athenas IV · NASA Space Apps Challenge 2026
> Consume la API descrita en `docs/CONTRATO_API.md` (v1.1).

## Resumen

| Capa | Elección | Por qué |
|---|---|---|
| Build / dev server | **Vite** | Arranque instantáneo, hot reload, proxy a la API en desarrollo |
| UI | **React** (JavaScript, componentes de función + hooks) | El equipo lo conoce; los componentes se mapean 1 a 1 con las pantallas del prototipo |
| Visor del cielo | **Aladin Lite v3** (CDS) | Muestra imágenes con WCS, catálogos (Gaia) y fondos HiPS (AllWISE) sin programar un visor propio |
| Navegación | **React Router** | URLs compartibles con coordenadas (`/view?ra=…&dec=…`), como pide el reto |
| Estilos | **CSS plano con variables** (el del prototipo `index.html`) | Ya está hecho y animado; sin Tailwind ni librerías de componentes para no perder tiempo |
| Gráficos (espectro / curva de luz) | **Recharts** | Simple en React; alcanza para una línea o nube de puntos |
| Estado | `useState` / `useReducer` + parámetros de la URL | La app es chica; no hace falta Redux ni Zustand |
| Datos | `fetch` nativo con un helper `api.js` | Sin axios: los endpoints son todos `GET` |

## Requisitos

- **Node.js LTS** (la versión que pida la Vite instalada; verificar con `node -v`).
- Backend corriendo en `http://localhost:8000` (o en modo mock: `SPHEREX_MOCK=1`).

## Crear el proyecto

```bash
# desde la raíz del repo
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install aladin-lite react-router-dom recharts
npm run dev
```

**Fijar versiones**: después de instalar, dejar las versiones exactas en `package.json` (sin `^`), sobre todo la de `aladin-lite`. Un cambio de versión en medio de la hackatón puede romper el visor.

## Estructura de carpetas

```
frontend/
├─ index.html
├─ vite.config.js          # proxy /api → backend
└─ src/
   ├─ main.jsx             # router
   ├─ App.jsx              # layout: fondo de estrellas + transiciones
   ├─ api.js               # fetchSky, fetchTargets, fetchPhotometry, URLs de imágenes
   ├─ styles/
   │  └─ global.css        # variables y animaciones del prototipo
   ├─ components/
   │  ├─ StarField.jsx     # canvas de estrellas + cometas
   │  ├─ AladinView.jsx    # wrapper de Aladin Lite (único lugar que toca su API)
   │  ├─ Sidebar.jsx       # controles del visor
   │  ├─ PlayerControls.jsx# play/pausa, velocidad, época actual
   │  └─ PhotometryChart.jsx
   └─ pages/
      ├─ Home.jsx          # pantalla de inicio
      ├─ Coords.jsx        # ingreso de coordenadas + objetivos de ejemplo
      ├─ Viewer.jsx        # visor (sidebar + Aladin)
      ├─ AboutSpherex.jsx
      └─ Team.jsx
```

## Rutas (URLs compartibles)

| Ruta | Pantalla |
|---|---|
| `/` | Inicio |
| `/explore` | Ingreso de coordenadas |
| `/view?target=wise0855` | Visor con un objetivo del reto |
| `/view?ra=133.786&dec=-7.244&fov=10&det=D5&mode=blink` | Visor con coordenadas (embebible) |
| `/about` · `/team` | Páginas informativas |

El estado del visor (detector, modo, velocidad, Gaia on/off) vive en los parámetros de la URL: copiar el link reproduce exactamente la misma vista.

## Conexión con el backend

**Desarrollo** — `vite.config.js` redirige `/api` al backend, así no hay problemas de CORS:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
```

**`src/api.js`** — todo pedido pasa por acá. Las URLs de imágenes ya vienen armadas en el JSON (`image_url`, `stacks[...].image_url`); el front **no** las construye, solo les antepone la base:

```js
const BASE = import.meta.env.VITE_API_BASE ?? ''   // vacío en dev (usa el proxy)
export const apiUrl = (path) => `${BASE}${path}`

async function get(path) {
  const r = await fetch(apiUrl(path))
  const body = await r.json()
  if (!r.ok) throw new Error(body?.error?.message ?? `Error ${r.status}`)
  return body
}

export const fetchTargets = () => get('/api/targets')
export const fetchSky = (qs) => get(`/api/sky?${qs}`)
export const fetchPhotometry = (qs) => get(`/api/photometry?${qs}`)
```

**Producción**:
Inicial: Implementacion que permita testeo local de aplicacion.
Final: Front en Vercel/Netlify con `VITE_API_BASE=https://<backend>` y CORS habilitado en el backend para ese dominio.

## Aladin Lite en React — reglas

1. **Un solo componente toca Aladin** (`AladinView.jsx`). El resto de la app le pasa props (`sky`, `epochId`, `detector`, `showGaia`, `mode`) y nunca llama a la API de Aladin directamente.
2. **Inicializar una sola vez**: `A.init` es asíncrono. Crear la instancia en un `useEffect` con un `useRef` y no volver a crearla en cada render.
3. **Cuidado con `StrictMode`**: en desarrollo React monta los efectos dos veces. Guardar la instancia en un `ref` y no crear un segundo visor si ya existe (o limpiar el contenedor en el cleanup del efecto).
4. **Capas de imagen precargadas**: al recibir `/api/sky`, crear **una capa por época** con `A.image(url, { wcs: sky.grid.wcs })` y para animar solo cambiar la opacidad. No crear ni borrar capas en cada cuadro.
5. **Gaia**: un catálogo (`A.catalog`) que se vacía y se rellena con `pos_by_epoch[epochId]` al cambiar de época.
6. **Fondo**: survey de AllWISE como capa base (cubre el overlay de otra misión que sugiere el reto).
7. **Antes de construir encima**, probar el flujo mínimo (crear visor → 1 imagen con WCS → 1 catálogo) contra el modo mock, y confirmar los nombres de métodos en la documentación de la versión instalada.

Esqueleto de referencia:

```jsx
import { useEffect, useRef } from 'react'
import A from 'aladin-lite'

export default function AladinView({ ra, dec, fovArcmin }) {
  const divRef = useRef(null)
  const aladinRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    A.init.then(() => {
      if (cancelled || aladinRef.current) return
      aladinRef.current = A.aladin(divRef.current, {
        target: `${ra} ${dec}`,
        fov: fovArcmin / 60,
        survey: 'P/allWISE/color',
      })
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    aladinRef.current?.gotoRaDec(ra, dec)
  }, [ra, dec])

  return <div ref={divRef} style={{ width: '100%', height: '100%' }} />
}
```

## Convenciones

- Componentes en `PascalCase.jsx`, un componente por archivo.
- Textos de la interfaz en inglés (como el prototipo); comentarios del código en español.
- Nada de lógica astronómica en el front: si hace falta un cálculo (coordenadas, épocas, flujos), lo hace el backend y viene en el JSON.
