// Frame and check run for the M0 prototype: node proto/kaland-m0/proba.mjs
// Env: BASE (default http://localhost:5173), OUT (default proto-frames/), CHROMIUM (path of a Chromium binary) or CHANNEL (e.g. msedge on the PC),
//      GL=hw (a real GPU: the gate runs as on the live site) or GL=sw (default: software GL admitted through the test hook, frames are NOT real-GPU frames).
// Every frame's log line records the renderer string. Software frames are void for judging the look and the speed (plan 6.1).
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = path.resolve(process.env.OUT || 'proto-frames')
const HW = process.env.GL === 'hw'
fs.mkdirSync(OUT, { recursive: true })
const opts = { headless: !process.env.HEADED, args: HW ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }
if (process.env.CHROMIUM) opts.executablePath = process.env.CHROMIUM
if (process.env.CHANNEL) opts.channel = process.env.CHANNEL
const browser = await chromium.launch(opts)
const log = []
const hiba = []

async function nyit(nev, { w = 1280, h = 900, rm = false, szin = 'dark', dpr = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: rm ? 'reduce' : 'no-preference', colorScheme: szin })
  const p = await ctx.newPage()
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) hiba.push(`${nev}: ${m.type()}: ${m.text()}`) })
  p.on('pageerror', (e) => hiba.push(`${nev}: pageerror: ${e.message}`))
  if (!HW) await p.addInitScript(() => { window.__kalandProba = true })
  await p.goto(`${BASE}/proto/kaland-m0/`, { waitUntil: 'load' })
  return { ctx, p }
}
const kep = async (p, nev) => {
  await p.screenshot({ path: path.join(OUT, `${nev}.png`) })
  const n = await p.evaluate(() => ({ renderer: window.__kaland.renderer, szint: window.__kaland.szint, kapu: window.__kaland.kapu, median: window.__kaland.median, fordit: window.__kaland.fordit, kepkockak: window.__kaland.kepkockak }))
  log.push({ frame: nev, ...n })
}
const gorget = async (p, sel) => { await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'start' }), sel); await p.waitForTimeout(500) }
const kesz = (p) => p.waitForFunction(() => window.__kaland?.allomasok?.some((a) => a.kesz), null, { timeout: 20000 })
const doboz = (p, sel) => p.locator(sel).boundingBox()

