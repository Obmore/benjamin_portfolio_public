// @ts-nocheck
import { TERULET, VALLALKOZO } from '../../../content/alapadatok.ts'
// MINTA-200 exploded drawing: one data object of real dimensions (mm), one dimetric projection for every part.
// Painter's order inside each part replaces hidden-line removal; convex solids are culled by face normal.

// ---------- real dimensions (mm) ----------
const D = {
  enc: { w: 105, d: 90, depth: 58, modules: 6 }, // 6 x 17,5 mm modules on a 35 mm rail
  cover: { h: 30, bevel: 2, corner: 3, z0: 28 },
  base: { h: 28, wall: 3.5, floor: 4, corner: 3, boss: 4.6, bossH: 26, cutX: 25 },
  rail: { w: 35, depth: 7.5, t: 1, web: 26, ext: 25 }, // 35 x 7,5 top-hat rail, 25 mm past both sides
  screw: { d: 4, head: 3.5, headH: 2.8, len: 14, pitch: 0.7, x: 46.5, y: 39 }, // M4, 6 mm in from each edge
  conn: { pitch: 5.08, poles: 2 }, // 5,08 mm pitch, two-pole plug-in
  board: { w: 97, d: 82, t: 1.6, notch: 6 },
  disp: { w: 50, d: 70, t: 1.6, stand: 8 },
  leaf: { panel: 46, h: 60 },
}
const DEMO_URL = 'https://ottbenjamin.hu/demos/kezikonyv/'

// ---------- projection: dimetric, X and Y equally foreshortened, Z own scale ----------
const YAW = Math.PI / 4
const ELEV = (48 * Math.PI) / 180
const ca = Math.cos(YAW), sa = Math.sin(YAW), se = Math.sin(ELEV), ce = Math.cos(ELEV)

const f = (n) => String(Math.round(n * 10) / 10)

class C {
  constructor(K, o = {}) {
    this.K = K
    this.detail = o.detail !== false
    this.text = o.text !== false
    this.uid = o.uid || 'u'
    this.AX = [-ca * K, sa * se * K]
    this.AY = [ca * K, sa * se * K]
    this.AZ = [0, -ce * K]
    this.dv = [1, 1, (this.AX[1] + this.AY[1]) / -this.AZ[1]] // direction towards the viewer (screen-null)
    this.out = []
    this.min = [1e9, 1e9]
    this.max = [-1e9, -1e9]
    this.seq = 0
  }
  V(x, y, z = 0) {
    return [x * this.AX[0] + y * this.AY[0] + z * this.AZ[0], x * this.AX[1] + y * this.AY[1] + z * this.AZ[1]]
  }
  P(x, y, z = 0) {
    const q = this.V(x, y, z)
    if (q[0] < this.min[0]) this.min[0] = q[0]
    if (q[1] < this.min[1]) this.min[1] = q[1]
    if (q[0] > this.max[0]) this.max[0] = q[0]
    if (q[1] > this.max[1]) this.max[1] = q[1]
    return q
  }
  pd(pts, close = true) {
    return pts.map((p, i) => { const q = this.P(p[0], p[1], p[2] || 0); return (i ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]) }).join('') + (close ? 'Z' : '')
  }
  path(cls, d, extra = '') { this.out.push(`<path class="${cls}" d="${d}"${extra}/>`) }
  line(cls, pts, extra = '') { if (cls === 'd' && !this.detail) return; this.path(cls, this.pd(pts, false), extra) }
  poly(cls, pts, extra = '') { if (cls === 'd' && !this.detail) return; this.path(cls, this.pd(pts, true), extra) }
}

// ---------- 2D helpers ----------
function octagon(hx, hy, cc) {
  return [[hx - cc, -hy], [hx, -hy + cc], [hx, hy - cc], [hx - cc, hy], [-hx + cc, hy], [-hx, hy - cc], [-hx, -hy + cc], [-hx + cc, -hy]]
}
function insetPoly(poly, dist) {
  const n = poly.length
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy)
    const nx = -dy / l, ny = dx / l // left normal = inward for ccw
    return { p: [a[0] + nx * dist, a[1] + ny * dist], d: [dx / l, dy / l] }
  })
  return poly.map((_, i) => {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i]
    const den = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0]
    const t = ((l2.p[0] - l1.p[0]) * l2.d[1] - (l2.p[1] - l1.p[1]) * l2.d[0]) / den
    return [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t]
  })
}

