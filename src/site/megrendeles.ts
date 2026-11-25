// The page script of /megrendeles/. It imports no shared module: the theme key and shared-link re-align (keret.ts, the legal pages' entry), the contact end and the analytics are each
// a standalone script, the way main.ts loads its own: a `?worker&url` file that Vite bundles on its own, appended here at once (the files must not rely on worker globals). The extra `&megr`
// query gives this page its own bundle of each file: without it Vite would share the module between this entry and main.ts or the legal pages' entry as a chunk with a script tag in every
// page that uses it, and the other pages' script lists are fixed.
import keretUrl from './keret.ts?worker&url&megr'
import masoloUrl from './elemek/masolo-futtat.ts?worker&url&megr'
import meresUrl from './meres-futtat.ts?worker&url&megr'

function onalloModul(url: string) {
  const s = document.createElement('script')
  s.type = 'module' // the dev server serves it with ES imports; the built file is a self-contained IIFE that also runs as a module
  s.src = url
  document.head.append(s)
}

// Three appends, each on its own: one that throws must not keep the others from starting. The conditions are twins of main.ts (onalloModul, cimmezoBetoltes, meresBetoltes):
// change them there and here together (the same selectors, the same host test).
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
