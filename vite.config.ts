import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as viteBuild, createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VAT_LABEL, formatHuf, isPriceKey } from './src/data/pricing.ts'
import { insertAt } from './src/site/html-beszuras.ts'
import { LAPCSERE_BEKAPCSOLAS, withLapcsereBekapcsolas } from './src/site/lapcsere-fej.ts'
import { jelFejResz, temaErtekek } from './src/site/jel-fej.ts'
import { DEMO_SAV, demoKerettel } from './src/site/visszasav.ts'
import { atiranyitasHibak, atiranyitasOldal, atiranyitasVisszaesesiSzkript } from './src/site/atiranyitas.ts'
import { ATIRANYITASOK } from './src/content/atiranyitasok.ts'
import { OLDALAK, STATIKUS_OLDALAK } from './src/content/oldalak.ts'
import { elesBuild, helyorzok, kapuUzenet } from './scripts/lib/helyorzo-kapu.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const SITE = 'https://ottbenjamin.hu'
// Éles build: a Deploy workflow állítja (ELES_BUILD=1). A helyőrző-kapu leállítja a buildet, ha egy oldalon „[KÉRDÉS: …]” maradt.
const ELES = elesBuild()

/** The paper and chrome colours of both themes, read from the token file (the only place the palette is declared). */
const temaErtekekFajlbol = (gyoker: string) => temaErtekek(fs.readFileSync(path.join(gyoker, 'src/site/fooldal/jel-tokens.css'), 'utf8'))

// Static pages read their prices from src/data/pricing.ts: {{huf:orderForm}} and {{vat}}.
function pricePlaceholders(): Plugin {
  return {
    name: 'price-placeholders',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const out = html.replace(/\{\{(huf:(\w+)|vat)\}\}/g, (placeholder, _kind: string, key?: string) => {
          if (placeholder === '{{vat}}') return VAT_LABEL.hu
          if (!key || !isPriceKey(key)) throw new Error(`${context.path}: unknown price ${placeholder}`)
          return formatHuf(key, 'hu', '&nbsp;')
        })
        const leftover = out.match(/\{\{[^}]*\}\}/)
        if (leftover) throw new Error(`${context.path}: unresolved placeholder ${leftover[0]}`)
        return out
      },
    },
  }
}

// The demos are self-contained files under public/demos/, which Vite copies as they are (transformIndexHtml never sees
// them). Their built copies get the same opt-in after the build, and the shared head and the return strip (src/site/visszasav.ts); the files under
// public/ stay untouched.
const LAPCSERE_DEMOK = Object.keys(DEMO_SAV)

/** The page-turn opt-in, inline in the head of every built HTML page (source: src/site/lapcsere-fej.ts). */
function lapcsere(): Plugin {
  let outDir = ''
  let buildFailed = false
  return {
    name: 'lapcsere-bekapcsolas',
    transformIndexHtml: { order: 'post', handler: (html) => withLapcsereBekapcsolas(html) },
    buildEnd(error) {
      buildFailed = !!error
    },
    configResolved(config) {
      // Only a real build: the dev server also calls closeBundle when it stops.
      outDir = config.command === 'build' ? path.resolve(config.root, config.build.outDir) : ''
    },
    // closeBundle runs after the bundle is written, and public/ is copied into outDir by then. This is for one-shot builds
    // (`vite build`), not `build --watch`. Vite also calls closeBundle after a failed build: then do nothing, so that a
    // "missing file" error here cannot hide the real one.
    closeBundle: {
      order: 'post',
      handler() {
        if (!outDir || buildFailed) return
        for (const name of LAPCSERE_DEMOK) {
          const file = path.join(outDir, 'demos', name, 'index.html')
          if (!fs.existsSync(file)) throw new Error(`lapcsere: ${file} is missing (copied from public/demos/${name}/index.html)`)
          const html = fs.readFileSync(file, 'utf8')
          const kesz = demoKerettel(html.includes(LAPCSERE_BEKAPCSOLAS) ? html : withLapcsereBekapcsolas(html), name, temaErtekekFajlbol(root))
          if (kesz !== html) fs.writeFileSync(file, kesz)
        }
      },
    },
  }
}

/** A public/demos alatti bemutatók, amelyek ebben a buildben megvannak. */
function bemutatok(): string[] {
  const dir = path.join(root, 'public/demos')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((name) => fs.existsSync(path.join(dir, name, 'index.html')))
}

