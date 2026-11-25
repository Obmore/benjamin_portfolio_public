// Motion rules of the site (checked by scripts/check-motion.mjs, unit tests in scripts/check-motion.test.mjs).
//
// Owner decision, 2026-11-13: visitors with prefers-reduced-motion: reduce get gentle opacity / colour fades and line drawing
// (stroke-dashoffset, clip-path); everyone else gets the full motion. So:
//   - a @keyframes block that moves something (transform, translate, scale, rotate, offset-*, background-position, perspective) may only be
//     used inside `@media (prefers-reduced-motion: no-preference)`; the reduce variant is a separate opacity / line-drawing block;
//   - an `infinite` animation may only run inside no-preference;
//   - a transition of one of those properties (or of `all`, or of no named property, which means `all`) may only be declared inside
//     no-preference; a lone `transition: none` (or initial, inherit, unset) names nothing;
//   - a value the checker cannot read (`var(...)` as a whole animation or transition) counts as moving;
//   - inside `reduce`, no time value may exceed 300 ms (a calc() time cannot be checked and fails), no moving keyframes may be named;
//   - nothing animates layout (width, height, top/right/bottom/left, margin*, padding*, inset*, filter, box-shadow); clip-path is allowed.
// `@media not (...)` (not as the first token of a query) never counts as no-preference or reduce; `@media (...no-preference), print` is not
// no-preference (every query of the list must be). Vendor prefixes and letter case are ignored; `!important` is stripped; quoted keyframe
// names are read. Keyframes are collected across all files first.

export const REDUCE_MAX_MS = 300

const VENDOR = /^-(webkit|moz|ms|o)-/
/** A property name without vendor prefix, lower case. */
export const normalise = (name) => name.trim().toLowerCase().replace(VENDOR, '')
const LAYOUT = /^(width|height|top|right|bottom|left|filter|box-shadow|margin(-[a-z]+)*|padding(-[a-z]+)*|inset(-[a-z]+)*)$/
const MOVING = /^(transform|translate|scale|rotate|offset(-[a-z]+)*|background-position(-[xy])?|perspective(-origin)?)$/
export const isLayoutProp = (name) => LAYOUT.test(normalise(name))
export const isMovingProp = (name) => MOVING.test(normalise(name))

const NO_PREFERENCE = /prefers-reduced-motion\s*:\s*no-preference/
const REDUCE = /prefers-reduced-motion\s*:\s*reduce/
const mediaQueries = (prelude) =>
  prelude
    .toLowerCase()
    .replace(/^@media\s*/, '')
    .split(',')
    .map((q) => q.trim())
// `not` negates a query only as its first token: `(a) and (not (b))` is an ordinary condition.
const negated = (query) => /^not\b/.test(query)
const isMedia = (prelude) => /^@media\b/i.test(prelude)
const isNoPreference = (prelude) => isMedia(prelude) && mediaQueries(prelude).every((q) => NO_PREFERENCE.test(q) && !negated(q))
const isReduce = (prelude) => isMedia(prelude) && mediaQueries(prelude).some((q) => REDUCE.test(q) && !negated(q))

const unquote = (token) => token.replace(/^["']|["']$/g, '')

/** Splits a stylesheet into style rules (with the at-rule preludes around them) and @keyframes blocks. */
export function parseCss(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = []
  const keyframes = new Map()
  const context = []
  let start = 0
  let i = 0
  const matchingBrace = (open) => {
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1
      else if (css[j] === '}') depth -= 1
      j += 1
    }
    return j
  }
  while (i < css.length) {
    const ch = css[i]
    if (ch === ';') {
      start = i + 1
    } else if (ch === '}') {
      context.pop()
      start = i + 1
    } else if (ch === '{') {
      const prelude = css.slice(start, i).trim()
      if (/^@(-webkit-)?keyframes\b/i.test(prelude)) {
        const end = matchingBrace(i)
        keyframes.set(unquote(prelude.replace(/^@(-webkit-)?keyframes\s+/i, '').trim()), css.slice(i + 1, end - 1))
        i = end - 1
        start = end
      } else if (prelude.startsWith('@')) {
        context.push(prelude)
        start = i + 1
      } else {
        const end = matchingBrace(i)
        rules.push({ selector: prelude, body: css.slice(i + 1, end - 1), context: [...context] })
        i = end - 1
        start = end
      }
    }
    i += 1
  }
  return { rules, keyframes }
}

/** Declarations whose (normalised) property matches `names`; the value has `!important` removed. */
function declarations(body, names) {
  const out = []
  for (const match of body.matchAll(/(?:^|[;{\s])(-?[a-zA-Z][a-zA-Z-]*)\s*:\s*([^;}]+)/g)) {
    const prop = normalise(match[1])
    if (names.test(prop)) out.push({ prop, value: match[2].replace(/!\s*important/gi, '').trim() })
  }
  return out
}

const hasMotionProp = (body) => declarations(body, /./).some(({ prop }) => isMovingProp(prop))

/** Names of the keyframes blocks that move something (collect these over every file before checking any). */
export function movingKeyframes(source) {
  const { keyframes } = parseCss(source)
  return new Set([...keyframes].filter(([, body]) => hasMotionProp(body)).map(([name]) => name))
}

/** Splits at top-level separators only (not inside parentheses, so cubic-bezier(0.2, 1, 0.3, 1) stays one token). */
function split(value, separator) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of value) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (depth === 0 && (separator === ',' ? ch === ',' : /\s/.test(ch))) {
      if (current) parts.push(current)
      current = ''
    } else current += ch
  }
  if (current) parts.push(current)
  return parts.map((part) => part.trim()).filter(Boolean)
}

