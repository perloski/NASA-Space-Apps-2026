# Contrato API — Visor SPHEREx (Space Apps 2026) · v1.1 (frontend con Aladin Lite v3)

> Fuente de verdad entre backend (Python/FastAPI) y frontend.
> Si alguien cambia un campo, sube `schema_version` y avisa al equipo.
> Mock para trabajar sin backend: `mock/sky_wise0855.json`.

## Convenciones

- **Unidades en el nombre del campo**: `_deg`, `_arcmin`, `_arcsec`, `_um` (micrones), `_px`, `_s`, `_mas_yr`.
- Coordenadas siempre ICRS en grados decimales.
- Fechas: `mjd` (número, para cálculos) + `date_utc` (ISO-8601 con `Z`, para mostrar).
- Detectores con id corto `"D1"`…`"D6"` (el backend traduce desde `"SPHEREx-D1"`).
- **IDs de Gaia como string** (son int64 y JavaScript pierde precisión con números > 2^53).
- Las URLs de imágenes las arma el backend **completas, con ra/dec/fov incluidos**. El front nunca construye URLs de imágenes, solo las usa.

## Endpoints

| Método | Ruta | Qué hace | Velocidad |
|---|---|---|---|
| GET | `/api/sky` | Metadatos: frames, épocas, detectores, grilla. **No procesa imágenes ni espera a Gaia.** | Rápido (1 query SIA) |
| GET | `/api/gaia` | Estrellas de Gaia del campo (mismo formato que `overlays.gaia`). URL en `overlays.gaia.url` | Lento si Gaia (ESA) está lento; corta a los 25 s |
| GET | `/api/frame/{frame_id}.png` | PNG de un frame individual, reproyectado a la grilla común | Lento la 1ª vez, después caché |
| GET | `/api/frame/{frame_id}.fits` | (Opcional) mismo recorte reproyectado en FITS, para `aladin.displayFITS` | Igual que el PNG |
| GET | `/api/stack.png` | Suma/promedio de frames de una época y detector | Lento la 1ª vez |
| GET | `/api/diff.png` | Resta época B − época A (mismo detector) | Lento la 1ª vez |
| GET | `/api/photometry` | Flujo en la posición del objetivo por frame → **espectro y curva de luz** | Lento (baja todos los cutouts) |
| GET | `/api/targets` | Lista de objetivos del reto con coordenadas ya corregidas | Instantáneo (estático) |

Parámetros comunes de consulta: `ra`, `dec` (grados), `fov_arcmin` (default **10**, máx. 30), opcional `detectors=D5,D6`.

Las rutas de imagen reciben además: `stretch` (`asinh`|`linear`|`zscale`), y para stack/diff: `epoch`, `detector`, `a`, `b`.

## `GET /api/sky` — respuesta

