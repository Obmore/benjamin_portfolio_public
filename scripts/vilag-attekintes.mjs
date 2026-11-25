// Packs the world engine (src/vilag/) and a plain host page into ONE self-contained HTML file, so the owner can open the world on his own GPU before any page links it (thread V7 owns the real entry).
//   node scripts/vilag-attekintes.mjs [out.html] [--artifakt]          (default: tmp/vilag-attekintes.html)
// --artifakt: the page content only (no doctype, html, head or body: the Artifact host wraps it).
// Nothing here ships: the file is a review aid. The world runs as the review build (`diagnosztika: true`: the line with the renderer, the compile time and the frame times, and the "Mérés" and "Minőség" keys)
// under the visitor's own gate (no CI hook), so a software renderer is refused exactly as it would be on the site.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const artifakt = args.includes('--artifakt')
const ki = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(root, 'tmp/vilag-attekintes.html'))

const eredmeny = await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: { write: false, minify: true, lib: { entry: path.join(root, 'src/vilag/index.ts'), formats: ['iife'], name: 'vilag' } },
})
const kimenet = Array.isArray(eredmeny) ? eredmeny[0] : eredmeny
const js = kimenet.output.find((o) => o.type === 'chunk').code

// The site's own colour tokens and the two typefaces, with the font files inlined (the Artifact host allows no other source).
const adat = (fajl) => `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'public/fonts', fajl)).toString('base64')}`
const olvas = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const szabalyok = (rel, csalad) => [...olvas(rel).matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]).filter((r) => r.includes(`font-family: "${csalad}"`))
const betu = [...szabalyok('src/site/fonts.css', 'Archivo'), ...szabalyok('src/site/fonts.css', 'Archivo Fallback'), ...szabalyok('src/site/keret.css', 'Martian Mono')]
  .join('\n')
  .replace(/url\("\/fonts\/([\w.-]+\.woff2)"\)/g, (_, fajl) => `url("${adat(fajl)}")`)
const tokenek = olvas('src/site/fooldal/jel-tokens.css')

const lap = `
.host { max-width: 40rem; margin: 0 auto; padding-block: 3rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.host h1 { font-size: clamp(1.5rem, 4vw, 2.1rem); line-height: 1.15; margin: 0 0 1rem; text-wrap: balance; }
.host p, .host li { line-height: 1.55; max-width: 65ch; }
.host ol { padding-left: 1.25rem; }
.host button { font: inherit; font-weight: 600; padding: 0.7rem 1.1rem; border: 2px solid var(--kezel); background: var(--kezel); color: var(--papir); cursor: pointer; }
.host button:focus-visible { outline: 3px solid var(--kezel); outline-offset: 3px; }
.host [role="status"] { min-height: 1.5em; color: var(--tinta-halk); }
body { background: var(--papir); color: var(--tinta); font-family: var(--font-sans); }
:root { --font-sans: "Archivo", "Archivo Fallback", ui-sans-serif, system-ui, sans-serif; }
`

