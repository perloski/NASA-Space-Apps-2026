import { useEffect, useState } from 'react'

// Controles del visor. No guarda estado propio salvo el texto de coordenadas que se está
// escribiendo: todo lo demás vive en la URL (lo maneja Viewer).

// Fondos HiPS servidos por IRSA (el mismo archivo que los datos de SPHEREx). Se usan por URL
// directa: no dependen del registro del CDS, que si está lento bloquea la carga de las demás capas.
const IRSA_HIPS = 'https://irsa.ipac.caltech.edu/data/hips/CDS'
export const BACKGROUNDS = [
  { id: 'allwise', label: 'AllWISE (color)', url: `${IRSA_HIPS}/AllWISE/RGB-W4-W2-W1` },
  { id: 'allwise-w2', label: 'AllWISE W2 (4.6 µm)', url: `${IRSA_HIPS}/AllWISE/W2` },
  { id: '2mass', label: '2MASS (color)', url: `${IRSA_HIPS}/2MASS/Color` },
  { id: 'none', label: 'None', url: null },
]
export const backgroundUrl = (id) => BACKGROUNDS.find((b) => b.id === id)?.url ?? BACKGROUNDS[0].url

const DEFAULT_DETECTORS = [
  ['D1', 0.75, 1.09], ['D2', 1.1, 1.62], ['D3', 1.63, 2.41],
  ['D4', 2.42, 3.82], ['D5', 3.83, 4.41], ['D6', 4.42, 5.0],
].map(([id, min, max]) => ({ id, wavelength_um: { min, max } }))

export default function Sidebar({ s, set, sky, onGo, onDefaults, onShare, shareMsg, current }) {
  const [coords, setCoords] = useState(s.coordsText)
  useEffect(() => setCoords(s.coordsText), [s.coordsText])

  const detectors = sky?.detectors ?? DEFAULT_DETECTORS
  const epochs = sky?.epochs ?? []

  return (
    <aside className="sidebar">
      <form className="field anim" style={{ '--i': 0 }} onSubmit={(e) => { e.preventDefault(); onGo(coords) }}>
        <label htmlFor="v-coords">Right ascension and declination</label>
        <input
          className="vinput" id="v-coords" type="text" autoComplete="off" value={coords}
          onChange={(e) => setCoords(e.target.value)} placeholder="133.786245 -7.244373"
        />
        <span className="hint">Decimal degrees (ICRS). Press Enter to load.</span>
      </form>

      <div className="field-row anim" style={{ '--i': 1 }}>
        <input
          className="vinput small" id="v-fov" type="number" min="1" max="30" step="1" value={s.fov}
          onChange={(e) => set({ fov: e.target.value })}
        />
        <label htmlFor="v-fov">Field of view (arcmin, max 30)</label>
      </div>

      <div className="field-row anim" style={{ '--i': 2 }}>
        <select className="vselect" id="v-det" value={s.det} onChange={(e) => set({ det: e.target.value })}>
          <option value="ALL">All (D1–D6)</option>
          {detectors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} · {d.wavelength_um.min}–{d.wavelength_um.max} µm
            </option>
          ))}
        </select>
        <label htmlFor="v-det">Detector</label>
      </div>

      <div className="field-row anim" style={{ '--i': 3 }}>
        <select className="vselect" id="v-mode" value={s.mode} onChange={(e) => set({ mode: e.target.value })}>
          <option value="blink">Blink epochs</option>
          <option value="frames">Single frames</option>
          <option value="diff">Difference</option>
        </select>
        <label htmlFor="v-mode">Mode</label>
      </div>

      {s.mode === 'frames' && s.det === 'ALL' && (
        <p className="hint anim" style={{ '--i': 4 }}>Single frames need one detector: showing D5.</p>
      )}

      {s.mode === 'diff' && (
        <div className="boxed anim" style={{ '--i': 4 }}>
          <span className="hint">Epoch B − epoch A. Moving objects show as a black/white pair.</span>
          <div className="row2">
            <select className="vselect full" aria-label="Epoch A" value={s.a} onChange={(e) => set({ a: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>A: {e.label}</option>)}
            </select>
            <select className="vselect full" aria-label="Epoch B" value={s.b} onChange={(e) => set({ b: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>B: {e.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="field-row anim" style={{ '--i': 5 }}>
        <select className="vselect" id="v-stretch" value={s.stretch} onChange={(e) => set({ stretch: e.target.value })}>
          <option value="asinh">asinh</option>
          <option value="linear">linear</option>
          <option value="zscale">zscale</option>
        </select>
        <label htmlFor="v-stretch">Stretch</label>
      </div>

      <button className="btn btn-wide anim" style={{ '--i': 6 }} onClick={onDefaults}>Apply defaults</button>

      <div className="field anim" style={{ '--i': 7 }}>
        <label htmlFor="v-blink">Blink interval (<span className="val">{s.speed}</span> ms)</label>
        <input type="range" id="v-blink" min="100" max="2000" step="10" value={s.speed}
          onChange={(e) => set({ speed: e.target.value })} />
      </div>

      <div className="field anim" style={{ '--i': 8 }}>
        <label htmlFor="v-opacity">SPHEREx opacity (<span className="val">{Math.round(s.opacity * 100)}%</span>)</label>
        <input type="range" id="v-opacity" min="0" max="1" step="0.01" value={s.opacity}
          onChange={(e) => set({ opacity: e.target.value })} />
      </div>

      <div className="field-row anim" style={{ '--i': 9 }}>
        <select className="vselect" id="v-bg" value={s.bg} onChange={(e) => set({ bg: e.target.value })}>
          {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <label htmlFor="v-bg">Background survey</label>
      </div>

      <div className="checks anim" style={{ '--i': 10 }}>
        <label className="cb">
          <input type="checkbox" checked={s.gaia} onChange={(e) => set({ gaia: e.target.checked })} /> Gaia DR3 overlay
        </label>
        <label className="cb">
          <input type="checkbox" checked={s.invert} onChange={(e) => set({ invert: e.target.checked })} /> Invert pixel values
        </label>
      </div>

      <button className="btn btn-wide anim" style={{ '--i': 11 }} onClick={onShare}>
        {shareMsg || 'Copy share link'}
      </button>

      {current?.quality && (
        <div className="boxed meta-list anim" style={{ '--i': 12 }}>
          <span><b>Frame</b> {current.id}</span>
          <span><b>Coverage</b> {fmtPct(current.quality.coverage)}</span>
          <span><b>Flagged pixels</b> {fmtPct(current.quality.flagged_fraction)}</span>
          <span><b>Target flagged</b> {current.quality.target_flagged == null ? 'not computed yet' : current.quality.target_flagged ? 'yes ⚑' : 'no'}</span>
        </div>
      )}

      {sky && (
        <div className="boxed meta-list anim" style={{ '--i': 13 }}>
          <span><b>Frames</b> {sky.frames.length} · <b>Epochs</b> {sky.epochs.length} ({sky.epoch_strategy})</span>
          <span><b>Data</b> {sky.data_sources.map((d) => `${d.collection} (${d.n_frames})`).join(', ')}</span>
          <span><b>Gaia stars</b> {sky.overlays.gaia.sources.length} (G &lt; {sky.overlays.gaia.mag_limit_g})</span>
          <span><b>Units</b> {sky.render_defaults.units}{sky.render_defaults.zodi_subtracted ? ', zodiacal light subtracted' : ''}</span>
        </div>
      )}
    </aside>
  )
}

function fmtPct(v) {
  return v == null ? 'not computed yet' : `${(v * 100).toFixed(1)}%`
}
