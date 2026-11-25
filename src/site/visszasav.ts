// The return strip of the four demos under /demos/ (design system 5.18): the one edge of the site on a demo, his mark and one link. The demos are
// self-contained files under public/demos/ that the build copies as they are, so vite.config.ts puts the strip in after the build (the same way as the page-turn
// opt-in): a head part (fonts, the strip's colours per theme, print) and the strip itself as the first element of <body>.
// The strip is a declarative shadow root: nothing of the demo's own CSS reaches it and it reaches nothing of the demo, and it shows without script.
// Its colours are custom properties of the host that follow the theme the shared head snippet sets on <html> (data-tema; no stored choice: the system's);
// the values come from jel-tokens.css (src/site/jel-fej.ts). The demo's document gets no colour-scheme and no token file.

import { OB_UT } from './ob-jel.ts'
import { jelFejjel, type TemaErtekek } from './jel-fej.ts'

export interface DemoSav {
  /** The link's label (existing copy). */
  felirat: string
  /** Where it goes: the demo's plate on /megrendeles/ (the target the demo's own back link had), or the home page. */
  cel: string
  /** One link around mark and label (a demo with no plate of its own), instead of the mark's own link plus the label's link. */
  egy?: boolean
}

export const DEMO_SAV: Record<string, DemoSav> = {
  adatgyujto: { felirat: 'Vissza az ajánlathoz', cel: '/megrendeles/#szolgaltatas-adatok' },
  kezikonyv: { felirat: 'Vissza az ajánlathoz', cel: '/megrendeles/#szolgaltatas-gepkonyv' },
  lapszabaszat: { felirat: 'Vissza az ajánlathoz', cel: '/megrendeles/#szolgaltatas-lapszabaszat' },
  tudaslap: { felirat: 'Ott Benjámin főoldala', cel: '/', egy: true },
}

const JELOLO = 'data-ob-sav'
const NEV = 'Ott Benjámin'
const MARK_NEV = `${NEV}, főoldal`

function temaBlokk(t: TemaErtekek['vilagos']): string {
  return `--papir:${t.papir};--lap:${t.lap};--tinta:${t.tinta};--kezel:${t.kezel}`
}

