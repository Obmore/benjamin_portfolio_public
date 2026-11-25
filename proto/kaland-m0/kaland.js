// "Az út a Mintatérben": M0 proof prototype (throwaway: it is not in the site build). Read the private plan kaland-terv first.
// Three stations draw into their own in-flow canvases with one raw-WebGL2 cell shader; every other pixel is DOM.
// Rules kept from the Mintatér plan: GL draws no text; no randomness, no idle motion; every square is a value of a named source (adat.js);
// the page works without GL (the gate decides); motion only when the visitor has not asked for reduced motion.
import ADAT from './adat.js'
import { kontextus, rendererNev, SZOFTVERES, programAsync, texR32F, texRGBA8, peldanyPuffer, uniformok } from './gl.js'
import { fokusz, vetitCella, esesSik, onTeszt } from './matek.js'
import { CELLA_VS, CELLA_FS, POLI_VS, POLI_FS } from './arnyekolok.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const params = new URLSearchParams(location.search)
/** Test hook (the plan's "software GL admitted"): lets a CI browser draw; the gate result is still reported. */
const PROBA = !!window.__kalandProba || params.has('szoftveres')
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
const TELEFON = () => innerWidth < 727
/** Where relative site links (the demos) point: empty on the dev server; the single-file build sets it to the live site. */
const ALAP = window.__kalandAlap ?? ''
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',').replace('-', '−')
const korl = (x, a, b) => Math.min(b, Math.max(a, x))

/** Variants the owner can flip live (the plan's frame variants): fall angle, age mix, square side as a share of the pitch. */
const V = { fi: +params.get('fi') || 60, kor: (+params.get('kor') || 65) / 100, oldal: params.get('oldal') === '75' ? 0.75 : 2 / 3 }

// ------------------------------------------------------------------------------------------------------------------------------------
// gate
const naplo = { renderer: '-', kapu: '-', fordit: null, median: null, kepkockak: 0, szint: 'ki', megjegyzesek: [] }
window.__kaland = naplo

function tarol(kulcs, ertek) {
  try { return ertek === undefined ? localStorage.getItem(kulcs) : (ertek === null ? localStorage.removeItem(kulcs) : localStorage.setItem(kulcs, ertek)) } catch { return null }
}

/** The WebGL2 gate (plan 2.0): script, WebGL2 without the performance caveat, not a software renderer, no Save-Data, the key not off. */
function kapu() {
  if (tarol('mt-ki') === '1') return 'a Mintatér kulcs ki van kapcsolva'
  if (!window.WebGL2RenderingContext) return 'nincs WebGL2'
  if (navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches) return 'Save-Data'
  const c = document.createElement('canvas')
  const gl = kontextus(c, !PROBA)
  if (!gl) return 'a böngésző jelzi: nincs hardveres GPU (failIfMajorPerformanceCaveat)'
  naplo.renderer = rendererNev(gl)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  if (!PROBA && SZOFTVERES.test(naplo.renderer)) return `szoftveres renderer: ${naplo.renderer}`
  return null
}

// ------------------------------------------------------------------------------------------------------------------------------------
// colours: read from the CSS tokens through a 1x1 canvas, never typed here
const lin = (b) => { const c = b / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
function szinek() {
  const px = document.createElement('canvas'); px.width = px.height = 1
  const cx = px.getContext('2d', { willReadFrequently: true })
  const el = document.createElement('i'); el.style.display = 'none'; document.body.append(el)
  const ki = {}
  for (const [nev, tok] of [['pen', '--jel'], ['hot', '--jel-forro'], ['papir', '--papir'], ['kezel', '--kezel'], ['be', '--be']]) {
    el.style.color = `var(${tok})`
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = getComputedStyle(el).color; cx.fillRect(0, 0, 1, 1)
    const d = cx.getImageData(0, 0, 1, 1).data
    ki[nev] = [lin(d[0]), lin(d[1]), lin(d[2])]
  }
  el.remove()
  return ki
}
let SZIN = null

// ------------------------------------------------------------------------------------------------------------------------------------
// data: every field is derived from adat.js (a run or a copy of a named source) or from the real capture
const GEP = ADAT.gepadat
const GEP_MIN = Math.min(...GEP.ertekek)
const GEP_MAX = Math.max(...GEP.ertekek)
const GEP_UTOLSO = GEP.ertekek.length - 1
const HOM_LEPESEK = [{ c: 12, felirat: '12 × 14' }, { c: 36, felirat: '36 × 43' }, { c: 0, felirat: 'Teljes' }]
const ERT_LEPESEK = [{ l: 5, felirat: '5 °C' }, { l: 1, felirat: '1 °C' }, { l: 0.1, felirat: '0,1 °C' }]
const perc = (i) => { const m = GEP.kezdetPerc + i; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
const kvant = (v, l) => (l >= 0.1 && l < 0.15 ? Math.round(v * 10) / 10 : Math.round(v / l) * l)

/** Block means of the real capture in linear light (plan R20), per grid width, plus the relative luminance of each block. */
const KEP = { kesz: null, rácsok: new Map() }
function blokkok(adat, w, h, cols) {
  const rows = Math.round((cols * h) / w)
  const cw = w / cols
  const szin = new Uint8Array(cols * rows * 4)
  const lum = new Float32Array(cols * rows)
  const LUT = Float32Array.from({ length: 256 }, (_, i) => lin(i))
  const enc = (x) => Math.round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055))
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor(r * cw), y1 = r === rows - 1 ? h : Math.floor((r + 1) * cw) // the last row covers the remainder
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw), x1 = c === cols - 1 ? w : Math.floor((c + 1) * cw)
      let R = 0, G = 0, B = 0, n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; R += LUT[adat[i]]; G += LUT[adat[i + 1]]; B += LUT[adat[i + 2]]; n++ }
      R /= n; G /= n; B /= n
      const o = r * cols + c
      szin.set([enc(R), enc(G), enc(B), 255], o * 4)
      lum[o] = 0.2126 * R + 0.7152 * G + 0.0722 * B
    }
  }
  return { cols, rows, szin, lum }
}
function kepBetoltes(img) {
  return new Promise((ok, hiba) => {
    const kesz = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0)
      const d = cx.getImageData(0, 0, w, h).data
      for (const s of HOM_LEPESEK) if (s.c) KEP.rácsok.set(s.c, blokkok(d, w, h, s.c))
      KEP.rácsok.set(72, blokkok(d, w, h, 72)) // the fall's finest HONLAP step (the screen's "Teljes" is the picture itself)
      KEP.w = w; KEP.h = h
      ok()
    }
    if (img.complete && img.naturalWidth) kesz(); else { img.addEventListener('load', kesz, { once: true }); img.addEventListener('error', hiba, { once: true }) }
  })
}

