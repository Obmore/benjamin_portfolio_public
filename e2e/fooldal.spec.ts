import { expect, type Page } from '@playwright/test'
import { quiet, resizeTo, scheme as setScheme, test, withoutRollinPicture } from './sweep'
import AxeBuilder from '@axe-core/playwright'
import { JEL, META } from '../src/content/fooldal'
import { ROLLIN_KEP_ALT } from '../src/content/munkak'
import { HIVAS_LEVEL, NYILVANTARTO, VALASZIDO, VALLALKOZO, levelCim } from '../src/content/alapadatok'

// The home page, direction D "Egy jel útja": sections and copy, the removed features, the works links, the contact end (copy and the failure
// path), the page without script, overflow and axe. Motion: fooldal-mozgas.spec.ts; colours and theme: fooldal-szin.spec.ts.
const norm = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim()

async function gotoHome(page: Page) {
  const response = await page.goto('/')   // the page's own end marker instead of a network-idle wait: the chunk has started (jel-kesz)
  expect(response?.status()).toBe(200)
  await expect(page.locator('#nyitas')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/jel-kesz/)
}

test.describe('sections and copy', () => {
  test('one H1 in three lines, the subline with its bold first sentence (no lead, no opening sentence), the four keys and their sentences, the title', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)   // read-only checks: the loaded page of this worker
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1 .l')).toHaveCount(3)
    expect(norm(await page.locator('h1').textContent())).toBe('Egyedi weboldal és műszaki szoftver.')
    expect(norm(await page.locator('.sub').textContent())).toBe(`${JEL.alcim.elso} ${JEL.alcim.tovabb}`)
    expect(norm(await page.locator('.sub b').textContent())).toBe(JEL.alcim.elso)
    expect(await page.locator('.sub b').evaluate((e) => getComputedStyle(e).fontWeight)).toBe('700')
    expect(await page.locator('.sub').evaluate((e) => getComputedStyle(e).textDecorationLine), 'no underline').toBe('none')
    await expect(page.locator('.lead, .under, .jt')).toHaveCount(0)
    await expect(page.locator('.key-gomb')).toHaveText(JEL.nyito.parok.map((p) => p.kulcs))
    const ro = await page.locator('.key-gomb').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.ro))
    expect(ro).toEqual(JEL.nyito.parok.map((p) => p.mondat))
    await expect(page.locator('.readout')).toHaveText(JEL.nyito.parok[0]!.mondat)
    await expect(page).toHaveTitle(META.cim)
  })

  test('B18: no dashed outline of the page\'s own and no bracketed placeholder in any visible string of the first screen', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)
    const r = await page.evaluate(() => {
      const own = [...document.querySelectorAll('#nyitas *')].filter((e) => !e.closest('img, svg') && getComputedStyle(e).borderTopStyle === 'dashed')
      return { dashed: own.map((e) => e.className), text: (document.getElementById('nyitas')!.innerText ?? '') }
    })
    expect(r.dashed).toEqual([])
    expect(r.text).not.toMatch(/\[|\]/)
  })

  test('the first screen\'s two actions: one key button to the presentation page offer and one text link to the contact end', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)
    await expect(page.locator('#nyitas .acts-gomb')).toHaveText(JEL.akciok.weboldal.felirat)
    await expect(page.locator('#nyitas .acts-gomb')).toHaveAttribute('href', '/megrendeles/#szolgaltatas-bemutatkozo')
    await expect(page.locator('#nyitas .acts-link')).toHaveText(JEL.akciok.szoftver.felirat)
    await expect(page.locator('#nyitas .acts-link')).toHaveAttribute('href', '#kapcsolat')
    await expect(page.locator('#nyitas .adl-gomb')).toHaveCount(1)
    const order = await page.evaluate(() => [...document.querySelectorAll('#nyitas .sub, #nyitas .acts, #nyitas .keys')].map((e) => e.className.split(' ')[0]))
    expect(order, 'document order: the subline, the actions, then the keys').toEqual(['sub', 'acts', 'keys'])
  })

  test('sections in order: nyitas, munkak, partnerek, kapcsolat, then the footer', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)
    const tops = await page.evaluate(() => ['nyitas', 'munkak', 'partnerek', 'kapcsolat'].map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY))
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    const footerTop = await page.locator('footer').evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    expect(footerTop).toBeGreaterThan(tops[3]!)
    await expect(page.locator('header.fejlec nav a')).toHaveText([JEL.nav.munkak, JEL.nav.csomagok, JEL.nav.kapcsolat])
  })

  test('works: H2, five titles and sentences in the page, partners, offers line, contact', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)
    await expect(page.locator('#h-munkak')).toHaveText(JEL.munkak.cim)
    for (const [i, w] of JEL.munkak.tetelek.entries()) {
      const li = page.locator('.wl li').nth(i)
      await expect(li.locator('button')).toHaveText(w.cim)
      await expect(li.locator('.ws')).toHaveText(w.mondat)
    }
    await expect(page.locator('#h-partnerek')).toHaveText('Akikkel dolgoztam')
    await expect(page.locator('.slot')).toHaveText(JEL.partnerek.nevek)
    await expect(page.locator('.offtxt')).toContainText(JEL.partnerek.ajanlat)
    await expect(page.locator('#h-kapcsolat')).toHaveText(JEL.kapcsolat.cim)
    expect(norm(await page.locator('.cmz-mondat').textContent()), 'the reply promise alone').toBe(VALASZIDO)
    await expect(page.locator('.cmz-gomb')).toHaveText(JEL.kapcsolat.masolas)
    await expect(page.locator('.cmz-linkek a')).toHaveText([JEL.kapcsolat.link, JEL.kapcsolat.beszelgetes])
  })

  test('footer: the sole trader, e-mail, seat, registration, tax number and the legal links (no Tapasztalat entry since PR 7)', async ({ homeFull: page }) => {
    await resizeTo(page, 1280, 720)
    const foot = page.locator('footer')
    await expect(foot).toContainText(VALLALKOZO.rovidNev)
    await expect(foot.locator(`a[href="mailto:${VALLALKOZO.email}"]`)).toBeVisible()
    await expect(foot).toContainText(`${VALLALKOZO.szekhely.iranyitoszam} ${VALLALKOZO.szekhely.telepules}, ${VALLALKOZO.szekhely.utca}`)
    await expect(foot).toContainText(VALLALKOZO.nyilvantartasiSzam)
    if (typeof NYILVANTARTO === 'string') await expect(foot).toContainText(NYILVANTARTO)
    await expect(foot).toContainText(VALLALKOZO.adoszam)
    for (const href of ['/impresszum/', '/aszf/', '/adatkezeles/']) await expect(foot.locator(`a[href="${href}"]`)).toHaveCount(1)
    await expect(foot.locator('a[href="/tapasztalat/"], a[href="/cv/"]')).toHaveCount(0)
  })
})

