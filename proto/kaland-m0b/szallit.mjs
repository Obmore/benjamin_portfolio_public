// Packs the M0b world into ONE self-contained HTML file (CSS, fonts, picture, data and script inlined):
//   node proto/kaland-m0b/szallit.mjs [out.html] [--artifakt]      (default: proto-frames/kaland-m0b.html)
// --artifakt: the page content only (no doctype/html/head/body: the Artifact host wraps it), demo links pointed at the live site.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dir = path.join(root, 'proto/kaland-m0b')
const args = process.argv.slice(2)
const artifakt = args.includes('--artifakt')
const ki = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'proto-frames/kaland-m0b.html'))
const b64 = (rel, tipus) => `data:${tipus};base64,${fs.readFileSync(path.join(root, rel)).toString('base64')}`

const eredmeny = await build({
  configFile: false, root: dir, logLevel: 'warn',
  build: { write: false, minify: true, lib: { entry: path.join(dir, 'vilag.js'), formats: ['iife'], name: 'vilag' } },
})
const kimenet = Array.isArray(eredmeny) ? eredmeny[0] : eredmeny
const js = kimenet.output.find((o) => o.type === 'chunk').code

let css = fs.readFileSync(path.join(root, 'src/site/fooldal/jel-tokens.css'), 'utf8') + '\n' + fs.readFileSync(path.join(dir, 'vilag.css'), 'utf8')
css = css.replace('url("/fonts/archivo-latin.woff2")', `url("${b64('public/fonts/archivo-latin.woff2', 'font/woff2')}")`)
  .replace('url("/fonts/archivo-latin-ext.woff2")', `url("${b64('public/fonts/archivo-latin-ext.woff2', 'font/woff2')}")`)
  .replace('url("/fonts/martian-mono-500-latin.woff2")', `url("${b64('public/fonts/martian-mono-500-latin.woff2', 'font/woff2')}")`)

const alap = artifakt ? `window.__kalandAlap='https://ottbenjamin.hu';` : ''
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
html = html
  .replace('<link rel="stylesheet" href="/src/site/fooldal/jel-tokens.css">\n', '')
  .replace('<link rel="stylesheet" href="./vilag.css">', () => `<style>${css}</style>`)
  .replace('src="/work/lelek-es-nyelv-telefon.webp"', `src="${b64('public/work/lelek-es-nyelv-telefon.webp', 'image/webp')}"`)
  .replace('<script type="module" src="./vilag.js"></script>', () => `<script>${alap}${js.replaceAll('</script', '<\\/script')}</script>`)
if (/src="\/|href="\/src/.test(html)) throw new Error('an external reference is left in the single file')
if (artifakt) {
  const test = /<body>([\s\S]*)<\/body>/.exec(html)[1]
  const stilus = /<style>[\s\S]*?<\/style>/.exec(html)[0]
  html = `<title>A Mintatér világa</title>\n${stilus}\n${test.replace(/<script>[\s\S]*<\/script>/, '')}\n${/<script>[\s\S]*<\/script>/.exec(html)[0]}\n`
}
fs.mkdirSync(path.dirname(ki), { recursive: true })
fs.writeFileSync(ki, html)
console.log('written', ki, (fs.statSync(ki).size / 1024).toFixed(0), 'KB', artifakt ? '(artifact flavour)' : '')