```jsonc
{
  "schema_version": "1.1",
  "generated_at": "2026-11-14T12:00:00Z",

  "query": {
    "target_name": "WISE 0855",     // null si el usuario metió coordenadas a mano
    "ra_deg": 133.786245,           // valor ILUSTRATIVO: calcular el real con astropy (ver regla 2)
    "dec_deg": -7.244410,
    "coord_epoch": "J2025.5",       // época de las coordenadas (ver "movimiento propio" abajo)
    "fov_arcmin": 10
  },

  // Grilla común: TODAS las imágenes vienen reproyectadas a esta grilla (norte arriba).
  // "wcs" se le pasa TAL CUAL a Aladin: A.image(frame.image_url, { wcs: grid.wcs })
  "grid": {
    "width_px": 98,
    "height_px": 98,
    "pixel_scale_arcsec": 6.15,
    "wcs": {
      "NAXIS": 2, "NAXIS1": 98, "NAXIS2": 98, "WCSAXES": 2,
      "CTYPE1": "RA---TAN", "CTYPE2": "DEC--TAN", "CUNIT1": "deg", "CUNIT2": "deg",
      "CRVAL1": 133.786245, "CRVAL2": -7.244410,
      "CRPIX1": 49.5, "CRPIX2": 49.5,
      "CDELT1": -0.00170833, "CDELT2": 0.00170833,
      "EQUINOX": 2000.0
    }
  },

  "data_sources": [
    { "collection": "spherex_dr1", "n_frames": 240 },
    { "collection": "spherex_qr3", "n_frames": 42 }
  ],

  "detectors": [
    { "id": "D1", "wavelength_um": { "min": 0.75, "max": 1.09 }, "n_frames": 47 }
  ],

  // Épocas = pasadas de SPHEREx (~cada 6 meses). Es la unidad principal de la animación.
  "epochs": [
    {
      "id": "E1",
      "label": "May 2025",
      "mjd_start": 60800.70,
      "mjd_end": 60806.12,
      "mjd_mid": 60803.41,
      "n_frames": 94,
      "stacks": {
        "D1": { "image_url": "/api/stack.png?ra=...&dec=...&fov_arcmin=10&epoch=E1&detector=D1", "n_frames": 16 },
        "ALL": { "image_url": "/api/stack.png?...&epoch=E1&detector=ALL", "n_frames": 94 }
      }
    }
  ],
  "epoch_strategy": "gap",          // "gap" (cortes por huecos >30 días) | "bins_30d" (zonas de cobertura continua, cerca de los polos eclípticos)

  "frames": [
    {
      "id": "2025W19_1B_0116_1_D3", // obs_id + "_" + detector → único, usar como key en React
      "obs_id": "2025W19_1B_0116_1",
      "collection": "spherex_dr1",
      "epoch_id": "E1",
      "detector": "D3",
      "mjd": 60800.700028,
      "date_utc": "2025-05-05T16:48:02.419Z",
      "exptime_s": 113.58,
      "wavelength_at_target_um": 1.874, // null hasta procesar el cutout (sale de WCS-WAVE)
      "image_url": "/api/frame/2025W19_1B_0116_1_D3.png?ra=...&dec=...&fov_arcmin=10",
      "fits_url": "/api/frame/2025W19_1B_0116_1_D3.fits?ra=...&dec=...&fov_arcmin=10", // opcional: Aladin ajusta contraste en vivo
      "quality": {
        "coverage": 1.0,            // fracción de la grilla con datos (0–1). <1 = el objetivo cae cerca del borde del detector
        "flagged_fraction": null,   // fracción de píxeles marcados en FLAGS (null = todavía no calculado)
        "target_flagged": null      // true si el píxel del objetivo tiene un flag malo
      }
    }
  ],

  "overlays": {
    "gaia": {
      "catalog": "gaiadr3",
      "ref_epoch": "J2016.0",
      "mag_limit_g": 20,
      // "ok": sources viene lleno (estaba en la caché del servidor).
      // "pending": sources vacío; el front pide `url` (/api/gaia) y las imágenes NO esperan a Gaia.
      // /api/gaia devuelve este mismo objeto con status "ok", o 503 GAIA_UNAVAILABLE.
      "status": "ok",
      "url": "/api/gaia?ra=133.786245&dec=-7.244410&fov_arcmin=10",
      "sources": [
        {
          "source_id": "3108266213034211584",
          "ra_deg": 133.7801,
          "dec_deg": -7.2402,
          "g_mag": 17.8,
          "pmra_mas_yr": -12.4,
          "pmdec_mas_yr": 4.1,
          "parallax_mas": 1.2,      // null si Gaia no lo tiene
          // Posición propagada a cada época (Aladin dibuja con ra/dec, no con píxeles)
          "pos_by_epoch": {
            "E1": { "ra_deg": 133.7800312, "dec_deg": -7.2401734 },
            "E2": { "ra_deg": 133.7800291, "dec_deg": -7.2401728 }
          }
        }
      ]
    }
  },

  "render_defaults": {
    "stretch": "asinh",
    "units": "MJy/sr",
    "zodi_subtracted": true
  }
}
```

## `GET /api/photometry` — respuesta (extra kudos: espectro “on the fly”)

Un punto por frame, medido en el píxel del objetivo. El front grafica **dos vistas con los mismos datos**:
- **Espectro**: x = `wavelength_um`, y = `flux` (sirve para enanas marrones: absorción de metano/agua).
- **Curva de luz**: x = `mjd`, y = `flux`, color por detector (sirve para RW Aurigae y R Draconis).