const OLD_SAMPLE = 'https://obmore.github.io/lelek-es-nyelv-portfolio/'

test.describe('home page sections (direction D)', () => {
  // The opening (the first screen: source, keys, band, screen), the works, the partners, the contact end, then the footer.
  test('sections follow the agreed order: opening, works, partners, contact, footer', async ({ page }) => {
    await page.goto('/')
    const tops = await page.evaluate(() => ['nyitas', 'munkak', 'partnerek', 'kapcsolat'].map((id) => document.getElementById(id)!.getBoundingClientRect().top))
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
    const footer = await page.locator('footer').evaluate((el) => el.getBoundingClientRect().top)
    expect(footer).toBeGreaterThan(tops[3]!)
    // No portrait is invented while the owner has not sent one, and no render either: the only pictures besides the works' detail picture are the first screen's captures (the client's page with its consent, the own gépkönyv demo, the own order demo)
    await expect(page.locator('main img:not(.dv-box img):not(.kij img):not(.rt-kep img)')).toHaveCount(0)
    await expect(page.locator('.kij img')).toHaveCount(3)
    // the Rétegek section shows the same three captures on its Felület sheets (and nothing else)
    await expect(page.locator('.rt-kep img')).toHaveCount(3)
  })

  test('the works are complete without JavaScript: the first picture with a fixed box, all five sentences, the planned slot, the live links', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    const job = page.locator('#munkak')
    await expect(job.locator('.wl li')).toHaveCount(6)   // five works and the planned slot
    await expect(job.locator('.ws')).toHaveCount(5)   // the planned slot has no sentence
    await expect(job.locator('a[href="https://lelekesnyelv.hu/"]')).toHaveCount(1)
    await expect(job.locator('a[href="https://rollindocking.com/hotel"]')).toHaveCount(1)
    expect(await page.locator('body').innerText()).not.toMatch(/nem ügyfélmunka/i)
    await expect(page.locator('img[alt*="minta" i]')).toHaveCount(0)
    await expect(page.locator(`a[href="${OLD_SAMPLE}"]`)).toHaveCount(0)
    // Fixed image boxes: later enhancements cause no layout shift.
    for (const img of await page.locator('main img').all()) {
      await expect(img).toHaveAttribute('width', /\d+/)
      await expect(img).toHaveAttribute('height', /\d+/)
    }
    await context.close()
  })

  test('works and years are out of the main nav; the footer is one block with the legal links and no Tapasztalat or CV entry (PR 7)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Fő navigáció' }).locator('a')).toHaveCount(3)
    await expect(page.locator('a[href="/tapasztalat/"], a[href="/cv/"]')).toHaveCount(0)
    await expect(page.locator('a[href="/munkaim/"]')).toHaveCount(1)
    for (const href of ['/impresszum/', '/aszf/', '/adatkezeles/']) await expect(page.locator(`footer a[href="${href}"]`), href).toHaveCount(1)
  })
})

test.describe('removed features are gone; the subpages stay reachable', () => {
  test('no hero tool, scene, price list, work log or "Mit nem csinálok"', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    await gotoHome(page)
    for (const sel of ['[data-eszkoz]', '[data-jelenet-hely]', '#arjegyzek', '#naplo', '#eszkoz', '#muhely', '.hero, .ajto']) await expect(page.locator(sel)).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText('Mindhárom')
    await expect(page.locator('body')).not.toContainText('Mit nem csinálok')
    await expect(page.locator('body')).not.toContainText('Munkanapló')
    // a late request must not go unseen: the load sequence has ended and the network is idle
    await expect(page.locator('html')).toHaveClass(/jel-vege/)
    await page.waitForLoadState('networkidle')
    expect(requests.filter((u) => /rajz-|kliens-|fonts\.googleapis|fonts\.gstatic/.test(u))).toEqual([])
  })

  test('the packages page is linked twice (the shared header and the partners section); the main nav holds only the packages page; every footer link answers 200', async ({ homeFull: page, request }) => {
    await resizeTo(page, 1280, 720)
    await expect(page.locator('a[href="/megrendeles/"]')).toHaveCount(2)
    await expect(page.locator('header.fejlec a[href^="/"]:not(.mklink)')).toHaveCount(1) // Csomagok
    for (const href of ['/impresszum/', '/aszf/', '/adatkezeles/', '/megrendeles/', '/munkaim/']) {
      expect((await request.get(href)).status(), href).toBe(200)
    }
  })

  test('"Minden munka" leads to /munkaim/, "Csomagok és árak" to /megrendeles/', async ({ page }) => {
    await gotoHome(page)
    await page.locator('.allw a').click()
    await expect(page).toHaveURL(/\/munkaim\/$/)
    await page.goBack()
    await page.locator('.offtxt a').click()
    await expect(page).toHaveURL(/\/megrendeles\/$/)
  })

  test('the old anchors land on the new sections', async ({ page }) => {
    for (const [old, now] of [['demok', 'munkak'], ['munka', 'munkak'], ['naplo', 'munkak'], ['muhely', 'munkak'], ['munkaim', 'munkak']]) {
      await page.goto(`/#${old}`)
      await expect(page, `#${old}`).toHaveURL(new RegExp(`#${now}$`))
    }
  })

  test('the old anchors of a separate page change the page: offers to /megrendeles/, experience to /munkaim/#evek', async ({ page }) => {
    await page.goto('/index.html#csomagok')
    await expect(page, '/index.html#csomagok').toHaveURL(/\/megrendeles\/$/)
    for (const [old, path] of [['csomagok', '/megrendeles/'], ['arjegyzek', '/megrendeles/'], ['megoldasok', '/megrendeles/'], ['rolam', '/munkaim/#evek'], ['oneletrajz', '/munkaim/#evek'], ['tapasztalat', '/munkaim/#evek']]) {
      await page.goto(`/#${old}`)
      await expect(page, `#${old}`).toHaveURL(new RegExp(`${path}$`))
    }
  })

  test('a hashchange to an old page anchor on the home page changes the page', async ({ page }) => {
    await gotoHome(page)
    await page.evaluate(() => { location.hash = '#arjegyzek' })
    await expect(page).toHaveURL(/\/megrendeles\/$/)
  })
})

