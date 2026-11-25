import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { GEPADAT_MAX, GEPADAT_MIN, MINTAK, blokkAtlag, gepadatIdo, honlapRGBA } from '../src/content/mintak.ts'
import { CNC1_HOMERSEKLET } from '../src/content/sorozatok.ts'
import { demoKijelzes, gepadatFuttatas } from './lib/demo-futtatas.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const G = MINTAK.gepadat
const H = MINTAK.honlap

// The true samples of the adventure world (src/content/mintak.ts): a number the world draws must be a run or a measurement of a named source, so the Gépadat run is recomputed here from the
// demo's own code and the picture is pinned by its hash (its block means are recomputed from decoded pixels by e2e/mintak.spec.ts: no image decoder exists in a plain node run).

test('Gépadat: every one of the 480 readings is what the demo displays after that step of its own run', () => {
  const futas = gepadatFuttatas(480)
  assert.equal(G.ertekek.length, 480)
  assert.equal(futas.sorozat.length, 480)
  assert.deepEqual([...G.ertekek], futas.sorozat.map(demoKijelzes))
  // the demo's display rounding (hu-HU, one decimal) and the plain rounding the site's own pin uses agree on all of them: no tie is rounded two ways
  assert.deepEqual([...G.ertekek], futas.sorozat.map((v) => Math.round(v * 10) / 10))
})

test('Gépadat: the run is the demo\'s morning shift: 6:00 to 13:59, the shift change announced at 14:00 in the demo\'s own words', () => {
  const futas = gepadatFuttatas(480)
  assert.equal(G.kezdetPerc, futas.kezdetPerc)
  assert.equal(G.kezdetPerc, 6 * 60)
  assert.equal(futas.valtasPerc - G.kezdetPerc, G.ertekek.length, 'one reading a demo minute, up to the shift change')
  assert.ok(futas.muszakValtas, 'the demo announces a shift change at the end of the run')
  assert.deepEqual(G.muszakValtas, futas.muszakValtas)
  assert.equal(G.muszakValtas.perc, 14 * 60)
  assert.equal(G.muszakValtas.szoveg, 'Műszakváltás: délután, 14:00–22:00. A műszakjelentés újraindult.')
  // the run stops one step before the change: no announcement yet
  assert.equal(gepadatFuttatas(479).muszakValtas, null)
})

test('Gépadat: the machine, the signal and the unit are the demo\'s own names; no reading of the shift reaches its alarm limit', () => {
  const futas = gepadatFuttatas(1)
  assert.deepEqual(futas.gep, { nev: G.gep, jel: G.jel, hatar: G.hatar })
  assert.equal(G.gep, 'CNC-1')
  assert.equal(G.jel, 'Orsóhőmérséklet')
  assert.equal(G.hatar, 70)
  assert.equal(G.egyseg, '°C')
  assert.equal(G.lepes, '1 perc')
  assert.ok(GEPADAT_MAX < G.hatar, 'the shift has no alarm: the world may say nothing about one')
  assert.equal(GEPADAT_MIN, Math.min(...G.ertekek))
  assert.equal(GEPADAT_MAX, Math.max(...G.ertekek))
  assert.deepEqual([GEPADAT_MIN, GEPADAT_MAX], [48.5, 54.2])
})

test('Gépadat: the first hour is the home page\'s own pin (CNC1_HOMERSEKLET), and the reading at 7:00 is the page\'s rest reading, 51,6', () => {
  assert.deepEqual(G.ertekek.slice(0, 60), [...CNC1_HOMERSEKLET])
  assert.equal(G.ertekek[59], 51.6)
  assert.equal(gepadatIdo(59), '6:59')
  assert.equal(gepadatIdo(60), '7:00')
})

test('Gépadat: the clock text of a sample is the demo\'s own clock()', () => {
  const futas = gepadatFuttatas(1)
  for (let i = 0; i < G.ertekek.length; i++) assert.equal(gepadatIdo(i), futas.ora(G.kezdetPerc + i), `sample ${i}`)
  assert.equal(gepadatIdo(0), '6:00')
  assert.equal(gepadatIdo(479), '13:59')
})

test('Gépadat: the run is deterministic (the demo seeds its generator)', () => {
  assert.deepEqual(gepadatFuttatas(480).sorozat, gepadatFuttatas(480).sorozat)
})

test('every source a set names exists, and the picture\'s URL is its file under public/', () => {
  assert.ok(fs.existsSync(path.join(root, G.forras.split(':')[0])), G.forras)
  assert.ok(fs.existsSync(path.join(root, H.kep.fajl)), H.kep.fajl)
  assert.equal(H.kep.fajl, `public${H.kep.utvonal}`)
  assert.ok(H.forras.startsWith(H.kep.fajl), 'the set names the file it measures')
})

