import { expect, test, type Page } from '@playwright/test'
import type { Proba } from '../src/vilag/tipusok'

test.describe.configure({ timeout: 240_000 })

declare global {
  interface Window {
    __vilagProba?: Proba
  }
}

const belepo = (page: Page) => page.locator('[data-vilag-belepo]')
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Térbeli nézet' })

async function szoftveresEngedely(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vilagProba = { szoftveres: true }
  })
}

function vilagKerelmek(page: Page): string[] {
  const kerelmek: string[] = []
  page.on('request', (r) => {
    const { pathname } = new URL(r.url())
    if (pathname.startsWith('/vilag/')) kerelmek.push(pathname)
  })
  return kerelmek
}

test("9. a failed warm-up download is retried once on the visitor's intent and the click opens the world", async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  let elso = true
  await page.route('**/vilag/**', async (route) => {
    if (elso) {
      elso = false
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'lathato')
  await page.waitForTimeout(3_000)
  await expect(gomb).not.toHaveAttribute('data-vilag-bemelegites')
  await gomb.click()
  await expect(dialog(page)).toBeVisible({ timeout: 60_000 })
  expect(kerelmek).toHaveLength(2)
})

test('10. a world that fails for good hides the button and hands the focus to the text link', async ({ page }) => {
  await szoftveresEngedely(page)
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toHaveAttribute('data-vilag-bemelegites', 'kesz')
  await gomb.focus()
  await page.keyboard.press('Enter')
  const dlg = dialog(page)
  await expect(dlg).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.vilag-toltes')).toBeHidden({ timeout: 60_000 })
  await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('canvas.vilag-vaszon')!.getContext('webgl2')!
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })
  await expect(dlg).toBeHidden()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'hiba')
  await expect(gomb).toBeHidden()
  await expect(page.locator('#top')).not.toHaveAttribute('inert')
  await expect(page.locator('#nyitas .acts-link')).toBeFocused()
})

test('11. when every download fails, the button goes for good after two requests and the focus moves to the text link', async ({ page }) => {
  const kerelmek = vilagKerelmek(page)
  await szoftveresEngedely(page)
  await page.route('**/vilag/**', (r) => r.abort())
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'lathato')
  await page.waitForTimeout(3_000)
  await gomb.focus()
  await expect(gomb).toHaveAttribute('data-vilag-belepo', 'hiba')
  await expect(gomb).toBeHidden()
  await expect(page.locator('#nyitas .acts-link')).toBeFocused()
  await expect(page.locator('[role="dialog"]')).toBeHidden()
  expect(kerelmek).toHaveLength(2)
  await page.waitForTimeout(3_000)
  expect(kerelmek).toHaveLength(2)
})
