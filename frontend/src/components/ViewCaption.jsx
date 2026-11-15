import { useI18n } from '../i18n/index.jsx'
import WithHelp from './WithHelp.jsx'

// "What am I looking at?": describe en frases simples lo que hay en pantalla ahora.
// Las frases son plantillas traducidas (i18n: caption.*). No es una región aria-live a propósito:
// durante la animación cambia cada medio segundo y un lector de pantalla no pararía de hablar.

function targetHint(c, t, markerOn, moving) {
  if (!t) return markerOn ? c.typedMarked : c.typed
  const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), s)
  const where = fill(markerOn ? c.whereMarked : c.where, { name: t.localName ?? t.name })
  const arrow = markerOn && moving ? c.arrow : ''
  if (t.kind?.startsWith('brown_dwarf')) return fill(c.brownDwarf, { where, arrow })
  if (t.kind === 'variable_star') return fill(c.variable, { where })
  const speed = t.motion?.arcsec_per_year
  if (speed > 1) return fill(c.fast, { where, arrow, speed: speed.toFixed(1) })
  return fill(c.plain, { where, arrow })
}

export default function ViewCaption({ sky, mode, det, effDet, cur, index, count, speed, playing, targetInfo, markerOn, moving }) {
  const { t, m } = useI18n()
  if (!sky || !cur) return null
  const c = m.caption
  const sentences = []
  if (mode === 'diff') {
    sentences.push(t('caption.diff1', { label: cur.label }), c.diff2)
  } else if (mode === 'frames') {
    sentences.push(t('caption.frames1', { date: cur.label, det: c.det[effDet] }))
    sentences.push(t('caption.frames2', { n: index + 1, total: count }))
  } else {
    sentences.push(t('caption.blink1', { label: cur.label, n: index + 1, total: count, det: c.det[det] }))
    if (count > 1) sentences.push(playing ? t('caption.playing', { s: (speed / 1000).toFixed(1) }) : c.paused)
    else sentences.push(c.oneDate)
  }
  const target = targetInfo && { ...targetInfo, localName: m.targetNames[targetInfo.id] }
  sentences.push(targetHint(c, target, markerOn, moving))

  return (
    <WithHelp help={m.help.caption} className="caption-help" data-tour="caption">
      <section className="view-caption" aria-label={c.title}>
        <h3>{c.title}</h3>
        <p>{sentences.join(' ')}</p>
      </section>
    </WithHelp>
  )
}
