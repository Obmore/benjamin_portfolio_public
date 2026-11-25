// The three formation chapters of the world (V4 "Évek", V6 "Pályázat", V5 "Kapcsolat"): the route's scenes and hand-overs, the generic target/line packing, and the three builders. Pure: no DOM, no GL.
// What the tests hold on to: everything that carries meaning is the site's own data (the years, the periods' edges, the lanes' names; the sheets' number, order and words; the address), the geometry
// stays inside the numbers it was written with, the camera is continuous, and a chapter never prints over another one.
import assert from 'node:assert/strict'
import path from 'node:path'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { IDOVONAL } from '../src/content/tapasztalat.ts'
import { evek } from '../src/site/evek.ts'
import { CEL_FLOAT, CEL_SZEL, CEL_TEXEL, CSOPORT_MAX, VONAL_KULCS, VONAL_RETEG, VonalEpito, celTomb, hash01 } from '../src/vilag/cel.ts'
import { EV, evekAdat } from '../src/vilag/evek.ts'
import { BETU_SZEL, feliratHelyzet, feliratUtkozes, feliratSorok } from '../src/vilag/feliratok.ts'
import { ATMENET_FEL, ATMENET_KOZEP, ELSO_SZAKASZ, FEJEZETEK, SZAKASZOK, cimLathato, jelenetPl, lathatok } from '../src/vilag/idovonal.ts'
import { CEL_MAX, KAPCS, futasok, kapcsolatAdat, lepesValaszt } from '../src/vilag/kapcsolat.ts'
import { cimSorok } from '../src/vilag/kapcsolat-raszter.ts'
import { LAP, palyazatAdat } from '../src/vilag/palyazat.ts'
import { korl, mul, nez, persp, projekt } from '../src/vilag/matek.ts'

const ASPEKTEK = [0.49, 0.75, 1, 1.6, 2.4]
const EPITES = 2026

// the content file imports through Vite's resolution (extensionless imports, the page's own data), so it is loaded the way the site's own render path loads it
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({
  configFile: false,
  root,
  logLevel: 'warn',
  appType: 'custom',
  resolve: { alias: { '@': path.resolve(root, 'src') } },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
})
after(async () => { await server.close() })
const { KALAND, PALYAZAT_VALLALAS, PALYAZAT_VALLALAS_SZUK } = await server.ssrLoadModule('/src/content/kaland.ts')

// ---------------------------------------------------------------------------------------------------------------------------------
// the route: scenes, hand-overs, captions
test('route: the scenes follow each other, overlap only in the hand-overs, and every chapter\'s rest position is covered by exactly its own scene', () => {
  assert.deepEqual(SZAKASZOK.map((s) => s.jelenet), ['reszecskek', 'evek', 'palyazat', 'kapcsolat'])
  assert.equal(SZAKASZOK[0].tol, 0)
  assert.equal(SZAKASZOK[0].ig, ELSO_SZAKASZ)
  assert.equal(SZAKASZOK.at(-1).ig, 1)
  ATMENET_KOZEP.forEach((k, i) => {
    assert.equal(Math.abs(SZAKASZOK[i + 1].tol - (k - ATMENET_FEL)) < 1e-12, true, `scene ${i + 1} begins half a hand-over before its centre`)
    if (i + 1 < ATMENET_KOZEP.length) assert.equal(Math.abs(SZAKASZOK[i + 1].ig - (ATMENET_KOZEP[i + 1] + ATMENET_FEL)) < 1e-12, true)
  })
  // a hand-over centre is where the chapter takes over
  for (const [i, f] of FEJEZETEK.slice(2).entries()) assert.equal(f.tol, ATMENET_KOZEP[i], f.id)
  for (const f of FEJEZETEK) {
    const l = lathatok(f.nyugalom)
    const sajat = l.filter((x) => x.gain > 0.999)
    assert.equal(sajat.length, 1, `${f.id}: one scene at full weight at its rest position`)
    assert.equal(sajat[0].jelenet, f.jelenet, f.id)
    assert.equal(l.length, 1, `${f.id}: nothing else is drawn there`)
  }
})

