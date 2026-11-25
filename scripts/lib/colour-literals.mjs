import fs from 'node:fs'
import path from 'node:path'
import { walk } from './walk.mjs'

// The token file is the only place where a colour literal may live: the site's palette, light and dark.
const TOKENS_FILE = 'src/site/fooldal/jel-tokens.css'
// The site's stylesheets and the adventure world's own sheet (src/vilag/vilag.css, bundled into the world): neither may hold a colour literal.
const CSS_ROOTS = ['src/site', 'src/vilag']

// CSS Color 4 named colours, minus the keywords that are not a fixed colour (transparent, currentcolor, inherit, …).
const NAMED = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(' ')

// CSS system colours.
const SYSTEM = 'canvas canvastext linktext visitedtext activetext buttonface buttontext buttonborder field fieldtext highlight highlighttext selecteditem selecteditemtext mark marktext graytext accentcolor accentcolortext'.split(' ')

// Unicode-aware boundaries: a Hungarian ident such as "tanú" or "pinkó" is not the colour "tan" or "pink".
const HEX = /#([0-9a-f]+)(?![\p{L}\p{N}_-])/giu
const FUNCTION = /(?<![\p{L}\p{N}_-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|light-dark)\(/giu
const NAME = new RegExp(`(?<![\\p{L}\\p{N}_#.-])(${[...NAMED, ...SYSTEM].join('|')})(?![\\p{L}\\p{N}_(-])`, 'giu')

const blank = (text) => text.replace(/[^\n]/g, ' ')

/** Blank out comments, quoted strings and url(...) (with balanced parentheses), keeping offsets and newlines. */
function strip(css) {
  let out = ''
  for (let i = 0; i < css.length; ) {
    const rest = css.slice(i)
    let match
    if ((match = /^\/\*[\s\S]*?(\*\/|$)/.exec(rest))) {
      out += blank(match[0]); i += match[0].length
    } else if (rest[0] === '"' || rest[0] === "'") {
      const quote = rest[0]
      let j = 1
      while (j < rest.length && rest[j] !== quote && rest[j] !== '\n') j += rest[j] === '\\' ? 2 : 1
      out += blank(rest.slice(0, j + 1)); i += j + 1
    } else if (/^url\(/i.test(rest)) {
      let depth = 0, j = 3
      for (; j < rest.length; j++) {
        if (rest[j] === '(') depth++
        else if (rest[j] === ')' && --depth === 0) break
      }
      out += blank(rest.slice(0, j + 1)); i += j + 1
    } else {
      out += rest[0]; i++
    }
  }
  return out
}

/** Colour literals in declaration values of CSS text (never selectors), with their 1-based line. */
export function findColourLiterals(css) {
  const text = strip(css)
  const found = []
  const lineAt = (offset) => text.slice(0, offset).split('\n').length
  const scan = (value, offset) => {
    for (const [re, ok] of [
      [HEX, (m) => [3, 4, 6, 8].includes(m[1].length)],
      [FUNCTION, () => true],
      [NAME, () => true],
    ]) {
      for (const m of value.matchAll(re)) {
        if (ok(m)) found.push({ line: lineAt(offset + m.index), literal: m[0], at: offset + m.index })
      }
    }
  }
  let depth = 0, start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c !== '{' && c !== '}' && c !== ';') continue
    // A segment ending in ';' or '}' inside a block is a declaration; one ending in '{' is a selector or at-rule prelude.
    if (c !== '{' && depth > 0) {
      const colon = text.indexOf(':', start)
      if (colon !== -1 && colon < i) scan(text.slice(colon + 1, i), colon + 1)
    }
    if (c === '{') depth++
    else if (c === '}') depth = Math.max(0, depth - 1)
    start = i + 1
  }
  // An unterminated last declaration (no ';' or '}') inside a block.
  if (depth > 0) {
    const colon = text.indexOf(':', start)
    if (colon !== -1) scan(text.slice(colon + 1), colon + 1)
  }
  return found.sort((a, b) => a.at - b.at).map(({ line, literal }) => ({ line, literal }))
}

/** One "file:line: ..." message per colour literal found outside the tokens file. */
export function colourLiteralErrors(root) {
  const errors = []
  for (const file of CSS_ROOTS.flatMap((dir) => walk(path.join(root, dir), (file) => file.endsWith('.css')))) {
    const rel = path.relative(root, file).replaceAll('\\', '/')
    if (rel === TOKENS_FILE) continue
    for (const { line, literal } of findColourLiterals(fs.readFileSync(file, 'utf8'))) {
      errors.push(`${rel}:${line}: colour literal ${literal} outside ${TOKENS_FILE}: use a design token (var(--…))`)
    }
  }
  return errors
}
