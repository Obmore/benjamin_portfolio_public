// Makes the two phone captures of the home page's first screen, so the pictures can be made again. Not part of any check or build.
//   node scripts/telefonkep.mjs lapszabaszat -> public/work/demo-lapszabaszat-kijelzo.webp (the lapszabászat demo's first screen, 1165 x 960, for the RENDELÉS screen)
//   node scripts/telefonkep.mjs lelek       -> public/work/lelek-es-nyelv-telefon.webp (the top of the live Lélek & Nyelv page, as a phone shows it)
//   node scripts/telefonkep.mjs kezikonyv   -> public/work/demo-kezikonyv-telefon.webp (the first screen of the QR-kódos gépkönyv demo, from public/demos/kezikonyv/: the files the build copies, without the
//                                              return strip it adds, which would read oddly inside the home page's screen)
// Viewport 390 x 464 CSS px at device pixel ratio 2 (780 x 928 px), light scheme, reduced motion, fonts loaded, network idle; one page load, no click, no scroll, no login; then the context is
// closed. The live page is asked with Global Privacy Control on (the header and the navigator property), like every probe of a live site here. A consent banner stops the script: nothing is
// accepted or dismissed. The visible text and images of the picture are listed on the console (and nowhere else), for the pull request's list.
// Local runs use Microsoft Edge (`channel: 'msedge'`), because Playwright's own Chromium is blocked here by Smart App Control; on a CI image drop the channel.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const which = process.argv[2]
const TARGETS = {
  lelek: { url: 'https://lelekesnyelv.hu/', out: 'public/work/lelek-es-nyelv-telefon.webp', gpc: true },
  kezikonyv: { url: '/demos/kezikonyv/', out: 'public/work/demo-kezikonyv-telefon.webp', gpc: false },
  // the RENDELÉS pair's screen: the lapszabászat demo's first screen at a desktop size whose aspect (1165 x 960) is taller than the screen's body at 380 to 431 px wide,
  // so the picture is fitted by its width and cut only at the bottom (DPR 1, 1165 px wide)
  lapszabaszat: { url: '/demos/lapszabaszat/', out: 'public/work/demo-lapszabaszat-kijelzo.webp', gpc: false, w: 1165, h: 960, dpr: 1, mobile: false },
}
const target = TARGETS[which]
if (!target) {
  console.error('usage: node scripts/telefonkep.mjs lelek|kezikonyv|lapszabaszat')
  process.exit(2)
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain' }
function servePublic() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const f = path.join(root, 'public', p)
    if (!f.startsWith(path.join(root, 'public')) || !fs.existsSync(f)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(fs.readFileSync(f))
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const server = which !== 'lelek' ? await servePublic() : null
const url = server ? `http://127.0.0.1:${server.address().port}${target.url}` : target.url
const browser = await chromium.launch({ channel: 'msedge' })
try {
  const context = await browser.newContext({
    viewport: { width: target.w ?? 390, height: target.h ?? 464 },
    deviceScaleFactor: target.dpr ?? 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    isMobile: target.mobile ?? true,
    hasTouch: target.mobile ?? true,
    ...(target.gpc ? { extraHTTPHeaders: { 'Sec-GPC': '1' } } : {}),
  })
  if (target.gpc) await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true }))
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // the lapszabászat demo is shown with its own sample filled in (the demo's "Kitöltési példa" button), like the picture it replaces
  if (which === 'lapszabaszat') {
    await page.getByRole('button', { name: 'Kitöltési példa' }).first().click()
    await page.waitForTimeout(300)
  }
  const banner = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top < window.innerHeight && r.bottom > 0 }).length)
  if (banner) throw new Error('a consent banner or dialog is on the page: nothing is accepted or dismissed here; tell the coordinator')
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: target.w ?? 390, height: target.h ?? 464 } })
  // what is visible in the picture, for the list in the pull request (printed, not stored)
  const seen = await page.evaluate(() => {
    const out = { texts: [], images: [] }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.replace(/\s+/g, ' ').trim()
      if (!t || !n.parentElement) continue
      const cs = getComputedStyle(n.parentElement)
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
      const rg = document.createRange()
      rg.selectNodeContents(n)
      const r = rg.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0) out.texts.push(t)
    }
    for (const i of document.images) {
      const r = i.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0) out.images.push(`${i.alt || '(no alt)'} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return out
  })
  // PNG to WebP through the browser's own encoder (no extra dependency)
  const enc = await context.newPage()
  const webp = await enc.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    c.getContext('2d').drawImage(img, 0, 0)
    return c.toDataURL('image/webp', 0.88).split(',')[1]
  }, png.toString('base64'))
  await context.close()
  const out = path.join(root, target.out)
  fs.writeFileSync(out, Buffer.from(webp, 'base64'))
  console.log(`wrote ${target.out} (${fs.statSync(out).size} bytes) from ${which === 'lelek' ? target.url : `${target.url} of public/`}`)
  console.log('visible texts:', JSON.stringify(seen.texts))
  console.log('visible images:', JSON.stringify(seen.images))
} finally {
  await browser.close()
  server?.close()
}
