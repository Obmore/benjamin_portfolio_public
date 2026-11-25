// The loader scene: the instrument powers on. While the world's own programs compile and its textures are built, the same canvas shows the first look (Mérőműszer) at its opening pose with
// only two layers: the floor (rails and rungs) fading in, and the thread through the 480 true samples drawing itself, from the oldest minute toward the newest, as far as the REAL loading stages
// have got (n / N; hud.ts says the numbers). A bright pen runs at the end of the line. No bloom and no particles (they come in once the world is ready), so one tiny program is enough, and it
// compiles first. The thread is a ribbon made of the very samples the world draws, with the same geometry and camera, so when the world is ready its first frame is this one plus the atmosphere.
// Nothing here is a fake bar: the length of the line is the fraction of real stages done.
import { programAsync, progU, rajzol, texR32F, type Prog } from './gl.ts'
import type { Szinek } from './jelenet.ts'
import { mul, nez, persp } from './matek.ts'
import { AMPY, FOV, LZ, palya, type Palya } from './palya.ts'
import { KAMERA_NYITAS } from './nezet.ts'
import { RACS_KULCS, racs } from './racs.ts'

export const TOLT_VS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
in vec3 a_p; in vec2 a_k;   // the floor's lines only: position; (kind 0 rail, 1 minute rung, 2 hour rung; t across the floor -1..1)
uniform sampler2D u_ser;    // R32F, N x 1: the true series, index 0 = oldest minute
uniform mat4 u_vp; uniform vec3 u_eye, u_col, u_pen, u_hot, u_pp;
uniform vec4 u_a;           // how much of the run is drawn (0..1), the floor's gain, the line's gain, 0
uniform vec4 u_b;           // N - 1, series minimum, series maximum, mode (0 floor lines, 1 ribbon, 2 pen)
uniform vec4 u_c;           // canvas px width and height, half width of the ribbon in px, the shape (0 sharp core, 1 soft halo, 2 pen sprite)
uniform vec2 u_d;           // ribbon length (world), height amplitude (world)
out vec3 v_c; out vec2 v_e;
float cx(float u){ return 2.2 * sin(u * 9.0) + 0.9 * sin(u * 23.0 + 1.3); }
vec3 pt(int i){
  float us = 1.0 - float(i) / u_b.x;
  float val = texelFetch(u_ser, ivec2(i, 0), 0).r;
  return vec3(cx(us), (clamp((val - u_b.y) / max(u_b.z - u_b.y, 1e-3), 0.0, 1.0) - 0.5) * u_d.y, -us * u_d.x);
}
void main(){
  v_e = vec2(0.0, u_c.w);
  int md = int(u_b.w + 0.5);
  if (md == 1) {   // the thread: a ribbon of constant pixel width through the samples, hotter toward the pen
    int n1 = int(u_b.x + 0.5);
    int i = gl_VertexID >> 1;
    float side = float(gl_VertexID & 1) * 2.0 - 1.0;
    vec3 p0 = pt(i);
    vec4 c0 = u_vp * vec4(p0, 1.0);
    vec4 cp = u_vp * vec4(pt(max(i - 1, 0)), 1.0);
    vec4 cn = u_vp * vec4(pt(min(i + 1, n1)), 1.0);
    vec2 hr = 0.5 * u_c.xy;
    vec2 s0 = c0.xy / c0.w * hr;
    vec2 d = normalize((s0 - cp.xy / cp.w * hr) + (cn.xy / cn.w * hr - s0) + vec2(1e-4, 0.0));
    vec2 off = vec2(-d.y, d.x) * side * u_c.z;
    gl_Position = c0 + vec4(off / hr * c0.w, 0.0, 0.0);
    float t = float(i) / u_b.x;
    float heat = exp(-(u_a.x - t) * 14.0);
    float vis = 1.0 - smoothstep(u_a.x - 0.006, u_a.x, t);
    float ds = length(p0 - u_eye);
    v_c = mix(u_pen, u_hot, 0.6 + 0.4 * heat) * (0.55 + 0.9 * heat) * u_a.z * vis * exp(-ds * 0.03) * smoothstep(0.7, 2.6, ds);
    v_e.x = side;
  } else if (md == 2) {   // the pen: a sprite at the end of the line
    gl_Position = u_vp * vec4(u_pp, 1.0);
    gl_PointSize = u_c.z;
    v_c = u_hot * u_a.z * smoothstep(0.7, 2.6, length(u_pp - u_eye));
  } else {   // the floor
    vec4 cs = u_vp * vec4(a_p, 1.0);
    gl_Position = cs;
    float d = length(a_p - u_eye);
    float across = 1.0 - smoothstep(0.55, 1.0, abs(a_k.y));
    float g = a_k.x < 0.5 ? 0.16 : (a_k.x < 1.5 ? 0.10 : 0.42);
    v_c = u_col * g * across * u_a.y * exp(-d * 0.035) * smoothstep(1.0, 4.0, d);
  }
}`
// The loader draws straight to the screen (no post stack), so its colours are made sRGB here; the world's own composite does the same on its way out.
export const TOLT_FS = `#version 300 es
precision highp float;
in vec3 v_c; in vec2 v_e; out vec4 o;
vec3 lin2srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  float g;
  if (v_e.y < 0.5) g = 1.0 - smoothstep(0.5, 1.0, abs(v_e.x));
  else if (v_e.y < 1.5) g = exp(-v_e.x * v_e.x * 3.0);
  else { vec2 q = gl_PointCoord * 2.0 - 1.0; g = pow(max(1.0 - dot(q, q), 0.0), 2.0); }
  o = vec4(lin2srgb(v_c * g), 1.0);
}`

const srgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

const U = ['u_ser', 'u_vp', 'u_eye', 'u_col', 'u_pen', 'u_hot', 'u_pp', 'u_a', 'u_b', 'u_c', 'u_d'] as const

export interface ToltoszalAdat {
  ertekek: readonly number[]
  kezdetPerc: number
  oszlop: number
  sor: number
}

/** The (fractional) index of the last sample drawn for a progress `a` (0..1 of the run, oldest first). */
export function toltesIndex(a: number, n: number): number {
  return Math.min(1, Math.max(0, a)) * (n - 1)
}

export class Toltoszal {
  readonly palya: Palya
  private readonly gl: WebGL2RenderingContext
  private readonly prog: Prog<(typeof U)[number]>
  private readonly vaoPadlo: WebGLVertexArrayObject
  private readonly vaoUres: WebGLVertexArrayObject
  private readonly vbo: WebGLBuffer
  private readonly tex: WebGLTexture
  private readonly nPadlo: number
  private readonly n: number

  private constructor(gl: WebGL2RenderingContext, adat: ToltoszalAdat, prog: WebGLProgram) {
    this.gl = gl
    this.palya = palya(adat.ertekek, adat.oszlop, adat.sor, adat.kezdetPerc)
    this.prog = progU(gl, prog, U)
    this.n = adat.ertekek.length
    this.tex = texR32F(gl, this.n, 1, Float32Array.from(adat.ertekek))
    // the floor's rails and rungs, without the drop lines (they hang from a thread that is not drawn yet) and without the curtain
    const g = racs(this.palya, this.n, adat.oszlop, adat.sor)
    this.nPadlo = g.esikTol
    this.vaoPadlo = gl.createVertexArray()
    gl.bindVertexArray(this.vaoPadlo)
    this.vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, g.adat.subarray(0, g.esikTol * RACS_KULCS), gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(prog, 'a_p')
    const aK = gl.getAttribLocation(prog, 'a_k')
    gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, RACS_KULCS * 4, 0)
    gl.enableVertexAttribArray(aK)
    gl.vertexAttribPointer(aK, 2, gl.FLOAT, false, RACS_KULCS * 4, 12)
    // the ribbon and the pen read no attribute (everything comes from the series texture), so they draw under a vertex array with none enabled
    this.vaoUres = gl.createVertexArray()
    gl.bindVertexArray(null)
  }

  /** Compiles the program (the loader's own, tiny, started before the world's big ones) and counts it as a real stage. */
  static async keszit(gl: WebGL2RenderingContext, adat: ToltoszalAdat, kesz: (nev: string) => void): Promise<Toltoszal> {
    // The stage counts whatever happens: the loader scene is cosmetic, so a driver that cannot build it (or a constructor that throws) must not keep the world from being ready. The caller logs
    // the rejection and goes on without the scene.
    try {
      const p = await programAsync(gl, TOLT_VS, TOLT_FS)
      return new Toltoszal(gl, adat, p.prog)
    } finally {
      kesz('loader')
    }
  }

  /**
   * Draws the loader scene straight to the canvas (the default framebuffer, `w` x `h` device pixels, `dpx` device pixels per CSS pixel): the floor at `padlo` gain and the thread to `arany` of
   * the run, with the pen at its end. The camera is the world's own opening pose under Mérőműszer (the same eye, target and lens), so the next frame the world draws lines up with this one.
   */
  rajz(arany: number, padlo: number, w: number, h: number, dpx: number, szinek: Szinek): void {
    const gl = this.gl
    const P = this.palya
    const asp = w / h
    const poz = P.poz(0, asp, KAMERA_NYITAS)
    const v = nez(poz.eye, poz.tgt)
    const vp = mul(persp(FOV, asp, 0.1, 200, poz.shift), v.m)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, w, h)
    gl.clearColor(srgb(szinek.hatter[0]), srgb(szinek.hatter[1]), srgb(szinek.hatter[2]), 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    // the pen's place: between the last two samples drawn
    const i = toltesIndex(arany, this.n)
    const i0 = Math.floor(i)
    const i1 = Math.min(this.n - 1, i0 + 1)
    const f = i - i0
    const c0 = P.szalag(P.uIdx(i0))
    const c1 = P.szalag(P.uIdx(i1))
    const pen: [number, number, number] = [c0.x + (c1.x - c0.x) * f, c0.y + (c1.y - c0.y) * f, P.zIdx(i0) + (P.zIdx(i1) - P.zIdx(i0)) * f]
    const be = (mod: number, szel: number, forma: number, nyer: number) => (u: Record<(typeof U)[number], WebGLUniformLocation | null>): void => {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.tex)
      gl.uniform1i(u.u_ser, 0)
      gl.uniformMatrix4fv(u.u_vp, false, vp)
      gl.uniform3f(u.u_eye, poz.eye[0], poz.eye[1], poz.eye[2])
      gl.uniform3f(u.u_col, szinek.tinta[0], szinek.tinta[1], szinek.tinta[2])
      gl.uniform3f(u.u_pen, szinek.toll[0], szinek.toll[1], szinek.toll[2])
      gl.uniform3f(u.u_hot, szinek.forro[0], szinek.forro[1], szinek.forro[2])
      gl.uniform3f(u.u_pp, pen[0], pen[1], pen[2])
      gl.uniform4f(u.u_a, arany, padlo, nyer, 0)
      gl.uniform4f(u.u_b, this.n - 1, P.min, P.max, mod)
      gl.uniform4f(u.u_c, w, h, szel * dpx, forma)
      gl.uniform2f(u.u_d, LZ, AMPY)
    }
    if (padlo > 0) {
      gl.bindVertexArray(this.vaoPadlo)
      rajzol(gl, this.prog, gl.LINES, 0, this.nPadlo, be(0, 0, 0, 0))
    }
    if (arany > 0) {
      gl.bindVertexArray(this.vaoUres)
      // a soft halo (the world's bloom is not here), the sharp core, then the pen: a wide soft sprite and a small bright one
      rajzol(gl, this.prog, gl.TRIANGLE_STRIP, 0, 2 * this.n, be(1, 5, 1, 0.3))
      rajzol(gl, this.prog, gl.TRIANGLE_STRIP, 0, 2 * this.n, be(1, 1.4, 0, 1))
      rajzol(gl, this.prog, gl.POINTS, 0, 1, be(2, 38, 2, 0.45))
      rajzol(gl, this.prog, gl.POINTS, 0, 1, be(2, 9, 2, 1.6))
    }
    gl.disable(gl.BLEND)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    this.gl.deleteVertexArray(this.vaoPadlo)
    this.gl.deleteVertexArray(this.vaoUres)
    this.gl.deleteBuffer(this.vbo)
    this.gl.deleteTexture(this.tex)
    this.gl.deleteProgram(this.prog.prog)
  }
}
