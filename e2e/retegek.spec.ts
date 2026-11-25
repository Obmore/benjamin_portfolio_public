import { expect, test, type Page } from '@playwright/test'
import { JEL } from '../src/content/fooldal'
import { RETEG } from '../src/content/retegek'
import { QR_SOR0, fmt, HOM_NYUGALOM } from '../src/site/fooldal/jelalak'

// "Rétegek" (R1): the stack of three sheets (Adat, Szabály, Felület) behind a screen: the first screen's flat cascade, the section directly under it, the header key,
// the found trace and the 404's stack. State is read from attributes (data-allapot, data-elol, data-retegek), values and strings, never from path geometry.
const OLV = `${fmt(HOM_NYUGALOM)} °C`

async function home(page: Page, width = 1280, height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/rt-kesz/)
  await page.waitForTimeout(300)
}
const opening = (page: Page) => page.locator('#nyitas')
const names = (page: Page, root: string) => page.locator(`${root} [role="group"]`).evaluateAll((els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.getAttribute('aria-label')))

test.describe('first screen: the key, the cascade, the trace', () => {
  test('closed: one sheet exposed, the other two inert and not rendered; the key is a switch, the strip a button', async ({ page }) => {
    await home(page)
    await expect(opening(page)).toHaveAttribute('data-allapot', 'zart')
    await expect(page.locator('html')).toHaveAttribute('data-retegek', 'zart')
    const state = await opening(page).evaluate((el) => {
      const all = [...el.querySelectorAll('.rt-lap')]
      const rendered = all.filter((s) => s.getClientRects().length > 0)
      return { rendered: rendered.length, inert: all.every((s) => (s as HTMLElement).inert), groups: [...el.querySelectorAll('[role="group"]')].filter((g) => g.getClientRects().length > 0).length }
    })
    expect(state).toEqual({ rendered: 0, inert: true, groups: 0 })
    const key = page.locator('[data-rt-kulcs]')
    await expect(key).toHaveAttribute('role', 'switch')
    await expect(key).toHaveAttribute('aria-checked', 'false')
    await expect(key).toContainText(RETEG.kulcs)
    await expect(opening(page).locator('.rt-sz')).toHaveAttribute('aria-expanded', 'false')
    await expect(opening(page).locator('.rt-sz')).toHaveAttribute('aria-label', new RegExp(`^${RETEG.kulcs}: `))
    // before any front change no square is filled and no count is anywhere (G1)
    await expect(page.locator('.rt-sz b[data-f]')).toHaveCount(0)
  })

  test('the key opens the cascade (the key, Enter and Space, the edge strip): three groups in order, only the actions move, 88 px', async ({ page }) => {
    await home(page)
    const boxes = () => page.evaluate(() => Object.fromEntries(['.h1', '.sub', '.keys', '.sp:not([hidden])', '.sav', '.ctl-row', '.acts', '.kij'].map((s) => { const b = document.querySelector(s)!.getBoundingClientRect(); return [s, [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10)] })))
    const before = await boxes()
    const key = page.locator('[data-rt-kulcs]')
    await key.focus()
    await key.press('Space')
    await expect(opening(page)).toHaveAttribute('data-allapot', 'nyitva', { timeout: 1200 })
    await expect(key).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-retegek', 'nyitva')
    expect(await names(page, '#nyitas')).toEqual([RETEG.nevek.adat, RETEG.nevek.szabaly, RETEG.nevek.felulet])
    await page.waitForTimeout(500)
    const after = await boxes()
    for (const s of ['.h1', '.sub', '.keys', '.sp:not([hidden])', '.sav', '.ctl-row']) expect(after[s], s).toEqual(before[s])
    expect(after['.acts']![1]! - before['.acts']![1]!).toBeCloseTo(88, 0)
    expect(after['.acts']![0]).toBe(before['.acts']![0])
    // close with Enter, then the strip opens and closes it
    await key.press('Enter')
    await expect(opening(page)).toHaveAttribute('data-allapot', 'zart')
    await page.locator('#nyitas .rt-sz').click()
    await expect(opening(page)).toHaveAttribute('data-allapot', 'nyitva')
    await expect(page.locator('#nyitas .rt-sz')).toHaveAttribute('aria-expanded', 'true')
    await expect(key).toHaveAttribute('aria-checked', 'true')
    await page.locator('#nyitas .rt-sz').click()
    await expect(key).toHaveAttribute('aria-checked', 'false')
  })

  test('front change: data-elol takes each value and the others stay rendered; a pair change keeps the state and resets the front', async ({ page }) => {
    await home(page)
    await page.locator('[data-rt-kulcs]').click()
    await expect(opening(page)).toHaveAttribute('data-elol', 'felulet')
    for (const k of ['szabaly', 'adat', 'felulet']) {
      await opening(page).locator(`[data-rt-nev="${k}"]:visible:not([disabled])`).first().click()
      await expect(opening(page)).toHaveAttribute('data-elol', k)
      const vis = await opening(page).evaluate((el) => [...el.querySelectorAll('.rt-lap, .kij')].filter((s) => getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility === 'visible').length)
      expect(vis).toBe(3)
    }
    await opening(page).locator('[data-rt-nev="adat"]:visible:not([disabled])').first().click()
    await page.locator('.key-gomb[data-p="rendeles"]').click()
    await expect(opening(page)).toHaveAttribute('data-par', 'rendeles')
    await expect(opening(page)).toHaveAttribute('data-allapot', 'nyitva')
    await expect(opening(page)).toHaveAttribute('data-elol', 'felulet')
  })

  test('S3: GÉPADAT: the reading in Adat\'s temperature row, Szabály\'s head, the head of the screen, the card, the band reading and the last sample are one string, at rest and while the clock runs', async ({ page }) => {
    await home(page)
    await page.locator('[data-rt-kulcs]').click()
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await page.waitForTimeout(1400)
    for (let i = 0; i < 4; i++) {
      const r = await page.evaluate(() => {
        const t = (s: string) => document.querySelector(s)!.textContent!.trim()
        const row = document.querySelector('.rt-lap[data-p="gepadat"][data-s="szabaly"] [data-mintak]') as HTMLElement
        return { adat: t('.rt-lap[data-p="gepadat"][data-s="adat"] [data-rt-olv]'), szabaly: t('.rt-lap[data-p="gepadat"][data-s="szabaly"] [data-rt-olv]'), fej: t('.kij-olv'), olv: t('.ctl-row .reading'), kartya: t('.kij [data-hom]'), utolso: row.querySelector('b')!.textContent!.trim() + ' °C' }
      })
      expect(new Set(Object.values(r)).size, JSON.stringify(r)).toBe(1)
      await page.waitForTimeout(450)
    }
  })

  test('the trace: a square fills when its sheet was brought forward by the visitor, it stays after a pair change and a reload, and the earned link appears with three', async ({ page }) => {
    await home(page)
    await page.locator('[data-rt-kulcs]').click()
    await expect(page.locator('#nyitas .rt-sz b[data-f]')).toHaveCount(0)
    await expect(page.locator('#nyitas .kij .rt-lab a')).toBeHidden()
    await opening(page).locator('[data-rt-nev="szabaly"]:visible:not([disabled])').first().click()
    await expect(page.locator('#nyitas .rt-sz b[data-f]')).toHaveCount(1)
    await page.locator('.key-gomb[data-p="gepkonyv"]').click()
    await expect(page.locator('#nyitas .rt-sz b[data-f]')).toHaveCount(1)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/rt-kesz/)
    await expect(page.locator('#nyitas .rt-sz b[data-f]')).toHaveCount(1)
    await page.locator('.key-gomb[data-p="gepkonyv"]').click()
    await expect(opening(page)).toHaveAttribute('data-par', 'gepkonyv')
    await page.waitForTimeout(1400)
    await page.locator('[data-rt-kulcs]').click()
    await opening(page).locator('[data-rt-nev="adat"]:visible:not([disabled])').first().click()
    await expect(page.locator('#nyitas .kij .rt-lab a')).toBeHidden()
    await opening(page).locator('[data-rt-nev="felulet"]:visible:not([disabled])').first().click()
    await expect(page.locator('#nyitas .rt-sz b[data-f]')).toHaveCount(3)
    const a = page.locator('#nyitas .kij .rt-lab a')
    await expect(a).toBeVisible()
    await expect(a).toHaveText(RETEG.erdeklodes)
    const href = (await a.getAttribute('href'))!
    expect(decodeURIComponent(href)).toContain(JEL.munkak.tetelek.find((t) => t.id === 'kezikonyv')!.cim)
    expect(href.startsWith('mailto:')).toBe(true)
  })

  test('no script: every stack closed and complete, no key and no strip', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('[data-rt-kulcs]')).toBeHidden()
    await expect(page.locator('.rt-sz')).toHaveCount(0)
    await expect(page.locator('#retegek')).toBeHidden()
    const shown = await page.evaluate(() => [...document.querySelectorAll('.rt-lap')].filter((s) => s.getClientRects().length > 0).length)
    expect(shown).toBe(0)
    await ctx.close()
  })
})