// ------------------------------------------------------------------------------------------------------------------------------------
// stations
const ELO = new Set() // stations with a live context (at most two)
let rajzKer = 0
const kerRajz = () => { if (!rajzKer) rajzKer = requestAnimationFrame(keret) }

class Allomas {
  constructor(el, tipus) {
    this.el = el; this.tipus = tipus
    this.canvas = $('canvas', el)
    this.gl = null; this.kesz = false; this.piszkos = true; this.lathato = false; this.kozel = false
    this.W = 0; this.H = 0; this.tegla = 0
    this.hiba = null
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.kesz = false; this.gl = null; ELO.delete(this); naplo.megjegyzesek.push(`${tipus}: context lost`) })
    this.canvas.addEventListener('webglcontextrestored', () => { this.indit() })
  }
  meret() {
    const r = this.canvas.parentElement.getBoundingClientRect()
    const W = Math.round(r.width), H = Math.round(r.height)
    const dpr = Math.min(window.devicePixelRatio || 1, TELEFON() ? 1.5 : 2)
    if (W === this.W && H === this.H && dpr === this.dpr) return false
    this.W = W; this.H = H; this.dpr = dpr
    this.canvas.width = Math.max(1, Math.round(W * dpr)); this.canvas.height = Math.max(1, Math.round(H * dpr))
    this.piszkos = true
    return true
  }
  /** Principal point: the viewport's centre in canvas px (the parallax of the fall), or the canvas centre when motion is reduced. */
  vp() {
    if (RM) return [this.W / 2, this.H * 0.5]
    const r = this.canvas.getBoundingClientRect()
    return [innerWidth / 2 - r.left, innerHeight / 2 - r.top]
  }
  async indit() {
    if (this.kesz || this.hiba) return
    if (ELO.size >= 2) { const t = [...ELO].sort((a, b) => b.tavol() - a.tavol())[0]; t.felad() } // the farthest context is released
    const gl = kontextus(this.canvas, !PROBA)
    if (!gl) { this.hiba = 'no context'; return }
    this.gl = gl
    this.meret()
    try {
      const [c, p] = await Promise.all([programAsync(gl, CELLA_VS, CELLA_FS), programAsync(gl, POLI_VS, POLI_FS)])
      this.pCella = c.prog; this.pPoli = p.prog
      naplo.fordit = Math.max(c.ms, p.ms); naplo.parhuzamos = c.parhuzamos
    } catch (e) { this.hiba = String(e); naplo.megjegyzesek.push(`${this.tipus}: ${e}`); return }
    this.u = uniformok(gl, this.pCella, ['u_val', 'u_grid', 'u_vp', 'u_size', 'u_d', 'u_geo', 'u_row', 'u_mix', 'u_anim', 'u_pen', 'u_hot', 'u_papir', 'u_screen'])
    this.up = uniformok(gl, this.pPoli, ['u_size'])
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao)
    this.vaoPoli = gl.createVertexArray(); gl.bindVertexArray(this.vaoPoli)
    this.poliBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.poliBuf)
    const a = gl.getAttribLocation(this.pPoli, 'a_pos'), b = gl.getAttribLocation(this.pPoli, 'a_col')
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 20, 0)
    gl.enableVertexAttribArray(b); gl.vertexAttribPointer(b, 3, gl.FLOAT, false, 20, 8)
    gl.bindVertexArray(null)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    this.kesz = true; ELO.add(this)
    this.adatFel()
    this.piszkos = true; kerRajz()
  }
  felad() {
    if (!this.gl) return
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.gl = null; this.kesz = false; ELO.delete(this)
    naplo.megjegyzesek.push(`${this.tipus}: context released (farthest)`)
    setTimeout(() => { this.hiba = null }, 0)
  }
  tavol() { const r = this.el.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - innerHeight / 2) }
}