test.describe('the works links', () => {
  test('every work shows its own link: demos open in place, live sites in a new tab with noopener', async ({ page, request }) => {
    await gotoHome(page)
    for (const [i, w] of JEL.munkak.tetelek.entries()) {
      await page.locator(`.wl button[data-wi="${i}"]`).click()
      const link = page.locator('.dv-link')
      await expect(link).toHaveText(w.link.felirat)
      await expect(link).toHaveAttribute('href', w.link.href)
      await expect(page.locator('.dv-t')).toHaveText(w.cim)
      await expect(page.locator('.dv-s')).toHaveText(w.mondat)
      if (w.link.kulso) {
        await expect(link).toHaveAttribute('rel', /noopener/)
      } else {
        await expect(link).toHaveAttribute('data-esemeny', 'demo')
        expect((await request.get(w.link.href)).status()).toBe(200)
      }
    }
  })

  test('Rollin shows its station picture in the detail view, with its alt text and no trace', async ({ page }) => {
    await gotoHome(page)
    await page.locator('.wl button[data-wi="2"]').focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.wl button[data-wi="3"]')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.dv-box img')).toHaveAttribute('src', '/work/rollin-allomas.webp')
    await expect(page.locator('.dv-box img')).toHaveAttribute('alt', ROLLIN_KEP_ALT)
    await expect.poll(() => page.locator('.dv-box img').evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth)).toBe(922)
    await expect(page.locator('.dv-trace')).toBeHidden()
  })

  test('the keys of the list move with the arrow keys and show the picture of the work (Rollin without its picture: the work\'s own trace)', async ({ page }) => {
    await withoutRollinPicture(page)
    await gotoHome(page)
    const first = page.locator('.wl button[data-wi="2"]')
    await expect(first).toHaveAttribute('aria-checked', 'true')
    await first.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.wl button[data-wi="3"]')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.dv-trace')).toBeVisible()   // no picture: the work's own trace, not its title again
    await expect(page.locator('.dv-box img')).toBeHidden()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.dv-box img')).toHaveAttribute('src', '/work/lelek-es-nyelv.webp')
    expect(await page.locator('.dv-box img').evaluate((i) => (i as HTMLImageElement).complete)).toBe(true)
  })

  test('the detail picture keeps its box (width and height are set)', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('.dv-box img')).toHaveAttribute('width', '1200')
    await expect(page.locator('.dv-box img')).toHaveAttribute('height', '750')
  })
})

// ---------- the contact end, C1 "address field with a copy key" (the shared component src/site/elemek/) ----------
// The copy key replaced the breaker: a button (not a switch) in the field's right end. Its answer is drawn by the component itself: a green terminal on the field's
// edge, a red underline under the address up to the key cell, the lamp with its legend; it holds four seconds after the last press and then goes back to rest.
const colourOf = (page: Page, token: string) => page.evaluate((t) => {
  const p = document.createElement('i')
  p.style.background = `var(${t})`
  document.body.append(p)
  const c = getComputedStyle(p).backgroundColor
  p.remove()
  return c
}, token)

