// Runs slices of the demos' own code in Node, so a number the site presents as "the demo's" is recomputed from the demo's source and never retyped.
// Used by scripts/mintak-epit.mjs (writes src/content/mintak-adat.ts) and scripts/mintak.test.mjs (re-derives it and compares).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** The demo whose simulation is run (the Gépadat-gyűjtő; its own seeded generator, seed 20261026). */
export const GEPADAT_FORRAS = 'public/demos/adatgyujto/app.js'
// The slice is everything inside the demo's closure that does not touch the DOM: from the first constant to the marker that opens the display code.
const SZELET_KEZDET = 'const SHIFTS'
const SZELET_VEG = '// ----- megjelenítés -----'

/** One demo minute as the demo displays a reading: one decimal, Hungarian format ("51,5"), read back as a number. The site's own pin (CNC1_HOMERSEKLET) rounds the same way. */
export function demoKijelzes(ertek) {
  return Number(ertek.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(',', '.'))
}

/**
 * Runs the demo's `step()` for `percek` demo minutes from the demo's own start (its load time minus its warm-up hour: 6:00) and returns CNC-1's spindle temperature after every step,
 * as the demo holds it (unrounded), plus the demo's own shift-change announcement when the run reaches it. Throws if the demo's source no longer has the shape this relies on.
 */
export function gepadatFuttatas(percek = 480) {
  const src = fs.readFileSync(path.join(root, GEPADAT_FORRAS), 'utf8')
  const a = src.indexOf(SZELET_KEZDET)
  const b = src.indexOf(SZELET_VEG)
  if (a < 0 || b <= a) throw new Error(`${GEPADAT_FORRAS}: the markers "${SZELET_KEZDET}" and "${SZELET_VEG}" moved; update scripts/lib/demo-futtatas.mjs`)
  const demo = new Function('location', `${src.slice(a, b)}\nreturn { state, step, announce, clock, SHIFTS, SHIFT_LEN, START, WARMUP }`)({ search: '' })
  const kezdetPerc = demo.START - demo.WARMUP
  if (kezdetPerc !== demo.SHIFTS[0].start) throw new Error('the demo no longer starts its run at the start of its first shift (6:00)')
  const gep = demo.state[0].m
  const sorozat = []
  for (let i = 0; i < percek; i++) {
    demo.step()
    sorozat.push(demo.state[0].temp) // the sample the demo pushes to CNC-1's history in this step (demo minute kezdetPerc + i)
  }
  const valtasPerc = kezdetPerc + demo.SHIFT_LEN
  const valtas = demo.announce.find((x) => x.text.startsWith('Műszakváltás'))
  return {
    forras: GEPADAT_FORRAS,
    kezdetPerc,
    /** The machine and signal as the demo names them (its MACHINES[0]), and the alarm limit it draws and raises on. */
    gep: { nev: gep.name, jel: gep.tempLabel, hatar: gep.tempLimit },
    sorozat,
    /** The announcement the demo raises at the shift change (demo minute 14:00); null when the run stops before it. */
    muszakValtas: valtas ? { perc: valtas.t, szoveg: valtas.text } : null,
    valtasPerc,
    /** The demo's own clock text for a demo minute ("6:00", "13:59"). */
    ora: demo.clock,
  }
}