test.describe('the "Rétegek" section', () => {
  const section = (page: Page) => page.locator('#retegek')
  test('the label, the four keys (GÉPADAT first), the caption; it takes itself apart once when it is half in view', async ({ page }) => {
    await home(page)
    await expect(section(page)).toBeVisible()
    await expect(section(page).locator('.rt-cim')).toHaveText(RETEG.szakasz)
    const keys = section(page).locator('[data-rt-par]')
    await expect(keys).toHaveText(JEL.nyito.parok.map((p) => p.kulcs))
    await expect(section(page).locator('[data-rt-par="gepadat"]')).toHaveAttribute('aria-checked', 'true')
    await expect(section(page).locator('[data-rt-leir]')).toHaveText(JEL.nyito.parok.find((p) => p.id === 'gepadat')!.mondat)
    const rt = section(page).locator('.rt[data-par="gepadat"]')
    await expect(rt).toHaveAttribute('data-allapot', 'zart')
    await section(page).scrollIntoViewIfNeeded()
    await page.evaluate(() => document.querySelector('#retegek')!.scrollIntoView({ block: 'center' }))
    await expect(rt).toHaveAttribute('data-allapot', 'nyitva')
    await expect(rt).toHaveAttribute('data-elol', 'felulet')
    expect(await names(page, '#retegek .rt:not([hidden])')).toEqual([RETEG.nevek.adat, RETEG.nevek.szabaly, RETEG.nevek.felulet])
    // the keys swap the pair and keep the state; the caption follows
    await section(page).locator('[data-rt-par="honlap"]').click()
    await expect(section(page).locator('.rt[data-par="honlap"]')).toHaveAttribute('data-allapot', 'nyitva')
    await expect(section(page).locator('.rt[data-par="gepadat"]')).toBeHidden()
    await expect(section(page).locator('[data-rt-leir]')).toHaveText(JEL.nyito.parok.find((p) => p.id === 'honlap')!.mondat)
  })

  test('the lanes carry each pair\'s own signal; GÉPADAT\'s steps end on 51,6 and GÉPKÖNYV\'s 29 steps are the QR row', async ({ page }) => {
    await home(page)
    await page.locator('.key-gomb[data-p="gepadat"]').click()
    await page.waitForTimeout(1200)
    const lane = (par: string, lap: string) => page.locator(`#retegek .rt[data-par="${par}"] .rt-lap[data-s="${lap}"] .rt-ut`).getAttribute('d')
    const levels = async (par: string, lap: string) => {
      const d = (await lane(par, lap))!
      const pts = [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const)
      return pts
    }
    const all = new Set<string>()
    for (const par of ['honlap', 'rendeles', 'gepkonyv', 'gepadat']) for (const lap of ['adat', 'szabaly']) all.add(`${par}|${lap}|${await lane(par, lap)}`)
    // 8 lanes, and the only ones that may repeat are the straight ones (no series): RENDELÉS's Szabály is straight, HONLAP's Szabály is not
    expect(new Set([...all].map((s) => s.split('|')[2])).size).toBe(8)
    const straight = await levels('rendeles', 'szabaly')
    expect(new Set(straight.map((p) => p[1])).size).toBe(1)
    // GÉPKÖNYV Szabály: one slot per module; up = a 1 bit, down = a 0 bit
    const gk = await levels('gepkonyv', 'szabaly')
    const mid = gk[0]![1]
    const slots = gk.slice(1, -1)
    const bits = Array.from({ length: 29 }, (_, i) => (slots[2 * i]![1] < mid ? '1' : '0')).join('')
    expect(bits).toBe(QR_SOR0)
    // GÉPADAT Szabály: 60 slots; its last level is the highest-index sample, the reading is the head and the samples row (51,6)
    expect((await levels('gepadat', 'szabaly')).length).toBe(2 + 2 * 60)
    for (const s of ['adat', 'szabaly']) await expect(page.locator(`#retegek .rt[data-par="gepadat"] .rt-lap[data-s="${s}"] [data-rt-olv]`)).toHaveText(OLV)
    await expect(page.locator('#retegek .rt[data-par="gepadat"] .rt-fel [data-rt-olv]')).toHaveText(OLV)
    await expect(page.locator('#retegek .rt[data-par="gepadat"] .rt-kep [data-hom]')).toHaveText(OLV)
    await expect(page.locator('#retegek .rt[data-par="gepadat"] .rt-lap[data-s="szabaly"] [data-mintak] b')).toHaveText(fmt(HOM_NYUGALOM))
  })

  for (const width of [1280, 1440, 1920]) {
    test(`at ${width}: the projected stack stays inside the grid's right edge + 48, in every front, at yaw 12`, async ({ page }) => {
      await home(page, width, 900)
      await page.evaluate(() => document.querySelector('#retegek')!.scrollIntoView({ block: 'center' }))
      await expect(page.locator('#retegek .rt:not([hidden])')).toHaveAttribute('data-allapot', 'nyitva')
      const gridRight = (width > 1280 ? (width - 1280) / 2 : 0) + Math.min(width, 1280) - 64
      for (const front of ['felulet', 'szabaly', 'adat']) {
        const cur = await page.locator('#retegek .rt:not([hidden])').getAttribute('data-elol')
        if (cur !== front) await page.locator(`#retegek .rt:not([hidden]) [data-rt-nev="${front}"]`).click()
        await page.waitForTimeout(800)
        const right = await page.locator('#retegek .rt:not([hidden])').evaluate((rt) => Math.max(...[...rt.querySelectorAll('.mk')].map((m) => m.getBoundingClientRect().x)))
        expect(right, front).toBeLessThanOrEqual(gridRight + 48 + 0.5)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      }
    })
  }

  test('below the section\'s breakpoint there is no section', async ({ page }) => {
    await home(page, 1000, 900)
    await expect(section(page)).toBeHidden()
    await expect(page.locator('[data-rt-kulcs]')).toBeVisible()   // the key is there from 824 px
  })

  test('reduced motion: the stack arrives apart, every state reachable, nothing moves after 200 ms', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/rt-kesz/)
    await expect(page.locator('#retegek .rt[data-par="gepadat"]')).toHaveAttribute('data-allapot', 'nyitva')
    await page.locator('#retegek').scrollIntoViewIfNeeded()
    await page.locator('#retegek .rt[data-par="gepadat"] [data-rt-nev="szabaly"]').click()
    await page.waitForTimeout(250)
    const t1 = await page.locator('#retegek .rt[data-par="gepadat"] .rt-lap[data-s="adat"]').evaluate((e) => getComputedStyle(e).transform)
    await page.waitForTimeout(300)
    expect(await page.locator('#retegek .rt[data-par="gepadat"] .rt-lap[data-s="adat"]').evaluate((e) => getComputedStyle(e).transform)).toBe(t1)
    await ctx.close()
  })
})