// --- the shared draw for a station: cells + (optionally) the depth line and the probe outline ---------------------------------------
function rajzCella(a, g) {
  const gl = a.gl, u = a.u
  gl.viewport(0, 0, a.canvas.width, a.canvas.height)
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
  if (!a.db) return
  gl.useProgram(a.pCella)
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform1i(u.u_val, 0)
  const vp = a.vp()
  gl.uniform2f(u.u_grid, g.cols, g.rows); gl.uniform2f(u.u_vp, vp[0], vp[1]); gl.uniform2f(u.u_size, a.W, a.H)
  gl.uniform1f(u.u_d, fokusz(a.H))
  gl.uniform4f(u.u_geo, g.x0, g.pitch, g.oldal, g.amp)
  gl.uniform4f(u.u_row, g.yLip, g.dy, g.dz, g.tick ?? -1)
  gl.uniform4f(u.u_mix, g.kor ?? 0, g.hot ?? 0, g.lepes ?? 1, g.utolso ?? 0)
  gl.uniform4f(u.u_anim, g.t ?? -1, g.stagger ?? g.dim ?? 0, g.utazas ?? 1, g.z0 ?? 0)
  gl.uniform3fv(u.u_pen, SZIN.pen); gl.uniform3fv(u.u_hot, SZIN.hot); gl.uniform3fv(u.u_papir, SZIN.papir)
  gl.uniform1f(u.u_screen, g.kep ? 1 : 0)
  gl.bindVertexArray(a.vao)
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, a.db)
  gl.bindVertexArray(null)
}
/** Triangles (x, y, r, g, b per vertex, screen px) for the depth line and the probe outline. */
function poliRajz(a, tri) {
  if (!tri.length) return
  const gl = a.gl
  gl.useProgram(a.pPoli); gl.uniform2f(a.up.u_size, a.W, a.H)
  gl.bindVertexArray(a.vaoPoli); gl.bindBuffer(gl.ARRAY_BUFFER, a.poliBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tri), gl.DYNAMIC_DRAW)
  gl.drawArrays(gl.TRIANGLES, 0, tri.length / 5)
  gl.bindVertexArray(null)
}
function vonal(tri, pts, szeles, col) { // pts: [{x, y, w}] -> a ribbon of quads
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1]
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1
    const nx = (-dy / l) * 0.5, ny = (dx / l) * 0.5
    const v = (x, y) => [x, y, ...col]
    const A = v(p.x + nx * p.w * szeles, p.y + ny * p.w * szeles), B = v(p.x - nx * p.w * szeles, p.y - ny * p.w * szeles)
    const C = v(q.x + nx * q.w * szeles, q.y + ny * q.w * szeles), D = v(q.x - nx * q.w * szeles, q.y - ny * q.w * szeles)
    tri.push(...A, ...B, ...C, ...B, ...D, ...C)
  }
}
function keretRajz(tri, x, y, fel, vast, col) { // an outline 3 px outside the square, vast px thick
  const k = fel + 3 + vast / 2
  const el = [[x - k, y - k], [x + k, y - k], [x + k, y + k], [x - k, y + k], [x - k, y - k]]
  vonal(tri, el.map(([px, py]) => ({ x: px, y: py, w: 1 })), vast, col)
}

