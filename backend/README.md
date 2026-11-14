# Backend — Visor SPHEREx (FastAPI)

Implementa `docs/CONTRATO_API.md` v1.1.

## Instalar y correr (Windows / PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Probar: <http://localhost:8000/api/sky?target=wise0855> · docs interactivas: <http://localhost:8000/docs>

**Modo mock** (sin internet; sirve `docs/*.json` + imágenes sintéticas con un objeto que se mueve):

```powershell
$env:SPHEREX_MOCK="1"; .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

**Antes de la demo** (regla 5, tarda varios minutos por objetivo):

```powershell
.venv\Scripts\python -m app.precache                       # stacks de los 5 objetivos
.venv\Scripts\python -m app.precache wise0855 --frames --photometry
```

**Tests:** `.venv\Scripts\python -m pytest -q`

## Estructura

| Archivo | Qué hace |
|---|---|
| `app/main.py` | Endpoints, errores con formato del contrato, CORS |
| `app/spherex.py` | Colecciones IRSA (autodescubre DR/QR), consulta SIA, dedupe, épocas, cutouts |
| `app/imaging.py` | Reproyección a la grilla común, stacks, diff, stretch común por secuencia, PNG/FITS |
| `app/gaia.py` | Gaia DR3 + propagación por movimiento propio a cada época |
| `app/photometry.py` | Flujo en el objetivo por frame (espectro + curva de luz) |
| `app/targets.py` | Los 5 objetivos del reto |
| `app/mock.py` | Modo mock |
| `app/config.py` | Todo lo configurable (variables de entorno) |

## Decisiones que conviene conocer

- **Datos nuevos:** las colecciones `spherex_dr*`/`spherex_qr*` se autodescubren en IRSA y la consulta SIA se re-hace cada 12 h (`SIA_CACHE_TTL_S`). Para fijarlas: `SPHEREX_COLLECTIONS=spherex_dr1,spherex_qr3` (el orden es la prioridad del dedupe).
- **Píxeles con flags malos** (TRANSIENT, HOT, OUTLIER, GHOST, …) se ponen en NaN antes de reproyectar; si no, los rayos cósmicos aparecen como "estrellas" que titilan. Lista en `config.BAD_FLAG_NAMES`.
- **Cutouts desde AWS S3** (`app/s3cutout.py`, `CUTOUT_SOURCE=s3` por defecto): los archivos de SPHEREx están en el bucket público `nasa-irsa-spherex` con la misma ruta que en IRSA. Se leen por HTTP Range solo los headers y las filas que cubren el campo (FLAGS viene comprimida RICE y se descomprime por fila). El resultado es idéntico al del servicio de cutouts de IRSA (verificado píxel a píxel), pero sin su límite de pedidos: una zona nueva con 11 épocas pasó de ~13 min a ~2.5 min, con la primera época visible en ~20 s. Si S3 falla, se usa IRSA automáticamente. La consulta SIA (qué frames existen) sigue siendo de IRSA: una por coordenada, cacheada 12 h.
- **El contraste común de una animación lo fija el primer cuadro que termina** (regla 3) y los demás lo reutilizan: así cada época se muestra apenas está lista, en vez de esperar a todas.
- **IRSA falla seguido**: responde 503 "Server busy", corta descargas a la mitad (`IncompleteRead`) o no responde. Cada cutout se reintenta hasta 6 veces con backoff, y el FITS se valida antes de guardarlo (astropy *no* falla con un archivo truncado: descarta extensiones en silencio). Como mucho hay 4 conexiones simultáneas a IRSA en todo el proceso (`IRSA_MAX_CONCURRENT`). Si un frame falla igual, el stack se arma sin él y **no se cachea**, así el próximo pedido reintenta solo los que faltan.
- **Tope de 24 frames por stack** (`STACK_MAX_FRAMES`), repartidos en el tiempo. En `ALL` una época puede tener 120+ frames: sin tope, la primera vista de Barnard tardaba más de 10 minutos con IRSA saturado; con tope, ~2 minutos. `n_frames` en `/api/sky` informa los que realmente entran.
- **Del cutout se descarta la extensión EPSF** (~3.8 MB de los ~4.3 MB).
- **Stretch de los frames individuales:** los límites salen de hasta 8 frames del mismo detector (no de todos, por costo). Los stacks usan todas las épocas.
- **`flux` de fotometría** = brillo superficial medio en la apertura menos la mediana de un anillo de fondo, en MJy/sr. Se mide sobre el cutout nativo, sin reproyectar.
- **`quality` y `wavelength_at_target_um`** son `null` en `/api/sky` hasta que el frame se procesa (por un PNG, un stack o la fotometría). A partir de ahí aparecen.
- **Caché** en `backend/cache/` (se puede borrar entera sin problema).

## Agregados al contrato (avisar al front)

- `/api/sky` y `/api/photometry` aceptan `target=<id>` en vez de `ra`/`dec`.
- `/api/stack.png` acepta `op=mean|median|sum` (default `mean`).
- `GET /api/health`.
- Formato de `/api/targets` (el contrato no lo definía):
  `{schema_version, coord_epoch, targets: [{id, name, kind, description, ra_deg, dec_deg, coord_epoch, ref: {...}, sky_url}]}`

## Pendiente / a verificar

- Coordenadas de referencia de **WISE 0855** (asumí que las del enunciado son época ~2010.5 de AllWISE) y de **Epsilon Indi B**: confirmar visualmente que el objeto cae en el centro.
