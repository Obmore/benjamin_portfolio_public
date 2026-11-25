import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { formatHuf } from '../src/data/pricing'
import { ALL_PATHS, LIVE_PATHS, STATIC_PAGES, TEMPLATES } from './pages'

// Acceptance criteria for the customer-facing site (honlap-ugyfelszerzes-2026-11).
const EMAIL = 'ott.benjamin.ev@ottbenjamin.hu'
const SITE = 'https://ottbenjamin.hu'
// Page lists come from the page registry (e2e/pages.ts).
const AMOUNT = /\d{1,3}(?:[  ]\d{3})*[  ]Ft/g
const VAT = 'AAM (áfamentes)'

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const amounts = (text: string) => [...normalize(text.replace(/ /g, ' ')).matchAll(AMOUNT)].map(m => m[0]).sort()

async function gotoHome(page: Page) {
  const response = await page.goto('/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('#nyitas')).toBeVisible()
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
}

test.describe('the home page (direction D: the signal path)', () => {
  test('one H1 with the positioning, the main menu is the three sections of the page', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('Egyedi weboldal és műszaki szoftver.')
    await expect(page.getByRole('navigation', { name: 'Fő navigáció' }).locator('a')).toHaveText(['Munkák', 'Csomagok', 'Kapcsolat'])
  })

  test('the source panel, the keys and the band are on the first screen of a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await gotoHome(page)
    const bottom = await page.locator('.sp:visible').evaluate(e => e.getBoundingClientRect().bottom)
    expect(bottom).toBeLessThanOrEqual(780)
    const keys = await page.locator('.keys').evaluate(e => e.getBoundingClientRect().bottom)
    expect(keys).toBeLessThanOrEqual(780)
    const bandTop = await page.locator('.sav').evaluate(e => e.getBoundingClientRect().top)
    expect(bandTop).toBeLessThanOrEqual(780)
  })

  test('no CV, career timeline or technology list anywhere (owner decision 2026-11-04)', async ({ page, request }) => {
    // /tapasztalat/ is a redirect to /munkaim/#evek now (PR 7): the former page's content is the Évek section of /munkaim/ (munkaim.spec.ts).
    for (const url of ['/']) {
      await page.goto(url)
      const text = await page.locator('body').innerText()
      for (const word of ['Önéletrajz', 'önéletrajz', 'Szakmai tapasztalat', 'Kompetenciák', 'Python', 'React', 'TypeScript', 'Azure', 'LinkedIn']) {
        expect(text, `${url}: ${word}`).not.toContain(word)
      }
      await expect(page.locator('a[href*="/cv/"], a[href$=".pdf"], a[href*="linkedin"]'), url).toHaveCount(0)
      // The "Technika:" line is only allowed on /munkaim/, which is why that page is not in this loop.
      if (url === '/') expect(text, `${url}: Technika:`).not.toContain('Technika:')
    }
    // The CV files stay in the repository until the owner decides, but are not published.
    for (const file of ['Ott_Benjamin_CV_HU.pdf', 'Ott_Benjamin_CV_EN.pdf']) {
      expect((await request.get(`/cv/${file}`)).status(), file).toBe(404)
    }
    expect((await request.get('/rolam/')).status()).toBe(404)
  })

  test('the business address is readable and mailable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    expect((await page.goto('/'))?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('footer')).toContainText(EMAIL) // the address is in the footer block
        // Without the script the page is complete: the contact address is a real mailto link, the frozen band and the first work are in it.
    await expect(page.locator('#kapcsolat a[href^="mailto:"]').first()).toBeVisible()
    await expect(page.locator('.fz-ssr:visible path').first()).toBeAttached()
    await expect(page.locator('.dv-box img')).toBeVisible()
    await context.close()
  })

  test('copy button copies the visible business address', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/megrendeles/', { waitUntil: 'networkidle' }) // the home page's contact section has the same shared key; the merged package page carries it too
    await page.locator('#kapcsolat .cmz-gomb').click()
    await expect(page.locator('#kapcsolat .cmz')).toHaveAttribute('data-st', 'kesz')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL)
  })
})

