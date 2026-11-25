// The formation scene: chapters 3 to 5 (Évek, Pályázat, Kapcsolat) are all this one class fed with different data (cel.ts `KepzesAdat`, built by evek.ts, palyazat.ts and kapcsolat.ts from true data).
// Particles are computed in the vertex shader from gl_VertexID and the integer hash: each belongs to one TARGET (a short segment or a point in a float texture), starts far upstream along the scene's
// arrival direction and settles into its target when the scene's formation clock passes the target's delay; a flowing target streams its particles along the segment. Static hairlines (the floor, guides,
// frames, the thread) are drawn from one small vertex buffer; the reticle rings are the targets that say so. Atmosphere is the dressing (the arrival, the arc, the mirror, the depth of field); what carries
// meaning is where the targets and the lines are, and that comes from the data builders, never from here.
// The scene draws what the LOOK says (nezet.ts), with the same gains as the first scene: the mirror, the comets and the points, the floor, the guides, the frames, the thread.
import { GRID_FS, KEPZES_VS, KEPZES_VS_L, LINE_FS, PART_FS, VONAL_VS } from './arnyekolok.ts'
import { CEL_SZEL, CSOPORT_MAX, VONAL_KULCS, celTomb, type KepzesAdat } from './cel.ts'
import type { Felirat } from './feliratok.ts'
import { programAsync, progU, rajzol, texRGBA32F, type Prog } from './gl.ts'
import type { Jelenet, Kocka, Poz, Vetites } from './jelenet.ts'
import { korl, mul, nez, persp, projekt, sm, type V3 } from './matek.ts'
import type { Kamera } from './nezet.ts'

/** The mirror draws at most this many strands (it is dim and soft anyway). */
const TUKOR_MAX = 25000
/** The particle count the brightness is calibrated for (the first scene's reference: the density compensation keeps a picture the same on every tier). */
const REF_DB = 60000

const RESZ = ['u_cel', 'u_vp', 'u_eye', 'u_right', 'u_up', 'u_a', 'u_b', 'u_c', 'u_d', 'u_f', 'u_g', 'u_h', 'u_n', 'u_grp', 'u_pen', 'u_hot'] as const
type Egyenruha = (typeof RESZ)[number]
const VONAL = ['u_vp', 'u_eye', 'u_l', 'u_n', 'u_grp', 'u_ink', 'u_pen', 'u_hot'] as const

/** The three programs every formation scene shares: points, comets and the hairlines. Compiled once (in parallel), counted as real loading stages. */
export class KepzesProgramok {
  readonly resz: Prog<Egyenruha>
  readonly csova: Prog<Egyenruha>
  readonly vonal: Prog<(typeof VONAL)[number]>
  private readonly gl: WebGL2RenderingContext

  private constructor(gl: WebGL2RenderingContext, p: readonly [WebGLProgram, WebGLProgram, WebGLProgram]) {
    this.gl = gl
    this.resz = progU(gl, p[0], RESZ)
    this.csova = progU(gl, p[1], RESZ)
    this.vonal = progU(gl, p[2], VONAL)
  }

  /** Compiles the three programs; `kesz` is told 'forms' (points), 'streaks' (comets) and 'rules' (lines) as each one links. */
  static async keszit(gl: WebGL2RenderingContext, kesz: (nev: string) => void): Promise<KepzesProgramok> {
    const egy = async (nev: string, vs: string, fs: string): Promise<WebGLProgram> => {
      const p = await programAsync(gl, vs, fs)
      kesz(nev)
      return p.prog
    }
    return new KepzesProgramok(gl, await Promise.all([egy('forms', KEPZES_VS, PART_FS), egy('streaks', KEPZES_VS_L, LINE_FS), egy('rules', VONAL_VS, GRID_FS)] as const))
  }

  dispose(): void {
    for (const p of [this.resz, this.csova, this.vonal]) this.gl.deleteProgram(p.prog)
  }
}

export class Kepzes implements Jelenet {
  readonly id: string
  readonly feliratok: readonly Felirat[]
  private readonly gl: WebGL2RenderingContext
  private readonly adat: KepzesAdat
  private readonly pr: KepzesProgramok
  private readonly texCel: WebGLTexture
  private readonly nCel: number
  private readonly vao: WebGLVertexArrayObject
  private readonly vaoVonal: WebGLVertexArrayObject
  private readonly vboVonal: WebGLBuffer
  private readonly vonalDb: number