```jsonc
{
  "schema_version": "1.1",
  "query": { "ra_deg": 133.786245, "dec_deg": -7.244410, "aperture_px": 2 },
  "flux_units": "MJy/sr",
  "points": [
    { "frame_id": "2025W19_1B_0116_1_D3", "epoch_id": "E1", "detector": "D3",
      "mjd": 60800.700028, "wavelength_um": 1.874, "flux": 0.0123, "flux_err": 0.0041, "flagged": false }
  ]
}
```

## Errores (todos los endpoints)

```json
{ "error": { "code": "NO_COVERAGE", "message": "SPHEREx todavía no observó estas coordenadas." } }
```

Códigos: `BAD_PARAMS` (400), `NO_COVERAGE` (404), `UPSTREAM_TIMEOUT` (504, IRSA lento), `GAIA_UNAVAILABLE` (503, solo `/api/gaia`: Gaia caído o tarda más de `GAIA_TIMEOUT_S`; tras un fallo responde al instante durante `GAIA_RETRY_AFTER_S`), `INTERNAL` (500).

Para probar el visor con Gaia caído: `SPHEREX_GAIA_DOWN=1` (falla al instante) o `SPHEREX_GAIA_DOWN=slow` (tarda y falla); también en modo mock.

## URL del front (compartible / embebible)

`/?ra=133.786245&dec=-7.244410&fov=10&det=D5&mode=blink` — o `/?target=wise0855`.

## Reglas del backend que afectan los datos

1. **Deduplicar**: si un `obs_id + detector` aparece en DR1 y en QR, quedarse con DR1.
2. **Movimiento propio**: Gaia está en época 2016.0. Hay que propagar cada estrella a la fecha media de cada época (`SkyCoord.apply_space_motion`) para llenar `pos_by_epoch` (Barnard se movió ~1.5′ entre 2016 y 2025). Lo mismo para las coordenadas de `/api/targets`.
3. **Normalización común**: el stretch (vmin/vmax) de una animación se calcula una vez para toda la secuencia del mismo detector, no por frame; si no, el fondo “titila”.
4. **Restar ZODI** (extensión 4) antes de renderizar.
5. **Caché en disco** con clave `(id, ra, dec, fov, stretch)`. Precalentar los 5 objetivos del reto antes de la demo.
6. **Stretch fijo dentro del PNG**: Aladin no puede cambiarle el contraste a un PNG (son 8 bits), por eso el PNG ya viene estirado. Si queremos un slider de contraste en vivo, se usa `fits_url`.
7. **CORS**: habilitar CORS en FastAPI para el origen del front (Aladin carga las imágenes con WebGL y sin CORS falla en silencio).

## Cómo lo usa el frontend (Aladin Lite v3)

```js
const sky = await (await fetch(`/api/sky?ra=${ra}&dec=${dec}&fov_arcmin=10`)).json();

const aladin = A.aladin('#aladin-lite-div', {
  target: `${sky.query.ra_deg} ${sky.query.dec_deg}`,
  fov: sky.query.fov_arcmin / 60,
  survey: 'P/allWISE/color'          // fondo de WISE gratis = overlay de otra misión
});

// 1) Precargar UNA capa por época (stack del detector elegido) y alternar opacidad.
//    No crear/destruir capas en cada cuadro: es lento y parpadea.
const layers = sky.epochs.map((ep, i) => {
  const layer = A.image(ep.stacks[detector].image_url, { name: ep.id, wcs: sky.grid.wcs });
  aladin.setOverlayImageLayer(layer, ep.id);
  layer.setOpacity(i === 0 ? 1 : 0);
  return layer;
});
// play: cada N ms poner opacidad 1 a la capa actual y 0 al resto.

// 2) Gaia: un catálogo por época, mostrar solo el de la época visible.
const gaia = A.catalog({ name: 'Gaia DR3', sourceSize: 12, color: '#4fc3f7' });
aladin.addCatalog(gaia);
function showGaia(epochId) {
  gaia.removeAll();
  gaia.addSources(sky.overlays.gaia.sources.map(s =>
    A.source(s.pos_by_epoch[epochId].ra_deg, s.pos_by_epoch[epochId].dec_deg,
             { source_id: s.source_id, g_mag: s.g_mag })));
}
```

> Los nombres exactos de los métodos pueden variar entre versiones de Aladin Lite: **fijar la versión** del script (`/AladinLite/api/v3/<versión>/aladin.js`) y probar este flujo primero con el mock.
