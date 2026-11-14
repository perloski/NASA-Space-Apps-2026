# Frontend — OpenSPHEREx (Vite + React + Aladin Lite)

Implementa `docs/STACK_FRONTEND.md` y consume la API de `docs/CONTRATO_API.md` (v1.1).

## Requisitos

- Node.js LTS (probado con Node 26 / npm 11).
- Backend corriendo en `http://localhost:8000` (ver `backend/README.md`; también sirve en modo mock).

## Desarrollo

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxy /api -> http://localhost:8000)
```

## Producción — paso inicial: probar el build en local

```powershell
npm run build        # genera dist/
npm run preview      # sirve dist/ en http://localhost:4173 con el mismo proxy /api
```

Así se prueba exactamente lo que se va a publicar (código minificado, carga diferida del visor)
contra el backend local. Si el backend corre en otro lado: `$env:API_PROXY_TARGET="http://host:puerto"`.

> **Pendiente (paso final, cuando se hostee):** publicar `dist/` en Vercel/Netlify con
> `VITE_API_BASE=https://<backend>` (ver `.env.example`), configurar el fallback de rutas a
> `index.html` (las rutas son de React Router) y restringir `CORS_ORIGINS` del backend a ese dominio.

## Rutas (URLs compartibles)

| Ruta | Pantalla |
|---|---|
| `/` | Inicio |
| `/explore` | Ingreso de coordenadas + objetivos del reto (de `/api/targets`) |
| `/view?target=wise0855` | Visor con un objetivo del reto |
| `/view?ra=133.786&dec=-7.244&fov=10&det=D5&mode=blink` | Visor con coordenadas (embebible) |
| `/about` · `/team` | Páginas informativas |

Parámetros del visor (todos opcionales, los valores por defecto no se escriben en la URL):
`fov` (arcmin, 1–30) · `det` (`ALL`, `D1`…`D6`) · `mode` (`blink`, `frames`, `diff`) · `a`, `b` (épocas del diff) ·
`stretch` (`asinh`, `linear`, `zscale`) · `speed` (ms) · `opacity` (0–1) · `bg` (survey HiPS o `none`) ·
`gaia` (`0` para ocultar) · `invert` (`1`).

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/api.js` | Único punto de acceso al backend (`fetchSky`, `fetchTargets`, `fetchPhotometry`, URLs) |
| `src/components/AladinView.jsx` | **Único** componente que toca la API de Aladin Lite |
| `src/components/Sidebar.jsx` | Controles del visor |
| `src/components/PlayerControls.jsx` | Play/pausa, anterior/siguiente, época actual |
| `src/components/PhotometryChart.jsx` | Espectro y curva de luz (Recharts) |
| `src/components/StarField.jsx` | Fondo de estrellas y cometas del prototipo |
| `src/pages/*` | Pantallas: Home, Coords, Viewer, AboutSpherex, Team |
| `src/styles/global.css` | CSS del prototipo + agregados del visor |

## Accesibilidad y ayuda para no científicos

| Qué | Dónde |
|---|---|
| Ayuda en cada control (qué hace / qué vas a ver / consejo), con mouse, teclado (Tab), toque en ⓘ y lector de pantalla | `components/WithHelp.jsx`, textos en `help.js` |
| Leyenda "What am I looking at?" que describe en frases simples lo que hay en pantalla | `components/ViewCaption.jsx` |
| Recorrido guiado de 8 pasos (solo la primera vez; botón "Take the tour" para repetirlo) | `components/Tour.jsx` |
| Recorrido de la pantalla de coordenadas (4 pasos: el campo, los ejemplos, qué es cada objeto, la ayuda); botón "How does this work?" | `pages/Coords.jsx` (`EXPLORE_STEPS`), mismo `Tour.jsx` |
| Recetas de un clic: moverse, confirmar movimiento, objetos fríos, brillo variable | `components/Sidebar.jsx` (`RECIPES`) y `Viewer.jsx` |
| Marca naranja sobre el objetivo y flecha hacia dónde se mueve en 10 años (datos de `/api/targets`) | `AladinView.jsx` |
| Glosario con buscador; las ayudas enlazan a sus términos | `pages/Glossary.jsx`, textos en `glossary.js` |

Todos los textos para el público están en `help.js` y `glossary.js`: revisarlos ahí y, cuando se haga la
versión en español, traducir esos dos archivos.

## Notas

- **Versiones fijas** en `package.json` (sin `^`). `aladin-lite` está en **3.8.2**, la última estable:
  npm marca como `latest` una 3.9.x *beta*, no actualizar sin probar.
- Animación (regla 4 del stack): una capa de Aladin por época/frame, precargadas; para animar
  solo cambia la opacidad. Al cambiar detector, modo o stretch se recrea la secuencia.
- **Fotometría en caché del navegador** (`src/photCache.js`): lo medido se guarda por posición, campo y detector (últimas 20 mediciones, en localStorage). Al volver al visor, recargar o abrir el link en otra pestaña, el espectro/curva de luz aparece sin volver a medir y con el panel como se dejó. Si se sale a la mitad de una medición, sigue corriendo y el resultado se guarda; al volver se engancha a ese mismo pedido.
- Modo `frames`: muestra hasta 40 frames del detector elegido (muestreados en el tiempo).
- La primera vez que se pide una zona del cielo el backend baja los datos de IRSA: los stacks
  pueden tardar ~30 s y la fotometría unos minutos. Después queda en caché.
