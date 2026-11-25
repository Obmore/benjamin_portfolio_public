// The money rules of check-megrendeles.mjs and check-budgets.mjs, kept apart so that they can be unit-tested with fixed strings
// (scripts/megrendeles-szabaly.test.mjs). What the checks do on the real build is unchanged: these are the same rules, written to catch every grouping.
import path from 'node:path'

// Any HTML entity ("&nbsp;", "&#160;", "&#x202F;", "&#x00a0;", "&#32;", "&thinsp;", ...). Inside a digit group or before "Ft" every entity counts as a separator, however it is spelled:
// an entity is never what the renderer writes (it writes the characters), so it can only be a hand-typed amount, and a wrong guess only makes the check stricter.
const ENTITY = String.raw`&(?:#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);`
const ENTITY_G = new RegExp(ENTITY, 'g')
// A space-like character in a built page: any Unicode space (plain, NBSP, narrow NBSP, thin space, a line break, ...) or an entity.
const HTML_SP = String.raw`(?:\s|${ENTITY})`
// ... and in source text: the same plus the backslash escapes of JS/TS strings (backslash-u with four hex digits or in braces, backslash-x with two, backslash n, r and t).
const SRC_SP = String.raw`(?:\s|${ENTITY}|\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|\\[nrt])`
// The amount as a visitor reads it: digit groups joined by any dot, comma, underscore or space-like run, and an optional old-style ",-" or ".-" tail ("149 000,- Ft").
const GROUPS = (sp) => String.raw`\d+(?:(?:[.,_]|${sp})+\d+)*(?:[.,]-)?`

/** The one grouping the page renders: thousands joined by NBSP, then NBSP and "Ft" (what src/data/pricing.ts formats). */
export const grouped = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0Ft'

// "Ft" in any letter case: "149 000 ft" reads as the same price.
const BUILT_AMOUNT = new RegExp(String.raw`(?<![\d.,])${GROUPS(HTML_SP)}${HTML_SP}*[Ff][Tt]\b`, 'g')

// What a visitor can read: the markup minus comments, scripts and styles (an amount in a comment or a script is not shown). Attribute values stay in: "alt" and "aria-label" are read out.
const visibleHtml = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')

/** Every amount a built page shows ("<digits with any grouping> Ft"): the raw text, its value, and whether it is written in the one rendered grouping. */
export function foundAmounts(html) {
  return [...visibleHtml(html).matchAll(BUILT_AMOUNT)].map((m) => {
    const value = Number(m[0].replace(ENTITY_G, '').replace(/\D/g, '').replace(/^$/, '0')) // the digits of an entity ("&#x202f;") are not part of the amount
    return { raw: m[0], value, canonical: m[0] === grouped(value) }
  })
}

/**
 * Compare the amounts found in `html` with `expected` ({ value: count }). Returns the problems: a wrongly grouped amount, and any value whose count differs
 * (an extra one anywhere, or a missing one). `where` names the place in the messages.
 */
export function amountProblems(html, expected, where) {
  const found = foundAmounts(html)
  const problems = []
  for (const a of found) if (!a.canonical) problems.push(`${where}: the amount ${JSON.stringify(a.raw)} is not written in the rendered grouping (${JSON.stringify(grouped(a.value))})`)
  const seen = {}
  for (const a of found) seen[a.value] = (seen[a.value] ?? 0) + 1
  for (const v of new Set([...Object.keys(expected), ...Object.keys(seen)])) {
    if ((expected[v] ?? 0) !== (seen[v] ?? 0)) problems.push(`${where}: the amount ${JSON.stringify(grouped(v))} is shown ${seen[v] ?? 0} times, expected ${expected[v] ?? 0}`)
  }
  return problems
}

/** The forbidden hourly price "4 900 Ft/hó" in any space-like or dot/comma grouping, any letter case, with "hó" also written as an entity, in a built page. */
export const FORBIDDEN_HOURLY = new RegExp(String.raw`4(?:[.,]|${HTML_SP})*900${HTML_SP}*[Ff][Tt]${HTML_SP}*/${HTML_SP}*h(?:ó|&oacute;|&#0*243;|&#[xX]0*[fF]3;)`, 'i')

// In source text the amount may also be a number inside braces or quotes: "{149000} Ft", "${149000} Ft", "149000' Ft".
const SOURCE_AMOUNT = new RegExp(String.raw`(?<![\w$])${GROUPS(SRC_SP)}(?:${SRC_SP}|[}'"\x60])*[Ff][Tt]\b`)

/**
 * The first typed amount in a content or page source ("149 000 Ft", "149,000 Ft", "149 000,- Ft", an escaped no-break space, an entity, "149000Ft", "{149000} Ft"), or null.
 * Amounts that a source builds from separate string pieces ("149" + " 000 Ft") are not found here: the check of the built page counts them, because the page shows them.
 */
export function typedPriceLiteral(source) {
  const m = SOURCE_AMOUNT.exec(source)
  return m ? m[0] : null
}

const ABSOLUTE_OR_RELATIVE_JS = /^(?:\/|\.{1,2}\/)[^"'`?#\s]*\.js$/

/**
 * The script files a built JS file refers to, resolved to normalized absolute paths: every quoted string that is an absolute ("/assets/x.js") or relative ("./x.js",
 * "../assets/x.js") path to a .js file (that covers static imports, import("…") and the URL strings of appended scripts). Relative paths resolve against the importing file.
 */
export function scriptReferences(text, importerFile, distDir) {
  const out = []
  for (const m of text.matchAll(/["'`]([^"'`\n]+?\.js)(?:\?[^"'`]*)?["'`]/g)) {
    const ref = m[1]
    if (!ABSOLUTE_OR_RELATIVE_JS.test(ref)) continue
    out.push(ref.startsWith('/') ? path.normalize(path.join(distDir, ref)) : path.normalize(path.resolve(path.dirname(importerFile), ref)))
  }
  return out
}

/**
 * The scripts a page loads beyond its own entry files: everything the entries refer to (see scriptReferences), followed transitively, as normalized absolute paths, each once and
 * never an entry itself. `io` = { read(file) -> text, exists(file) -> boolean }; a reference to a file that does not exist throws.
 */
export function appendedScripts(entryFiles, distDir, io) {
  const entries = new Set(entryFiles.map((file) => path.normalize(file)))
  const found = new Set()
  const queue = [...entries]
  while (queue.length > 0) {
    const file = queue.pop()
    for (const target of scriptReferences(io.read(file), file, distDir)) {
      if (!io.exists(target)) throw new Error(`${path.relative(distDir, file)} references ${path.relative(distDir, target)}, which is not in the build`)
      if (!entries.has(target) && !found.has(target)) {
        found.add(target)
        queue.push(target)
      }
    }
  }
  return [...found]
}
