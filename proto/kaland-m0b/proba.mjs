// Frame run for the M0b world: node proto/kaland-m0b/proba.mjs
// Env: BASE (default http://localhost:5173), OUT (default proto-frames/m0b), CHROMIUM or CHANNEL, GL=hw (real GPU) or GL=sw (software GL admitted by the test hook;
// software frames are NOT real-GPU frames: void for judging the look and the speed).
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT || 'proto-frames/m0b')
const HW = process.env.GL === 'hw'
fs.mkdirSync(OUT, { recursive: true })
const opts = { headless: !process.env.HEADED, args: HW ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }
if (process.env.CHROMIUM) opts.executablePath = process.env.CHROMIUM
if (process.env.CHANNEL) opts.channel = process.env.CHANNEL
const browser = await chromium.launch(opts)
const log = [], hiba = []

async function nyit(nev, { w = 1280, h = 800, rm = false, dpr = 1, p = 0 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: rm ? 'reduce' : 'no-preference' })
  const pg = await ctx.newPage()
  pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) hiba.push(`${nev}: ${m.type()}: ${m.text()}`) })
  pg.on('pageerror', (e) => hiba.push(`${nev}: pageerror: ${e.message}`))
  if (!HW) await pg.addInitScript(() => { window.__kalandProba = true })
  await pg.goto(`${BASE}/proto/kaland-m0b/?p=${p}`, { waitUntil: 'load' })
  await pg.waitForFunction((n) => window.__vilag?.kepkockak >= n || (window.__vilag?.kapu !== 'ok' && window.__vilag?.kapu !== '-'), rm ? 1 : 3, { timeout: 90000 })
  return { ctx, pg }
}
const kep = async (pg, nev) => {
  await pg.waitForTimeout(400)
  await pg.screenshot({ path: path.join(OUT, `${nev}.png`) })
  log.push({ frame: nev, ...(await pg.evaluate(() => ({ renderer: window.__vilag.renderer, szint: window.__vilag.szint, kapu: window.__vilag.kapu, fordit: window.__vilag.fordit, median: window.__vilag.median, kepkockak: window.__vilag.kepkockak, p: window.__vilag.p, olvasat: document.querySelector('#olvasat').textContent, megj: window.__vilag.megjegyzesek }))) })
}
const lep = async (pg, p) => { await pg.evaluate((v) => window.__vilag.allit(v), p); await pg.waitForTimeout(900) }

{ // desktop: the flight and the picture
  const { ctx, pg } = await nyit('desktop')
  for (const [nev, p] of [['01-eleje', 0], ['02-repules', 0.2], ['03-kozep', 0.42], ['04-gyulekezes', 0.68], ['05-kep-kozel', 0.86], ['06-kep', 1]]) { await lep(pg, p); await kep(pg, nev) }
  await lep(pg, 0.3)
  await pg.mouse.move(640, 420); await pg.mouse.move(700, 400); await pg.waitForTimeout(400); await kep(pg, '07-mutato')
  await ctx.close()
}
{ // phone
  const { ctx, pg } = await nyit('telefon', { w: 390, h: 844, dpr: 2 })
  await lep(pg, 0.3); await kep(pg, '08-telefon-repules'); await lep(pg, 1); await kep(pg, '09-telefon-kep')
  const vsz = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  log.push({ telefonVizszintesGorgetes: vsz })
  await ctx.close()
}
{ // reduced motion: nothing moves by itself
  const { ctx, pg } = await nyit('rm', { rm: true, p: 0.3 })
  await pg.waitForTimeout(600)
  const a = await pg.screenshot(); await pg.waitForTimeout(2000); const b = await pg.screenshot()
  log.push({ rmIdle2s: Buffer.compare(a, b) === 0 ? 'no pixel changed' : 'PIXELS CHANGED' })
  await kep(pg, '10-rm'); await ctx.close()
}
{ // gate off: the DOM twin
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const pg = await ctx.newPage()
  await pg.goto(`${BASE}/proto/kaland-m0b/`, { waitUntil: 'load' }) // software GL without the test hook: the gate refuses
  await pg.waitForFunction(() => window.__vilag?.kapu && window.__vilag.kapu !== '-', null, { timeout: 30000 }).catch(() => {})
  await pg.screenshot({ path: path.join(OUT, '11-iker.png') })
  log.push({ kapuKi: await pg.evaluate(() => window.__vilag.kapu), ikerLathato: await pg.evaluate(() => document.querySelector('#iker').classList.contains('lathato')) })
  await ctx.close()
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'naplo.json'), JSON.stringify({ log, hiba }, null, 1))
console.log(JSON.stringify({ log, hiba }, null, 1))
