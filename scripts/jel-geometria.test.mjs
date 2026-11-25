import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { figure } from '../src/site/fooldal/regulo/figure.ts'
import { DEMO_URL } from '../src/site/fooldal/regulo/ctrl.ts'
import { CNC1_HOMERSEKLET, HOM_MAX, HOM_MIN, HOM_NYUGALOM, HOM_UTOLSO, KESKENY_PX, QR_MODULOK, QR_SOR0, fmt, homAblak, homIdo, homTrend, homU, nyomPontok, savPontok, tempAt, yAt } from '../src/site/fooldal/jelalak.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The home page's drawings are generated from the prototype's data object; these pins fail when the geometry drifts.
const box = (f) => f.info.parts.map((p) => [p.n, Math.round(p.W), Math.round(p.H)])

test('controller figure, wide: size and the four parts', () => {
  const f = figure('wide')
  assert.deepEqual([f.info.W, f.info.H], [397, 886])
  assert.deepEqual(box(f), [['cover', 363, 354], ['display', 229, 208], ['board', 323, 247], ['base', 397, 336]])
  assert.deepEqual(f.info.parts.map((p) => p.L), [270, 140, 65, 0])
  assert.equal(f.info.dc.r, Math.round(2.6 * 31))
})

test('controller figure, narrow: size and the four parts', () => {
  const f = figure('narrow')
  assert.deepEqual([f.info.W, f.info.H], [280, 474])
  assert.deepEqual(box(f), [['cover', 257, 250], ['display', 164, 149], ['board', 229, 176], ['base', 279, 237]])
  assert.deepEqual(f.info.parts.map((p) => p.L), [150, 50, 24, 0])
})

