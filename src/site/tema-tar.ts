// The theme behaviour the home page's switch (src/site/fooldal/tema.ts) and the other pages' switch (src/site/keret.ts) share: the stored choice
// (key, the two valid values, blocked-storage handling), "chosen during this visit", following the system, the browser's theme-color and the
// switch's reflected state. The head snippet (src/site/jel-fej.ts) runs before any module, so it carries an inline copy of the read and takes
// only the key and the valid values from tema-kulcs.ts (DOM-free, so the build side can import it without the DOM types).

import { TEMA_ERTEKEK, TEMA_KULCS, type Tema } from './tema-kulcs.ts'
export type { Tema }

// Set when the visitor chose a theme during this visit: from then on the page no longer follows the system (also with a blocked storage).
let valasztott = false

/** The stored choice, or null when there is none, it is not a valid value, or the storage is blocked. */
function taroltTema(): Tema | null {
  try {
    const t = localStorage.getItem(TEMA_KULCS)
    return TEMA_ERTEKEK.find((v) => v === t) ?? null
  } catch {
    return null // blocked storage: nothing is stored
  }
}

/** Remembers the visitor's choice (and that it was made this visit); a blocked or full storage only means it is not kept. */
export function tarolTema(t: Tema): void {
  valasztott = true
  try {
    localStorage.setItem(TEMA_KULCS, t)
  } catch {
    /* blocked or full storage: the choice just is not kept */
  }
}

/** Calls `fn` when the system theme changes, only while the visitor has made no choice this visit and none is stored. */
export function kovesdARendszert(fn: (t: Tema) => void, signal?: AbortSignal): void {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!valasztott && taroltTema() === null) fn(e.matches ? 'sotet' : 'vilagos')
  }, { signal })
}

/** The browser's theme-color follows the theme (every meta that has a media query), in the paper colour of that theme. */
export function bongeszoSzin(): void {
  const papir = getComputedStyle(document.documentElement).getPropertyValue('--papir').trim()
  if (!papir) return
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')) m.content = papir
}

/** Shows the theme on the "Sötét mód" key (checked = dark; the key's look follows aria-checked). */
export function kapcsoloAllapot(gomb: Element, sotet: boolean): void {
  gomb.setAttribute('aria-checked', String(sotet))
}
