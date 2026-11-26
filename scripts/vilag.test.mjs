// The pure parts of the adventure world (src/vilag/): the quality ladder, the gate, the chapter timeline, the route geometry, the sound's scale and the loader's counter.
// They import no DOM and no GL, so the ladder's behaviour is tested here with synthetic frame streams (the e2e spec only has to prove the wiring).
import assert from 'node:assert/strict'
import test from 'node:test'
import { GEPADAT_MAX, GEPADAT_MIN, MINTAK } from '../src/content/mintak.ts'
import { SZONDA_TAV, feliratHelyzet, feliratUtkozes, feliratok, szondaMinta } from '../src/vilag/feliratok.ts'
import { progU, rajzol } from '../src/vilag/gl.ts'
import { ALAP_HATASOK, ALAP_RETEGEK, GAZDAG_HATASOK, HATASOK, RETEGEK, hatasokMasolat } from '../src/vilag/hatasok.ts'
import { bemelegitesIndok, kapuIndok } from '../src/vilag/kapu.ts'
import { ablakStat, ABLAK, GPU_IKER, GPU_MAX, Letra, ORT_MAX, SKALA_MIN } from '../src/vilag/letra.ts'
import { ELSO_SZAKASZ, FEJEZETEK, fejezetAt, Halado } from '../src/vilag/idovonal.ts'
import { hangNota } from '../src/vilag/hang.ts'
import { korl, mul, nez, persp, sm } from '../src/vilag/matek.ts'
import { KAMERA_NYITAS, KULCSKOCKAK, NEZETEK, NEZET_SZAMOK, hatasos, kameraAt, nezetAt, nezetKever, nezetNev } from '../src/vilag/nezet.ts'
import { AMPY, GX, KAMERA_ELOL, LZ, PADLO, PIC_SHIFT, PICW, REPULES_VEGE, ZP, cx, palya } from '../src/vilag/palya.ts'
import { KERET, KIND, RACS_KULCS, racs } from '../src/vilag/racs.ts'
import { kepAtlag } from '../src/vilag/reszecskek.ts'
import { Toltoszal, toltesIndex } from '../src/vilag/toltoszal.ts'
import { LEPESEK, Lepesek } from '../src/vilag/toltes.ts'

const nemKoltseg = () => assert.fail('the GPU cost must not be measured here')