// --- station: the screen (HONLAP capture assembling from samples) ------------------------------------------------------------------
const KEPERNYO = { lepes: 2, t0: 0, fut: false, vegIdo: 0 }
function kepGeo(a) {
  const lepes = HOM_LEPESEK[KEPERNYO.lepes]
  const cols = lepes.c || 36
  const rács = KEP.rácsok.get(cols)
  const pitch = a.W / cols
  const dy = a.H / rács.rows
  return { cols, rows: rács.rows, pitch, x0: pitch / 2, oldal: korl(V.oldal * pitch, 3, 24), amp: 0, yLip: dy / 2, dy, dz: 0, kep: true, rács }
}
function kepAdatFel(a) {
  const gl = a.gl
  const g = kepGeo(a)
  if (a.tex) gl.deleteTexture(a.tex)
  a.tex = texRGBA8(gl, g.cols, g.rows, g.rács.szin)
  if (a.inst) gl.deleteBuffer(a.inst.buf)
  a.inst = peldanyPuffer(gl, g.cols, g.rows)
  a.db = a.inst.db
  gl.bindVertexArray(a.vao); gl.bindBuffer(gl.ARRAY_BUFFER, a.inst.buf)
  const loc = gl.getAttribLocation(a.pCella, 'a_cell')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 1)
  gl.bindVertexArray(null)
  a.felTegla = `${g.cols}`
}
function kepRajz(a, now) {
  const lepes = HOM_LEPESEK[KEPERNYO.lepes]
  const img = $('img', a.el)
  if (!lepes.c) { // "Teljes": the DOM picture is the screen again
    const gl = a.gl; gl.viewport(0, 0, a.canvas.width, a.canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    img.style.opacity = '1'; return false
  }
  img.style.opacity = '0'
  const g = kepGeo(a)
  if (a.felTegla !== `${g.cols}`) kepAdatFel(a)
  const stagger = (240 / Math.max(1, g.rows - 1)) // a step takes at most 480 ms: 240 ms travel plus the stagger over all rows
  g.t = KEPERNYO.fut ? now - KEPERNYO.t0 : -1
  g.stagger = stagger; g.utazas = 240; g.z0 = -240
  rajzCella(a, g)
  const vegeIdo = 240 + stagger * (g.rows - 1)
  const megy = KEPERNYO.fut && g.t < vegeIdo
  if (KEPERNYO.fut && !megy) KEPERNYO.fut = false
  return megy
}

// --- station: the fall (Mintatér) and the years -----------------------------------------------------------------------------------
const MEZO = {
  par: 'gepadat', hom: 2, ert: 2, fut: !RM, tick: GEP.elozmeny - 1, hot: 0, hotT0: 0, szonda: null, talalt: new Set(),
  evek: { szonda: null },
}
/** Evenly decimated rows (the phone shows at most 30; a source is thinned, never averaged). */
function sorokRitkit(src, cols, rows, ki) {
  if (ki >= rows) return src
  const f = new Float32Array(cols * ki)
  for (let r = 0; r < ki; r++) { const s = Math.floor((r * rows) / ki); f.set(src.subarray(s * cols, (s + 1) * cols), r * cols) }
  return f
}
const MEMO = new Map()
const memo = (kulcs, fn) => { if (!MEMO.has(kulcs)) MEMO.set(kulcs, fn()); return MEMO.get(kulcs) }
/** The fall's field for the chosen pair and step: columns, rows, value function, texture data. */
function mezoKonfig(par, W, H) {
  const telefon = W < 727
  const mx = telefon ? 14 : 36
  const amp = telefon ? 40 : 56
  let cols, rows, ertek, tex, tick = -1, lepes = 1
  if (par === 'honlap') {
    const c = Math.min([12, 36, 72][MEZO.hom], telefon ? 36 : 72)
    const r = KEP.rácsok.get(c)
    cols = r.cols; rows = telefon ? Math.min(30, r.rows) : r.rows
    const f = memo(`h${c}|${rows}`, () => sorokRitkit(r.lum, cols, r.rows, rows))
    ertek = (c2, r2) => f[r2 * cols + c2]
    tex = { f32: f, w: cols, h: rows }
  } else if (par === 'gepkonyv') {
    const q = ADAT.qr.modulok
    cols = rows = q.length
    const f = memo('q', () => { const x = new Float32Array(cols * rows); for (let r2 = 0; r2 < rows; r2++) for (let c2 = 0; c2 < cols; c2++) x[r2 * cols + c2] = q[r2][c2] === '1' ? 1 : 0; return x })
    ertek = (c2, r2) => f[r2 * cols + c2]
    tex = { f32: f, w: cols, h: rows }
  } else {
    const l = ERT_LEPESEK[MEZO.ert].l
    lepes = telefon ? 2 : 1 // phone: every second slot (decimation, never an average)
    cols = telefon ? 30 : 60; rows = telefon ? 30 : 40
    const f = memo(`g${l}`, () => Float32Array.from(GEP.ertekek, (v) => (kvant(v, l) - GEP_MIN) / (GEP_MAX - GEP_MIN)))
    tex = { f32: f, w: f.length, h: 1 }
    tick = MEZO.tick
    ertek = (c2, r2) => { const i = tick - r2 - (cols - 1 - c2) * lepes; return i < 0 || i > tick ? undefined : f[i] }
  }
  const bin = par === 'gepkonyv' // a binary source: no lift, the light modules are dim, the dark ones read as the code in perspective
  const amp2 = bin ? 0 : amp
  // the QR keeps near-square cells (about as wide as one row is deep on screen), centred, so that the code reads as a code
  const pitch = Math.min((W - 2 * mx) / cols, bin ? 18 : Infinity)
  const oldal = korl(V.oldal * pitch, 4, 24)
  const yLip = H * 0.18 + amp2
  const yVeg = H * 0.8 // the far row's page position
  const cosFi = Math.cos((V.fi * Math.PI) / 180)
  const hossz = (yVeg - yLip) / cosFi
  const sik = esesSik(V.fi, hossz / Math.max(1, rows - 1))
  return { cols, rows, pitch, x0: (W - pitch * cols) / 2 + pitch / 2, oldal, amp: amp2, yLip, dy: sik.dy, dz: sik.dz, tick, lepes, utolso: tick, kor: V.kor, dim: bin ? 0.8 : 0, ertek, tex, hot: 0 }
}
function mezoAdatFel(a) {
  const gl = a.gl
  const g = a.g = mezoKonfig(MEZO.par, a.W, a.H)
  if (a.tex) gl.deleteTexture(a.tex)
  a.tex = texR32F(gl, g.tex.w, g.tex.h, g.tex.f32)
  if (a.inst) gl.deleteBuffer(a.inst.buf)
  a.inst = peldanyPuffer(gl, g.cols, g.rows)
  a.db = a.inst.db
  gl.bindVertexArray(a.vao); gl.bindBuffer(gl.ARRAY_BUFFER, a.inst.buf)
  const loc = gl.getAttribLocation(a.pCella, 'a_cell')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 1)
  gl.bindVertexArray(null)
  a.kulcs = `${MEZO.par}|${MEZO.hom}|${MEZO.ert}|${a.W}|${a.H}|${V.fi}|${V.oldal}`
}
function mezoRajz(a, now) {
  const kulcs = `${MEZO.par}|${MEZO.hom}|${MEZO.ert}|${a.W}|${a.H}|${V.fi}|${V.oldal}`
  if (a.kulcs !== kulcs) mezoAdatFel(a)
  const g = a.g = mezoKonfig(MEZO.par, a.W, a.H) // cheap (memoised arrays): refreshes the tick and the hot head, never the texture
  const hotEltelt = now - MEZO.hotT0
  g.hot = MEZO.fut && hotEltelt < 700 ? 1 - hotEltelt / 700 : 0
  rajzCella(a, g)
  // depth line and probe outline
  const tri = []
  const s = MEZO.szonda
  if (s && s.par === MEZO.par) {
    const vp = a.vp(), d = fokusz(a.H)
    const pts = []
    for (let r = 0; r < g.rows; r++) {
      const v = g.ertek(s.col, r)
      if (v === undefined) break
      const c = vetitCella({ ...g, oldal: g.oldal }, s.col, r, v, vp, d)
      pts.push({ x: c.x, y: c.y, w: c.s })
    }
    vonal(tri, pts, 2.5, SZIN.pen)
    const v0 = g.ertek(s.col, s.row)
    if (v0 !== undefined) { const c = vetitCella(g, s.col, s.row, v0, vp, d); keretRajz(tri, c.x, c.y, c.fel, 1.5, SZIN.kezel) }
  }
  poliRajz(a, tri)
  return hotEltelt < 700 && MEZO.fut && MEZO.par === 'gepadat'
}
/** The cell under a canvas point: the nearest row that contains it (nearer cells cover farther ones). */
function melyik(a, x, y) {
  const g = a.g; if (!g) return null
  const vp = a.vp(), d = fokusz(a.H)
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const v = g.ertek(c, r); if (v === undefined) continue
      const p = vetitCella(g, c, r, v, vp, d)
      const t = Math.max(p.fel, 5)
      if (Math.abs(p.x - x) <= t && Math.abs(p.y - y) <= t) return { col: c, row: r }
    }
  }
  return null
}