// ---------- solids ----------
function normalOf(pts) {
  let nx = 0, ny = 0, nz = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
  }
  const l = Math.hypot(nx, ny, nz) || 1
  return [nx / l, ny / l, nz / l]
}
const ek = (a, b) => { const k = (p) => p.map((v) => Math.round(v * 1000)).join(','); const A = k(a), B = k(b); return A < B ? A + '|' + B : B + '|' + A }
function solid(c, faces, o = {}) {
  const E = new Map(), fills = []
  for (const fc of faces) {
    const n = normalOf(fc.pts)
    const vis = n[0] * c.dv[0] + n[1] * c.dv[1] + n[2] * c.dv[2] > 1e-6
    for (let i = 0; i < fc.pts.length; i++) {
      const a = fc.pts[i], b = fc.pts[(i + 1) % fc.pts.length], key = ek(a, b)
      const e = E.get(key) || { a, b, v: 0 }
      if (vis) e.v++
      E.set(key, e)
    }
    if (vis) fills.push(`<path class="${fc.k || (n[2] > 0.55 ? 'ft' : 'fs')}" d="${c.pd(fc.pts)}"/>`)
  }
  c.out.push(...fills)
  const L = { s: [], e: [] }
  const sil = o.sil || 's', edg = o.edge || 'e'
  for (const e of E.values()) {
    if (!e.v) continue
    const pa = c.P(...e.a), pb = c.P(...e.b)
    ;(e.v === 1 ? L[sil] ||= [] : L[edg] ||= []).push(`M${f(pa[0])} ${f(pa[1])}L${f(pb[0])} ${f(pb[1])}`)
  }
  for (const k of Object.keys(L)) if (L[k].length) c.path(k, L[k].join(''))
}
// vertical prism over a convex ccw footprint; optional top bevel {h, inset, top:poly}
function prism(c, fp, z0, z1, o = {}) {
  const faces = []
  const zs = o.bevel ? z1 - o.bevel.h : z1
  const n = fp.length
  for (let i = 0; i < n; i++) {
    const a = fp[i], b = fp[(i + 1) % n]
    faces.push({ pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], zs], [a[0], a[1], zs]] })
  }
  let tp = fp
  if (o.bevel) {
    tp = o.bevel.top
    for (let i = 0; i < n; i++) {
      const a = fp[i], b = fp[(i + 1) % n], a2 = tp[i], b2 = tp[(i + 1) % n]
      faces.push({ pts: [[a[0], a[1], zs], [b[0], b[1], zs], [b2[0], b2[1], z1], [a2[0], a2[1], z1]] })
    }
  }
  faces.push({ pts: tp.map((p) => [p[0], p[1], z1]), k: o.topK })
  faces.push({ pts: fp.map((p) => [p[0], p[1], z0]).reverse() })
  solid(c, faces, o)
}
const rectFp = (x0, y0, x1, y1) => [[x1, y0], [x1, y1], [x0, y1], [x0, y0]] // ccw from above (x right, y up)
function box(c, x0, y0, x1, y1, z0, z1, o = {}) { prism(c, rectFp(x0, y0, x1, y1), z0, z1, o) }

const arcPts = (cx, cy, z, r, a, b, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const t = a + ((b - a) * i) / n; return [cx + r * Math.cos(t), cy + r * Math.sin(t), z] })
const PI = Math.PI
function cyl(c, cx, cy, z0, z1, r, o = {}) {
  const cls = o.cls || 'e'
  const side = [...arcPts(cx, cy, z0, r, -PI / 4, (3 * PI) / 4), ...arcPts(cx, cy, z1, r, (3 * PI) / 4, -PI / 4)]
  c.path(o.sideK || 'fs', c.pd(side))
  c.path(o.topK || 'ft', c.pd(arcPts(cx, cy, z1, r, 0, 2 * PI, 48)))
  c.path(cls, c.pd(arcPts(cx, cy, z1, r, 0, 2 * PI, 48)) + c.pd(arcPts(cx, cy, z0, r, -PI / 4, (3 * PI) / 4), false) + c.pd([[cx + r * Math.cos(-PI / 4), cy + r * Math.sin(-PI / 4), z0], [cx + r * Math.cos(-PI / 4), cy + r * Math.sin(-PI / 4), z1]], false) + c.pd([[cx + r * Math.cos((3 * PI) / 4), cy + r * Math.sin((3 * PI) / 4), z0], [cx + r * Math.cos((3 * PI) / 4), cy + r * Math.sin((3 * PI) / 4), z1]], false))
}
function hole(c, cx, cy, z, r, depth, o = {}) {
  c.path('fs', c.pd(arcPts(cx, cy, z, r, 0, 2 * PI, 40)))
  const cres = [...arcPts(cx, cy, z, r, (3 * PI) / 4, (7 * PI) / 4, 24), ...arcPts(cx, cy, z - depth, r, (7 * PI) / 4, (3 * PI) / 4, 24)]
  c.path('ft', c.pd(cres))
  c.path(o.cls || 'e', c.pd(arcPts(cx, cy, z, r, 0, 2 * PI, 40)))
  if (depth > 0.8) c.line('d', arcPts(cx, cy, z - depth, r, (3 * PI) / 4, (7 * PI) / 4, 24))
}
function recess(c, x0, y0, x1, y1, z, depth, o = {}) {
  c.path(o.floorK || 'fs', c.pd([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]))
  c.path('ft', c.pd([[x0, y0, z], [x0, y1, z], [x0, y1, z - depth], [x0, y0, z - depth]]))
  c.path('ft', c.pd([[x0, y0, z], [x1, y0, z], [x1, y0, z - depth], [x0, y0, z - depth]]))
  c.path(o.cls || 'e', c.pd([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]))
  c.line('d', [[x0, y1, z - depth], [x0, y0, z - depth], [x1, y0, z - depth]])
}

