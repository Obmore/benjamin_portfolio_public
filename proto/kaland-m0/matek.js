// The one projection the shader and the probe share (the plan's matek.ts: vetit). Pure functions, no DOM.
// Model: the page is the plane z = 0 and maps 1:1 to the canvas's CSS pixels; everything else lies behind it (z <= 0).
// Camera: vertical field of view 30 degrees, principal point = the viewport's centre (given in canvas px), so scrolling moves the vanishing point.

export const FOV = (30 * Math.PI) / 180

/** Distance of the eye from the page plane, in px, for a canvas of height h (the z = 0 plane stays 1:1 for any h). */
export const fokusz = (h) => h / 2 / Math.tan(FOV / 2)

/** Scale of a point at depth z <= 0: exactly 1 on the page, smaller behind it. */
export const skala = (d, z) => d / (d - z)

/** Page px (x right, y down, canvas-local) at depth z to screen px (same frame), and the scale. */
export function vetit(x, y, z, vp, d) {
  const s = skala(d, z)
  return { x: vp[0] + (x - vp[0]) * s, y: vp[1] + (y - vp[1]) * s, s }
}

/** Geometry of one field (fall, years) or screen: where cell (col, row) sits at level 0..1, before projection. */
export function hely(g, col, row, szint = 0) {
  return { x: g.x0 + col * g.pitch, y: g.yLip + row * g.dy - szint * g.amp, z: row * g.dz }
}

/** Projected centre and half-side of a cell. */
export function vetitCella(g, col, row, szint, vp, d) {
  const p = hely(g, col, row, szint)
  const v = vetit(p.x, p.y, p.z, vp, d)
  return { x: v.x, y: v.y, fel: (g.oldal * v.s) / 2, s: v.s }
}

/** Fall plane: rows go down the screen by cos(phi) and back by sin(phi) of the row pitch along the plane, phi = angle to the page. */
export function esesSik(fiDeg, soronkent) {
  const fi = (fiDeg * Math.PI) / 180
  return { dy: soronkent * Math.cos(fi), dz: -soronkent * Math.sin(fi) }
}

/** Unit self-test: the page plane maps to itself, depth only shrinks toward the principal point. Throws on failure. */
export function onTeszt() {
  const vp = [300, 200]
  const d = fokusz(640)
  const a = vetit(123, 45, 0, vp, d)
  if (Math.abs(a.x - 123) > 1e-9 || Math.abs(a.y - 45) > 1e-9 || a.s !== 1) throw new Error('z = 0 is not the identity')
  const b = vetit(500, 400, -600, vp, d)
  if (!(b.s < 1) || !(Math.abs(b.x - vp[0]) < Math.abs(500 - vp[0])) || !(Math.abs(b.y - vp[1]) < Math.abs(400 - vp[1]))) throw new Error('depth does not converge to the principal point')
  return true
}