test('the figure draws the first work picture from /work/ and five keys per part', () => {
  const f = figure('wide')
  assert.match(f.html, /href="\/work\/demo-adatgyujto-1200\.webp"/)
  assert.equal((f.html.match(/class="key" data-k="/g) ?? []).length, 10)
})

test('the QR modules are the demo QR code made by the library of the demo itself (all 29 rows); the trace constant is row 0', () => {
  const lib = fs.readFileSync(path.join(root, 'public/demos/kezikonyv/qrcode-generator.min.js'), 'utf8')
  const qrcode = new Function(`${lib};return qrcode`)()
  const q = qrcode(0, 'M')
  q.addData(DEMO_URL)
  q.make()
  assert.equal(q.getModuleCount(), 29)
  const rows = Array.from({ length: 29 }, (_, r) => Array.from({ length: 29 }, (_, k) => (q.isDark(r, k) ? 1 : 0)).join(''))
  assert.deepEqual([...QR_MODULOK], rows)
  assert.equal(QR_SOR0, rows[0])
})

test('the temperature trace is the CNC-1 history of the demo itself: 60 samples between 50 and 54 degrees, the last one 51,6', () => {
  assert.equal(CNC1_HOMERSEKLET.length, 60)
  assert.ok(CNC1_HOMERSEKLET.every((v) => v > 50 && v < 54), 'no warm-up from the low twenties: the demo never has one')
  assert.equal(CNC1_HOMERSEKLET[59], 51.6)
  assert.equal(fmt(tempAt(1)), '51,6')
  assert.equal(tempAt(0), CNC1_HOMERSEKLET[0])
  assert.equal(fmt(tempAt(1 / 59)), fmt(CNC1_HOMERSEKLET[1]))
  assert.equal(fmt(-1.25), '−1,3')
})

test('the temperature scale is fitted to the hour: 50,7 on the lane level, 53,1 on the top, the rest reading is the last sample, one mapping for the trace and the trend', () => {
  assert.equal(fmt(HOM_MIN), '50,7')
  assert.equal(fmt(HOM_MAX), '53,1')
  assert.equal(HOM_NYUGALOM, CNC1_HOMERSEKLET[HOM_UTOLSO])
  assert.equal(fmt(HOM_NYUGALOM), '51,6')
  assert.equal(homU(HOM_MIN), 0)
  assert.equal(homU(HOM_MAX), 1)
  // the trace: its lowest sample on `low`, its highest on `high`
  const t = nyomPontok('temp', 0, 640, 228, { low: 198, high: 114 })
  const ys = t.pts.map((q) => q[1])
  assert.ok(Math.abs(Math.max(...ys) - 198) < 1e-9, 'the lowest sample is on the lane level')
  assert.ok(Math.abs(Math.min(...ys) - 114) < 1e-9, 'the highest sample is on the top')
  assert.ok(Math.abs(ys[0] - (198 - homU(CNC1_HOMERSEKLET[0]) * 84)) < 1e-9, 'it starts at the first sample, with no ramp')
  // the trend uses the same mapping, within y 1 to 39
  const d = homTrend(homAblak(HOM_UTOLSO, 60))
  const tys = [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((q) => parseFloat(q[2]))
  assert.equal(Math.max(...tys), 39)
  assert.equal(Math.min(...tys), 1)
})

test('the Gépadat band is one window on one time base: N slots of one width, the held stretch is the last n of them, the trace the first m', () => {
  const wide = homIdo(125, 1096, 220, 12)
  assert.equal(wide.N, 60, 'wide: the whole hour')
  assert.ok(Math.abs(wide.p * wide.N - 971) < 1e-9, 'the slots fill the band')
  assert.equal(wide.n + wide.m, wide.N)
  assert.ok(Math.abs(wide.xs - (1096 - wide.n * wide.p)) < 1e-9, 'the held stretch starts on a slot boundary')
  assert.ok(Math.abs(wide.n * wide.p - 220) <= wide.p / 2 + 1e-9, 'it is about the asked length')
  const narrow = homIdo(40, 300, 78, 12)
  assert.ok(narrow.N < 60 && narrow.p >= 12 - 1e-9, 'narrow: fewer slots, none narrower than a held step')
  assert.ok(Math.abs(narrow.p * narrow.N - 260) < 1e-9)
  const tiny = homIdo(0, 20, 6, 12)
  assert.ok(tiny.N >= 2 && tiny.n >= 1 && tiny.m >= 0, 'a tiny band still has a held stretch')
  for (const [xa, x1] of [[10, 10], [30, 10]]) {
    const z = homIdo(xa, x1, 6, 12)
    assert.ok(Number.isFinite(z.p) && z.p > 0 && z.N >= 2 && z.n >= 1 && z.m >= 0 && Number.isFinite(z.xs), `no width (${xa}, ${x1}) gives finite, positive slots`)
  }
})

test("a live sample is the next value of the demo's hour, cyclically", () => {
  const w = homAblak(HOM_UTOLSO, 5)
  assert.deepEqual(w, CNC1_HOMERSEKLET.slice(55))
  assert.equal(w[4], 51.6)
  assert.deepEqual(homAblak(0, 3), [CNC1_HOMERSEKLET[58], CNC1_HOMERSEKLET[59], CNC1_HOMERSEKLET[0]], 'after the 60th comes the 1st')
  assert.equal(homAblak(5, 24).length, 24)
})

test('the four pairs traces are the built traces of the works (one definition for the cable run and the first screen); the band limits only move their levels', () => {
  const W = 600
  for (const kind of ['qr', 'panel', 'temp', 'speech']) {
    const built = nyomPontok(kind, 40, W, 240)
    const again = nyomPontok(kind, 40, W, 240)
    assert.deepEqual(built.pts, again.pts, `${kind} is reproducible`)
    const x = built.pts.map((p) => p[0])
    assert.ok(Math.abs(x[0] - 40) < 1e-9, `${kind} starts at cx`)
    assert.ok(Math.abs(x[x.length - 1] - (40 + W)) < 1e-9, `${kind} ends at the right end`)
    const band = nyomPontok(kind, 40, W, 240, { low: 210, high: 150 })
    assert.equal(band.pts.length, built.pts.length, `${kind} keeps its shape`)
  }
})

test('the sampled stretch of the band holds a level per step and ends on the last level', () => {
  const trace = [[0, 100], [200, 100], [200, 40], [400, 40]]
  assert.equal(yAt(trace, 150), 100)
  assert.equal(yAt(trace, 300), 40)
  const s = savPontok(trace, 200, 400, 50)
  assert.equal(s.ticks.length, 4)
  assert.equal(s.endY, 40)
  assert.equal(s.pts[s.pts.length - 1][0], 400)
  const moved = savPontok(trace, 200, 400, 50, (k) => (k === 3 ? -5 : 0))
  assert.equal(moved.endY, 35, 'the last held level is the reading and moves with its sample')
})

test('the held steps report their levels (the ticks of the temperature band stand under them)', () => {
  const trace = [[0, 100], [200, 100], [400, 40]]
  const s = savPontok(trace, 200, 400, 50, (k) => (k === 1 ? 3 : 0))
  assert.equal(s.levels.length, s.ticks.length)
  assert.deepEqual(s.levels, [92.5, 80.5, 62.5, 47.5], "each step holds the trace's level at its middle (100 at x 200 down to 40 at x 400); the second one carries its sample of 3")
  assert.equal(s.levels[s.levels.length - 1], s.endY)
})

test('the speech trace with a silence: quiet to the mute, its bursts inside the rest of the width and under the cap', () => {
  const W = 971
  const t = nyomPontok('speech', 125, W, 228, { low: 198, high: 158, mute: 223 })
  const loud = t.pts.filter((p) => p[1] < 198 - 0.5)
  assert.ok(loud.length > 0)
  assert.ok(Math.min(...loud.map((p) => p[0])) >= 125 + 223 - 1, 'nothing before the silence ends')
  assert.ok(Math.min(...t.pts.map((p) => p[1])) >= 158 - 1e-6, 'the peaks stay under the cap (40 px)')
  assert.ok(Math.abs(t.pts[t.pts.length - 1][0] - (125 + W)) < 1e-9, 'it still ends at the right end')
  const plain = nyomPontok('speech', 125, W, 228, { low: 198, high: 158 })
  assert.ok(Math.min(...plain.pts.filter((p) => p[1] < 197).map((p) => p[0])) < 125 + 223, 'without mute it starts earlier (the works keep their traces)')
})

test('the layout switch is 726: phone up to it, wide from 727', () => {
  assert.equal(KESKENY_PX, 726)
})
