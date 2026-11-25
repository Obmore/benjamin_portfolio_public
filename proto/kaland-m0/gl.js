// The small raw WebGL2 helper of the prototype (the plan's gl.ts): context with the performance-caveat gate, asynchronous program build
// (KHR_parallel_shader_compile polled once per frame), textures, buffers. No library.

export function kontextus(canvas, szigoru) {
  try {
    return canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: szigoru,
    })
  } catch {
    return null
  }
}

/** The unmasked renderer string where the browser allows reading it. */
export function rendererNev(gl) {
  const e = gl.getExtension('WEBGL_debug_renderer_info')
  return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
}

/** Software renderers the gate refuses (the plan, section 2.0). */
export const SZOFTVERES = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|warp/i

/** Compiles and links without blocking the main thread where KHR_parallel_shader_compile exists. Resolves { prog, ms }. */
export function programAsync(gl, vsSrc, fsSrc) {
  const t0 = performance.now()
  const ext = gl.getExtension('KHR_parallel_shader_compile')
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const vs = shader(gl.VERTEX_SHADER, vsSrc)
  const fs = shader(gl.FRAGMENT_SHADER, fsSrc)
  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  const kesz = () => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`shader: ${gl.getProgramInfoLog(prog) || gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs)}`)
    }
    gl.deleteShader(vs); gl.deleteShader(fs)
    return { prog, ms: performance.now() - t0, parhuzamos: !!ext }
  }
  return new Promise((resolve, reject) => {
    const varj = () => {
      try {
        if (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) return requestAnimationFrame(varj)
        resolve(kesz())
      } catch (e) { reject(e) }
    }
    if (ext) requestAnimationFrame(varj)
    else setTimeout(varj, 0) // no extension: the status query would block anyway; give the main thread one turn first
  })
}

export function textura(gl, w, h, belso, formatum, tipus, adat) {
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
export const texR32F = (gl, w, h, f32) => textura(gl, w, h, gl.R32F, gl.RED, gl.FLOAT, f32)
export const texRGBA8 = (gl, w, h, u8) => textura(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, u8)

/** Static instance buffer of (column, row) pairs, far rows first so that nearer cells are drawn over farther ones (no depth buffer). */
export function peldanyPuffer(gl, cols, rows) {
  const a = new Float32Array(cols * rows * 2)
  let n = 0
  for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) { a[n++] = c; a[n++] = r }
  const b = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, b)
  gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW)
  return { buf: b, db: cols * rows }
}

export function uniformok(gl, prog, nevek) {
  const m = {}
  for (const n of nevek) m[n] = gl.getUniformLocation(prog, n)
  return m
}
