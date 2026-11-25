import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ATIRANYITASOK } from '../src/content/atiranyitasok.ts'
import { atiranyitasHtml, atiranyitasVisszaesesiSzkript, csereKifejezes } from '../src/site/atiranyitas.ts'
import { ellenorizChunkok, ellenorizModulSzkriptek } from './lib/modul-szkriptek.mjs'
import { walk } from './lib/walk.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const notFoundPath = path.join(dist, '404.html')

const errors = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${path.relative(root, filePath)}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

function mustInclude(label, html, snippet) {
  if (!html.includes(snippet)) errors.push(`${label}: missing ${JSON.stringify(snippet)}`)
}

function mustNotInclude(label, html, snippet) {
  if (html.includes(snippet)) errors.push(`${label}: must not contain ${JSON.stringify(snippet)}`)
}

function count(html, re) {
  return [...html.matchAll(re)].length
}

const notFound = read(notFoundPath)

// One generated stub per entry of src/content/atiranyitasok.ts, and no other stub (every built page that refreshes is on the list).
if (!fs.existsSync(dist)) errors.push('dist/ is missing. Run npm run build first.')
for (const { from, to, cim, link } of ATIRANYITASOK) {
  const label = `redirect ${from}`
  const stub = read(path.join(dist, from.slice(1), 'index.html'))
  const [target] = to.split('#')
  if (!fs.existsSync(path.join(dist, target.slice(1), 'index.html'))) errors.push(`${label}: the target ${target} has no page in dist`)
  if (!stub) continue
  mustInclude(label, stub, '<meta name="robots" content="noindex" />')
  mustInclude(label, stub, `<meta http-equiv="refresh" content="0; url=${atiranyitasHtml(to)}" />`)
  mustInclude(label, stub, `<link rel="canonical" href="https://ottbenjamin.hu${atiranyitasHtml(target)}" />`)
  mustInclude(label, stub, `location.replace(${csereKifejezes(to)})`)
  mustInclude(label, stub, `<title>${atiranyitasHtml(cim)}</title>`)
  mustInclude(label, stub, `<a href="${atiranyitasHtml(to)}">${atiranyitasHtml(link)}</a>`)
  mustInclude(label, stub, 'data-jel-fej')
  if (count(stub, /rel="canonical"/g) !== 1) errors.push(`${label}: canonical must appear exactly once`)
  if (count(stub, /<form\b|<style\b|<link rel="stylesheet"/gi) !== 0) errors.push(`${label}: must not contain a form or a stylesheet`)
  if (Buffer.byteLength(stub, 'utf8') > 8 * 1024) errors.push(`${label}: file is ${Buffer.byteLength(stub, 'utf8')} B; keep it small (≤ 8 KB)`)
}
{
  const listed = new Set(ATIRANYITASOK.map((a) => path.join(dist, a.from.slice(1), 'index.html')))
  for (const file of walk(dist, (f) => path.basename(f) === 'index.html')) {
    if (!listed.has(file) && /http-equiv="refresh"/i.test(fs.readFileSync(file, 'utf8'))) errors.push(`${path.relative(dist, file)}: a redirect stub that is not in src/content/atiranyitasok.ts`)
  }
}