// --- station: the years ("Évek"): columns = years, rows = entries newest-started first, depth = when it began --------------------------
const EVEK = ADAT.evek.idovonal
const EV_MIN = Math.min(...EVEK.map((i) => i.kezdet))
const EV_MAX = Math.max(...EVEK.map((i) => i.kezdet), ...EVEK.map((i) => i.veg ?? 0))
function evekKonfig(W, H) {
  const cols = EV_MAX - EV_MIN + 1, rows = EVEK.length
  const rendezett = [...EVEK].sort((p, q) => q.kezdet - p.kezdet)
  const ertek = (c, r) => { const e = rendezett[r], ev = EV_MIN + c; return ev >= e.kezdet && ev <= (e.veg ?? EV_MAX) ? 1 : undefined }
  const f = new Float32Array(cols * rows).fill(-1)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (ertek(c, r) !== undefined) f[r * cols + c] = 1
  const pitch = Math.min(64, (W - 40) / cols), amp = 36
  const yLip = H * 0.2 + amp, yVeg = H * 0.82
  const sik = esesSik(V.fi, ((yVeg - yLip) / Math.cos((V.fi * Math.PI) / 180)) / (rows - 1))
  return { cols, rows, pitch, x0: 28 + pitch / 2, oldal: korl(V.oldal * pitch, 4, 24), amp, yLip, dy: sik.dy, dz: sik.dz, tick: -1, lepes: 1, utolso: 0, kor: V.kor, ertek, tex: { f32: f, w: cols, h: rows }, rendezett }
}
function evekAdatFel(a) {
  const gl = a.gl
  const g = a.g = evekKonfig(a.W, a.H)
  if (a.tex) gl.deleteTexture(a.tex)
  a.tex = texR32F(gl, g.tex.w, g.tex.h, g.tex.f32)
  a.inst = peldanyPuffer(gl, g.cols, g.rows); a.db = a.inst.db
  gl.bindVertexArray(a.vao); gl.bindBuffer(gl.ARRAY_BUFFER, a.inst.buf)
  const loc = gl.getAttribLocation(a.pCella, 'a_cell')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 1)
  gl.bindVertexArray(null)
  a.kulcs = `${a.W}|${a.H}|${V.fi}|${V.oldal}`
  // DOM year labels on the page plane above the front row: z = 0, so they sit exactly where the GL squares do (the plan's alignment rule)
  const lista = $('.ev-cimkek', a.el.parentElement) ?? Object.assign(document.createElement('ol'), { className: 'ev-cimkek' })
  lista.setAttribute('aria-hidden', 'true')
  if (!lista.isConnected) a.el.parentElement.append(lista)
  lista.replaceChildren(...Array.from({ length: g.cols }, (_, c) => {
    const li = document.createElement('li'); li.textContent = String(EV_MIN + c)
    li.style.left = `${g.x0 + c * g.pitch}px`; li.style.top = `${g.yLip - g.amp - 30}px`
    return li
  }))
}
function evekRajz(a) {
  if (a.kulcs !== `${a.W}|${a.H}|${V.fi}|${V.oldal}`) evekAdatFel(a)
  const g = a.g = evekKonfig(a.W, a.H)
  rajzCella(a, g)
  const tri = [], s = EVEK_SZONDA.cella
  if (s) {
    const vp = a.vp(), d = fokusz(a.H)
    const pts = []
    for (let r = 0; r < g.rows; r++) { if (g.ertek(s.col, r) === undefined) continue; const c = vetitCella(g, s.col, r, 1, vp, d); pts.push({ x: c.x, y: c.y, w: c.s }) }
    vonal(tri, pts, 2.5, SZIN.pen)
    const c = vetitCella(g, s.col, s.row, 1, vp, d); keretRajz(tri, c.x, c.y, c.fel, 1.5, SZIN.kezel)
  }
  poliRajz(a, tri)
  return false
}
const EVEK_SZONDA = { cella: null }

// ------------------------------------------------------------------------------------------------------------------------------------
// frame loop: draws only what changed (scroll, resize, probe, a running sequence); nothing runs in a hidden tab or off screen
const allomasok = []
const mertek = []
function keret(now) {
  rajzKer = 0
  let tovabb = false
  for (const a of allomasok) {
    if (!a.kesz || !a.lathato || document.hidden) continue
    if (a.meret()) { if (a.tipus === 'kep' || a.tipus === 'mezo') a.kulcs = null }
    const vp = a.vp().join()
    if (!a.piszkos && vp === a.vpElozo) continue
    a.vpElozo = vp; a.piszkos = false
    const t0 = performance.now()
    let megy = false
    if (a.tipus === 'kep') megy = kepRajz(a, now)
    else if (a.tipus === 'mezo') megy = mezoRajz(a, now)
    else megy = evekRajz(a, now)
    naplo.kepkockak++
    if (megy) { a.piszkos = true; tovabb = true }
    // the gate's frame-time sample: the first 60 frames of an animated sequence (the plan: median under 20 ms, else still mode)
    if (megy && mertek.length < 60) { if (a.elozoKeret) mertek.push(now - a.elozoKeret); a.elozoKeret = now } else a.elozoKeret = 0
    naplo.rajzMs = performance.now() - t0
  }
  if (mertek.length >= 30 && naplo.median === null) {
    const r = [...mertek].sort((x, y) => x - y)
    naplo.median = r[Math.floor(r.length / 2)]
    naplo.mertekN = r.length
    allapotKiir()
    if (naplo.median > 20 && !PROBA) allo()
  }
  if (tovabb) kerRajz()
}
function allo() { // still mode: final states only
  naplo.szint = 'allo'; MEZO.fut = false; KEPERNYO.fut = false; futGomb(); allapotKiir()
}
const piszkosMind = () => { for (const a of allomasok) a.piszkos = true; kerRajz() }

// ------------------------------------------------------------------------------------------------------------------------------------
// DOM wiring
function allapotKiir() {
  const o = $('#allapot'); if (!o) return
  const mc = naplo.median === null ? 'n/a' : `${fmt(naplo.median)} ms (n=${naplo.mertekN})`
  o.textContent = naplo.kapu !== 'ok' ? `GL ki: ${naplo.kapu}` : `GPU: ${naplo.renderer} · fordítás ${naplo.fordit === null ? '…' : fmt(naplo.fordit, 0) + ' ms'}${naplo.parhuzamos ? ' (párhuzamos)' : ''} · képkocka ${mc} · ${naplo.szint}${RM ? ' · csökkentett mozgás' : ''}`
  document.documentElement.dataset.mt = naplo.kapu === 'ok' ? naplo.szint : 'ki'
}