  constructor(gl: WebGL2RenderingContext, adat: KepzesAdat, pr: KepzesProgramok) {
    this.gl = gl
    this.adat = adat
    this.pr = pr
    this.id = adat.id
    this.feliratok = adat.feliratok
    const { adat: rec, db } = celTomb(adat.celok)
    this.nCel = db
    // the targets as a float texture, padded to whole rows
    const texel = db * 4
    const sorok = Math.max(1, Math.ceil(texel / CEL_SZEL))
    const pad = new Float32Array(CEL_SZEL * sorok * 4)
    pad.set(rec)
    this.texCel = texRGBA32F(gl, CEL_SZEL, sorok, pad)
    this.vao = gl.createVertexArray()
    // the hairlines as one static buffer
    this.vonalDb = adat.vonalak.adat.length / VONAL_KULCS
    this.vaoVonal = gl.createVertexArray()
    gl.bindVertexArray(this.vaoVonal)
    this.vboVonal = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboVonal)
    gl.bufferData(gl.ARRAY_BUFFER, adat.vonalak.adat, gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(pr.vonal.prog, 'a_p')
    const aK = gl.getAttribLocation(pr.vonal.prog, 'a_k')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, VONAL_KULCS * 4, 0)
    gl.enableVertexAttribArray(aK)
    gl.vertexAttribPointer(aK, 3, gl.FLOAT, false, VONAL_KULCS * 4, 12)
    gl.bindVertexArray(null)
  }

  poz(p: number, asp: number, kam: Kamera): Poz & { forma: number } {
    const c = this.adat.poz(p, asp, kam)
    return { eye: c.eye, tgt: c.tgt, fov: c.fov, shift: c.shift, forma: c.forma }
  }

  minta(p: number, asp: number): number | null {
    return this.adat.minta(p, asp)
  }

  ertek(p: number, asp: number): number | null {
    return this.adat.ertek(p, asp)
  }

  rajz(k: Kocka, poz: Poz): Vetites {
    const gl = this.gl
    const A = this.adat
    const N = k.nezet
    const pl = k.p
    const v = nez(poz.eye, poz.tgt)
    const vp = mul(persp(poz.fov, k.asp, 0.1, 200, poz.shift ?? 0), v.m)
    const ora = A.ora(pl)
    const kesz = A.idotartam + 1
    const c01 = korl(ora / kesz, 0, 1) // how far the scene has formed, 0..1
    const n = Math.max(1000, Math.floor(k.db * A.resz))
    const nTukor = Math.min(n, TUKOR_MAX)
    const maxPont = Math.min(0.03 * k.k, k.maxPont)
    const fokusz = Math.max(1, Math.hypot(poz.tgt[0] - poz.eye[0], poz.tgt[1] - poz.eye[1], poz.tgt[2] - poz.eye[2]))
    const ln = korl(N.ln, 0, 1) // the comets' gain: with comets, the particles on their way in are comets and the settled ones points
    const csop = A.csoportok(pl)
    const farok = korl(N.len * 60, 0.05, 4) // a comet's length in world units (the look's number is a fraction of the first scene's ribbon)
    const grp = new Float32Array(CSOPORT_MAX * 4)
    grp.set(csop.subarray(0, CSOPORT_MAX * 4))

    /** Every uniform of a particle draw, through the locations of the program that is about to draw. `g`: the draw's brightness factor (the mirror's share); `tukor`: mirrored, with this gain; `gyuru`: the ring pass. */
    const be = (u: Record<Egyenruha, WebGLUniformLocation | null>, g: number, tukor: number, gyuru: boolean): void => {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.texCel)
      gl.uniform1i(u.u_cel, 0)
      gl.uniformMatrix4fv(u.u_vp, false, vp)
      gl.uniform3f(u.u_eye, poz.eye[0], poz.eye[1], poz.eye[2])
      gl.uniform3f(u.u_right, v.right[0], v.right[1], v.right[2])
      gl.uniform3f(u.u_up, v.up[0], v.up[1], v.up[2])
      gl.uniform4f(u.u_a, k.t, ora, this.nCel, A.idotartam)
      gl.uniform4f(u.u_b, A.erkezes[0], A.erkezes[1], A.erkezes[2], A.tavolsag)
      gl.uniform4f(u.u_c, k.k, maxPont, A.szoras, farok)
      gl.uniform4f(u.u_d, k.mutato.x, k.mutato.y, k.mutato.er, k.asp)
      gl.uniform4f(u.u_f, fokusz, N.ap, N.bok * k.k, N.ap > 0 ? 1 : 0)
      gl.uniform4f(u.u_g, ((REF_DB * A.resz) / n) * g, ln, A.ero * N.ex * 2.5, k.giris) // the same brightness whatever the particle count; the look's comet gain decides what arrives as a comet
      gl.uniform4f(u.u_h, N.sp, N.sz, N.tail, 0)
      gl.uniform4f(u.u_n, tukor > 0 ? 1 : 0, A.padlo, tukor, gyuru ? 1 : 0)
      gl.uniform4fv(u.u_grp, grp)
      gl.uniform3f(u.u_pen, k.szinek.toll[0], k.szinek.toll[1], k.szinek.toll[2])
      gl.uniform3f(u.u_hot, k.szinek.forro[0], k.szinek.forro[1], k.szinek.forro[2])
    }
    const pont = (db: number, g: number, tukor = 0): void => rajzol(gl, this.pr.resz, gl.POINTS, 0, db, (u) => be(u, g, tukor, false))
    const csovak = (db: number, g: number, tukor = 0): void => rajzol(gl, this.pr.csova, gl.LINES, 0, 2 * db, (u) => be(u, g, tukor, false))
    const gyuruk = (tukor = 0): void => rajzol(gl, this.pr.resz, gl.POINTS, 0, this.nCel, (u) => be(u, 1, tukor, true))
    /** The hairlines: one draw of the whole buffer; the layer strengths are the look's gains times how far the scene has formed (the floor first, the frames last). */
    const vonalak = (tukor = 0): void => {
      gl.bindVertexArray(this.vaoVonal)
      rajzol(gl, this.pr.vonal, gl.LINES, 0, this.vonalDb, (u) => {
        gl.uniformMatrix4fv(u.u_vp, false, vp)
        gl.uniform3f(u.u_eye, poz.eye[0], poz.eye[1], poz.eye[2])
        gl.uniform4f(u.u_l, N.gr * sm(0, 0.3, c01), N.gr2 * sm(0.1, 0.5, c01), N.fr * sm(0.35, 0.8, c01), N.th * 0.5 * sm(0.15, 0.6, c01))
        gl.uniform4f(u.u_n, tukor > 0 ? 1 : 0, A.padlo, tukor, 0)
        gl.uniform4fv(u.u_grp, grp)
        gl.uniform3f(u.u_ink, k.szinek.tinta[0], k.szinek.tinta[1], k.szinek.tinta[2])
        gl.uniform3f(u.u_pen, k.szinek.toll[0], k.szinek.toll[1], k.szinek.toll[2])
        gl.uniform3f(u.u_hot, k.szinek.forro[0], k.szinek.forro[1], k.szinek.forro[2])
      })
      gl.bindVertexArray(this.vao)
    }

    gl.bindVertexArray(this.vao)
    gl.enable(gl.BLEND)
    gl.blendColor(k.gain, k.gain, k.gain, 1)
    gl.blendFunc(gl.CONSTANT_COLOR, gl.ONE)
    if (N.gr > 0 || N.gr2 > 0 || N.fr > 0 || N.th > 0) {
      vonalak()
      if (N.rf > 0) vonalak(N.rf)
    }
    // the glossy floor: the particles again, upside down and dim
    if (N.rf > 0) {
      const g = (N.rf * n) / nTukor
      pont(nTukor, g, N.rf)
      if (ln > 0.004) csovak(nTukor, g, N.rf)
      gyuruk(N.rf)
    }
    if (ln > 0.004) csovak(n, 1)
    pont(n, 1)
    gyuruk()
    gl.disable(gl.BLEND)

    // where the light the shafts start from is, and where the scene's light lands on the floor (the post stack's light and its spill)
    const fy = A.feny(pl)
    const feny = fy ? projekt(vp, fy) : null
    const pf = A.padloFeny(pl)
    const fp = pf ? projekt(vp, pf.pont) : null
    const kep = pf && fp ? { u: fp[0], v: fp[1], szin: [k.szinek.toll[0] * pf.ero, k.szinek.toll[1] * pf.ero, k.szinek.toll[2] * pf.ero] as V3 } : null
    return { vp, eye: poz.eye, forma: A.poz(pl, k.asp, N.kamera).forma, feny, kep, ora }
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.texCel)
    gl.deleteVertexArray(this.vao)
    gl.deleteVertexArray(this.vaoVonal)
    gl.deleteBuffer(this.vboVonal)
  }
}