const TIME = /^[+-]?(\d*\.?\d+)(ms|s)$/i
const TIMING = /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|cubic-bezier\(.*\)|steps\(.*\)|linear\(.*\)|normal|allow-discrete)$/i
const NOTHING = /^(none|initial|inherit|unset|revert|revert-layer)$/i
const timesInMs = (value) =>
  split(value, ',')
    .flatMap((one) => split(one, ' '))
    .filter((token) => TIME.test(token))
    .map((token) => {
      const m = TIME.exec(token)
      return m[2].toLowerCase() === 's' ? Number(m[1]) * 1000 : Number(m[1])
    })

/**
 * The properties a `transition` value names, one entry per comma-separated transition. A transition that names no property (`.2s`, `.2s ease`)
 * transitions `all`; a lone `none` (initial, inherit, unset) names nothing; time-first syntax (`.2s transform`) is read like any other order.
 * A part that is only var() is unknown and returned as 'var'. Names are lower case without a vendor prefix.
 */
export function transitionProperties(prop, value) {
  if (prop === 'transition-property') {
    return split(value, ',')
      .filter((token) => !NOTHING.test(token))
      .map((token) => (/var\(/.test(token) ? 'var' : normalise(token)))
  }
  return split(value, ',')
    .map((one) => {
      const tokens = split(one, ' ')
      if (tokens.length === 1 && NOTHING.test(tokens[0])) return null
      const named = tokens.filter((token) => !TIME.test(token) && !TIMING.test(token) && !NOTHING.test(token) && !/^var\(/.test(token) && !/^calc\(/.test(token))
      if (named[0]) return normalise(named[0])
      return tokens.some((token) => /^var\(/.test(token)) ? 'var' : 'all'
    })
    .filter((name) => name !== null)
}

const ANIMATION_WORDS = /^(both|forwards|backwards|infinite|alternate|alternate-reverse|reverse|running|paused|auto|\d+(\.\d+)?)$/i

/** Animation names an `animation` / `animation-name` value uses, and whether a part of it names its animation through var(). */
function animationNames(prop, value) {
  const names = []
  let unknown = false
  for (const one of split(value, ',')) {
    const tokens = split(one, ' ')
    const idents = tokens.filter((token) => !TIME.test(token) && !TIMING.test(token) && !ANIMATION_WORDS.test(token) && !/^(var|calc)\(/.test(token))
    if (prop === 'animation-name') {
      if (/var\(/.test(one)) unknown = true
      names.push(...tokens.map(unquote))
    } else if (idents.length === 0 && tokens.some((token) => /^var\(/.test(token))) unknown = true
    else names.push(...idents.map(unquote))
  }
  return { names, unknown }
}

/** Returns the list of error messages for one stylesheet (an empty list when it keeps the rules). `moving`: the moving keyframes of all files. */
export function checkCss(source, rel, moving = movingKeyframes(source)) {
  const errors = []
  const { rules, keyframes } = parseCss(source)

  for (const [name, body] of keyframes) {
    for (const { prop } of declarations(body, /./)) {
      if (isLayoutProp(prop)) errors.push(`${rel}: @keyframes ${name} animates '${prop}'`)
    }
  }

  for (const { selector, body, context } of rules) {
    const noPref = context.some(isNoPreference)
    const reduce = context.some(isReduce)
    const where = `${rel}: ${selector.replace(/\s+/g, ' ')}`

    for (const { prop, value } of declarations(body, /^animation(-name)?$/)) {
      const { names, unknown } = animationNames(prop, value)
      const named = names.filter((token) => moving.has(token))
      if ((named.length > 0 || unknown) && !noPref) errors.push(`${where} runs ${unknown ? 'an animation it cannot read (var())' : `the moving keyframes ${named.join(', ')}`} outside @media (prefers-reduced-motion: no-preference)`)
      if (named.length > 0 && reduce) errors.push(`${where} runs the moving keyframes ${named.join(', ')} under reduced motion`)
    }
    for (const { prop, value } of declarations(body, /^animation(-iteration-count)?$/)) {
      if (/\binfinite\b/i.test(value) && !noPref) errors.push(`${where} sets an infinite ${prop} outside @media (prefers-reduced-motion: no-preference)`)
    }
    for (const { prop, value } of declarations(body, /^transition(-property)?$/)) {
      const names = transitionProperties(prop, value)
      const bad = names.filter((token) => token === 'all' || token === 'var' || isMovingProp(token))
      if (bad.length > 0 && !noPref) errors.push(`${where} transitions ${bad.join(', ')} (a moving property, all, or unreadable) outside @media (prefers-reduced-motion: no-preference)`)
    }
    if (reduce) {
      for (const { prop, value } of declarations(body, /^(animation|transition)(-delay|-duration)?$/)) {
        if (/calc\(/i.test(value) || (/-(delay|duration)$/.test(prop) && /var\(/.test(value))) {
          errors.push(`${where}: ${prop} has a time the checker cannot read (calc() or var()) under reduced motion`)
          continue
        }
        for (const ms of timesInMs(value)) {
          if (ms > REDUCE_MAX_MS) errors.push(`${where}: ${prop} has ${ms} ms under reduced motion (limit ${REDUCE_MAX_MS} ms)`)
        }
      }
    }
  }
  return errors
}
