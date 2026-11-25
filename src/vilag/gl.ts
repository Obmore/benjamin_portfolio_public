// The small raw WebGL2 helper of the world: context with the performance-caveat gate, asynchronous program build (KHR_parallel_shader_compile polled once per frame where it exists),
// textures and render targets. No library.

export function kontextus(vaszon: HTMLCanvasElement, szigoru: boolean): WebGL2RenderingContext | null {
  try {
    return vaszon.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: szigoru,
    })
  } catch {
    return null
  }
}

export interface Program {
  prog: WebGLProgram
  /** Milliseconds from the start of the compile to the link status being readable. */
  ms: number
  parhuzamos: boolean
}

/** Compiles and links without blocking the main thread where KHR_parallel_shader_compile exists. Rejects with the driver's log when a shader does not compile or link. */
export function programAsync(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): Promise<Program> {
  const t0 = performance.now()
  const ext = gl.getExtension('KHR_parallel_shader_compile')
  const shader = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)
    if (!s) throw new Error('shader: createShader failed')
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const vs = shader(gl.VERTEX_SHADER, vsSrc)
  const fs = shader(gl.FRAGMENT_SHADER, fsSrc)
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  const kesz = (): Program => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`shader: ${gl.getProgramInfoLog(prog) || gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || 'link failed'}`)
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    return { prog, ms: performance.now() - t0, parhuzamos: !!ext }
  }
  return new Promise((resolve, reject) => {
    const varj = (): void => {
      try {
        if (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) {
          requestAnimationFrame(varj)
          return
        }
        resolve(kesz())
      } catch (e) {
        reject(e)
      }
    }
    // Where the extension exists the status is polled once per frame; without it the status query would block anyway, so the main thread gets one turn first.
    if (ext) requestAnimationFrame(varj)
    else setTimeout(varj, 0)
  })
}

function textura(gl: WebGL2RenderingContext, w: number, h: number, belso: number, formatum: number, tipus: number, adat: ArrayBufferView): WebGLTexture {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, belso, w, h, 0, formatum, tipus, adat)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}
export const texR32F = (gl: WebGL2RenderingContext, w: number, h: number, f32: Float32Array): WebGLTexture => textura(gl, w, h, gl.R32F, gl.RED, gl.FLOAT, f32)
export const texRGBA32F = (gl: WebGL2RenderingContext, w: number, h: number, f32: Float32Array): WebGLTexture => textura(gl, w, h, gl.RGBA32F, gl.RGBA, gl.FLOAT, f32)
export const texRGBA8 = (gl: WebGL2RenderingContext, w: number, h: number, u8: Uint8Array): WebGLTexture => textura(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, u8)

export type Uniformok<K extends string> = Record<K, WebGLUniformLocation | null>
export function uniformok<K extends string>(gl: WebGL2RenderingContext, prog: WebGLProgram, nevek: readonly K[]): Uniformok<K> {
  const m = {} as Uniformok<K>
  for (const n of nevek) m[n] = gl.getUniformLocation(prog, n)
  return m
}

/** A linked program and the uniform locations that are ITS OWN (a location of another program draws nothing, silently: the review found markers that never drew for exactly that). */
export interface Prog<K extends string> {
  prog: WebGLProgram
  u: Uniformok<K>
}

/** Links a compiled program with the names of its uniforms. */
export const progU = <K extends string>(gl: WebGL2RenderingContext, prog: WebGLProgram, nevek: readonly K[]): Prog<K> => ({ prog, u: uniformok(gl, prog, nevek) })

/**
 * The only way the world makes a draw call (apart from the full-screen passes of the post stack, which use `pass`): it makes `p` the current program, lets `be` set the uniforms through
 * `p`'s own locations, then draws. A draw can therefore never run under another program or with another program's locations.
 */
export function rajzol<K extends string>(gl: WebGL2RenderingContext, p: Prog<K>, mod: number, elso: number, db: number, be?: (u: Uniformok<K>) => void): void {
  gl.useProgram(p.prog)
  be?.(p.u)
  gl.drawArrays(mod, elso, db)
}

/** A render target: a texture and the framebuffer that draws into it. */
export interface Cel {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
  w: number
  h: number
  /** The framebuffer was complete (a half-float target is refused on some mobile GPUs). */
  ok: boolean
}

export function celKeszit(gl: WebGL2RenderingContext, w: number, h: number, hdr: boolean): Cel {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return { tex, fbo, w, h, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE }
}

export function celTorol(gl: WebGL2RenderingContext, c: Cel): void {
  gl.deleteTexture(c.tex)
  gl.deleteFramebuffer(c.fbo)
}
