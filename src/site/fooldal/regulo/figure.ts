// @ts-nocheck
// The one dimetric figure of the page: the opened controller, four parts exploded along the vertical axis.
// Generated at build time from ctrl.ts (one data object of real dimensions and one projection). Two sizes: wide (1280) and narrow (360).
import { D, PARTS, build, svgOf, f, ce, se, sa, ca } from './ctrl.ts'

const ORDER = ['cover', 'display', 'board', 'base']
const IMG = '/work/'

// extra lift (mm) of each part in the exploded state, measured from its assembled position
const LIFT = {
  wide: { base: 0, board: 65, display: 140, cover: 270 },
  narrow: { base: 0, board: 24, display: 50, cover: 150 },
}

function figure(variant) {
  const wide = variant === 'wide'
  const K = wide ? 2.6 : 1.8
  const zk = ce * K
  const L = LIFT[variant]
  const uid = wide ? 'w' : 'n'
  const opt = { detail: wide, text: wide, side: wide ? 'x' : 'y', image: IMG + 'demo-adatgyujto-1200.webp' }
  const B = {}
  ORDER.forEach((n) => { B[n] = build(n, K, { ...opt, uid: uid + '-' + n }) })
  // origin y of each part in the exploded state (base origin = 0), y grows downwards
  const Y = {}
  ORDER.forEach((n) => { Y[n] = -(PARTS[n].zA + L[n]) * zk })
  let top = 1e9, bot = -1e9, half = 0
  ORDER.forEach((n) => { top = Math.min(top, Y[n] + B[n].y0); bot = Math.max(bot, Y[n] + B[n].y1); half = Math.max(half, B[n].half) })
  const shift = -top
  const W = Math.ceil(2 * half)
  const parts = ORDER.map((n, i) => {
    const b = B[n], P = PARTS[n]
    const oyAbs = Y[n] + shift // origin y in figure coordinates
    return { n, no: i + 1, b, left: half - b.half, top: oyAbs + b.y0, oy: oyAbs, zA: P.zA, zt: P.zt, zb: P.zb, L: L[n] }
  })
  const H = Math.ceil(bot + shift)
  // geometry the page needs, in figure coordinates (x from the figure's left edge)
  const dsp = parts[1], bas = parts[3]
  const lcd = dsp.b.c.V(-6, 0, D.disp.t + 6)
  const info = {
    K, zk, W, H, half,
    // detail circle (display module screen)
    dc: { x: dsp.left + dsp.b.half + lcd[0], y: dsp.oy + lcd[1], r: Math.round(K * 31) },
    // cable tail of the seated plug and the axis direction the plug travels along when pulled out (screen px per mm)
    tail: { x: bas.left + bas.b.half + bas.b.c.tail[0], y: bas.oy + bas.b.c.tail[1] },
    axis: wide ? { x: -ca * K, y: sa * se * K } : { x: ca * K, y: sa * se * K }, side: opt.side,
    parts: parts.map((p) => ({ n: p.n, no: p.no, left: p.left, top: p.top, oy: p.oy, W: p.b.W, H: p.b.H, zA: p.zA, zt: p.zt, zb: p.zb, L: p.L })),
  }
  const css = (p) => `left:${f(p.left)}px;top:${f(p.top)}px;width:${f(p.b.W)}px;height:${f(p.b.H)}px;`
  const html = parts.map((p) => `<div class="cp" data-p="${p.n}" data-n="${p.no}" style="${css(p)}">${svgOf(p.b)}</div>`).join('')
  return { html, info }
}

export { figure }
