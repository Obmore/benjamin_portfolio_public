import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ellenorizChunkok, ellenorizModulSzkriptek, modulSzkriptek } from './lib/modul-szkriptek.mjs'

const tag = (name) => `<script type="module" crossorigin src="/assets/${name}-Ab12Cd34.js"></script>`
const vart = new Map([['index.html', ['main']], ['aszf/index.html', ['tema-tar', 'jogi']]])

function fixture(pages, assets) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-'))
  for (const [rel, html] of Object.entries(pages)) {
    fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true })
    fs.writeFileSync(path.join(dist, rel), html)
  }
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true })
  for (const a of assets) fs.writeFileSync(path.join(dist, 'assets', a), '')
  return dist
}
const good = () => ({ 'index.html': `<head><script data-jel-fej></script>${tag('main')}</head>`, 'aszf/index.html': `${tag('tema-tar')}${tag('jogi')}`, 'cv/index.html': '<script data-jel-fej></script>' })

test('module script names are read in document order, without the hash', () => {
  assert.deepEqual(modulSzkriptek(`<script>x</script>${tag('tema-tar')}<script nomodule src="/a.js"></script>${tag('jogi')}`), ['tema-tar', 'jogi'])
})

test('a page set that matches the table passes', () => {
  const dist = fixture(good(), ['main-Ab12Cd34.js', 'horgony-futtat-Ab12Cd34.js'])
  assert.deepEqual(ellenorizModulSzkriptek(dist, vart), [])
})

test('an extra module script fails (a shared chunk would add one)', () => {
  const pages = good()
  pages['index.html'] += tag('horgony')
  const errors = ellenorizModulSzkriptek(fixture(pages, []), vart)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /index\.html: module scripts \[main, horgony\], expected \[main\]/)
})

test('a reordered page and an unlisted page with a module script fail', () => {
  const pages = good()
  pages['aszf/index.html'] = `${tag('jogi')}${tag('tema-tar')}`
  pages['uj/index.html'] = tag('main')
  assert.equal(ellenorizModulSzkriptek(fixture(pages, []), vart).length, 2)
})

test('a shared chunk named after a standalone module, a helper chunk or a missing standalone file fails', () => {
  assert.deepEqual(ellenorizChunkok(fixture({}, ['horgony-futtat-Ab12Cd34.js', 'main-Ab12Cd34.js']), ['horgony']), [])
  assert.equal(ellenorizChunkok(fixture({}, ['horgony-futtat-Ab12Cd34.js', 'horgony-Zz99Yy88.js']), ['horgony']).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, ['horgony-futtat-Ab12Cd34.js', 'preload-helper-Zz99Yy88.js']), ['horgony']).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, ['horgony-futtat-Ab12Cd34.js', 'rolldown-runtime-Zz99Yy88.js']), ['horgony']).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, ['main-Ab12Cd34.js']), ['horgony']).length, 1)
})

test('the masolo, meres, rollin and retegek standalone scripts are covered by the default table', () => {
  const all = ['horgony-futtat-Ab12Cd34.js', 'masolo-futtat-Ab12Cd34.js', 'meres-futtat-Ab12Cd34.js', 'rollin-futtat-Ab12Cd34.js', 'retegek-futtat-Ab12Cd34.js']
  assert.deepEqual(ellenorizChunkok(fixture({}, all)), [])
  assert.equal(ellenorizChunkok(fixture({}, [...all, 'masolo-Zz99Yy88.js'])).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, [...all, 'meres-Zz99Yy88.js'])).length, 1)
  // the Rollin scene must stay one file of its own: a chunk named after it (mount-*.js is the old dynamic-import shape) or a missing file fails
  assert.equal(ellenorizChunkok(fixture({}, [...all, 'rollin-Zz99Yy88.js'])).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, [...all, 'retegek-Zz99Yy88.js'])).length, 1)
  assert.equal(ellenorizChunkok(fixture({}, all.slice(0, 4))).length, 1)
})