// ---------- text and images in a world plane ----------
// frame: origin (ox,oy,z), u = reading direction (world xy unit), v = up direction. local y runs down (= -v).
const READ = { u: [-1, 0], v: [0, -1] } // reading frame used on every top face: reads uphill, letters lean left
function frameM(c, ox, oy, z, fr, scale = 1, sx = 1) {
  const pu = c.V(fr.u[0] * sx, fr.u[1] * sx, 0), pd = c.V(-fr.v[0], -fr.v[1], 0), p0 = c.P(ox, oy, z)
  return `matrix(${f2(pu[0] * scale)} ${f2(pu[1] * scale)} ${f2(pd[0] * scale)} ${f2(pd[1] * scale)} ${f2(p0[0])} ${f2(p0[1])})`
}
const f2 = (n) => String(Math.round(n * 1000) / 1000)
// text: (r,t) = reading-frame coordinates of the baseline start; centre (cx,cy) of the field in world xy
function ptext(c, str, wx, wy, z, size, o = {}) {
  if (!c.text) return
  const m = frameM(c, wx, wy, z, o.fr || READ, 0.1, o.sx || 1)
  c.P(wx, wy, z)
  c.out.push(`<text class="tx${o.w ? ' ' + o.w : ''}" transform="${m}" font-size="${f(size * 10)}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${str}</text>`)
}
// reading-frame helper: world point from (r,t) relative to centre (cx,cy)

