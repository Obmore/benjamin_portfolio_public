import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { colourLiteralErrors } from './lib/colour-literals.mjs'
import { noticeErrors } from './lib/notices.mjs'
import { walk } from './lib/walk.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const SITE = 'https://ottbenjamin.hu'
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const errors = []

const rel = (file) => path.relative(root, file).replaceAll('\\', '/')
const read = (file) => fs.readFileSync(file, 'utf8')
const isNoindex = (html) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run npm run build first.')
  process.exit(1)
}

// One contact address in everything the site itself serves. The demos under /demos/ are separate apps.
const served = walk(dist, (file) => /\.(html|js|xml|txt)$/.test(file))
  .filter((file) => !rel(file).startsWith('dist/demos/') && !rel(file).endsWith('third-party-notices.txt'))
for (const file of served) {
  for (const [address] of read(file).matchAll(/[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi)) {
    if (address.toLowerCase() !== EMAIL) errors.push(`${rel(file)}: unexpected e-mail address ${address}`)
  }
}

// Page turn: the view-transition opt-in is inline in <head>, before the first stylesheet link (src/site/lapcsere-fej.ts).
// In an external stylesheet that arrives late Chromium aborts the inbound transition with an InvalidStateError.
function optInErrors(label, html) {
  const optIn = html.search(/<style>[^<]*@view-transition\s*\{\s*navigation:\s*auto/)
  const firstLink = html.search(/<link\b[^>]*rel="stylesheet"/)
  if (optIn < 0) errors.push(`${label}: no inline @view-transition opt-in in <head>`)
  else if (firstLink >= 0 && firstLink < optIn) errors.push(`${label}: the inline @view-transition opt-in comes after a stylesheet link`)
  if (!/<meta\s+charset=/i.test(html.slice(0, 1024))) errors.push(`${label}: <meta charset> is not within the first 1024 bytes`)
}

// The demos are copied from public/ and get the opt-in by a build hook (vite.config.ts, LAPCSERE_DEMOK); they are not in
// the sitemap. Every demo found in dist is checked, so a demo added under public/demos/ without being listed there fails.
const demoPages = walk(path.join(dist, 'demos'), (file) => path.basename(file) === 'index.html' && path.dirname(path.dirname(file)) === path.join(dist, 'demos'))
if (demoPages.length === 0) errors.push('dist/demos/*/index.html: no demo pages found')
for (const page of demoPages) {
  const name = path.basename(path.dirname(page))
  const html = read(page)
  if (!html.includes('@view-transition')) errors.push(`/demos/${name}/: no opt-in; add "${name}" to LAPCSERE_DEMOK in vite.config.ts`)
  else optInErrors(`/demos/${name}/`, html)
}

// The sitemap lists every indexable page and nothing else.
const sitemapPath = path.join(dist, 'sitemap.xml')
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? read(path.join(dist, 'robots.txt')) : ''
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) errors.push('robots.txt: missing Sitemap line')
if (!fs.existsSync(sitemapPath)) {
  errors.push('dist/sitemap.xml missing')
} else {
  const locs = [...read(sitemapPath).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  if (new Set(locs).size !== locs.length) errors.push('sitemap: duplicate <loc>')
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE}/`) || !loc.endsWith('/')) {
      errors.push(`sitemap: ${loc} must be an absolute ${SITE}/…/ URL`)
      continue
    }
    const page = path.join(dist, loc.slice(SITE.length), 'index.html')
    if (!fs.existsSync(page)) errors.push(`sitemap: ${loc} has no page in dist (404)`)
    else {
      const html = read(page)
      if (isNoindex(html)) errors.push(`sitemap: ${loc} is noindex`)
      optInErrors(loc, html)
    }
  }
  for (const page of walk(dist, (file) => path.basename(file) === 'index.html')) {
    if (isNoindex(read(page))) continue
    const urlPath = `/${path.relative(dist, path.dirname(page)).replaceAll('\\', '/')}/`.replace(/^\/\/$/, '/')
    if (!locs.includes(SITE + urlPath)) errors.push(`sitemap: indexable page ${urlPath} is missing`)
  }
}

// No hex colour in a source file beyond the palette values of src/site/fooldal/jel-tokens.css (scripts/color-allowlist.json).
const allowed = new Set(JSON.parse(read(path.join(root, 'scripts/color-allowlist.json'))))
const styled = [
  ...walk(path.join(root, 'src'), (file) => /\.(css|ts|tsx)$/.test(file)),
  ...walk(root, (file) => file.endsWith('index.html') && !/[\\/](node_modules|dist|tmp|public[\\/]demos|\.claude|test-results|playwright-report)[\\/]/.test(file)),
  path.join(root, '404.html'),
]
for (const file of styled) {
  for (const [color] of read(file).matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    if (!allowed.has(color.toLowerCase())) errors.push(`${rel(file)}: colour ${color} is not a design token or reviewed colour`)
  }
}

// src/site/fooldal/jel-tokens.css is the single colour source: no colour literal in any other CSS file under src/site.
errors.push(...colourLiteralErrors(root))

// public/third-party-notices.txt names the exact library versions in use and every shipped font file.
errors.push(
  ...noticeErrors({
    text: read(path.join(root, 'public/third-party-notices.txt')),
    packageJson: JSON.parse(read(path.join(root, 'package.json'))),
    lock: JSON.parse(read(path.join(root, 'package-lock.json'))),
    fontFiles: fs.readdirSync(path.join(root, 'public/fonts')).filter((file) => file.endsWith('.woff2')),
  }),
)

if (errors.length > 0) {
  console.error('Site check failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Site check passed.')
