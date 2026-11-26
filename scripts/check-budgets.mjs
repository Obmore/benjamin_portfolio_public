import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { walk } from './lib/walk.mjs'
import { appendedScripts } from './lib/megrendeles-szabaly.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const mainHtmlPath = path.join(dist, 'index.html')
const orderHtmlPath = path.join(dist, 'megrendeles/index.html')

// Gzip budgets (level 9) for JS and CSS, raw bytes for fonts. A raise needs an owner decision; the ones marked TEMPORARY are to be cut back in the hardening step.
const MAIN_BUDGETS = {
  entryJs: 76900,
  allJs: 160 * 1024,
  // TEMPORARY (owner decision 2026-11-16, "Ideiglenesen emeljük"): 11776 -> 12800 B for the new home page's own stylesheet and its tablet layout.
  css: 12800,
  // TEMPORARY, 21 KB -> 24 KB (owner's raise for the Rétegek PR): the stacks' own lazy sheet (src/site/retegek/retegek.css) and its 404 rules.
  otherCss: 24 * 1024,
  fonts: 120 * 1024,
  // TEMPORARY, 60 KB -> 74 KB (owner decision 2026-11-16): the home page's headlines use the wide width master (archivo-latin 71 KB).
  preloadFonts: 74 * 1024,
}

// The adventure world (src/vilag/, the private plan kaland-v2 5): ONE lazy file `vilag/vilag-<hash>.js` of its own, outside `assets/` and so outside `allJs`, with a budget of its own.
// PROPOSED by thread V2 (2026-11-25), NOT yet confirmed by the owner: 250 KB gzip for the JS and 2 MB raw for every other file under vilag/ (textures, models, audio: none today).
const WORLD_BUDGETS = {
  js: 250 * 1024,
  assets: 2 * 1024 * 1024,
}

const ORDER_BUDGETS = {
  js: 15 * 1024,
  css: 10 * 1024,
  pageCss: 7.5 * 1024, // 2 KB -> 7.5 KB, TEMPORARY (owner, 2026-11-18: "Ideiglenes emelés"): the one page sheet carries the shared sheets it imports (measured 6.96 KB); to be cut back or restructured in PR 9.
  // 60 KB -> 74 KB, TEMPORARY: /megrendeles/ preloads the same two files as the home page (see MAIN_BUDGETS).
  preloadFonts: 74 * 1024,
}

function gzipSize(filePath) {
  const buf = fs.readFileSync(filePath)
  return zlib.gzipSync(buf, { level: 9 }).length
}

function fileSize(filePath) {
  return fs.statSync(filePath).size
}

function attrs(tag) {
  const out = {}
  for (const match of tag.matchAll(/([a-zA-Z_:][\w:.-]*)=(?:"([^"]*)"|'([^']*)')/g)) {
    out[match[1]] = match[2] ?? match[3] ?? ''
  }
  return out
}

function collectFromHtml(html, htmlFilePath) {
  const htmlDir = path.dirname(htmlFilePath)
  const entryJs = new Set()
  const cssFiles = new Set()
  const preloadFonts = new Set()

  const resolveHref = (href) => {
    const clean = href.split('?')[0].split('#')[0]
    if (clean.startsWith('/')) return path.join(dist, clean.slice(1))
    return path.join(htmlDir, clean)
  }

  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const a = attrs(match[0])
    if (a.src) entryJs.add(path.normalize(resolveHref(a.src)))
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(match[0])
    const rel = (a.rel ?? '').toLowerCase()
    if (rel === 'modulepreload' && a.href) entryJs.add(path.normalize(resolveHref(a.href)))
    if (rel === 'stylesheet' && a.href) cssFiles.add(path.normalize(resolveHref(a.href)))
    if (rel === 'preload' && a.as === 'font' && a.href) {
      preloadFonts.add(path.normalize(resolveHref(a.href)))
    }
  }

  return { entryJs, cssFiles, preloadFonts }
}

