// Small math helpers of the world (no DOM, no GL: the node tests import this file). Matrices are column-major Float32Arrays, as WebGL wants them.

export type V3 = readonly [number, number, number]

export const korl = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x))

/** Smoothstep between a and b. */
export const sm = (a: number, b: number, x: number): number => {
  const t = korl((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      o[c * 4 + r] = s
    }
  }
  return o
}

/** A perspective projection. `ys` is a lens shift: the picture moves up by `ys` in normalised device coordinates (the camera stays level, so verticals stay vertical). */
export function persp(fov: number, asp: number, n: number, f: number, ys = 0): Float32Array {
  const t = 1 / Math.tan(fov / 2)
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, -ys, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0])
}

const nrm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export interface Nezet {
  m: Float32Array
  right: V3
  up: V3
}

/** A look-at view matrix (y up) and the camera's right and up vectors in world space. */
export function nez(eye: V3, center: V3): Nezet {
  const f = nrm([center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]])
  const s = nrm(cross(f, [0, 1, 0]))
  const u = cross(s, f)
  return { m: new Float32Array([s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1]), right: s, up: u }
}

/** A world point through a view-projection matrix, to uv (0..1, 0 = left / bottom), or null when it is behind the camera (the same cut-off the labels use). */
export function projekt(vp: Float32Array, p: V3): readonly [number, number] | null {
  const cw = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15]
  if (cw <= 0.5) return null
  return [((vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12]) / cw) * 0.5 + 0.5, ((vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13]) / cw) * 0.5 + 0.5]
}

/** Linear blend of two points. */
export const kevP = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
