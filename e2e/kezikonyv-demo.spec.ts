import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/demos/kezikonyv/'

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

test.describe('kezikonyv demo', () => {
  test('without a serial number it lists both machines with a QR code for each', async ({ page, baseURL }) => {
    const seen = watch(page, baseURL)
    await page.goto(DEMO)
    await expect(page.locator('.unit')).toHaveCount(2)
    await expect(page.locator('.unit svg path')).toHaveCount(2)
    await expect(page.locator('.unit').first()).toHaveAttribute('href', '?sn=MV200-0001')
    await expect(page.locator('.unit-url').first()).toHaveText(/\/demos\/kezikonyv\/\?sn=MV200-0001$/)
    await expect(page.locator('.demo-badge')).toHaveText('Bemutató – kitalált gép és gyártó')
    expect(seen.foreign).toEqual([])
    expect(seen.errors).toEqual([])
  })

  test('each serial number opens its own manual edition', async ({ page, baseURL }) => {
    const seen = watch(page, baseURL)
    await page.goto(`${DEMO}?sn=MV200-0001`)
    await expect(page.locator('.plate-cells')).toContainText('MV200-0001')
    await expect(page.locator('.plate-cells')).toContainText('v1.2')
    await expect(page.locator('.plate-status')).toContainText('Van újabb (v1.3)')
    await expect(page.locator('#valtozatok .older-note')).toBeVisible()
    await expect(page.locator('#hibaelharitas tr', { hasText: 'E04' })).toHaveCount(0)
    await expect(page.locator('.chg')).toHaveCount(0)

    await page.goto(`${DEMO}?sn=mv200-0002`)
    await expect(page.locator('.plate-cells')).toContainText('v1.3')
    await expect(page.locator('.plate-status')).toContainText('Ez a legújabb kiadás')
    await expect(page.locator('#valtozatok .older-note')).toHaveCount(0)
    await expect(page.locator('#hibaelharitas tr', { hasText: 'E04' })).toHaveCount(1)
    await expect(page.locator('.chg-tag').first()).toContainText('a v1.3-ban')
    for (const id of ['biztonsag', 'uzembe-helyezes', 'kezeles', 'karbantartas', 'hibaelharitas', 'alkatreszek']) {
      await expect(page.locator(`#${id}.chapter`)).toHaveCount(1)
    }
    await expect(page.locator('#manual .sample').first()).toContainText('Mintaszöveg')
    expect(seen.foreign).toEqual([])
    expect(seen.errors).toEqual([])
  })

  test('an unknown serial number says so and offers the list', async ({ page }) => {
    await page.goto(`${DEMO}?sn=XX-1`)
    await expect(page.locator('#snError')).toContainText('nincs kézikönyv')
    await expect(page.locator('.unit')).toHaveCount(2)
  })

  test('search highlights hits regardless of accents and counts them per chapter', async ({ page }) => {
    await page.goto(`${DEMO}?sn=MV200-0002`)
    await page.locator('#q').fill('hutofolyadek')
    await expect(page.locator('#searchStatus')).toContainText(/^\d+ találat \d+ fejezetben\./)
    const hits = await page.locator('#manual mark').count()
    expect(hits).toBeGreaterThan(1)
    await expect(page.locator('#manual mark.now')).toHaveCount(1)
    const badges = await page.locator('#toc .hits').allTextContents()
    expect(badges.reduce((sum, n) => sum + Number(n || 0), 0)).toBe(hits)
    await page.locator('#q').press('Enter')
    await expect(page.locator('#searchStatus')).toContainText(`Most: 2 / ${hits}`)
    await page.locator('#q').fill('nincsilyenszo')
    await expect(page.locator('#searchStatus')).toContainText('Nincs találat')
    await expect(page.locator('#manual mark')).toHaveCount(0)
    // the text is restored exactly after clearing
    await page.locator('#q').fill('')
    await page.locator('#q').press('Escape')
    await expect(page.locator('#hibaelharitas')).toContainText('Kevés hűtőfolyadék a vágásnál')
  })

  test('the download is one self-contained HTML file without scripts or remote files', async ({ page }) => {
    await page.goto(`${DEMO}?sn=MV200-0001`)
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#downloadBtn').click()])
    expect(download.suggestedFilename()).toBe('MV-200_kezikonyv_MV200-0001_v1.2.html')
    const html = await readFile((await download.path()) as string, 'utf8')
    expect(html).toContain('<html lang="hu">')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/url\("?\.\/fonts/)
    expect(html.match(/src:url\(data:/g)?.length).toBe(5)
    expect(html).toContain('id="karbantartas"')
    expect(html).toContain('Mintaszöveg')
    await expect(page.locator('#actionStatus')).toContainText('Letöltve')
  })

  test('the paper copy form validates, shows what the manufacturer would get and sends nothing', async ({ page }) => {
    await page.goto(`${DEMO}?sn=MV200-0001`)
    await page.locator('#pSerial').fill('')
    await page.locator('#paperForm button[type=submit]').click()
    await expect(page.locator('#paperForm [aria-invalid=true]')).toHaveCount(5)
    await expect(page.locator('#paperResult')).toBeHidden()
    await page.locator('#paperSample').click()
    await page.locator('#pSerial').fill('mv200-0002')
    const requests: string[] = []
    page.on('request', (req) => requests.push(req.url()))
    await page.locator('#paperForm button[type=submit]').click()
    await expect(page.locator('#paperResult')).toBeVisible()
    await expect(page.locator('#paperResult')).toContainText('Ezt kapná meg a gyártó')
    await expect(page.locator('#paperResult')).toContainText('v1.3, 2026. 09. 15.')
    await expect(page.locator('#paperResult')).toContainText('nem lett elküldve')
    expect(requests).toEqual([])
  })

  test('the owner band is a closed disclosure on phones; the only way back is the return strip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${DEMO}?sn=MV200-0001`)
    await expect(page.locator('#owner')).not.toHaveAttribute('open', '')
    await page.locator('#owner summary').click()
    await expect(page.locator('#owner')).toContainText('A tartalom és a jogszabályi megfelelés a gyártóé')
    await expect(page.locator('#owner a[href="/megrendeles/#szolgaltatas-gepkonyv"]')).toHaveCount(0)
    const back = page.locator('a.vissza[href="/megrendeles/#szolgaltatas-gepkonyv"]')
    await expect(back).toHaveCount(1)
    await expect(back).toHaveText('Vissza az ajánlathoz')
    await expect(page.locator('#owner a[href^="mailto:ott.benjamin.ev@ottbenjamin.hu?subject="]')).toHaveCount(1)
  })

  test('print output keeps the nameplate and the manual and drops the interactive parts', async ({ page }) => {
    await page.goto(`${DEMO}?sn=MV200-0001`)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('#plate')).toBeVisible()
    await expect(page.locator('#karbantartas')).toBeVisible()
    for (const hidden of ['#owner', '.actions', '#rail', '#papir', '.foot']) {
      await expect(page.locator(hidden)).toBeHidden()
    }
    await expect(page.locator('#pageStyle')).toHaveCount(1)
  })

  for (const url of [DEMO, `${DEMO}?sn=MV200-0002`]) {
    test(`fits a 390 px wide phone screen without horizontal scrolling: ${url}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(url)
      await page.locator('#main').waitFor()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