test.describe('the contact end', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 800 } })

  test('C3: a copy puts the address on the clipboard and shows terminal, underline, lamp and legend within 600 ms; four seconds later the rest state is back', async ({ page }) => {
    await gotoHome(page)
    const key = page.locator('.cmz-gomb')
    await key.scrollIntoViewIfNeeded()
    const svg = () => page.locator('.cmz-svg').evaluate((s) => s.innerHTML)
    const before = await svg()
    await key.click()
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz', { timeout: 600 })
    await expect(page.locator('.cmz-allapot')).toHaveText(JEL.kapcsolat.kimasolva)
    await expect(page.locator('.cmz-lampa')).toBeVisible({ timeout: 600 })
    await expect(page.locator('.cmz-lampa-t')).toHaveText(JEL.kapcsolat.kimasolva)
    await expect(page.locator('.cmz-svg .cmz-ter-be')).toBeVisible({ timeout: 600 })
    await expect(page.locator('.cmz-svg .cmz-ul')).toBeAttached({ timeout: 600 })
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALLALKOZO.email)
    // the key's label and sign never change
    await expect(key).toHaveText(JEL.kapcsolat.masolas)
    await expect.poll(() => page.locator('.cmz-ul').evaluate((p) => parseFloat((p as SVGElement).style.strokeDashoffset)), { timeout: 2000 }).toBeLessThan(0.5)
    // four seconds after the press (and the 300 ms withdraw) the rest state is back, element for element
    await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/, { timeout: 6500 })
    expect(await svg(), 'the line is the one it was before the press').toBe(before)
    await expect(page.locator('.cmz-lampa')).toBeHidden()
    await expect(page.locator('.cmz-allapot')).toHaveText('')
  })

  test('a press while the answer holds copies again and starts the four seconds over', async ({ page }) => {
    await gotoHome(page)
    const key = page.locator('.cmz-gomb')
    await key.scrollIntoViewIfNeeded()
    await key.click()
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    await page.waitForTimeout(2500)
    await key.click()
    await page.waitForTimeout(2500)   // 5 s after the first press, 2.5 s after the second: still answered
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    await expect(page.locator('.cmz')).not.toHaveAttribute('data-st', /.+/, { timeout: 4500 })
  })

  test('C4: when copying is impossible the lamp is red-pen coloured, the legend reads "Hiba", the status asks to select the address, nothing is underlined and the terminal stays hollow', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true })
      document.execCommand = () => false
    })
    await gotoHome(page)
    const key = page.locator('.cmz-gomb')
    await key.scrollIntoViewIfNeeded()
    await key.click()
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'hiba')
    await expect(page.locator('.cmz-lampa-t')).toHaveText(JEL.kapcsolat.hiba)
    await expect(page.locator('.cmz-allapot')).toHaveText(JEL.kapcsolat.allapotHiba)
    expect(await page.locator('.cmz-lampa-l').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(await colourOf(page, '--jel'))
    await expect(page.locator('.cmz-svg .cmz-ul')).toHaveCount(0)
    await expect(page.locator('.cmz-svg .cmz-ter-be')).toHaveCount(0)
    await expect(page.locator('.cmz-svg .cmz-ter')).toHaveCount(1)
    await expect(page.locator('#cmz-cim')).toHaveAttribute('href', `mailto:${VALLALKOZO.email}`)
  })

  test('the address, "Levelet írok" and the talk request are real mailto links that report their events; the tab order is address, key, mail link, talk link', async ({ page }) => {
    await gotoHome(page)
    const address = page.locator('#cmz-cim')
    await expect(address).toHaveText(VALLALKOZO.email)
    await expect(address).toHaveAttribute('href', `mailto:${VALLALKOZO.email}`)
    await expect(address).toHaveAttribute('data-esemeny', 'email')
    const [letter, talk] = [page.locator('.cmz-linkek a').nth(0), page.locator('.cmz-linkek a').nth(1)]
    await expect(letter).toHaveText(JEL.kapcsolat.link)
    await expect(letter).toHaveAttribute('href', `mailto:${VALLALKOZO.email}`)
    await expect(letter).toHaveAttribute('data-esemeny', 'email')
    await expect(talk).toHaveText(HIVAS_LEVEL.felirat)
    await expect(talk).toHaveAttribute('href', levelCim({ targy: HIVAS_LEVEL.targy, torzs: HIVAS_LEVEL.torzs }))
    await expect(talk).toHaveAttribute('data-esemeny', 'hivas')
    // the key is a button, described by the address; it is not a switch
    const key = page.locator('.cmz-gomb')
    await expect(key).toHaveAttribute('aria-describedby', 'cmz-cim')
    await expect(key).not.toHaveAttribute('role', 'switch')
    await expect(key).not.toHaveAttribute('aria-checked', /.*/)
    await address.focus()
    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      order.push(await page.evaluate(() => { const a = document.activeElement as HTMLElement; return a.id || a.className || a.tagName }))
      await page.keyboard.press('Tab')
    }
    expect(order).toEqual(['cmz-cim', 'cmz-gomb', 'lnk tlnk', 'lnk tlnk'])
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`C5: at rest nothing green or orange, no lamp, no legend and no underline is rendered (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await gotoHome(page)
      await page.locator('.cmz-gomb').scrollIntoViewIfNeeded()
      await expect(page.locator('.cmz-lampa')).toBeHidden()
      await expect(page.locator('.cmz-svg .cmz-ul, .cmz-svg .cmz-hev, .cmz-svg .cmz-ter-be')).toHaveCount(0)
      const [be, forro] = [await colourOf(page, '--be'), await colourOf(page, '--jel-forro')]
      const painted = await page.locator('.cmz-svg *').evaluateAll((els) => els.flatMap((e) => { const c = getComputedStyle(e); return [c.fill, c.stroke] }))
      expect(painted).not.toContain(be)
      expect(painted).not.toContain(forro)
    })
  }

  test('C7: the component works on a second entry that has no home chunk: /munkaim/ carries it (its own entry, no jel-*.js)', async ({ page }) => {
    const home_chunk: string[] = []
    page.on('request', (r) => { if (/\/assets\/jel-[^/]+\.js$/.test(r.url())) home_chunk.push(r.url()) })
    await page.goto('/munkaim/')
    const key = page.locator('.cmz-gomb')
    await expect(key).toBeEnabled()   // the component's own behaviour started
    await key.scrollIntoViewIfNeeded()
    await key.click()
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    await expect(page.locator('.cmz-allapot')).toHaveText(JEL.kapcsolat.kimasolva)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALLALKOZO.email)
    await expect(page.locator('.cmz-svg .cmz-ter-be')).toBeVisible()
    expect(home_chunk, 'the home chunk was not loaded on this page').toEqual([])
  })

  test('after the home chunk failed (its failure fallback put the server markup back) the key is enabled, copies, and the line is drawn', async ({ page }) => {
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.cfig').forEach((e) => e.setAttribute('data-geo', 'x'))))   // JSON.parse throws in init(): fail() restores the markup
    await page.goto('/')
    await expect(page.locator('html')).not.toHaveClass(/jel-var|jel-kesz/)
    const key = page.locator('.cmz-gomb')
    await expect(key).toBeEnabled()
    await key.scrollIntoViewIfNeeded()
    await key.click()
    await expect(page.locator('.cmz')).toHaveAttribute('data-st', 'kesz')
    await expect(page.locator('.cmz-svg .cmz-ter-be')).toBeVisible()
    await expect(page.locator('.cmz-svg .cmz-ul')).toBeAttached()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALLALKOZO.email)
  })

  test('C8: nothing of the breaker is left: no drawing, legend plate or lever, no switch in the contact section, no word "megszakító" on the page', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('#kapcsolat [role="switch"], #kapcsolat .brk, #kapcsolat svg.dv, .legt.kim')).toHaveCount(0)
    expect(await page.content()).not.toMatch(/megszak/i)
  })
})

test.describe('without script and with a failing chunk', () => {
  test.use({ javaScriptEnabled: false })

  test('the page is complete: text, nav, mailto, the HONLAP pair (panel and phone capture) with both actions, frozen band, first work, all five sentences, partners, footer; keys and run control absent', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('#kapcsolat a[href^="mailto:"]').first()).toBeVisible()
    await expect(page.locator('footer')).toContainText(VALLALKOZO.email)
    await expect(page.locator('.sp:visible')).toHaveCount(1)
    await expect(page.locator('.sp:visible .adl-cim')).toHaveText(JEL.nyito.honlap.cim)
    await expect(page.locator('.kij img:visible')).toHaveCount(1)
    await expect(page.locator('.kij img:visible')).toHaveAttribute('alt', JEL.nyito.honlap.kep.alt)
    await expect(page.locator('.acts-gomb')).toBeVisible()
    await expect(page.locator('.acts-link')).toBeVisible()
    await expect(page.locator('.keys')).toBeHidden()
    await expect(page.locator('.readout')).toHaveText(JEL.nyito.parok[0]!.mondat)
    await expect(page.locator('.fz-ssr:visible path').first()).toBeAttached()
    await expect(page.locator('.dv-box img')).toBeVisible()
    for (const w of JEL.munkak.tetelek) await expect(page.locator('.ws', { hasText: w.mondat })).toBeVisible()
    await expect(page.locator('.slot')).toHaveCount(4)
    // no control and no instruction that promises behaviour the missing script would give
    await expect(page.locator('.tkey')).toBeHidden()
    await expect(page.locator('.ctl')).toBeHidden()
    await expect(page.locator('.cmz-kc')).toBeHidden()   // the key cell is absent: the field with the address and both links remain
    await expect(page.locator('.cmz-cim')).toBeVisible()
    await expect(page.locator('.cmz-linkek a')).toHaveCount(2)
    for (const sel of ['.key-gomb', '.runbtn', '[data-wi]']) {
      for (const el of await page.locator(sel).all()) await expect(el, sel).toBeDisabled()
    }
    // the partner names are plain text, not buttons
    expect(await page.locator('.slot').evaluateAll((els) => els.map((e) => e.tagName))).toEqual(['SPAN', 'SPAN', 'SPAN', 'SPAN'])
  })
})

// The head snippet's waiting class (jel-var) must never outlive the script it waits for.
test('the page script request is blocked: the waiting class is gone and the source and the band are shown', async ({ page }) => {
  await page.route('**/assets/fooldal-*.js', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveClass(/jel-var/)
  await expect(page.locator('.sp:visible')).toHaveCount(1)
  await expect(page.locator('.fz-ssr:visible').first()).toBeVisible()
})

// A blocked third-party (classic) script, such as analytics behind an ad blocker, fires an error event too: it must not end the wait for the page's own script,
// or the opening sequence would start from an already revealed rail and band.
test('a blocked classic third-party script keeps the waiting class until the chunk is ready, and the load sequence runs', async ({ page }) => {
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://analytics.example.invalid/x.js'
    document.head.appendChild(s)
  }))
  await page.route('https://analytics.example.invalid/**', (route) => route.abort())
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/assets/jel-*.js', async (route) => { await held; await route.continue() })
  const failed: string[] = []
  page.on('requestfailed', (r) => { if (r.url().includes('analytics.example.invalid')) failed.push(r.url()) })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => failed.length, { message: 'the classic script request was aborted' }).toBeGreaterThan(0)
  await page.waitForTimeout(300)
  await expect(page.locator('html')).toHaveClass(/jel-var/)   // still waiting: the chunk is held back
  release()
  await expect(page.locator('html')).toHaveClass(/jel-kesz/)
  await expect(page.locator('html')).toHaveClass(/jel-vege/, { timeout: 10000 })   // the load sequence ran to its end
})

// The stored theme also colours the browser chrome (both theme-color metas), from the head snippet, before any script of the page.
for (const [stored, colour, scheme] of [['sotet', '#0B0F14', 'light'], ['vilagos', '#F2F0E7', 'dark']] as const) {
  test(`a stored ${stored} choice sets both theme-color metas to its paper colour (system: ${scheme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme, javaScriptEnabled: true })
    const page = await ctx.newPage()
    await page.addInitScript((v) => { try { localStorage.setItem('jel-tema', v) } catch { /* blocked */ } }, stored)
    await page.route('**/assets/fooldal-*.js', (route) => route.abort())   // the head snippet alone
    await page.goto('/')
    const metas = await page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')))
    expect(metas).toEqual([colour, colour])
    await ctx.close()
  })
}

