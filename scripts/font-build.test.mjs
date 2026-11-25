import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  defaultPython,
  preloadBytes,
  preloadedFonts,
  pythonSetupProblem,
} from './lib/font-build.mjs'
import { HUNGARIAN_GLYPHS, missingHungarian, shippedCodePoints } from './lib/font-glyphs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('preloadedFonts lists every font preload and nothing else', () => {
  const html = `
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/a-400.woff2" />
    <link
      rel="preload"
      as="font"
      crossorigin
      href="/fonts/b-600.woff2?v=2"
    />
    <link rel="preload" as="style" href="/assets/main.css" />
    <link rel="stylesheet" href="/fonts/not-a-preload.woff2" />
    <link rel="modulepreload" href="/assets/main.js" />`
  assert.deepEqual(preloadedFonts(html), ['/fonts/a-400.woff2', '/fonts/b-600.woff2'])
})

test('preloadBytes sums all preloaded fonts, not just one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-preload-'))
  try {
    fs.mkdirSync(path.join(dir, 'fonts'))
    const sizes = { 'a-400': 100, 'a-500': 200, 'a-600': 400, 'mono-400': 800, 'mono-500': 1600 }
    for (const [id, size] of Object.entries(sizes)) {
      fs.writeFileSync(path.join(dir, 'fonts', `${id}.woff2`), Buffer.alloc(size))
    }
    const html = ['a-400', 'a-500', 'a-600', 'mono-400']
      .map((id) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/${id}.woff2" />`)
      .join('\n')
    const { files, total } = preloadBytes(html, dir)
    assert.equal(files.length, 4)
    assert.equal(total, 100 + 200 + 400 + 800)
    assert.deepEqual(files.map((file) => file.href), [
      '/fonts/a-400.woff2',
      '/fonts/a-500.woff2',
      '/fonts/a-600.woff2',
      '/fonts/mono-400.woff2',
    ])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('preloadBytes names a preloaded font whose file is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-preload-'))
  try {
    const html = '<link rel="preload" as="font" href="/fonts/gone.woff2" />'
    assert.throws(() => preloadBytes(html, dir), /fonts\/gone\.woff2/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the real index.html preloads resolve to files in public/ and are all counted', () => {
  const html = read('index.html')
  const hrefs = preloadedFonts(html)
  assert.deepEqual(hrefs, ['/fonts/archivo-latin.woff2', '/fonts/archivo-latin-ext.woff2'], 'index.html preloads both Archivo files (ő and ű are in the second)')
  const { files, total } = preloadBytes(html, path.join(root, 'public'))
  assert.equal(files.length, hrefs.length)
  assert.equal(total, ['archivo-latin', 'archivo-latin-ext'].reduce((sum, name) => sum + fs.statSync(path.join(root, `public/fonts/${name}.woff2`)).size, 0))
  assert.ok(total <= 74 * 1024, 'within the preload budget (60 KB -> 74 KB, temporary, owner decision 2026-11-16)')
})

test('every page template preloads the same two Archivo files, so no page draws ő or ű in the fallback font (the legal pages too)', () => {
  for (const file of ['index.html', 'megrendeles/index.html', 'munkaim/index.html', 'impresszum/index.html', 'adatkezeles/index.html', 'aszf/index.html', 'en/imprint/index.html']) {
    assert.deepEqual(preloadedFonts(read(file)), ['/fonts/archivo-latin.woff2', '/fonts/archivo-latin-ext.woff2'], file)
  }
})

/** The @font-face blocks of fonts.css that have a file: { file, ranges: [[from, to], ...] } (the real mapping the browser uses). */
function fontFaces() {
  const css = read('src/site/fonts.css')
  const faces = []
  for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const file = /url\("\/fonts\/([\w-]+\.woff2)"\)/.exec(block[1])?.[1]
    const range = /unicode-range:\s*([^;]+);/.exec(block[1])?.[1]
    if (!file || !range) continue
    const ranges = range.split(',').map((part) => {
      const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-')
      return [parseInt(from, 16), parseInt(to.replace(/^U\+/i, ''), 16)]
    })
    faces.push({ file, ranges })
  }
  return faces
}