const torzs = `
<main id="top" class="host">
  <h1>A világ 0–2. fejezete, átnézhető építés (V3)</h1>
  <p>Ez nem az éles oldal. A világot nyitja meg a te videókártyádon, mielőtt bármelyik oldal hivatkozna rá. A térbeli nézet a gombbal nyílik; fent egy sor mutatja a videókártyát, a fordítási időt és a képkockaidőket. Új ebben a körben: a betöltő jelenet (a mérés görbéje, amit egy toll rajzol meg), a fejezetek címe a jelenetben, a vetítőfal kerettel, méretvonalakkal és tükörképpel, a mérés függönye, a feliratok a térben (méretarányosan, ütközés nélkül), és az egérszonda.</p>
  <ol>
    <li>Nyisd meg a térbeli nézetet. A betöltőn a toll a valódi mérésen fut végig; a számláló a valódi lépéseket számolja. (Ha gyors a gép, alig látod: a „Betöltő” sor gombjaival 15, 50 és 100 %-nál megállíthatod, az „A világ” gombbal visszatérsz.)</li>
    <li>Húzd a mélységcsúszkát az elejétől a végéig, lassan. Mérés (Mérőműszer): a rács, a függöny, a csúcs és a mélypont gyűrűi, az órák. Repülés (Áramlás). Képernyő (Színpad): a kép, a keret, a két méretvonal, a tükörkép, a padlóra vetülő fény.</li>
    <li>Az első fejezetben tartsd az egeret a mérési vonal fölött: a szonda a legközelebbi percet nevezi meg, valódi idővel és értékkel.</li>
    <li>Mondd meg, melyik réteg az, ami „kidolgozottnak” hat, és melyik az, ami még üres vagy zavaró (a „Réteg” és „Hatás” gombokkal egyenként ki lehet kapcsolni).</li>
    <li>Nyomd meg a „Mérés” gombot (12 sor, pár másodperc; a végén a kapcsolók visszaállnak), és küldj egy képernyőképet a fejlécsorról és a mérés soraiból, plusz egyet a Mérés fejezetről és egyet a Képernyő fejezetről. Írd meg, hol nyitottad meg (a Claude alkalmazásban vagy egy Edge/Chrome lapon; a Claude alkalmazás kb. 31 ms-ra korlátozza a képkockákat, ezért a mérést érdemes normál lapon is megnézni).</li>
  </ol>
  <p><button id="nyit" type="button">Térbeli nézet megnyitása</button></p>
  <p id="allapot" role="status"></p>
</main>
`

const szkript = `
(function () {
  var gomb = document.getElementById('nyit')
  var allapot = document.getElementById('allapot')
  var v = null
  // The viewer's explicit theme choice drives the site's own token switch (data-tema); with no choice the tokens follow the system.
  var tema = function () { var t = document.documentElement.getAttribute('data-theme'); if (t) document.documentElement.setAttribute('data-tema', t === 'dark' ? 'sotet' : 'vilagos'); else document.documentElement.removeAttribute('data-tema') }
  tema(); new MutationObserver(tema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  function vilag() {
    if (!v) v = window.vilag.keszit({ diagnosztika: true, lap: document.getElementById('top'), nyito: gomb, bezarva: function (ok) { allapot.textContent = 'A térbeli nézet bezárult (' + ok + ').' } })
    return v
  }
  // Intent starts stage two (the private plan kaland-v2 5.1 point 3): the first frame is ready when the click lands.
  var elore = function () { vilag().elokeszit().catch(function () {}) }
  gomb.addEventListener('pointerenter', elore)
  gomb.addEventListener('focus', elore)
  gomb.addEventListener('click', function () {
    allapot.textContent = ''
    vilag().megnyit().catch(function (e) { allapot.textContent = 'A térbeli nézet most nem indult el: ' + (e && e.message ? e.message : e) })
  })
})()
`

const cim = 'A világ motorja'
const torzsOk = torzs.trim()
const html = artifakt
  ? `<title>${cim}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${tokenek}\n${betu}\n${lap}</style>\n${torzsOk}\n<script>${js.replaceAll('</script', '<\\/script')}</script>\n<script>${szkript}</script>\n`
  : `<!doctype html>\n<html lang="hu">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${cim}</title>\n<style>${tokenek}\n${betu}\n${lap}</style>\n</head>\n<body>\n${torzsOk}\n<script>${js.replaceAll('</script', '<\\/script')}</script>\n<script>${szkript}</script>\n</body>\n</html>\n`
if (/(?:src|href)="\/(?!\/)/.test(html)) throw new Error('an external reference is left in the single file')
fs.mkdirSync(path.dirname(ki), { recursive: true })
fs.writeFileSync(ki, html)
console.log('written', ki, (fs.statSync(ki).size / 1024).toFixed(0), 'KB', artifakt ? '(artifact flavour)' : '')
