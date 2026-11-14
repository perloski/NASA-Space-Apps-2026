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
- **IRSA responde 503 "Server busy"** seguido: hay reintentos con backoff y como mucho 6 descargas en paralelo. Si un frame falla igual, el stack se arma sin él y **no se cachea**, así el próximo pedido lo completa.
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
