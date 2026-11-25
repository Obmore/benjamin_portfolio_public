// The post-processing stack: the scene is drawn into an HDR target, a three-level bloom chain (bright pass, then down-sampled and blurred copies) is built from it, the optional light shafts are
// made from the bloom's second level, and one composite pass adds them, a colour fringe, the backdrop glow, the exposure and the shoulder (soft clipping), the vignette and the
// grain on its way to the screen. Atmosphere only: nothing here changes what a sample means.
// What each pass does and how strongly is the look's number (nezet.ts, with the switches applied): a pass whose strength is 0 is skipped and costs nothing. The light tier drops the third bloom
// level (two blur passes less) and the fringe.
import { BRIGHT_FS, BLUR_FS, COMP_FS, FULL_VS, SHAFT_FS } from './arnyekolok.ts'
import { celKeszit, celTorol, programAsync, progU, type Cel, type Prog } from './gl.ts'
import { hatasokMasolat, type HatasKapcsolo, type HatasNev } from './hatasok.ts'
import type { Szinek } from './jelenet.ts'
import { korl, sm } from './matek.ts'
import type { Nezet } from './nezet.ts'
import type { Szint } from './tipusok.ts'

export { ALAP_HATASOK, type HatasKapcsolo, type HatasNev } from './hatasok.ts'

/** What the scene and the engine say about this frame (the post stack runs what the look says). */
export interface HatasBemenet {
  /** The look with the switches applied (nezet.ts `hatasos`). */
  nezet: Nezet
  /** 0..1: how far the scene's picture has formed; the bloom calms and the light shafts fade as it does (a picture is read, not glowed at). */
  forma: number
  /** The world is still (reduced motion or the calm key): no grain. */
  mozdulatlan: boolean
  /** Frame counter, the grain's seed. */
  kocka: number
  /** Where the light shafts start from, in uv, or null when the light is behind the camera. */
  feny: readonly [number, number] | null
  /** Where the picture's light lands on the floor, in uv, and its colour, or null when that place is behind the camera. */
  kep: { u: number; v: number; szin: readonly [number, number, number] } | null
  /** 0..1: the glow coming in after the world opens. */
  giris: number
}

const BRIGHT_U = ['u_src', 'u_thr'] as const
const BLUR_U = ['u_src', 'u_dir'] as const
const COMP_U = ['u_scene', 'u_b0', 'u_b1', 'u_b2', 'u_sh', 'u_p', 'u_q', 'u_gl', 'u_gc', 'u_g2', 'u_g2c', 'u_res', 'u_bg', 'u_w'] as const
const SHAFT_U = ['u_src', 'u_l'] as const

export class Utofeldolgozas {
  readonly gl: WebGL2RenderingContext
  /** HDR targets are used while the GPU completes them; a refused half-float target drops the stack to 8-bit. */
  hdr: boolean
  w = 0
  h = 0
  /** The switches and factors: a copy of the defaults that the caller may change at any time. */
  readonly hatasok: Record<HatasNev, HatasKapcsolo>
  private readonly bright: Prog<(typeof BRIGHT_U)[number]>
  private readonly blur: Prog<(typeof BLUR_U)[number]>
  private readonly comp: Prog<(typeof COMP_U)[number]>
  private readonly shaft: Prog<(typeof SHAFT_U)[number]>
  private F: { scene: Cel; b0a: Cel; b0b: Cel; b1a: Cel; b1b: Cel; b2a: Cel; b2b: Cel; sh: Cel } | null = null
  private readonly jegyzet: (s: string) => void

  private constructor(gl: WebGL2RenderingContext, hdr: boolean, p: readonly [WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram], jegyzet: (s: string) => void, hatasok?: Partial<Record<HatasNev, Partial<HatasKapcsolo>>>) {
    this.gl = gl
    this.hdr = hdr
    this.hatasok = hatasokMasolat(hatasok)
    this.jegyzet = jegyzet
    this.bright = progU(gl, p[0], BRIGHT_U)
    this.blur = progU(gl, p[1], BLUR_U)
    this.comp = progU(gl, p[2], COMP_U)
    this.shaft = progU(gl, p[3], SHAFT_U)
  }

  /** Compiles the four programs (in parallel where the driver allows), counting each one through `kesz`. */
  static async keszit(gl: WebGL2RenderingContext, hdr: boolean, kesz: (nev: string) => void, jegyzet: (s: string) => void, hatasok?: Partial<Record<HatasNev, Partial<HatasKapcsolo>>>): Promise<Utofeldolgozas> {
    const egy = async (nev: string, fs: string): Promise<WebGLProgram> => {
      const p = await programAsync(gl, FULL_VS, fs)
      kesz(nev)
      return p.prog
    }
    const p = await Promise.all([egy('bright', BRIGHT_FS), egy('blur', BLUR_FS), egy('composite', COMP_FS), egy('shaft', SHAFT_FS)] as const)
    return new Utofeldolgozas(gl, hdr, p, jegyzet, hatasok)
  }

  /** The scene target the scenes draw into. */
  get scene(): Cel {
    if (!this.F) throw new Error('post stack: no size yet')
    return this.F.scene
  }