function radio(csoport, ertekek, kezdo, valt) {
  const gombok = $$('[role=radio]', csoport)
  const be = (i) => { gombok.forEach((g, j) => { g.setAttribute('aria-checked', String(i === j)); g.tabIndex = i === j ? 0 : -1 }) }
  gombok.forEach((g, i) => {
    g.addEventListener('click', () => { be(i); valt(i) })
    g.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
      if (!k) return
      e.preventDefault(); const j = (i + k + gombok.length) % gombok.length
      be(j); gombok[j].focus(); valt(j)
    })
  })
  be(kezdo)
  return be
}

function futGomb() {
  const g = $('#fut'); if (!g) return
  const gep = MEZO.par === 'gepadat'
  g.hidden = !gep
  g.disabled = RM || naplo.szint === 'allo'
  g.setAttribute('aria-pressed', String(MEZO.fut))
  g.textContent = RM ? 'Egyszeri felvétel' : MEZO.fut ? 'Fut' : 'Áll'
}

let olvasatIdo = 0
function olvasat(szoveg) {
  const o = $('#olvasat'); if (!o) return
  clearTimeout(olvasatIdo); olvasatIdo = setTimeout(() => { o.textContent = szoveg }, 250) // role=status, debounced 250 ms
}
function szondaSzoveg(par, c, r, g) {
  if (par === 'honlap') { const ln = g.ertek(c, r); return `${r + 1}. sor, ${c + 1}. minta: ${fmt(ln * 100, 0)} %` }
  if (par === 'gepkonyv') return `${r + 1}. sor, ${c + 1}. modul: ${g.ertek(c, r) ? 'sötét' : 'világos'}`
  const i = g.tick - r - (g.cols - 1 - c) * g.lepes
  const l = ERT_LEPESEK[MEZO.ert].l
  return `${perc(i)} · ${fmt(kvant(GEP.ertekek[i], l), l < 1 ? 1 : 0)} °C`
}

function talaltJelol(par) {
  if (MEZO.talalt.has(par)) return
  MEZO.talalt.add(par)
  $(`[data-par=${par}] .talalt`)?.setAttribute('data-van', '1')
  jutalom()
}
function jutalom() {
  const j = $('#jutalom'); if (!j) return
  const par = MEZO.par
  const m = ADAT.munkak[par]
  if (!MEZO.talalt.has(par)) { j.hidden = true; j.replaceChildren(); return } // nothing exists before the first probe of this pair
  j.hidden = false
  const kapcs = (felirat, href, kulso) => { const a = document.createElement('a'); a.textContent = felirat; a.href = href.startsWith('/') ? ALAP + href : href; a.className = 'pill' + (kulso ? ' kulso' : ''); if (kulso) { a.target = '_blank'; a.rel = 'noopener' } return a }
  const elemek = [kapcs(m.felirat, m.href, m.kulso)]
  if (par === 'gepkonyv') {
    const n = ADAT.qr.modulok.length, q = ADAT.qr.modulok
    const svg = `<svg class="qr" role="img" aria-label="A gépkönyv QR-kódja" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" class="qr-h"/>${q.map((s, r) => [...s].map((b, c) => b === '1' ? `<rect x="${c}" y="${r}" width="1" height="1" class="qr-s"/>` : '').join('')).join('')}</svg>`
    const d = document.createElement('div'); d.className = 'qr-doboz'; d.innerHTML = svg
    const p = document.createElement('p'); p.textContent = 'Olvassa be a kódot telefonnal: megnyílik a gép kézikönyve.' // plan string [copy: owner]
    d.append(p); elemek.unshift(d)
  }
  if (par === 'gepadat' && MEZO.vege) { const p = document.createElement('p'); p.textContent = GEP.muszakValtas; elemek.unshift(p) } // the demo's own shift sentence
  const ker = kapcs('Erről kérdezek', `mailto:${ADAT.kapcsolat.email}?subject=${encodeURIComponent(m.nev)}`, false)
  ker.className = 'szoveglink'; elemek.push(ker)
  j.replaceChildren(...elemek)
}

function mezoLeiras() {
  const l = { honlap: 'Az élő oldal képe soronként, világosság szerint.', gepkonyv: 'A gépen lévő QR-kód 29 sora.', gepadat: 'A CNC-1 orsóhőmérséklete percenként, az elmúlt 40 percben.' }[MEZO.par]
  $('#mezo-leiras').textContent = l
}

let futIdo = 0
function ujTick() {
  clearTimeout(futIdo)
  if (!MEZO.fut || MEZO.par !== 'gepadat' || document.hidden || naplo.szint === 'allo') return
  futIdo = setTimeout(() => {
    if (!MEZO.fut) return
    const a = allomasok.find((x) => x.tipus === 'mezo')
    if (a?.kesz && a.lathato) {
      if (MEZO.tick + 1 > GEP_UTOLSO) { MEZO.fut = false; MEZO.vege = true; futGomb(); jutalom(); piszkosMind(); return }
      MEZO.tick++; MEZO.hotT0 = performance.now(); a.piszkos = true; kerRajz()
      if (MEZO.szonda && MEZO.szonda.par === 'gepadat') MEZO.szonda.col = Math.min(MEZO.szonda.col, 59)
    }
    ujTick()
  }, 1000) // one demo minute per second, as the demo says
}

function szondaBe(a, p) {
  if (!p) return
  MEZO.szonda = { par: MEZO.par, col: p.col, row: p.row }
  olvasat(szondaSzoveg(MEZO.par, p.col, p.row, a.g))
  talaltJelol(MEZO.par)
  a.piszkos = true; kerRajz()
}