test('route: the scene weights add up to 1 in a hand-over, at most two scenes overlap, and the progress is each scene\'s own 0..1', () => {
  let legtobb = 0
  for (let i = 0; i <= 2000; i++) {
    const p = i / 2000
    const l = lathatok(p)
    legtobb = Math.max(legtobb, l.length)
    // a scene whose weight is below 0.003 is not drawn at all, so the sum is 1 up to that
    assert.equal(Math.abs(l.reduce((a, x) => a + x.gain, 0) - 1) < 0.0035, true, `weights at ${p}`)
    for (const x of l) {
      assert.equal(x.pl >= 0 && x.pl <= 1, true, `${x.jelenet} progress at ${p}`)
      assert.equal(x.pl, jelenetPl(x.jelenet, p))
    }
  }
  assert.equal(legtobb, 2)
  assert.equal(jelenetPl('evek', 0), 0)
  assert.equal(jelenetPl('evek', 1), 1)
  assert.equal(jelenetPl('nincs-ilyen', 0.5), 0)
  // the first scene's own progress is the first ELSO_SZAKASZ of the route
  assert.equal(Math.abs(jelenetPl('reszecskek', 0.2) - 0.2 / ELSO_SZAKASZ) < 1e-12, true)
})

test('route: the captions never print over each other, and each is fully there at its chapter\'s rest position', () => {
  for (const f of FEJEZETEK) {
    const mind = FEJEZETEK.map((g) => [g.id, cimLathato(g.id, f.nyugalom)])
    for (const [id, v] of mind) {
      if (id === f.id) {
        if (f.id !== 'gepadat') assert.equal(v > 0.999, true, `${id} at its own rest position`)
      } else assert.equal(v < 0.001, true, `${id} is gone at ${f.id}'s rest position`)
    }
  }
  for (let i = 0; i <= 2000; i++) {
    const p = i / 2000
    const v = FEJEZETEK.map((g) => cimLathato(g.id, p)).sort((a, b) => b - a)
    assert.equal(v[0] <= 1.0000001 && v.at(-1) >= -1e-12, true)
    // between the first two chapters the caption is the old scene's own (it is not changed here); the later hand-overs hand one caption to the next with little overlap
    if (p > ELSO_SZAKASZ) assert.equal(v[1] < 0.35, true, `two captions at ${p}: ${v[0]}, ${v[1]}`)
  }
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the packing: targets and lines
test('targets: copies are expanded, every record is 16 floats in four texels and the texture row is 1024 texels wide', () => {
  assert.equal(CEL_TEXEL, 4)
  assert.equal(CEL_FLOAT, 16)
  assert.equal(CEL_SZEL, 1024)
  const { adat, db } = celTomb([
    { a: [1, 2, 3], d: [4, 0, 0], gain: 0.5, kes: 0.25, hot: 1, meret: 2, folyas: 0.1, szoras: 0.2, csoport: 3, ismet: 3 },
    { a: [9, 8, 7], gyuru: true },
    { a: [0, 0, 0], ismet: 0.2 },
  ])
  assert.equal(db, 5, 'three copies, a ring, a point (an ismet below one is one copy)')
  assert.equal(adat.length, db * CEL_FLOAT)
  const r = (i) => Array.from(adat.slice(i * CEL_FLOAT, (i + 1) * CEL_FLOAT))
  assert.deepEqual(r(0), [1, 2, 3, 0.5, 4, 0, 0, 0.25, 1, 2, Math.fround(0.1), Math.fround(0.2), 3, 0, 0, 0])
  assert.deepEqual(r(0), r(2))
  assert.equal(r(3)[13], 1, 'a ring')
  assert.equal(r(3)[3], 1, 'the default gain')
  assert.equal(r(3)[9], 1, 'the default size')
})

test('lines: the segments are sorted by layer, every vertex is 6 floats, and the layers know where they start', () => {
  const b = new VonalEpito()
  b.seg([0, 0, 0], [1, 0, 0], VONAL_RETEG.szal, 1, 0.5)
  b.seg([0, 0, 0], [0, 1, 0], VONAL_RETEG.padlo, 0, 0.7, 0.1)
  b.vonal([[0, 0, 0], [1, 1, 0], [2, 0, 0]], VONAL_RETEG.keret, 2, (i) => i)
  b.seg([0, 0, 1], [0, 0, 2], VONAL_RETEG.padlo, 0, 1)
  const v = b.epit()
  assert.equal(v.adat.length % VONAL_KULCS, 0)
  assert.deepEqual([...v.db], [4, 0, 4, 2])
  assert.deepEqual([...v.tol], [0, 4, 4, 8])
  for (let l = 0; l < 4; l++) for (let i = v.tol[l]; i < v.tol[l] + v.db[l]; i++) assert.equal(v.adat[i * VONAL_KULCS + 3], l, `vertex ${i} is on layer ${l}`)
  // the ramp: the gain at the two ends of a segment
  const kulcs = (i) => v.adat[i * VONAL_KULCS + 5]
  assert.deepEqual([kulcs(0), kulcs(1)], [Math.fround(0.7), Math.fround(0.1)])
})

test('hash: the deterministic hash is in [0, 1), repeatable and not constant', () => {
  const s = new Set()
  for (let i = 0; i < 200; i++) {
    const h = hash01(i, 7, 3)
    assert.equal(h >= 0 && h < 1, true)
    assert.equal(h, hash01(i, 7, 3))
    s.add(h)
  }
  assert.equal(s.size > 190, true)
})

test('math: the projection puts the target at the middle of the screen and a point behind the camera nowhere', () => {
  const v = nez([0, 2, 10], [0, 1, 0])
  const vp = mul(persp((46 * Math.PI) / 180, 1.6, 0.1, 200, 0), v.m)
  const u = projekt(vp, [0, 1, 0])
  assert.notEqual(u, null)
  assert.equal(Math.abs(u[0] - 0.5) < 1e-6 && Math.abs(u[1] - 0.5) < 1e-6, true)
  assert.equal(projekt(vp, [0, 2, 20]), null, 'behind the camera')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// chapter 3, Évek
const E = evekAdat(IDOVONAL, EPITES)

test('Évek: the cells are the years of the page\'s own axis, and every channel\'s edges are the cell edges the page\'s own function gives', () => {
  const g = evek(IDOVONAL, EPITES)
  assert.deepEqual(E.tengely, g)
  assert.equal(E.savok.length, IDOVONAL.length)
  const n = g.cellak.length
  E.savok.forEach((s, i) => {
    assert.equal(s.idoszak, IDOVONAL[i], 'the lane is the period, in the data\'s order')
    assert.equal(s.xA, g.csatornak[i].kezd * EV.cella)
    assert.equal(s.xB, g.csatornak[i].vege * EV.cella)
    assert.equal(s.tart, g.csatornak[i].tart)
    assert.equal(s.z, -i * EV.sav, 'the newest start is in front, one lane behind the other')
  })
  // each lane's plateau is one segment per high cell, at the channel's height, along the time axis
  E.savok.forEach((s, i) => {
    const k = g.csatornak[i]
    const szegmensek = E.celok.filter((c) => c.d && c.d[0] === EV.cella && c.a[1] === EV.mag && c.a[2] === s.z)
    assert.equal(szegmensek.length, k.vege - k.kezd, `lane ${i}: one segment per high cell`)
    assert.deepEqual(szegmensek.map((c) => Math.round(c.a[0] / EV.cella)).sort((a, b) => a - b), Array.from({ length: k.vege - k.kezd }, (_, j) => k.kezd + j))
  })
  // the number of year cells in the labels and the cells of the diagram agree
  assert.equal(E.feliratok.filter((f) => f.tip === 'ev').length, n)
})

test('Évek: one ring ("now") per running period and none for an ended one, and the falling edge exists only for an ended one', () => {
  const futok = IDOVONAL.filter((i) => i.veg === undefined).length
  const gyuruk = E.celok.filter((c) => c.gyuru)
  assert.equal(gyuruk.length, futok)
  const n = E.tengely.cellak.length
  for (const c of gyuruk) assert.equal(c.a[0], n * EV.cella, 'the ring is on the "now" edge')
  const esok = E.celok.filter((c) => c.d && c.d[0] === 0 && c.d[1] < 0)
  assert.equal(esok.length, IDOVONAL.length - futok)
  const emelkedok = E.celok.filter((c) => c.d && c.d[0] === 0 && c.d[1] > 0)
  assert.equal(emelkedok.length, IDOVONAL.length)
})

test('Évek: the labels are the data\'s own strings (the lanes\' areas as written, the years as numbers) and nothing else', () => {
  const nevek = E.feliratok.filter((f) => f.tip === 'terulet').map((f) => f.szoveg)
  assert.deepEqual(nevek, IDOVONAL.map((i) => i.terulet))
  const evek2 = E.feliratok.filter((f) => f.tip === 'ev').map((f) => f.szoveg)
  assert.deepEqual(evek2, E.tengely.cellak.map(String))
  assert.equal(E.feliratok.length, nevek.length + evek2.length)
  // the lanes' names hang at their own lane, left of the axis; the years sit on the floor in front of the first lane
  E.feliratok.filter((f) => f.tip === 'terulet').forEach((f, i) => {
    assert.equal(f.pont[2], E.savok[i].z)
    assert.equal(f.pont[0] < 0, true)
  })
  for (const f of E.feliratok.filter((x) => x.tip === 'ev')) assert.equal(f.pont[2] > 0, true)
})

test('Évek: how many periods run in a year cell is what the data says, and a build in a later year adds a cell without moving any start', () => {
  const g = E.tengely
  g.cellak.forEach((ev, c) => assert.equal(E.futnak(c), IDOVONAL.filter((i) => i.kezdet <= ev && (i.veg ?? EPITES) >= ev).length, `${ev}`))
  const E2 = evekAdat(IDOVONAL, EPITES + 1)
  assert.equal(E2.tengely.cellak.length, g.cellak.length + 1)
  E2.savok.forEach((s, i) => assert.equal(s.xA, E.savok[i].xA, 'starts do not move'))
  assert.equal(E2.savok.filter((s) => s.tart).every((s) => s.xB === E2.tengely.cellak.length * EV.cella), true)
  assert.throws(() => evekAdat(IDOVONAL, 2020), /after the build year/)
})

test('Évek: every target, line and label is inside the diagram\'s box, and the formation clock builds it from the earliest year to now', () => {
  const w = E.tengely.cellak.length * EV.cella
  const zSzel = (IDOVONAL.length - 1) * EV.sav
  for (const c of E.celok) {
    const x1 = c.a[0] + (c.d?.[0] ?? 0)
    assert.equal(c.a[0] >= -1e-9 && x1 <= w + 1e-9, true, 'x')
    assert.equal(c.a[1] >= -1e-9 && c.a[1] + (c.d?.[1] ?? 0) <= EV.mag + 1e-9, true, 'y')
    assert.equal(c.a[2] <= 1e-9 && c.a[2] >= -zSzel - 1e-9, true, 'z')
    assert.equal(c.kes >= 0 && c.kes <= 1, true, 'the delay is on the clock')
  }
  // the cursor moves from the earliest year to now: the delay of a plateau segment grows with its cell
  const plato = E.celok.filter((c) => c.d && c.d[0] === EV.cella && c.a[2] === 0).sort((a, b) => a.a[0] - b.a[0])
  for (let i = 1; i < plato.length; i++) assert.equal(plato[i].kes > plato[i - 1].kes, true)
  assert.equal(E.vonalak.adat.length % VONAL_KULCS, 0)
  assert.equal(E.vonalak.db.reduce((a, b) => a + b, 0) * VONAL_KULCS, E.vonalak.adat.length)
  for (const f of E.feliratok) assert.equal(f.kes === undefined || (f.kes >= 0 && f.kes <= 1), true)
  const targyak = E.celok.reduce((a, c) => a + Math.max(1, Math.round(c.ismet ?? 1)), 0)
  assert.equal(targyak < 1024 * 16, true, 'the texture holds the records')
})

test('Évek: the camera is continuous for every screen shape, ends with the whole diagram in view, and the readout\'s year follows the cursor', () => {
  for (const asp of ASPEKTEK) {
    let e = E.poz(0, asp, null)
    for (let i = 1; i <= 400; i++) {
      const p = E.poz(i / 400, asp, null)
      for (let j = 0; j < 3; j++) {
        assert.equal(Math.abs(p.eye[j] - e.eye[j]) < 0.6 * (1 + (asp < 1 ? 1.6 / Math.max(asp, 0.45) : 1)), true, `eye ${j} at ${i / 400} for ${asp}`)
        assert.equal(Math.abs(p.tgt[j] - e.tgt[j]) < 0.4, true, `target ${j} at ${i / 400}`)
      }
      assert.equal(p.forma >= 0 && p.forma <= 1, true)
      e = p
    }
    // at the end every corner of the diagram is on the screen (a narrow screen stands further back)
    const p = E.poz(0.589, asp, null)
    const vp = mul(persp(p.fov, asp, 0.1, 300, 0), nez(p.eye, p.tgt).m)
    const w = E.tengely.cellak.length * EV.cella
    const z = (IDOVONAL.length - 1) * EV.sav
    for (const x of [0, w]) for (const zz of [0, -z]) {
      const u = projekt(vp, [x, 0, zz])
      assert.notEqual(u, null, `corner ${x},${zz} for ${asp}`)
      if (asp >= 1) assert.equal(u[0] > 0 && u[0] < 1 && u[1] > 0 && u[1] < 1, true, `corner ${x},${zz} for aspect ${asp}: ${u}`)
      else assert.equal(u[0] > -0.05 && u[0] < 1.05, true, `corner ${x} across a narrow screen ${asp}: ${u}`)
    }
  }
  // the sample is the year cell under the camera while the cursor sweeps, then none
  assert.equal(E.cella(0), 0)
  assert.equal(E.cella(0.3) >= 1, true)
  assert.equal(E.cella(0.36), null)
  assert.equal(E.cella(1), null)
  assert.equal(E.minta(0, 1.6), E.cella(0))
  assert.equal(E.ertek(0, 1.6) > 0 && E.ertek(0, 1.6) <= 1, true)
  assert.equal(E.ertek(1, 1.6), 0.5)
  // the formation clock runs from 0 to 1 + the settling time
  assert.equal(E.ora(0), 0)
  assert.equal(Math.abs(E.ora(1) - (1 + E.idotartam)) < 1e-12, true)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// chapter 4, Pályázat
const LAPOK = KALAND.palyazat.lapok
const L = palyazatAdat(LAPOK)

test('Pályázat: one sheet per thing the owner named, in the sentence\'s order, with the copy\'s own words, and nothing else on the stage', () => {
  assert.equal(L.lapok.length, LAPOK.length)
  assert.deepEqual(L.lapok.map((l) => l.szoveg), LAPOK.map((l) => ({ cim: l.cim, mondat: l.mondat })))
  const cimek = L.feliratok.filter((f) => f.tip === 'lapcim').map((f) => f.szoveg)
  const mondatok = L.feliratok.filter((f) => f.tip === 'lapszoveg').map((f) => f.szoveg)
  assert.deepEqual(cimek, LAPOK.map((l) => l.cim))
  assert.deepEqual(mondatok, LAPOK.map((l) => l.mondat))
  assert.equal(L.feliratok.length, 2 * LAPOK.length, 'only the titles and the sentences are written on the stage')
  // left to right in the sentence's order
  for (let i = 1; i < L.lapok.length; i++) assert.equal(L.lapok[i].x > L.lapok[i - 1].x, true)
  // the sheets are the same size and keep their gaps
  for (let i = 1; i < L.lapok.length; i++) assert.equal(Math.abs(L.lapok[i].x - L.lapok[i - 1].x - LAP.kozt) < 1e-9, true)
  // one stop (ring) on the path per sheet
  assert.equal(L.celok.filter((c) => c.gyuru).length, LAPOK.length)
  // the sheets are in groups the scene moves as wholes: one group per sheet
  const csoportok = new Set(L.celok.filter((c) => !c.gyuru).map((c) => c.csoport))
  assert.equal(csoportok.size, LAPOK.length)
  assert.equal(Math.max(...csoportok) < CSOPORT_MAX, true)
})

test('Pályázat: the copy has no sum, no odds, no call, no fee and no price, and the only swap is one constant', () => {
  const mind = [KALAND.palyazat.vallalas, KALAND.palyazat.hatar, KALAND.palyazat.ikerCim, ...LAPOK.flatMap((l) => [l.cim, l.mondat]), PALYAZAT_VALLALAS, PALYAZAT_VALLALAS_SZUK]
  for (const t of mind) {
    assert.equal(/\d/.test(t), false, `no number in "${t}"`)
    assert.equal(/\b(Ft|HUF|EUR|euró|forint|millió|százalék|%)/i.test(t), false, `no sum in "${t}"`)
    assert.equal(/(sikerdíj|jutalék|díj|ár\b|árajánlat|garant|nyerési esély)/i.test(t), false, `no fee, price or odds in "${t}"`)
    assert.equal(/(külső|alvállalkoz|partner|segítség|csapat|mi\b|nálunk|munkatárs)/i.test(t), false, `no outside help and no "we" in "${t}"`)
    assert.equal(/\[KÉRDÉS/.test(t), false, 'no placeholder')
  }
  assert.equal(KALAND.palyazat.vallalas, PALYAZAT_VALLALAS)
  assert.notEqual(PALYAZAT_VALLALAS, PALYAZAT_VALLALAS_SZUK)
  assert.equal(KALAND.palyazat.level.href.startsWith('mailto:'), true)
})

test('Pályázat: everything stands on the stage floor inside the arc, the light moves from sheet to sheet, and the groups are the pile and the places', () => {
  const S = L.lapok.length
  for (const c of L.celok) {
    assert.equal(Number.isFinite(c.a[0] + c.a[1] + c.a[2]), true)
    if (c.gyuru) continue
    assert.equal(c.a[1] >= LAP.emel - 1e-9 && c.a[1] <= LAP.emel + LAP.mag + 1e-9, true, 'a sheet\'s rows are between its foot and its top')
  }
  // the light: a real number 0..S-1, monotone along the route, the readout names the nearest
  let f0 = L.fokusz(0)
  assert.equal(f0, 0)
  for (let i = 1; i <= 200; i++) {
    const f = L.fokusz(i / 200)
    assert.equal(f >= f0 - 1e-12 && f <= S - 1 + 1e-12, true)
    f0 = f
  }
  assert.equal(L.fokusz(1), S - 1)
  assert.equal(L.minta(1, 1.6), S - 1)
  assert.equal(L.minta(0, 1.6), 0)
  // the groups: at the start every sheet is in the pile (all moved to the middle) and dims by the light; settled they are home and the sheet in the light is bright
  const g0 = L.csoportok(0)
  const g1 = L.csoportok(0.6)
  for (let k = 0; k < S; k++) {
    assert.equal(Math.abs(g0[k * 4] + L.lapok[k].x) < 1e-5, true, `sheet ${k} starts at the middle`)
    assert.equal(Math.abs(g1[k * 4]) < 1e-5, true, `sheet ${k} is home`)
    assert.equal(g1[k * 4 + 3] >= 0.5 && g1[k * 4 + 3] <= 1, true)
  }
  const g2 = L.csoportok(0.7)
  assert.equal(g2[(S - 1) * 4 + 3] > 0.99, true, 'the last sheet is the one in the light at the end')
  assert.equal(g2[3] < 0.6, true, 'the first one has dimmed')
  // the light on the floor and the shafts' source are on the stage
  const pf = L.padloFeny(0.5)
  assert.equal(pf.pont[1], 0)
  assert.equal(pf.ero >= 0, true)
  assert.equal(L.padloFeny(0).ero, 0)
  assert.equal(L.feny(0.5)[1] > 0, true)
})

test('Pályázat: the camera is continuous for every screen shape and keeps the whole row of sheets in view at rest', () => {
  for (const asp of ASPEKTEK) {
    let e = L.poz(0, asp, null)
    for (let i = 1; i <= 400; i++) {
      const p = L.poz(i / 400, asp, null)
      for (let j = 0; j < 3; j++) assert.equal(Math.abs(p.eye[j] - e.eye[j]) < 0.8 * (1 + 1 / Math.max(asp, 0.3)), true, `eye ${j} at ${i / 400} for ${asp}`)
      e = p
    }
    const p = L.poz(0.574, asp, null)
    const vp = mul(persp(p.fov, asp, 0.1, 300, 0), nez(p.eye, p.tgt).m)
    for (const l of [L.lapok[0], L.lapok.at(-1)]) {
      for (const sx of [-1, 1]) {
        const u = projekt(vp, [l.x + sx * (LAP.sz / 2), LAP.emel + LAP.mag / 2, l.z])
        assert.notEqual(u, null)
        assert.equal(u[0] > 0 && u[0] < 1, true, `the sheet's edge ${l.x}${sx > 0 ? '+' : '-'} is on a ${asp} screen: ${u[0]}`)
      }
    }
  }
})

// ---------------------------------------------------------------------------------------------------------------------------------
// chapter 5, Kapcsolat
/** A synthetic bitmap: `sorok` lines of `h1` rows each; every line has the given runs [x0, x1) on each of the rows in [y0, y1) (relative to the line). */
function raszter(w, sorok, h1, futamok) {
  const on = new Uint8Array(w * h1 * sorok)
  for (let s = 0; s < sorok; s++) for (const [x0, x1, y0, y1] of futamok) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) on[(s * h1 + y) * w + x] = 1
  return { w, h: h1 * sorok, on, sorok }
}

test('Kapcsolat: a run is a horizontal stretch of ink on a sampled row, and the step is chosen so that the runs fit the budget', () => {
  const r = raszter(40, 1, 20, [[2, 10, 4, 12], [14, 30, 4, 12]])
  const f = futasok(r, 4)
  // rows 2, 6, 10, 14, 18: the ink is on rows 4..11, so rows 6 and 10 carry two runs each
  assert.deepEqual(f.map((x) => x.y), [6, 6, 10, 10])
  assert.deepEqual(f.slice(0, 2), [{ y: 6, x0: 2, x1: 10 }, { y: 6, x0: 14, x1: 30 }])
  assert.equal(lepesValaszt(r), 2, 'a small picture keeps the finest step')
  // a dense picture raises the step until it fits
  const sur = raszter(200, 2, 60, Array.from({ length: 30 }, (_, i) => [i * 6, i * 6 + 3, 0, 60]))
  const l = lepesValaszt(sur, 120)
  assert.equal(l > 2, true)
  assert.equal(futasok(sur, l).length <= 120 || l === 12, true)
  assert.equal(CEL_MAX <= 2048, true)
})

test('Kapcsolat: the targets reproduce the bitmap\'s runs, sit inside the ink\'s box, are typed from the left and line after line, and the cursor arrives last', () => {
  const r = raszter(60, 2, 24, [[4, 14, 4, 20], [20, 26, 4, 20], [30, 52, 8, 20]])
  const K = kapcsolatAdat(r)
  const fut = futasok(r, K.lepes)
  assert.equal(K.celok.length, fut.length + 1, 'one target per run and the cursor')
  const body = K.celok.slice(0, -1)
  const kurzor = K.celok.at(-1)
  // the runs: every target is a segment of the run's length along x, at the run's row
  body.forEach((c, i) => {
    assert.equal(Math.abs(c.d[0] - (fut[i].x1 - fut[i].x0) * K.pixel) < 1e-9, true)
    assert.equal(c.d[1], 0)
    assert.equal(c.a[0] >= K.doboz.x0 - 1e-9 && c.a[0] + c.d[0] <= K.doboz.x1 + 1e-9, true, 'inside the ink\'s box (x)')
    assert.equal(c.a[1] >= K.doboz.y0 - 1e-9 && c.a[1] <= K.doboz.y1 + 1e-9, true, 'inside the ink\'s box (y)')
    assert.equal(c.kes >= 0 && c.kes < 1, true)
  })
  // the box is KAPCS.szeles wide and centred on the origin
  assert.equal(Math.abs(K.doboz.x1 - K.doboz.x0 - KAPCS.szeles) < 1e-9, true)
  assert.equal(Math.abs(K.doboz.x0 + K.doboz.x1) < 1e-9, true)
  // typed from the left: within a line the delay grows with x on average; the second line is later than the first
  const elso = body.filter((c, i) => fut[i].y < 24)
  const masodik = body.filter((c, i) => fut[i].y >= 24)
  assert.equal(Math.min(...masodik.map((c) => c.kes)) > Math.min(...elso.map((c) => c.kes)), true)
  assert.equal(Math.max(...elso.map((c) => c.kes)) < Math.max(...masodik.map((c) => c.kes)), true)
  const balrol = [...elso].sort((a, b) => a.a[0] - b.a[0])
  assert.equal(balrol[0].kes < balrol.at(-1).kes, true)
  // the cursor: last, hot, to the right of the last glyph of the last line
  assert.equal(kurzor.kes > Math.max(...body.map((c) => c.kes)), true)
  assert.equal(kurzor.hot, 1)
  assert.equal(kurzor.a[0] > Math.max(...masodik.map((c) => c.a[0] + c.d[0])), true)
  assert.equal(K.celok.reduce((a, c) => a + Math.max(1, Math.round(c.ismet ?? 1)), 0) < 16 * 1024, true)
})

test('Kapcsolat: a bitmap without ink is an error, the stage has no labels (the address is real text in the DOM), and the camera ends in front of the text', () => {
  assert.throws(() => kapcsolatAdat({ w: 10, h: 10, on: new Uint8Array(100), sorok: 1 }), /no ink/)
  // the address is much wider than it is tall (two lines of about fifteen characters)
  const r = raszter(400, 2, 44, [[10, 130, 8, 36], [150, 250, 8, 36], [270, 390, 8, 36]])
  const K = kapcsolatAdat(r)
  assert.equal(K.feliratok.length, 0)
  assert.equal(K.minta(1, 1.6), null)
  for (const asp of ASPEKTEK) {
    let e = K.poz(0, asp, null)
    for (let i = 1; i <= 300; i++) {
      const p = K.poz(i / 300, asp, null)
      for (let j = 0; j < 3; j++) assert.equal(Math.abs(p.eye[j] - e.eye[j]) < 1.2 * (1 + 1 / Math.max(asp, 0.3)), true, `eye ${j} at ${i / 300} for ${asp}`)
      e = p
    }
    // at the end the whole text is on the screen
    const p = K.poz(1, asp, null)
    const vp = mul(persp(p.fov, asp, 0.1, 300, 0), nez(p.eye, p.tgt).m)
    for (const x of [K.doboz.x0, K.doboz.x1]) for (const y of [K.doboz.y0, K.doboz.y1]) {
      const u = projekt(vp, [x, y, 0])
      assert.notEqual(u, null)
      assert.equal(u[0] > 0 && u[0] < 1 && u[1] > 0 && u[1] < 1, true, `the text's corner ${x},${y} on a ${asp} screen: ${u}`)
    }
  }
  assert.equal(K.ertek(0, 1.6), 0)
  assert.equal(K.ertek(1, 1.6), 1)
  assert.equal(K.padlo, KAPCS.padlo)
})

test('Kapcsolat: the address is written in two lines, split before the "@", and the chapter\'s words are the page\'s own', () => {
  assert.deepEqual(cimSorok('ott.benjamin.ev@ottbenjamin.hu'), ['ott.benjamin.ev', '@ottbenjamin.hu'])
  assert.deepEqual(cimSorok('nincs-kukac'), ['nincs-kukac'])
  assert.equal(KALAND.kapcsolat.adat.includes('@'), true)
  assert.equal(KALAND.kapcsolat.href, `mailto:${KALAND.kapcsolat.adat}`)
  assert.equal(KALAND.kapcsolat.cim, 'Kapcsolat')
  assert.equal(KALAND.kapcsolat.valaszido.length > 0, true)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the labels of the formation scenes and the readouts
test('labels: a lane\'s name wraps in its column, a sheet\'s title is wider than plain text, and none runs off the screen\'s edge', () => {
  const nev = E.feliratok.find((f) => f.tip === 'terulet' && f.szoveg.length > 100)
  assert.notEqual(nev, undefined)
  const { sor, betu } = feliratSorok(nev)
  assert.equal(betu, nev.sor)
  assert.equal(sor >= 3 && sor <= 6, true, `the longest area takes ${sor} lines`)
  assert.deepEqual(feliratSorok({ szoveg: 'rövid', pont: [0, 0, 0], tip: 'terulet', sor: 36 }), { sor: 1, betu: 5 })
  assert.equal(BETU_SZEL, 8.4)
  // a sheet's title and its neighbour's do not print over each other on a phone
  const v = { vp: null, eye: [0, 0, 0], forma: 1, ora: 3, feny: null }
  const p = L.poz(0.574, 0.49, null)
  v.vp = mul(persp(p.fov, 0.49, 0.1, 300, 0), nez(p.eye, p.tgt).m)
  v.eye = p.eye
  const lista = L.feliratok.filter((f) => f.tip === 'lapcim')
  const h = lista.map((f) => feliratHelyzet(f, v, 1, 390, 800))
  const k = feliratUtkozes(lista, h)
  const lathato = k.filter((x) => x.o > 0.3).length
  assert.equal(lathato >= 2, true, 'at least two titles stay')
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    if (k[i].o > 0.3 && k[j].o > 0.3) assert.equal(Math.abs(k[i].x - k[j].x) > 70, true, 'two titles that both show are apart')
  }
})

test('readouts: Évek names the year under the camera and the periods running in it, then the span; formats are the content file\'s', () => {
  const g = E.tengely
  assert.equal(KALAND.evek.olvasat(2024, 3), '2024 \u{b7} 3\u{a0}időszak')
  assert.equal(KALAND.evek.osszkep(g.cellak[0], g.cellak.at(-1), IDOVONAL.length), `${g.cellak[0]}\u{2013}${g.cellak.at(-1)} \u{b7} ${IDOVONAL.length}\u{a0}időszak`)
  assert.deepEqual(KALAND.evek.sorok.map((s) => s.terulet), IDOVONAL.map((i) => i.terulet))
  assert.equal(korl(E.futnak(g.cellak.length - 1) / IDOVONAL.length, 0, 1) > 0, true)
})
