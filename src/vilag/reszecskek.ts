// The particle scene: chapters 1 and 2. Up to 150,000 particles (60,000 without the "sok" effect, 30,000 on the light tier) stream along a ribbon whose centre line's height is the shift's true
// temperature trace; the thread itself is a polyline through the 480 true samples; further along the same particles settle, cell by cell, into the block means of the real client page. Every
// particle is computed in the vertex shader from gl_VertexID and a fixed integer hash: no buffers, no randomness, the same picture on every run. The pointer pushes the cloud apart while it moves
// (a response, never idle motion).
//
// The scene draws what the LOOK says (nezet.ts): every layer has a gain and is skipped when the gain is 0, so a look can cross-fade (comets and points are both drawn while the look is between them).
//   floor     rails, a rung every 10 minutes (the full hours brighter), drop lines to the thread at each hour and at the true extremes (racs.ts)
//   mirror    the strands and the thread again, upside down, dim and soft, on the floor (the one layer with a real cost; the picture is not mirrored)
//   strands   as points, or as hairline comets along the flow; the picture's own particles are always points (they become the squares)
//   thread    a polyline through the true samples (three hairlines side by side) and a soft tube around it
//   dust      out-of-focus specks around the flight path; markers on the true maximum and minimum
// The labels (feliratok.ts) belong to the scene and are drawn by the DOM layer from the frame's matrix; the scene only places them. A draw is made only through `rajzol` (gl.ts), which sets
// the program and its own uniform locations first.
import { GRID_FS, GRID_VS, LINE_FS, PART_FS, PART_VS, PART_VS_L } from './arnyekolok.ts'
import { feliratok, szondaMinta, type Felirat, type FeliratSzovegek } from './feliratok.ts'
import { programAsync, progU, rajzol, texR32F, texRGBA8, type Prog } from './gl.ts'
import type { Jelenet, Kocka, Poz, Vetites } from './jelenet.ts'
import { korl, mul, nez, persp, sm, type V3 } from './matek.ts'
import type { Kamera } from './nezet.ts'
import { AMPY, FOV, LZ, PADLO, PICW, PPC, ZP, palya, type Palya } from './palya.ts'
import { RACS_KULCS, racs, type Racs } from './racs.ts'

/** The tube around the thread: this many points. */
const SZAL = 6000
/** Out-of-focus dust specks. */
const POR = 3000
/** The mirror draws at most this many strands (it is dim and soft anyway). */
const TUKOR_MAX = 40000

/** What the scene draws: the series (one value per minute, from demo minute `kezdetPerc`), the picture's block means (`oszlop` x `sor` RGBA bytes) and the words of the labels. */
export interface ReszecskekAdat {
  ertekek: readonly number[]
  kezdetPerc: number
  oszlop: number
  sor: number
  rgba: Uint8Array
  feliratok: FeliratSzovegek
}

const RESZ = ['u_ser', 'u_pic', 'u_vp', 'u_eye', 'u_right', 'u_up', 'u_a', 'u_b', 'u_c', 'u_d', 'u_e', 'u_f', 'u_g', 'u_h', 'u_k', 'u_l', 'u_n', 'u_o', 'u_pen', 'u_hot'] as const
type Egyenruha = (typeof RESZ)[number]
const RACS_U = ['u_vp', 'u_eye', 'u_col', 'u_pen', 'u_s', 'u_t'] as const

/** The modes of the particle program (`u_e.y`). */
const MOD = { szal: 0, por: 2, cso: 3, jelMag: 4, jelFeny: 5, vonal: 6 } as const

