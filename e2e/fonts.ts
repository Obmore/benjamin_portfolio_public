import type { Page, TestInfo } from '@playwright/test'

/**
 * Waits for the web fonts the page is using, so that a reference position is taken after the font swap. Only faces whose status is
 * `loading` are awaited, in passes; after two animation frames (a rAF callback runs before that frame's style and layout, so a used face that only starts
 * loading at the next layout is not yet `loading` after one) there is one more pass. Forcing every declared face to load can hang in WebKit on a face the page never uses, so that is not done. The wait is capped
 * inside the page (an engine promise that never settles must not hang the test); a hit cap is recorded as an annotation.
 */
export async function waitForPageFonts(page: Page, info: TestInfo, cap = 5000) {
  const capped = await page.evaluate(async (limit) => {
    let timer = 0
    const settled = (async () => {
      // Loading faces first (a second pass catches faces that started loading meanwhile).
      const loadingFaces = async () => {
        for (let pass = 0; pass < 3; pass++) {
          const loading = [...document.fonts].filter((face) => face.status === 'loading')
          if (!loading.length) break
          await Promise.all(loading.map((face) => face.loaded.catch(() => undefined)))
        }
      }
      await loadingFaces()
      // A used face that only starts loading at the next layout is awaited too: the first frame lays out, the second callback sees the result.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await loadingFaces()
      await document.fonts.ready
      return false
    })()
    const timeout = new Promise<boolean>((resolve) => {
      timer = window.setTimeout(() => resolve(true), limit)
    })
    const hit = await Promise.race([settled, timeout])
    clearTimeout(timer)
    return hit
  }, cap)
  if (capped) info.annotations.push({ type: 'fonts', description: `the font wait hit its ${cap} ms cap` })
}