test.describe('prices: one source for the home page and /megrendeles/', () => {
  test('the shown entry prices exist on /megrendeles/ with their VAT label', async ({ page }) => {
    await page.goto('/megrendeles/')
    // The home page shows no price at all since 2026-11-16 (the packages and prices are on /megrendeles/).
    await page.goto('/')
    expect(amounts(await page.locator('main').innerText())).toEqual([])
    // The entry panels on /megrendeles/ label each plate amount with the VAT exemption.
    await page.goto('/megrendeles/')
    for (const plate of await page.locator('.adl-ar').all()) {
      const text = await plate.innerText()
      expect(amounts(text), 'one amount per plate').toHaveLength(1)
      expect(text.split(VAT).length - 1, 'VAT label per plate').toBe(1)
    }
  })

  test('amounts are written once, in the pricing module', () => {
    const literal = /\b(?:149|189|129|49)(?:[  _]|&nbsp;)?000\b|\b(?:4|9)(?:[  _]|&nbsp;)?900\b/
    // Besides the known amounts, no typed "<digits> Ft" anywhere outside pricing.ts.
    const typedPrice = /\d(?:[\d  .]|&nbsp;)*(?:&nbsp;|[  ])?Ft\b/
    const pages = TEMPLATES
    const sources = fs.readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter(file => /\.(ts|tsx)$/.test(file) && path.basename(file) !== 'pricing.ts')
      .map(file => path.join('src', file))
    for (const file of [...pages, ...sources]) {
      const text = fs.readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(literal)
      expect(text, file).not.toMatch(typedPrice)
    }
  })
})