// ---------- hatching of a section face in plane x = x0 ----------
function hatch(c, x0, polys, step = 2.6) {
  const id = `${c.uid}-h${c.seq++}`
  const all = polys.flat()
  const ys = all.map((p) => p[0]), zs = all.map((p) => p[1])
  const ymin = Math.min(...ys), ymax = Math.max(...ys), zmin = Math.min(...zs), zmax = Math.max(...zs)
  const cp = polys.map((pl) => `<path d="${c.pd(pl.map((p) => [x0, p[0], p[1]]))}"/>`).join('')
  c.out.push(`<clipPath id="${id}">${cp}</clipPath>`)
  let d = ''
  for (let k = ymin - zmax; k <= ymax - zmin; k += step) {
    const a = c.P(x0, k + zmin - 1, zmin - 1), b = c.P(x0, k + zmax + 1, zmax + 1)
    d += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`
  }
  if (c.detail) c.out.push(`<g clip-path="url(#${id})"><path class="d" d="${d}"/></g>`)
}

// ---------- rail (35 x 7,5 top-hat) ----------
function railSeg(c, xa, xb, o = {}) {
  const R = D.rail, hw = R.w / 2, web = R.web / 2, t = R.t
  const wo = web + t // outer web wall
  // channel floor (inner, z = -(depth - t)), far inner wall, brim tops, brim edge face, end face
  const zf = -(R.depth - t)
  c.path('fs', c.pd([[xa, -web, zf], [xb, -web, zf], [xb, web, zf], [xa, web, zf]]))
  c.path('ft', c.pd([[xa, -web, zf], [xb, -web, zf], [xb, -web, 0], [xa, -web, 0]]))
  c.path('ft', c.pd([[xa, -hw, 0], [xb, -hw, 0], [xb, -web, 0], [xa, -web, 0]]))
  c.path('ft', c.pd([[xa, web, 0], [xb, web, 0], [xb, hw, 0], [xa, hw, 0]]))
  c.path('fs', c.pd([[xa, hw, 0], [xb, hw, 0], [xb, hw, -t], [xa, hw, -t]]))
  const L = []
  const seg = (a, b) => { const p = c.P(...a), q = c.P(...b); return `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}` }
  for (const [y, z] of [[-hw, 0], [-web, 0], [web, 0], [hw, 0], [-web, zf], [web, zf]]) L.push(seg([xa, y, z], [xb, y, z]))
  L.push(seg([xa, hw, -t], [xb, hw, -t]))
  c.path('e', L.join(''))
  if (o.end) {
    const prof = [[-hw, 0], [-web, 0], [-web, zf], [web, zf], [web, 0], [hw, 0], [hw, -t], [wo, -t], [wo, -R.depth], [-wo, -R.depth], [-wo, -t], [-hw, -t]]
    c.path('ft', c.pd(prof.map((p) => [xb, p[0], p[1]])))
    hatch(c, xb, [prof])
    c.path('s', c.pd(prof.map((p) => [xb, p[0], p[1]])))
  }
}

// ======================================================================
//                              PARTS (round 2: every part has its own outline)
// ======================================================================
const PORT_SY = -10 // socket centre on the +x wall (y, mm)
const PORT_T = -12 // socket centre on the +y wall (x, mm), narrow variant
const HOLES = [[D.screw.x, D.screw.y], [D.screw.x, -D.screw.y], [-D.screw.x, D.screw.y], [-D.screw.x, -D.screw.y]]
const STANDOFFS = [[-21, -31], [21, -31], [-21, 31], [21, 31]]
const PLUG_Y = [-17.25, -5.75, 5.75, 17.25]
const FRB = { u: [0, 1], v: [-1, 0] } // reading frame along +y, letters upright towards -x
const SCREW_LIFT = 24 // mm, screws out
const NP_LINES = [[0, 'Típus:', VALLALKOZO.szakma], [1, 'Terület:', TERULET], [2, 'Hely:', VALLALKOZO.helyszin]]
const ZA = { base: 0, board: 26, display: 35.6, leaflet: 8, cover: 28 }

function partCover(c, o = {}) {
  const Cv = D.cover, H = Cv.h, hx = D.enc.w / 2, hy = D.enc.d / 2
  const oct = octagon(hx, hy, Cv.corner), top = insetPoly(oct, Cv.bevel)
  prism(c, oct, 0, H, { bevel: { h: Cv.bevel, top } })
  // front wall (+x): one cut-out 46 x 12, the four connector faces seen through it
  const cut = [[hx, -23, 1], [hx, 23, 1], [hx, 23, 13], [hx, -23, 13]]
  const cid = `${c.uid}-cut`
  c.out.push(`<clipPath id="${cid}"><path d="${c.pd(cut)}"/></clipPath>`)
  c.path('fi', c.pd(cut))
  c.out.push(`<g clip-path="url(#${cid})">`)
  PLUG_Y.forEach((y) => {
    const q = [[47.5, y - 5.08, 2.2], [47.5, y + 5.08, 2.2], [47.5, y + 5.08, 12], [47.5, y - 5.08, 12]]
    c.path('ft', c.pd(q)); c.poly('d', q.map((p) => p.slice()))
    ;[-2.54, 2.54].forEach((dy) => c.path('fs', c.pd([[47.5, y + dy - 1.4, 4], [47.5, y + dy + 1.4, 4], [47.5, y + dy + 1.4, 7], [47.5, y + dy - 1.4, 7]])))
  })
  c.out.push('</g>')
  c.path('e', c.pd(cut))
  // screw bosses: raised collar, counterbore, through hole
  HOLES.forEach(([x, y]) => {
    cyl(c, x, y, H, H + 1, 4.6, { cls: 'e', topK: 'ft' })
    hole(c, x, y, H + 1, 3.6, 4)
    c.path('fs', c.pd(arcPts(x, y, H - 3, 2.2, 0, 2 * PI, 28))); c.path('e', c.pd(arcPts(x, y, H - 3, 2.2, 0, 2 * PI, 28)))
  })
  // display window: 66 x 38 bezel step, 62 x 34 screen (ink) with the projected screenshot
  recess(c, -42, -33, -4, 33, H, 1.5)
  recess(c, -40, -31, -6, 31, H - 1.5, 1.5, { floorK: 'ft' })
  if (o.image !== false) {
    const m = frameM(c, -40, -31, H - 3, FRB, 1)
    c.out.push(`<g class="lcd-wrap"><image class="lcd-img" href="${o.image || ''}" width="62" height="34" preserveAspectRatio="xMidYMid slice" transform="${m}"/></g>`)
    c.poly('e', [[-40, -31, H - 3], [-6, -31, H - 3], [-6, 31, H - 3], [-40, 31, H - 3]])
  }
  // five key openings (one per work) with raised key caps
  ;[-24, -12, 0, 12, 24].forEach((yc, k) => {
    recess(c, -2, yc - 5, 6, yc + 5, H, 2.5)
    c.out.push('<g class="key" data-k="' + k + '">')
    box(c, -1, yc - 4, 5, yc + 4, H - 2.5, H + 1.2, { sil: 'e', topK: 'kt' })
    c.poly('kc', [[-1, yc - 4, H + 1.2], [5, yc - 4, H + 1.2], [5, yc + 4, H + 1.2], [-1, yc + 4, H + 1.2]])
    c.out.push('</g>')
  })
  // nameplate 70 x 26 (8 mm clear of every screw axis), one field per line
  const np = [[12.5, -35, H], [38.5, -35, H], [38.5, 35, H], [12.5, 35, H]]
  c.path('ft', c.pd(np)); c.path('e', c.pd(np))
  c.poly('d', [[13.5, -34, H], [37.5, -34, H], [37.5, 34, H], [13.5, 34, H]])
  NP_LINES.forEach(([k, lab, val], i) => {
    c.out.push(`<g class="np" style="--i:${k}">`)
    ptext(c, `<tspan font-weight="800">${lab}</tspan> ${val}`, 19.2 + i * 7, -33.2, H, 4.3, { fr: FRB, sx: 0.74 })
    c.out.push('</g>')
  })
}

// four M4 screws, drawn in seated position; the page lifts them
function partScrews(c) {
  const H = D.cover.h, S = D.screw, zb = H - 3 + 1
  const order = HOLES.map((h) => h).sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
  const tr = []
  order.forEach((h) => {
    const a = c.P(h[0], h[1], zb), b = c.P(h[0], h[1], zb + SCREW_LIFT + 1)
    tr.push(`<line class="t sct" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" style="transform-origin:${f(a[0])}px ${f(a[1])}px"/>`)
  })
  c.out.push(`<g class="sc-tr">${tr.join('')}</g>`)
  order.forEach((h, k) => {
    const yc = c.P(h[0], h[1], zb)[1] + 3
    const cid = `${c.uid}-sc${k}`
    c.out.push(`<clipPath id="${cid}"><rect x="-3000" y="-3000" width="6000" height="${f(3000 + yc)}"/></clipPath><g clip-path="url(#${cid})"><g class="sc-lift" data-k="${k}">`)
    cyl(c, h[0], h[1], zb - S.len, zb, S.d / 2, { cls: 'e', topK: 'fs' })
    if (c.detail) for (let z = zb - S.len + 2; z < zb - 1; z += 2.1) c.line('d', arcPts(h[0], h[1], z, S.d / 2, -PI / 4, (3 * PI) / 4, 14))
    c.out.push('</g></g>')
    c.out.push(`<g class="sc-lift" data-k="${k}">`)
    cyl(c, h[0], h[1], zb, zb + S.headH, S.head, { cls: 'e', topK: 'fa', sideK: 'fs' })
    const m = frameM(c, h[0], h[1], zb + S.headH, { u: [1, 0], v: [0, 1] }, 1)
    c.out.push(`<g transform="${m}"><g class="sl-a"><g class="sl-b"><path class="e" d="M-2.6 0H2.6"/></g></g></g>`)
    c.out.push('</g>')
  })
}

