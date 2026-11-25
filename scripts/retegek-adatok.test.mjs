import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { PAROK_LAPOK, RETEG, SOROZATOK, BELEPO_CIMEK } from '../src/content/retegek.ts'
import { savPts, savUt } from '../src/site/retegek/sav.ts'
import { CNC1_HOMERSEKLET, HOM_NYUGALOM, PANEL_HOSSZAK, QR_SOR0, fmt } from '../src/site/fooldal/jelalak.ts'

// The true-fact rule of the Rétegek sheets: every string and number is a demo's own, an existing content string, or a fact of the built site.
const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
const demo = (name) => read(`public/demos/${name}/index.html`) + '\n' + read(`public/demos/${name}/app.js`)

/** Every string a block list shows (labels and values). */
function strings(blokkok, out = []) {
  for (const b of blokkok) {
    if (b.t === 'sorok') for (const s of b.sorok) { out.push(s.cimke); if (s.ertek) out.push(s.ertek); if (s.halk) out.push(s.halk.s.replace(/^ \/ /, '')) }
    else if (b.t === 'cim' || b.t === 'szoveg') out.push(...b.s.split('\n'))
    else if (b.t === 'lista') for (const l of b.elemek) out.push(l.s)
    else if (b.t === 'osszes') out.push(b.cimke, b.szam, b.felirat)
    else if (b.t === 'oszlopok') for (const o of b.oszlopok) strings(o, out)
  }
  return out
}

// Strings that are the page's own words, not the demo's: the Szabály rows (owner-approved), the head readings, the counts and the numbers the demo computes at run time.
const SAJAT = new Set([RETEG.mintavetel, RETEG.minta, '1 modul', '1 perc', '29', '60', '2 tétel', '5', '1,219 m²', '1,44 m', '1,692 m', '01. tétel', '02. tétel', 'MV200-0001 → v1.2', 'Gyártva', 'Kiadva', 'Kézikönyv', 'Gyári szám',
  // CNC-1 at the demo's 7:00 state, as the demo formats it (nf(v, 1) and its unit), and its limits (MACHINES, line 21) in the label the demo draws ("határ: 70 °C", line 236)
  '51,6 °C', '11,9 A', '25', '23', 'határ: 70 °C', 'határ: 18 A', '1 él'])

for (const [par, forras] of [['rendeles', 'lapszabaszat'], ['gepkonyv', 'kezikonyv'], ['gepadat', 'adatgyujto']]) {
  test(`${par}: every Adat and Szabály string is in the ${forras} demo's own source (or is on the allowlist of derived values)`, () => {
    const src = demo(forras)
    const lap = PAROK_LAPOK[par]
    const missing = [...strings(lap.adat.blokkok), ...strings(lap.szabaly.blokkok)].filter((s) => s && !SAJAT.has(s) && !src.includes(s.replace(/.$/, '')) && !/^v\d\.\d\s+\d{4}\./.test(s))
    assert.deepEqual(missing, [])
  })
}

test('the offer record headings are the ones the offer page renders (Csomagok.tsx, from CSOMAGOK_OLDAL.tenyek)', () => {
  const rec = read('src/content/csomagok.ts')
  const tsx = read('src/site/pages/Csomagok.tsx')
  const kulcs = { tartalmaz: 'tartalmaz', nem: 'nemTartalmaz', kell: 'kell' }
  for (const [k, t] of Object.entries(kulcs)) {
    assert.ok(rec.includes(`${t}: '${BELEPO_CIMEK[k]}'`), BELEPO_CIMEK[k])
    assert.ok(tsx.includes(`<dt>{T.${t}}</dt>`), t)
  }
})

test('series: GÉPADAT is the demo hour (60 values, last 51,6), GÉPKÖNYV the QR row (29 bits), RENDELÉS the cut order lengths; HONLAP has none', () => {
  assert.equal(SOROZATOK.gepadat.ertekek.length, 60)
  assert.deepEqual(SOROZATOK.gepadat.ertekek, CNC1_HOMERSEKLET)
  assert.equal(fmt(SOROZATOK.gepadat.ertekek.at(-1)), '51,6')
  assert.equal(fmt(HOM_NYUGALOM), '51,6')
  assert.equal(SOROZATOK.gepadat.egyseg, '°C')
  assert.equal(SOROZATOK.gepadat.lepes, '1 perc')
  assert.equal(SOROZATOK.gepkonyv.ertekek.join(''), QR_SOR0)
  assert.equal(SOROZATOK.gepkonyv.ertekek.length, 29)
  assert.equal(SOROZATOK.gepkonyv.lepes, '1 modul')
  assert.deepEqual(SOROZATOK.rendeles.ertekek, PANEL_HOSSZAK)
  assert.equal(SOROZATOK.honlap, undefined)
  assert.equal(PAROK_LAPOK.gepadat.szabaly.fej, `${fmt(HOM_NYUGALOM)} °C`)
  assert.equal(PAROK_LAPOK.gepkonyv.szabaly.fej, `${SOROZATOK.gepkonyv.ertekek.length} bit`)
  assert.equal(PAROK_LAPOK.honlap.szabaly, undefined)
})

test('lanes: a lane changes with the pair; the only repeats are the straight ones (no series)', () => {
  const lanes = []
  for (const par of ['honlap', 'rendeles', 'gepkonyv', 'gepadat']) for (const f of ['adat', 'szabaly']) lanes.push(savUt(par, f, 250, 40))
  assert.equal(new Set(lanes).size, 8)
  // the straight ones: RENDELÉS Szabály and the 404's two
  const straight = savPts('rendeles', 'szabaly', 250, 40)
  assert.equal(new Set(straight.map((p) => p[1])).size, 1)
  assert.equal(new Set(savPts('hiba', 'szabaly', 250, 40).map((p) => p[1])).size, 1)
  // GÉPKÖNYV Szabály: one slot per module, up = a 1 bit
  const gk = savPts('gepkonyv', 'szabaly', 250, 40)
  const mid = gk[0][1]
  const slots = gk.slice(1, -1)
  assert.equal(slots.length, 58)
  assert.equal(Array.from({ length: 29 }, (_, i) => (slots[2 * i][1] < mid ? '1' : '0')).join(''), QR_SOR0)
  // GÉPADAT Szabály: 60 steps, the last slot is the highest-index sample (up = warmer)
  const gd = savPts('gepadat', 'szabaly', 250, 40)
  assert.equal(gd.length, 2 + 2 * 60)
  const vals = CNC1_HOMERSEKLET
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const ys = gd.slice(1, -1).filter((_, i) => i % 2 === 0).map((p) => p[1])
  assert.ok(Math.abs(ys.at(-1) - (20 - ((vals.at(-1) - (hi + lo) / 2) / ((hi - lo) / 2)) * 14)) < 0.01)
})

test('the new strings are the owner-approved ones, and no other', () => {
  assert.deepEqual(
    Object.values(RETEG).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))).sort(),
    ['Szétszedve', 'Rétegek', 'Adat', 'Szabály', 'Felület', 'Jel', 'Mintavétel', 'Minták', 'Rajzolt görbe, nincs mögötte mérés.', 'Erről kérdezek', 'Kért cím', 'Ehhez a címhez nincs felület.'].sort(),
  )
})
