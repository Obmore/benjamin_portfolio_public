import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import arialMetrics from '@capsizecss/metrics/arial'
import { defaultPython, preloadBytes, preloadedFonts, pythonSetupProblem } from './lib/font-build.mjs'
import { HUNGARIAN_GLYPHS, missingHungarian, shippedCodePoints as fileCodePoints } from './lib/font-glyphs.mjs'

// Builds the site's typeface, Archivo (OFL-1.1), from the variable-font package @fontsource-variable/archivo:
// the "wdth" file of each of its two subsets, with the axes cut to what the site uses (width 68-112 %, weight 400-800: the home page's
// instrument legends are drawn at 68 % and its headlines at 112 %; the wide master makes the latin file 71 KB, so the preload bound is 74 KB, temporarily)
// and the code points cut to what the pages need. Hungarian needs both subsets: a, e, i, o, o, u, u with an acute or an
// umlaut are in "latin", the double acute (o, u) is only in "latin-ext". Two variable files cannot be merged into one (fontTools.merge
// does not support variable fonts: tried, VarStore.mergeMap is missing), so the double acute is a second, tiny file (four glyphs) and
// BOTH files are preloaded: no Hungarian line renders ő or ű in the fallback font. The build HARD-FAILS when any Hungarian letter is
// missing from the union of the PRELOADED files (read from index.html), and when a Hungarian letter's file is not preloaded.

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/fonts')
const python = defaultPython(process.env, process.platform)

const PKG = '@fontsource-variable/archivo'
const AXES = { wdth: [68, 112], wght: [400, 800] }

const MONO_PKG = '@fontsource/martian-mono'

// Martian Mono 500 (OFL-1.1) for the home page's readings and drawing labels (digits, units, a few Hungarian words): a static weight, so no
// axes; latin plus the double acute o and u (latin-ext) as a second tiny file. Not preloaded: it is not on the first screen's critical path.
const MONO = [
  {
    id: 'martian-mono-500-latin',
    source: 'martian-mono-latin-500-normal.woff2',
    unicodes: 'U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2074,U+20AC,U+2122,U+2212',
  },
  {
    id: 'martian-mono-500-latin-ext',
    source: 'martian-mono-latin-ext-500-normal.woff2',
    unicodes: 'U+0150-0151,U+0170-0171',
  },
]

const FILES = [
  {
    id: 'archivo-latin',
    source: 'archivo-latin-wdth-normal.woff2',
    unicodes:
      'U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191-2193,U+2197,U+2212,U+2215,U+2713',
  },
  {
    id: 'archivo-latin-ext',
    source: 'archivo-latin-ext-wdth-normal.woff2',
    // Only what the pages use beyond Latin-1 (checked over src/ and every page template): the double acute o and u, lower and upper case.
    unicodes: 'U+0150-0151,U+0170-0171',
  },
]

/** Punctuation and signs the copy uses besides letters: a warning when the font has none (the browser falls back), never silent. */
const SIGNS = ['„', '”', '–', '×', '·', '✓', '↗', '°']

const PYTHON = `
import json, sys, tempfile, os
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter
from fontTools.varLib import instancer

def cmap_cps(font):
    cps = set()
    for table in font["cmap"].tables:
        cps.update(table.cmap.keys())
    return cps

def parse_unicodes(spec):
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        token = part[2:] if part.upper().startswith("U+") else part
        if "-" in token:
            start, end = token.split("-", 1)
            out.extend(range(int(start, 16), int(end, 16) + 1))
        else:
            out.append(int(token, 16))
    return out

payload = json.loads(sys.stdin.read())
font = TTFont(payload["input"])
source_cps = cmap_cps(font)
limits = {tag: (lo, hi) for tag, (lo, hi) in payload["axes"].items()}
options = Options()
options.flavor = "woff2"
options.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "tnum", "lnum", "pnum", "case"]
options.hinting = False
options.desubroutinize = True
options.ignore_missing_unicodes = True
options.ignore_missing_glyphs = True
subsetter = Subsetter(options=options)
subsetter.populate(unicodes=parse_unicodes(payload["unicodes"]))
subsetter.subset(font)
if "fvar" in font:
    font = instancer.instantiateVariableFont(font, limits)
font.flavor = "woff2"
os.makedirs(os.path.dirname(payload["output"]), exist_ok=True)
font.save(payload["output"])
font.close()

out = TTFont(payload["output"])
axes = {a.axisTag: [a.minValue, a.defaultValue, a.maxValue] for a in out["fvar"].axes} if "fvar" in out else {}
hmtx = out["hmtx"].metrics
cmap = out.getBestCmap()
upem = out["head"].unitsPerEm
widths = {chr(cp): hmtx[name][0] for cp, name in cmap.items() if cp < 0x80 and name in hmtx}
features = sorted({fr.FeatureTag for tbl in ("GSUB", "GPOS") if tbl in out for fr in out[tbl].table.FeatureList.FeatureRecord})
result = {
    "source": sorted(source_cps),
    "codepoints": sorted(cmap.keys()),
    "axes": axes,
    "upem": upem,
    "ascent": out["hhea"].ascent,
    "descent": out["hhea"].descent,
    "lineGap": out["hhea"].lineGap,
    "widths": widths,
    "features": features,
}
out.close()
json.dump(result, sys.stdout)
`

