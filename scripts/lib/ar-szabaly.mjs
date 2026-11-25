// The "no typed price in built JS" rule of check-megrendeles.mjs, kept apart so that it can be unit-tested.
// Two shapes of a price are caught; a bare minifier identifier named "Ft" [function Ft(, ,Ft=, Ft.x, t1.Ft(] is neither.
// 1. A typed amount: digits (groups separated by a dot or a space), then the currency as a whole word. The amount must not
//    continue an identifier (x1Ft).
// 2. A run-time formatted amount has no digit beside the currency: a string or template fragment that starts with it
//    (" Ft" in quotes, or `${grouped} Ft` in a template).
// Known limit: a template that puts the currency right after an interpolation with no space (${n}Ft, or ${grouped}${space}Ft as
// formatHuf in src/data/pricing.ts builds it) is not caught, as the old " Ft" substring rule did not catch it either: }Ft is also
// what minified code produces before an identifier named Ft.
// A bare "Ft" string literal (an object key, a label) fails the gate on purpose: client JS has no business formatting currency.
// A space is any of: plain, NBSP, thin, narrow NBSP, the entities &nbsp; and &#160;, and the same characters written as
// backslash escapes in JS source text (xa0, u00a0, u2009, u202f after the backslash).
const SP = String.raw`(?: | | | |&nbsp;|&#160;|\\x[aA]0|\\u00[aA]0|\\u2009|\\u202[fF])`
const TYPED_AMOUNT = new RegExp(String.raw`(?<![\w$])\d+(?:(?:\.|${SP})\d+)*${SP}*Ft\b`)
const FORMATTED_AMOUNT = new RegExp(String.raw`["'\x60]${SP}*Ft\b|\}${SP}+Ft\b`)

/** The first typed or formatted amount in `text` (for example "4 900 Ft" or ` Ft` after a quote), or null. */
export function typedAmount(text) {
  const found = [TYPED_AMOUNT.exec(text), FORMATTED_AMOUNT.exec(text)].filter(Boolean)
  if (found.length === 0) return null
  return found.reduce((first, next) => (next.index < first.index ? next : first))[0]
}
