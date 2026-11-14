import { HELP } from '../help.js'
import WithHelp from './WithHelp.jsx'

// "What am I looking at?": describe en frases simples lo que hay en pantalla ahora.
// No es una región aria-live a propósito: durante la animación cambia cada medio segundo y un
// lector de pantalla no pararía de hablar. Se lee al llegar a ella.

const DETECTOR_WORDS = {
  D1: 'D1, the infrared closest to visible red light',
  D2: 'D2, near infrared',
  D3: 'D3, near infrared',
  D4: 'D4, middle infrared',
  D5: 'D5, deep infrared, where cold objects shine the most',
  D6: 'D6, the deepest infrared SPHEREx sees',
  ALL: 'all six infrared detectors added together',
}

function targetHint(t, markerOn, moving) {
  if (!t) {
    return markerOn
      ? 'The spot you typed is in the center, inside the orange circle.'
      : 'The spot you typed is in the center of the picture.'
  }
  const where = markerOn ? `${t.name} is inside the orange circle in the center` : `${t.name} is in the center`
  const arrow = markerOn && moving ? ' The orange arrow shows where it is heading.' : ''
  if (t.kind?.startsWith('brown_dwarf')) {
    return `${where}. It is a brown dwarf, a cold “failed star”, so it shines brightest in D5 and D6.${arrow}`
  }
  if (t.kind === 'variable_star') {
    return `${where}. It is a variable star: compare its brightness between dates, or measure its light curve below.`
  }
  const speed = t.motion?.arcsec_per_year
  return `${where}.${speed > 1 ? ` It moves ${speed.toFixed(1)} arcseconds per year, one of the fastest in the sky: watch it shift between dates.` : ''}${arrow}`
}

export default function ViewCaption({ sky, mode, det, effDet, cur, index, count, speed, playing, targetInfo, markerOn, moving }) {
  if (!sky || !cur) return null
  const sentences = []
  if (mode === 'diff') {
    sentences.push(`This picture is “${cur.label}”: the newer date minus the older one.`)
    sentences.push('Gray means nothing changed. A black spot shows where something was on the older date, and a white spot where it is on the newer one.')
  } else if (mode === 'frames') {
    sentences.push(`You are seeing a single photo taken on ${cur.label} UTC, with detector ${DETECTOR_WORDS[effDet]}.`)
    sentences.push(`Photo ${index + 1} of ${count}. Single photos are noisier than the combined ones, but show more dates.`)
  } else {
    sentences.push(`You are seeing this patch of sky as SPHEREx photographed it in ${cur.label} (date ${index + 1} of ${count}), using ${DETECTOR_WORDS[det]}.`)
    if (count > 1) {
      sentences.push(playing
        ? `The picture changes to the next date every ${(speed / 1000).toFixed(1)} s: stars stay still, anything that jumps has moved.`
        : 'The animation is paused: use ◀ ▶ to compare the dates.')
    } else {
      sentences.push('There is only one date for this spot so far, so nothing can be compared yet.')
    }
  }
  sentences.push(targetHint(targetInfo, markerOn, moving))

  return (
    <WithHelp help={HELP.caption} className="caption-help">
      <section className="view-caption" aria-label="What am I looking at?">
        <h3>What am I looking at?</h3>
        <p>{sentences.join(' ')}</p>
      </section>
    </WithHelp>
  )
}
