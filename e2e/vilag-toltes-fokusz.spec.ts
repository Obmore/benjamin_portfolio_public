import { expect, test, type Page } from '@playwright/test'
import type { Proba } from '../src/vilag/tipusok'

// Keyboard focus inside the 3D world dialog while it loads and after loading finishes (src/vilag/index.ts, src/vilag/hud.ts).
//
// On a slow connection warm-up is skipped, so clicking the entry button downloads and prepares the world while the dialog
// and its loading screen are already open. Focus must move into the dialog immediately so Escape works during loading,
// and land on the route slider once loading completes. In test 1 the focus during loading is recorded at the moment the
// dialog opens (`megnyit()` sets `data-nyitva`, focuses the root and shows `.vilag-toltes` synchronously before its first
// `await`, so a `MutationObserver` microtask sees that exact state), and the CPU is slowed through CDP so that Escape is
// usually pressed while the loader still runs.
test.describe.configure({ timeout: 240_000 })

declare global {
  interface Window {
    __vilagProba?: Proba
    __vilagNyitas?: { toltes: boolean; bent: boolean }
  }
}

const belepo = (page: Page) => page.locator('[data-vilag-belepo]')
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Térbeli nézet' })

async function szoftveresEngedely(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vilagProba = { szoftveres: true }
  })
}

async function lassuKapcsolat(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false, effectiveType: '3g' }),
      configurable: true,
    })
  })
}

test('1. the focus is inside the world while it loads, and Escape closes it then', async ({ page }) => {
  await szoftveresEngedely(page)
  await lassuKapcsolat(page)
  await page.addInitScript(() => {
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        const root = r.target
        if (root instanceof HTMLElement && root.classList.contains('vilag') && root.hasAttribute('data-nyitva')) {
          const toltes = root.querySelector<HTMLElement>('.vilag-toltes')
          window.__vilagNyitas = {
            toltes: Boolean(toltes && !toltes.hidden),
            bent: root.contains(document.activeElement),
          }
          obs.disconnect()
          return
        }
      }
    })
    obs.observe(document, { subtree: true, attributes: true, attributeFilter: ['data-nyitva'] })
  })
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 })
  await gomb.click()
  const dlg = dialog(page)
  await expect(dlg).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => page.evaluate(() => window.__vilagNyitas)).toEqual({ toltes: true, bent: true })
  expect(await dlg.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(gomb).toBeFocused()
  expect(await page.evaluate(() => document.activeElement === document.querySelector('[data-vilag-belepo]'))).toBe(true)
  await expect(page.locator('#top')).not.toHaveAttribute('inert')
  expect(await page.evaluate(() => document.getElementById('top')!.inert)).toBe(false)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
})

test('2. after loading the focus lands on the route slider unless the visitor moved it', async ({ page }) => {
  await szoftveresEngedely(page)
  await lassuKapcsolat(page)
  await page.goto('/')
  const gomb = belepo(page)
  await expect(gomb).toBeVisible()
  await gomb.click()
  const dlg = dialog(page)
  await expect(dlg).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.vilag-toltes')).toBeHidden({ timeout: 60_000 })
  const csuszka = dlg.locator('.vilag-mely input[type="range"]')
  await expect(csuszka).toBeFocused()
  expect(await dlg.evaluate((el) => document.activeElement === el.querySelector('.vilag-mely input[type="range"]'))).toBe(true)
})