interface RenderModul {
  renderOldal(id: string, epites: { eles: boolean; demok: string[]; ev: number }): { fej: string; test: string }
  renderKeret(jel: string): string
}

// Az oldalak HTML-je build közben készül React-komponensekből (src/site/render.tsx); a böngészőbe
// csak a src/site/main.ts kerül. Fejlesztéskor a dev szerver tölti be a renderelőt, buildkor egy
// rövid életű, beágyazott Vite-szerver.
function oldalak(): Plugin {
  // A szerver ígéretét tároljuk, nem a szervert: a HTML-bemenetek párhuzamosan renderelődnek, és
  // `??= await createServer()` esetén mind külön szervert indított (2026-11-04: 4 db). Ezek
  // dependencia-optimalizálói ugyanabba a node_modules/.vite/deps mappába neveztek át (Windows:
  // EPERM), és csak az utolsó záródott be.
  let beagyazott: Promise<ViteDevServer> | null = null
  const renderelo = async (server?: ViteDevServer): Promise<RenderModul> => {
    if (server) return (await server.ssrLoadModule('/src/site/render.tsx')) as RenderModul
    beagyazott ??= createServer({
      configFile: false,
      root,
      logLevel: 'warn',
      appType: 'custom',
      plugins: [react()],
      resolve: { alias: { '@': path.resolve(root, 'src') } },
      // watch: null – különben a beágyazott szerver fájlfigyelői nyitva tartják a build folyamatát.
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    return (await (await beagyazott).ssrLoadModule('/src/site/render.tsx')) as RenderModul
  }
  return {
    name: 'oldalak',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        // <!--jel-fej--> in the head: the shared head (theme-color metas and the theme snippet, src/site/jel-fej.ts). <!--keret:...--> in the body:
        // the shared header and footer of the hand-written pages (legal pages, 404). <!--oldal:id--> : a whole page rendered from its React component.
        let ki = html.includes('<!--jel-fej-->') ? insertAt(html, '<!--jel-fej-->', jelFejResz(temaErtekekFajlbol(root), true)) : html
        // <!--atiranyitasok--> in the head of 404.html: the fallback script for old spellings, generated from src/content/atiranyitasok.ts.
        if (ki.includes('<!--atiranyitasok-->')) ki = insertAt(ki, '<!--atiranyitasok-->', atiranyitasVisszaesesiSzkript(ATIRANYITASOK))
        const keretek = [...ki.matchAll(/<!--keret:([a-z:]+)-->/g)]
        const jel = ki.match(/<!--oldal:(\w+)-->/)
        if (!jel && keretek.length === 0) return ki
        const modul = await renderelo(ctx.server)
        for (const [jelolo, mit] of keretek) ki = insertAt(ki, jelolo, modul.renderKeret(mit))
        if (!jel) return ki
        const { fej, test } = modul.renderOldal(jel[1], { eles: ELES, demok: bemutatok(), ev: new Date().getFullYear() })
        return insertAt(insertAt(ki, '<!--oldal-fej-->', fej), jel[0], test)
      },
    },
    async closeBundle() {
      const szerver = beagyazott
      beagyazott = null
      // Ha az indítás hibázott, azt a renderelés már jelentette; itt csak a zárás a dolgunk.
      await (await szerver?.catch(() => null))?.close()
    },
  }
}

/** Stamps the home page's own module script (the entry the build or the dev server put in the head) with data-jel-modul: the head snippet of index.html reacts to a failure of that script only. */
function jelModul(): Plugin {
  return {
    name: 'jel-modul',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!html.includes("classList.add('jel-var')")) return html
        let stamped = false
        const ki = html.replace(/<script type="module"([^>]*) src="(?!\/@vite\/)([^"]+)"([^>]*)>/, (_m, a: string, src: string, b: string) => {
          stamped = true
          return `<script type="module"${a} src="${src}"${b} data-jel-modul>`
        })
        if (!stamped) throw new Error('jelModul: the home page has no module script to stamp')
        return ki
      },
    },
  }
}