test.describe('the 404 stack', () => {
  test('N1 to N6: the requested path as data, the three links, no key and no strip, open at rest, nothing sent', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => { if (r.resourceType() !== 'document') requests.push(r.url()) })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/nincs-ilyen/x?y=1#z')
    await expect(page.locator('html')).toHaveClass(/rt-kesz/)
    const rt = page.locator('.rt-404 .rt')
    await expect(rt).toHaveAttribute('data-allapot', 'nyitva')
    await expect(page.locator('.rt-404 [data-rt-cim]')).toHaveText('/nincs-ilyen/x')
    await expect(page.locator('.rt-sz')).toHaveCount(0)
    await expect(page.locator('[data-rt-kulcs]')).toHaveCount(0)
    expect(await page.locator('.rt-404 .rt-uta a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['/munkaim/', '/megrendeles/', '/#kapcsolat'])
    await expect(page.locator('.rt-404')).toContainText(RETEG.nincsFelulet)
    // the four strings and the lamp of the block are unchanged
    for (const t of ['Hiba 404', 'Ez az oldal nem található.', 'This page could not be found.', 'Vissza a főoldalra']) await expect(page.locator('.hiba')).toContainText(t)
    expect(requests.filter((u) => /nincs-ilyen/.test(u))).toEqual([])
    expect(await names(page, '.rt-404')).toEqual([RETEG.nevek.adat, RETEG.nevek.szabaly, RETEG.nevek.felulet])
  })

  test('N2: a path with markup is shown as characters; a long path is cut at 120', async ({ page }) => {
    await page.goto('/%3Cb%3Ex')
    await expect(page.locator('.rt-404 [data-rt-cim]')).toHaveText('/%3Cb%3Ex')
    expect(await page.locator('.rt-404 [data-rt-cim] *').count()).toBe(0)
    await page.goto('/' + 'a'.repeat(200))
    const t = await page.locator('.rt-404 [data-rt-cim]').textContent()
    expect(t!.length).toBe(121)
    expect(t!.endsWith('…')).toBe(true)
  })

  test('below 1024: the flat cascade; a head puts its sheet in front', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/nincs-ilyen')
    await expect(page.locator('html')).toHaveClass(/rt-kesz/)
    const h = await page.locator('.rt-404 .rt-lap').evaluateAll((s) => s.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(h).toEqual([44, 44, 240])
    await page.locator('.rt-404 [data-rt-nev="adat"]').click()
    await expect(page.locator('.rt-404 .rt')).toHaveAttribute('data-elol', 'adat')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
})
