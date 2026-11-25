import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { elesBuild, helyorzok, kapuUzenet } from './lib/helyorzo-kapu.mjs'

const oldal = (utvonal, szoveg) => ({ utvonal, szoveg })

test('finds every placeholder on a page and strips markup inside it', () => {
  const html = '<p>Telefon: <span class="kerdes">[KÉRDÉS: telefonszám]</span></p><p>[KÉRDÉS: <b>válaszidő</b>]</p>'
  assert.deepEqual(helyorzok([oldal('dist/index.html', html)]), [
    { utvonal: 'dist/index.html', talalatok: ['[KÉRDÉS: telefonszám]', '[KÉRDÉS: válaszidő]'] },
  ])
})

test('a page without placeholders passes', () => {
  assert.deepEqual(helyorzok([oldal('dist/index.html', '<h1>Kész szöveg</h1><p>KÉRDÉS nélkül</p>')]), [])
})

test('a Windows path is reported with forward slashes', () => {
  const lista = helyorzok([oldal('dist\\termekleiras\\index.html', '[KÉRDÉS: ár]')])
  assert.deepEqual(lista.map((x) => x.utvonal), ['dist/termekleiras/index.html'])
})

test('only ELES_BUILD=1 is a production build', () => {
  assert.equal(elesBuild({ ELES_BUILD: '1' }), true)
  assert.equal(elesBuild({}), false)
  assert.equal(elesBuild({ ELES_BUILD: '0' }), false)
  assert.equal(elesBuild({ ELES_BUILD: 'true' }), false)
})

test('the error message names the page, the placeholder and the fix', () => {
  const uzenet = kapuUzenet([{ utvonal: 'dist/index.html', talalatok: ['[KÉRDÉS: telefonszám]'] }])
  assert.match(uzenet, /dist\/index\.html/)
  assert.match(uzenet, /\[KÉRDÉS: telefonszám\]/)
  assert.match(uzenet, /null/)
})

// Integration: the real Vite build in both modes, into temporary folders (dist/ is left alone).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

function build(eles) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), eles ? 'ob-eles-' : 'ob-elonezet-'))
  const env = { ...process.env }
  if (eles) env.ELES_BUILD = '1'
  else delete env.ELES_BUILD
  const run = spawnSync(process.execPath, [vite, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { cwd: root, env, encoding: 'utf8' })
  return { outDir, status: run.status, output: `${run.stdout}\n${run.stderr}` }
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f))
}

const forrasbanKerdes = () =>
  fs.readdirSync(path.join(root, 'src/content'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') && !f.endsWith('kerdes.ts'))
    .some((f) => /\bkerdes\(/.test(fs.readFileSync(path.join(root, 'src/content', f), 'utf8')))

test('production build: stops with the gate message, or finishes without any placeholder', { timeout: 120_000 }, () => {
  const { outDir, status, output } = build(true)
  try {
    if (status !== 0) {
      assert.match(output, /Helyőrző-kapu/)
      assert.match(output, /\[KÉRDÉS:/)
    } else {
      for (const file of htmlFiles(outDir)) {
        assert.ok(!fs.readFileSync(file, 'utf8').includes('[KÉRDÉS:'), file)
      }
      assert.ok(fs.existsSync(path.join(outDir, 'aszf', 'index.html')), 'the terms page is part of the production build')
      assert.deepEqual(fs.readdirSync(path.join(outDir, 'cv')), ['index.html'], 'dist/cv holds only the redirect stub')
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})

test('preview build: always finishes and shows the open placeholders', { timeout: 120_000 }, () => {
  const { outDir, status, output } = build(false)
  try {
    assert.equal(status, 0, output)
    const html = htmlFiles(outDir).map((f) => fs.readFileSync(f, 'utf8')).join('\n')
    assert.equal(html.includes('[KÉRDÉS:'), forrasbanKerdes())
    assert.deepEqual(fs.readdirSync(path.join(outDir, 'cv')), ['index.html'], 'the CV PDFs are not published, only the redirect stub')
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})