/**
 * The adventure world (src/vilag/, the private plan kaland-v2) is built here as ONE self-contained ES module of its own, `vilag/vilag-<hash>.js` in the output, from a build of its own that no page entry shares
 * anything with: no shared chunk, no new head tag, no script on any page, and nothing counted in the pages' `allJs` (the files are outside `assets/`; scripts/check-budgets.mjs measures them against
 * their own budget). The home page's entry script (src/site/vilag-belepo.ts, V7a) links it by URL in JS (`virtual:vilag-url`), still with no tag and no shared chunk.
 * The module has no top-level side effect: fetching it into the HTTP cache creates nothing, and `keszit()` / `elokeszit()` are the two stages that start it.
 */
let vilagFajl: string | null = null
function vilag(): Plugin {
  let kimenet: { fileName: string; code: string } | null = null
  return {
    name: 'vilag-csomag',
    apply: 'build',
    async buildStart() {
      const eredmeny = await viteBuild({
        configFile: false,
        root,
        logLevel: 'warn',
        resolve: { alias: { '@': path.resolve(root, 'src') } },
        define: { __EPITES_EV__: String(new Date().getFullYear()) },
        build: {
          write: false,
          minify: true,
          lib: { entry: path.resolve(root, 'src/vilag/index.ts'), formats: ['es'], fileName: () => 'vilag/vilag-[hash].js' },
          rollupOptions: { output: { entryFileNames: 'vilag/vilag-[hash].js', codeSplitting: false } },
        },
      })
      const kimenetek = (Array.isArray(eredmeny) ? eredmeny : [eredmeny]).flatMap((r) => ('output' in r ? r.output : []))
      const fajlok = kimenetek.filter((o) => o.type === 'chunk')
      if (kimenetek.length !== 1 || fajlok.length !== 1) throw new Error(`vilag: expected exactly one file, got ${kimenetek.map((o) => o.fileName).join(', ')}`)
      kimenet = { fileName: fajlok[0].fileName, code: fajlok[0].code }
      vilagFajl = kimenet.fileName
    },
    generateBundle() {
      if (!kimenet) throw new Error('vilag: the world was not built')
      this.emitFile({ type: 'asset', fileName: kimenet.fileName, source: kimenet.code })
    },
  }
}

function vilagUrl(): Plugin {
  let command: 'build' | 'serve' = 'serve'
  return {
    name: 'vilag-url',
    configResolved(config) {
      command = config.command
    },
    resolveId(id) {
      if (id === 'virtual:vilag-url') return '\0virtual:vilag-url'
    },
    load(id) {
      if (id !== '\0virtual:vilag-url') return
      if (command === 'serve') return 'export default "/src/vilag/index.ts"'
      if (!vilagFajl) throw new Error('vilagUrl: virtual:vilag-url was loaded before vilag() built the world file')
      return `export default ${JSON.stringify('/' + vilagFajl)}`
    },
  }
}