function partDisplay(c, o = {}) {
  const Dp = D.disp, T = Dp.t, LH = 6
  // four 8 mm standoffs under the corners, then the 50 x 70 board
  const sorted = STANDOFFS.slice().sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
  sorted.forEach(([x, y]) => cyl(c, x, y, -Dp.stand, 0, 2.5, { cls: 'e', topK: 'fs' }))
  // flat ribbon cable, 12 wide, leaves the rear edge and hangs 15 mm (drawn before the board: it is behind it)
  const rz = 0.9
  c.path('ft', c.pd([[-25, -6, rz], [-37, -6, rz], [-37, 6, rz], [-25, 6, rz]]))
  c.path('fs', c.pd([[-37, -6, rz], [-37, 6, rz], [-37, 6, rz - 15], [-37, -6, rz - 15]]))
  c.path('e', c.pd([[-25, -6, rz], [-37, -6, rz], [-37, -6, rz - 15]], false) + c.pd([[-25, 6, rz], [-37, 6, rz], [-37, 6, rz - 15], [-37, -6, rz - 15]], false) + c.pd([[-37, -6, rz], [-37, 6, rz]], false))
  prism(c, octagon(25, 35, 2), 0, T)
  STANDOFFS.forEach(([x, y]) => hole(c, x, y, T, 1.6, T))
  // LCD block 62 x 34 x 6, its top face is the screen (ink) with the projected screenshot
  box(c, -23, -31, 11, 31, T, T + LH, { sil: 'e', topK: 'ft' })
  if (o.image !== false) {
    const m = frameM(c, -21, -29, T + LH, FRB, 1)
    c.out.push(`<g class="lcd-wrap"><image class="lcd-img" href="${o.image || ''}" width="58" height="30" preserveAspectRatio="xMidYMid slice" transform="${m}"/></g>`)
    c.poly('e', [[-21, -29, T + LH], [9, -29, T + LH], [9, 29, T + LH], [-21, 29, T + LH]])
  }
  // key strip 60 x 10 with five switch bodies, 4 mm tall (one per work)
  box(c, 14, -30, 24, 30, T, T + 0.8, { sil: 'e' })
  ;[-24, -12, 0, 12, 24].forEach((yc, k) => {
    c.out.push(`<g class="key" data-k="${k}">`)
    box(c, 15.5, yc - 4.5, 22.5, yc + 4.5, T + 0.8, T + 4.8, { sil: 'e', topK: 'kt' })
    c.poly('kc', [[15.5, yc - 4.5, T + 4.8], [22.5, yc - 4.5, T + 4.8], [22.5, yc + 4.5, T + 4.8], [15.5, yc + 4.5, T + 4.8]])
    c.out.push('</g>')
  })
  // detail circle around the screen (drawn by the page once this part is clear of the cover)
  const v = c.V(-6, 0, T + LH), r = Math.round(c.K * 31)
  c.min[0] = Math.min(c.min[0], v[0] - r); c.min[1] = Math.min(c.min[1], v[1] - r); c.max[0] = Math.max(c.max[0], v[0] + r); c.max[1] = Math.max(c.max[1], v[1] + r)
  c.out.push(`<circle class="dcirc" pathLength="1" cx="${f(v[0])}" cy="${f(v[1])}" r="${r}"/>`)
}

