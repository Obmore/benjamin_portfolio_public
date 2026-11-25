import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { typedAmount } from './lib/ar-szabaly.mjs'
import { FORBIDDEN_HOURLY, amountProblems, foundAmounts, grouped, typedPriceLiteral } from './lib/megrendeles-szabaly.mjs'
import { walk } from './lib/walk.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const mainPath = path.join(dist, 'index.html')
const orderPath = path.join(dist, 'megrendeles/index.html')

const errors = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${path.relative(root, filePath)}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

const main = read(mainPath)
const order = read(orderPath)
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'

function mustInclude(label, html, snippet) {
  if (!html.includes(snippet)) errors.push(`${label}: missing ${JSON.stringify(snippet)}`)
}

function mustNotInclude(label, html, snippet) {
  if (html.includes(snippet)) errors.push(`${label}: must not contain ${JSON.stringify(snippet)}`)
}

function count(html, re) {
  return [...html.matchAll(re)].length
}

if (main) {
  mustInclude('main', main, '<link rel="canonical" href="https://ottbenjamin.hu/" />')
  mustInclude('main', main, '<meta property="og:url" content="https://ottbenjamin.hu/" />')
  mustInclude('main', main, '<title>Ott Benjámin – egyedi weboldal és műszaki szoftver</title>')
  mustNotInclude('main', main, 'VITE_SHOW_ORDER_LINK')
  // Since 2026-11-16 the home page is the signal-path page (direction D): it links the package page exactly once (the "Csomagok és
  // árak" line of the partners section) and has no price list of its own (the prices live on /megrendeles/).
  // Since PR 4 the shared header's "Csomagok" link is the second one.
  if (count(main, /href="\/megrendeles\/"/g) !== 2) errors.push('main: must link /megrendeles/ exactly twice (the header and the partners section)')
  mustNotInclude('main', main, '59 000')
  // No CV, career timeline or technology list on the site (owner's decision, 2026-11-04).
  mustNotInclude('main', main, '/cv/')
  mustNotInclude('main', main, 'Önéletrajz')
}

