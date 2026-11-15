import { useEffect, useState } from 'react'
import { monthLabel, useI18n } from '../i18n/index.jsx'
import WithHelp from './WithHelp.jsx'
import { cleanCoords } from '../coords.js'

// Controles del visor. No guarda estado propio salvo el texto de coordenadas que se está
// escribiendo: todo lo demás vive en la URL (lo maneja Viewer). Textos: i18n (ui.* y help.*).

// Fondos HiPS servidos por IRSA (el mismo archivo que los datos de SPHEREx). Se usan por URL
// directa: no dependen del registro del CDS, que si está lento bloquea la carga de las demás capas.
const IRSA_HIPS = 'https://irsa.ipac.caltech.edu/data/hips/CDS'
export const BACKGROUNDS = [
  { id: 'allwise', label: 'bgAllwise', url: `${IRSA_HIPS}/AllWISE/RGB-W4-W2-W1` },
  { id: 'allwise-w2', label: 'bgAllwiseW2', url: `${IRSA_HIPS}/AllWISE/W2` },
  { id: '2mass', label: 'bg2mass', url: `${IRSA_HIPS}/2MASS/Color` },
  { id: 'none', label: 'bgNone', url: null },
]
export const backgroundUrl = (id) => BACKGROUNDS.find((b) => b.id === id)?.url ?? BACKGROUNDS[0].url

const DEFAULT_DETECTORS = [
  ['D1', 0.75, 1.09], ['D2', 1.1, 1.62], ['D3', 1.63, 2.41],
  ['D4', 2.42, 3.82], ['D5', 3.83, 4.41], ['D6', 4.42, 5.0],
].map(([id, min, max]) => ({ id, wavelength_um: { min, max } }))

// Recetas: configuraciones listas para las tareas más comunes (Viewer.applyRecipe las aplica)
export const RECIPES = [
  { id: 'move', emoji: '🔭', label: 'recipeMove', help: 'recipeMove' },
  { id: 'confirm', emoji: '⚫⚪', label: 'recipeConfirm', help: 'recipeConfirm' },
  { id: 'cold', emoji: '🧊', label: 'recipeCold', help: 'recipeCold' },
  { id: 'variable', emoji: '✨', label: 'recipeVariable', help: 'recipeVariable' },
]