test('each @font-face unicode-range maps the Hungarian letters to a PRELOADED file that really has the glyph (the original bug was a range/file mismatch)', () => {
  const preloaded = new Set(preloadedFonts(read('index.html')).map((href) => href.replace(/^\/fonts\//, '')))
  const faces = fontFaces()
  assert.ok(faces.length >= 2)
  for (const face of faces) {
    assert.ok(preloaded.has(face.file), `${face.file} is a face of fonts.css and must be preloaded`)
    // The range must not claim code points the file does not hold (the browser would then use the file and draw nothing for them).
    const points = shippedCodePoints([path.join(root, 'public/fonts', face.file)])
    const claimed = (cp) => face.ranges.some(([from, to]) => cp >= from && cp <= to)
    face.claimsAndHas = (cp) => claimed(cp) && points.has(cp)
  }
  for (const glyph of HUNGARIAN_GLYPHS) {
    const cp = glyph.codePointAt(0)
    const serving = faces.filter((face) => face.claimsAndHas(cp))
    assert.ok(serving.length >= 1, `${glyph} (U+${cp.toString(16).toUpperCase()}) is in no @font-face range of a file that holds it`)
    for (const face of serving) assert.ok(preloaded.has(face.file), `${glyph}: its face ${face.file} is not preloaded`)
  }
})

test('the PRELOADED files alone hold every Hungarian letter (the hard-fail of build-fonts.mjs reads the same list)', () => {
  const preloaded = preloadedFonts(read('index.html')).map((href) => path.join(root, 'public', href.replace(/^\//, '')))
  assert.deepEqual(missingHungarian(shippedCodePoints(preloaded)), [])
})

const SHIPPED = ['public/fonts/archivo-latin.woff2', 'public/fonts/archivo-latin-ext.woff2']

test('the shipped Archivo subsets together contain every Hungarian letter (the double acute is in the ext file only)', () => {
  const all = shippedCodePoints(SHIPPED.map((file) => path.join(root, file)))
  assert.deepEqual(missingHungarian(all), [])
  const ext = shippedCodePoints([path.join(root, SHIPPED[1])])
  assert.deepEqual([...ext].sort((a, b) => a - b), [0x150, 0x151, 0x170, 0x171], 'the second file is just the double acute o and u')
  const latin = shippedCodePoints([path.join(root, SHIPPED[0])])
  assert.ok(!latin.has('ő'.codePointAt(0)), 'the latin file alone has no double acute: both files are needed')
  assert.ok(all.has('ű'.codePointAt(0)))
})

test('missingHungarian names each missing letter, so the font build can fail on it', () => {
  const latinOnly = shippedCodePoints([path.join(root, SHIPPED[0])])
  assert.deepEqual(missingHungarian(latinOnly), ['ő', 'ű', 'Ő', 'Ű'])
})

test('build-fonts.mjs hard-fails on a missing Hungarian letter and ships only Archivo', () => {
  const source = read('scripts/build-fonts.mjs')
  assert.match(source, /missingHungarian\(shippedCodePoints\)/)
  assert.match(source, /if \(missing\.length > 0\) \{\s*fail\(/)
  assert.doesNotMatch(source, /dm-sans|jetbrains/i)
})

test('no site stylesheet or template refers to DM Sans or JetBrains Mono any more', () => {
  for (const file of ['src/site/fonts.css', 'src/site/jogi.css', 'src/site/keret.css', 'index.html']) {
    assert.doesNotMatch(read(file), /DM Sans|JetBrains|dm-sans|jetbrains/, file)
  }
})

test('build-fonts.mjs takes its preload size from the helper, not from one hard-coded file', () => {
  const source = read('scripts/build-fonts.mjs')
  assert.match(source, /from '\.\/lib\/font-build\.mjs'/)
  assert.doesNotMatch(source, /statSync\([^)]*archivo-latin\.woff2/)
})

test('the Python requirements for build:fonts are declared', () => {
  const lines = read('scripts/requirements-fonts.txt')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'))
  for (const name of ['fonttools', 'brotli']) {
    assert.ok(
      lines.some((line) => new RegExp(`^${name}==\\d`).test(line)),
      `${name} must be pinned in scripts/requirements-fonts.txt`,
    )
  }
  assert.match(read('README.md'), /requirements-fonts\.txt/)
})

const fakeRun = (result) => () => ({ status: 0, stdout: '', stderr: '', ...result })

test('pythonSetupProblem is silent when the interpreter has both modules', () => {
  assert.equal(pythonSetupProblem({ python: 'python', run: fakeRun({}) }), null)
})

test('pythonSetupProblem explains a missing module with the install command', () => {
  const message = pythonSetupProblem({
    python: 'python',
    run: fakeRun({
      status: 1,
      stderr: "Traceback (most recent call last):\nModuleNotFoundError: No module named 'brotli'\n",
    }),
  })
  assert.match(message, /brotli/)
  assert.match(message, /pip install -r scripts\/requirements-fonts\.txt/)
})

test('pythonSetupProblem explains a missing interpreter and the PYTHON override', () => {
  const missing = pythonSetupProblem({
    python: 'python3',
    run: fakeRun({ status: null, error: Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' }) }),
  })
  assert.match(missing, /python3/)
  assert.match(missing, /PYTHON=/)
  const storeStub = pythonSetupProblem({
    python: 'python3',
    run: fakeRun({ status: 9009, stderr: 'Python was not found; run without arguments to install from the Microsoft Store' }),
  })
  assert.match(storeStub, /PYTHON=/)
  assert.doesNotMatch(storeStub, /requirements-fonts/)
})

test('defaultPython honours PYTHON and avoids the Windows python3 Store stub', () => {
  assert.equal(defaultPython({ PYTHON: 'C:\\Py\\python.exe' }, 'win32'), 'C:\\Py\\python.exe')
  assert.equal(defaultPython({}, 'win32'), 'python')
  assert.equal(defaultPython({}, 'linux'), 'python3')
  assert.equal(defaultPython({}, 'darwin'), 'python3')
})