// The package amounts and the thresholds come from src/data/pricing.ts only (parsed here, so this file types no amount).
const pricingSource = read(path.join(root, 'src/data/pricing.ts'))
const block = (name) => pricingSource.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const`))?.[1] ?? ''
const readNumbers = (text) => Object.fromEntries([...text.matchAll(/^\s*(\w+):\s*([\d_]+),/gm)].map((m) => [m[1], Number(m[2].replaceAll('_', ''))]))
const AMOUNTS = readNumbers(block('AMOUNTS'))
const THRESHOLDS = readNumbers(block('THRESHOLDS'))
if (Object.keys(AMOUNTS).length === 0) errors.push('pricing.ts: could not read AMOUNTS')
if (!('depositFrom' in THRESHOLDS)) errors.push('pricing.ts: could not read THRESHOLDS.depositFrom')

// Each package price in its places (spec 19 P1): the price key and how many times the page shows it. The threshold is not here: it is told by its place.
const PLACES = { productDescriptionsTrial: 1, machineManualEntry: 1, orderForm: 1, orderFormSheet: 2, introSite: 1, hosting: 2, hostingWithEdits: 1 }
const ANCHORS = [
  'belepo-csomagok',
  'szolgaltatas-termekleiras',
  'szolgaltatas-gepkonyv',
  'szolgaltatas-lapszabaszat',
  'szolgaltatas-bemutatkozo',
  'egyeb-szolgaltatasok',
  'szolgaltatas-rendelolap',
  'szolgaltatas-automatizalas',
  'szolgaltatas-adatok',
  'szolgaltatas-egyedi',
  'szolgaltatas-uzemeltetes',
  'kapcsolat',
  'kapcsolat-email',
]
const OLD_PAGES = ['/termekleiras/', '/gepkonyv/', '/lapszabaszat/', '/bemutatkozo-oldal/']

if (order) {
  // The package page is public and indexable.
  mustNotInclude('megrendeles', order, '<meta name="robots"')
  mustInclude('megrendeles', order, '<link rel="canonical" href="https://ottbenjamin.hu/megrendeles/" />')
  mustInclude('megrendeles', order, '<meta property="og:url" content="https://ottbenjamin.hu/megrendeles/" />')
  mustInclude('megrendeles', order, '<title>Csomagok és árak – Ott Benjámin</title>')
  if (count(order, /rel="canonical"/g) !== 1) errors.push('megrendeles: canonical must appear exactly once')
  if (count(order, /property="og:url"/g) !== 1) errors.push('megrendeles: og:url must appear exactly once')

  // The head (title, description, structured data) carries no amount.
  const head = order.slice(0, order.indexOf('<body'))
  if (/\d(?:[\d\s .]|&nbsp;)*(?:&nbsp;|[\s ])?Ft\b/.test(head)) errors.push('megrendeles: the head (meta, JSON-LD) must not carry an amount')

  // One business address, no other one, no form; the address is the shared contact end's field.
  const addresses = [...order.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0])
  if (addresses.length === 0) errors.push('megrendeles: no e-mail address found')
  for (const address of new Set(addresses)) {
    if (address !== EMAIL) errors.push(`megrendeles: unexpected e-mail address ${JSON.stringify(address)}`)
  }
  mustInclude('megrendeles', order, `id="kapcsolat-email" href="mailto:${EMAIL}"`)
  mustInclude('megrendeles', order, 'href="/adatkezeles/"')
  mustNotInclude('megrendeles', order, '<form')
  mustNotInclude('megrendeles', order, 'id="mg-')
  mustNotInclude('megrendeles', order, 'data-subject')
  mustNotInclude('megrendeles', order, 'class="mg-')

  // Every anchor exactly once (old links, the demo strips and the redirect list use them).
  for (const id of ANCHORS) {
    const n = count(order, new RegExp(`\\bid="${id}"`, 'g'))
    if (n !== 1) errors.push(`megrendeles: id="${id}" must appear exactly once, found ${n}`)
  }

  // The shared layer: the shared header and footer, the shared contact end with its module, the page chrome.
  mustInclude('megrendeles', order, '<footer class="tsec foot">')
  mustInclude('megrendeles', order, 'data-fejlec')
  // The shared header marks this page current (the shared header's current-page input, since A2).
  mustInclude('megrendeles', order, 'href="/megrendeles/" aria-current="page"')
  mustInclude('megrendeles', order, '<body class="jel-oldal">')
  mustInclude('megrendeles', order, 'data-cimmezo=""')
  // "Levelet írok" opens the mail with the approved subject "Megrendelés" (CSOMAGOK_KAPCSOLAT.targy); "Kapcsolat" in the header stays on this page.
  mustInclude('megrendeles', order, 'subject=Megrendel%C3%A9s')
  mustInclude('megrendeles', order, 'href="#kapcsolat"')

  // No foreign scripts: one local module script (the page's own entry), the head snippet, structured data. Its preloads are the shared layer's modules only.
  const scripts = [...order.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1])
  const external = scripts.filter((attrs) => /\bsrc="/.test(attrs))
  if (external.length !== 1 || !/type="module"/.test(external[0]) || /src="https?:/.test(external[0]) || !/src="\/assets\/csomagok-[\w-]+\.js"/.test(external[0])) {
    errors.push(`megrendeles: expected exactly one local module script (the page's own entry), found ${JSON.stringify(external)}`)
  }
  if (/\/assets\/fooldal-/.test(order)) errors.push('megrendeles: must not load the main entry')
  // The shared behaviour (theme key, contact end, analytics) is three standalone scripts of the page's own entry (`?worker&url&megr`, built on their own): the entry names each built file,
  // and no HTML script tag or preload names them (no shared chunk, no new head tag).
  const entryFile = /src="\/assets\/(csomagok-[\w-]+\.js)"/.exec(order)?.[1]
  const entrySource = entryFile && fs.existsSync(path.join(dist, 'assets', entryFile)) ? fs.readFileSync(path.join(dist, 'assets', entryFile), 'utf8') : ''
  for (const mod of ['keret', 'masolo-futtat', 'meres-futtat']) {
    const built = new RegExp(`assets/(${mod}-[\\w-]+\\.js)`).exec(entrySource)?.[1]
    if (!built || !fs.existsSync(path.join(dist, 'assets', built))) errors.push(`megrendeles: the page entry must load the standalone ${mod} script (a built file under dist/assets)`)
    else if (order.includes(built)) errors.push(`megrendeles: ${built} must be appended by the entry, not named in the HTML`)
  }

  // Amounts: only pricing.ts amounts, each in its places, each with its own „AAM (áfamentes)” label; the threshold once, only in the foot.
  const stripped = order.replace(/<script[\s\S]*?<\/script>/g, '')
  const body = stripped.slice(stripped.indexOf('<body'))
  const foots = [...body.matchAll(/<div class="cs-lab" data-lab="">([\s\S]*?)<\/div>/g)]
  if (foots.length !== 1) errors.push(`megrendeles: the table's foot (div.cs-lab) must appear exactly once, found ${foots.length}`)
  const foot = foots[0]?.[1] ?? ''
  const outside = foots[0] ? body.replace(foots[0][0], '') : body
  // Every amount outside the foot, in any grouping a browser renders (space-likes, entities, dot, comma, none): each must be in the one rendered grouping and match the per-value counts.
  const expected = {}
  for (const [key, n] of Object.entries(PLACES)) {
    if (!(key in AMOUNTS)) errors.push(`megrendeles: check names a price key that pricing.ts lacks: ${key}`)
    else expected[AMOUNTS[key]] = (expected[AMOUNTS[key]] ?? 0) + n
  }
  errors.push(...amountProblems(outside, expected, 'megrendeles (outside the foot)'))
  if (Object.keys(AMOUNTS).some((k) => !(k in PLACES))) errors.push('megrendeles: pricing.ts has an amount the check has no places for')
  // Inside the foot: exactly the threshold, once, followed by "-os", no AAM mark; found by its element, not by its value (149 000 is also two package prices).
  errors.push(...amountProblems(foot, { [THRESHOLDS.depositFrom]: 1 }, 'megrendeles (the foot must show the deposit threshold exactly once and nothing else)'))
  if (!foot.includes(`<span class="cs-nb">${grouped(THRESHOLDS.depositFrom)}-os</span>`)) errors.push('megrendeles: the threshold with its "-os" must stand in one no-break span')
  if (foot.includes('AAM')) errors.push('megrendeles: the foot must carry no AAM mark')
  if (count(foot, /<a\b/g) !== 1 || !foot.includes('<a class="cs-aszf" href="/aszf/#elso-resz">ÁSZF</a>')) errors.push('megrendeles: the foot must hold exactly one link, "ÁSZF" to /aszf/#elso-resz')
  const labels = count(body, /AAM \(áfamentes\)/g)
  if (labels !== 9) errors.push(`megrendeles: „AAM (áfamentes)” must appear exactly 9 times (one per price place), found ${labels}`)
  const shownAll = foundAmounts(outside).length
  if (shownAll !== 9) errors.push(`megrendeles: 9 price places expected outside the foot, found ${shownAll}`)
  // The three services without an amount say "Egyedi ajánlat" in their price cell, nowhere else.
  const egyedi = count(body, /Egyedi ajánlat/g)
  const cells = count(body, /<td class="cs-ar" role="cell">Egyedi ajánlat<\/td><td class="cs-afa" role="cell"><\/td>/g)
  if (egyedi !== 3 || cells !== 3) errors.push(`megrendeles: "Egyedi ajánlat" must stand exactly in the three amount-less price cells, found ${egyedi} (${cells} in a cell)`)
  mustNotInclude('megrendeles', order, '59 000')
  mustNotInclude('megrendeles', order, '59\u00a0000')
  mustNotInclude('megrendeles', order, 'alanyi adómentes')
  mustNotInclude('megrendeles', order, 'Opció: üzemeltetés')
  if (FORBIDDEN_HOURLY.test(order)) errors.push('megrendeles: must not carry the hourly price "4 900 Ft/hó" (any space-like grouping)')
  mustNotInclude('megrendeles', order, 'Két munkanapon')
}

