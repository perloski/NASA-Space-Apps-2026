import { useEffect, useState } from 'react'
import { HELP } from '../help.js'
import WithHelp from './WithHelp.jsx'
import { cleanCoords } from '../coords.js'

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

// Recetas: configuraciones listas para las tareas más comunes (Viewer.applyRecipe las aplica)
export const RECIPES = [
  { id: 'move', emoji: '🔭', label: 'Spot something that moves', help: HELP.recipeMove },
  { id: 'confirm', emoji: '⚫⚪', label: 'Confirm the movement', help: HELP.recipeConfirm },
  { id: 'cold', emoji: '🧊', label: 'Look for cold objects', help: HELP.recipeCold },
  { id: 'variable', emoji: '✨', label: 'Watch brightness change', help: HELP.recipeVariable },
]

export default function Sidebar({ s, set, sky, onGo, onDefaults, onShare, shareMsg, current, onRecipe }) {
  const [coords, setCoords] = useState(s.coordsText)
  useEffect(() => setCoords(s.coordsText), [s.coordsText])

  const detectors = sky?.detectors ?? DEFAULT_DETECTORS
  const epochs = sky?.epochs ?? []

  return (
    <aside className="sidebar">
      <div className="recipes boxed anim" style={{ '--i': 0 }} data-tour="recipes">
        <WithHelp help={HELP.recipes}><span className="recipes-title">Quick recipes</span></WithHelp>
        {RECIPES.map((r) => (
          <WithHelp key={r.id} help={r.help}>
            <button className="recipe-btn" onClick={() => onRecipe(r.id)} disabled={!sky && r.id === 'confirm'}>
              <span className="emoji" aria-hidden="true">{r.emoji}</span>{r.label}
            </button>
          </WithHelp>
        ))}
      </div>

      <WithHelp help={HELP.coords} as="form" className="anim" style={{ '--i': 0 }} innerClassName="field"
        onSubmit={(e) => { e.preventDefault(); onGo(coords) }}>
        <label htmlFor="v-coords">Right ascension and declination</label>
        <input
          className="vinput" id="v-coords" type="text" autoComplete="off" value={coords}
          onChange={(e) => setCoords(cleanCoords(e.target.value))} placeholder="133.786245 -7.244373"
          inputMode="text" spellCheck={false}
        />
        <span className="hint">Numbers only (and + − .), in degrees. Press Enter to load.</span>
      </WithHelp>

      <WithHelp help={HELP.fov} className="anim" style={{ '--i': 1 }} innerClassName="field-row">
        <input
          className="vinput small" id="v-fov" type="number" min="1" max="30" step="1" value={s.fov}
          onChange={(e) => set({ fov: e.target.value })}
        />
        <label htmlFor="v-fov">Field of view (arcmin, max 30)</label>
      </WithHelp>

      <WithHelp help={HELP.detector} className="anim" style={{ '--i': 2 }} innerClassName="field-row" data-tour="detector">
        <select className="vselect" id="v-det" value={s.det} onChange={(e) => set({ det: e.target.value })}>
          <option value="ALL">All (D1–D6)</option>
          {detectors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} · {d.wavelength_um.min}–{d.wavelength_um.max} µm
            </option>
          ))}
        </select>
        <label htmlFor="v-det">Detector</label>
      </WithHelp>

      <WithHelp help={HELP.mode} className="anim" style={{ '--i': 3 }} innerClassName="field-row" data-tour="mode">
        <select className="vselect" id="v-mode" value={s.mode} onChange={(e) => set({ mode: e.target.value })}>
          <option value="blink">Blink epochs</option>
          <option value="frames">Single frames</option>
          <option value="diff">Difference</option>
        </select>
        <label htmlFor="v-mode">Mode</label>
      </WithHelp>

      {s.mode === 'frames' && s.det === 'ALL' && (
        <p className="hint anim" style={{ '--i': 4 }}>Single frames need one detector: showing D5.</p>
      )}

      {s.mode === 'diff' && (
        <WithHelp help={HELP.diffEpochs} className="anim" style={{ '--i': 4 }} innerClassName="boxed">
          <span className="hint">Epoch B − epoch A. Moving objects show as a black/white pair.</span>
          <div className="row2">
            <select className="vselect full" aria-label="Epoch A" value={s.a} onChange={(e) => set({ a: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>A: {e.label}</option>)}
            </select>
            <select className="vselect full" aria-label="Epoch B" value={s.b} onChange={(e) => set({ b: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>B: {e.label}</option>)}
            </select>
          </div>
        </WithHelp>
      )}

      <WithHelp help={HELP.stretch} className="anim" style={{ '--i': 5 }} innerClassName="field-row">
        <select className="vselect" id="v-stretch" value={s.stretch} onChange={(e) => set({ stretch: e.target.value })}>
          <option value="asinh">asinh</option>
          <option value="linear">linear</option>
          <option value="zscale">zscale</option>
        </select>
        <label htmlFor="v-stretch">Stretch</label>
      </WithHelp>

      <WithHelp help={HELP.defaults} className="anim" style={{ '--i': 6 }}>
        <button className="btn btn-wide" onClick={onDefaults}>Apply defaults</button>
      </WithHelp>

      <WithHelp help={HELP.blink} className="anim" style={{ '--i': 7 }} innerClassName="field">
        <label htmlFor="v-blink">Blink interval (<span className="val">{s.speed}</span> ms)</label>
        <input type="range" id="v-blink" min="100" max="2000" step="10" value={s.speed}
          onChange={(e) => set({ speed: e.target.value })} />
      </WithHelp>

      <WithHelp help={HELP.opacity} className="anim" style={{ '--i': 8 }} innerClassName="field">
        <label htmlFor="v-opacity">SPHEREx opacity (<span className="val">{Math.round(s.opacity * 100)}%</span>)</label>
        <input type="range" id="v-opacity" min="0" max="1" step="0.01" value={s.opacity}
          onChange={(e) => set({ opacity: e.target.value })} />
      </WithHelp>

      <WithHelp help={HELP.background} className="anim" style={{ '--i': 9 }} innerClassName="field-row">
        <select className="vselect" id="v-bg" value={s.bg} onChange={(e) => set({ bg: e.target.value })}>
          {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <label htmlFor="v-bg">Background map</label>
      </WithHelp>

      <div className="checks anim" style={{ '--i': 10 }}>
        <WithHelp help={HELP.gaia}>
          <label className="cb">
            <input type="checkbox" checked={s.gaia} onChange={(e) => set({ gaia: e.target.checked })} /> Gaia stars (blue circles)
          </label>
        </WithHelp>
        <WithHelp help={HELP.marker}>
          <label className="cb">
            <input type="checkbox" checked={s.mark} onChange={(e) => set({ mark: e.target.checked })} /> Mark the target (orange)
          </label>
        </WithHelp>
        <WithHelp help={HELP.invert}>
          <label className="cb">
            <input type="checkbox" checked={s.invert} onChange={(e) => set({ invert: e.target.checked })} /> Invert pixel values
          </label>
        </WithHelp>
      </div>

      <WithHelp help={HELP.share} className="anim" style={{ '--i': 11 }}>
        <button className="btn btn-wide" onClick={onShare}>{shareMsg || 'Copy share link'}</button>
      </WithHelp>

      {current?.quality && (
        <WithHelp help={HELP.frameQuality} className="anim" style={{ '--i': 12 }} innerClassName="boxed meta-list">
          <span><b>Frame</b> {current.id}</span>
          <span><b>Coverage</b> {fmtPct(current.quality.coverage)}</span>
          <span><b>Flagged pixels</b> {fmtPct(current.quality.flagged_fraction)}</span>
          <span><b>Target flagged</b> {current.quality.target_flagged == null ? 'not computed yet' : current.quality.target_flagged ? 'yes ⚑' : 'no'}</span>
        </WithHelp>
      )}

      {sky && (
        <WithHelp help={HELP.dataSummary} className="anim" style={{ '--i': 13 }} innerClassName="boxed meta-list">
          <span><b>Frames</b> {sky.frames.length} · <b>Epochs</b> {sky.epochs.length} ({sky.epoch_strategy})</span>
          <span><b>Data</b> {sky.data_sources.map((d) => `${d.collection} (${d.n_frames})`).join(', ')}</span>
          <span><b>Gaia stars</b> {sky.overlays.gaia.sources.length} (G &lt; {sky.overlays.gaia.mag_limit_g})</span>
          <span><b>Units</b> {sky.render_defaults.units}{sky.render_defaults.zodi_subtracted ? ', zodiacal light subtracted' : ''}</span>
        </WithHelp>
      )}
    </aside>
  )
}

function fmtPct(v) {
  return v == null ? 'not computed yet' : `${(v * 100).toFixed(1)}%`
}
