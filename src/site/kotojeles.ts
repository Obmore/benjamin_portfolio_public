// Keeps hyphenated compounds ("QR-kód", "e-mailes") on one line in headings (h1-h4), summaries, buttons
// and the entry-package name. A render-time transform of the HTML string: it wraps each compound in
// `<span class="nb">` (white-space: nowrap in the page stylesheets). Only text nodes change; the text content stays
// identical. Dependency-free so that `node --test` can import it (scripts/kotojeles.test.mjs).
//
// Contract: running it twice gives the same output (text already inside a `.nb` span is skipped).

// `gomb` (and `btn`, the home page's button) and `belepo-nev` are matched as whole space-separated class tokens (so `gomb-alatt` is not a button).
const OSZTALY = (nev: string) => String.raw`class="(?:[^"]*\s)?${nev}(?:\s[^"]*)?"`
const BLOKK = new RegExp(
  String.raw`<(h[1-4]|button|summary)\b[^>]*>[\s\S]*?<\/\1>` +
    String.raw`|<a\b[^>]*${OSZTALY('(?:gomb|btn)')}[^>]*>[\s\S]*?<\/a>` +
    String.raw`|<span\b[^>]*${OSZTALY('belepo-nev')}[^>]*>[\s\S]*?<\/span>`,
  'g',
)
const KOTOJELES = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu
const URES = new Set(['br', 'hr', 'img', 'input', 'wbr', 'meta', 'link', 'source', 'col', 'area', 'base', 'embed', 'param', 'track'])
const KIHAGYOTT = new Set(['svg', 'script', 'style'])
const GOMB_OSZTALY = new RegExp(OSZTALY('(?:gomb|btn)'))

interface Elem {
  nb: boolean // inside a `.nb` span: already wrapped
  kihagy: boolean // inside svg, script or style: text there must stay as it is
  gomb: boolean // the element itself is a button or a `.gomb` link (an inline-flex box)
}

function atalakit(bent: string, kulso: boolean): string {
  const ki: string[] = []
  const verem: Elem[] = []
  let futas: string[] = []
  let van = false
  // The block's own element is the parent of text outside any nested tag.
  const szulo = (): Elem => verem[verem.length - 1] ?? { nb: false, kihagy: false, gomb: kulso }
  const lezar = () => {
    const szoveg = futas.join('')
    // A button is an inline-flex box: a nested span would split its text into separate flex items (and
    // collapse the spaces at their edges), so a text run directly inside a button or `.gomb` link that got a
    // compound is enclosed whole in one span, wherever the button sits (also nested in a heading).
    ki.push(szulo().gomb && van ? `<span>${szoveg}</span>` : szoveg)
    futas = []
    van = false
  }
  for (const [i, resz] of bent.split(/(<[^>]*>|&[#\w]+;)/).entries()) {
    if (resz === '') continue
    if (i % 2 === 1 && resz.startsWith('<')) {
      lezar()
      ki.push(resz)
      if (resz.startsWith('<!')) continue
      const nev = /^<\/?([a-zA-Z0-9]+)/.exec(resz)?.[1]?.toLowerCase() ?? ''
      if (resz.startsWith('</')) verem.pop()
      else if (!resz.endsWith('/>') && !URES.has(nev)) {
        const fent = szulo()
        verem.push({
          nb: fent.nb || /class="nb"/.test(resz),
          kihagy: fent.kihagy || KIHAGYOTT.has(nev),
          gomb: nev === 'button' || (nev === 'a' && GOMB_OSZTALY.test(resz)),
        })
      }
      continue
    }
    const fent = szulo()
    const uj = i % 2 === 1 || fent.nb || fent.kihagy ? resz : resz.replace(KOTOJELES, '<span class="nb">$&</span>')
    futas.push(uj)
    if (uj !== resz) van = true
  }
  lezar()
  return ki.join('')
}

export function kotojelesekEgyben(html: string): string {
  return html.replace(BLOKK, (blokk) => {
    const nyito = /^<[^>]*>/.exec(blokk)![0]
    const zaro = /<\/[a-z0-9]+>$/.exec(blokk)![0]
    const bent = blokk.slice(nyito.length, blokk.length - zaro.length)
    return nyito + atalakit(bent, /^<(a|button)\b/.test(nyito)) + zaro
  })
}
