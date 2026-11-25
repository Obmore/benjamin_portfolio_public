import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { MUNKAK, SAJAT_HONLAP, TENYEK, technikaCimkek } from '../src/content/munkak.ts'

const fajl = (rel) => new URL(`../${rel}`, import.meta.url)

test('facts: ids unique, picture files and demo folders exist', () => {
  assert.ok(TENYEK.length > 0)
  const idk = TENYEK.map((t) => t.id)
  assert.equal(new Set(idk).size, idk.length)
  for (const t of TENYEK) {
    if (t.kep) {
      const fajlok = t.kep.egyfajl ? [`${t.kep.alap}.webp`] : [`${t.kep.alap}-640.webp`, `${t.kep.alap}-1200.webp`]
      for (const f of fajlok) assert.ok(existsSync(fajl(`public${f}`)), f)
    }
    if (t.href.startsWith('/demos/')) {
      assert.equal(t.href, `/demos/${t.id}/`)
      assert.ok(existsSync(fajl(`public/demos/${t.id}/index.html`)), t.id)
    }
  }
})

test('technique tags: one per comma-separated item, the closing full stop dropped, ".NET" keeps its own dot, no empty tag', () => {
  assert.deepEqual(technikaCimkek('React, Tailwind CSS, Vite.'), ['React', 'Tailwind CSS', 'Vite'])
  assert.deepEqual(technikaCimkek('React, TypeScript, .NET, Azure, Raspberry Pi, Python.'), ['React', 'TypeScript', '.NET', 'Azure', 'Raspberry Pi', 'Python'])
  assert.deepEqual(technikaCimkek('Vite, TypeScript.'), ['Vite', 'TypeScript'])
  assert.deepEqual(technikaCimkek('Vite,, TypeScript , '), ['Vite', 'TypeScript'])
  // the real lines: every one splits to at least one tag and no tag keeps a comma or the sentence's full stop
  for (const sor of [...MUNKAK.map((m) => m.technika), SAJAT_HONLAP.technika].filter(Boolean)) {
    const cimkek = technikaCimkek(sor)
    assert.ok(cimkek.length >= 1, sor)
    for (const c of cimkek) assert.ok(!c.includes(',') && (c === '.NET' || !c.endsWith('.')), `${sor}: "${c}"`)
  }
})