if (notFound) {
  mustInclude('404', notFound, '<meta name="robots" content="noindex" />')
  mustInclude('404', notFound, '<meta name="color-scheme" content="light dark" />')
  mustInclude('404', notFound, 'Ez az oldal nem található.')
  mustInclude('404', notFound, 'This page could not be found.')
  mustInclude('404', notFound, 'href="/"')
  // The e-mail address is the footer's (the shared footer); nowhere else on the page.
  {
    const address = 'ott.benjamin.ev@ottbenjamin.hu'
    const footer = notFound.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? ''
    if (count(notFound, new RegExp(address.replace(/\./g, '\\.'), 'g')) !== count(footer, new RegExp(address.replace(/\./g, '\\.'), 'g')) || !footer.includes(address)) errors.push('404: the e-mail address must appear only inside the footer')
  }
  mustInclude('404', notFound, 'Vissza a főoldalra')
  // The fallback for spellings no stub covers (other case, accented, no trailing slash) is generated from the same list.
  mustInclude('404', notFound, atiranyitasVisszaesesiSzkript(ATIRANYITASOK))
  // Hand-written literals, so that a bug shared by the generator and its expectation cannot pass: the table of the fallback and the exact stub expression.
  mustInclude('404', notFound, '"/rendeles/":"/megrendeles/"')
  mustInclude('404', notFound, '"/megrendelés/":"/megrendeles/"')
  mustInclude('404', notFound, "location.replace((i < 0 ? t : t.slice(0, i)) + location.search + (i < 0 ? location.hash : t.slice(i)))")
  mustInclude('/megrendelo/ stub', read(path.join(dist, 'megrendelo/index.html')), 'location.replace("/megrendeles/" + location.search + location.hash)')
  // An entry whose target carries a hash sends the visitor to that hash (an old incoming hash has no target on the new page); the query is still carried.
  mustInclude('/gepkonyv/ stub', read(path.join(dist, 'gepkonyv/index.html')), 'location.replace("/megrendeles/" + location.search + "#szolgaltatas-gepkonyv")')
  // The shared header links the packages page ("Csomagok"); the page itself does not (the typo redirect is a script).
  mustNotInclude('404', notFound, 'href="/megrendeles"')
  mustNotInclude('404', notFound, '<form')
  mustNotInclude('404', notFound, '<input')
  mustNotInclude('404', notFound, '<textarea')
  mustNotInclude('404', notFound, '<select')
  mustNotInclude('404', notFound, 'gtag')
  mustNotInclude('404', notFound, 'googletagmanager')
  // The SVG namespace of the inline drawings is an identifier, not a request.
  const external = [...notFound.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((match) => match[0]).filter((url) => url !== 'http://www.w3.org/2000/svg')
  if (external.length > 0) {
    errors.push(`404: unexpected external URL ${JSON.stringify(external)}`)
  }
  if (Buffer.byteLength(notFound, 'utf8') > 16 * 1024) {
    errors.push(`404: file is ${Buffer.byteLength(notFound, 'utf8')} B; keep it small (≤ 16 KB)`)
  }
}

// Every page and every demo carries the shared head snippet (theme before first paint): a template that lost its marker would silently go without it.
for (const page of ['index.html', 'megrendeles/index.html', 'impresszum/index.html', 'aszf/index.html', 'adatkezeles/index.html', 'en/imprint/index.html', '404.html', 'demos/adatgyujto/index.html', 'demos/kezikonyv/index.html', 'demos/lapszabaszat/index.html', 'demos/tudaslap/index.html']) {
  const html = read(path.join(dist, page))
  if (html) mustInclude(page, html, 'data-jel-fej')
}

const mainHtmlPath = path.join(dist, 'index.html')
const mainHtml = read(mainHtmlPath)
if (mainHtml) {
  const htmlDir = path.dirname(mainHtmlPath)
  const entryFiles = new Set()
  for (const match of mainHtml.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0]
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1]
    const href = tag.match(/\bhref="([^"]+)"/)?.[1]
    const rel = tag.match(/\brel="([^"]+)"/)?.[1]?.toLowerCase() ?? ''
    const url = src ?? ((rel === 'stylesheet' || rel === 'modulepreload') ? href : null)
    if (!url) continue
    const clean = url.split('?')[0].split('#')[0]
    const file = clean.startsWith('/') ? path.join(dist, clean.slice(1)) : path.join(htmlDir, clean)
    if (fs.existsSync(file)) entryFiles.add(file)
  }
  const banned = [
    'Ez az oldal nem található.',
    'This page could not be found.',
    'Vissza a főoldalra',
    'Hiba 404',
    'Tovább a megrendeléshez',
  ]
  for (const file of entryFiles) {
    const text = fs.readFileSync(file, 'utf8')
    for (const snippet of banned) {
      if (text.includes(snippet)) {
        errors.push(
          `main entry ${path.relative(dist, file)} must not contain 404/redirect copy ${JSON.stringify(snippet)}`,
        )
      }
    }
  }
}

// The module scripts of every built page equal the expected set (scripts/lib/modul-szkriptek.mjs), and no standalone module became a shared chunk.
if (fs.existsSync(dist)) errors.push(...ellenorizModulSzkriptek(dist), ...ellenorizChunkok(dist))

if (errors.length > 0) {
  console.error('Static pages check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Static pages check passed.')
