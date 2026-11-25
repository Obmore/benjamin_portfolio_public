// The address as a bitmap, drawn by the browser in the site's own mono face (the only DOM-touching part of chapter 5; kapcsolat.ts takes the bitmap and is pure). The address is split before the
// "@" into two lines so that it is large on a phone as well; the text twin and the contact link carry it whole.
import type { Raszter } from './kapcsolat.ts'

/** The address in the lines the world writes it: before the "@", and from it. */
export function cimSorok(cim: string): string[] {
  const i = cim.indexOf('@')
  return i > 0 ? [cim.slice(0, i), cim.slice(i)] : [cim]
}

/** Draws `sorok` centred, one above the other, in `betutipus` (a CSS font family) at `px` pixels, and returns the pixels with ink (alpha over a half). */
export async function betuRaszter(sorok: readonly string[], betutipus: string, px = 44): Promise<Raszter> {
  const font = `500 ${px}px ${betutipus}`
  try {
    // the face is the page's own, normally loaded already; wait for it a moment at most, then draw with whatever the browser has
    await Promise.race([document.fonts.load(font), new Promise((res) => setTimeout(res, 1500))])
  } catch {
    // a font that cannot be loaded changes the letter shapes, not the text
  }
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('kapcsolat: no 2d canvas')
  ctx.font = font
  const sorMag = Math.round(px * 1.5)
  const w = Math.ceil(Math.max(...sorok.map((s) => ctx.measureText(s).width))) + 2 * Math.round(px * 0.5)
  const h = sorMag * sorok.length
  c.width = w
  c.height = h
  ctx.font = font
  ctx.fillStyle = 'black' // only the alpha of the drawn glyphs is read: this is a mask, not a design colour
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  sorok.forEach((s, i) => ctx.fillText(s, w / 2, i * sorMag + px * 1.05))
  const d = ctx.getImageData(0, 0, w, h).data
  const on = new Uint8Array(w * h)
  for (let i = 0; i < on.length; i++) on[i] = d[i * 4 + 3] > 127 ? 1 : 0
  return { w, h, on, sorok: sorok.length }
}
