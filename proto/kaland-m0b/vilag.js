// "Az út a Mintatérben", M0b: ONE cinematic scene in a full-viewport raw-WebGL2 world (prototype, outside the site build). Read the private plan kaland-v2.
// The shift's true temperature series (the demo's own run) becomes a ribbon of 60,000 particles; the visitor flies back along it (depth = time);
// at the end the same particles settle into the 1,920 block means of the real client page. The DOM keeps everything that is text or a control.
// Meaning is only data (height = the true value, picture = the true block means); atmosphere (spread, swirl, bloom, grain, vignette) is dressing.
import ADAT from '../kaland-m0/adat.js'
import { rendererNev, SZOFTVERES, programAsync, texR32F, texRGBA8, uniformok } from '../kaland-m0/gl.js'
import { PART_VS, PART_VS_L, PART_FS, LINE_FS, GRID_VS, GRID_FS, FULL_VS, BRIGHT_FS, BLUR_FS, COMP_FS, STREAK_FS, SHAFT_FS } from './arnyekolok.js'
import { Hang } from './hang.js'

const $ = (s) => document.querySelector(s)
const SVET = $('#svet')
const params = new URLSearchParams(location.search)
const PROBA = !!window.__kalandProba || params.has('szoftveres')
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
const TELEFON = innerWidth < 727
const ALAP = window.__kalandAlap ?? ''
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',').replace('-', '−')
const korl = (x, a, b) => Math.min(b, Math.max(a, x))
const sm = (a, b, x) => { const t = korl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const tarol = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)) } catch { return null } }

const FOV = (50 * Math.PI) / 180
const LZ = 60, ZP = -66, PICW = 10, COLS = 40, PPC = 12, AMPY = 4, KAMERA_ELOL = 6
const PADLO = -3.4, GX = 8   // the floor: height and half width
const NT = 6000              // points of the thread
const naplo = { nezet: '-', renderer: '-', kapu: '-', fordit: null, median: null, ort: null, p95: null, gpu: null, kap: false, rogzitve: false, ablak: 0, kepkockak: 0, szint: 'ki', skala: 1, p: 0, merj: null, megjegyzesek: [] }
const SKALA_MIN = 0.55   // the render scale never goes below this (the ladder: scale, then light tier, then DOM twin)
const GPU_MAX = 14       // ms of synchronous GPU cost per frame above which a slow frame interval is blamed on the GPU (below it: a capped frame rate, no step)
window.__vilag = naplo

// ---------------------------------------------------------------------------------------------------------------------------------
// M0b.4 looks: a look is only numbers (the data, the camera and the effects' code are the same in every one). All stay one hue (Q8); structure is neutral (the ink token).
// Light: sp strand spread, hz haze spread, ex data exposure, sz sprite size, fl/pw brightness floor and power (height -> brightness), hm hot-mix power, th thread gain,
// pe picture exposure, bl/blE bloom and its fall at the picture, vg vignette, xp overall exposure, sh light shafts, st lens streak, ap/bok depth-of-field aperture and cap,
// du dust gain, ln comets (hairline strands along the flow; len = fraction of the ribbon, tail = tail brightness).
// Layers (each has a key): gr floor grid with hour rungs + gr2 drop lines + mk markers on the true extremes; rf mirror on the floor; lb labels (1 hours and extremes, 2 also the value at each hour);
// gl backdrop glow; hl thread tube (halo gain). fx = which effect keys start on, ret = which layer keys start on.
const CAM0 = [-9, 3.6, 26, -1.9, 1.1, 11]   // camera offset x, y and look-ahead: at the wide opening, then in the flight
const KI = { dof: 0, fc: 0, csik: 0, por: 0, sok: 0 }, RKI = { gr: 0, rf: 0, lb: 0, gl: 0 }
const LOOKS = {
  elozo:   { nev: 'Előző', sp: 1, hz: 2.6, ex: 1, sz: 1, fl: 0.30, pw: 1, hm: 2, th: 1.6, pe: 1, bl: 0.85, blE: 0.7, vg: 0.65, xp: 1, sh: 0.4, st: 0.3, ap: 0.10, bok: 0.04, du: 0.03, ln: 0, len: 0, tail: 0.1,
             gr: 0, gr2: 0, mk: 0, rf: 0, lb: 0, gl: 0, hl: 0, cam: CAM0, fx: { dof: 1, fc: 1, csik: 1, por: 1, sok: 1 }, ret: { ...RKI } },
  muszer:  { nev: 'Mérőműszer', sp: 0.5, hz: 1.8, ex: 0.45, sz: 0.85, fl: 0.08, pw: 1.6, hm: 2.5, th: 2.4, pe: 0.75, bl: 0.55, blE: 0.85, vg: 0.7, xp: 1, sh: 0, st: 0, ap: 0.04, bok: 0.02, du: 0.02, ln: 0, len: 0, tail: 0.1,
             gr: 1, gr2: 1, mk: 1, rf: 0.25, lb: 2, gl: 0.6, hl: 0.5, cam: CAM0, fx: { ...KI, dof: 1, por: 1, sok: 1 }, ret: { gr: 1, rf: 1, lb: 1, gl: 1 } },
  szinpad: { nev: 'Színpad', sp: 0.8, hz: 2.0, ex: 0.4, sz: 1, fl: 0.10, pw: 1.4, hm: 2, th: 1.8, pe: 0.75, bl: 0.6, blE: 0.85, vg: 0.85, xp: 1, sh: 1.3, st: 0, ap: 0.07, bok: 0.03, du: 0.02, ln: 0, len: 0, tail: 0.1,
             gr: 0.7, gr2: 0.3, mk: 0.6, rf: 0.9, lb: 1, gl: 1, hl: 0.4, cam: [-5.5, 0.4, 34, -1.6, 0.2, 14], fx: { ...KI, dof: 1, fc: 1, por: 1, sok: 1 }, ret: { gr: 1, rf: 1, lb: 1, gl: 1 } },
  aramlas: { nev: 'Áramlás', sp: 0.7, hz: 2.0, ex: 0.22, sz: 1, fl: 0.15, pw: 1.4, hm: 2, th: 2.0, pe: 0.75, bl: 0.7, blE: 0.85, vg: 0.75, xp: 1, sh: 0, st: 0, ap: 0, bok: 0.02, du: 0.02, ln: 1, len: 0.012, tail: 0.04,
             gr: 0.5, gr2: 0, mk: 0.6, rf: 0.4, lb: 1, gl: 0.7, hl: 0.4, cam: [-3.5, 1.6, 20, -1.2, 0.6, 9], fx: { ...KI, por: 1, sok: 1 }, ret: { gr: 1, rf: 1, lb: 1, gl: 1 } },
}
const NEZET0 = window.__kalandNezet ?? params.get('nezet') ?? 'muszer'

