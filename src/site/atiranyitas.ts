// The static redirect stub written for every entry of src/content/atiranyitasok.ts, the fallback script of 404.html generated from the same list, and
// the list's own checks. The stub shows for a split second, in the visitor's theme (the shared head). Emitted at build time only: the dev server has none.
import type { Atiranyitas } from '../content/atiranyitasok.ts'
import { jelFejResz, type TemaErtekek } from './jel-fej.ts'

export const ATIRANYITAS_HELYE = 'https://ottbenjamin.hu'

/** Text for an HTML attribute value or an element's text. */
export function atiranyitasHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A JSON string literal that is safe inside an inline script: no "</script>" and no "<!--" can come out of it. */
export function atiranyitasSzoveg(s: string): string {
  return JSON.stringify(s).replace(/</g, '\\u003c')
}

/** The path of a target without its #hash, and the hash with its "#" ('' when there is none). */
function szetvalaszt(to: string): [string, string] {
  const i = to.indexOf('#')
  return i < 0 ? [to, ''] : [to.slice(0, i), to.slice(i)]
}

/** The argument of location.replace for a target: its path, the visitor's query, and the hash: the target's own when it has one (an old incoming hash has no target on the new page), else the visitor's. */
export function csereKifejezes(to: string): string {
  const [ut, hash] = szetvalaszt(to)
  return `${atiranyitasSzoveg(ut)} + location.search + ${hash ? atiranyitasSzoveg(hash) : 'location.hash'}`
}

/**
 * The script inside 404.html for the spellings no stub covers (another letter case, the accented spelling, a missing trailing slash): the requested path is
 * decoded, NFC-normalised, lower-cased and given exactly one trailing slash; if it is the `from` of an entry the visitor goes to its `to`.
 */
export function atiranyitasVisszaesesiSzkript(lista: readonly Atiranyitas[]): string {
  const tabla = Object.fromEntries(lista.map((a) => [a.from.normalize('NFC').toLowerCase(), a.to]))
  return `<script>
      (function () {
        var p = location.pathname
        try {
          p = decodeURIComponent(p)
        } catch (e) {}
        var t = ${JSON.stringify(tabla).replace(/</g, '\\u003c')}[p.normalize('NFC').replace(/\\/+$/, '').toLowerCase() + '/']
        if (t) {
          var i = t.indexOf('#')
          location.replace((i < 0 ? t : t.slice(0, i)) + location.search + (i < 0 ? location.hash : t.slice(i)))
        }
      })()
    </script>`
}

/** What is wrong with the list itself (empty when it is fine): the shape of each entry and duplicate `from` paths (compared the way the fallback compares). */
export function atiranyitasHibak(lista: readonly Atiranyitas[]): string[] {
  const hibak: string[] = []
  const latott = new Set<string>()
  for (const a of lista) {
    if (!/^\/[^?#\\]*\/$/.test(a.from) || a.from === '/' || a.from.includes('//') || a.from.includes('/./') || a.from.includes('/../')) hibak.push(`from ${JSON.stringify(a.from)} must be a plain path with a leading and a trailing slash (no //, /./, /../ or backslash)`)
    if (!/^\/(?!\/)/.test(a.to) || a.to.includes('\\') || a.to.includes('?') || a.to.indexOf('#') !== a.to.lastIndexOf('#')) hibak.push(`to ${JSON.stringify(a.to)} must be a site path with at most one #hash, no ?query (the visitor's query is kept), no // start and no backslash`)
    const keres = (s: string) => s.normalize('NFC').toLowerCase()
    const celUt = szetvalaszt(a.to)[0]
    if (keres(celUt) === keres(a.from)) hibak.push(`from ${JSON.stringify(a.from)} redirects to itself`)
    if (lista.some((b) => keres(b.from) === keres(celUt))) hibak.push(`to ${JSON.stringify(a.to)} is itself a from of the list (a chain or a loop)`)
    const kulcs = a.from.normalize('NFC').toLowerCase()
    if (latott.has(kulcs)) hibak.push(`from ${JSON.stringify(a.from)} is listed twice (case and accents normalised)`)
    latott.add(kulcs)
    if (!a.cim || !a.link) hibak.push(`entry ${JSON.stringify(a.from)} needs a cim and a link`)
  }
  return hibak
}

/** The stub's HTML. Meta refresh for no-script clients, a script that keeps the query and, unless the target carries a hash of its own (which then replaces the visitor's), the hash, a visible link as the last resort. */
export function atiranyitasOldal(a: Atiranyitas, ertekek: TemaErtekek): string {
  const [ut] = szetvalaszt(a.to)
  return `<!doctype html>
<html lang="hu">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${atiranyitasHtml(a.to)}" />
    <link rel="canonical" href="${ATIRANYITAS_HELYE}${atiranyitasHtml(ut)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title>${atiranyitasHtml(a.cim)}</title>
    ${jelFejResz(ertekek, true)}
    <script>
      location.replace(${csereKifejezes(a.to)})
    </script>
  </head>
  <body>
    <p><a href="${atiranyitasHtml(a.to)}">${atiranyitasHtml(a.link)}</a></p>
  </body>
</html>
`
}