  /** (Re)creates the targets for a canvas of w x h device pixels; a no-op when the size is unchanged. */
  meret(w: number, h: number): void {
    const gl = this.gl
    if (this.F && w === this.w && h === this.h) return
    this.w = w
    this.h = h
    if (this.F) for (const c of Object.values(this.F)) celTorol(gl, c)
    const mk = (a: number, b: number): Cel => {
      let f = celKeszit(gl, a, b, this.hdr)
      if (!f.ok && this.hdr) {
        this.hdr = false
        this.jegyzet('HDR target incomplete: RGBA8')
        celTorol(gl, f)
        f = celKeszit(gl, a, b, false)
      }
      return f
    }
    const h2: [number, number] = [Math.ceil(w / 2), Math.ceil(h / 2)]
    const h4: [number, number] = [Math.ceil(w / 4), Math.ceil(h / 4)]
    const h8: [number, number] = [Math.ceil(w / 8), Math.ceil(h / 8)]
    this.F = { scene: mk(w, h), b0a: mk(...h2), b0b: mk(...h2), b1a: mk(...h4), b1b: mk(...h4), b2a: mk(...h8), b2b: mk(...h8), sh: mk(...h4) }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private pass<K extends string>(p: Prog<K | 'u_src'>, src: Cel, dst: Cel | null, set?: () => void): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null)
    gl.viewport(0, 0, dst ? dst.w : this.w, dst ? dst.h : this.h)
    gl.useProgram(p.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.uniform1i(p.u.u_src, 0)
    set?.()
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private elmos(a: Cel, b: Cel): void {
    const gl = this.gl
    this.pass(this.blur, a, b, () => gl.uniform2f(this.blur.u.u_dir, 1 / b.w, 0))
    this.pass(this.blur, b, a, () => gl.uniform2f(this.blur.u.u_dir, 0, 1 / a.h))
  }

  /**
   * Builds the bloom chain from the scene target (when the bloom or the shafts need it), the shafts, and composites to the screen. The strengths are the look's
   * (`be.nezet`); a pass at 0 does not run. `szinek.hatter` is the ground colour the vignette fades to and `szinek.toll` the glow's colour (linear light).
   */
  rajzol(szint: Szint, szinek: Szinek, be: HatasBemenet): void {
    const gl = this.gl
    const F = this.F
    if (!F) return
    const N = be.nezet
    const harom = szint === 'teljes'
    const bloomBe = N.bl > 0
    const nyalab = be.feny && N.sh * (1 - be.forma) > 0 ? N.sh * (1 - be.forma) : 0
    if (bloomBe || nyalab > 0) {
      const kopi = (src: Cel, dst: Cel): void => this.pass(this.bright, src, dst, () => gl.uniform1f(this.bright.u.u_thr, -1))
      this.pass(this.bright, F.scene, F.b0a, () => gl.uniform1f(this.bright.u.u_thr, 0.55))
      this.elmos(F.b0a, F.b0b)
      kopi(F.b0a, F.b1a)
      this.elmos(F.b1a, F.b1b)
      if (harom) {
        kopi(F.b1a, F.b2a)
        this.elmos(F.b2a, F.b2b)
      }
    }
    if (nyalab > 0 && be.feny) {
      // light shafts: a radial march from the light through the glow
      const [fu, fv] = be.feny
      this.pass(this.shaft, F.b1a, F.sh, () => gl.uniform3f(this.shaft.u.u_l, korl(fu, -0.3, 1.3), korl(fv, -0.3, 1.3), nyalab))
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.w, this.h)
    gl.useProgram(this.comp.prog)
    const C = this.comp.u
    ;[F.scene, F.b0a, F.b1a, harom ? F.b2a : F.b1a, nyalab > 0 ? F.sh : F.b2a].forEach((f, i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, f.tex)
    })
    gl.uniform1i(C.u_scene, 0)
    gl.uniform1i(C.u_b0, 1)
    gl.uniform1i(C.u_b1, 2)
    gl.uniform1i(C.u_b2, 3)
    gl.uniform1i(C.u_sh, 4)
    const szemcse = be.mozdulatlan ? 0 : N.szem
    gl.uniform4f(C.u_p, bloomBe ? N.bl * (1 - N.blE * be.forma) * be.giris : 0, szemcse, harom ? N.szeg * (1 - be.forma) : 0, szemcse > 0 ? be.kocka : 0) // the picture is read, not fringed
    gl.uniform4f(C.u_q, nyalab, N.vg, N.xp, 0)
    gl.uniform4f(C.u_gl, 0.05 * N.gl * (1 - 0.6 * be.forma), 0.5, 0.5, 0.6)
    gl.uniform3f(C.u_gc, szinek.toll[0], szinek.toll[1], szinek.toll[2])
    // the picture's light on the floor: rises as the picture forms, in the picture's own mean colour
    const kep = be.kep
    const fe = kep ? N.fe * sm(0.5, 0.95, be.forma) : 0
    gl.uniform4f(C.u_g2, 0.07 * fe, kep ? kep.u : 0.5, kep ? kep.v : 0.2, 0.09)
    gl.uniform3f(C.u_g2c, kep ? kep.szin[0] : 0, kep ? kep.szin[1] : 0, kep ? kep.szin[2] : 0)
    gl.uniform2f(C.u_res, this.w, this.h)
    gl.uniform3f(C.u_bg, szinek.hatter[0], szinek.hatter[1], szinek.hatter[2])
    if (harom) gl.uniform3f(C.u_w, 0.45, 0.6, 0.8)
    else gl.uniform3f(C.u_w, 0.5, 0.7, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  megsemmisit(): void {
    if (this.F) for (const c of Object.values(this.F)) celTorol(this.gl, c)
    this.F = null
    for (const p of [this.bright, this.blur, this.comp, this.shaft]) this.gl.deleteProgram(p.prog)
  }
}
