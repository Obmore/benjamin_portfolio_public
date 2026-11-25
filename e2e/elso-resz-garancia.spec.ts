import { expect, test } from '@playwright/test'

// The risk-reversal promise on every entry package (owner's decision, 2026-11-10): "Ha az első rész nem válik be, nem fizet."
// At each entry package panel on /megrendeles/ (the four offer pages are merged into them, PR 6), and defined in the terms (/aszf/).

const PROMISE = 'Ha az első rész nem válik be, nem fizet.'

const SEGMENTS = [
  ['termekleiras', 'az első 5 termékleírás'],
  ['gepkonyv', 'a gép útmutatójának első fejezete'],
  ['lapszabaszat', 'a megrendelőlap tervezete'],
  ['bemutatkozo', 'az oldal terve'],
] as const

const WIDTHS = [360, 1280] as const

async function noOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0)
}

test.describe('first-part guarantee', () => {
  for (const width of WIDTHS) {
    test(`/megrendeles/ at ${width}: each entry package panel carries the promise in bold and its first part as a link to the terms`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 360 ? 780 : 800 })
      await page.goto('/megrendeles/', { waitUntil: 'networkidle' })
      for (const [id, part] of SEGMENTS) {
        const panel = page.locator(`#szolgaltatas-${id}`)
        const promise = panel.locator('.adl-gar')
        await expect(promise, id).toHaveCount(1)
        await expect(promise, id).toBeVisible()
        await expect(promise, id).toHaveText(PROMISE)
        expect(Number(await promise.evaluate((e) => getComputedStyle(e).fontWeight)), `${id}: the promise is bold`).toBeGreaterThanOrEqual(600)
        const link = panel.locator('a.adl-link')
        await expect(link, id).toContainText(part)
        await expect(link, id).toHaveAttribute('href', '/aszf/#elso-resz')
        const box = (await link.boundingBox())!
        expect(box.x + box.width, `${id} stays inside the viewport`).toBeLessThanOrEqual(width)
        const under = (await promise.boundingBox())!
        expect(box.y, `${id}: the first part stands under the promise`).toBeGreaterThanOrEqual(under.y + under.height - 1)
      }
      await expect(page.locator('#belepo-csomagok .adl-gar')).toHaveCount(4)
      await noOverflow(page)
    })
  }

  test('/aszf/ defines the first part per package and the decision', async ({ page }) => {
    await page.goto('/aszf/')
    const main = page.locator('main')
    await expect(main).toContainText('Az első rész és a Megrendelő döntése')
    for (const part of ['az első 5 termékleírás', 'első fejezete', 'a megrendelőlap tervezete', 'az oldal terve']) {
      await expect(main, part).toContainText(part)
    }
    await expect(main).toContainText('8 munkanapon belül írásban (e-mailben is) jelezheti, hogy nem folytatja a munkát')
    await expect(main).toContainText('az átadott első részt nem használhatja fel')
    await expect(main).toContainText('A Megrendelő a határidő előtt írásban (e-mailben is) el is fogadhatja az első részt.')
    await expect(main).toContainText('Az első részhez külön javítási kör nincs')
    await expect(main).toContainText('rájuk a 3. pont első részre vonatkozó szabályai érvényesek.')
    await expect(main).toContainText('(a kettő közül a későbbi)')
    // The advance rules of every other package stay as they were; the new rules are an exception for the four entry packages.
    await expect(main).toContainText('a szerződés akkor jön létre, amikor a Megrendelő a visszaigazolást vagy az ajánlatot írásban (e-mailben is) elfogadja, és megfizeti az abban meghatározott előleget')
    await expect(main).toContainText('ha előleg tartozik hozzá, az előleg beérkezése után is (a négy belépő csomag kivételével, lásd alább).')
    await expect(main).toContainText('Kivétel a négy belépő csomag („Termékleírás-próbakör”, „Egy gép, egy útmutató”, „Saját megrendelőlap”, „Bemutatkozó oldal”)')
    await expect(main).toContainText('Ha a csomag díja eléri az előleg alsó határát, a Vállalkozó az 50%-os előleget azután számlázza, hogy a Megrendelő az első részt elfogadta (hallgatás esetén: a határidő lejártát követően).')
    await expect(main).not.toContainText('Az előleget a Megrendelő a számlán feltüntetett határidőn belül fizeti meg.')
    await expect(main).not.toContainText('Visszatérítés nincs')
    await expect(main).not.toContainText('nem várja meg')
    await expect(main).toContainText('Az első rész átadása nem minősül a 4. pont szerinti átadásnak, és a 6. pont szerinti határidőt nem indítja el')
    await expect(main).toContainText('Az első rész elfogadása a 6. pont szerinti hibajavítást nem érinti.')
    await expect(main).toContainText('a Vállalkozó a tőle kapott anyagokat a Megrendelő kérésére törli.')
    await expect(main).toContainText('Az első rész szabályai arra a megrendelésre vonatkoznak, amelynek visszaigazolását vagy ajánlatát a Megrendelő 2026. november 10-én vagy később fogadta el.')
    await expect(page.locator('#elso-resz')).toHaveCount(1)
    await expect(page.locator('.pr-szoveg > p:first-child')).toContainText('3. pontban szereplő első részre (ha a Megrendelő az első rész átadásától számított 8 munkanapon belül nem jelzi, hogy nem folytatja a munkát, az első részt elfogadottnak kell tekinteni)')
  })
})
