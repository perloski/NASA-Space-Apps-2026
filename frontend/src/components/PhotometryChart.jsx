import {
  CartesianGrid, ErrorBar, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { useI18n } from '../i18n/index.jsx'

// Espectro (λ vs flujo) o curva de luz (MJD vs flujo) con los datos de /api/photometry.
// Una sola serie: los detectores no se solapan en λ, así que en el espectro el detector
// se muestra como bandas de fondo; la curva de luz se grafica de a un detector.
// Puntos con flag malo: marcador hueco (estado ≠ identidad, no se usa otro color).

const SERIES = '#3987e5'           // validado contra el fondo del panel (dataviz validator)
const INK = '#b9c2d3'              // --muted
const GRID = 'rgba(34, 50, 90, 0.6)'
const BAND = 'rgba(185, 194, 211, 0.05)'

function Dot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  return payload.flagged
    ? <circle cx={cx} cy={cy} r={4} fill="none" stroke={SERIES} strokeWidth={1.5} />
    : <circle cx={cx} cy={cy} r={4} fill={SERIES} stroke="#0b1326" strokeWidth={2} />
}

function Tip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{
      background: '#03060e', border: '1px solid #22325a', borderRadius: 6,
      padding: '6px 10px', fontSize: 13, color: '#fff', lineHeight: 1.5,
    }}>
      <div><b>{p.detector}</b> · {p.epoch_id} · {p.date ?? `MJD ${p.mjd.toFixed(2)}`}</div>
      <div>λ = {p.wavelength_um?.toFixed(3)} µm</div>
      <div>flux = {p.flux.toFixed(4)} ± {p.flux_err?.toFixed(4) ?? '–'} MJy/sr</div>
      {p.flagged && <div style={{ color: '#ff8a4c' }}>{t('ui.tipFlagged')}</div>}
    </div>
  )
}

export default function PhotometryChart({ points, view, detectors = [] }) {
  const { t } = useI18n()
  const isSpectrum = view === 'spectrum'
  const data = points.filter((p) => (isSpectrum ? p.wavelength_um != null : true))
  if (!data.length) {
    return (
      <p className="phot-note">{t('ui.noPoints')}</p>
    )
  }

  const xKey = isSpectrum ? 'wavelength_um' : 'mjd'
  const tick = { fill: INK, fontSize: 12 }

  return (
    <div role="img" aria-label={isSpectrum ? t('ui.chartSpectrumAria') : t('ui.chartLightCurveAria')}>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 28, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
          {isSpectrum && detectors.map((d, i) => (
            <ReferenceArea
              key={d.id} x1={d.wavelength_um.min} x2={d.wavelength_um.max}
              fill={i % 2 ? 'transparent' : BAND} strokeOpacity={0}
              label={{ value: d.id, position: 'insideTop', fill: INK, fontSize: 11 }}
            />
          ))}
          <XAxis
            type="number" dataKey={xKey} domain={['auto', 'auto']} tick={tick}
            stroke={GRID} tickFormatter={(v) => (isSpectrum ? v.toFixed(1) : v.toFixed(0))}
            label={{ value: isSpectrum ? t('ui.axisWavelength') : t('ui.axisDate'), position: 'bottom', fill: INK, fontSize: 13 }}
          />
          <YAxis
            type="number" dataKey="flux" tick={tick} stroke={GRID} width={64}
            tickFormatter={(v) => v.toFixed(3)}
            label={{ value: t('ui.axisFlux'), angle: -90, position: 'insideLeft', fill: INK, fontSize: 13, dy: 50 }}
          />
          <Tooltip content={<Tip t={t} />} cursor={{ stroke: INK, strokeDasharray: '3 3' }} />
          <Scatter data={data} shape={<Dot />} isAnimationActive={false}>
            <ErrorBar dataKey="flux_err" direction="y" stroke={INK} strokeOpacity={0.5} width={0} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