// 1. desktop dark: the arrival (frames 100 ms apart), the fall, the probe, the pairs, the years
{
  const { ctx, p } = await nyit('desktop-dark')
  await p.evaluate(() => document.querySelector('#kep-allomas').scrollIntoView({ block: 'center' }))
  await kesz(p)
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(100); await kep(p, `01-erkezes-${i}`) }
  await p.waitForTimeout(2200); await kep(p, '02-kep-teljes')
  await p.click('#kep-kulcsok [role=radio]:nth-child(1)'); await p.waitForTimeout(900); await kep(p, '03-kep-12')
  await p.click('#kep-kulcsok [role=radio]:nth-child(2)'); await p.waitForTimeout(900); await kep(p, '04-kep-36')
  await gorget(p, '#mintater'); await p.waitForTimeout(900); await kep(p, '05-zuhatag-gepadat')
  let d = await doboz(p, '#mezo-doboz')
  await p.mouse.move(d.x + d.width * 0.55, d.y + d.height * 0.32); await p.waitForTimeout(500); await kep(p, '06-szonda-gepadat')
  log.push({ olvasat: await p.textContent('#olvasat'), talalt: await p.locator('[data-par=gepadat] .talalt[data-van]').count(), jutalomElemek: await p.locator('#jutalom > *').count() })
  await p.waitForTimeout(3200); await kep(p, '07-gepadat-fut')
  for (const par of ['gepkonyv', 'honlap']) {
    await p.click(`[data-par=${par}]`); await p.waitForTimeout(700)
    d = await doboz(p, '#mezo-doboz')
    await p.mouse.move(d.x + d.width * 0.5, d.y + d.height * 0.3); await p.waitForTimeout(500)
    await kep(p, `08-zuhatag-${par}`)
    log.push({ par, olvasat: await p.textContent('#olvasat'), jutalomElemek: await p.locator('#jutalom > *').count() })
  }
  await p.click('[data-par=gepkonyv]'); await p.waitForTimeout(400)
  await p.locator('#mezo-doboz').focus(); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500)
  log.push({ billentyu: await p.textContent('#olvasat') }); await kep(p, '09-billentyuzet-gepkonyv')
  await p.click('[data-par=gepadat]'); await p.waitForTimeout(400)
  await p.click('#mezo-lepesek [role=radio]:nth-child(1)'); await p.waitForTimeout(600); await kep(p, '10-gepadat-5C')
  await gorget(p, '#evek'); await p.waitForTimeout(600)
  const e = await doboz(p, '#evek-doboz')
  await p.mouse.move(e.x + 60, e.y + 140); await p.waitForTimeout(400); await kep(p, '11-evek')
  log.push({ evekOlvasat: await p.textContent('#evek-olvasat') })
  log.push({ kiterjedes: await p.evaluate(() => { const a = window.__kaland.allomasok.find((x) => x.tipus === 'mezo'); return a?.kesz ? window.__kaland.kiterjedes() : 'mezo context not alive (released: farthest)' }) })
  log.push({ megjegyzesek: await p.evaluate(() => window.__kaland.megjegyzesek), elo: await p.evaluate(() => window.__kaland.allomasok.filter((a) => a.kesz).length) })
  await ctx.close()
}
// 2. light theme
{
  const { ctx, p } = await nyit('desktop-light', { szin: 'light' })
  await kesz(p); await gorget(p, '#mintater'); await p.waitForTimeout(900)
  const d = await doboz(p, '#mezo-doboz'); await p.mouse.move(d.x + d.width * 0.5, d.y + d.height * 0.3); await p.waitForTimeout(500)
  await kep(p, '12-vilagos-zuhatag'); await ctx.close()
}
// 3. reduced motion: complete first frame, no run, still fall, nothing changes while idle
{
  const { ctx, p } = await nyit('rm', { rm: true })
  await kesz(p); await p.waitForTimeout(600); await kep(p, '13-rm-kep')
  await gorget(p, '#mintater'); await p.waitForTimeout(900); await kep(p, '14-rm-zuhatag')
  log.push({ rmFutGomb: await p.textContent('#fut'), rmFutTiltva: await p.locator('#fut').isDisabled() })
  const a = await p.screenshot(); await p.waitForTimeout(2500); const b = await p.screenshot()
  log.push({ rmIdle2s: Buffer.compare(a, b) === 0 ? 'no pixel changed' : 'PIXELS CHANGED' })
  await ctx.close()
}
// 4. phone
{
  const { ctx, p } = await nyit('phone', { w: 360, h: 780, dpr: 2 })
  await kesz(p); await p.waitForTimeout(2800); await kep(p, '15-telefon-kep')
  await gorget(p, '#mintater'); await p.waitForTimeout(900); await kep(p, '16-telefon-zuhatag')
  log.push({ telefonVizszintesGorgetes: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) })
  await ctx.close()
}
// 5. the gate failing (software renderer, no test hook): the page works without the stations
if (!HW) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => hiba.push(`gate-ki: pageerror: ${e.message}`))
  await p.goto(`${BASE}/proto/kaland-m0/`, { waitUntil: 'load' }); await p.waitForTimeout(800)
  await p.screenshot({ path: path.join(OUT, '17-kapu-ki.png'), fullPage: true })
  log.push({ kapuKi: await p.textContent('#allapot'), mtKiOsztaly: await p.evaluate(() => document.documentElement.classList.contains('mt-ki')), kepLathato: await p.locator('#kep-img').isVisible() })
  await ctx.close()
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'naplo.json'), JSON.stringify({ log, hiba }, null, 2))
console.log(JSON.stringify({ log, hiba }, null, 1))
