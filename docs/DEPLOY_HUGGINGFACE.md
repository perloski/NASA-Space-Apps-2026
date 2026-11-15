# Deploy en Hugging Face Spaces

Todo corre en **un solo contenedor**: FastAPI sirve la API (`/api/*`) y el frontend compilado
(todo lo demás). El Space solo guarda 2 archivos (`deploy/huggingface/Dockerfile` y `README.md`);
el código se baja de GitHub, rama **`deploy`**, cada vez que se construye.

Plan gratis (CPU basic): 2 vCPU, 16 GB de RAM. **Se duerme tras 48 h sin visitas** y **el disco
se borra** al dormirse o reiniciarse; por eso, al arrancar, el contenedor precalienta solo la caché
de los 5 objetivos en segundo plano.

## Primera vez (≈15 min, la mayor parte esperando el build)

1. Crear una cuenta en <https://huggingface.co/join> (alcanza con una por equipo; se puede crear
   una *organization* gratis y sumar a los demás).
2. Ir a <https://huggingface.co/new-space>:
   - **Space name:** `openspherex` (o el que quieran; queda en la URL).
   - **License:** la que corresponda (p. ej. MIT).
   - **SDK:** **Docker** → template **Blank**.
   - **Hardware:** **CPU basic · Free**.
   - **Visibility:** **Public** (si es privado los jueces no lo ven).
   - *Create Space*.
3. En el Space: pestaña **Files** → **Add file → Upload files** → subir los 2 archivos de
   `deploy/huggingface/` (`Dockerfile` y `README.md`; el README reemplaza al que crea HF) →
   *Commit changes to main*.
4. Arranca el build solo. Se sigue en el botón **Logs** (arriba) → pestaña **Build**.
   Tarda ~5–10 min la primera vez (instala Node, compila el frontend, instala astropy & co.).
5. Cuando el estado pase a **Running**, la app queda en:
   `https://<usuario-u-org>-<space-name>.hf.space` (o desde la pestaña **App** del Space).

## Actualizar el sitio

1. Mergear/pushear los cambios a la rama **`deploy`** en GitHub.
2. En el Space: **Settings → Factory rebuild**.

(El Dockerfile detecta el commit nuevo de la rama y vuelve a clonar; *Factory rebuild* asegura que
se reconstruya todo desde cero.)

## Antes de la demo

- Abrir la URL **un rato antes** para despertar el Space (si estaba dormido tarda ~1–2 min) y
  darle tiempo al precache. En **Logs → Container** se ve el avance: `[wise0855] N frames…`,
  `stacks D1 listos…`.
- Si IRSA está caído el precache lo reporta (`falló: UPSTREAM_TIMEOUT`) y la app muestra
  "El archivo de la NASA está ocupado". No es un problema del deploy.

## Variables (Settings → Variables and secrets)

| Variable | Default | Para qué |
|---|---|---|
| `PRECACHE_ON_START` | `1` | `0` para no precalentar al arrancar |
| `SPHEREX_MOCK` | `0` | `1` = datos de ejemplo sin internet (plan C si IRSA no anda en la demo) |
| `CUTOUT_SOURCE` | `s3` | `irsa` para usar siempre el servicio de IRSA |

Cambiar una variable reinicia el Space.

## Probar el contenedor en local (opcional, necesita Docker)

```
docker build -t openspherex deploy/huggingface
docker run -p 7860:7860 openspherex
```

Construye desde la rama `deploy` de GitHub (no desde los archivos locales): pushear antes.
Sin Docker se puede probar lo mismo así: `cd frontend && npm run build`, y después levantar el
backend normal (`uvicorn app.main:app --port 8000`) y abrir <http://localhost:8000>.