// No built page except the redirect stubs links an old offer address (P8).
for (const file of walk(dist, (f) => f.endsWith('.html') && !path.relative(dist, f).startsWith('demos'))) {
  const html = fs.readFileSync(file, 'utf8')
  const rel = path.relative(dist, file).replaceAll('\\', '/')
  const stub = /http-equiv="refresh"/.test(html)
  if (!stub) for (const old of OLD_PAGES) if (html.includes(`href="${old}`)) errors.push(`${rel}: links the old offer address ${old}; point it at the panel on /megrendeles/`)
}

// The page texts live in the content files and the page component: no typed amount there, every {ar:key} placeholder names a pricing.ts amount, and the
// threshold placeholder {kuszob:…} stands only in the one foot field (CSOMAGOK_LAB.fizetes).
const sources = [
  'src/content/csomagok.ts',
  'src/site/pages/Csomagok.tsx',
  'src/content/belepok.ts',
  ...fs.readdirSync(path.join(root, 'src/content/szegmensek')).filter((n) => n.endsWith('.ts') && n !== 'tipus.ts').map((n) => `src/content/szegmensek/${n}`),
]
let kuszobDb = 0
for (const file of sources) {
  const source = read(path.join(root, file))
  // Any typed amount (spaces, NBSP, &nbsp; or none before "Ft") must be a placeholder.
  const literal = typedPriceLiteral(source)
  if (literal) errors.push(`${file}: write prices as {ar:…} placeholders, not literals (${JSON.stringify(literal)})`)
  for (const m of source.matchAll(/\{ar:(\w+)\}/g)) {
    if (!(m[1] in AMOUNTS)) errors.push(`${file}: unknown price key ${m[1]}`)
  }
  for (const m of source.matchAll(/\{kuszob:(\w+)\}/g)) {
    kuszobDb++
    if (!(m[1] in THRESHOLDS)) errors.push(`${file}: unknown threshold key ${m[1]}`)
    const lab = source.match(/export const CSOMAGOK_LAB = \{[\s\S]*?\n\}/)?.[0] ?? ''
    if (file !== 'src/content/csomagok.ts' || !lab.includes(m[0])) errors.push(`${file}: {kuszob:…} is allowed only in the foot field CSOMAGOK_LAB.fizetes`)
  }
}
if (kuszobDb !== 1) errors.push(`sources: the threshold placeholder must be used exactly once (the table's foot), found ${kuszobDb}`)

