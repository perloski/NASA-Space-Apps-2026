import { useEffect, useRef } from 'react'

// Fondo de estrellas titilantes + cometas (portado del prototipo index.html).
export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stars = []
    let comets = []
    let nextComet = 2500 // el primero aparece a los ~2,5 s
    let raf = 0
    let resizeTimer

    function makeStars() {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round((w * h) / 3500)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.pow(Math.random(), 3) * 1.8 + 0.3,
        base: Math.random() * 0.5 + 0.4,
        speed: Math.random() * 0.002 + 0.0005,
        phase: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.15,
      }))
      draw(0)
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const s of stars) {
        const tw = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(t * s.speed + s.phase)
        ctx.globalAlpha = Math.min(1, s.base * tw)
        ctx.fillStyle = s.warm ? '#ffe9b8' : '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    function spawnComet(t) {
      const w = window.innerWidth, h = window.innerHeight
      const fromLeft = Math.random() < 0.5
      const angle = (18 + Math.random() * 22) * Math.PI / 180 // 18°–40° hacia abajo
      const dir = fromLeft ? 1 : -1
      comets.push({
        x: fromLeft ? -50 + Math.random() * w * 0.5 : w + 50 - Math.random() * w * 0.5,
        y: -40 + Math.random() * h * 0.35,
        vx: Math.cos(angle) * dir,
        vy: Math.sin(angle),
        speed: 0.35 + Math.random() * 0.35, // px por ms
        len: 140 + Math.random() * 160,
        born: t,
        life: 2600 + Math.random() * 1600, // ms
      })
      nextComet = t + 7000 + Math.random() * 9000 // otro en 7–16 s
    }

    function drawComets(t) {
      if (t > nextComet) spawnComet(t)
      comets = comets.filter(c => t - c.born < c.life)
      for (const c of comets) {
        const age = (t - c.born) / c.life
        const fade = Math.min(1, age * 6) * Math.min(1, (1 - age) * 3)
        const d = (t - c.born) * c.speed
        const hx = c.x + c.vx * d, hy = c.y + c.vy * d
        const tx = hx - c.vx * c.len, ty = hy - c.vy * c.len

        const g = ctx.createLinearGradient(hx, hy, tx, ty)
        g.addColorStop(0, `rgba(255, 244, 214, ${0.85 * fade})`)
        g.addColorStop(0.25, `rgba(253, 199, 79, ${0.35 * fade})`)
        g.addColorStop(1, 'rgba(253, 199, 79, 0)')
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(hx, hy)
        ctx.lineTo(tx, ty)
        ctx.stroke()

        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 6)
        glow.addColorStop(0, `rgba(255, 255, 255, ${fade})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(hx, hy, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function loop(t) {
      draw(t)
      drawComets(t)
      raf = requestAnimationFrame(loop)
    }

    function onResize() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(makeStars, 150)
    }

    makeStars()
    window.addEventListener('resize', onResize)
    if (!reduceMotion) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas id="stars" ref={canvasRef} aria-hidden="true" />
}