function sitemap(): string {
  const sorok: string[] = []
  for (const oldal of OLDALAK) {
    sorok.push(`  <url>\n    <loc>${SITE}${oldal.utvonal}</loc>\n  </url>`)
  }
  for (const oldal of STATIKUS_OLDALAK) {
    if ('sitemap' in oldal && oldal.sitemap === false) continue
    const alt =
      'hreflang' in oldal
        ? Object.entries(oldal.hreflang)
            .map(([lang, href]) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${href}" />`)
            .join('')
        : ''
    sorok.push(`  <url>\n    <loc>${SITE}${oldal.utvonal}</loc>${alt}\n  </url>`)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sorok.join('\n')}\n</urlset>\n`
}

function walkHtml(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkHtml(full)
    return entry.name.endsWith('.html') ? [full] : []
  })
}

// A kimenet utómunkája: sitemap az épülő oldalakból, az átirányító oldalak és az éles helyőrző-kapu. (A /cv/ mappa 2026-11-05 óta nincs a repóban;
// a régi címe átirányító oldal a /munkaim/#evek felé, src/content/atiranyitasok.ts.) Az átirányító oldalak csak buildkor készülnek: a dev szervernek nincs.
function kimenet(): Plugin {
  return {
    name: 'kimenet',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() })
        // One static redirect stub per entry of src/content/atiranyitasok.ts.
        const hibak = atiranyitasHibak(ATIRANYITASOK)
        // Compared the way the 404 fallback compares: NFC and case-insensitive.
        const egyseges = (s: string) => s.normalize('NFC').toLowerCase().replaceAll('\\', '/')
        const foglalt = new Set(Object.keys(bundle).map(egyseges))
        const publikus = fs.existsSync(path.join(root, 'public')) ? fs.readdirSync(path.join(root, 'public'), { recursive: true, encoding: 'utf8' }).map(egyseges) : []
        for (const a of ATIRANYITASOK) {
          const fajl = egyseges(`${a.from.slice(1)}index.html`)
          // A stub must not replace a real page, an HTML entry or a file the public/ folder would copy to the same place.
          if (foglalt.has(fajl) || publikus.includes(fajl) || publikus.includes(egyseges(a.from.slice(1, -1)))) hibak.push(`from ${a.from} collides with a page, an HTML entry or a file under public/`)
        }
        if (hibak.length) this.error(`src/content/atiranyitasok.ts:\n- ${hibak.join('\n- ')}`)
        const ertekek = temaErtekekFajlbol(root)
        for (const a of ATIRANYITASOK) this.emitFile({ type: 'asset', fileName: `${a.from.slice(1)}index.html`, source: atiranyitasOldal(a, ertekek) })
        if (!ELES) return
        const fajlok = Object.values(bundle)
          .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.html'))
          .map((chunk) => ({ utvonal: chunk.fileName, szoveg: String(chunk.type === 'asset' ? chunk.source : '') }))
        for (const file of walkHtml(path.join(root, 'public'))) {
          fajlok.push({ utvonal: path.relative(path.join(root, 'public'), file), szoveg: fs.readFileSync(file, 'utf8') })
        }
        const talalat = helyorzok(fajlok)
        if (talalat.length) this.error(kapuUzenet(talalat))
      },
    },
  }
}

function decodePathname(urlPath: string): string {
  const pathname = urlPath.split('?')[0] ?? '/'
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function fileInside(distRoot: string, candidate: string): string | null {
  const resolved = path.resolve(candidate)
  const rootWithSep = distRoot.endsWith(path.sep) ? distRoot : distRoot + path.sep
  if (resolved !== distRoot && !resolved.startsWith(rootWithSep)) return null
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null
  return resolved
}

function githubPagesPreview(): Plugin {
  return {
    name: 'github-pages-preview',
    configurePreviewServer(server) {
      const distRoot = path.resolve(root, 'dist')
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            next()
            return
          }

          const rewritten = decodePathname(req.url ?? '/')
          if (rewritten === '/' || rewritten === '') {
            next()
            return
          }
          const rewrittenFile = fileInside(distRoot, path.join(distRoot, rewritten.replace(/^\/+/, '')))
          if (rewrittenFile) {
            next()
            return
          }

          const incoming = req as typeof req & { originalUrl?: string }
          const original = decodePathname(incoming.originalUrl ?? req.url ?? '/')
          const relative = original.replace(/^\/+/, '').replace(/\/+$/, '')
          if (relative && !relative.split('/').includes('..')) {
            const indexFile = fileInside(distRoot, path.join(distRoot, relative, 'index.html'))
            if (indexFile) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(indexFile))
              return
            }
          }

          const notFound = path.join(distRoot, '404.html')
          if (!fs.existsSync(notFound)) {
            next()
            return
          }

          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(notFound))
        })
      }
    },
  }
}

const bemenetek: Record<string, string> = {}
for (const oldal of OLDALAK) {
  bemenetek[oldal.id] = path.resolve(root, oldal.sablon)
}
bemenetek.adatkezeles = path.resolve(root, 'adatkezeles/index.html')
bemenetek.impresszum = path.resolve(root, 'impresszum/index.html')
bemenetek.imprint = path.resolve(root, 'en/imprint/index.html')
bemenetek.aszf = path.resolve(root, 'aszf/index.html')
// The 404 page is a page of the new system too: built from the root template, written to dist/404.html (every asset by absolute URL).
bemenetek['404'] = path.resolve(root, '404.html')

export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [react(), oldalak(), jelModul(), lapcsere(), pricePlaceholders(), kimenet(), vilag(), vilagUrl(), githubPagesPreview()],
  worker: { plugins: () => [vilagUrl()] },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  build: {
    // Several page entries (home, /megrendeles/, /munkaim/, legal pages, 404) would share the preload polyfill as a chunk of its own, which every page then
    // loads as a second script; every browser that runs the pages' modules preloads without it.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: bemenetek,
    },
  },
})
