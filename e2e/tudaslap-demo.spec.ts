import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/demos/tudaslap/'
const BADGE = 'Bemutató – kitalált üzem és gép, mintaadatok'
const SHEETS = ['atallas', 'hibakereses', 'mirefigyelj']

// Every request that leaves the preview server, and every script error.
function watch(page: Page, baseURL: string | undefined) {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4173').origin
  const foreign: string[] = []
  const errors: string[] = []
  page.on('request', (req) => {
    if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== origin) foreign.push(req.url())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return { foreign, errors }
}

test.describe('tudaslap demo', () => {
  test('without a sheet id it lists the three sheets with a QR code for each', async ({ page, baseURL }) => {
    const seen = watch(page, baseURL)
    await page.goto(DEMO)
    await expect(page.locator('.sheet-card')).toHaveCount(3)
    await expect(page.locator('.sheet-card svg path')).toHaveCount(3)
    await expect(page.locator('.sheet-card').first()).toHaveAttribute('href', '?lap=atallas')
    await expect(page.locator('.card-url').first()).toHaveText(/\/demos\/tudaslap\/\?lap=atallas$/)
    await expect(page.locator('.demo-badge')).toHaveText(BADGE)
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('#chooserView .how-steps li')).toHaveCount(3)
    expect(seen.foreign).toEqual([])
    expect(seen.errors).toEqual([])
  })

  test('every sheet shows the badge, the status bar and the version log', async ({ page, baseURL }) => {
    const seen = watch(page, baseURL)
    for (const id of SHEETS) {
      await page.goto(`${DEMO}?lap=${id}`)
      await expect(page.locator('.demo-badge')).toHaveText(BADGE)
      const cells = page.locator('.status-cells dt')
      await expect(cells).toHaveText(['Készítette', 'Rögzítette', 'Jóváhagyta', 'Jóváhagyás dátuma', 'Verzió'])
      await expect(page.locator('.status-cells')).toContainText('(kitalált)')
      await expect(page.locator('.status-cells')).toContainText('tapasztalt kolléga')
      await expect(page.locator('.status-cells')).toContainText('új kolléga')
      await expect(page.locator('.status-cells')).toContainText('2026.')
      await expect(page.locator('.status-cells')).toContainText('v1.1')
      await expect(page.locator('.log > li')).toHaveCount(2)
      await expect(page.locator('#verziok')).toContainText('A QR-kód nem változott.')
      await expect(page.locator('.how-steps li')).toHaveCount(3)
      await expect(page.locator('#disclaimer')).toContainText('Mintaszöveg')
      await expect(page.locator('#sheetNav a[aria-current=page]')).toHaveCount(1)
    }
    expect(seen.foreign).toEqual([])
    expect(seen.errors).toEqual([])
  })

  test('the QR address belongs to the sheet id and does not change with the version', async ({ page }) => {
    for (const id of SHEETS) {
      await page.goto(`${DEMO}?lap=${id.toUpperCase()}`)
      const url = new URL(page.url())
      const expected = `${url.origin}${url.pathname}?lap=${id}`
      await expect(page.locator('.qr-url')).toHaveText(expected)
      await expect(page.locator('.status-qr svg')).toHaveAttribute('aria-label', `QR-kód: ${expected}`)
      const same = await page.locator('.log .qr-same .mono').allTextContents()
      expect(same).toEqual([`?lap=${id}`, `?lap=${id}`])
    }
  })

  test('the changeover sheet has tools, a main step / key point / reason table and a safety key point', async ({ page }) => {
    await page.goto(`${DEMO}?lap=atallas`)
    await expect(page.locator('#sheet h2').first()).toHaveText('Eszközök és anyagok')
    const table = page.locator('table.steps-tbl')
    await expect(table.locator('thead th')).toHaveText(['Fő lépés', 'Kulcspont', 'Miért'])
    await expect(table.locator('tbody tr')).toHaveCount(7)
    await expect(table.locator('tbody th[scope=row]')).toHaveCount(7)
    await expect(table.locator('.safety').first()).toContainText('Biztonság')
    await expect(table.locator('tbody tr').nth(1)).toContainText('leválasztás')
    await expect(table.locator('tbody tr').nth(1)).toContainText('kizárás')
    await expect(page.locator('#sheet')).toContainText('kimeneti frekvencia alapjel')
    await expect(page.locator('#sheet')).toContainText(/gyorsítási idő/i)
    await expect(page.locator('#sheet')).toContainText(/lassítási idő/i)
    await expect(page.locator('#sheet')).toContainText('motor névleges adataihoz')
    await expect(page.locator('#sheet')).toContainText('áramkorlát')
  })

  test('the fault tree runs symptom, check, result, action and ends with a stop branch', async ({ page }) => {
    await page.goto(`${DEMO}?lap=hibakereses`)
    await expect(page.locator('.branch')).toHaveCount(5)
    for (const branch of await page.locator('.branch').all()) {
      await expect(branch.locator('dt')).toHaveText(['Tünet', 'Ellenőrzés', 'Eredmény', 'Teendő'])
    }
    const titles = await page.locator('.branch h3').allTextContents()
    expect(titles[0]).toContain('Mechanika')
    expect(titles[1]).toContain('gyorsítási idő')
    expect(titles[2]).toContain('Motoradatok')
    expect(titles[3]).toContain('Motorkábel és szigetelés')
    expect(titles[4]).toContain('túlfeszültség')
    await expect(page.locator('.branch').first().locator('a[href="?lap=mirefigyelj"]')).toHaveCount(1)
    await expect(page.locator('.closing')).toContainText('Ne próbálkozz tovább')
    await expect(page.locator('.closing')).toContainText('villamos szakember')
    await expect(page.locator('#sheet')).toContainText('földzárlat')
    await expect(page.locator('#sheet')).toContainText('fékellenállás')
  })

  test('the warning sheet has one point per card, including the discharge time and the electrician rule', async ({ page }) => {
    await page.goto(`${DEMO}?lap=mirefigyelj`)
    await expect(page.locator('.card')).toHaveCount(5)
    await expect(page.locator('.card').nth(1)).toContainText('STOP')
    await expect(page.locator('.card').nth(1)).toContainText('nem leválasztás')
    await expect(page.locator('.card').nth(2)).toContainText('4–15 perc')
    await expect(page.locator('.card').nth(2)).toContainText('adattábláján')
    await expect(page.locator('.card').nth(2)).toContainText('feszültségmentességet')
    await expect(page.locator('.card').nth(3)).toContainText('külső feszültség')
    await expect(page.locator('.card').nth(4)).toContainText('villamos szakképzett személy')
  })

  test('an unknown sheet id says so and offers the list', async ({ page }) => {
    await page.goto(`${DEMO}?lap=xx`)
    await expect(page.locator('#lapError')).toContainText('nincs lap')
    await expect(page.locator('.sheet-card')).toHaveCount(3)
  })

  for (const bad of ['constructor', '__proto__', '<script>']) {
    test(`a prototype or markup id (${bad}) shows the unknown-sheet message only`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(`${DEMO}?lap=${encodeURIComponent(bad)}`)
      await expect(page.locator('#lapError')).toContainText('nincs lap')
      await expect(page.locator('.sheet-card')).toHaveCount(3)
      await expect(page.locator('#readerView')).toBeHidden()
      await expect(page.locator('#lapError script')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }

  test('search highlights hits regardless of accents and restores the text', async ({ page }) => {
    await page.goto(`${DEMO}?lap=atallas`)
    await page.locator('#q').fill('gyorsitasi')
    await expect(page.locator('#searchStatus')).toContainText(/^\d+ találat \d+ részben\./)
    const hits = await page.locator('#sheet mark, #verziok mark').count()
    expect(hits).toBeGreaterThan(1)
    await expect(page.locator('mark.now')).toHaveCount(1)
    await page.locator('#q').press('Enter')
    await expect(page.locator('#searchStatus')).toContainText(`Most: 2 / ${hits}`)
    await page.locator('#q').fill('nincsilyenszo')
    await expect(page.locator('#searchStatus')).toContainText('Nincs találat')
    await expect(page.locator('mark')).toHaveCount(0)
    await page.locator('#q').fill('')
    await page.locator('#q').press('Escape')
    await expect(page.locator('table.steps-tbl')).toContainText('Állítsd be a kimeneti frekvencia alapjelét')
  })

  test('print output keeps the status bar, the sheet and the version log and drops the interactive parts', async ({ page }) => {
    await page.goto(`${DEMO}?lap=hibakereses`)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('#status')).toBeVisible()
    await expect(page.locator('#sheet')).toBeVisible()
    await expect(page.locator('#verziok')).toBeVisible()
    await expect(page.locator('.demo-badge')).toBeVisible()
    for (const hidden of ['.owner', '.actions', '.search', '.sheetnav', '.foot']) {
      await expect(page.locator(hidden)).toBeHidden()
    }
    await expect(page.locator('#pageStyle')).toHaveCount(1)
  })

  test('the page makes no network request after loading, and keeps working offline', async ({ page, context }) => {
    await page.goto(`${DEMO}?lap=atallas`)
    await page.locator('#main').waitFor()
    await context.setOffline(true)
    const requests: string[] = []
    page.on('request', (req) => requests.push(req.url()))
    await page.locator('#q').fill('lassitasi')
    await expect(page.locator('#searchStatus')).toContainText('találat')
    expect(requests).toEqual([])
  })

  test('the source is free of real vendors, prices, deadlines and age characterisations', async () => {
    const files = ['index.html', 'app.js', 'style.css', 'README.md']
    const text = (await Promise.all(files.map((f) => readFile(new URL(`../public/demos/tudaslap/${f}`, import.meta.url), 'utf8'))))
      .join('\n')
      .replace(/\r\n/g, '\n')
    const vendors = ['ABB', 'Siemens', 'Danfoss', 'Schneider', 'Mitsubishi', 'Yaskawa', 'Lenze', 'Rockwell', 'Allen-Bradley', 'Eaton', 'Hitachi', 'Omron', 'Delta', 'Fuji', 'WEG', 'SEW', 'Nord', 'Toshiba', 'Bosch', 'Rexroth', 'Vacon', 'Altivar', 'Sinamics', 'VLT']
    const letter = String.raw`[\p{L}\p{N}]`
    expect(text).not.toMatch(new RegExp(`(?<!${letter})(${vendors.join('|')})(?!${letter})`, 'iu'))
    expect(text).not.toMatch(/\d\s?(Ft|forint|EUR|€|Eft)(?![\p{L}\p{N}])|\bROI\b|megtérül|határidő/iu)
    expect(text).not.toMatch(/fiatal|idős|öreg|nyugdíj|veterán|tapasztalatlan/i)
    expect(text).not.toMatch(/áthidal(?!ni, kiiktatni)|bypass|kiiktatás/i)
  })

  for (const url of [DEMO, ...SHEETS.map((id) => `${DEMO}?lap=${id}`)]) {
    for (const width of [360, 1280]) {
      test(`fits ${width} px without horizontal scrolling, light and dark, no axe violations: ${url}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        for (const colorScheme of ['light', 'dark'] as const) {
          await page.emulateMedia({ colorScheme })
          await page.goto(url)
          await page.locator('#main').waitFor()
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow).toBeLessThanOrEqual(0)
          const axe = await new AxeBuilder({ page }).analyze()
          expect(axe.violations, JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
        }
      })
    }
  }

  test('dark mode changes the page colours and print stays light', async ({ page }) => {
    await page.goto(`${DEMO}?lap=atallas`)
    await page.emulateMedia({ colorScheme: 'light' })
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    await page.emulateMedia({ colorScheme: 'dark' })
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(dark).not.toBe(light)
    await page.emulateMedia({ colorScheme: 'dark', media: 'print' })
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)')
  })
})
