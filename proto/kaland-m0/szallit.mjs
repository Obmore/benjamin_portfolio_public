// Packs the prototype into ONE self-contained HTML file (CSS, fonts, picture, data and script inlined) for a quick look anywhere:
//   node proto/kaland-m0/szallit.mjs [out.html] [--artifakt]      (default: proto-frames/kaland-m0.html)
// --artifakt: the page content only (no doctype/html/head/body: the Artifact host wraps it), the host's data-theme mapped to the page's
// own theme attribute, and the demos' relative links pointed at the live site. The bundle is made by Vite's own build API (an IIFE).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dir = path.join(root, 'proto/kaland-m0')
const args = process.argv.slice(2)
const artifakt = args.includes('--artifakt')
const ki = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'proto-frames/kaland-m0.html'))
const b64 = (rel, tipus) => `data:${tipus};base64,${fs.readFileSync(path.join(root, rel)).toString('base64')}`

const eredmeny = await build({
  configFile: false, root: dir, logLevel: 'warn',
  build: { write: false, minify: true, lib: { entry: path.join(dir, 'kaland.js'), formats: ['iife'], name: 'kaland' } },
})
const kimenet = Array.isArray(eredmeny) ? eredmeny[0] : eredmeny
const js = kimenet.output.find((o) => o.type === 'chunk').code

let css = fs.readFileSync(path.join(root, 'src/site/fooldal/jel-tokens.css'), 'utf8') + '\n' + fs.readFileSync(path.join(dir, 'kaland.css'), 'utf8')
css = css.replace('url("/fonts/archivo-latin.woff2")', `url("${b64('public/fonts/archivo-latin.woff2', 'font/woff2')}")`)
  .replace('url("/fonts/archivo-latin-ext.woff2")', `url("${b64('public/fonts/archivo-latin-ext.woff2', 'font/woff2')}")`)
  .replace('url("/fonts/martian-mono-500-latin.woff2")', `url("${b64('public/fonts/martian-mono-500-latin.woff2', 'font/woff2')}")`)

// The host marks an explicit theme choice with data-theme on the root; the page's tokens read data-tema (sotet / vilagos), so the host's choice is mapped across.
const temaHid = `(function(){var r=document.documentElement,m=function(){var t=r.getAttribute('data-theme');if(t==='dark'||t==='light'){r.setAttribute('data-tema',t==='dark'?'sotet':'vilagos')}};m();new MutationObserver(m).observe(r,{attributes:true,attributeFilter:['data-theme']})})();window.__kalandAlap='https://ottbenjamin.hu';`

let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
html = html
  .replace('<link rel="stylesheet" href="/src/site/fooldal/jel-tokens.css">\n', '')
  .replace('<link rel="stylesheet" href="./kaland.css">', () => `<style>${css}</style>`)
  .replace('src="/work/lelek-es-nyelv-telefon.webp"', `src="${b64('public/work/lelek-es-nyelv-telefon.webp', 'image/webp')}"`)
  .replace('<script type="module" src="./kaland.js"></script>', () => `<script>${artifakt ? temaHid : ''}${js.replaceAll('</script', '<\\/script')}</script>`)
if (/src="\/|href="\/src/.test(html)) throw new Error('an external reference is left in the single file')
if (artifakt) {
  const test = /<body>([\s\S]*)<\/body>/.exec(html)[1]
  const stilus = /<style>[\s\S]*?<\/style>/.exec(html)[0]
  html = `<title>Az út a Mintatérben</title>\n${stilus}\n${test.replace(/<script>[\s\S]*<\/script>/, '')}\n${/<script>[\s\S]*<\/script>/.exec(html)[0]}\n`
}
fs.mkdirSync(path.dirname(ki), { recursive: true })
fs.writeFileSync(ki, html)
console.log('written', ki, (fs.statSync(ki).size / 1024).toFixed(0), 'KB', artifakt ? '(artifact flavour)' : '')