/** Feeds `n` frames of the same interval; returns every non-null decision. */
function etet(l, dt, n, koltseg = nemKoltseg) {
  const ki = []
  for (let i = 0; i < n; i++) {
    const r = l.kocka(dt, koltseg)
    if (r) ki.push(r)
  }
  return ki
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the ladder
test('ladder: a fast window changes nothing and never measures the GPU', () => {
  const l = new Letra({ szint: 'teljes' })
  const r = etet(l, 16.7, ABLAK * 3)
  assert.deepEqual(r.map((x) => x.tipus), ['rendben', 'rendben', 'rendben'])
  assert.equal(l.skala, 1)
  assert.equal(l.szint, 'teljes')
})

test('ladder: a window is statistics of the trimmed frames (warm-up and the two slowest dropped), median and p95 reported', () => {
  const dts = [...Array(5).fill(500), ...Array(38).fill(16), 90, 95] // 5 warm-up frames, 38 normal, 2 outliers
  const st = ablakStat(dts)
  assert.equal(st.median, 16)
  assert.equal(st.ort, 16) // the two outliers are the two slowest of the 40 kept frames: dropped
  assert.ok(st.p95 >= 16)
  const l = new Letra({ szint: 'teljes' })
  assert.equal(etet(l, 16.7, ABLAK)[0].tipus, 'rendben')
})

test('ladder: a slow window with a cheap GPU is a capped frame rate (no step), checked again every 10th window only', () => {
  const l = new Letra({ szint: 'teljes' })
  let hivasok = 0
  const olcso = () => (hivasok++, GPU_MAX - 10)
  const r = etet(l, 31.2, ABLAK * 12, olcso)
  assert.equal(r[0].tipus, 'kap')
  assert.ok(r.every((x) => x.tipus === 'kap'))
  assert.equal(l.skala, 1)
  assert.equal(l.szint, 'teljes')
  assert.equal(l.kap, true)
  assert.equal(hivasok, 2, 'measured at window 1 and again at window 10 (and not at 2 to 9, 11 and 12)')
})

test('ladder: a capped frame rate that becomes fast again is released', () => {
  const l = new Letra({ szint: 'teljes' })
  etet(l, 31.2, ABLAK, () => 3)
  assert.equal(l.kap, true)
  etet(l, 16.7, ABLAK)
  assert.equal(l.kap, false)
})

test('ladder: an expensive GPU steps the render scale down by 15 %, to the floor, then the light tier, then the twin', () => {
  const l = new Letra({ szint: 'teljes' })
  const gpu = () => GPU_MAX + 6
  const tipusok = []
  const skalak = []
  for (let i = 0; i < 12; i++) {
    const r = etet(l, 40, ABLAK, gpu)[0]
    tipusok.push(r.tipus)
    skalak.push(Number(l.skala.toFixed(3)))
  }
  assert.deepEqual(tipusok.slice(0, 5), ['skala', 'skala', 'skala', 'skala', 'konnyu'], 'four scale steps (1 > 0.85 > 0.72 > 0.61 > 0.55), then the light tier')
  assert.deepEqual(skalak.slice(0, 5), [0.85, 0.722, 0.614, SKALA_MIN, 0.8])
  assert.equal(l.szint, 'konnyu')
  // at the bottom the GPU cost decides between staying and the twin: 20 ms is over budget but tolerated
  assert.equal(tipusok.at(-1), 'marad')
  assert.ok(l.skala >= SKALA_MIN - 1e-9)
})

test('ladder: over the twin threshold at the bottom tier, the ladder says "iker"', () => {
  const l = new Letra({ szint: 'konnyu' })
  const gpu = () => GPU_IKER + 4
  const tipusok = []
  for (let i = 0; i < 8; i++) tipusok.push(etet(l, 60, ABLAK, gpu)[0].tipus)
  assert.equal(tipusok[0], 'skala')
  assert.equal(tipusok.at(-1), 'iker')
  assert.equal(tipusok.includes('konnyu'), false, 'a phone already starts on the light tier')
})

test('ladder: a frozen ladder never steps and never measures', () => {
  const l = new Letra({ szint: 'teljes' })
  l.rogzitve = true
  const r = etet(l, 60, ABLAK * 3)
  assert.deepEqual(r.map((x) => x.tipus), ['rogzitve', 'rogzitve', 'rogzitve'])
  assert.equal(l.skala, 1)
})

test('ladder: an open window can be dropped (a hidden tab, a measurement)', () => {
  const l = new Letra({ szint: 'teljes' })
  etet(l, 100, ABLAK - 1)
  l.nullaz()
  const r = etet(l, 16.7, ABLAK)
  assert.equal(r[0].tipus, 'rendben')
})

test('ladder: the thresholds are the ones the owner saw measured (20.5 ms interval, 14 ms GPU, 26 ms twin)', () => {
  assert.equal(ORT_MAX, 20.5)
  assert.equal(GPU_MAX, 14)
  assert.equal(GPU_IKER, 26)
  assert.equal(SKALA_MIN, 0.55)
})

test('ladder: the CI hook can shorten the window and move the GPU threshold', () => {
  const l = new Letra({ szint: 'teljes', ablak: 8, gpuMax: 2 })
  const r = etet(l, 40, 8, () => 3)
  assert.equal(r[0].tipus, 'skala')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the gate
const ok = { webgl2: true, mentesiAdat: false, kontextus: 'ok', renderer: 'ANGLE (Intel, Intel(R) Graphics (0x00007D67) Direct3D11)' }
test('gate: a hardware renderer passes', () => {
  assert.equal(kapuIndok(ok), null)
})
test('gate: no WebGL2, Save-Data, no context, a performance caveat and a software renderer each refuse, in that order', () => {
  assert.equal(kapuIndok({ ...ok, webgl2: false }), 'no-webgl2')
  assert.equal(kapuIndok({ ...ok, mentesiAdat: true }), 'save-data')
  assert.equal(kapuIndok({ ...ok, kontextus: 'nincs' }), 'no-context')
  assert.equal(kapuIndok({ ...ok, kontextus: 'teljesitmeny' }), 'performance-caveat')
  for (const r of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15)', 'Microsoft Basic Render Driver', 'Mesa softpipe']) {
    assert.match(kapuIndok({ ...ok, renderer: r }), /^software-renderer: /, r)
  }
})
test('gate: the CI hook admits a software renderer but still needs a context, and Save-Data still wins', () => {
  const sw = { ...ok, renderer: 'SwiftShader', szoftveresEngedett: true }
  assert.equal(kapuIndok(sw), null)
  assert.equal(kapuIndok({ ...sw, kontextus: 'nincs' }), 'no-context')
  assert.equal(kapuIndok({ ...sw, mentesiAdat: true }), 'save-data')
})
test('warm-up: only an unmetered, visible, gate-passing visitor downloads ahead of the click', () => {
  const jo = { mentesiAdat: false, tipus: '4g', lathato: true, kapuElutasitotta: false }
  assert.equal(bemelegitesIndok(jo), null)
  assert.equal(bemelegitesIndok({ ...jo, tipus: undefined }), null, 'where the connection type is unknown (Firefox, Safari) only the idle rule applies')
  assert.equal(bemelegitesIndok({ ...jo, kapuElutasitotta: true }), 'gate-refused')
  assert.equal(bemelegitesIndok({ ...jo, mentesiAdat: true }), 'save-data')
  assert.equal(bemelegitesIndok({ ...jo, tipus: '3g' }), 'slow-connection: 3g')
  assert.equal(bemelegitesIndok({ ...jo, tipus: 'slow-2g' }), 'slow-connection: slow-2g')
  assert.equal(bemelegitesIndok({ ...jo, lathato: false }), 'tab-hidden')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the chapter timeline and the progress
test('timeline: chapters take over in order, and the route lane keys point at the place where a chapter reads best', () => {
  assert.deepEqual(FEJEZETEK.map((f) => f.id), ['gepadat', 'honlap', 'evek', 'palyazat', 'kapcsolat'])
  for (let i = 1; i < FEJEZETEK.length; i++) assert.ok(FEJEZETEK[i].tol > FEJEZETEK[i - 1].tol, 'strictly increasing')
  assert.equal(FEJEZETEK[0].tol, 0)
  for (const f of FEJEZETEK) assert.equal(fejezetAt(f.nyugalom).id, f.id, `${f.id}'s rest position is inside the chapter`)
  // the first two chapters keep the numbers they were written with, in the first scene's own progress (it is the first ELSO_SZAKASZ of the route)
  const eps = 1e-9
  assert.equal(fejezetAt(0).id, 'gepadat')
  assert.equal(fejezetAt(0.9 * ELSO_SZAKASZ - eps).id, 'gepadat')
  assert.equal(fejezetAt(0.9 * ELSO_SZAKASZ).id, 'honlap')
  assert.equal(fejezetAt(ELSO_SZAKASZ).id, 'honlap')
  assert.equal(fejezetAt(1).id, 'kapcsolat')
})

test('progress: it eases toward the target, snaps when close, clamps, and does not ease when still', () => {
  const h = new Halado()
  h.allit(2)
  assert.equal(h.cel, 1)
  h.allit(-3)
  assert.equal(h.cel, 0)
  h.allit(1)
  assert.equal(h.lep(1 / 60, false), true)
  assert.ok(h.sima > 0 && h.sima < 1)
  assert.ok(h.mozgas > 0)
  for (let i = 0; i < 600; i++) h.lep(1 / 60, false)
  assert.equal(h.sima, 1)
  assert.equal(h.lep(1 / 60, false), false)
  const still = new Halado()
  still.allit(0.4)
  assert.equal(still.lep(1 / 60, true), false)
  assert.equal(still.sima, 0.4)
})

test('progress: the critically damped spring accelerates smoothly from rest, never overshoots, settles within 3 s, and absorbs mid-flight target changes without speed jumps', () => {
  const h = new Halado()
  h.allit(0.5)
  const lepesek = []
  for (let i = 0; i < 180; i++) {
    const elozo = h.sima
    h.lep(1 / 60, false)
    lepesek.push(h.sima - elozo)
    assert.ok(h.sima <= 0.5 + 1e-6, `frame ${i}: overshot target (${h.sima})`)
  }
  assert.ok(lepesek[0] > 0 && lepesek[0] < 0.01, `first frame advance ${lepesek[0]} must be under 0.01`)
  for (let i = 1; i < 30; i++) {
    assert.ok(Math.abs(lepesek[i] - lepesek[i - 1]) <= 0.004, `frames ${i - 1}->${i}: advance jumped by ${Math.abs(lepesek[i] - lepesek[i - 1])}`)
  }
  assert.equal(h.sima, 0.5)
  assert.equal(h.seb, 0)

  // Target change mid-flight after 10 frames does not make the per-frame advance jump by more than 0.004
  const mid = new Halado()
  mid.allit(0.5)
  let elozoLepes = 0
  for (let i = 0; i < 40; i++) {
    if (i === 10) mid.allit(0.8)
    const elozo = mid.sima
    mid.lep(1 / 60, false)
    const d = mid.sima - elozo
    assert.ok(Math.abs(d - elozoLepes) <= 0.004, `mid-flight frame ${i}: advance jumped by ${Math.abs(d - elozoLepes)}`)
    assert.ok(mid.sima <= 0.8 + 1e-6)
    elozoLepes = d
  }
  mid.ugrik(0.25)
  assert.equal(mid.sima, 0.25)
  assert.equal(mid.seb, 0)
  mid.allit(0.6)
  mid.lep(1 / 60, false)
  mid.lep(1 / 60, true)
  assert.equal(mid.seb, 0)
})

test('progress: a wheel-notch step peaks well below the old first-order jump, never overshoots, and settles within 3 s', () => {
  const h = new Halado(0.3)
  h.allit(0.328)
  let maxDelta = 0
  for (let i = 0; i < 180; i++) {
    const elozo = h.sima
    h.lep(1 / 60, false)
    maxDelta = Math.max(maxDelta, Math.abs(h.sima - elozo))
    assert.ok(h.sima <= 0.328 + 1e-6, `frame ${i}: overshot target (${h.sima})`)
  }
  assert.ok(maxDelta > 0 && maxDelta <= 0.0014, `peak per-frame change ${maxDelta} exceeds 0.0014`)
  assert.ok(Math.abs(h.sima - 0.328) <= 1e-4, `did not settle within 1e-4 of 0.328 (${h.sima})`)
})

test('progress: a reversal at any sub-frame phase turns around smoothly without a one-frame dead stop', () => {
  const dt = 1 / 60
  const frames = Math.round((0.5 + 1 + 3) / dt)
  for (let k = 0; k <= 9; k++) {
    const phi = k / 10
    const h = new Halado(0.3)
    let elozoSeb = h.seb
    for (let i = 0; i < frames; i++) {
      const t = (i + phi) * dt
      const cel = t < 0.5 ? 0.3 + 0.2 * t : t < 1.5 ? 0.4 - 0.2 * (t - 0.5) : 0.2
      h.allit(cel)
      h.lep(dt, false)
      assert.ok(Math.abs(h.seb - elozoSeb) <= 0.03, `phi=${phi} frame ${i}: speed jumped from ${elozoSeb} to ${h.seb}`)
      assert.ok(h.sima >= 0 && h.sima <= 1, `phi=${phi} frame ${i}: sima out of [0, 1]: ${h.sima}`)
      elozoSeb = h.seb
    }
    assert.ok(Math.abs(h.sima - 0.2) <= 1e-4, `phi=${phi}: did not settle within 1e-4 of 0.2 (${h.sima})`)
  }
})

test('progress: sima stays within [0, 1] when approaching or jumping to the route bounds', () => {
  const hi = new Halado(0.98)
  hi.allit(1)
  for (let i = 0; i < 180; i++) {
    hi.lep(1 / 60, false)
    assert.ok(hi.sima >= 0 && hi.sima <= 1, `upper approach frame ${i}: ${hi.sima}`)
  }
  hi.ugrik(1)
  assert.equal(hi.sima, 1)
  hi.lep(1 / 60, false)
  assert.ok(hi.sima <= 1)
  hi.ugrik(0.995)
  hi.seb = 0.5
  hi.allit(1)
  hi.lep(1 / 60, false)
  assert.equal(hi.sima, 1)
  assert.equal(hi.seb, 0)

  const lo = new Halado(0.02)
  lo.allit(0)
  for (let i = 0; i < 180; i++) {
    lo.lep(1 / 60, false)
    assert.ok(lo.sima >= 0 && lo.sima <= 1, `lower approach frame ${i}: ${lo.sima}`)
  }
  lo.ugrik(0)
  assert.equal(lo.sima, 0)
  lo.lep(1 / 60, false)
  assert.ok(lo.sima >= 0)
  lo.ugrik(0.005)
  lo.seb = -0.5
  lo.allit(0)
  lo.lep(1 / 60, false)
  assert.equal(lo.sima, 0)
  assert.equal(lo.seb, 0)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the route geometry (the camera and the sample under it)
const R = palya(MINTAK.gepadat.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor)
test('route: the ribbon is normalised between the series\' own minimum and maximum', () => {
  assert.equal(R.min, GEPADAT_MIN)
  assert.equal(R.max, GEPADAT_MAX)
  const N = MINTAK.gepadat.ertekek.length
  for (const i of [0, 1, 100, 239, N - 2, N - 1]) {
    const u = 1 - i / (N - 1)
    assert.ok(Math.abs(R.vnAt(u) - (MINTAK.gepadat.ertekek[i] - GEPADAT_MIN) / (GEPADAT_MAX - GEPADAT_MIN)) < 1e-9, `sample ${i}`)
  }
  assert.ok(Math.abs(R.szalag(0.5).y) <= AMPY / 2)
})
test('route: the camera opens in front of the newest minute and ends in front of the picture, the sample under it runs from the newest to older ones', () => {
  const asp = 16 / 10
  const a = R.poz(0, asp)
  assert.equal(a.eye[2], KAMERA_ELOL)
  assert.equal(a.forma, 0)
  const z = R.poz(1, asp)
  assert.equal(z.forma, 1)
  assert.ok(Math.abs(z.eye[0]) < 1e-9 && Math.abs(z.eye[1] - R.picY) < 1e-9, 'level with the picture\'s centre (the lens shift lifts the picture, the camera does not tilt)')
  assert.ok(Math.abs(z.eye[2] - (ZP + R.endTav(asp))) < 1e-9)
  assert.deepEqual([z.tgt[0], z.tgt[1], z.tgt[2]].map((x) => Math.abs(x) < 1e-9 ? 0 : x), [0, R.picY, ZP])
  assert.ok(Math.abs(z.shift - PIC_SHIFT) < 1e-9 && a.shift === 0, 'the lens shift is the picture\'s own and comes in with it')
  assert.ok(R.picY > PADLO && R.picY - R.hp / 2 > PADLO, 'the picture stands above the floor')
  assert.equal(R.index(0, asp), MINTAK.gepadat.ertekek.length - 1)
  assert.ok(R.index(0.5, asp) < R.index(0.1, asp), 'depth is time: deeper means an older minute')
  assert.ok(LZ > 0)
})
test('route: the camera moves continuously along the whole route and for every viewport shape', () => {
  for (const asp of [0.46, 1, 16 / 10, 2.4]) {
    let prev = R.poz(0, asp)
    for (let i = 1; i <= 2000; i++) {
      const c = R.poz(i / 2000, asp)
      const d = Math.hypot(c.eye[0] - prev.eye[0], c.eye[1] - prev.eye[1], c.eye[2] - prev.eye[2])
      assert.ok(d < 0.6, `aspect ${asp}: a jump of ${d.toFixed(3)} at ${i / 2000}`)
      assert.ok(Number.isFinite(c.tgt[0] + c.tgt[1] + c.tgt[2]))
      prev = c
    }
  }
})
test('route: the camera guide is smoothed while staying within 1.5·AMPY of the true ribbon, and the flight camera follows it before the picture blend', () => {
  const guideY = []
  const trueY = []
  for (let i = 0; i <= 2000; i++) {
    const u = i / 2000
    const gy = R.kameraSzalag(u).y
    const ty = R.szalag(u).y
    guideY.push(gy)
    trueY.push(ty)
    assert.ok(Math.abs(gy - ty) <= 1.5 * AMPY, `u=${u}: guide y ${gy} deviates from true y ${ty} by more than 1.5·AMPY`)
  }
  const masodKul = (ys) => {
    let s = 0
    for (let i = 1; i < ys.length - 1; i++) s += Math.abs(ys[i + 1] - 2 * ys[i] + ys[i - 1])
    return s
  }
  const guideDiff2 = masodKul(guideY)
  const trueDiff2 = masodKul(trueY)
  assert.ok(guideDiff2 <= 0.25 * trueDiff2, `guide second difference ${guideDiff2.toFixed(4)} exceeds a quarter of the true ribbon's ${trueDiff2.toFixed(4)}`)

  const asp = 1.6
  const offY = kameraAt(KAMERA_NYITAS, 1)[1]
  for (let i = 0; i <= 300; i++) {
    const p = 0.25 + (0.55 - 0.25) * (i / 300)
    const c = R.poz(p, asp)
    const u = korl(-c.zc / LZ, 0, 1)
    assert.ok(c.eye[1] >= -AMPY / 2 - AMPY && c.eye[1] <= AMPY / 2 + AMPY, `eye y ${c.eye[1]} stays within the ribbon's height band plus AMPY`)
    assert.ok(Math.abs(c.eye[1] - (R.kameraSzalag(u).y + offY)) < 1e-9, `at p=${p} before the picture blend, eye y follows the guide`)
  }
})
test('route: the picture fits the view at the end for a tall phone and a wide screen', () => {
  assert.ok(R.endTav(0.46) > R.endTav(1.6), 'a narrow view stands further back so that the picture still fits its width')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// the sound's scale, the loader's counter, the matrix helpers
test('sound: the same value always gives the same note, and the scale rises with the value over two pentatonic octaves', () => {
  assert.deepEqual(hangNota(0.37), hangNota(0.37))
  let prev = 0
  const lepcsok = new Set()
  for (let i = 0; i <= 100; i++) {
    const n = hangNota(i / 100)
    assert.ok(n.hz >= prev)
    prev = n.hz
    lepcsok.add(n.lepcso)
  }
  assert.equal(lepcsok.size, 10)
  assert.ok(Math.abs(hangNota(0).hz - 146.83) < 1e-9)
  assert.ok(Math.abs(hangNota(1).hz / hangNota(0).hz - 2 ** (21 / 12)) < 1e-9, 'step 9 is the 4th degree of the second octave: 12 + 9 semitones')
  assert.equal(hangNota(-4).lepcso, 0)
  assert.equal(hangNota(7).lepcso, 9)
})

test('loader: stages are declared up front, count once, and only declared ones count', () => {
  let valtozas = 0
  const l = new Lepesek(LEPESEK, () => valtozas++)
  assert.equal(l.osszes, LEPESEK.length)
  assert.equal(new Set(LEPESEK).size, LEPESEK.length, 'stage names are unique')
  assert.equal(l.kesznek, 0)
  assert.equal(l.arany, 0)
  l.kesz('module')
  l.kesz('module')
  l.kesz('nem-letezik')
  assert.equal(l.kesznek, 1)
  assert.equal(valtozas, 1)
  for (const n of LEPESEK) l.kesz(n)
  assert.equal(l.vege, true)
  assert.equal(l.arany, 1)
  assert.equal(valtozas, LEPESEK.length)
})

test('math: smoothstep, clamp, and a view matrix that puts the target on the optical axis', () => {
  assert.equal(korl(5, 0, 1), 1)
  assert.equal(sm(0.2, 0.4, 0.1), 0)
  assert.equal(sm(0.2, 0.4, 0.5), 1)
  assert.ok(Math.abs(sm(0.2, 0.4, 0.3) - 0.5) < 1e-12)
  const v = nez([1, 2, 5], [1, 2, -5])
  const vp = mul(persp(Math.PI / 3, 1.5, 0.1, 100), v.m)
  // the centre of the view maps to clip x = y = 0
  const cl = (p) => [0, 1, 2, 3].map((r) => vp[r] * p[0] + vp[4 + r] * p[1] + vp[8 + r] * p[2] + vp[12 + r])
  const c = cl([1, 2, -5])
  assert.ok(Math.abs(c[0]) < 1e-5 && Math.abs(c[1]) < 1e-5 && c[3] > 0)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// V2b: the looks engine. Looks are data, the discrete switches are gains, the ladder drops the mirror and the effects first.
const G = MINTAK.gepadat
const P = palya(G.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor, G.kezdetPerc)

test('ladder: with the mirror and the effects on, the first step switches them off (not the scale), then the V2 ladder runs as before', () => {
  const l = new Letra({ szint: 'teljes', hatasok: true })
  const gpu = () => GPU_MAX + 6
  const tipusok = []
  for (let i = 0; i < 14; i++) tipusok.push(etet(l, 40, ABLAK, gpu)[0].tipus)
  assert.deepEqual(tipusok.slice(0, 6), ['hatasKi', 'skala', 'skala', 'skala', 'skala', 'konnyu'], 'the V2 ladder follows unchanged: four scale steps, then the light tier')
  assert.equal(tipusok.filter((t) => t === 'hatasKi').length, 1, 'the first step happens once')
  assert.equal(tipusok.at(-1), 'marad')
  assert.equal(l.hatasok, false)
  assert.equal(l.szint, 'konnyu')
})

test('ladder: the first step needs the GPU to be the limit, a capped frame rate never takes the effects away', () => {
  const l = new Letra({ szint: 'teljes', hatasok: true })
  const r = etet(l, 31.2, ABLAK * 3, () => 3)
  assert.equal(r.every((x) => x.tipus === 'kap'), true)
  assert.equal(l.hatasok, true)
  const f = new Letra({ szint: 'teljes', hatasok: true })
  f.rogzitve = true
  assert.deepEqual(etet(f, 60, ABLAK).map((x) => x.tipus), ['rogzitve'])
  assert.equal(f.hatasok, true)
})

test('ladder: a phone starts on the light tier without the mirror and the effects, so it never sees that step; and without the option the ladder is the V2 one', () => {
  const t = new Letra({ szint: 'konnyu' })
  assert.equal(t.hatasok, false)
  assert.equal(etet(t, 40, ABLAK, () => GPU_MAX + 6)[0].tipus, 'skala')
  const v2 = new Letra({ szint: 'teljes' })
  assert.equal(etet(v2, 40, ABLAK, () => GPU_MAX + 6)[0].tipus, 'skala')
})

test('looks: each look has every number, finite, and the camera has six; the three the owner kept are there', () => {
  assert.deepEqual(Object.keys(NEZETEK).sort(), ['aramlas', 'muszer', 'szinpad'])
  for (const [id, n] of Object.entries(NEZETEK)) {
    for (const k of NEZET_SZAMOK) assert.equal(Number.isFinite(n[k]), true, `${id}.${k}`)
    assert.equal(n.kamera.length, 6, id)
  }
  assert.deepEqual([...NEZETEK.muszer.kamera], [...KAMERA_NYITAS])
})

test('looks: the keyframes are in order, start at the opening and finish at the end, and the first change ends where the camera\'s own move ends', () => {
  const ps = KULCSKOCKAK.map((k) => k.p)
  assert.deepEqual([...ps].sort((a, b) => a - b), ps)
  for (let i = 1; i < ps.length; i++) assert.equal(ps[i] > ps[i - 1], true, 'strictly increasing')
  assert.equal(ps[0], 0)
  assert.equal(ps.at(-1), 1)
  // the first scene's keyframes are written in its own progress and scaled onto the route
  assert.equal(Math.abs(KULCSKOCKAK[1].p - REPULES_VEGE * ELSO_SZAKASZ) < 1e-12, true, 'the cross-fade to Áramlás is over when the flight begins')
  // the formation chapters, as the owner approved the mapping: Évek Mérőműszer, Pályázat Színpad, Kapcsolat Áramlás
  assert.deepEqual(KULCSKOCKAK.map((k) => k.nezet), ['muszer', 'aramlas', 'aramlas', 'szinpad', 'szinpad', 'muszer', 'muszer', 'szinpad', 'szinpad', 'aramlas', 'aramlas'])
})

test('looks: Mérőműszer opens, Áramlás flies, Színpad stages, and each formation chapter has its own look at its rest position', () => {
  const E = ELSO_SZAKASZ
  for (const [p, nev] of [[0, 'muszer'], [0.05 * E, 'muszer'], [0.22 * E, 'aramlas'], [0.35 * E, 'aramlas'], [0.5 * E, 'aramlas'], [0.85 * E, 'szinpad'], [E, 'szinpad']]) assert.equal(nezetNev(p), nev, `p ${p}`)
  for (const f of FEJEZETEK) {
    const nev = { gepadat: 'muszer', honlap: 'szinpad', evek: 'muszer', palyazat: 'szinpad', kapcsolat: 'aramlas' }[f.id]
    if (f.id !== 'gepadat') assert.equal(nezetNev(f.nyugalom), nev, `${f.id} at its rest position`)
  }
  assert.equal(nezetAt(0), NEZETEK.muszer)
  assert.equal(nezetAt(1), NEZETEK.aramlas)
  assert.equal(nezetAt(0.35 * E), NEZETEK.aramlas)
  assert.equal(nezetAt(-1), NEZETEK.muszer, 'clamped')
  assert.equal(nezetAt(7), NEZETEK.aramlas, 'clamped')
})

test('looks: a change between two looks is a continuous cross-fade of numbers (the comets\' gain rises from 0 to 1 over the flight\'s opening, the camera moves smoothly)', () => {
  const E = ELSO_SZAKASZ
  const vege = REPULES_VEGE * E
  let elozo = nezetAt(0)
  let ln = 0
  for (let i = 1; i <= 400; i++) {
    const n = nezetAt(i / 400)
    for (const k of NEZET_SZAMOK) assert.equal(Math.abs(n[k] - elozo[k]) < 0.1 * (Math.abs(NEZETEK.muszer[k]) + Math.abs(NEZETEK.aramlas[k]) + Math.abs(NEZETEK.szinpad[k]) + 1), true, `${k} at ${i / 400} does not jump`)
    n.kamera.forEach((x, j) => assert.equal(Math.abs(x - elozo.kamera[j]) < 2, true, `camera ${j} does not jump`))
    if (i / 400 <= vege) {
      assert.equal(n.ln >= ln - 1e-12, true, 'comets only fade in while Mérőműszer turns into Áramlás')
      ln = n.ln
    }
    elozo = n
  }
  assert.equal(ln > 0.9, true, 'the comets are almost all in at the last sample before the flight begins')
  assert.equal(nezetAt(vege).ln, 1)
  const fele = nezetAt(vege / 2)
  assert.equal(fele.ln > 0.2 && fele.ln < 0.8, true, 'in the middle of the change both are drawn')
  assert.equal(fele.gr > NEZETEK.aramlas.gr && fele.gr < NEZETEK.muszer.gr, true, 'the grid fades from 1 to 0.5')
  assert.equal(nezetAt(0.35 * E).lb, 1, 'the value labels have faded out in the flight, the hours and the extremes stay')
})

test('looks: the blend of two looks is linear in t and clamps', () => {
  const m = nezetKever(NEZETEK.muszer, NEZETEK.szinpad, 0.5)
  for (const k of NEZET_SZAMOK) assert.equal(Math.abs(m[k] - (NEZETEK.muszer[k] + NEZETEK.szinpad[k]) / 2) < 1e-12, true, k)
  assert.deepEqual(nezetKever(NEZETEK.muszer, NEZETEK.szinpad, -3).sp, NEZETEK.muszer.sp)
  assert.deepEqual(nezetKever(NEZETEK.muszer, NEZETEK.szinpad, 3).sp, NEZETEK.szinpad.sp)
})

test('looks: the camera belongs to the look, and Mérőműszer\'s camera is exactly the one the V2 route had', () => {
  const regi = (ko) => [-9 + 7.1 * ko, 3.6 - 2.5 * ko, 26 - 15 * ko]
  for (const ko of [0, 0.3, 1]) kameraAt(KAMERA_NYITAS, ko).forEach((x, i) => assert.equal(Math.abs(x - regi(ko)[i]) < 1e-9, true))
  const a = P.poz(0.1, 1.6)
  const b = P.poz(0.1, 1.6, NEZETEK.muszer.kamera)
  assert.deepEqual(a, b)
  const c = P.poz(0.1, 1.6, NEZETEK.szinpad.kamera)
  assert.notDeepEqual(c.eye, a.eye, 'another look puts the camera elsewhere')
  assert.equal(a.elore, kameraAt(KAMERA_NYITAS, sm(0, REPULES_VEGE, 0.1))[2])
})

test('switches: an effect that is off has strength 0, a factor scales the look\'s own number, a layer that is off has gain 0', () => {
  const n = NEZETEK.szinpad
  const mind = hatasos(n, ALAP_HATASOK, ALAP_RETEGEK)
  for (const k of NEZET_SZAMOK) assert.equal(mind[k], n[k], `all on changes nothing: ${k}`)
  const h = hatasokMasolat({ fenycsova: { be: false }, bloom: { ero: 0.5 }, melyseg: { be: false } })
  const r = { ...ALAP_RETEGEK, tukor: false, felirat: false, racs: false }
  const x = hatasos(n, h, r)
  assert.equal(x.sh, 0)
  assert.equal(x.ap, 0)
  assert.equal(x.bl, n.bl * 0.5)
  assert.equal(x.rf, 0)
  assert.equal(x.lb, 0)
  assert.equal(x.gr + x.gr2 + x.mk, 0)
  assert.equal(x.du, n.du, 'what stayed on is untouched')
  assert.equal(x.gl, n.gl)
  assert.deepEqual(x.kamera, n.kamera)
})

test('switches: the defaults are all on at factor 1, the costly effects are four and a subset, nothing is shared between copies', () => {
  assert.deepEqual(HATASOK.filter((n) => !ALAP_HATASOK[n].be), [])
  assert.deepEqual(HATASOK.filter((n) => ALAP_HATASOK[n].ero !== 1), [])
  assert.deepEqual([...GAZDAG_HATASOK], ['melyseg', 'fenycsova', 'por', 'sok'])
  assert.deepEqual(RETEGEK.filter((n) => !ALAP_RETEGEK[n]), [])
  const a = hatasokMasolat()
  a.bloom.be = false
  assert.equal(ALAP_HATASOK.bloom.be, true)
  assert.equal(hatasokMasolat().bloom.be, true)
})

test('route: the series\' extremes, the hour marks (the full hours of the demo clock, then the end of the run) and the ribbon positions', () => {
  assert.equal(G.ertekek[P.iMax], GEPADAT_MAX)
  assert.equal(G.ertekek[P.iMin], GEPADAT_MIN)
  assert.equal(P.oraIdx.length, 9, '6:00 to 13:00 and the end of the run at 14:00')
  assert.equal(P.oraIdx[0], 0)
  assert.equal(P.oraIdx.at(-1), G.ertekek.length - 1)
  for (const i of P.oraIdx.slice(0, -1)) assert.equal((G.kezdetPerc + i) % 60, 0)
  assert.equal(P.uIdx(0), 1)
  assert.equal(P.uIdx(G.ertekek.length - 1), 0)
  assert.equal(P.zIdx(0), -LZ)
  assert.equal(P.zIdx(G.ertekek.length - 1) === 0, true)
})

test('floor: rails, rungs every 10 minutes, hour rungs and drop lines, all from the series; every vertex is inside the floor\'s box', () => {
  const n = G.ertekek.length
  const r = racs(P, n)
  assert.equal(r.adat.length, r.db * RACS_KULCS)
  const seg = [0, 0, 0, 0, 0, 0]
  for (let v = 0; v < r.db; v += 2) seg[r.adat[v * RACS_KULCS + 3]]++
  const orak = P.oraIdx.length
  const percek = Array.from({ length: Math.ceil(n / 10) }, (_, k) => k * 10).filter((i) => !P.oraIdx.includes(i)).length
  assert.deepEqual(seg, [9 * 36, percek * 16, orak * 16, (orak + 4) * 6, 30, n], 'rails, minute rungs, hour rungs, drop lines (the two extremes twice), the picture\'s frame (30 segments), one curtain hairline per minute')
  assert.deepEqual([r.esikTol, r.fuggonyTol, r.keretTol].map((v) => r.adat[v * RACS_KULCS + 3]), [KIND.esik, KIND.fuggony, KIND.keret], 'the groups start where they say')
  for (let v = 0; v < r.db; v++) {
    const [x, y, z, kd, t] = Array.from(r.adat.subarray(v * RACS_KULCS, v * RACS_KULCS + 5))
    if (kd === KIND.keret) {
      // the frame lies on the picture's plane, a hair in front of it, around the picture and its marks
      assert.equal(Math.abs(z - (ZP + 0.02)) < 1e-4, true)
      assert.equal(Math.abs(x) <= PICW / 2 + KERET.tav + KERET.meret + 0.2 && y >= PADLO - 1e-6, true, 'the frame stays above the floor')
      continue
    }
    assert.equal(Math.abs(x) <= GX + 1e-6, true)
    assert.equal(y >= PADLO - 1e-6 && y <= AMPY / 2 + 1e-6, true)
    assert.equal(z <= 6 + 1e-6 && z >= -LZ - 6, true)
    if (kd === KIND.esik || kd === KIND.fuggony) assert.equal(t >= 0 && t <= 1, true)
    else assert.equal(Math.abs(t) <= 1 + 1e-6, true)
  }
  // a curtain hairline stands at every minute, from the floor up to the thread's true height there
  const kk = 123
  let fuggony = null
  for (let v = r.fuggonyTol; v < r.keretTol; v += 2) {
    const o = v * RACS_KULCS
    if (Math.abs(r.adat[o + 2] - P.zIdx(kk)) < 1e-4) fuggony = [r.adat[o + 1], r.adat[(v + 1) * RACS_KULCS + 1], r.adat[o], r.adat[(v + 1) * RACS_KULCS + 0]]
  }
  assert.equal(Math.abs(fuggony[0] - PADLO) < 1e-5, true)
  assert.equal(Math.abs(fuggony[1] - (P.vnAt(P.uIdx(kk)) - 0.5) * AMPY) < 1e-4, true)
  assert.equal(Math.abs(fuggony[2] - cx(P.uIdx(kk))) < 1e-4 && fuggony[2] === fuggony[3], true, 'the hairline is vertical')
  // a drop line stands at the thread's true place: the top of the line of the hour at index i is the thread's height there
  const i = P.oraIdx[2]
  let teteje = null
  for (let v = 0; v < r.db; v++) {
    const o = v * RACS_KULCS
    if (r.adat[o + 3] === KIND.esik && Math.abs(r.adat[o + 2] - P.zIdx(i)) < 1e-6 && Math.abs(r.adat[o + 4] - 1) < 1e-6) teteje = r.adat[o + 1]
  }
  assert.equal(Math.abs(teteje - (P.vnAt(P.uIdx(i)) - 0.5) * AMPY) < 1e-5, true)
})

const SZ = {
  ora: (i) => `ora${i}`,
  ertek: (i) => `ertek${i}`,
  csucs: (i) => `csucs${i}`,
  melypont: (i) => `melypont${i}`,
  muszakvaltas: 'vege',
  szeles: 'szeles',
  magas: 'magas',
}

test('labels: one per hour, one value per hour but the last, the two extremes and the end of the run, placed in the scene\'s space', () => {
  const n = G.ertekek.length
  const f = feliratok(P, n, SZ)
  const db = (t) => f.filter((x) => x.tip === t).length
  assert.deepEqual([db('ora'), db('ertek'), db('cs'), db('csle')], [9, 8, 1, 1])
  assert.equal(f.find((x) => x.szoveg === 'vege').tip, 'ora', 'the end of the run is an hour mark at the end of the floor')
  assert.equal(f.find((x) => x.szoveg === `ora${P.oraIdx[1]}`).pont[0], GX + 0.6)
  const cs = f.find((x) => x.tip === 'cs')
  assert.equal(cs.szoveg, `csucs${P.iMax}`)
  assert.equal(cs.pont[1], AMPY / 2 + 0.6)
  assert.equal(f.find((x) => x.tip === 'csle').pont[1], -AMPY / 2 - 0.6)
  assert.equal(new Set(f.map((x) => x.szoveg)).size, f.length, 'no label says the same twice')
  // the picture's two dimension lines: the blocks across above it, the blocks down beside it
  const sz = f.find((x) => x.tip === 'meret')
  const mg = f.find((x) => x.tip === 'meretf')
  assert.equal(f.length, 9 + 8 + 2 + 2)
  assert.deepEqual([sz.szoveg, sz.pont[0], sz.pont[2]], ['szeles', 0, ZP])
  assert.equal(Math.abs(sz.pont[1] - (P.picY + P.hp / 2 + KERET.tav + KERET.meret)) < 1e-9, true)
  assert.deepEqual([mg.szoveg, mg.pont[1], mg.pont[2]], ['magas', P.picY, ZP])
  assert.equal(Math.abs(mg.pont[0] + PICW / 2 + KERET.tav + KERET.meret) < 1e-9, true)
})

test('labels: behind the camera or outside the picture a label is hidden, a near or far one is dim, the value labels need the look to ask for them, the picture takes them all away', () => {
  const p = P.poz(0, 1.6, NEZETEK.muszer.kamera)
  const v = nez(p.eye, p.tgt)
  const vp = mul(persp((50 * Math.PI) / 180, 1.6, 0.1, 200), v.m)
  const vet = { vp, eye: p.eye, forma: 0, feny: null }
  const f = feliratok(P, G.ertekek.length, SZ)
  const lathato = f.map((x) => feliratHelyzet(x, vet, 2, 1280, 800)).filter((h) => h.o > 0)
  assert.equal(lathato.length >= 4, true, 'a handful of labels read at the opening')
  for (const h of lathato) assert.equal(h.o <= 0.9 && h.x >= -20 && h.x <= 1300 && h.y >= -20 && h.y <= 820, true)
  const ertek = f.filter((x) => x.tip === 'ertek')
  assert.equal(ertek.some((x) => feliratHelyzet(x, vet, 2, 1280, 800).o > 0), true)
  assert.equal(ertek.every((x) => feliratHelyzet(x, vet, 1, 1280, 800).o === 0), true, 'a look at 1 hides the values and keeps the hours')
  const half = ertek.map((x) => [feliratHelyzet(x, vet, 2, 1280, 800).o, feliratHelyzet(x, vet, 1.5, 1280, 800).o]).find(([a]) => a > 0)
  assert.equal(Math.abs(half[1] - half[0] / 2) < 1e-9, true, 'the gain is continuous')
  assert.equal(f.every((x) => feliratHelyzet(x, vet, 0, 1280, 800).o === 0), true)
  assert.equal(f.every((x) => feliratHelyzet(x, { ...vet, forma: 1 }, 2, 1280, 800).o === 0), true, 'the picture takes every label away')
  const mogotte = { ...vet, vp: mul(persp((50 * Math.PI) / 180, 1.6, 0.1, 200), nez([p.eye[0], p.eye[1], p.eye[2] - 200], [p.eye[0], p.eye[1], p.eye[2] - 400]).m) }
  assert.equal(f.every((x) => feliratHelyzet(x, mogotte, 2, 1280, 800).o === 0), true, 'a camera looking away sees none')
})

/** A GL that remembers which program is current and tags every uniform location with the program it came from: a uniform written through another program's location throws. */
function hamisGl() {
  const log = []
  let aktualis = null
  const loc = (prog, nev) => ({ prog, nev })
  const ellenor = (l) => {
    if (l && l.prog !== aktualis) throw new Error(`uniform ${l.nev} of ${l.prog} set under ${aktualis}`)
    log.push(`u:${l?.nev}`)
  }
  const gl = {
    useProgram: (p) => { aktualis = p; log.push(`use:${p}`) },
    getUniformLocation: (p, nev) => loc(p, nev),
    uniform1f: ellenor, uniform1i: ellenor, uniform3f: ellenor, uniform4f: ellenor,
    drawArrays: (m, a, b) => log.push(`draw:${m},${a},${b}`),
  }
  return { gl, log }
}

test('draw helper: a draw sets its own program first, writes uniforms only through that program\'s own locations, then draws (the review found markers that never drew for a foreign location)', () => {
  const { gl, log } = hamisGl()
  const a = progU(gl, 'A', ['u_x', 'u_y'])
  const b = progU(gl, 'B', ['u_x', 'u_z'])
  rajzol(gl, a, 1, 0, 6, (u) => { gl.uniform1f(u.u_x, 1); gl.uniform4f(u.u_y, 1, 2, 3, 4) })
  rajzol(gl, b, 0, 2, 8, (u) => gl.uniform1f(u.u_z, 1))
  rajzol(gl, a, 4, 0, 3)
  assert.deepEqual(log, ['use:A', 'u:u_x', 'u:u_y', 'draw:1,0,6', 'use:B', 'u:u_z', 'draw:0,2,8', 'use:A', 'draw:4,0,3'])
  // the old mistake: a location taken from the other program, with the current program unchanged
  assert.throws(() => rajzol(gl, b, 0, 0, 1, () => gl.uniform1f(a.u.u_x, 1)), /set under B/)
})

test('loader: the stages follow the programs the world compiles (post stack and scene), each once', () => {
  for (const n of ['bright', 'blur', 'composite', 'shaft', 'particles', 'comets', 'grid', 'textures', 'frame']) assert.equal(LEPESEK.includes(n), true, n)
  assert.equal(LEPESEK.includes('streak'), false, 'the lens streak is not ported: no look uses it')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// V3: the labels yield to the controls, the probe, the loader's pen, the picture's mean colour
function nyitoVetites() {
  const p = P.poz(0, 1.6, NEZETEK.muszer.kamera)
  const v = nez(p.eye, p.tgt)
  const vp = mul(persp((50 * Math.PI) / 180, 1.6, 0.1, 200, p.shift ?? 0), v.m)
  return { vp, eye: p.eye, forma: 0, feny: null }
}

/** Where sample i is on the screen (the same projection the engine uses). */
function kepen(vet, i, sw, sh) {
  const u = P.uIdx(i)
  const x = cx(u)
  const y = (P.vnAt(u) - 0.5) * AMPY
  const z = P.zIdx(i)
  const { vp } = vet
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
  return [((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw * 0.5 + 0.5) * sw, (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw * 0.5) * sh]
}

test('labels: they fade out before the strips where the page\'s own controls stand, and the picture\'s own labels keep their place', () => {
  const f = feliratok(P, G.ertekek.length, SZ)
  const vet = nyitoVetites()
  const sw = 1280
  // a short window pushes the labels into the bottom strip: nothing in it is drawn above the faint floor
  const sh = 260
  const lent = f.map((x) => feliratHelyzet(x, vet, 2, sw, sh)).filter((h) => h.o > 0)
  for (const h of lent) assert.equal(h.y <= sh - 150 + 1e-6 && h.y >= 56, true, `a label at y ${h.y} is inside a control strip`)
  // the picture's own labels are composed with the picture (they come in as it forms), so no strip applies to them
  const kep = f.filter((x) => x.tip === 'meret' || x.tip === 'meretf')
  assert.equal(kep.length, 2)
  assert.equal(kep.every((x) => feliratHelyzet(x, vet, 2, sw, 800).o === 0), true, 'the picture\'s labels are not there while it has not formed')
})

test('labels: none is cut by the screen\'s edge, the strips are taller on a narrow screen, and the picture\'s dimension lines are drawn only where the look draws its frame', () => {
  const f = feliratok(P, G.ertekek.length, SZ)
  const vet = nyitoVetites()
  // a narrow screen: every label that is drawn is whole inside it and clear of the two taller strips
  for (const sw of [390, 360]) {
    const sh = 844
    const h = f.map((x) => [x, feliratHelyzet(x, vet, 2, sw, sh)]).filter(([, p]) => p.o > 0)
    for (const [x, p] of h) {
      const w = x.szoveg.length * 8.4 * p.s
      assert.equal(p.x - (x.tip === 'ora' ? 0 : w / 2) >= 0 && p.x + (x.tip === 'ora' ? w : w / 2) <= sw, true, `"${x.szoveg}" is cut at ${sw}`)
      assert.equal(p.y >= 116 - 1e-6 && p.y <= sh - 275 + 1e-6, true, `"${x.szoveg}" is inside a control strip`)
    }
  }
  // the frame's gain gates the picture's own labels (the light tier has no frame, so no dimension lines)
  const pz = P.poz(1, 1.6, NEZETEK.szinpad.kamera)
  const nagy = { vp: mul(persp((50 * Math.PI) / 180, 1.6, 0.1, 200, pz.shift ?? 0), nez(pz.eye, pz.tgt).m), eye: pz.eye, forma: 1, feny: null }
  const kep = f.filter((x) => x.tip === 'meret' || x.tip === 'meretf')
  assert.equal(kep.every((x) => feliratHelyzet(x, nagy, 1, 1280, 800, 1).o > 0), true)
  assert.equal(kep.every((x) => feliratHelyzet(x, nagy, 1, 1280, 800, 0).o === 0), true)
  assert.equal(kep.every((x) => feliratHelyzet(x, nagy, 1, 1280, 800, 0.5).o > 0 && feliratHelyzet(x, nagy, 1, 1280, 800, 0.5).o < feliratHelyzet(x, nagy, 1, 1280, 800, 1).o), true, 'continuous')
})

test('labels: two never print over each other (the nearer keeps its place, the other fades with the overlap, continuously); apart they are untouched', () => {
  const a = { szoveg: 'aaaaaaaa', pont: [0, 0, 0], tip: 'cs' }
  const b = { szoveg: 'bbbbbbbb', pont: [0, 0, 0], tip: 'ertek' }
  const h = (x, s) => [{ o: 0.9, x: 100, y: 100, s: 1.2 }, { o: 0.9, x, y: 100, s }]
  const eredeti = h(100, 1)
  const egyben = feliratUtkozes([a, b], eredeti)
  assert.equal(egyben[0].o, 0.9, 'the nearer one keeps its place')
  assert.equal(egyben[1].o, 0, 'a label under another is gone')
  assert.deepEqual(eredeti, h(100, 1), 'the input is not changed')
  const messze = feliratUtkozes([a, b], h(400, 1))
  assert.deepEqual(messze.map((x) => x.o), [0.9, 0.9], 'apart they do not touch')
  const fele = feliratUtkozes([a, b], h(100 + 55, 1))
  assert.equal(fele[1].o > 0 && fele[1].o < 0.9, true, 'a partial overlap is a partial fade')
  const kozelebb = feliratUtkozes([a, b], h(100 + 45, 1))
  assert.equal(kozelebb[1].o <= fele[1].o, true, 'more overlap, less opacity')
  assert.deepEqual(feliratUtkozes([a, b], [{ o: 0, x: 0, y: 0, s: 1 }, { o: 0, x: 0, y: 0, s: 1 }]).map((x) => x.o), [0, 0], 'a hidden label stays hidden')
})

test('labels: a label belongs to the space (it is smaller far away and larger near, within bounds)', () => {
  const vet = nyitoVetites()
  const f = feliratok(P, G.ertekek.length, SZ)
  const ss = f.map((x) => feliratHelyzet(x, vet, 2, 1280, 800)).filter((h) => h.o > 0).map((h) => h.s)
  assert.ok(ss.length >= 4)
  for (const s of ss) assert.ok(s >= 0.8 - 1e-9 && s <= 1.35 + 1e-9)
  assert.ok(Math.max(...ss) > Math.min(...ss), 'the sizes differ with the distance')
})

test('probe: the sample nearest to the pointer is named, none when nothing is near, and the pointer exactly on a sample names that sample', () => {
  const vet = nyitoVetites()
  const n = G.ertekek.length
  const sw = 1280
  const sh = 800
  for (const i of [3, 60, 150]) {
    const [x, y] = kepen(vet, i, sw, sh)
    if (x < 0 || x > sw || y < 0 || y > sh) continue
    const m = szondaMinta(P, n, vet, sw, sh, x, y)
    assert.ok(m, `a sample under the pointer at ${i}`)
    // two samples may project to nearly the same pixel; the one named is at least as near as the one that was aimed at
    const [mx, my] = kepen(vet, m.i, sw, sh)
    assert.ok(Math.hypot(mx - x, my - y) <= 1e-6 + 0, 'the named sample is the nearest one')
    assert.ok(Math.abs(m.x - mx) < 1e-9 && Math.abs(m.y - my) < 1e-9, 'the probe sits on that sample')
  }
  assert.equal(szondaMinta(P, n, vet, sw, sh, -500, -500), null, 'far from the thread: no sample')
  assert.equal(szondaMinta(P, n, vet, sw, sh, 640, 400, 0), null, 'a zero reach names nothing')
  assert.ok(SZONDA_TAV > 0)
  // behind the camera nothing is named
  const mogotte = { ...vet, vp: mul(persp((50 * Math.PI) / 180, 1.6, 0.1, 200), nez([vet.eye[0], vet.eye[1], vet.eye[2] - 200], [vet.eye[0], vet.eye[1], vet.eye[2] - 400]).m) }
  assert.equal(szondaMinta(P, n, mogotte, sw, sh, 640, 400), null)
})

test('loader: the pen\'s place is a fraction of the series, clamped, and the two ends are the first and the newest minute', () => {
  assert.equal(toltesIndex(0, 480), 0)
  assert.equal(toltesIndex(1, 480), 479)
  assert.equal(toltesIndex(-1, 480), 0)
  assert.equal(toltesIndex(2, 480), 479)
  assert.equal(toltesIndex(0.5, 481), 240)
})

test('picture: the mean colour of its blocks is the average in linear light (white, black, and the middle grey the sRGB curve gives)', () => {
  const rgba = (...px) => new Uint8Array(px.flatMap((p) => [...p, 255]))
  assert.deepEqual(kepAtlag(rgba([255, 255, 255], [255, 255, 255])), [1, 1, 1])
  assert.deepEqual(kepAtlag(rgba([0, 0, 0])), [0, 0, 0])
  const [r, g, b] = kepAtlag(rgba([255, 255, 255], [0, 0, 0]))
  assert.equal(r === g && g === b && Math.abs(r - 0.5) < 1e-12, true, 'half white, half black is 0.5 in linear light, not the 0.5 of the sRGB bytes')
  const [m] = kepAtlag(rgba([188, 188, 188]))
  assert.equal(Math.abs(m - 0.5029) < 1e-3, true)
})

test('loader: a loader scene that cannot be built still counts its stage (it is cosmetic), and the failure reaches the caller', async () => {
  // a GL whose program does not link: the driver's message comes back as the rejection, and the world's counter must still be able to finish
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, LINK_STATUS: 3,
    getExtension: () => null,
    createShader: () => ({}), shaderSource: () => {}, compileShader: () => {},
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => false, getProgramInfoLog: () => 'boom', getShaderInfoLog: () => '',
  }
  const szamlalo = new Lepesek(['loader', 'frame'])
  await assert.rejects(Toltoszal.keszit(gl, { ertekek: [1, 2], kezdetPerc: 0, oszlop: 1, sor: 1 }, (n) => szamlalo.kesz(n)), /boom/)
  assert.equal(szamlalo.kesznek, 1, 'the loader stage is counted although its program failed')
  szamlalo.kesz('frame')
  assert.equal(szamlalo.vege, true, 'and the counter can reach its end')
})