function partBoard(c, o = {}) {
  const B = D.board, T = B.t, n = B.notch, hx = B.w / 2, hy = B.d / 2
  // port body hangs under the board at the edge that carries the port (+x wide, +y narrow), in line with the base opening
  if (o.side === 'y') {
    const px0 = PORT_T - 9, px1 = PORT_T + 9
    box(c, px0, 34, px1, 50, -11, 0, { sil: 'e' })
    const po = [[px0 + 2, 50, -8.5], [px1 - 2, 50, -8.5], [px1 - 2, 50, -2.5], [px0 + 2, 50, -2.5]]
    c.path('fs', c.pd(po)); c.path('e', c.pd(po))
  } else {
    const py0 = PORT_SY - 9, py1 = PORT_SY + 9
    box(c, 34, py0, 50, py1, -11, 0, { sil: 'e' })
    const po = [[50, py0 + 2, -8.5], [50, py1 - 2, -8.5], [50, py1 - 2, -2.5], [50, py0 + 2, -2.5]]
    c.path('fs', c.pd(po)); c.path('e', c.pd(po))
    if (c.detail) for (let i = 0; i < 8; i++) c.line('d', [[50, py0 + 3.5 + i * 1.5, -3.2], [50, py0 + 3.5 + i * 1.5, -4.8]])
  }
  // 97 x 82 board, corners notched 6 x 6 for the bosses
  const fp = [[-hx + n, -hy], [hx - n, -hy], [hx - n, -hy + n], [hx, -hy + n], [hx, hy - n], [hx - n, hy - n], [hx - n, hy], [-hx + n, hy], [-hx + n, hy - n], [-hx, hy - n], [-hx, -hy + n], [-hx + n, -hy + n]]
  prism(c, fp, 0, T)
  STANDOFFS.forEach(([x, y]) => hole(c, x, y, T, 1.6, T))
  // square chip outline, pin header 2 x 7 (where the ribbon lands), revision text
  if (c.detail) {
    c.poly('d', [[-28, -14, T], [-16, -14, T], [-16, -2, T], [-28, -2, T]])
    for (let i = 0; i < 6; i++) { const a = -27 + i * 2; c.line('d', [[a, -14, T], [a, -15.4, T]]); c.line('d', [[a, -2, T], [a, -0.6, T]]); const b = -13 + i * 2; c.line('d', [[-28, b, T], [-29.4, b, T]]); c.line('d', [[-16, b, T], [-14.6, b, T]]) }
  }
  box(c, -40, -9, -34.9, 8.8, T, T + 8.5, { sil: 'e' })
  for (let i = 0; i < 7; i++) [-38.7, -36.2].forEach((x) => box(c, x - 0.6, -8 + i * 2.54 - 0.6, x + 0.6, -8 + i * 2.54 + 0.6, T + 8.5, T + 9.1, { sil: 'd', topK: 'fi' }))
  ptext(c, 'REV. B', 12, -22, T, 3, { fr: FRB, w: 'b' })
  // four two-pole plug-in connectors on the +x front edge, back to front (along y)
  const zh = T, zp = T + 3
  PLUG_Y.forEach((cy, i) => {
    c.out.push('<g class="hdr">')
    box(c, 32, cy - 5.08, 40, cy + 5.08, zh, zp, { sil: 'e' })
    recess(c, 33.6, cy - 4.2, 38.4, cy + 4.2, zp, 2)
    ;[-2.54, 2.54].forEach((dy) => hole(c, 36, cy + dy, zp - 2, 0.9, 0, { cls: 'd' }))
    c.out.push('</g>')
    const a = c.P(36, cy, zp), b = c.P(36, cy, zp + 1)
    c.out.push(`<line class="t plt" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" style="transform-origin:${f(a[0])}px ${f(a[1])}px"/>`)
    c.out.push(`<g class="plug" data-k="${i}" style="--k:${i}">`)
    box(c, 31, cy - 5.08, 41, cy + 5.08, zp, zp + 8, { sil: 'e', topK: 'pt' })
    ;[-2.54, 2.54].forEach((dy) => { hole(c, 35, cy + dy, zp + 8, 1.7, 2, { cls: 'e' }); const m = frameM(c, 35, cy + dy, zp + 8, { u: [1, 0], v: [0, 1] }, 1); c.out.push(`<g transform="${m}"><path class="d" d="M-1.3 0H1.3"/></g>`) })
    ;[-2.54, 2.54].forEach((dy) => { const q = [[41, cy + dy - 1.5, zp + 2], [41, cy + dy + 1.5, zp + 2], [41, cy + dy + 1.5, zp + 5], [41, cy + dy - 1.5, zp + 5]]; c.path('fs', c.pd(q)); c.poly('d', q) })
    c.out.push('</g>')
  })
  PLUG_Y.forEach((cy, i) => [-2.54, 2.54].forEach((dy, j) => ptext(c, String(i * 2 + j + 1), 45, cy + dy, T, 2.4, { fr: FRB, w: 'm', anchor: 'middle' })))
}

