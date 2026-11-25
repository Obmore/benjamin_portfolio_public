// The shared head of every page and of the four demos: the one source of the theme snippet and
// of the colours it needs. vite.config.ts puts it into the <head> of every page the build processes and, after the build, into the demos.
// No colour is typed here or in a page template: the paper colours for the browser chrome and the strip's colours are read from
// src/site/fooldal/jel-tokens.css, the only place the palette is declared.

import { TEMA_ERTEKEK, TEMA_KULCS } from './tema-kulcs.ts'

const MEZOK = ['papir', 'lap', 'tinta', 'kezel'] as const
type Mezo = (typeof MEZOK)[number]
export type TemaErtekek = Record<'vilagos' | 'sotet', Record<Mezo, string>>

// Selectors are compared after the same normalisation (whitespace runs, spaces around , ( ) = and inside [ ], single quotes as double).
const norm = (s: string) =>
  s.replace(/\s+/g, ' ').replace(/'/g, '"').replace(/ ?([,=)]) ?/g, '$1').replace(/([([]) /g, '$1').replace(/ \]/g, ']').trim()
const SZELEKTOR = {
  vilagos: norm(':root:not([data-tema="sotet"]),:root [data-tema="vilagos"]'),
  sotet: norm(':root[data-tema="sotet"],:root [data-tema="sotet"]'),
} as const

/**
 * Every `selector { declarations }` block of the CSS at any depth (inside @media / @supports too). `torzs` is the block's own declaration text:
 * nested blocks are left out. Comments are dropped and strings are copied whole (with backslash escapes) in the same pass, so braces and `/*`
 * inside the grain data URLs are text; an unquoted url(...) is copied whole up to its `)`. Limitation: escapes inside an unquoted url().
 */
function szabalyok(css: string): { szelektor: string; torzs: string }[] {
  const ki: { szelektor: string; torzs: string }[] = []
  const verem = [{ szelektor: '', torzs: '', fuggo: '' }] // the first frame is the file itself
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    const felso = verem[verem.length - 1]
    if (c === '/' && css[i + 1] === '*') {
      const vege = css.indexOf('*/', i + 2)
      i = vege < 0 ? css.length : vege + 1
    } else if (css.startsWith('url(', i) && !/^url\(\s*["']/.test(css.slice(i, i + 12))) {
      const vege = css.indexOf(')', i)
      felso.fuggo += css.slice(i, vege < 0 ? css.length : vege + 1)
      i = vege < 0 ? css.length : vege
    } else if (c === '"' || c === "'") {
      let j = i + 1
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1
      felso.fuggo += css.slice(i, j + 1)
      i = j
    } else if (c === '{') {
      verem.push({ szelektor: norm(felso.fuggo), torzs: '', fuggo: '' })
      felso.fuggo = ''
    } else if (c === '}' && verem.length > 1) {
      felso.torzs += felso.fuggo
      ki.push({ szelektor: felso.szelektor, torzs: felso.torzs })
      verem.pop()
      verem[verem.length - 1].fuggo = ''
    } else if (c === ';') {
      felso.torzs += felso.fuggo + ';'
      felso.fuggo = ''
    } else felso.fuggo += c
  }
  return ki
}

/** Reads the sRGB hex values of the four tokens the page chrome needs, per theme, from the token file's text. */
export function temaErtekek(css: string): TemaErtekek {
  const mind = szabalyok(css)
  const ki = {} as TemaErtekek
  for (const nev of ['vilagos', 'sotet'] as const) {
    const blokkok = mind.filter((s) => s.szelektor === SZELEKTOR[nev]).map((s) => s.torzs)
    if (!blokkok.length) throw new Error(`jel-fej: the ${nev} token rule was not found in jel-tokens.css`)
    ki[nev] = {} as Record<Mezo, string>
    for (const mezo of MEZOK) {
      // Every hex declaration of the token in every block with the exact selector: none or two different values throw, never a silent pick.
      // A restatement in another notation (the P3 oklch blocks) is not a hex value and is ignored; an identical hex restatement passes.
      const re = new RegExp(`(?:^|[\\s;])--${mezo}\\s*:\\s*(#[0-9a-fA-F]{6})(?![0-9a-fA-F])`, 'g')
      const gyujt = new Map<string, string>() // lower-case value -> first spelling
      for (const b of blokkok) for (const m of b.matchAll(re)) if (!gyujt.has(m[1].toLowerCase())) gyujt.set(m[1].toLowerCase(), m[1])
      const ertekek = [...gyujt.values()]
      if (!ertekek.length) throw new Error(`jel-fej: --${mezo} (${nev}) is not a hex value in jel-tokens.css`)
      if (ertekek.length > 1) throw new Error(`jel-fej: --${mezo} (${nev}) has different hex values in jel-tokens.css: ${ertekek.join(', ')}`)
      ki[nev][mezo] = ertekek[0]
    }
  }
  return ki
}

/**
 * Before first paint: the "js" class and the theme: the visitor's stored choice (the "Sötét mód" key remembers it under "jel-tema"), else the
 * system's. A blocked or empty storage is not an error. With `metak`, a stored choice also sets the browser's colour (every theme-color meta that
 * has a media query) to the paper colour of that theme. Without script the pages follow the system through prefers-color-scheme in jel-tokens.css.
 */
function temaSzkript(ertekek: TemaErtekek, metak: boolean): string {
  const papir = JSON.stringify({ sotet: ertekek.sotet.papir, vilagos: ertekek.vilagos.papir })
  return `<script>
      (function () {
        var r = document.documentElement
        r.classList.add('js')
        var t = null
        try { t = localStorage.getItem('${TEMA_KULCS}') } catch (e) {}
        var tarolt = ${JSON.stringify(TEMA_ERTEKEK)}.indexOf(t) >= 0
        if (!tarolt) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'sotet' : 'vilagos'
        r.setAttribute('data-tema', t)${
          metak
            ? `
        if (tarolt) {
          var c = ${papir}[t]
          ;[].forEach.call(document.querySelectorAll('meta[name="theme-color"][media]'), function (m) { m.setAttribute('content', c) })
        }`
            : ''
        }
      })()
    </script>`
}

/** The two theme-color metas with their media queries, in the paper colour of each theme. */
function temaMetak(ertekek: TemaErtekek): string {
  return [
    `<meta name="theme-color" content="${ertekek.vilagos.papir}" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="${ertekek.sotet.papir}" media="(prefers-color-scheme: dark)" />`,
  ].join('\n    ')
}

const FEJ_VEGE = /<\/head>/i
const JELZO = 'data-jel-fej'

/** The shared head: the theme-color metas (site pages only: a demo keeps its own) and the theme snippet. */
export function jelFejResz(ertekek: TemaErtekek, oldal: boolean): string {
  const szkript = temaSzkript(ertekek, oldal).replace('<script>', `<script ${JELZO}>`)
  return (oldal ? `${temaMetak(ertekek)}\n    ` : '') + szkript
}

/**
 * Puts the shared head before </head> (the built demos). A page that already has it is returned as it is, so a build and a rebuild give the
 * same file. Throws without a </head>.
 */
export function jelFejjel(html: string, ertekek: TemaErtekek, oldal: boolean): string {
  if (html.includes(JELZO)) return html
  if (!FEJ_VEGE.test(html)) throw new Error('jelFejjel: no </head> in the page')
  return html.replace(FEJ_VEGE, () => jelFejResz(ertekek, oldal) + '\n  </head>')
}
