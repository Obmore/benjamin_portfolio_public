// The cross-document view-transition opt-in, the one source of it. vite.config.ts puts it inline into the <head> of every
// HTML page the build processes (site pages and legal pages), right after <meta charset> and before any stylesheet link.
// It is inline on purpose: with the rule only in an external stylesheet, Chromium aborts the inbound transition with
// "InvalidStateError: ... ViewTransition opt-in disabled" whenever the stylesheet arrives late (slow runner or network).
// The rest of the page turn (::view-transition rules and keyframes) stays in src/site/lapcsere.css.
export const LAPCSERE_BEKAPCSOLAS = '<style>@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }</style>'

const CHARSET = /<meta\s+charset=[^>]*>/i

/** Inserts the opt-in right after <meta charset> (which must stay within the first 1024 bytes). Throws without a charset tag. */
export function withLapcsereBekapcsolas(html: string): string {
  const match = CHARSET.exec(html)
  if (!match) throw new Error('withLapcsereBekapcsolas: no <meta charset> in the page')
  const end = match.index + match[0].length
  return html.slice(0, end) + LAPCSERE_BEKAPCSOLAS + html.slice(end)
}