// ---------------------------------------------------------------------------------------------------------------------------------
// data (all of it from adat.js, which epit.mjs derives from the repository's own files)
const SOR = Float32Array.from(ADAT.gepadat.ertekek)
const N = SOR.length
const MIN = Math.min(...SOR), MAX = Math.max(...SOR)
const perc = (i) => { const m = ADAT.gepadat.kezdetPerc + i; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
const vnAt = (u) => { // u = 0 newest, 1 oldest; the same interpolation as the shader
  const f = (1 - korl(u, 0, 1)) * (N - 1), i0 = Math.floor(f), fr = f - i0, i1 = Math.min(i0 + 1, N - 1)
  return (((1 - fr) * SOR[i0] + fr * SOR[i1]) - MIN) / (MAX - MIN)
}
const cx = (u) => 2.2 * Math.sin(u * 9) + 0.9 * Math.sin(u * 23 + 1.3)
const szalag = (u) => ({ x: cx(u), y: (vnAt(u) - 0.5) * AMPY })

const lin = (b) => { const c = b / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
function blokkok(adat, w, h, cols) {
  const rows = Math.round((cols * h) / w), cw = w / cols
  const szin = new Uint8Array(cols * rows * 4)
  const LUT = Float32Array.from({ length: 256 }, (_, i) => lin(i))
  const enc = (x) => Math.round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055))
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor(r * cw), y1 = r === rows - 1 ? h : Math.floor((r + 1) * cw)
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw), x1 = c === cols - 1 ? w : Math.floor((c + 1) * cw)
      let R = 0, G = 0, B = 0, n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; R += LUT[adat[i]]; G += LUT[adat[i + 1]]; B += LUT[adat[i + 2]]; n++ }
      szin.set([enc(R / n), enc(G / n), enc(B / n), 255], (r * cols + c) * 4)
    }
  }
  return { cols, rows, szin }
}
function kep() {
  const img = $('#kep')
  return new Promise((ok, hiba) => {
    const kesz = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const cx2 = c.getContext('2d', { willReadFrequently: true }); cx2.drawImage(img, 0, 0)
      ok(blokkok(cx2.getImageData(0, 0, w, h).data, w, h, COLS))
    }
    if (img.complete && img.naturalWidth) kesz(); else { img.addEventListener('load', kesz, { once: true }); img.addEventListener('error', hiba, { once: true }) }
  })
}

// colours: the Grafit tokens, read through a 1x1 canvas. The world is a night scene, so the dark token set is forced while it runs.
function szinek() {
  document.documentElement.setAttribute('data-tema', 'sotet')
  const px = document.createElement('canvas'); px.width = px.height = 1
  const c2 = px.getContext('2d', { willReadFrequently: true })
  const el = document.createElement('i'); el.style.display = 'none'; document.body.append(el)
  const ki = {}
  for (const [nev, tok] of [['pen', '--jel'], ['hot', '--jel-forro'], ['bg', '--papir'], ['ink', '--tinta-halk']]) {
    el.style.color = `var(${tok})`
    c2.clearRect(0, 0, 1, 1); c2.fillStyle = '#000'; c2.fillStyle = getComputedStyle(el).color; c2.fillRect(0, 0, 1, 1)
    const d = c2.getImageData(0, 0, 1, 1).data
    ki[nev] = [lin(d[0]), lin(d[1]), lin(d[2])]
  }
  el.remove()
  return ki
}

// ---------------------------------------------------------------------------------------------------------------------------------
// gate (plan 2.0): script, WebGL2 without the performance caveat, not a software renderer, no Save-Data, the key not off
function kapu() {
  if (tarol('vilag-ki') === '1') return 'a világ kulcs ki van kapcsolva'
  if (!window.WebGL2RenderingContext) return 'nincs WebGL2'
  if (navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches) return 'Save-Data'
  const c = document.createElement('canvas')
  let gl = null
  try { gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !PROBA }) } catch { gl = null }
  if (!gl) return 'a böngésző jelzi: nincs hardveres GPU (failIfMajorPerformanceCaveat)'
  naplo.renderer = rendererNev(gl)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  if (!PROBA && SZOFTVERES.test(naplo.renderer)) return `szoftveres renderer: ${naplo.renderer}`
  return null
}
function iker(ok) { // the DOM twin: the same page as plain text, always complete; hidden from sight only while the world runs
  $('#iker').classList.toggle('lathato', !ok)
  $('#vaszon').hidden = !ok; $('#hud').hidden = !ok
  document.documentElement.classList.toggle('vilag-ki', !ok)
}

// ---------------------------------------------------------------------------------------------------------------------------------
// small matrix helpers (column-major)
const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s } return o }
const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]) }
const nrm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l) }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
function nez(e, c) {
  const f = nrm([c[0] - e[0], c[1] - e[1], c[2] - e[2]]), s = nrm(cross(f, [0, 1, 0])), u = cross(s, f)
  return { m: new Float32Array([s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, e), -dot(u, e), dot(f, e), 1]), right: s, up: u }
}

