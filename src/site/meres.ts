import { SITE_URL } from '../content/alapadatok.ts'
import { ANALITIKA, type Analitika } from '../content/beallitasok.ts'

// Cookieless visitor analytics (Umami Cloud, see ANALITIKA in src/content/beallitasok.ts): the loader and the
// button-click events. Both are small and never throw: a missing or blocked script must not change how the page works.

/** The only hosts that send measurements: the canonical site host and its www form. Local runs, previews and tests send nothing. */
const GAZDA = new URL(SITE_URL).hostname
const ELES_GAZDAK = [GAZDA, `www.${GAZDA}`]

/** The visitor's opt-out signals (Do Not Track, Global Privacy Control). Any one of them keeps the script away. */
export interface Jelzesek {
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}
export function kikapcsolt(nav: Jelzesek, win: Jelzesek): boolean {
  return nav.doNotTrack === '1' || win.doNotTrack === '1' || nav.globalPrivacyControl === true
}

/**
 * Adds the analytics script to the head on a production host unless the visitor sent an opt-out signal; returns the element,
 * or null when nothing was added. data-do-not-track is Umami's own switch (also honoured by the script itself).
 */
export function mereshezBetolt(beallitas: Analitika | null, gazda: string, doc: Document, nav: Jelzesek = {}, win: Jelzesek = {}): HTMLScriptElement | null {
  if (!beallitas || !ELES_GAZDAK.includes(gazda) || kikapcsolt(nav, win)) return null
  const jel = doc.createElement('script')
  // A script inserted by script is async by default and `defer` does nothing on it: async is the honest setting.
  jel.async = true
  jel.src = beallitas.szkript
  jel.setAttribute('data-website-id', beallitas.azonosito)
  jel.setAttribute('data-do-not-track', 'true')
  doc.head.appendChild(jel)
  return jel
}

/**
 * One delegated click listener: a click inside an element with data-esemeny reports that value. Not data-umami-event: with
 * that attribute Umami stops the element's other listeners, and the tab and copy handlers must keep working. The listener
 * only reads; it never prevents the default action, so links and mailto addresses open as before.
 */
export function esemenyKovetes(doc: Document, win: Window & { umami?: { track?: (nev: string) => void } }): void {
  doc.addEventListener(
    'click',
    (e) => {
      try {
        const cel = e.target instanceof Element ? e.target.closest('[data-esemeny]') : null
        const nev = cel?.getAttribute('data-esemeny')
        if (nev) win.umami?.track?.(nev)
      } catch {
        /* a measuring failure must never reach the visitor */
      }
    },
    { capture: true, passive: true },
  )
}

export function meresIndit(): void {
  esemenyKovetes(document, window)
  mereshezBetolt(ANALITIKA, location.hostname, document, navigator as Jelzesek, window as unknown as Jelzesek)
}