/** The mean colour of the picture's blocks in linear light (the sRGB bytes, decoded and averaged): the colour of the light the screen throws on the floor. Data, not a design colour. */
export function kepAtlag(rgba: Uint8Array): V3 {
  const lin = (b: number): number => {
    const c = b / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  let r = 0
  let g = 0
  let b = 0
  const n = rgba.length / 4
  for (let i = 0; i < n; i++) {
    r += lin(rgba[i * 4])
    g += lin(rgba[i * 4 + 1])
    b += lin(rgba[i * 4 + 2])
  }
  return [r / n, g / n, b / n]
}

export class Reszecskek implements Jelenet {
  readonly id = 'reszecskek'
  readonly palya: Palya
  readonly feliratok: readonly Felirat[]
  private readonly gl: WebGL2RenderingContext
  private readonly resz: Prog<Egyenruha>
  private readonly csova: Prog<Egyenruha>
  private readonly racs: Prog<(typeof RACS_U)[number]>
  private readonly texSor: WebGLTexture
  private readonly texKep: WebGLTexture
  private readonly vao: WebGLVertexArrayObject
  private readonly vaoRacs: WebGLVertexArrayObject
  private readonly vboRacs: WebGLBuffer
  private readonly g: Racs
  /** The picture's mean colour in linear light (the light it throws on the floor). */
  private readonly kepSzin: V3
  private readonly adat: ReszecskekAdat

  private constructor(gl: WebGL2RenderingContext, adat: ReszecskekAdat, p: { resz: WebGLProgram; csova: WebGLProgram; racs: WebGLProgram }) {
    this.gl = gl
    this.adat = adat
    this.palya = palya(adat.ertekek, adat.oszlop, adat.sor, adat.kezdetPerc)
    this.feliratok = feliratok(this.palya, adat.ertekek.length, adat.feliratok)
    this.resz = progU(gl, p.resz, RESZ)
    this.csova = progU(gl, p.csova, RESZ)
    this.racs = progU(gl, p.racs, RACS_U)
    this.texSor = texR32F(gl, adat.ertekek.length, 1, Float32Array.from(adat.ertekek))
    this.texKep = texRGBA8(gl, adat.oszlop, adat.sor, adat.rgba)
    this.vao = gl.createVertexArray()
    // the floor: static geometry built from the series
    const g = racs(this.palya, adat.ertekek.length, adat.oszlop, adat.sor)
    this.g = g
    this.kepSzin = kepAtlag(adat.rgba)
    this.vaoRacs = gl.createVertexArray()
    gl.bindVertexArray(this.vaoRacs)
    this.vboRacs = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboRacs)
    gl.bufferData(gl.ARRAY_BUFFER, g.adat, gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(p.racs, 'a_p')
    const aK = gl.getAttribLocation(p.racs, 'a_k')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, RACS_KULCS * 4, 0)
    gl.enableVertexAttribArray(aK)
    gl.vertexAttribPointer(aK, 2, gl.FLOAT, false, RACS_KULCS * 4, 12)
    gl.bindVertexArray(null)
  }

  /** Compiles the three programs (points, comets, floor) in parallel and builds the textures and the floor's geometry, counting each as a real loading stage through `kesz`. */
  static async keszit(gl: WebGL2RenderingContext, adat: ReszecskekAdat, kesz: (nev: string) => void): Promise<Reszecskek> {
    const egy = async (nev: string, vs: string, fs: string): Promise<WebGLProgram> => {
      const p = await programAsync(gl, vs, fs)
      kesz(nev)
      return p.prog
    }
    const [resz, csova, rc] = await Promise.all([egy('particles', PART_VS, PART_FS), egy('comets', PART_VS_L, LINE_FS), egy('grid', GRID_VS, GRID_FS)])
    const s = new Reszecskek(gl, adat, { resz, csova, racs: rc })
    kesz('textures')
    return s
  }

  poz(p: number, asp: number, kam: Kamera): Poz & { forma: number } {
    const c = this.palya.poz(p, asp, kam)
    return { eye: c.eye, tgt: c.tgt, fov: FOV, forma: c.forma, shift: c.shift }
  }

  minta(p: number, asp: number): number | null {
    return this.palya.index(p, asp)
  }

  szonda(v: Vetites, sw: number, sh: number, px: number, py: number): { i: number; x: number; y: number } | null {
    return szondaMinta(this.palya, this.adat.ertekek.length, v, sw, sh, px, py)
  }

  ertek(p: number, asp: number): number | null {
    // While the picture forms, the sound holds the middle of the scale: there is no single value under the camera any more.
    if (sm(0.55, 0.95, p) > 0.5) return 0.5
    const z = this.palya.poz(p, asp).zc
    return this.palya.vnAt(Math.min(1, Math.max(0, -z / LZ)))
  }

  rajz(k: Kocka, poz: Poz): Vetites {
    const gl = this.gl
    const N = k.nezet
    const asp = k.asp
    const v = nez(poz.eye, poz.tgt)
    const vp = mul(persp(poz.fov, asp, 0.1, 200, poz.shift ?? 0), v.m)
    const forma = sm(0.55, 0.97, k.p)
    const { ertekek, oszlop, sor } = this.adat
    const P = this.palya
    const nPic = oszlop * sor * PPC
    const nSzal = Math.max(0, k.db - nPic)
    const nTukor = Math.max(1000, Math.min(nSzal, TUKOR_MAX))
    const maxPont = Math.min(0.03 * k.k, k.maxPont)
    const fokusz = Math.max(1, Math.hypot(poz.tgt[0] - poz.eye[0], poz.tgt[1] - poz.eye[1], poz.tgt[2] - poz.eye[2]))
    const ln = korl(N.ln, 0, 1) // the comets' gain; the points have the rest
    const pontG = 1 - ln

    /** Every uniform of a particle draw, through the locations of the program that is about to draw. `mod`/`z`: the mode and its count or sideways offset; `g`: the strands' gain; `tukor`: mirrored, with this gain. */
    const be = (u: Record<Egyenruha, WebGLUniformLocation | null>, mod: number, z: number, g: number, tukor: number): void => {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.texSor)
      gl.uniform1i(u.u_ser, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.texKep)
      gl.uniform1i(u.u_pic, 1)
      gl.uniformMatrix4fv(u.u_vp, false, vp)
      gl.uniform3f(u.u_eye, poz.eye[0], poz.eye[1], poz.eye[2])
      gl.uniform3f(u.u_right, v.right[0], v.right[1], v.right[2])
      gl.uniform3f(u.u_up, v.up[0], v.up[1], v.up[2])
      gl.uniform4f(u.u_a, k.t, ertekek.length - 1, P.min, P.max)
      gl.uniform4f(u.u_b, LZ, AMPY, forma, k.k)
      gl.uniform4f(u.u_c, oszlop, sor, PPC, ZP)
      gl.uniform4f(u.u_d, k.mutato.x, k.mutato.y, k.mutato.er, asp)
      gl.uniform4f(u.u_e, PICW, mod, z, maxPont)
      gl.uniform4f(u.u_f, fokusz, N.ap * (1 - 0.85 * forma), N.bok * k.k, N.ap > 0 ? 1 : 0) // focus on what the camera looks at; the picture is always sharp
      gl.uniform4f(u.u_g, (k.dbRef - nPic) / Math.max(k.db - nPic, 1000), g, P.picY, k.giris) // the same brightness whatever the particle count; the picture's centre height
      gl.uniform4f(u.u_h, N.sp, N.ex, N.sz, N.hz)
      gl.uniform4f(u.u_k, N.fl, N.pw, N.th, N.pe)
      gl.uniform4f(u.u_l, N.hm, N.len, N.tail, N.du)
      gl.uniform4f(u.u_n, tukor > 0 ? 1 : 0, PADLO, tukor, N.hl)
      gl.uniform4f(u.u_o, P.uIdx(P.iMax), P.uIdx(P.iMin), N.mk, 0)
      gl.uniform3f(u.u_pen, k.szinek.toll[0], k.szinek.toll[1], k.szinek.toll[2])
      gl.uniform3f(u.u_hot, k.szinek.forro[0], k.szinek.forro[1], k.szinek.forro[2])
    }
    const pont = (mod: number, elso: number, db: number, g = 1, tukor = 0, z = 0): void => rajzol(gl, this.resz, gl.POINTS, elso, db, (u) => be(u, mod, z, g, tukor))
    const csovak = (elso: number, db: number, g: number, tukor = 0): void => rajzol(gl, this.csova, gl.LINES, elso, db, (u) => be(u, MOD.szal, 0, g, tukor))
    /** The thread itself: a polyline through the true samples, three hairlines side by side (a line a little over 2 px wide). */
    const vonal = (tukor = 0): void => {
      for (const o of [-1, 0, 1]) rajzol(gl, this.csova, gl.LINE_STRIP, 0, ertekek.length, (u) => be(u, MOD.vonal, o, 1, tukor))
    }

    gl.bindVertexArray(this.vao)
    gl.clearColor(k.szinek.hatter[0], k.szinek.hatter[1], k.szinek.hatter[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)

    // the floor: rails, rungs every 10 minutes (the hours brighter), drop lines from the thread to the floor, the curtain (a hairline at every minute from the thread down), the picture's frame
    const G = this.g
    if (N.gr > 0 || N.gr2 > 0 || N.cu > 0 || N.fr > 0) {
      gl.bindVertexArray(this.vaoRacs)
      const racsBe = (mir: number, mirG: number) => (u: Record<(typeof RACS_U)[number], WebGLUniformLocation | null>): void => {
        gl.uniformMatrix4fv(u.u_vp, false, vp)
        gl.uniform3f(u.u_eye, poz.eye[0], poz.eye[1], poz.eye[2])
        gl.uniform3f(u.u_col, k.szinek.tinta[0], k.szinek.tinta[1], k.szinek.tinta[2])
        gl.uniform3f(u.u_pen, k.szinek.toll[0], k.szinek.toll[1], k.szinek.toll[2])
        gl.uniform4f(u.u_s, N.gr, N.gr2, forma, N.fr)
        gl.uniform4f(u.u_t, N.cu, mir, mirG, PADLO)
      }
      if (N.gr > 0 || N.gr2 > 0) rajzol(gl, this.racs, gl.LINES, 0, G.fuggonyTol, racsBe(0, 0))
      if (N.cu > 0) rajzol(gl, this.racs, gl.LINES, G.fuggonyTol, G.keretTol - G.fuggonyTol, racsBe(0, 0))
      if (N.cu > 0 && N.rf > 0) rajzol(gl, this.racs, gl.LINES, G.fuggonyTol, G.keretTol - G.fuggonyTol, racsBe(1, N.rf))
      if (N.fr > 0 && forma > 0.5) rajzol(gl, this.racs, gl.LINES, G.keretTol, G.db - G.keretTol, racsBe(0, 0))
      gl.bindVertexArray(this.vao)
    }
    // the glossy floor: the strands and the thread again, upside down and dim
    if (N.rf > 0) {
      const g = (N.rf * nSzal) / nTukor
      if (pontG > 0.004 && nSzal > 0) pont(MOD.szal, nPic, nTukor, pontG, g)
      if (ln > 0.004 && nSzal > 0) csovak(2 * nPic, 2 * nTukor, ln, g)
      vonal(N.rf)
    }
    // the picture's reflection: the same cells upside down on the floor (the stage's glossy floor), only once the picture is forming
    if (N.rf > 0 && forma > 0.02) pont(MOD.szal, 0, Math.min(nPic, k.db), 1, N.rf)
    // the strands: points and/or comets, the picture's own particles always as points
    if (ln > 0.004 && nSzal > 0) csovak(2 * nPic, 2 * nSzal, ln)
    pont(MOD.szal, 0, Math.min(nPic, k.db))
    if (pontG > 0.004 && nSzal > 0) pont(MOD.szal, nPic, nSzal, pontG)
    if (N.du > 0) pont(MOD.por, 0, POR)
    if (N.hl > 0) pont(MOD.cso, 0, SZAL, 1, 0, SZAL)
    if (N.mk > 0) {
      pont(MOD.jelFeny, 0, 2, 1, 0, 2)
      pont(MOD.jelMag, 0, 2, 1, 0, 2)
    }
    vonal()
    gl.disable(gl.BLEND)

    // the light the shafts start from: a point on the ribbon beyond the look target (the picture's centre once the picture forms)
    const c = P.poz(k.p, asp, N.kamera)
    const uL = korl(-(c.zc - c.elore - 16) / LZ, 0, 1)
    const cL = P.szalag(uL)
    const lp: V3 = [cL.x * (1 - forma), cL.y * (1 - forma), -uL * LZ * (1 - forma) + ZP * forma]
    const cw = vp[3] * lp[0] + vp[7] * lp[1] + vp[11] * lp[2] + vp[15]
    const feny: readonly [number, number] | null =
      cw > 0.5
        ? [((vp[0] * lp[0] + vp[4] * lp[1] + vp[8] * lp[2] + vp[12]) / cw) * 0.5 + 0.5, ((vp[1] * lp[0] + vp[5] * lp[1] + vp[9] * lp[2] + vp[13]) / cw) * 0.5 + 0.5]
        : null
    // where the picture's light lands: the floor a little in front of its foot
    const fz = ZP + 3
    const fw = vp[7] * PADLO + vp[11] * fz + vp[15]
    const kep =
      fw > 0.5
        ? { u: ((vp[4] * PADLO + vp[8] * fz + vp[12]) / fw) * 0.5 + 0.5, v: ((vp[5] * PADLO + vp[9] * fz + vp[13]) / fw) * 0.5 + 0.5, szin: this.kepSzin }
        : null
    return { vp, eye: poz.eye, forma, feny, kep }
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.texSor)
    gl.deleteTexture(this.texKep)
    gl.deleteVertexArray(this.vao)
    gl.deleteVertexArray(this.vaoRacs)
    gl.deleteBuffer(this.vboRacs)
    for (const p of [this.resz, this.csova, this.racs]) gl.deleteProgram(p.prog)
  }
}