function sum(files, measurer) {
  let total = 0
  const rows = []
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Missing file: ${file}`)
      process.exit(1)
    }
    const size = measurer(file)
    total += size
    rows.push({ file: path.relative(dist, file), size })
  }
  return { total, rows }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

function printRows(title, rows, unit = 'gzip') {
  console.log(`${title}:`)
  if (rows.length === 0) {
    console.log('  (none)')
    return
  }
  for (const row of rows) console.log(`  ${row.file}: ${kb(row.size)} ${unit}`)
}

if (!fs.existsSync(mainHtmlPath)) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

if (!fs.existsSync(orderHtmlPath)) {
  console.error('dist/megrendeles/index.html missing. Run npm run build first.')
  process.exit(1)
}

const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8')
const orderHtml = fs.readFileSync(orderHtmlPath, 'utf8')
const main = collectFromHtml(mainHtml, mainHtmlPath)
const order = collectFromHtml(orderHtml, orderHtmlPath)

const mainJsGzip = sum([...main.entryJs], gzipSize)
const mainCssGzip = sum([...main.cssFiles], gzipSize)
// The scripts the page really loads: its entry plus every standalone script the entry appends (keret, masolo-futtat, meres-futtat). They are found from the built entry's own
// references (absolute "/assets/x.js" and relative "./x.js", "../assets/x.js" strings, static and dynamic imports), followed transitively, never by name; every file counts once.
// The traversal stops at dist/vilag/ and files under dist/vilag/ are dropped here: the world is measured on its own below.
const worldDir = path.join(dist, 'vilag')
const withoutWorld = (files) => files.filter((file) => !path.normalize(file).startsWith(worldDir + path.sep))
const scriptIo = {
  read: (file) => (path.normalize(file).startsWith(worldDir + path.sep) ? '' : fs.readFileSync(file, 'utf8')),
  exists: (file) => fs.existsSync(file),
}
const orderOwnEntries = [...order.entryJs].filter((file) => path.basename(file).startsWith('csomagok-'))
let orderAppended = []
try {
  orderAppended = withoutWorld(appendedScripts(orderOwnEntries, dist, scriptIo))
} catch (error) {
  console.error(`/megrendeles/: ${error.message}`)
  process.exit(1)
}
if (orderOwnEntries.length === 0 || orderAppended.length === 0) {
  console.error('/megrendeles/: no appended standalone script found from the built entry (csomagok-*.js); the JS row would measure the entry alone')
  process.exit(1)
}
const orderJsFiles = [...new Set([...order.entryJs, ...orderAppended].map((file) => path.normalize(file)))]
const orderJsGzip = sum(orderJsFiles, gzipSize)
const orderCssGzip = sum([...order.cssFiles], gzipSize)

const allMainJsFiles = walk(path.join(dist, 'assets'), (file) => file.endsWith('.js'))
const mainAllJsGzip = sum(allMainJsFiles, gzipSize)

// Every other stylesheet: per-page and lazily loaded CSS that no other line measures.
const mainCssSet = new Set([...main.cssFiles].map((file) => path.normalize(file)))
const otherCssFiles = walk(path.join(dist, 'assets'), (file) => {
  if (!file.endsWith('.css')) return false
  return !mainCssSet.has(path.normalize(file))
})
const otherCssGzip = sum(otherCssFiles, gzipSize)

const fontFiles = walk(path.join(dist, 'fonts'), (file) => file.endsWith('.woff2'))
const fontsRaw = sum(fontFiles, fileSize)
const mainPreloadRaw = sum([...main.preloadFonts], fileSize)
const orderPreloadRaw = sum([...order.preloadFonts], fileSize)

// Since PR 6 /megrendeles/ is a page of the shared layer (like the legal pages): one entry of its own (src/site/megrendeles.ts, built as csomagok-*.js) and
// shared modules only, judged by the built files' identity: every other JS file it loads must be one that the home page or a legal page (/aszf/) loads too.
// No home chunk. Its stylesheet is one page sheet named csomagok-*.css (it carries the shared sheets it imports).
const legalHtmlPath = path.join(dist, 'aszf/index.html')
if (!fs.existsSync(legalHtmlPath)) {
  console.error('dist/aszf/index.html missing. Run npm run build first.')
  process.exit(1)
}
const legal = collectFromHtml(fs.readFileSync(legalHtmlPath, 'utf8'), legalHtmlPath)
const ownEntries = new Set([...attrsOfScripts(orderHtml)].map((src) => path.normalize(path.join(dist, src.split('?')[0].replace(/^\//, '')))))
function attrsOfScripts(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => attrs(m[0]).src).filter(Boolean)
}
const sharedJs = new Set([...main.entryJs, ...legal.entryJs])
const extraJs = [...order.entryJs].filter((file) => !sharedJs.has(file) && !(ownEntries.has(file) && path.basename(file).startsWith('csomagok-')))
const extraCss = [...order.cssFiles].filter((file) => !main.cssFiles.has(file))

let failed = false

// The world: exactly one JS file under dist/vilag/, measured on its own; no page loads it with a tag, and the home page's entry script fetches it by URL (a tag would be a new head tag).
const worldFiles = walk(worldDir, () => true)
const worldJs = worldFiles.filter((file) => /^vilag-[\w-]{8}\.js$/.test(path.basename(file)))
if (worldJs.length !== 1) {
  failed = true
  console.error(`dist/vilag: expected exactly one vilag-<hash>.js, found ${worldJs.length}`)
} else {
  const worldBase = path.basename(worldJs[0])
  if (!allMainJsFiles.some((file) => fs.readFileSync(file, 'utf8').includes(`/vilag/${worldBase}`))) {
    failed = true
    console.error(`the home page's entry does not name dist/vilag/${worldBase}`)
  }
}
const worldJsGzip = sum(worldJs, gzipSize)
const worldAssetsRaw = sum(worldFiles.filter((file) => !worldJs.includes(file)), fileSize)
for (const page of walk(dist, (file) => file.endsWith('.html'))) {
  if (/<(?:script|link)\b[^>]*\/vilag\//i.test(fs.readFileSync(page, 'utf8'))) {
    failed = true
    console.error(`${path.relative(dist, page)}: loads the world with a tag; it must be fetched and started by a script, never linked from the head`)
  }
}

