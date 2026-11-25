import fs from 'node:fs'
import path from 'node:path'
import { walk } from './walk.mjs'

// The one place that says which local module scripts each built page carries (in document order, names without Vite's content hash).
// A page that is not listed expects none (demos, redirect stubs): a new page or entry module is added here, in the same change that adds it.
const JOGI_OLDALAK = ['404.html', 'adatkezeles', 'aszf', 'impresszum', 'en/imprint']
export const VART_MODULOK = new Map([
  // The home page's entry is built as fooldal-<hash>.js (the entry's key).
  ['index.html', ['fooldal']],
  ...JOGI_OLDALAK.map((p) => [p.endsWith('.html') ? p : `${p}/index.html`, ['tema-tar', 'jogi']]),
  // The page entry appends the theme key, the contact end and the analytics as scripts of their own (`?worker&url&megr`): the head carries the entry only.
  ['megrendeles/index.html', ['csomagok']],
  // /munkaim/ (with the former /tapasztalat/ as its "Évek" section): the entry appends the same three standalone scripts and the Rollin scene as a fourth one, appended near the block (`?worker&url&munk`).
  ['munkaim/index.html', ['munkaim']],
])

// Standalone modules (src/site/<name>-futtat.ts, started by a loader as a script of their own): each is bundled once, as `<name>-futtat-<hash>.js`, and never as a shared chunk named after the module.
// A module shared by page entries would become a chunk with a script tag in every page that uses it; the pages' script lists above are fixed.
export const ONALLO_MODULOK = ['horgony', 'masolo', 'meres', 'rollin', 'retegek']
// Chunks that only exist when a module is shared or dynamically imported across entries.
const TILOS_CHUNKOK = [/^preload-helper(?:-|\.)/, /^rolldown-runtime(?:-|\.)/]

const stripHash = (file) => file.replace(/-[\w-]{8}\.js$/, '')

/** The names (without the hash) of a page's `<script type="module" src="…">` tags, in document order. */
export function modulSzkriptek(html) {
  const names = []
  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\btype="module"/.test(attrs)) continue
    const src = attrs.match(/\bsrc="([^"]*)"/)?.[1]
    if (!src) continue
    names.push(src.startsWith('/assets/') ? stripHash(src.slice('/assets/'.length)) : src)
  }
  return names
}

/** Errors for every built page whose module scripts differ from `vart` (a page that is not listed expects none). */
export function ellenorizModulSzkriptek(dist, vart = VART_MODULOK) {
  const errors = []
  const pages = walk(dist, (f) => f.endsWith('.html') && !path.relative(dist, f).replaceAll('\\', '/').startsWith('demos/'))
  const seen = new Set()
  for (const file of pages) {
    const rel = path.relative(dist, file).replaceAll('\\', '/')
    seen.add(rel)
    const expected = vart.get(rel) ?? []
    const actual = modulSzkriptek(fs.readFileSync(file, 'utf8'))
    if (actual.join(',') !== expected.join(',')) errors.push(`${rel}: module scripts [${actual.join(', ')}], expected [${expected.join(', ')}]`)
  }
  for (const rel of vart.keys()) if (!seen.has(rel)) errors.push(`${rel}: listed in VART_MODULOK but not built`)
  return errors
}

/** Errors for a shared chunk named after a standalone module (anything but its own `<name>-futtat-<hash>.js`), for a missing standalone file, and for the helper chunks. */
export function ellenorizChunkok(dist, onallo = ONALLO_MODULOK) {
  const errors = []
  const assets = walk(path.join(dist, 'assets'), (f) => f.endsWith('.js')).map((f) => path.basename(f))
  for (const name of onallo) {
    const own = assets.filter((f) => new RegExp(`^${name}-futtat-[\\w-]{8}\\.js$`).test(f))
    if (own.length !== 1) errors.push(`dist/assets: expected exactly one ${name}-futtat-<hash>.js, found ${own.length}`)
    for (const f of assets) if (f.startsWith(`${name}-`) && !own.includes(f)) errors.push(`dist/assets/${f}: a chunk named after the standalone module "${name}" (shared chunk)`)
  }
  for (const f of assets) if (TILOS_CHUNKOK.some((re) => re.test(f))) errors.push(`dist/assets/${f}: helper chunk (a module is shared or dynamically imported across entries)`)
  return errors
}