const PLUG_Z = [17, 24.5]
function partBase(c, o = {}) {
  const B = D.base, R = D.rail, hx = D.enc.w / 2, hy = D.enc.d / 2, W = B.wall, H = B.h, fl = B.floor
  const rx = hx + R.ext
  railSeg(c, -rx, hx)
  // rail clip: fixed hook (-y side) and spring slider with a pull tab (+y side), profiles in the y-z plane
  const fixedHook = [[-21.4, 0], [-17.9, 0], [-17.9, -2.2], [-14.5, -2.2], [-14.5, -4.2], [-21.4, -4.2]]
  const slider = [[14.5, -2.2], [17.9, -2.2], [17.9, 0], [21.4, 0], [21.4, -2.2], [54, -2.2], [54, -9], [51, -9], [51, -4.2], [14.5, -4.2]]
  const extrude = (prof, xa, xb) => {
    const n = prof.length
    const sgn = prof.reduce((s, p, k) => { const q = prof[(k + 1) % n]; return s + (p[0] * q[1] - q[0] * p[1]) }, 0) > 0 ? 1 : -1
    for (let i = 0; i < n; i++) {
      const a = prof[i], b = prof[(i + 1) % n]
      const ny = sgn * (b[1] - a[1]), nz = -sgn * (b[0] - a[0])
      if (ny * c.dv[1] + nz * c.dv[2] > 1e-6) { const q = [[xa, a[0], a[1]], [xb, a[0], a[1]], [xb, b[0], b[1]], [xa, b[0], b[1]]]; c.path('fs', c.pd(q)); c.path('e', c.pd(q)) }
    }
  }
  extrude(fixedHook, -30, 30)
  extrude(slider, -12, 12)
  // tray: chamfered prism, cavity seen from above
  const oct = octagon(hx, hy, B.corner), inner = insetPoly(oct, W)
  const faces = []
  const n = oct.length
  for (let i = 0; i < n; i++) {
    const a = oct[i], b = oct[(i + 1) % n]
    faces.push({ pts: [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], H], [a[0], a[1], H]] })
  }
  faces.push({ pts: oct.map((p) => [p[0], p[1], H]) })
  faces.push({ pts: oct.map((p) => [p[0], p[1], 0]).reverse() })
  solid(c, faces)
  const id = `${c.uid}-cav`
  c.out.push(`<clipPath id="${id}"><path d="${c.pd(inner.map((p) => [p[0], p[1], H]))}"/></clipPath><g clip-path="url(#${id})">`)
  c.path('fs', c.pd(inner.map((p) => [p[0], p[1], H])))
  c.path('ft', c.pd(inner.map((p) => [p[0], p[1], fl])))
  const m = inner.length
  for (let i = 0; i < m; i++) {
    const a = inner[i], b = inner[(i + 1) % m]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const nin = [dy, -dx]
    const vis = -nin[0] * c.dv[0] - nin[1] * c.dv[1] > 1e-6
    if (vis) { c.path('ft', c.pd([[a[0], a[1], fl], [b[0], b[1], fl], [b[0], b[1], H], [a[0], a[1], H]])); c.line('e', [[a[0], a[1], fl], [b[0], b[1], fl]]) }
  }
  const bosses = HOLES.slice().sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
  bosses.forEach(([x, y]) => { cyl(c, x, y, fl, B.bossH, B.boss, { cls: 'e', topK: 'ft' }); hole(c, x, y, B.bossH, 1.7, 10, { cls: 'e' }) })
  c.out.push('</g>')
  c.path('e', c.pd(inner.map((p) => [p[0], p[1], H]), true))
  // port opening in the wall that carries it, in line with the board's port body, and the link lamp beside it
  const sy = o.side === 'y' ? PORT_T : PORT_SY
  const WP = (t, z, off = 0) => (o.side === 'y' ? [t, hy + off, z] : [hx + off, t, z])
  const sock = [WP(sy - 9, 15), WP(sy + 9, 15), WP(sy + 9, 26.5), WP(sy - 9, 26.5)]
  c.path('fs', c.pd(sock)); c.path('e', c.pd(sock))
  c.poly('d', [WP(sy - 7, 17), WP(sy + 7, 17), WP(sy + 7, 25), WP(sy - 7, 25)])
  if (c.detail) for (let i = 0; i < 8; i++) c.line('d', [WP(sy - 5.25 + i * 1.5, 23.4), WP(sy - 5.25 + i * 1.5, 25)])
  const lt = o.side === 'y' ? 10 : 8
  const lamp = [WP(lt, 21), WP(lt + 3.5, 21), WP(lt + 3.5, 24.5), WP(lt, 24.5)]
  c.out.push(`<g class="lamp"><path class="lamp-f" d="${c.pd(lamp)}"/><path class="e" d="${c.pd(lamp)}"/></g>`)
  // rail, front segment (in front of the tray), end face hatched
  railSeg(c, hx, rx, { end: true })
  // the cable plug (the line itself ends here); it seats along the wall normal into the socket
  c.out.push('<g class="cplug">')
  const PB = (n0, n1, t0, t1, z0, z1) => (o.side === 'y' ? box(c, t0, n0 + hy, t1, n1 + hy, z0, z1, { sil: 'e', topK: 'ft' }) : box(c, n0 + hx, t0, n1 + hx, t1, z0, z1, { sil: 'e', topK: 'ft' }))
  PB(-2, 16, sy - 6.5, sy + 6.5, PLUG_Z[0], PLUG_Z[1])
  PB(16, 30, sy - 4.5, sy + 4.5, PLUG_Z[0] + 1.2, PLUG_Z[1] - 1.2)
  ;[-3, 3].forEach((dt) => c.line('d', [WP(sy + dt, PLUG_Z[1], 4), WP(sy + dt, PLUG_Z[1], 12)]))
  c.out.push('</g>')
  c.tail = c.P(...WP(sy, (PLUG_Z[0] + PLUG_Z[1]) / 2, 30))
}