if (extraJs.length > 0) {
  failed = true
  console.error(
    `/megrendeles/ loads JS that is neither its own entry (csomagok-*.js) nor loaded by the home page or a legal page too: ${extraJs.map((file) => path.relative(dist, file)).join(', ')}`,
  )
}

const pageCssOk = extraCss.length === 1 && path.basename(extraCss[0]).startsWith('csomagok-')
if (!pageCssOk) {
  failed = true
  console.error(
    `/megrendeles/ must add exactly one page stylesheet named csomagok-*.css to the main CSS, found: ${
      extraCss.map((file) => path.relative(dist, file)).join(', ') || '(none)'
    }`,
  )
}
const pageCssGzip = sum(pageCssOk ? extraCss : [], gzipSize)

const checks = [
  ['Main entry JS (gzip)', mainJsGzip.total, MAIN_BUDGETS.entryJs],
  ['Main all JS (gzip)', mainAllJsGzip.total, MAIN_BUDGETS.allJs],
  ['Main CSS (gzip)', mainCssGzip.total, MAIN_BUDGETS.css],
  ['Other CSS (gzip)', otherCssGzip.total, MAIN_BUDGETS.otherCss],
  ['Fonts total (raw)', fontsRaw.total, MAIN_BUDGETS.fonts],
  ['Main preload fonts (raw)', mainPreloadRaw.total, MAIN_BUDGETS.preloadFonts],
  ['/megrendeles/ JS (gzip)', orderJsGzip.total, ORDER_BUDGETS.js],
  ['/megrendeles/ page stylesheet csomagok-*.css (gzip)', pageCssGzip.total, ORDER_BUDGETS.pageCss],
  ['/megrendeles/ CSS (gzip)', orderCssGzip.total, ORDER_BUDGETS.css],
  ['/megrendeles/ preload fonts (raw)', orderPreloadRaw.total, ORDER_BUDGETS.preloadFonts],
  ['World JS vilag/vilag-*.js (gzip, outside allJs; proposed)', worldJsGzip.total, WORLD_BUDGETS.js],
  ['World other files vilag/ (raw; proposed)', worldAssetsRaw.total, WORLD_BUDGETS.assets],
]

console.log('\nBudget check (gzip level 9 for JS/CSS, raw bytes for fonts)\n')
console.log('| Asset | Size | Budget | Status |')
console.log('| --- | ---: | ---: | --- |')

for (const [label, size, budget] of checks) {
  const ok = size <= budget
  if (!ok) failed = true
  console.log(`| ${label} | ${kb(size)} (${size} B) | ${kb(budget)} | ${ok ? 'OK' : 'FAIL'} |`)
}

console.log('')
printRows('Main entry JS files', mainJsGzip.rows)
printRows('Main all JS files', mainAllJsGzip.rows)
printRows('Main CSS files', mainCssGzip.rows)
printRows('Other CSS files (everything except the main page CSS)', otherCssGzip.rows)
printRows('Main preload fonts', mainPreloadRaw.rows, 'raw')
printRows('/megrendeles/ JS files', orderJsGzip.rows)
printRows('/megrendeles/ CSS files', orderCssGzip.rows)
printRows('/megrendeles/ preload fonts', orderPreloadRaw.rows, 'raw')
printRows('World JS (outside allJs)', worldJsGzip.rows)
printRows('World other files', worldAssetsRaw.rows, 'raw')
printRows('Font files', fontsRaw.rows, 'raw')

if (![...order.preloadFonts].some((file) => file.endsWith('archivo-latin.woff2'))) {
  failed = true
  console.error('\n/megrendeles/ must preload archivo-latin.woff2.')
}

if (failed) {
  console.error('\nBudget check failed.')
  process.exit(1)
}

console.log('\nBudget check passed.')
