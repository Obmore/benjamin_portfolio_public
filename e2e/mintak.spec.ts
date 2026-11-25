import { expect, test } from '@playwright/test'
import { MINTAK, blokkAtlag, honlapRGBA } from '../src/content/mintak'

// The true samples of the adventure world (src/content/mintak.ts). The picture's block means cannot be recomputed in a plain node run (no WebP decoder there; scripts/mintak.test.mjs pins the file by its
// hash instead), so this spec decodes the picture the way a visitor's browser does and checks the stored table against its pixels. Chromium only: the compat list is manual, and another engine's decoder or
// colour conversion may differ by a unit, which this check would then report as a data fault.
//
// Tolerance: one unit per byte. Playwright's Chromium and PIL's libwebp gave the same 5760 bytes exactly when the table was made, but a later Chromium build may round a YUV-to-RGB step differently.
const TURES = 1

test('the stored block means of the client picture are its pixels, measured in linear light', async ({ page }) => {
  const { kep, racs } = MINTAK.honlap
  await page.goto(kep.utvonal) // the file itself as an image document: same origin, so the canvas stays readable
  const px = await page.evaluate(async () => {
    const img = new Image()
    img.src = location.href
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const cx = c.getContext('2d', { willReadFrequently: true })!
    cx.drawImage(img, 0, 0)
    const d = cx.getImageData(0, 0, c.width, c.height).data
    let s = ''
    for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode(...d.subarray(i, i + 0x8000))
    return { szelesseg: c.width, magassag: c.height, rgba: btoa(s) }
  })
  expect([px.szelesseg, px.magassag]).toEqual([kep.szelesseg, kep.magassag])

  const mert = blokkAtlag(Buffer.from(px.rgba, 'base64'), px.szelesseg, px.magassag, racs.oszlop)
  expect([mert.oszlop, mert.sor]).toEqual([racs.oszlop, racs.sor])
  const tarolt = honlapRGBA()
  const rossz: string[] = []
  for (let i = 0; i < mert.oszlop * mert.sor; i++) {
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(tarolt[i * 4 + k] - mert.rgb[i * 3 + k])
      if (d > TURES) rossz.push(`block ${Math.floor(i / mert.oszlop)},${i % mert.oszlop} channel ${k}: stored ${tarolt[i * 4 + k]}, measured ${mert.rgb[i * 3 + k]}`)
    }
  }
  expect(rossz, 'the table in src/content/mintak.ts is not this picture: run `node scripts/mintak-epit.mjs`').toEqual([])
})