function inditKorlat(a) {
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      a.lathato = e.isIntersecting; if (e.isIntersecting) { a.piszkos = true; kerRajz() }
    }
  }, { rootMargin: '0px' })
  io.observe(a.el)
  const kozel = new IntersectionObserver((es) => {
    for (const e of es) {
      a.kozel = e.isIntersecting
      if (e.isIntersecting) a.indit().then(() => kerRajz())
      else if (a.gl && a.tavol() > innerHeight * 2) a.felad()
    }
  }, { rootMargin: '600px 0px' })
  kozel.observe(a.el)
}

function inditKep(a) {
  const img = $('img', a.el)
  const csoport = $('#kep-kulcsok')
  const nev = (i) => HOM_LEPESEK[i].felirat
  $$('[role=radio]', csoport).forEach((g, i) => { g.textContent = nev(i) })
  const be = radio(csoport, HOM_LEPESEK, KEPERNYO.lepes, (i) => {
    KEPERNYO.lepes = i; a.felTegla = null
    if (RM) { a.piszkos = true; kerRajz(); return }
    KEPERNYO.t0 = performance.now(); KEPERNYO.fut = true; a.piszkos = true; kerRajz()
  })
  void be
  // the arrival: once, when the screen first comes into view: 12 -> 36 -> picture (at once under reduced motion)
  let jatszott = false
  const io = new IntersectionObserver((es) => {
    if (jatszott || !es.some((e) => e.isIntersecting && e.intersectionRatio > 0.4)) return
    jatszott = true
    if (RM || naplo.szint === 'allo') return
    const lepesek = [0, 1, 2]
    const lejatszik = (n) => {
      if (n >= lepesek.length) return
      KEPERNYO.lepes = lepesek[n]; a.felTegla = null
      $$('[role=radio]', csoport).forEach((g, j) => { g.setAttribute('aria-checked', String(j === lepesek[n])); g.tabIndex = j === lepesek[n] ? 0 : -1 })
      KEPERNYO.t0 = performance.now(); KEPERNYO.fut = true; a.piszkos = true; kerRajz()
      setTimeout(() => lejatszik(n + 1), n === 0 ? 700 : 600)
    }
    a.indit().then(() => lejatszik(0))
  }, { threshold: [0.4] })
  io.observe(a.el)
  img.style.opacity = '1'
  a.adatFel = () => kepAdatFel(a)
}

function inditMezo(a) {
  a.adatFel = () => mezoAdatFel(a)
  const wrap = $('#mezo-doboz')
  const csoport = $('#par-kulcsok')
  const valt = (i) => {
    MEZO.par = ['honlap', 'gepkonyv', 'gepadat'][i]; MEZO.szonda = null; $('#olvasat').textContent = ''
    a.kulcs = null; mezoLeiras(); futGomb(); jutalom(); lepesKulcs(); ujTick(); a.piszkos = true; kerRajz()
  }
  const be = radio(csoport, [1, 2, 3], 2, valt)
  void be
  // Mintavétel of the fall (HONLAP grid or GÉPADAT value step)
  const lk = $('#mezo-lepesek')
  const lepesKulcs = () => {
    const par = MEZO.par
    const lista = par === 'honlap' ? ['12 × 14', '36 × 43', '72 × 86'] : par === 'gepadat' ? ERT_LEPESEK.map((x) => x.felirat) : null
    lk.hidden = !lista
    if (!lista) return
    $$('[role=radio]', lk).forEach((g, i) => { g.textContent = lista[i] })
    const idx = par === 'honlap' ? MEZO.hom : MEZO.ert
    $$('[role=radio]', lk).forEach((g, j) => { g.setAttribute('aria-checked', String(j === idx)); g.tabIndex = j === idx ? 0 : -1 })
  }
  radio(lk, [0, 1, 2], 2, (i) => { if (MEZO.par === 'honlap') MEZO.hom = i; else MEZO.ert = i; a.kulcs = null; MEZO.szonda = null; a.piszkos = true; kerRajz() })
  lepesKulcs(); mezoLeiras(); futGomb()
  $('#fut').addEventListener('click', () => {
    if (MEZO.vege) { MEZO.tick = GEP.elozmeny - 1; MEZO.vege = false; MEZO.fut = true; jutalom() } // "Fut" restarts from 7:00
    else MEZO.fut = !MEZO.fut
    futGomb(); ujTick(); a.piszkos = true; kerRajz()
  })
  // probe: pointer, tap, keys
  const pos = (e) => { const r = a.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  wrap.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; szondaBe(a, melyik(a, ...pos(e))) })
  wrap.addEventListener('pointerdown', (e) => szondaBe(a, melyik(a, ...pos(e))))
  wrap.addEventListener('keydown', (e) => {
    const g = a.g; if (!g) return
    let s = MEZO.szonda && MEZO.szonda.par === MEZO.par ? { ...MEZO.szonda } : { col: g.cols - 1, row: 0 } // default: the newest slot of the front row
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
    if (k) { s.col = korl(s.col + k[0], 0, g.cols - 1); s.row = korl(s.row + k[1], 0, g.rows - 1) }
    else if (e.key === 'Home') s.col = 0
    else if (e.key === 'End') s.col = g.cols - 1
    else if (e.key === 'Escape') { s = { col: g.cols - 1, row: 0 } }
    else return
    e.preventDefault()
    if (g.ertek(s.col, s.row) === undefined) return
    szondaBe(a, s)
  })
  document.addEventListener('visibilitychange', ujTick)
  ujTick()
}