// ---------------------------------------------------------------------------------------------------------------------------------
async function main() {
  const hiba = kapu()
  naplo.kapu = hiba ?? 'ok'
  $('#allapot').textContent = `GL: ${hiba ?? 'ellenőrizve'}`
  if (hiba) { iker(false); return }

  const SZIN = szinek()
  const vaszon = $('#vaszon')
  let gl = null
  try { gl = vaszon.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: !PROBA }) } catch { gl = null }
  if (!gl) { naplo.kapu = 'nincs kontextus'; iker(false); return }
  naplo.renderer = rendererNev(gl)
  const hdrExt = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')
  let hdr = !!hdrExt
  iker(true)

  let tier = TELEFON ? 'konnyu' : 'teljes'
  let db = tier === 'teljes' ? 60000 : 30000
  let dpr = Math.min(devicePixelRatio || 1, tier === 'teljes' ? 1.5 : 1)
  let skala = 1   // dynamic render scale (1 = full), lowered by the frame-time ladder
  // M0b.3 effects (atmosphere only; the data stays sharp). Each one is a key, so the owner decides which stay; all default on except on phones.
  const FX = { dof: !TELEFON, fc: !TELEFON, csik: !TELEFON, por: !TELEFON, sok: !TELEFON }
  const DB_REF = 60000, DB_SOK = 150000, N_POR = 3000
  const L = { ...LOOKS.elozo }   // the current look
  const RET = { ...RKI }         // the layer keys (grid, mirror, labels, backdrop glow)
  const frissitDb = () => { db = tier === 'teljes' ? (FX.sok ? DB_SOK : DB_REF) : 30000 }
  frissitDb()

  const t0 = performance.now()
  const [pp, bp, blp, cp, stp, shp, plp, grp, kepAdat] = await Promise.all([
    programAsync(gl, PART_VS, PART_FS), programAsync(gl, FULL_VS, BRIGHT_FS), programAsync(gl, FULL_VS, BLUR_FS), programAsync(gl, FULL_VS, COMP_FS),
    programAsync(gl, FULL_VS, STREAK_FS), programAsync(gl, FULL_VS, SHAFT_FS), programAsync(gl, PART_VS_L, LINE_FS), programAsync(gl, GRID_VS, GRID_FS), kep(),
  ])
  naplo.fordit = performance.now() - t0
  const P = {
    part: { prog: pp.prog, u: uniformok(gl, pp.prog, ['u_ser', 'u_pic', 'u_vp', 'u_eye', 'u_right', 'u_up', 'u_a', 'u_b', 'u_c', 'u_d', 'u_e', 'u_f', 'u_g', 'u_h', 'u_k', 'u_l', 'u_n', 'u_o', 'u_pen', 'u_hot']) },
    comet: { prog: plp.prog, u: uniformok(gl, plp.prog, ['u_ser', 'u_pic', 'u_vp', 'u_eye', 'u_right', 'u_up', 'u_a', 'u_b', 'u_c', 'u_d', 'u_e', 'u_f', 'u_g', 'u_h', 'u_k', 'u_l', 'u_n', 'u_o', 'u_pen', 'u_hot']) },
    bright: { prog: bp.prog, u: uniformok(gl, bp.prog, ['u_src', 'u_thr']) },
    blur: { prog: blp.prog, u: uniformok(gl, blp.prog, ['u_src', 'u_dir']) },
    comp: { prog: cp.prog, u: uniformok(gl, cp.prog, ['u_scene', 'u_b0', 'u_b1', 'u_b2', 'u_st', 'u_sh', 'u_p', 'u_q', 'u_gl', 'u_gc', 'u_res', 'u_bg']) },
    streak: { prog: stp.prog, u: uniformok(gl, stp.prog, ['u_src', 'u_dir']) },
    shaft: { prog: shp.prog, u: uniformok(gl, shp.prog, ['u_src', 'u_l']) },
    grid: { prog: grp.prog, u: uniformok(gl, grp.prog, ['u_vp', 'u_eye', 'u_col', 'u_s']) },
  }
  const texSor = texR32F(gl, N, 1, SOR)
  const texKep = texRGBA8(gl, kepAdat.cols, kepAdat.rows, kepAdat.szin)
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao)

  // the floor and the drop lines: static geometry built from the series (x, y, z, kind, t); everything on it is a time or a value of the true run
  const iMax = SOR.indexOf(MAX), iMin = SOR.indexOf(MIN)
  const uIdx = (i) => 1 - i / (N - 1)                       // minute index -> ribbon position (0 = newest)
  const zIdx = (i) => -uIdx(i) * LZ
  const oraIdx = []                                         // the full hours of the run (the last mark is the run's end, 14:00)
  for (let i = 0; i < N; i++) if ((ADAT.gepadat.kezdetPerc + i) % 60 === 0) oraIdx.push(i)
  oraIdx.push(N - 1)
  const geom = (() => {
    const a = []
    const seg = (ax, ay, az, bx, by, bz, kd, ta, tb) => a.push(ax, ay, az, kd, ta, bx, by, bz, kd, tb)
    for (let x = -GX; x <= GX; x += 2) for (let z = 6; z > -LZ - 6; z -= 2) seg(x, PADLO, z, x, PADLO, z - 2, 0, x / GX, x / GX)
    const rung = (i, kd) => { for (let x = -GX; x < GX; x++) seg(x, PADLO, zIdx(i), x + 1, PADLO, zIdx(i), kd, x / GX, (x + 1) / GX) }
    for (let i = 0; i < N; i += 10) if (!oraIdx.includes(i)) rung(i, 1)
    for (const i of oraIdx) rung(i, 2)
    const drop = (i) => {
      const u = uIdx(i), x = cx(u), z = zIdx(i), y = (vnAt(u) - 0.5) * AMPY
      for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6; seg(x, PADLO + (y - PADLO) * t0, z, x, PADLO + (y - PADLO) * t1, z, 3, t0, t1) }
    }
    for (const i of oraIdx) drop(i)
    drop(iMax); drop(iMax); drop(iMin); drop(iMin)             // the two extremes twice: brighter
    return new Float32Array(a)
  })()
  const nGeom = geom.length / 5
  const vaoG = gl.createVertexArray(); gl.bindVertexArray(vaoG)
  const vboG = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vboG); gl.bufferData(gl.ARRAY_BUFFER, geom, gl.STATIC_DRAW)
  const aP = gl.getAttribLocation(P.grid.prog, 'a_p'), aK = gl.getAttribLocation(P.grid.prog, 'a_k')
  gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 20, 0)
  gl.enableVertexAttribArray(aK); gl.vertexAttribPointer(aK, 2, gl.FLOAT, false, 20, 12)
  gl.bindVertexArray(vao)

  // render targets
  const ft = (w, h, h16) => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
    if (h16) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fbo, w, h, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE }
  }
  let F = null, W = 0, H = 0
  const felad = () => { if (F) for (const f of Object.values(F)) { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fbo) } }
  function meret() {
    const w = Math.max(2, Math.round(SVET.clientWidth * dpr * skala)), h = Math.max(2, Math.round(SVET.clientHeight * dpr * skala))
    if (F && w === W && h === H) return
    W = w; H = h; vaszon.width = w; vaszon.height = h
    felad()
    const mk = (a, b) => { let f = ft(a, b, hdr); if (!f.ok && hdr) { hdr = false; naplo.megjegyzesek.push('HDR target incomplete: RGBA8'); f = ft(a, b, false) } return f }
    const h2 = [Math.ceil(w / 2), Math.ceil(h / 2)], h4 = [Math.ceil(w / 4), Math.ceil(h / 4)], h8 = [Math.ceil(w / 8), Math.ceil(h / 8)]
    F = { scene: mk(w, h), b0a: mk(...h2), b0b: mk(...h2), b1a: mk(...h4), b1b: mk(...h4), b2a: mk(...h8), b2b: mk(...h8), sa: mk(...h4), st: mk(...h4), sh: mk(...h4) }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const pass = (p, src, dst, set) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null)
    gl.viewport(0, 0, dst ? dst.w : W, dst ? dst.h : H)
    gl.useProgram(p.prog)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.uniform1i(p.u.u_src, 0)
    set?.()
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const kopi = (src, dst) => pass(P.bright, src, dst, () => gl.uniform1f(P.bright.u.u_thr, -1))
  const elmos = (a, b) => { // blur a in place through b (horizontal, vertical)
    pass(P.blur, a, b, () => gl.uniform2f(P.blur.u.u_dir, 1 / b.w, 0))
    pass(P.blur, b, a, () => gl.uniform2f(P.blur.u.u_dir, 0, 1 / a.h))
  }

  // ----- input
  let pT = korl(+params.get('p') || 0, 0, 1), pS = pT, mozgas = 0
  const pt = { x: 0, y: 0, tx: 0, ty: 0, er: 0, ido: -1e9 }
  const hangObj = new Hang()
  const csuszka = $('#mely')
  const allit = (v) => { pT = korl(v, 0, 1); csuszka.value = String(Math.round(pT * 1000)); keres() }
  csuszka.addEventListener('input', () => { pT = csuszka.valueAsNumber / 1000; keres() })
  addEventListener('wheel', (e) => { e.preventDefault(); allit(pT + (e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY) * 0.0007) }, { passive: false })
  let ty0 = null
  addEventListener('touchstart', (e) => { ty0 = e.touches[0].clientY }, { passive: true })
  addEventListener('touchmove', (e) => { if (ty0 === null) return; const y = e.touches[0].clientY; allit(pT - (y - ty0) / (innerHeight * 1.1)); ty0 = y; setPtr(e.touches[0]) }, { passive: true })
  addEventListener('touchend', () => { ty0 = null; pt.ido = -1e9 }, { passive: true })
  addEventListener('keydown', (e) => {
    if (e.target === csuszka || e.target.closest?.('button,a')) return
    const lep = { ArrowDown: 0.03, ArrowUp: -0.03, PageDown: 0.12, PageUp: -0.12, ' ': 0.12 }[e.key]
    if (lep !== undefined) { e.preventDefault(); allit(pT + lep) } else if (e.key === 'Home') allit(0); else if (e.key === 'End') allit(1)
  })
  function setPtr(e) { const r = SVET.getBoundingClientRect(); pt.tx = ((e.clientX - r.left) / r.width) * 2 - 1; pt.ty = 1 - ((e.clientY - r.top) / r.height) * 2; pt.ido = performance.now(); keres() }
  addEventListener('pointermove', setPtr)
  new ResizeObserver(() => { meret(); keres() }).observe(SVET)
  vaszon.addEventListener('webglcontextlost', (e) => { e.preventDefault(); naplo.megjegyzesek.push('context lost'); iker(false) })

  // ----- the sound key
  const hangGomb = $('#hang')
  hangGomb.addEventListener('click', async () => {
    if (hangObj.on) { hangObj.ki(); hangGomb.setAttribute('aria-pressed', 'false'); return }
    const ok = await hangObj.be()
    hangGomb.setAttribute('aria-pressed', ok ? 'true' : 'false')
  })
  $('#ki').addEventListener('click', () => { tarol('vilag-ki', '1'); hangObj.ki(); stop = true; iker(false) })

  // ----- synchronous cost of one frame at the current state (draw + a 1-pixel readback): independent of the display's rate and of any rAF throttle
  function koltseg(n = 8) {
    const px = new Uint8Array(4), ts = []
    for (let i = 0; i < n; i++) { const a = performance.now(); rajz(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (i >= 2) ts.push(performance.now() - a) }
    ts.sort((a, b) => a - b)
    return ts[ts.length >> 1]
  }

  // ----- header line (rewritten every window, so a stale single frame can never stand for the speed)
  const fejlec = () => {
    const f = (v) => (v == null ? '-' : v.toFixed(1))
    $('#allapot').textContent = `GPU: ${naplo.renderer} · fordítás ${naplo.fordit.toFixed(0)} ms · képkocka: medián ${f(naplo.median)} ms, átlag ${f(naplo.ort)} ms, p95 ${f(naplo.p95)} ms (${naplo.ablak}. ablak)${naplo.gpu == null ? '' : ` · GPU-költség ${naplo.gpu.toFixed(1)} ms${kap ? ' (a képkockaszám korlátozott, nem a GPU)' : ''}`} · ${W}×${H} px, skála ${skala.toFixed(2)} · ${tier}${hdr ? '' : ' · LDR'}${rogzitett ? ' · rögzítve' : ''} · nézet: ${LOOKS[naplo.nezet]?.nev ?? '-'} · hatás ${Object.values(FX).filter(Boolean).length}/5 · réteg ${Object.values(RET).filter(Boolean).length}/4${naplo.megjegyzesek.length ? ' · ' + naplo.megjegyzesek.at(-1) : ''}`
  }

  // ----- frame loop
  let vMent = null, kesz = false, raf = 0, last = 0, t = 0, kocka = 0, stop = false, merjFut = false, rogzitett = false, kap = false
  const dts = []
  let olvasatSzoveg = ''
  const keres = () => { if (!raf && !stop) raf = requestAnimationFrame(ciklus) }
  const endTav = () => { const asp = SVET.clientWidth / SVET.clientHeight, hp = (PICW * kepAdat.rows) / kepAdat.cols; return Math.max(10, hp * 0.5 / Math.tan(FOV / 2) / 0.76, PICW * 0.5 / (Math.tan(FOV / 2) * asp) / 0.9) }

  function ciklus(now) {
    raf = 0
    if (stop || merjFut) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
    last = now
    const prev = pS
    pS = RM ? pT : pS + (pT - pS) * (1 - Math.exp(-dt * 5))
    if (Math.abs(pT - pS) < 1e-4) pS = pT
    mozgas += ((Math.abs(pS - prev) / Math.max(dt, 1e-3)) - mozgas) * Math.min(1, dt * 8)
    if (!RM) t += dt
    // pointer: eased, active for 1.2 s after the last move (a response to input, not idle motion)
    const aktiv = now - pt.ido < 1200
    pt.x += (pt.tx - pt.x) * Math.min(1, dt * 8); pt.y += (pt.ty - pt.y) * Math.min(1, dt * 8)
    pt.er += ((aktiv ? 1 : 0) - pt.er) * Math.min(1, dt * 6)
    rajz()
    felFrissit()
    kocka++
    naplo.p = pS
    // the readout: the true sample under the camera (live region, debounced by change only)
    const w = sm(0.55, 0.95, pS)
    const zc = KAMERA_ELOL - pS * (KAMERA_ELOL - (ZP + endTav()))
    const u0 = korl(-zc / LZ, 0, 1), idx = Math.round((1 - u0) * (N - 1))
    const sz = pS < 0.9 ? `CNC-1 orsóhőmérséklet · ${perc(idx)} · ${fmt(SOR[idx])} °C` : `A kliens honlapja · ${kepAdat.cols} × ${kepAdat.rows} blokk · ${kepAdat.cols * kepAdat.rows} minta`
    if (sz !== olvasatSzoveg) { olvasatSzoveg = sz; $('#olvasat').textContent = sz; csuszka.setAttribute('aria-valuetext', sz) }
    hangObj.hang(w > 0.5 ? 0.5 : vnAt(u0), korl(mozgas, 0, 1))
    // gate by frame time: first lower the render scale, then the light tier, then the DOM twin.
    // The decision uses the trimmed mean of a 40-frame window (a median alone hides a 60 Hz display that misses every third frame); the header shows median, mean and p95.
    if ((!PROBA || window.__kalandLeptek) && now > 0) {   // __kalandLeptek: test hook, runs the ladder in software GL too
      dts.push(dt * 1000)
      if (dts.length >= 45) {
        const s = dts.slice(5).sort((a, b) => a - b), n = s.length
        const med = s[n >> 1], p95 = s[Math.floor(n * 0.95)], ort = s.slice(0, n - 2).reduce((a, b) => a + b, 0) / (n - 2)
        Object.assign(naplo, { median: med, p95, ort }); naplo.ablak++; dts.length = 0
        if (ort <= 20.5) kap = false
        else if (!rogzitett && (!kap || naplo.ablak % 10 === 0)) {
          // The interval is slow. Is the GPU the limit? A throttled or capped requestAnimationFrame looks the same in the interval but costs the GPU nothing,
          // so the synchronous cost of a frame decides (a capped frame rate is re-checked every 10th window).
          const gpu = koltseg(); naplo.gpu = gpu
          if (gpu <= (window.__kalandKoltseg ?? GPU_MAX)) {
            if (!kap) naplo.megjegyzesek.push(`interval ${ort.toFixed(1)} ms but GPU ${gpu.toFixed(1)} ms: frame rate capped, no step`)
            kap = true
          } else {
            kap = false
            if (skala > SKALA_MIN + 1e-6) { skala = Math.max(SKALA_MIN, skala * 0.85); meret(); naplo.megjegyzesek.push(`scale ${skala.toFixed(2)} at ${ort.toFixed(1)} ms, GPU ${gpu.toFixed(1)} ms`) }
            else if (Object.values(FX).some(Boolean)) { hatasokKi(); skala = 0.85; meret(); naplo.megjegyzesek.push(`effects off at ${ort.toFixed(1)} ms, GPU ${gpu.toFixed(1)} ms`) }
            else if (tier === 'teljes') { tier = 'konnyu'; frissitDb(); skala = 0.8; meret(); naplo.megjegyzesek.push(`light tier at ${ort.toFixed(1)} ms, GPU ${gpu.toFixed(1)} ms`) }
            else if (gpu > 26) { stop = true; iker(false); naplo.megjegyzesek.push(`DOM twin at GPU ${gpu.toFixed(1)} ms`); naplo.kap = kap; fejlec(); return }
          }
        }
        naplo.kap = kap
        fejlec()
      }
    } else if (PROBA && kocka === 30) { naplo.median = dt * 1000; fejlec() }
    naplo.kepkockak = kocka; naplo.szint = tier; naplo.skala = skala
    if (!RM) keres(); else if (Math.abs(pT - pS) > 1e-4 || pt.er > 0.01) keres()
  }

  function rajz() {
    meret()
    const asp = SVET.clientWidth / SVET.clientHeight
    const w = sm(0.55, 0.95, pS)
    const zc = KAMERA_ELOL - pS * (KAMERA_ELOL - (ZP + endTav()))
    const u0 = korl(-zc / LZ, 0, 1), c0 = szalag(u0)
    const ko = sm(0, 0.22, pS)          // from the wide three-quarter view that shows the trace to the flight beside the strands
    const cm = L.cam, offX = cm[0] + (cm[3] - cm[0]) * ko, offY = cm[1] + (cm[4] - cm[1]) * ko, elore = cm[2] + (cm[5] - cm[2]) * ko   // the camera's offset from the thread and how far ahead it looks: wide opening -> flight
    const uT = korl(-(zc - elore) / LZ, 0, 1), cT = szalag(uT)
    const eye = [(c0.x + offX) * (1 - w) + pt.x * 0.6 * pt.er, (c0.y + offY) * (1 - w) + pt.y * 0.35 * pt.er, zc]
    const tgt = [cT.x * (1 - w), cT.y * (1 - w), (zc - elore) * (1 - w) + ZP * w]
    const v = nez(eye, tgt)
    const vp = mul(persp(FOV, asp, 0.1, 200), v.m)
    const K = H / (2 * Math.tan(FOV / 2))
    const pB = sm(0.55, 0.97, pS)

    gl.bindVertexArray(vao)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.scene.fbo); gl.viewport(0, 0, F.scene.w, F.scene.h)
    gl.clearColor(SZIN.bg[0], SZIN.bg[1], SZIN.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
    const nPic = kepAdat.cols * kepAdat.rows * PPC
    const focus = Math.max(1, Math.hypot(tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]))
    const nm = Math.max(1000, Math.min(db - nPic, 40000))   // the mirror draws a thinner set of strands (it is dim and soft anyway)
    const setPart = (pr, tukor = false) => {   // every particle uniform except u_e (which differs per draw)
      const U = pr.u
      gl.useProgram(pr.prog)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texSor); gl.uniform1i(U.u_ser, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texKep); gl.uniform1i(U.u_pic, 1)
      gl.uniformMatrix4fv(U.u_vp, false, vp)
      gl.uniform3f(U.u_eye, ...eye); gl.uniform3f(U.u_right, ...v.right); gl.uniform3f(U.u_up, ...v.up)
      gl.uniform4f(U.u_a, t, N - 1, MIN, MAX)
      gl.uniform4f(U.u_b, LZ, AMPY, pB, K)
      gl.uniform4f(U.u_c, kepAdat.cols, kepAdat.rows, PPC, ZP)
      gl.uniform4f(U.u_d, pt.x, pt.y, pt.er, asp)
      gl.uniform3f(U.u_pen, ...SZIN.pen); gl.uniform3f(U.u_hot, ...SZIN.hot)
      gl.uniform4f(U.u_f, focus, L.ap * (1 - 0.85 * pB), L.bok * K, FX.dof ? 1 : 0)   // focus on what the camera looks at; the picture is always sharp
      gl.uniform4f(U.u_g, (DB_REF - nPic) / Math.max(db - nPic, 1000), 0, 0, 0)       // the same brightness whatever the particle count
      gl.uniform4f(U.u_h, L.sp, L.ex, L.sz, L.hz)
      gl.uniform4f(U.u_k, L.fl, L.pw, L.th, L.pe)
      gl.uniform4f(U.u_l, L.hm, L.len, L.tail, L.du)
      gl.uniform4f(U.u_n, tukor ? 1 : 0, PADLO, L.rf * (db - nPic) / nm, L.hl)
      gl.uniform4f(U.u_o, uIdx(iMax), uIdx(iMin), L.mk, 0)
      gl.uniform4f(U.u_e, PICW, 0, 2400, 0.03 * K)
      return U
    }
    const fonal = (tukor) => {   // three hairlines side by side, a little over 2 px wide
      const Uc = setPart(P.comet, tukor)
      if (tukor) gl.uniform4f(Uc.u_n, 1, PADLO, L.rf, L.hl)
      for (const o of [-1, 0, 1]) { gl.uniform4f(Uc.u_e, PICW, 6, o, 0.03 * K); gl.drawArrays(gl.LINE_STRIP, 0, N) }
    }
    const csakGr = RET.gr && (L.gr > 0 || L.gr2 > 0)
    if (csakGr) {   // the floor: rails, rungs every 10 minutes (the hours brighter), drop lines from the thread to the floor
      gl.bindVertexArray(vaoG)
      gl.useProgram(P.grid.prog)
      const G = P.grid.u
      gl.uniformMatrix4fv(G.u_vp, false, vp); gl.uniform3f(G.u_eye, ...eye); gl.uniform3f(G.u_col, ...SZIN.ink); gl.uniform4f(G.u_s, L.gr, L.gr2, pB, 0)
      gl.drawArrays(gl.LINES, 0, nGeom)
      gl.bindVertexArray(vao)
    }
    if (RET.rf && L.rf > 0) {   // the glossy floor: the strands and the thread again, upside down and dim
      if (L.ln) { setPart(P.comet, true); gl.drawArrays(gl.LINES, 2 * nPic, 2 * nm) }
      else { setPart(P.part, true); gl.drawArrays(gl.POINTS, nPic, nm) }
      if (L.hl > 0) fonal(true)
      else { const Ut = setPart(P.part, true); gl.uniform4f(Ut.u_n, 1, PADLO, L.rf, L.hl); gl.uniform4f(Ut.u_e, PICW, 1, NT, 0.03 * K); gl.drawArrays(gl.POINTS, 0, NT) }
    }
    if (L.ln) {   // comets: the strands as hairlines along the flow (the picture's own particles stay points, they become the squares)
      setPart(P.comet)
      gl.drawArrays(gl.LINES, 2 * nPic, 2 * (db - nPic))
    }
    const U = setPart(P.part)
    gl.drawArrays(gl.POINTS, 0, L.ln ? nPic : db)
    if (FX.por) { gl.uniform4f(U.u_e, PICW, 2, 0, 0.03 * K); gl.drawArrays(gl.POINTS, 0, N_POR) }
    if (L.hl > 0) { gl.uniform4f(U.u_e, PICW, 3, NT, 0.03 * K); gl.drawArrays(gl.POINTS, 0, NT) }                  // the thread's soft tube
    else { gl.uniform4f(U.u_e, PICW, 1, 2400, 0.03 * K); gl.drawArrays(gl.POINTS, 0, 2400) }                      // the old thread: points along the true trace
    if (csakGr && L.mk > 0) { gl.uniform4f(U.u_e, PICW, 5, 2, 0.03 * K); gl.drawArrays(gl.POINTS, 0, 2); gl.uniform4f(U.u_e, PICW, 4, 2, 0.03 * K); gl.drawArrays(gl.POINTS, 0, 2) }   // the true maximum and minimum
    if (L.hl > 0) fonal(false)   // the thread itself: a polyline through the true samples (last: it leaves the comet program current, so U above is not used after it)
    gl.disable(gl.BLEND)

    pass(P.bright, F.scene, F.b0a, () => gl.uniform1f(P.bright.u.u_thr, 0.55)); elmos(F.b0a, F.b0b)
    kopi(F.b0a, F.b1a); elmos(F.b1a, F.b1b)
    kopi(F.b1a, F.b2a); elmos(F.b2a, F.b2b)
    if (FX.csik) {   // lens streak: the brightest glow, blurred wide and flat
      pass(P.bright, F.b1a, F.sa, () => gl.uniform1f(P.bright.u.u_thr, 0.45))
      pass(P.streak, F.sa, F.st, () => gl.uniform2f(P.streak.u.u_dir, 1 / F.st.w, 0))
    }
    let shS = 0
    if (FX.fc) {     // light shafts from a point on the ribbon beyond the look target (the picture's centre once the picture forms)
      const uL = korl(-(zc - elore - 16) / LZ, 0, 1), cL = szalag(uL)
      const lp = [cL.x * (1 - pB), cL.y * (1 - pB), -uL * LZ * (1 - pB) + ZP * pB]
      const cw = vp[3] * lp[0] + vp[7] * lp[1] + vp[11] * lp[2] + vp[15]
      if (cw > 0.5) {
        const lu = (vp[0] * lp[0] + vp[4] * lp[1] + vp[8] * lp[2] + vp[12]) / cw * 0.5 + 0.5, lv = (vp[1] * lp[0] + vp[5] * lp[1] + vp[9] * lp[2] + vp[13]) / cw * 0.5 + 0.5
        shS = L.sh * (1 - pB)
        pass(P.shaft, F.b1a, F.sh, () => gl.uniform3f(P.shaft.u.u_l, korl(lu, -0.3, 1.3), korl(lv, -0.3, 1.3), shS))
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H)
    gl.useProgram(P.comp.prog)
    const C = P.comp.u
    ;[F.scene, F.b0a, F.b1a, F.b2a, FX.csik ? F.st : F.b2a, shS > 0 ? F.sh : F.b2a].forEach((f, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, f.tex) })
    gl.uniform1i(C.u_scene, 0); gl.uniform1i(C.u_b0, 1); gl.uniform1i(C.u_b1, 2); gl.uniform1i(C.u_b2, 3); gl.uniform1i(C.u_st, 4); gl.uniform1i(C.u_sh, 5)
    gl.uniform4f(C.u_q, FX.csik ? L.st : 0, shS, L.vg, L.xp)
    gl.uniform4f(C.u_p, L.bl * (1 - L.blE * pB), RM ? 0 : 0.03, 0.012, RM ? 0 : kocka)
    gl.uniform4f(C.u_gl, RET.gl ? 0.05 * L.gl * (1 - 0.6 * pB) : 0, 0.5, 0.5, 0.6); gl.uniform3f(C.u_gc, ...SZIN.pen)
    gl.uniform2f(C.u_res, W, H)
    gl.uniform3f(C.u_bg, ...SZIN.bg)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    vMent = { vp, eye, pB }
    kesz = true
  }

  // ----- the "Mérés" key: synchronous cost of one frame (draw + a 1-pixel readback, so the number is not capped by the display's refresh rate)
  const merjGomb = $('#merj'), merjKi = $('#merjki')
  const fxGombok = [...document.querySelectorAll('[data-fx]')]
  const fxGombFrissit = () => { for (const b of fxGombok) b.setAttribute('aria-pressed', String(!!FX[b.dataset.fx])) }
  function hatasokKi() { for (const k of Object.keys(FX)) FX[k] = false; RET.rf = false; frissitDb(); gombFrissit() }   // the mirror doubles the strands, so it goes with the effects
  for (const b of fxGombok) b.addEventListener('click', () => { FX[b.dataset.fx] = !FX[b.dataset.fx]; frissitDb(); fxGombFrissit(); fejlec(); keres() })
  fxGombFrissit()
  naplo.fx = FX

  // ----- labels in the scene: real times and real values from the run (DOM text, so the type is the site's own; aria-hidden: the DOM twin and the live readout carry the same facts)
  const felEl = $('#feliratok')
  const FEL = []
  const felirat = (cls, txt, p, tip) => { const el = document.createElement('span'); el.className = `fel ${cls}`; el.textContent = txt; felEl.append(el); FEL.push({ el, p, tip, o: -1 }) }
  for (const i of oraIdx) {
    const u = uIdx(i)
    felirat('fel-ora', i === N - 1 ? `${perc(N)} műszakváltás` : perc(i), [GX + 0.6, PADLO, zIdx(i)], 'ora')   // the run ends where the shift changes (the demo's own data: 14:00)
    if (i < N - 1) felirat('fel-ertek', `${fmt(SOR[i])} °C`, [cx(u), (vnAt(u) - 0.5) * AMPY + 0.45, zIdx(i)], 'ertek')
  }
  felirat('fel-cs', `csúcs ${fmt(MAX)} °C · ${perc(iMax)}`, [cx(uIdx(iMax)), AMPY / 2 + 0.6, zIdx(iMax)], 'cs')
  felirat('fel-cs', `mélypont ${fmt(MIN)} °C · ${perc(iMin)}`, [cx(uIdx(iMin)), -AMPY / 2 - 0.6, zIdx(iMin)], 'csle')
  const felFrissit = () => {
    const m = vMent, lb = RET.lb ? L.lb : 0, SW = SVET.clientWidth, SH = SVET.clientHeight
    for (const f of FEL) {
      let o = 0, tx = 0, ty = 0
      if (m && lb > 0 && !(f.tip === 'ertek' && lb < 2)) {
        const vp = m.vp, [x, y, z] = f.p
        const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
        if (cw > 0.5) {
          const nx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw, ny = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw
          if (Math.abs(nx) < 1.02 && Math.abs(ny) < 1.02) {
            const d = Math.hypot(x - m.eye[0], y - m.eye[1], z - m.eye[2]), er = f.tip === 'ertek'
            o = 0.9 * sm(3, 7, d) * (1 - sm(er ? 16 : 30, er ? 26 : 50, d)) * (1 - sm(0.3, 0.7, m.pB))
            tx = (nx * 0.5 + 0.5) * SW; ty = (0.5 - ny * 0.5) * SH
          }
        }
      }
      if (o < 0.02) { if (f.o !== 0) { f.el.style.opacity = '0'; f.o = 0 } continue }
      f.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) ${f.tip === 'ora' ? 'translate(0, -50%)' : f.tip === 'csle' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'}`
      f.el.style.opacity = o.toFixed(2); f.o = o
    }
  }

  // ----- the layer keys and the looks
  const retGombok = [...document.querySelectorAll('[data-ret]')], nezetGombok = [...document.querySelectorAll('[data-nezet]')]
  const gombFrissit = () => {
    fxGombFrissit()
    for (const b of retGombok) b.setAttribute('aria-pressed', String(!!RET[b.dataset.ret]))
    for (const b of nezetGombok) b.setAttribute('aria-pressed', String(b.dataset.nezet === naplo.nezet))
  }
  function nezet(k) {
    if (!LOOKS[k]) return
    Object.assign(L, LOOKS[k]); Object.assign(FX, { ...KI, ...L.fx }); Object.assign(RET, { ...RKI, ...L.ret })
    if (TELEFON) { Object.assign(FX, KI); RET.rf = false }   // phones start light: no effects, no mirror (the keys can turn them on)
    naplo.nezet = k; frissitDb(); gombFrissit(); fejlec(); keres()
  }
  for (const b of retGombok) b.addEventListener('click', () => { RET[b.dataset.ret] = !RET[b.dataset.ret]; gombFrissit(); fejlec(); keres() })
  for (const b of nezetGombok) b.addEventListener('click', () => nezet(b.dataset.nezet))
  const szovegGomb = $('#szoveg')
  szovegGomb.addEventListener('click', () => { const ki = !$('.m0').hidden; $('.m0').hidden = ki; szovegGomb.setAttribute('aria-pressed', String(ki)) })
  naplo.ret = RET; naplo.look = L; naplo.nezetAllit = nezet
  async function merj(n = 30) {
    if (merjFut || stop) return
    merjFut = true; merjGomb.disabled = true; merjGomb.textContent = 'Mérés fut…'
    const mentve = { skala, db, pS, pT, t, fx: { ...FX }, ret: { ...RET } }
    const px = new Uint8Array(4), sor = []
    // effects x render scale x position of the camera (0.1 = the wide opening, 0.9 = the picture close up); every effect is measured alone against the bare base
    const nincs = { dof: 0, fc: 0, csik: 0, por: 0, sok: 0 }, be = (k) => ({ ...nincs, [k]: 1 }), rnincs = { gr: 0, rf: 0, lb: 0, gl: 0 }, rbe = (k) => ({ ...rnincs, [k]: 1 }), igy = [{ ...mentve.fx }, { ...mentve.ret }]
    const cfg = [['alap', nincs, rnincs, 1, 0.1], ['alap', nincs, rnincs, 1, 0.9], ['+ mélységélesség', be('dof'), rnincs, 1, 0.1], ['+ fénycsóva', be('fc'), rnincs, 1, 0.1], ['+ lencsecsík', be('csik'), rnincs, 1, 0.1],
      ['+ por', be('por'), rnincs, 1, 0.1], ['+ több részecske', be('sok'), rnincs, 1, 0.1], ['+ rács', nincs, rbe('gr'), 1, 0.1], ['+ tükör', nincs, rbe('rf'), 1, 0.1],
      [`nézet így (${L.nev})`, ...igy, 1, 0.1], [`nézet így (${L.nev})`, ...igy, 1, 0.9], [`nézet így (${L.nev})`, ...igy, 0.7, 0.9]]
    try {
      for (const [cim, fx, ret, s, p] of cfg) {
        skala = s; Object.assign(FX, fx); Object.assign(RET, ret); frissitDb(); pS = pT = p; meret()
        const ts = []
        for (let i = 0; i < n; i++) {
          t += 1 / 60
          const a = performance.now(); rajz(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const d = performance.now() - a
          if (i >= 6) ts.push(d)
          if (i % 6 === 5) await new Promise((r) => setTimeout(r, 0))
        }
        ts.sort((a, b) => a - b)
        sor.push(`${cim} · skála ${s} · mélység ${p} · ${db / 1000}k: medián ${ts[ts.length >> 1].toFixed(1)} ms (min ${ts[0].toFixed(1)}) · ${W}×${H}`)
        merjKi.textContent = sor.join('\n'); merjKi.hidden = false
      }
    } finally {
      ;({ skala, db, pS, pT, t } = mentve); Object.assign(FX, mentve.fx); Object.assign(RET, mentve.ret); frissitDb(); gombFrissit()
      meret(); merjFut = false; last = 0; dts.length = 0
      merjGomb.disabled = false; merjGomb.textContent = 'Mérés'
      naplo.merj = sor
      keres()
    }
  }
  merjGomb.hidden = false
  $('#hatasok').hidden = false; $('#retegek').hidden = false; $('#nezetek').hidden = false
  const letraGomb = $('#letra')
  letraGomb.hidden = false
  letraGomb.addEventListener('click', () => {
    rogzitett = !rogzitett; naplo.rogzitve = rogzitett
    letraGomb.setAttribute('aria-pressed', String(rogzitett)); letraGomb.textContent = rogzitett ? 'Minőség: rögzítve' : 'Minőség: auto'
    fejlec()
  })
  merjGomb.addEventListener('click', () => { merj() })
  naplo.merjFuttat = merj
  nezet(NEZET0)

  meret()
  csuszka.value = String(Math.round(pT * 1000))
  naplo.allit = (p) => { allit(p); if (RM) return; pS = pT }
  naplo.kesz = () => kesz
  keres()
}

$('#be').addEventListener('click', () => { tarol('vilag-ki', null); location.reload() })
// the contact line of the DOM twin (the address from the site's own data; no phone)
$('#level').setAttribute('href', ADAT.kapcsolat.href)
$('#cim').textContent = ADAT.kapcsolat.email
for (const a of document.querySelectorAll('a[data-rel]')) a.setAttribute('href', ALAP + a.getAttribute('data-rel'))
main().catch((e) => { naplo.megjegyzesek.push(`main: ${e.message}`); $('#allapot').textContent = `GL: hiba (${e.message})`; iker(false) })