// ---------- the failure fallback: whatever fails, the visitor gets the page without script ----------
// The state of every element of the body (landmarks, the overlay SVGs, anything appended outside them), in document order: class, style, aria-checked, hidden, src,
// href, d, transform and the text of leaf elements, then the root's class list and inline style. Nothing is skipped: after a failure the body equals the one
// without script, so a stale chunk node anywhere fails. `disabled` is not compared here (it is asserted on its own). Allowlist: the root class `js`, which the head snippet (src/site/jel-fej.ts) sets on any page with script (a page-wide marker, not chunk state);
// an empty root style attribute counts as none (script-side code may leave one behind before the chunk runs).
async function serverRenderedState(page: Page) {
  return page.evaluate(() => [
    ...[...document.querySelectorAll('body *')].filter((e) => !e.closest('.cmz-svg'))   // the contact end's own line (its drawing is alive after a failure of the home chunk: it is a separate script)
      .map((e) => [e.tagName, ...['class', 'style', 'aria-checked', 'hidden', 'src', 'href', 'd', 'transform'].map((a) => e.getAttribute(a)), e.children.length ? '' : e.textContent].join('|')),
    'root|' + [...document.documentElement.classList].filter((c) => c !== 'js').sort().join(' '),
    'rootstyle|' + (document.documentElement.getAttribute('style') || ''),
  ])
}
// The same page rendered without script, in a second context that is closed again
let noScriptRender: string[] | null = null   // the page without script renders the same every time: read once per worker
async function noScriptState(page: Page) {
  if (noScriptRender) return noScriptRender
  const ctx = await page.context().browser()!.newContext({ viewport: { width: 1280, height: 720 }, javaScriptEnabled: false })
  try {
    const p = await ctx.newPage()
    await p.goto('/')
    noScriptRender = await serverRenderedState(p)
    return noScriptRender
  } finally {
    await ctx.close()
  }
}
// The overlay markup (every attribute the chunk writes) as one string: it must not change once the chunk has failed.
async function overlaySnap(page: Page) {
  return page.evaluate(() => {
    const attrs = ['class', 'd', 'style', 'transform', 'width', 'height', 'cx', 'cy', 'x', 'y', 'points', 'aria-current', 'aria-checked', 'disabled', 'tabindex']
    const sel = ['.spine-svg', '.spine-svg *', '.run', '.run *', '.earth', '.earth *', '.bus', '.bus *', '.offers', '.offers *', '.sav', '.sav *', '.opening svg', '.opening svg *', '.sp', '.kp', '.key-gomb', '.term', '.kij-olv', '.reading', '.readout', '.hdr nav a', '.cfig', '.cfig *']
    const seen = new Set<Element>()
    const out: string[] = []
    for (const e of document.querySelectorAll(sel.join(','))) {
      if (seen.has(e)) continue
      seen.add(e)
      out.push(e.tagName + attrs.map((a) => `|${e.getAttribute(a)}`).join(''))
    }
    return out.join('\n') + '#' + document.documentElement.getAttribute('style') + '#' + document.documentElement.className + '#' + document.body.getAttribute('style')
  })
}
const WAITING = /jel-var|jel-kesz|jel-hullam|jel-vege/
// Called once the failure has happened: the end state is the page without script and nothing of the chunk is still running.
async function expectStaticPage(page: Page, errors: string[]) {
  await expect(page.locator('html')).not.toHaveClass(WAITING)
  const right = await overlaySnap(page)
  await page.clock.runFor(2500)   // the load sweep (620 ms + 500 ms), the band and any pending timer would all have moved something by now (the page clock: no real wait)
  await expect(page.locator('html')).not.toHaveClass(WAITING)
  expect(await overlaySnap(page), 'the overlay markup 2.5 s after the failure equals the one right after it').toBe(right)
  await expect.poll(() => serverRenderedState(page), { message: 'class, style, aria-checked, hidden, src, href, leaf text and the root classes and style equal the page without script' }).toEqual(await noScriptState(page))
  // chunk-only controls are disabled, the page reads and links navigate
  for (const el of await page.locator('[data-jel-js]').all()) await expect(el).toBeDisabled()
  await expect(page.locator('.sp:visible')).toHaveCount(1)
  await expect(page.locator('.fz-ssr:visible').first()).toBeVisible()
  await page.locator('.hdr nav a[data-sec="kapcsolat"]').click()
  await expect(page).toHaveURL(/#kapcsolat$/)
  // scrolling and resizing raise no error and change no overlay markup, no class
  const before = await overlaySnap(page)
  const errorsAfterFailure = errors.length
  for (const y of [400, 1200, 2400, 100000, 0]) { await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y); await page.clock.runFor(120) }
  await page.setViewportSize({ width: 900, height: 700 })
  await page.clock.runFor(250)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.clock.runFor(250)
  expect(errors.length, `page errors after the failure: ${errors.slice(errorsAfterFailure).join(' / ')}`).toBe(errorsAfterFailure)
  await expect(page.locator('html')).not.toHaveClass(WAITING)
  expect(await overlaySnap(page)).toBe(before)
}
// The first chunk-only control refuses to be enabled, so ready() throws after start() and the load sequence began; just before it does, `focusSel` (if any) takes the focus.
async function failReady(page: Page, focusSel: string | null) {
  await page.addInitScript((sel) => document.addEventListener('DOMContentLoaded', () => {
    const b = document.querySelector('[data-jel-js]') as HTMLButtonElement
    let v = true
    Object.defineProperty(b, 'disabled', { get: () => v, set: (x: boolean) => { if (!x) { if (sel) (document.querySelector(sel) as HTMLElement | null)?.focus(); (window as unknown as { __forced: boolean }).__forced = true; throw new Error('forced') } v = x }, configurable: true })
  }), focusSel)
}
const forced = (page: Page) => page.evaluate(() => (window as unknown as { __forced?: boolean }).__forced === true)

