// The floor of the particle scene as static line geometry, built once from the true series: two rails every 2 world units across the ribbon's length, a rung every 10 minutes (the full hours of
// the demo's clock brighter), and a drop line from the thread down to the floor at each full hour and at the true maximum and minimum (those two drawn twice: brighter). Everything on it is a
// time or a value of the run. Pure: no DOM, no GL (the node tests import it); reszecskek.ts uploads the array.
//
// Layout of one vertex: x, y, z, kind, t (5 floats; two vertices per segment, for `gl.LINES`).
//   kind 0 rail, 1 minute rung, 2 hour rung, 3 drop line, 4 the picture's frame (crop marks, ticks, dimension lines), 5 a hairline of the curtain;
//   t: across the floor -1..1 (the grid fades toward its edges), or along a drop line or a curtain hairline 0 (at the floor) .. 1 (at the thread).
// After the floor's segments come the curtain's: one vertical hairline from the thread down to the floor at every minute of the run (`curtainFrom` is the first vertex of them), then the frame of the picture.
import { AMPY, GX, LZ, PADLO, PICW, ZP, cx, type Palya } from './palya.ts'

export const RACS_KULCS = 5 // floats per vertex

export const KIND = { sin: 0, perc: 1, ora: 2, esik: 3, keret: 4, fuggony: 5 } as const

export interface Racs {
  adat: Float32Array
  /** Vertices (2 per segment). */
  db: number
  /** The first vertex of the drop lines, of the curtain's hairlines and of the picture's frame (the rails and the rungs come before all three). */
  esikTol: number
  fuggonyTol: number
  keretTol: number
}

/** The frame around the picture on its plane: how far the crop marks and the dimension lines stand off its edge, and how long the marks are. */
export const KERET = { tav: 0.22, jel: 0.7, meret: 0.95, res: 1.5 } as const

export function racs(p: Palya, n: number, oszlop = 40, sor = 48): Racs {
  const a: number[] = []
  const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, kd: number, ta: number, tb: number): void => {
    a.push(ax, ay, az, kd, ta, bx, by, bz, kd, tb)
  }
  for (let x = -GX; x <= GX; x += 2) for (let z = 6; z > -LZ - 6; z -= 2) seg(x, PADLO, z, x, PADLO, z - 2, KIND.sin, x / GX, x / GX)
  const rung = (i: number, kd: number): void => {
    for (let x = -GX; x < GX; x++) seg(x, PADLO, p.zIdx(i), x + 1, PADLO, p.zIdx(i), kd, x / GX, (x + 1) / GX)
  }
  for (let i = 0; i < n; i += 10) if (!p.oraIdx.includes(i)) rung(i, KIND.perc)
  for (const i of p.oraIdx) rung(i, KIND.ora)
  const esik = (i: number): void => {
    const u = p.uIdx(i)
    const x = cx(u)
    const z = p.zIdx(i)
    const y = (p.vnAt(u) - 0.5) * AMPY
    for (let k = 0; k < 6; k++) {
      const t0 = k / 6
      const t1 = (k + 1) / 6
      seg(x, PADLO + (y - PADLO) * t0, z, x, PADLO + (y - PADLO) * t1, z, KIND.esik, t0, t1)
    }
  }
  const esikTol = a.length / RACS_KULCS
  for (const i of p.oraIdx) esik(i)
  esik(p.iMax)
  esik(p.iMax)
  esik(p.iMin)
  esik(p.iMin)
  // the curtain: a hairline at every minute from the thread to the floor (the true samples, as a sheet of light)
  const fuggonyTol = a.length / RACS_KULCS
  for (let i = 0; i < n; i++) {
    const u = p.uIdx(i)
    const y = (p.vnAt(u) - 0.5) * AMPY
    seg(cx(u), PADLO, p.zIdx(i), cx(u), y, p.zIdx(i), KIND.fuggony, 0, 1)
  }
  // the frame of the picture, on its plane (a hair in front of the cells): the outline offset by `tav`, crop marks at the four corners, ticks every tenth column and quarter row, and two dimension lines
  // (the width above, the height at the left) broken in the middle where the label with the count stands
  const keretTol = a.length / RACS_KULCS
  const z = ZP + 0.02
  const x1 = PICW / 2 + KERET.tav
  const y0 = p.picY - p.hp / 2 - KERET.tav
  const y1 = p.picY + p.hp / 2 + KERET.tav
  const k = (ax: number, ay: number, bx: number, by: number): void => seg(ax, ay, z, bx, by, z, KIND.keret, 0, 1)
  k(-x1, y0, x1, y0)
  k(-x1, y1, x1, y1)
  k(-x1, y0, -x1, y1)
  k(x1, y0, x1, y1)
  for (const sx of [-1, 1]) {
    for (const [yy, sy] of [[y0, -1], [y1, 1]] as const) {
      k(sx * x1, yy, sx * (x1 + KERET.jel), yy)
      // the lower marks stand on the floor and stop there (the picture floats only `res` above it)
      k(sx * x1, yy, sx * x1, yy + sy * (sy < 0 ? Math.min(KERET.jel, yy - PADLO) : KERET.jel))
    }
  }
  for (let c = 0; c <= oszlop; c += 10) {
    const x = (c / oszlop - 0.5) * PICW
    k(x, y1, x, y1 + 0.16)
  }
  for (let r = 0; r <= sor; r += sor / 4) {
    const y = p.picY + p.hp / 2 - (r / sor) * p.hp
    k(-x1, y, -x1 - 0.16, y)
  }
  const yd = y1 + KERET.meret
  const xd = -x1 - KERET.meret
  k(-PICW / 2, yd, -KERET.res / 2, yd)
  k(KERET.res / 2, yd, PICW / 2, yd)
  k(-PICW / 2, yd - 0.18, -PICW / 2, yd + 0.18)
  k(PICW / 2, yd - 0.18, PICW / 2, yd + 0.18)
  k(xd, p.picY - p.hp / 2, xd, p.picY - KERET.res / 2)
  k(xd, p.picY + KERET.res / 2, xd, p.picY + p.hp / 2)
  k(xd - 0.18, p.picY - p.hp / 2, xd + 0.18, p.picY - p.hp / 2)
  k(xd - 0.18, p.picY + p.hp / 2, xd + 0.18, p.picY + p.hp / 2)
  const adat = new Float32Array(a)
  return { adat, db: adat.length / RACS_KULCS, esikTol, fuggonyTol, keretTol }
}