export default function Sidebar({ s, set, sky, onGo, onDefaults, onShare, shareMsg, current, onRecipe }) {
  const { t, m, lang } = useI18n()
  const H = m.help
  const [coords, setCoords] = useState(s.coordsText)
  useEffect(() => setCoords(s.coordsText), [s.coordsText])

  const detectors = sky?.detectors ?? DEFAULT_DETECTORS
  const epochs = sky?.epochs ?? []
  const pct = (v) => (v == null ? t('ui.notComputed') : `${(v * 100).toFixed(1)}%`)

  return (
    <aside className="sidebar">
      <div className="recipes boxed anim" style={{ '--i': 0 }} data-tour="recipes">
        <WithHelp help={H.recipes}><span className="recipes-title">{t('ui.quickRecipes')}</span></WithHelp>
        {RECIPES.map((r) => (
          <WithHelp key={r.id} help={H[r.help]}>
            <button className="recipe-btn" onClick={() => onRecipe(r.id)} disabled={!sky && r.id === 'confirm'}>
              <span className="emoji" aria-hidden="true">{r.emoji}</span>{t(`ui.${r.label}`)}
            </button>
          </WithHelp>
        ))}
      </div>

      <WithHelp help={H.coords} as="form" className="anim" style={{ '--i': 0 }} innerClassName="field"
        onSubmit={(e) => { e.preventDefault(); onGo(coords) }}>
        <label htmlFor="v-coords">{t('ui.raDec')}</label>
        <input
          className="vinput" id="v-coords" type="text" autoComplete="off" value={coords}
          onChange={(e) => setCoords(cleanCoords(e.target.value))} placeholder="133.786245 -7.244373"
          inputMode="text" spellCheck={false}
        />
        <span className="hint">{t('ui.raDecHint')}</span>
      </WithHelp>

      <WithHelp help={H.fov} className="anim" style={{ '--i': 1 }} innerClassName="field-row">
        <input
          className="vinput small" id="v-fov" type="number" min="1" max="30" step="1" value={s.fov}
          onChange={(e) => set({ fov: e.target.value })}
        />
        <label htmlFor="v-fov">{t('ui.fov')}</label>
      </WithHelp>

      <WithHelp help={H.detector} className="anim" style={{ '--i': 2 }} innerClassName="field-row" data-tour="detector">
        <select className="vselect" id="v-det" value={s.det} onChange={(e) => set({ det: e.target.value })}>
          <option value="ALL">{t('ui.allDetectors')}</option>
          {detectors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} · {d.wavelength_um.min}–{d.wavelength_um.max} µm
            </option>
          ))}
        </select>
        <label htmlFor="v-det">{t('ui.detector')}</label>
      </WithHelp>

      <WithHelp help={H.mode} className="anim" style={{ '--i': 3 }} innerClassName="field-row" data-tour="mode">
        <select className="vselect" id="v-mode" value={s.mode} onChange={(e) => set({ mode: e.target.value })}>
          <option value="blink">{t('ui.modeBlink')}</option>
          <option value="frames">{t('ui.modeFrames')}</option>
          <option value="diff">{t('ui.modeDiff')}</option>
        </select>
        <label htmlFor="v-mode">{t('ui.mode')}</label>
      </WithHelp>

      {s.mode === 'frames' && s.det === 'ALL' && (
        <p className="hint anim" style={{ '--i': 4 }}>{t('ui.framesNeedDetector')}</p>
      )}

      {s.mode === 'diff' && (
        <WithHelp help={H.diffEpochs} className="anim" style={{ '--i': 4 }} innerClassName="boxed">
          <span className="hint">{t('ui.diffHint')}</span>
          <div className="row2">
            <select className="vselect full" aria-label={t('ui.epochA')} value={s.a} onChange={(e) => set({ a: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>A: {monthLabel(e.mjd_mid, lang)}</option>)}
            </select>
            <select className="vselect full" aria-label={t('ui.epochB')} value={s.b} onChange={(e) => set({ b: e.target.value })}>
              {epochs.map((e) => <option key={e.id} value={e.id}>B: {monthLabel(e.mjd_mid, lang)}</option>)}
            </select>
          </div>
        </WithHelp>
      )}

      <WithHelp help={H.stretch} className="anim" style={{ '--i': 5 }} innerClassName="field-row">
        <select className="vselect" id="v-stretch" value={s.stretch} onChange={(e) => set({ stretch: e.target.value })}>
          <option value="asinh">asinh</option>
          <option value="linear">linear</option>
          <option value="zscale">zscale</option>
        </select>
        <label htmlFor="v-stretch">{t('ui.stretch')}</label>
      </WithHelp>

      <WithHelp help={H.defaults} className="anim" style={{ '--i': 6 }}>
        <button className="btn btn-wide" onClick={onDefaults}>{t('ui.applyDefaults')}</button>
      </WithHelp>

      <WithHelp help={H.blink} className="anim" style={{ '--i': 7 }} innerClassName="field">
        <label htmlFor="v-blink">{t('ui.blinkInterval')} (<span className="val">{s.speed}</span> {t('ui.ms')})</label>
        <input type="range" id="v-blink" min="100" max="2000" step="10" value={s.speed}
          onChange={(e) => set({ speed: e.target.value })} />
      </WithHelp>

      <WithHelp help={H.opacity} className="anim" style={{ '--i': 8 }} innerClassName="field">
        <label htmlFor="v-opacity">{t('ui.opacity')} (<span className="val">{Math.round(s.opacity * 100)}%</span>)</label>
        <input type="range" id="v-opacity" min="0" max="1" step="0.01" value={s.opacity}
          onChange={(e) => set({ opacity: e.target.value })} />
      </WithHelp>

      <WithHelp help={H.background} className="anim" style={{ '--i': 9 }} innerClassName="field-row">
        <select className="vselect" id="v-bg" value={s.bg} onChange={(e) => set({ bg: e.target.value })}>
          {BACKGROUNDS.map((b) => <option key={b.id} value={b.id}>{t(`ui.${b.label}`)}</option>)}
        </select>
        <label htmlFor="v-bg">{t('ui.background')}</label>
      </WithHelp>

      <div className="checks anim" style={{ '--i': 10 }}>
        <WithHelp help={H.gaia}>
          <label className="cb">
            <input type="checkbox" checked={s.gaia} onChange={(e) => set({ gaia: e.target.checked })} /> {t('ui.gaiaStars')}
          </label>
        </WithHelp>
        <WithHelp help={H.marker}>
          <label className="cb">
            <input type="checkbox" checked={s.mark} onChange={(e) => set({ mark: e.target.checked })} /> {t('ui.markTarget')}
          </label>
        </WithHelp>
        <WithHelp help={H.invert}>
          <label className="cb">
            <input type="checkbox" checked={s.invert} onChange={(e) => set({ invert: e.target.checked })} /> {t('ui.invert')}
          </label>
        </WithHelp>
      </div>

      <WithHelp help={H.share} className="anim" style={{ '--i': 11 }}>
        <button className="btn btn-wide" onClick={onShare}>{shareMsg || t('ui.copyLink')}</button>
      </WithHelp>

      {current?.quality && (
        <WithHelp help={H.frameQuality} className="anim" style={{ '--i': 12 }} innerClassName="boxed meta-list">
          <span><b>{t('ui.frame')}</b> {current.id}</span>
          <span><b>{t('ui.coverage')}</b> {pct(current.quality.coverage)}</span>
          <span><b>{t('ui.flaggedPixels')}</b> {pct(current.quality.flagged_fraction)}</span>
          <span><b>{t('ui.targetFlagged')}</b> {current.quality.target_flagged == null ? t('ui.notComputed') : current.quality.target_flagged ? `${t('ui.yes')} ⚑` : t('ui.no')}</span>
        </WithHelp>
      )}

      {sky && (
        <WithHelp help={H.dataSummary} className="anim" style={{ '--i': 13 }} innerClassName="boxed meta-list">
          <span><b>{t('ui.frames')}</b> {sky.frames.length} · <b>{t('ui.epochs')}</b> {sky.epochs.length} ({sky.epoch_strategy})</span>
          <span><b>{t('ui.data')}</b> {sky.data_sources.map((d) => `${d.collection} (${d.n_frames})`).join(', ')}</span>
          <span><b>{t('ui.gaiaCount')}</b> {sky.overlays.gaia.sources.length} (G &lt; {sky.overlays.gaia.mag_limit_g})</span>
          <span><b>{t('ui.units')}</b> {sky.render_defaults.units}{sky.render_defaults.zodi_subtracted ? `, ${t('ui.zodiSubtracted')}` : ''}</span>
        </WithHelp>
      )}
    </aside>
  )
}