// One failure point per case; each ends in the same end-state checks.
const FAILURES: { name: string; setup: (page: Page) => Promise<unknown>; failed: (page: Page) => Promise<void> }[] = [
  {
    name: 'the chunk request is aborted',
    setup: (page) => page.route('**/assets/jel-*.js', (route) => route.abort()),
    failed: async (page) => { await expect(page.locator('html')).not.toHaveClass(/jel-var/) },
  },
  {
    name: 'the chunk loads but indit() throws',
    setup: (page) => page.route('**/assets/jel-*.js', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function indit() { throw new Error("indit failed") }' })),
    failed: async (page) => { await expect(page.locator('html')).not.toHaveClass(/jel-var|jel-kesz/) },
  },
  {
    name: 'init() throws after the opening was built (the controller needs its geometry)',
    setup: (page) => page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.cfig').forEach((e) => e.setAttribute('data-geo', 'x')))),   // data-geo is not compared, so the server markup stays comparable; JSON.parse throws in init() after JL.opening
    failed: async (page) => { await expect(page.locator('html')).not.toHaveClass(/jel-var|jel-kesz|jel-hullam|jel-vege/) },
  },
  {
    name: 'start() throws (after indit returned)',
    setup: (page) => page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      // selectWork() writes the detail title first: its setter throws, the node itself stays as the server rendered it
      const e = document.querySelector('.dv-t') as HTMLElement
      const get = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!.get!
      Object.defineProperty(e, 'textContent', { get: () => get.call(e), set: () => { throw new Error('forced') }, configurable: true })
    })),
    failed: async (page) => { await expect(page.locator('html')).not.toHaveClass(WAITING); await page.clock.runFor(1500) },
  },
  {
    name: 'ready() throws (after start() and the load sequence began)',
    setup: (page) => failReady(page, null),
    failed: async (page) => { await expect.poll(() => forced(page), { timeout: 10000 }).toBe(true) },
  },
]
for (const f of FAILURES) {
  test(`${f.name}: the page is the page without script and nothing of the chunk runs`, async ({ page }) => {
    await f.setup(page)
    await page.clock.install()   // the page's timers and frames can be advanced without waiting in real time
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await f.failed(page)
    await expectStaticPage(page, errors)
  })
}