test.describe('imprint pages', () => {
  const facts = ['Ott Benjámin', '8944 Sárhida, Kossuth utca 32.', '59492319', '90312599-1-40', EMAIL, 'GitHub, Inc.', 'Fastly, Inc.', 'Zala Vármegyei Kereskedelmi és Iparkamara']
  for (const [url, lang] of [['/impresszum/', 'hu'], ['/en/imprint/', 'en']] as const) test(`${url} lists the required data`, async ({ page }) => {
    expect((await page.goto(url))?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    for (const fact of facts) await expect(page.locator('main')).toContainText(fact)
    for (const contact of ['https://support.github.com/contact', 'https://www.fastly.com/contact-us']) {
      await expect(page.locator(`main a[href="${contact}"]`)).toHaveCount(1)
    }
    await expect(page.locator('main')).not.toContainText('[KÉRDÉS')
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
})

test.describe('terms', () => {
  test('/aszf/ is final: indexable, in the sitemap, dated, complete, and shows only the amounts from pricing.ts', async ({ page, request }) => {
    expect((await page.goto('/aszf/'))?.status()).toBe(200)
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveText('Általános szerződési feltételek')
    await expect(page).toHaveTitle(/^Általános szerződési feltételek \|/)
    await expect(page.locator('main')).not.toContainText(/tervezet\b|draft/i)
    await expect(page.locator('.draft')).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText('[KÉRDÉS')
    await expect(page.locator('.ph-datum')).toContainText('Hatályos: 2026. november 10-től')
    // Ptk. 6:78. § (2): the acceptance and liability clauses are flagged at the top and set in bold.
    await expect(page.locator('.pr-szoveg > p:first-child')).toContainText('4. pontra')
    await expect(page.locator('.pr-szoveg > p:first-child')).toContainText('12. pontra')
    await expect(page.locator('article strong', { hasText: 'elfogadottnak kell tekinteni' })).toHaveCount(1)
    await expect(page.locator('article strong', { hasText: 'legfeljebb az adott megrendelés egyszeri díjának összegéig felel' })).toHaveCount(1)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain(`<loc>${SITE}/aszf/</loc>`)
    // The only amount is the deposit threshold, rendered from the {{huf:depositFrom}} placeholder.
    expect(amounts(await page.locator('main').innerText())).toEqual(amounts(formatHuf('depositFrom', 'hu')))
    await expect(page.locator('main a[href="/megrendeles/"]').first()).toBeVisible()
    await expect(page.locator('main a[href="/adatkezeles/"]').first()).toBeVisible()
    await expect(page.locator('footer [aria-current="page"]')).toHaveText('ÁSZF')
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })

  test('every page labels its footer terms link "ÁSZF" without "tervezet"/"draft"', async ({ page }) => {
    for (const url of ALL_PATHS.filter(route => route !== '/aszf/')) {
      await page.goto(url)
      const text = (await page.locator('footer a[href="/aszf/"]').first().innerText()).toLowerCase()
      expect(text, url).not.toMatch(/tervezet|draft/)
    }
  })
})

test.describe('footer links', () => {
  test('every page links the imprint and the terms from its footer', async ({ page }) => {
    for (const url of ['/', '/megrendeles/']) {
      await page.goto(url)
      await expect(page.locator('footer a[href="/impresszum/"]'), url).toHaveCount(1)
      await expect(page.locator('footer a[href="/aszf/"]'), url).toHaveCount(1)
      await expect(page.locator('footer a[href="/adatkezeles/"]'), url).toHaveCount(1)
      // Ekertv. 4. §: name, seat, e-mail, registration number and tax number from the imprint.
      for (const fact of ['Ott Benjámin e.v.', '8944 Sárhida, Kossuth utca 32.', EMAIL, '59492319', '90312599-1-40']) {
        await expect(page.locator('footer'), `${url}: ${fact}`).toContainText(fact)
      }
    }
    for (const url of STATIC_PAGES) {
      await page.goto(url)
      const imprint = url === '/en/imprint/' ? '/en/imprint/' : '/impresszum/'
      // The footer's entry for the page one stands on is plain text (aria-current), every other entry is a link.
      const here = url === '/aszf/' ? '/aszf/' : url === '/impresszum/' || url === '/en/imprint/' ? imprint : null
      await expect(page.locator(`footer a[href="${imprint}"]`), url).toHaveCount(here === imprint ? 0 : 1)
      await expect(page.locator('footer a[href="/aszf/"]'), url).toHaveCount(here === '/aszf/' ? 0 : 1)
      if (here) await expect(page.locator('footer [aria-current="page"]'), url).toHaveCount(1)
    }
  })
})

test.describe('technical SEO', () => {
  test('sitemap lists exactly the live pages and each answers 200', async ({ page, request }) => {
    // maxRetries retries only network errors (a keep-alive connection the preview server closed during the page loop), never an HTTP status.
    const sitemap = await request.get('/sitemap.xml', { maxRetries: 1 })
    expect(sitemap.status()).toBe(200)
    const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    expect(locs.sort()).toEqual(LIVE_PATHS.map(p => SITE + p).sort())
    for (const loc of locs) {
      const response = await page.goto(loc.replace(SITE, ''))
      expect(response?.status(), loc).toBe(200)
      await expect(page.locator('meta[name="robots"][content*="noindex"]'), loc).toHaveCount(0)
    }
    const robots = await (await request.get('/robots.txt', { maxRetries: 1 })).text()
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  test('home and package page descriptions, ProfessionalService JSON-LD', async ({ page }) => {
    await gotoHome(page)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /jeltől a böngészőig/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${SITE}/og.png`)
    expect((await page.request.get('/og.png')).status()).toBe(200)
    const graph = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
      const data = JSON.parse(node.textContent!)
      return data['@graph'] ?? [data]
    }))
    const service = graph.find((item: { '@type': string }) => item['@type'] === 'ProfessionalService')
    expect(service).toBeTruthy()
    expect(service.email).toBe(EMAIL)
    expect(service.address).toMatchObject({ postalCode: '8944', addressLocality: 'Sárhida', streetAddress: 'Kossuth utca 32.', addressCountry: 'HU' })
    expect(service.areaServed).toMatchObject({ name: 'Magyarország' })
    // The home page shows no offers or prices, so its structured data lists none either.
    expect(service.makesOffer).toBeUndefined()
    expect(graph.some((item: { '@type': string }) => item['@type'] === 'Person')).toBe(true)
    await page.goto('/megrendeles/')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /csomag/i)
  })
})

test.describe('quality', () => {
  // The axe checks of the home page (light and dark, every impact) and of /megrendeles/ (360 and 1280 px, light and dark) are in fooldal.spec.ts and megrendeles.spec.ts.
  test('every built page loads and does not scroll horizontally at 386 px', async ({ page }) => {
    await page.setViewportSize({ width: 386, height: 800 })
    for (const url of ALL_PATHS) {
      const response = await page.goto(url, { waitUntil: 'networkidle' })
      expect(response?.status(), url).toBe(200)
      expect(await noHorizontalScroll(page), url).toBe(true)
    }
  })

  test('no horizontal scrolling at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const url of ['/', '/megrendeles/', ...STATIC_PAGES]) {
      await page.goto(url, { waitUntil: 'networkidle' })
      expect(await noHorizontalScroll(page), url).toBe(true)
    }
  })
})

test('/munkaim/: the first work image (LCP) is eager with high priority, the later ones stay lazy', async ({ page }) => {
  await page.goto('/munkaim/')
  const imgs = page.locator('.mb-kep img')
  expect(await imgs.count()).toBeGreaterThan(1)
  await expect(imgs.first()).toHaveAttribute('loading', 'eager')
  await expect(imgs.first()).toHaveAttribute('fetchpriority', 'high')
  for (const img of (await imgs.all()).slice(1)) await expect(img).toHaveAttribute('loading', 'lazy')
})
