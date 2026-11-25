// A light 2D ember field for sections below the voyage. Runs only while visible.
export function startEmbers(canvas, { density = 0.00009, colors = ['#ffb46b', '#df6441', '#b8162d'] } = {}) {
  const ctx = canvas.getContext('2d')
  let w = 0, h = 0, dpr = 1, raf = 0, running = false
  let embers = []
  const pointer = { x: -1e4, y: -1e4 }

  const spawn = (fresh) => ({
    x: Math.random() * w,
    y: fresh ? Math.random() * h : h + 10,
    r: 0.6 + Math.random() ** 2 * 2.6,
    vy: 18 + Math.random() * 42,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.6 + Math.random() * 1.2,
    life: 0,
    max: 4 + Math.random() * 6,
    c: colors[(Math.random() * colors.length) | 0],
    vx: 0,
  })

  function resize() {
    const r = canvas.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = r.width
    h = r.height
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const n = Math.round(w * h * density)
    embers = Array.from({ length: n }, () => spawn(true))
  }

  let last = performance.now()
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    ctx.clearRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    for (const e of embers) {
      e.life += dt
      e.sway += e.swaySpeed * dt
      const dx = e.x - pointer.x, dy = e.y - pointer.y
      const d2 = dx * dx + dy * dy
      if (d2 < 14000) {
        const f = (1 - d2 / 14000) * 220
        e.vx += (dx / Math.sqrt(d2 + 1)) * f * dt
      }
      e.vx *= 0.96
      e.x += (Math.sin(e.sway) * 14 + e.vx) * dt
      e.y -= e.vy * dt
      const t = e.life / e.max
      if (t >= 1 || e.y < -20) Object.assign(e, spawn(false))
      const a = Math.min(t * 8, 1) * (1 - t) * (0.6 + 0.4 * Math.sin(now * 0.012 + e.sway * 7))
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5)
      g.addColorStop(0, e.c)
      g.addColorStop(1, 'transparent')
      ctx.globalAlpha = a
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = Math.min(a * 1.4, 1)
      ctx.fillStyle = '#ffe2b8'
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (running) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  resize()
  new ResizeObserver(resize).observe(canvas)
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas)
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    pointer.x = e.clientX - r.left
    pointer.y = e.clientY - r.top
  })
  canvas.parentElement.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -1e4
  })
}