/** The head part: the strip's own font name, the host's colours per theme, and its place in print (none). */
export function savFej(ertekek: TemaErtekek): string {
  return `<style ${JELOLO}>
      @font-face{font-family:'ObArchivo';font-style:normal;font-weight:400 800;font-stretch:68% 112%;font-display:block;src:url(/fonts/archivo-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191-2193,U+2197,U+2212,U+2215,U+2713}
      @font-face{font-family:'ObArchivo';font-style:normal;font-weight:400 800;font-stretch:68% 112%;font-display:block;src:url(/fonts/archivo-latin-ext.woff2) format('woff2');unicode-range:U+0150-0151,U+0170-0171}
      #ob-sav{display:block;width:100%;flex:none;grid-column:1/-1;margin:0;padding:0;${temaBlokk(ertekek.vilagos)}}
      :root[data-tema="sotet"] #ob-sav{${temaBlokk(ertekek.sotet)}}
      @media (prefers-color-scheme:dark){:root:not([data-tema]) #ob-sav{${temaBlokk(ertekek.sotet)}}}
      @media print{#ob-sav{display:none}}
    </style>`
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.sav{height:44px;background:var(--lap);border-bottom:1.5px solid var(--tinta);font-family:ObArchivo,Arial,sans-serif;font-weight:400;font-stretch:100%;font-size:16px;line-height:22px;color:var(--tinta);-webkit-text-size-adjust:100%}
.be{max-width:1280px;height:100%;margin:0 auto;padding:0 16px;display:flex;align-items:flex-start;gap:12px}
@media (min-width:727px){.be{padding:0 64px;gap:16px}}
@media (max-width:359px){.be{padding:0 12px;gap:8px}}
.m{display:block;width:32px;height:32px;line-height:0;flex:none;margin-top:6px}
.m svg{display:block;width:32px;height:32px}
a{text-decoration:none}
.vissza{position:relative;display:inline-flex;align-items:flex-start;gap:12px;min-height:44px;margin-bottom:-1.5px;color:var(--kezel);font-weight:650;white-space:nowrap}
.vissza:after{content:"";position:absolute;left:0;right:0;bottom:11px;height:2px;background:var(--kezel)}
.vissza.egy{gap:16px}.vissza.egy:after{left:48px}
.t{align-self:center}
@media (max-width:726px){.vissza.egy{gap:12px}.vissza.egy:after{left:44px}}
@media (max-width:359px){.vissza{font-size:15px}}
a:focus-visible{outline:3px solid var(--kezel);outline-offset:3px;border-radius:0}
@media (prefers-reduced-motion:no-preference){.vissza:hover:after,.vissza:focus-visible:after{animation:ujra 160ms linear}@keyframes ujra{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}}
`.replace(/\n/g, '')

const JEL_SVG = `<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false"><rect width="64" height="64" fill="var(--tinta)"/><path fill="var(--papir)" d="${OB_UT}"/></svg>`

/** The strip: the first element of <body>. */
export function savTest(demo: DemoSav, ugras = ''): string {
  // The skip link is slotted by name; the fallback link (below) has no slot, so it is rendered only where the shadow root did not attach.
  const tartalom = demo.egy
    ? `<a class="vissza egy" href="${demo.cel}"><span class="m" aria-hidden="true">${JEL_SVG}</span><span class="t">${demo.felirat}</span></a>`
    : `<a class="m" href="/" aria-label="${MARK_NEV}">${JEL_SVG}</a><a class="vissza" href="${demo.cel}"><span class="t">${demo.felirat}</span></a>`
  return `<div id="ob-sav" role="navigation" aria-label="${NEV}" ${JELOLO}><template shadowrootmode="open"><style>${CSS}</style><slot name="ugras"></slot><div class="sav"><div class="be">${tartalom}</div></div></template>${ugras.replace('<a class="skip"', '<a slot="ugras" class="skip"')}<a href="${demo.cel}" data-ob-sav-fallback>${demo.felirat}</a></div>`
}

/** A built demo page with the shared head and the strip. Idempotent; throws when the page has no <head> or no <body>. */
export function demoKerettel(html: string, nev: string, ertekek: TemaErtekek): string {
  const demo = DEMO_SAV[nev]
  if (!demo) throw new Error(`demoKerettel: no strip is defined for the demo "${nev}"`)
  if (html.includes(JELOLO)) return html
  const fejjel = jelFejjel(html, ertekek, false).replace(/<\/head>/i, () => savFej(ertekek) + '\n  </head>')
  if (!/<body[^>]*>/i.test(fejjel)) throw new Error(`demoKerettel: no <body> in the demo "${nev}"`)
  // The demo's own skip link (when it has one) moves into the strip's navigation landmark as a slotted child: it stays the first focusable thing and is
  // not content outside a landmark; it is out of flow until it has focus, so the strip is still the first thing in the layout. Browsers without declarative shadow DOM
  // (Firefox before 123, Safari before 16.4) do not attach the shadow root: they render the host's light children, the skip link and one plain link back.
  let ugras = ''
  const elotte = fejjel.replace(/(<body[^>]*>)\s*(<a class="skip"[^>]*>[^<]*<\/a>)?/i, (_m, nyito: string, skip?: string) => {
    ugras = skip ?? ''
    return nyito
  })
  // A demo that has a skip link and it was not taken would silently keep a landmark-less skip link: fail the build instead.
  if (/class="skip"/.test(elotte.slice(elotte.search(/<body/i))) && !ugras) throw new Error(`demoKerettel: the skip link of the demo "${nev}" is not the first child of <body>`)
  return elotte.replace(/<body[^>]*>/i, (nyito) => nyito + savTest(demo, ugras))
}
