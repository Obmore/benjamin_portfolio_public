import assert from 'node:assert/strict'
import test from 'node:test'
import { evek } from '../src/site/evek.ts'
import { IDOVONAL, evSzoveg } from '../src/content/tapasztalat.ts'

// "Évek" (the timing diagram of /munkaim/): a wrong cell would misstate the owner's experience, so the geometry is pinned on the real data and on a later build year.

test('the axis runs from the first start year to the build year; the five channels follow the data', () => {
  const g = evek(IDOVONAL, 2026)
  assert.deepEqual(g.cellak, [2023, 2024, 2025, 2026])
  // 2026-, 2025-, 2024- run to the "now" edge (index 4); the two 2023-2025 periods are high across the 2023, 2024 and 2025 cells and fall at the edge after 2025 (index 3).
  assert.deepEqual(g.csatornak, [
    { kezd: 3, vege: 4, tart: true },
    { kezd: 2, vege: 4, tart: true },
    { kezd: 1, vege: 4, tart: true },
    { kezd: 0, vege: 3, tart: false },
    { kezd: 0, vege: 3, tart: false },
  ])
})

test('exactly three channels end in a node at the "now" edge', () => {
  const g = evek(IDOVONAL, 2026)
  assert.deepEqual(g.csatornak.filter((c) => c.tart).map((c) => c.vege), [g.cellak.length, g.cellak.length, g.cellak.length])
  assert.equal(g.csatornak.filter((c) => !c.tart).length, 2)
})

test('a build in 2027 adds a cell and moves no start index; the running channels reach the new edge', () => {
  const a = evek(IDOVONAL, 2026)
  const b = evek(IDOVONAL, 2027)
  assert.deepEqual(b.cellak, [2023, 2024, 2025, 2026, 2027])
  assert.deepEqual(b.csatornak.map((c) => c.kezd), a.csatornak.map((c) => c.kezd))
  assert.deepEqual(b.csatornak.map((c) => c.vege), [5, 5, 5, 3, 3])
})

test('the years of the hidden table are the data in order', () => {
  assert.deepEqual(IDOVONAL.map(evSzoveg), ['2026–', '2025–', '2024–', '2023–2025', '2023–2025'])
})

test('a data slip fails the build: a period after the build year, or ending before it starts', () => {
  assert.throws(() => evek([{ kezdet: 2027, terulet: 'x' }], 2026), /after the build year/)
  assert.throws(() => evek([{ kezdet: 2024, veg: 2027, terulet: 'x' }], 2026), /after the build year/)
  assert.throws(() => evek([{ kezdet: 2025, veg: 2024, terulet: 'x' }], 2026), /bad period/)
  assert.throws(() => evek([], 2026), /no periods/)
})
