import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { ATIRANYITASOK } from '../src/content/atiranyitasok.ts'
import { atiranyitasVisszaesesiSzkript } from '../src/site/atiranyitas.ts'

const ORDER_URL = /https?:\/\/127\.0\.0\.1:\d+\/megrendeles\/(?:\?.*)?(?:#.*)?$/

function dist(...parts: string[]) {
  return path.join(process.cwd(), 'dist', ...parts)
}

async function waitForOrder(page: Page) {
  await page.waitForURL(ORDER_URL)
  await expect(page.locator('h1')).toHaveText('Csomagok és árak')
}

test.describe('static GitHub Pages helpers', () => {
  test('dist contains 404.html and one redirect stub per entry of the list', () => {
    const notFound = fs.readFileSync(dist('404.html'), 'utf8')
    expect(notFound).toContain('Ez az oldal nem található.')
    expect(notFound).toContain(atiranyitasVisszaesesiSzkript(ATIRANYITASOK))
    // Hand-written literals, independent of the generator.
    expect(notFound).toContain('"/rendeles/":"/megrendeles/"')
    expect(fs.readFileSync(dist('megrendelo/index.html'), 'utf8')).toContain('location.replace("/megrendeles/" + location.search + location.hash)')
    // An entry whose target carries a hash sends the visitor to that hash; the query is still carried.
    expect(fs.readFileSync(dist('gepkonyv/index.html'), 'utf8')).toContain('location.replace("/megrendeles/" + location.search + "#szolgaltatas-gepkonyv")')
    expect(notFound).toContain('(i < 0 ? location.hash : t.slice(i))')
    for (const { from, to, cim, link } of ATIRANYITASOK) {
      const stub = fs.readFileSync(dist(from.slice(1), 'index.html'), 'utf8')
      expect(stub, from).toContain(`<meta http-equiv="refresh" content="0; url=${to}" />`)
      expect(stub, from).toContain(`https://ottbenjamin.hu${to.split('#')[0]}`)
      expect(stub, from).toContain(`<title>${cim}</title>`)
      expect(stub, from).toContain(link)
    }
  })

  for (const { from, to } of ATIRANYITASOK) {
    const [toPath, toHash = ''] = to.split('#')
    // The target's own hash wins over an old incoming one (it has no target on the new page); a target without a hash keeps the visitor's.
    const expectedHash = toHash ? `#${toHash}` : '#kapcsolat-email'
    const landed = (page: Page) => new URL(page.url()).pathname === toPath
    test(`${from} lands on ${to} with the query kept and the target's hash winning`, async ({ page }) => {
      for (const start of [from, from.slice(0, -1), `${from}?ref=card#kapcsolat-email`]) {
        const response = await page.goto(start, { waitUntil: 'networkidle' })
        expect(response?.status(), `${start} is the stub, served with 200`).toBe(200)
        await expect.poll(() => landed(page), `${start} lands on ${toPath}`).toBe(true)
        expect((await page.request.get(toPath)).status(), `${toPath} is 200`).toBe(200)
        if (start.includes('?')) {
          expect(new URL(page.url()).search).toBe('?ref=card')
          expect(new URL(page.url()).hash).toBe(expectedHash)
        } else if (toHash) expect(new URL(page.url()).hash, `${start} carries the panel's hash`).toBe(expectedHash)
      }
    })

    test(`${from} without script: the meta refresh takes the visitor to ${to}`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(from, { waitUntil: 'domcontentloaded' })
      await expect.poll(() => landed(page), 'meta refresh lands').toBe(true)
      if (toHash) expect(new URL(page.url()).hash).toBe(`#${toHash}`)
      await context.close()
    })

    test(`${from} without script and refresh: the visible link goes to ${to}`, async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false })
      const page = await context.newPage()
      // The refresh is stripped from the stub, so that only the visible link can take the visitor on.
      await page.route((url) => decodeURIComponent(url.pathname) === from, async (route) => {
        const response = await route.fetch()
        await route.fulfill({ response, body: (await response.text()).replace(/<meta http-equiv="refresh"[^>]*>/, '') })
      })
      await page.goto(from, { waitUntil: 'domcontentloaded' })
      expect(decodeURIComponent(new URL(page.url()).pathname)).toBe(from)
      await page.getByRole('link', { name: /^Tovább a / }).click()
      await expect.poll(() => landed(page)).toBe(true)
      if (toHash) expect(new URL(page.url()).hash).toBe(`#${toHash}`)
      await context.close()
    })
  }

  // Spellings no stub covers are served by GitHub Pages as 404.html, whose generated script finds them in the list: another letter case, and the accented
  // spelling written with a combining accent. (A case-insensitive file system, Windows, finds the stub for a case variant itself and answers 200.)
  const caseInsensitiveFs = fs.existsSync(dist('MEGRENDELO'))
  for (const start of ['/Megrendelo/', '/RENDELES', '/MegrendelÉs/', '/megrendelés/']) {
    test(`${start} is served as 404.html and lands on /megrendeles/ with the query and the hash kept`, async ({ page }) => {
      test.skip(caseInsensitiveFs && /[A-Z]/.test(start), 'a case-insensitive file system finds the stub itself')
      const initial = await page.goto(`${start}?ref=card#kapcsolat-email`, { waitUntil: 'domcontentloaded' })
      expect(initial?.status(), `${start} is served as 404.html`).toBe(404)
      await waitForOrder(page)
      expect(new URL(page.url()).search).toBe('?ref=card')
      expect(new URL(page.url()).hash).toBe('#kapcsolat-email')
    })
  }

  // The same fallback for the four merged offer addresses: it keeps the query and sends the visitor to the panel's hash, not to the old incoming one.
  for (const [start, hash] of [['/Gepkonyv/', '#szolgaltatas-gepkonyv'], ['/TERMEKLEIRAS', '#szolgaltatas-termekleiras'], ['/Lapszabaszat/', '#szolgaltatas-lapszabaszat'], ['/Bemutatkozo-Oldal/', '#szolgaltatas-bemutatkozo']] as const) {
    test(`${start} is served as 404.html and lands on its panel with the query kept and the old hash dropped`, async ({ page }) => {
      test.skip(caseInsensitiveFs, 'a case-insensitive file system finds the stub itself')
      const initial = await page.goto(`${start}?ref=card#demo`, { waitUntil: 'domcontentloaded' })
      expect(initial?.status(), `${start} is served as 404.html`).toBe(404)
      await waitForOrder(page)
      expect(new URL(page.url()).search).toBe('?ref=card')
      expect(new URL(page.url()).hash).toBe(hash)
    })
  }

  test('/nincs-ilyen serves the 404 page', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))

    const response = await page.goto('/nincs-ilyen', { waitUntil: 'networkidle' })
    expect(response, '404 response').toBeTruthy()
    expect(response!.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('Ez az oldal nem található.')
    await expect(page.getByText('This page could not be found.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vissza a főoldalra' })).toHaveAttribute(
      'href',
      '/',
    )
    // The header's "Csomagok" goes to the packages page; nothing in the page itself does.
    // (the 404's own stack holds the header's three links with their targets, 36 N3: Szabály's rows)
    await expect(page.locator('main a[href="/megrendeles/"]:not(.rt-uta a), main a[href="/megrendeles"]')).toHaveCount(0)
    await expect(page.locator('form, input, textarea, select')).toHaveCount(0)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')

    const pageOrigin = new URL(page.url()).origin
    const external = requests.filter((url) => {
      return !url.startsWith(pageOrigin) && !url.startsWith('data:')
    })
    expect(external, 'no third-party requests').toEqual([])
  })

  test('404 follows the system theme: dark when the browser prefers dark, light otherwise', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/nincs-ilyen', { waitUntil: 'domcontentloaded' })
    const channels = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number))
    const dark = await channels()
    expect(Math.max(...dark), 'a dark ground').toBeLessThan(80)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toMatch(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/nincs-ilyen', { waitUntil: 'domcontentloaded' })
    expect(Math.min(...(await channels())), 'a light ground').toBeGreaterThan(200)
  })

  test('404 is readable at 360, 390 and 1440', async ({ page }) => {
    const shots = [
      { width: 360, height: 800, name: '404_readable_360x800.png' },
      { width: 390, height: 844, name: '404_merge_390x844.png' },
      { width: 1440, height: 900, name: '404_merge_1440x900.png' },
    ] as const

    for (const shot of shots) {
      await page.setViewportSize({ width: shot.width, height: shot.height })
      const response = await page.goto('/nincs-ilyen', { waitUntil: 'networkidle' })
      expect(response?.status()).toBe(404)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Vissza a főoldalra' })).toBeVisible()
      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
      })
      expect(
        overflow.scrollWidth,
        `horizontal scroll at ${shot.width}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
      await page.screenshot({
        path: test.info().outputPath(shot.name),
        fullPage: true,
        animations: 'disabled',
      })
    }
  })

  test('screenshot /megrendelo/ landing on /megrendeles/', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const response = await page.goto('/megrendelo', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await waitForOrder(page)
    await page.screenshot({
      path: test.info().outputPath('megrendelo_redirect_landing_1440.png'),
      fullPage: true,
      animations: 'disabled',
    })
  })
})