test('Honlap: the table was measured from this very file (a changed picture fails here until scripts/mintak-epit.mjs and e2e/mintak.spec.ts have run again)', () => {
  const bajtok = fs.readFileSync(path.join(root, H.kep.fajl))
  const sha = crypto.createHash('sha256').update(bajtok).digest('hex')
  assert.equal(sha, H.kep.sha256, 'the picture changed: run `node scripts/mintak-epit.mjs`, then the e2e spec e2e/mintak.spec.ts')
  // the stored size is the file's real size (a lossy WebP with an extended header: the canvas size is in the VP8X chunk, 24 bits each, minus one)
  assert.equal(bajtok.toString('latin1', 0, 4), 'RIFF')
  assert.equal(bajtok.toString('latin1', 8, 16), 'WEBPVP8X')
  assert.deepEqual([bajtok.readUIntLE(24, 3) + 1, bajtok.readUIntLE(27, 3) + 1], [H.kep.szelesseg, H.kep.magassag])
})

test('Honlap: the grid is 40 columns of the picture\'s width and as many rows of the same pitch as fit; every row holds one RGB triple per column', () => {
  assert.equal(H.racs.oszlop, 40)
  assert.equal(H.racs.sor, Math.round((H.racs.oszlop * H.kep.magassag) / H.kep.szelesseg))
  assert.equal(H.racs.sor, 48)
  assert.equal(H.sorok.length, H.racs.sor)
  for (const s of H.sorok) assert.equal(Buffer.from(s, 'base64').length, H.racs.oszlop * 3)
  // the last row covers what is left of the picture: 12 of 928 px at this size, not a full block (the world's squares are drawn square: the plan's V3 decides how to show it)
  assert.equal(H.kep.magassag - Math.floor((H.racs.sor - 1) * (H.kep.szelesseg / H.racs.oszlop)), 12)
})

test('Honlap: the texture form is RGBA of the stored triples with alpha 255, and a fresh array every call', () => {
  const t = honlapRGBA()
  assert.equal(t.length, H.racs.oszlop * H.racs.sor * 4)
  for (let i = 3; i < t.length; i += 4) assert.equal(t[i], 255)
  const first = Buffer.from(H.sorok[0], 'base64')
  assert.deepEqual([...t.subarray(0, 4)], [first[0], first[1], first[2], 255])
  const last = Buffer.from(H.sorok.at(-1), 'base64')
  assert.deepEqual([...t.subarray(t.length - 4)], [last[last.length - 3], last[last.length - 2], last[last.length - 1], 255])
  t[0] = 7
  assert.notEqual(honlapRGBA()[0], 7)
})

// --- the definition of a block mean, pinned on pictures small enough to work out by hand ---------------------------------------------------------------

/** An opaque RGBA picture from a function of (x, y). */
function kep(w, h, f) {
  const d = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([...f(x, y), 255], (y * w + x) * 4)
  return d
}
const FEKETE = [0, 0, 0]
const FEHER = [255, 255, 255]

test('blokkAtlag: a flat picture gives its own colour in every block, at any grid', () => {
  const b = blokkAtlag(kep(20, 30, () => [10, 128, 240]), 20, 30, 4)
  assert.deepEqual([b.oszlop, b.sor], [4, 6])
  for (let i = 0; i < b.oszlop * b.sor; i++) assert.deepEqual([...b.rgb.subarray(i * 3, i * 3 + 3)], [10, 128, 240])
})

test('blokkAtlag: the mean is taken in linear light: half black, half white pixels give sRGB 188, not the 128 of the encoded average', () => {
  const b = blokkAtlag(kep(2, 2, (x, y) => ((x + y) % 2 ? FEHER : FEKETE)), 2, 2, 1)
  assert.deepEqual([b.oszlop, b.sor], [1, 1])
  assert.deepEqual([...b.rgb], [188, 188, 188])
})

test('blokkAtlag: the channels are averaged apart', () => {
  const b = blokkAtlag(kep(2, 2, (x) => (x ? [255, 0, 0] : [0, 0, 255])), 2, 2, 1)
  assert.deepEqual([...b.rgb], [188, 0, 188])
})

test('blokkAtlag: block edges are at floor(index * pitch) and the last column and row reach the picture\'s edge', () => {
  // 5 x 5 at 2 columns: pitch 2.5, rows = round(2) = 2; the columns are x 0-1 and x 2-4, the rows y 0-1 and y 2-4
  const kepek = (px, py) => kep(5, 5, (x, y) => (x === px && y === py ? FEHER : FEKETE))
  const mean = (n) => srgb(1 / n)
  const srgb = (v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055))
  const at = (b, r, c) => b.rgb[(r * b.oszlop + c) * 3]
  const a = blokkAtlag(kepek(2, 0), 5, 5, 2) // x 2 belongs to the second column, y 0 to the first row: a block of 3 x 2 pixels
  assert.deepEqual([a.oszlop, a.sor], [2, 2])
  assert.deepEqual([at(a, 0, 0), at(a, 0, 1), at(a, 1, 0), at(a, 1, 1)], [0, mean(6), 0, 0])
  const z = blokkAtlag(kepek(4, 4), 5, 5, 2) // the corner pixel belongs to the last block, which holds 3 x 3 pixels
  assert.deepEqual([at(z, 0, 0), at(z, 0, 1), at(z, 1, 0), at(z, 1, 1)], [0, 0, 0, mean(9)])
})

test('blokkAtlag: a buffer that is not the picture\'s size is an error, not a wrong table', () => {
  assert.throws(() => blokkAtlag(new Uint8Array(10), 2, 2, 1), /not a 2 x 2 RGBA picture/)
})