// Focus after a failure: a focused element of a section sends the focus to that section's heading; focus in the header is not moved into main.
test('focus inside a section before the failure: the section heading has it afterwards', async ({ page }) => {
  await failReady(page, '.allw a')   // the "all works" link, inside #munkak
  await page.goto('/')
  await expect.poll(() => forced(page), { timeout: 10000 }).toBe(true)
  await expect(page.locator('#h-munkak')).toBeFocused()
})
test('focus in the header before the failure is not moved into main', async ({ page }) => {
  await failReady(page, '.hdr nav a[data-sec="kapcsolat"]')
  await page.goto('/')
  await expect.poll(() => forced(page), { timeout: 10000 }).toBe(true)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(false)
})

test('a keyboard selection through a key hit at 800 px keeps the focus on that hit although the layout is rebuilt', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/jel-kesz/)
  const hit = page.locator('.cfig:visible .khit').first()
  await hit.focus()
  const k = await hit.getAttribute('data-k')
  await hit.evaluate((e) => { (window as unknown as { __old: Element }).__old = e })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  const now = await page.evaluate(() => { const a = document.activeElement as HTMLElement; return { cls: a.className, k: a.getAttribute('data-k'), same: a === (window as unknown as { __old: Element }).__old } })
  expect(now.same, 'the hits were rebuilt (otherwise this test proves nothing)').toBe(false)
  expect(now.cls).toBe('khit')
  expect(now.k).toBe(k)
  await ctx.close()
})

for (const width of [727, 768, 800, 850, 899]) {
  test(`without the chunk nothing is past the viewport at ${width} px (the controller figure fits on its own)`, async ({ browser }) => {
    // both forms at once: two independent pages
    await Promise.all([true, false].map(async (noScript) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: !noScript })
      try {
      const page = await ctx.newPage()
      if (!noScript) await page.route('**/assets/jel-*.js', (route) => route.abort())
      await page.goto('/', { waitUntil: 'networkidle' })
      const past = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        return [...document.querySelectorAll('header *, main *, footer *')]
          .filter((e) => !e.closest('svg, .sav') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
          .filter((e) => e.getBoundingClientRect().right > vw + 0.5)
          .map((e) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className}`)
      })
      const fig = await page.locator('.cfig.cw').evaluate((e) => e.getBoundingClientRect().right)
      expect(past, `${width} px ${noScript ? 'no script' : 'failing chunk'}`).toEqual([])
      expect(fig, `${width} px: the figure's right edge`).toBeLessThanOrEqual(width)
      } finally {
        await ctx.close()
      }
    }))
  })
}