const PARTS = {
  cover: { fn: partCover, extra: partScrews, zA: ZA.cover, zt: D.cover.h, zb: 0, id: 'cover', no: 1 },
  display: { fn: partDisplay, zA: ZA.display, zt: D.disp.t, zb: -D.disp.stand, id: 'display', no: 2 },
  board: { fn: partBoard, zA: ZA.board, zt: D.board.t, zb: 0, id: 'board', no: 3 },
  base: { fn: partBase, zA: ZA.base, zt: D.base.bossH, zb: 0, id: 'base', no: 5 },
}
// dashed traces exist only between neighbouring parts, hole to hole; each group names the part above it
const HT = {
  board: [{ pts: STANDOFFS, zt: D.board.t, prev: 2 }],
  base: [{ pts: HOLES, zt: D.base.bossH, prev: 1 }],
}

function build(name, K, o = {}) {
  const c = new C(K, o)
  const P = PARTS[name]
  P.fn(c, o)
  if (P.extra && !o.mini) P.extra(c, o)
  if (!o.mini && !o.noHT && HT[name]) {
    HT[name].forEach((g) => {
      c.out.push(`<g class="ht" data-prev="${g.prev}" data-zt="${g.zt}">` + g.pts.map(([x, y]) => { const a = c.P(x, y, g.zt); return `<line class="t" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(a[0])}" y2="${f(a[1] - 1)}" style="transform-origin:${f(a[0])}px ${f(a[1])}px"/>` }).join('') + '</g>')
    })
  }
  const pad = 8
  const half = Math.max(Math.abs(c.min[0]), Math.abs(c.max[0])) + pad
  const y0 = c.min[1] - pad, y1 = c.max[1] + pad
  return { inner: c.out.join('').replace(/<path class="s" /g, '<path class="s" pathLength="1" '), half, y0, y1, W: 2 * half, H: y1 - y0, oy: -y0, K: c.K, c }
}
function svgOf(b, cls = '', style = '', attrs = '') {
  return `<svg class="${cls}" viewBox="${f(-b.half)} ${f(b.y0)} ${f(b.W)} ${f(b.H)}" width="${f(b.W)}" height="${f(b.H)}" style="${style}" aria-hidden="true" focusable="false" ${attrs}>${b.inner}</svg>`
}

export { D, PARTS, build, svgOf, DEMO_URL, f, ce, se, sa, ca }
