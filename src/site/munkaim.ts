// The page script of /munkaim/. The theme key and shared-link re-align (keret.ts), the contact end and the analytics are each a standalone script, the way megrendeles.ts and main.ts load theirs:
// a `?worker&url` file that Vite bundles on its own, appended here at once (the files must not rely on worker globals). The extra `&munk` query gives this page its own module id for each file: without it
// Vite would share the module between this entry and another page's entry as a chunk with a script tag in every page that uses it, and the pages' script lists are fixed.
// The page itself is complete without any of this (the work blocks, the still of Rollin's station, the Évek diagram drawn and its table); this script adds the theme key, the copy key, the analytics,
// the drawing-in of Évek and the Rollin dock scene (src/rollin/), whose script is requested only when its block nears the viewport.
import keretUrl from './keret.ts?worker&url&munk'
import masoloUrl from './elemek/masolo-futtat.ts?worker&url&munk'
import meresUrl from './meres-futtat.ts?worker&url&munk'
import rollinUrl from '../rollin/rollin-futtat.ts?worker&url&munk'

function onalloModul(url: string, hiba?: () => void) {
  const s = document.createElement('script')
  if (hiba) s.addEventListener('error', hiba)
  s.type = 'module' // the dev server serves it with ES imports; the built file is a self-contained IIFE that also runs as a module
  s.src = url
  document.head.append(s)
}

// Each start on its own: one that throws must not keep the others from starting. The conditions are twins of megrendeles.ts and main.ts (the same selectors, the same host test).
try {
  onalloModul(keretUrl)
} catch {
  /* the page stays as the server rendered it: the system theme, no key */
}
try {
  if (document.querySelector('[data-cimmezo]')) onalloModul(masoloUrl)
} catch {
  /* the field with the address and both links stay as rendered */
}
try {
  if (document.querySelector('[data-esemeny]') || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) onalloModul(meresUrl)
} catch {
  /* no analytics */
}

// "Évek": drawn once, when 40 % of the diagram is in view (munkaim.css holds the states: data-var hides the channels, data-kesz draws them top to bottom). Under reduced motion, or without
// IntersectionObserver, nothing is hidden and the diagram stays as it was rendered.
try {
  const rajz = document.querySelector<HTMLElement>('[data-evek]')
  if (rajz && 'IntersectionObserver' in window && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    rajz.dataset.var = ''
    const figyelo = new IntersectionObserver(
      (bejegyzesek) => {
        if (!bejegyzesek.some((b) => b.isIntersecting)) return
        figyelo.disconnect()
        // two frames: the hidden state has been painted before the drawing starts
        requestAnimationFrame(() => requestAnimationFrame(() => (rajz.dataset.kesz = '')))
      },
      { threshold: 0.4 },
    )
    figyelo.observe(rajz)
  }
} catch {
  delete document.querySelector<HTMLElement>('[data-evek]')?.dataset.var
}

// Rollin's dock scene: the keys and the status line are in the page (disabled, script only); the drawing and the behaviour are one script of its own (src/rollin/rollin-futtat.ts), appended when the block comes within 600 px of the viewport.
// With Save-Data, without IntersectionObserver or when the script fails to load, the keys and the status line are removed and the still stays (a failure while the scene builds is handled by the script itself).
try {
  const blokk = document.getElementById('munka-rollin')
  const vez = blokk?.querySelector<HTMLElement>('[data-rollin-vez]')
  const rajz = blokk?.querySelector<HTMLElement>('[data-rollin-rajz]')
  if (blokk && vez) {
    const leszed = () => {
      vez.remove()
      rajz?.remove()
    }
    const adattakarek = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (adattakarek || !('IntersectionObserver' in window)) leszed()
    else {
      const figyelo = new IntersectionObserver(
        (bejegyzesek) => {
          if (!bejegyzesek.some((b) => b.isIntersecting)) return
          figyelo.disconnect()
          try {
            onalloModul(rollinUrl, leszed)
          } catch {
            leszed()
          }
        },
        { rootMargin: '600px 0px' },
      )
      figyelo.observe(blokk)
    }
  }
} catch {
  /* the still stays */
}