function inditEvek(a) {
  a.adatFel = () => evekAdatFel(a)
  const wrap = $('#evek-doboz')
  const pos = (e) => { const r = a.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const keres = (x, y) => {
    const g = a.g; if (!g) return null
    const vp = a.vp(), d = fokusz(a.H)
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      if (g.ertek(c, r) === undefined) continue
      const p = vetitCella(g, c, r, 1, vp, d); const t = Math.max(p.fel, 5)
      if (Math.abs(p.x - x) <= t && Math.abs(p.y - y) <= t) return { col: c, row: r }
    }
    return null
  }
  const be = (p) => {
    if (!p) return
    EVEK_SZONDA.cella = p
    const e = a.g.rendezett[p.row]
    $('#evek-olvasat').textContent = `${EV_MIN + p.col}: ${e.terulet} (${e.kezdet}–${e.veg ?? ''})`
    a.piszkos = true; kerRajz()
  }
  wrap.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') be(keres(...pos(e))) })
  wrap.addEventListener('pointerdown', (e) => be(keres(...pos(e))))
  wrap.addEventListener('keydown', (e) => {
    const g = a.g; if (!g) return
    const s = EVEK_SZONDA.cella ? { ...EVEK_SZONDA.cella } : { col: g.cols - 1, row: 0 }
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
    if (!k) return
    e.preventDefault()
    for (let n = 0; n < 8; n++) { // step to the next existing cell in that direction
      s.col = korl(s.col + k[0], 0, g.cols - 1); s.row = korl(s.row + k[1], 0, g.rows - 1)
      if (g.ertek(s.col, s.row) !== undefined) { be(s); break }
    }
  })
}

// ------------------------------------------------------------------------------------------------------------------------------------
// route: progress along the red line (native scroll; CSS scroll-driven animation where available, an observer otherwise)
function ut() {
  const pontok = $$('.ut a')
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) pontok.forEach((p) => p.toggleAttribute('aria-current', p.getAttribute('href') === `#${e.target.id}`))
  }, { rootMargin: '-45% 0px -45% 0px' })
  $$('main > section').forEach((s) => io.observe(s))
}

function tema() {
  const g = $('#tema')
  g.addEventListener('click', () => {
    const sotet = document.documentElement.dataset.tema === 'sotet' || (!document.documentElement.dataset.tema && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.tema = sotet ? 'vilagos' : 'sotet'
    g.setAttribute('aria-pressed', String(!sotet))
    if (SZIN) { SZIN = szinek(); piszkosMind() }
  })
  g.setAttribute('aria-pressed', String(matchMedia('(prefers-color-scheme: dark)').matches))
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (SZIN && !document.documentElement.dataset.tema) { SZIN = szinek(); piszkosMind() } })
}

function valtozatok() {
  const f = $('#valtozatok')
  if (!f) return
  $$('[data-v]', f).forEach((el) => {
    el.addEventListener('change', () => {
      const k = el.dataset.v, v = +el.value
      if (k === 'fi') V.fi = v; else if (k === 'kor') V.kor = v / 100; else if (k === 'oldal') V.oldal = v === 75 ? 0.75 : 2 / 3
      for (const a of allomasok) { a.kulcs = null; a.felTegla = null }
      piszkosMind()
    })
  })
}

// ------------------------------------------------------------------------------------------------------------------------------------
async function main() {
  onTeszt()
  tema(); ut(); valtozatok()
  $('#level').href = ADAT.kapcsolat.href
  $('#cim').textContent = ADAT.kapcsolat.email // shown as text too: a mailto: link may do nothing in some viewers
  $('#evek-lista').replaceChildren(...EVEK.map((i) => { const li = document.createElement('li'); li.textContent = `${i.kezdet}–${i.veg ?? ''}  ${i.terulet}`; return li }))
  const kapcsolo = $('#mt-kulcs')
  kapcsolo.setAttribute('aria-pressed', String(tarol('mt-ki') !== '1'))
  kapcsolo.addEventListener('click', () => { tarol('mt-ki', tarol('mt-ki') === '1' ? null : '1'); location.reload() })
  const ok = kapu()
  naplo.kapu = ok ?? 'ok'
  if (ok) {
    document.documentElement.classList.add('mt-ki')
    allapotKiir()
    return
  }
  naplo.szint = TELEFON() ? 'telefon' : 'teljes'
  document.documentElement.classList.add('mt-var')
  SZIN = szinek()
  try { await kepBetoltes($('#kep-img')) } catch (e) { naplo.megjegyzesek.push(`kép: ${e}`); document.documentElement.classList.add('mt-ki'); naplo.kapu = 'a kép nem tölthető be'; allapotKiir(); return }
  const kepA = new Allomas($('#kep-allomas'), 'kep')
  const mezoA = new Allomas($('#mezo-allomas'), 'mezo')
  const evekA = new Allomas($('#evek-allomas'), 'evek')
  allomasok.push(kepA, mezoA, evekA)
  inditKep(kepA); inditMezo(mezoA); inditEvek(evekA)
  for (const a of allomasok) inditKorlat(a)
  addEventListener('scroll', () => { for (const a of allomasok) if (a.lathato) a.piszkos = true; kerRajz() }, { passive: true })
  addEventListener('resize', () => piszkosMind())
  document.fonts?.ready.then(() => piszkosMind())
  allapotKiir()
  window.__kaland.allomasok = allomasok
  window.__kaland.kiterjedes = () => kiterjedes(mezoA)
}

/** The plan's log "the fall's projected extents per scroll position": how much of the field leaves the canvas as the principal point moves. */
function kiterjedes(a) {
  const g = a.g ?? mezoKonfig(MEZO.par, a.W, a.H), d = fokusz(a.H)
  const ki = []
  for (const vpy of [-a.H, 0, a.H * 0.5, a.H, a.H * 2]) {
    let min = Infinity, max = -Infinity, kint = 0, n = 0
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const v = g.ertek(c, r); if (v === undefined) continue
      const p = vetitCella(g, c, r, v, [a.W / 2, vpy], d); n++
      min = Math.min(min, p.y); max = Math.max(max, p.y)
      if (p.y < 0 || p.y > a.H) kint++
    }
    ki.push({ vpY: Math.round(vpy), felsoY: Math.round(min), alsoY: Math.round(max), canvasH: a.H, kintCella: kint, ossz: n })
  }
  return ki
}

main().catch((e) => { naplo.megjegyzesek.push(String(e)); naplo.kapu = `hiba: ${e}`; document.documentElement.classList.add('mt-ki'); allapotKiir(); console.error(e) })