function fail(message) {
  console.error(message)
  process.exit(1)
}

function subsetFont(file, resolved, axes = AXES) {
  const output = path.join(outDir, `${file.id}.woff2`)
  const result = spawnSync(python, ['-c', PYTHON], {
    input: JSON.stringify({ input: resolved, output, unicodes: file.unicodes, axes }),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.status !== 0) fail(`Subsetting failed for ${file.id}:\n${result.stderr || result.stdout}`)
  return { output, ...JSON.parse(result.stdout) }
}

function toPercent(value) {
  return `${(value * 100).toFixed(4).replace(/\.?0+$/, '')}%`
}

// English letter frequency (per mille, plus the space) as the weights of the average advance width, the way capsize
// weights it: the fallback is scaled so that a text takes about the same width in Arial as in the web font.
const FREQUENCY = { ' ': 180, e: 102, t: 75, a: 66, o: 62, i: 58, n: 58, s: 54, h: 51, r: 50, d: 36, l: 34, u: 24, c: 22, m: 20, w: 19, f: 18, g: 16, y: 16, p: 15, b: 12, v: 8, k: 6 }

function averageAdvance(widths, upem) {
  let sum = 0
  let weight = 0
  for (const [char, freq] of Object.entries(FREQUENCY)) {
    if (widths[char] === undefined) continue
    sum += (widths[char] / upem) * freq
    weight += freq
  }
  return sum / weight
}

const setupProblem = pythonSetupProblem({
  python,
  run: (command, args) => spawnSync(command, args, { encoding: 'utf8' }),
})
if (setupProblem) fail(setupProblem)

const pkgDir = path.dirname(require.resolve(`${PKG}/package.json`))
fs.mkdirSync(outDir, { recursive: true })

const shippedCodePoints = new Set()
const built = []
let metrics = null

for (const file of FILES) {
  const resolved = path.join(pkgDir, 'files', file.source)
  if (!fs.existsSync(resolved)) fail(`No source file ${resolved} in ${PKG}`)
  console.log(`Subsetting ${file.id} from:\n  ${resolved}`)
  const result = subsetFont(file, resolved)
  const size = fs.statSync(result.output).size
  console.log(`  wrote ${path.relative(root, result.output)} (${size} bytes, ${result.codepoints.length} glyphs, axes ${JSON.stringify(result.axes)})`)
  for (const [tag, [lo, hi]] of Object.entries(AXES)) {
    const axis = result.axes[tag]
    if (!axis || axis[0] > lo || axis[2] < hi) fail(`${file.id}: the ${tag} axis ${JSON.stringify(axis)} does not cover ${lo}-${hi}`)
  }
  for (const feature of ['kern', 'tnum']) {
    if (file.id === 'archivo-latin' && !result.features.includes(feature)) fail(`${file.id}: the OpenType feature ${feature} was dropped (tabular figures are needed)`)
  }
  for (const cp of result.codepoints) shippedCodePoints.add(cp)
  built.push({ ...file, size, sourceCps: new Set(result.source), outputCps: new Set(result.codepoints) })
  if (file.id === 'archivo-latin') metrics = result
}

const monoDir = path.dirname(require.resolve(`${MONO_PKG}/package.json`))
const monoCodePoints = new Set()
for (const file of MONO) {
  const resolved = path.join(monoDir, 'files', file.source)
  if (!fs.existsSync(resolved)) fail(`No source file ${resolved} in ${MONO_PKG}`)
  console.log(`Subsetting ${file.id} from:
  ${resolved}`)
  const result = subsetFont(file, resolved, {})
  const size = fs.statSync(result.output).size
  console.log(`  wrote ${path.relative(root, result.output)} (${size} bytes, ${result.codepoints.length} glyphs)`)
  for (const cp of result.codepoints) monoCodePoints.add(cp)
  built.push({ ...file, size, sourceCps: new Set(result.source), outputCps: new Set(result.codepoints) })
}
// The mono face carries the double acute letters too (the home page's labels may show a Hungarian word): hard fail when one is missing.
const monoMissing = ['ő', 'ű', 'Ő', 'Ű'].filter((ch) => !monoCodePoints.has(ch.codePointAt(0)))
if (monoMissing.length > 0) fail(`ERROR: letters missing from the Martian Mono subsets: ${monoMissing.join(' ')}`)

// Hard fail: every Hungarian letter must be in the files the pages PRELOAD (what the browser has before the first Hungarian line is drawn).
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const preloadedPaths = preloadedFonts(indexHtml).map((href) => path.join(root, 'public', href.replace(/^\//, '')))
const missing = missingHungarian(fileCodePoints(preloadedPaths))
if (missing.length > 0) {
  fail(`ERROR: Hungarian letters missing from the PRELOADED font files (${preloadedPaths.map((p) => path.basename(p)).join(', ')}): ${missing.join(' ')} (required: ${HUNGARIAN_GLYPHS})`)
}
if (missingHungarian(shippedCodePoints).length > 0) fail('ERROR: Hungarian letters missing from the shipped font subsets')
console.log(`\nAll Hungarian letters are in the preloaded files: ${HUNGARIAN_GLYPHS}`)

let failedGlyphs = false
for (const sign of SIGNS) {
  const cp = sign.codePointAt(0)
  if (shippedCodePoints.has(cp)) continue
  const inSource = built.some((file) => file.sourceCps.has(cp))
  if (inSource) {
    failedGlyphs = true
    console.error(`  ERROR: ${sign} U+${cp.toString(16).toUpperCase()} is in the source font but was dropped by the subset`)
  } else {
    console.warn(`  WARN: ${sign} U+${cp.toString(16).toUpperCase()} is not in Archivo (the browser falls back for it)`)
  }
}

const total = built.reduce((sum, file) => sum + file.size, 0)
const { files: preloadFiles, total: preload } = preloadBytes(
  fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
  path.join(root, 'public'),
)
console.log(`\nTotal woff2: ${total} bytes (limit 122880)`)
console.log(`Preload ${preloadFiles.length} fonts (${preloadFiles.map((file) => path.basename(file.href, '.woff2')).join(', ')}): ${preload} bytes (limit 75776)`)

const adjust = averageAdvance(metrics.widths, metrics.upem) / (arialMetrics.xWidthAvg / arialMetrics.unitsPerEm)
const fallbackCss = `
@font-face {
  font-family: "Archivo Fallback";
  src: local("Arial");
  size-adjust: ${toPercent(adjust)};
  ascent-override: ${toPercent(metrics.ascent / metrics.upem / adjust)};
  descent-override: ${toPercent(Math.abs(metrics.descent) / metrics.upem / adjust)};
  line-gap-override: ${toPercent(metrics.lineGap / metrics.upem / adjust)};
}
`.trim()

const reportPath = path.join(root, 'scripts/font-fallback.generated.css')
fs.writeFileSync(reportPath, `${fallbackCss}\n`)
console.log(`\nWrote fallback CSS to ${path.relative(root, reportPath)}:\n`)
console.log(fallbackCss)

if (failedGlyphs) fail('Signs present in the source were dropped from the subset.')
if (total > 120 * 1024) fail(`Font files exceed 120 KB (${total} bytes)`)
if (preload > 74 * 1024) fail(`Preload fonts exceed 74 KB (${preload} bytes)`)

console.log('\nFont build OK.')