// What a visitor sees, not what the scroll width says (html and body clip horizontally, so scrollWidth stays at the viewport width):
// the extents of the headline text, the right edge of every visible element of the opening, and the header controls not overlapping.
for (const width of [320, 341, 359, 360, 390, 1280]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`nothing is clipped or covered at ${width} px (${scheme})`, async ({ homeFull: page }) => {
      await resizeTo(page, width, 800)
      await setScheme(page, scheme)
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const textRight = (el: Element) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          return Math.max(...[...range.getClientRects()].map((q) => q.right))
        }
        const lines = [...document.querySelectorAll('h1 .l')].map((el) => ({ text: el.textContent, right: Math.round(textRight(el)) }))
        const visible = (el: Element) => {
          const q = el.getBoundingClientRect()
          return q.width > 0 && q.height > 0 && getComputedStyle(el).visibility !== 'hidden'
        }
        // elements that are wider than the column on purpose (the full-width band) are not measured
        const skip = '.sav, .sav *, .opn-svg, .opn-svg *'
        const past = [...document.querySelectorAll('#nyitas *, header.fejlec *')]
          .filter((el) => visible(el) && !el.matches(skip) && !el.closest('svg'))
          .filter((el) => el.getBoundingClientRect().right > vw + 0.5 || el.getBoundingClientRect().left < -0.5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
        const rail = [...document.querySelectorAll('.kij, .keys, .acts, .sp:not([hidden]) > *')].filter(visible).map((el) => Math.round(el.getBoundingClientRect().right))
        const sw = document.querySelector('.tkey')!.getBoundingClientRect()
        const covered = [...document.querySelectorAll('header.fejlec nav a')].filter((a) => {
          const q = a.getBoundingClientRect()
          return q.left < sw.right && q.right > sw.left && q.top < sw.bottom && q.bottom > sw.top
        }).map((a) => a.textContent)
        // B17: nothing red touches a letter of the subline (the node stands 12 px left of the first letter from 727 px up, on the lane itself on a phone)
        const sub = document.querySelector('.sub')!
        const sr = document.createRange()
        sr.selectNodeContents(sub)
        const subLeft = Math.min(...[...sr.getClientRects()].map((q) => q.left))
        const node = document.querySelector('.opn-svg .sn')!.getBoundingClientRect()
        const nodeGap = Math.round(subLeft - node.right)
        return { vw, lines, past, rail, covered, nodeGap }
      })
      for (const l of r.lines) expect(l.right, `headline line "${l.text}" ends at ${l.right} in a ${r.vw} px viewport`).toBeLessThanOrEqual(r.vw - 8)
      expect(r.past, 'visible elements past the viewport').toEqual([])
      for (const right of r.rail) expect(right, 'screen, keys, actions and source right edge').toBeLessThanOrEqual(r.vw - 8)
      expect(r.covered, 'nav links covered by the theme switch').toEqual([])
      if (width >= 727) expect(Math.abs(r.nodeGap - 12), `the subline's node ends ${r.nodeGap} px from its first letter (12 px from 727 px up)`).toBeLessThanOrEqual(1)
      expect(r.nodeGap, 'the node never touches a letter').toBeGreaterThanOrEqual(10)
    })
  }
}

for (const scheme of ['light', 'dark'] as const) {
  test(`axe finds nothing on the home page (${scheme})`, async ({ homeFull: page }) => {
    // the loaded page (the chunk has started and its load sequence has ended: jel-vege), at the default size, in this colour scheme
    await resizeTo(page, 1280, 720)
    await setScheme(page, scheme)
    await quiet(page)   // the sections turn their colours one after another: axe measures the settled page, not a frame of the turn
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

// The shared-layer fixes of PR A2, rendered on the home page (the shared page is put back to 1280 x 900, top, screen media afterwards).
test('K8: the section H2 is 28/32 at 360, 36/40 at 768 and 1024, 44/48 at 1280, always the wide face (112 %) and weight 700', async ({ homeFull: page }) => {
  try {
    for (const [width, size, line] of [[360, 28, 32], [768, 36, 40], [1024, 36, 40], [1280, 44, 48]] as const) {
      await resizeTo(page, width)
      const all = await page.evaluate(() => [...document.querySelectorAll('.h2')].map((h) => { const c = getComputedStyle(h); return { size: c.fontSize, line: c.lineHeight, stretch: c.fontStretch, weight: c.fontWeight } }))
      expect(all.length, 'the home page has H2s').toBeGreaterThan(0)
      for (const [i, m] of all.entries()) expect(m, `H2 ${i} at ${width} px`).toEqual({ size: `${size}px`, line: `${line}px`, stretch: '112%', weight: '700' })
    }
  } finally { await resizeTo(page, 1280) }
})

test('K4: on the phone the header marks the current section: the works section in view gives "Munkák" aria-current and a drawn 2 px --jel underline, the other two links neither', async ({ homeFull: page }) => {
  try {
    await resizeTo(page, 360)
    await page.evaluate(() => document.getElementById('munkak')!.scrollIntoView())
    const links = page.locator('header.fejlec nav a')
    await expect(links.nth(0)).toHaveAttribute('aria-current', 'location')
    const read = () => page.evaluate(() => {
      const probe = document.createElement('i')
      probe.style.background = 'var(--jel)'
      document.body.append(probe)
      const jel = getComputedStyle(probe).backgroundColor
      probe.remove()
      return [...document.querySelectorAll<HTMLElement>('header.fejlec nav a')].map((a) => {
        const after = getComputedStyle(a, '::after')
        return { current: a.getAttribute('aria-current'), transform: after.transform, bg: after.backgroundColor, jel }
      })
    })
    // The 160 ms underline transition can be mid-way on any link, so every read is polled until it settles, the other two links included.
    const drawn = 'matrix(1, 0, 0, 1, 0, 0)'
    await expect.poll(async () => (await read())[0]!.transform, { timeout: 3000 }).toBe(drawn)
    await expect.poll(async () => (await read()).slice(1).map((o) => o.transform !== drawn), { timeout: 3000 }).toEqual([true, true])
    const [munkak, csomagok, kapcsolat] = await read()
    expect(munkak!.bg).toBe(munkak!.jel)
    for (const other of [csomagok!, kapcsolat!]) expect(other.current).toBeNull()
  } finally { await resizeTo(page, 1280) }
})

test('K6: in print the contact end keeps the address link and drops the line, the copy key and the lamp', async ({ homeFull: page }) => {
  try {
    // The lamp is display:none on screen until the contact end has an answered state, so set one first and prove it is shown on screen.
    for (const st of ['kesz', 'hiba']) {
      await page.emulateMedia({ media: 'screen' })
      await page.evaluate((v) => document.querySelector('.cmz')!.setAttribute('data-st', v), st)
      await expect(page.locator('.cmz-lampa')).toHaveCSS('display', 'flex')
      await page.emulateMedia({ media: 'print' })
      for (const sel of ['.cmz-kc', '.cmz-lampa', '.cmz-svg']) await expect(page.locator(sel).first(), `${st} ${sel}`).toHaveCSS('display', 'none')
    }
    await expect(page.locator('#kapcsolat .cmz-cim')).toBeVisible()
  } finally {
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => document.querySelector('.cmz')?.removeAttribute('data-st'))
  }
})