const assetsDir = path.join(dist, 'assets')
if (fs.existsSync(assetsDir)) {
  const allJs = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n')
  mustNotInclude('js', allJs, 'VITE_SHOW_ORDER_LINK')
  mustNotInclude('js', allJs, 'SHOW_ORDER_LINK')
  mustNotInclude('js', allJs, '59 000')
  mustNotInclude('js', allJs, '59000')
  mustNotInclude('js', allJs, 'Bemutatkozó oldal vállalkozásoknak')
  // The page content is prerendered into the HTML; the client script carries no prices.
  for (const name of fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'))) {
    const typedPrice = typedAmount(fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    if (typedPrice) errors.push(`dist/assets/${name}: must not contain a typed price ${JSON.stringify(typedPrice)}`)
  }
  mustNotInclude('js', allJs, 'Az e-mail-cím a vágólapra került.')
  // The removed e-mail composer and flow animation must not come back.
  mustNotInclude('js', allJs, 'mg-service')
  mustNotInclude('js', allJs, 'data-flow-step')
}

function textContent(filePath) {
  const buf = fs.readFileSync(filePath)
  if (buf.includes(0)) return ''
  return buf.toString('utf8')
}

const distText = walk(dist, () => true)
  .map((filePath) => textContent(filePath))
  .join('\n')
const distNormalized = distText.replaceAll(' ', ' ').replaceAll('&nbsp;', ' ')
if ((distNormalized.match(/59 000/g) ?? []).length !== 0) {
  errors.push('dist: must not contain „59 000”')
}
if ((distText.match(/alanyi adómentes/g) ?? []).length !== 0) {
  errors.push('dist: must not contain „alanyi adómentes”')
}

if (errors.length > 0) {
  console.error('Megrendelés page check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Megrendelés page check passed.')
