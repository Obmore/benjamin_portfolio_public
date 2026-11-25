// Writes the generated regions of src/content/mintak.ts from their sources. Not part of any check or build: run it when the demo's simulation or the client picture changes, then run
// `npm run test:scripts` (recomputes the Gépadat run and pins the picture file) and the e2e spec e2e/mintak.spec.ts (recomputes the block means from the pixels a browser decodes).
//   node scripts/mintak-epit.mjs            write both regions
//   node scripts/mintak-epit.mjs --ellenoriz  write nothing; exit 1 when a region differs from what the sources give
//
// GÉPADAT: the demo's own run in Node (scripts/lib/demo-futtatas.mjs), each reading rounded to the one decimal the demo displays.
// HONLAP: the picture file's pixels as a browser decodes them (an <img> drawn to a canvas: the same path a visitor's browser takes), cut into block means by `blokkAtlag` (src/content/mintak.ts).
// The browser is Playwright's Chromium; on the owner's PC (Smart App Control blocks Playwright's own build) run it with CHANNEL=msedge, in a cloud container with CHROMIUM=<binary path>.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { blokkAtlag } from '../src/content/mintak.ts'
import { demoKijelzes, gepadatFuttatas } from './lib/demo-futtatas.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CEL = path.join(root, 'src/content/mintak.ts')
const KEP = 'public/work/lelek-es-nyelv-telefon.webp'
const OSZLOP = 40 // the world's grid width (M0b): 40 columns, rows follow from the picture's aspect

const idezet = (s) => `'${s.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

function gepadatRegio() {
  const f = gepadatFuttatas(480)
  if (!f.muszakValtas) throw new Error('the run did not reach the shift change')
  const ertekek = f.sorozat.map(demoKijelzes)
  const perc = (i) => `${Math.floor((f.kezdetPerc + i) / 60)}:${String((f.kezdetPerc + i) % 60).padStart(2, '0')}`
  const sorok = []
  for (let i = 0; i < ertekek.length; i += 30) sorok.push(`  // ${perc(i)}\n  ${ertekek.slice(i, i + 30).join(', ')},`)
  return [
    `const GEPADAT_ERTEKEK: readonly number[] = [`,
    sorok.join('\n'),
    `]`,
    `const GEPADAT_KEZDET_PERC = ${f.kezdetPerc}`,
    `const GEPADAT_GEP = { nev: ${idezet(f.gep.nev)}, jel: ${idezet(f.gep.jel)}, hatar: ${f.gep.hatar} }`,
    `const GEPADAT_MUSZAKVALTAS = { perc: ${f.muszakValtas.perc}, szoveg: ${idezet(f.muszakValtas.szoveg)} }`,
  ].join('\n')
}

async function kepPixelek(bajtok) {
  const opts = {}
  if (process.env.CHROMIUM) Object.assign(opts, { executablePath: process.env.CHROMIUM, args: ['--no-sandbox'] }) // a cloud container runs as root
  if (process.env.CHANNEL) opts.channel = process.env.CHANNEL
  const browser = await chromium.launch(opts)
  try {
    const page = await browser.newPage()
    const ki = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/webp;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const cx = c.getContext('2d', { willReadFrequently: true })
      cx.drawImage(img, 0, 0)
      const d = cx.getImageData(0, 0, c.width, c.height).data
      let s = ''
      for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode(...d.subarray(i, i + 0x8000))
      return { w: c.width, h: c.height, rgba: btoa(s) }
    }, bajtok.toString('base64'))
    return { szelesseg: ki.w, magassag: ki.h, rgba: Buffer.from(ki.rgba, 'base64') }
  } finally {
    await browser.close()
  }
}

async function honlapRegio() {
  const bajtok = fs.readFileSync(path.join(root, KEP))
  const { szelesseg, magassag, rgba } = await kepPixelek(bajtok)
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw new Error('the picture is not opaque: blokkAtlag ignores alpha')
  const b = blokkAtlag(rgba, szelesseg, magassag, OSZLOP)
  const sorok = Array.from({ length: b.sor }, (_, r) => `  '${Buffer.from(b.rgb.subarray(r * OSZLOP * 3, (r + 1) * OSZLOP * 3)).toString('base64')}',`)
  return [
    `const HONLAP_FAJL_SHA256 = '${crypto.createHash('sha256').update(bajtok).digest('hex')}'`,
    `const HONLAP_SZELESSEG = ${szelesseg}`,
    `const HONLAP_MAGASSAG = ${magassag}`,
    `const HONLAP_OSZLOP = ${OSZLOP}`,
    `const HONLAP_SOROK: readonly string[] = [`,
    sorok.join('\n'),
    `]`,
  ].join('\n')
}

function csere(szoveg, nev, tartalom) {
  const re = new RegExp(`(// <generated:${nev}>\\n)[\\s\\S]*?(\\n// </generated:${nev}>)`)
  if (!re.test(szoveg)) throw new Error(`src/content/mintak.ts has no <generated:${nev}> region`)
  return szoveg.replace(re, (_, a, z) => `${a}${tartalom}${z}`)
}

const ellenoriz = process.argv.includes('--ellenoriz')
const eredeti = fs.readFileSync(CEL, 'utf8')
const crlf = eredeti.includes('\r\n') // a Windows checkout may have converted the line ends: work on LF text and write the file's own form back
const regi = eredeti.replaceAll('\r\n', '\n')
const uj = csere(csere(regi, 'gepadat', gepadatRegio()), 'honlap', await honlapRegio())
if (ellenoriz) {
  if (uj !== regi) {
    console.error('src/content/mintak.ts differs from what its sources give: run `node scripts/mintak-epit.mjs`')
    process.exit(1)
  }
  console.log('src/content/mintak.ts matches its sources')
} else {
  fs.writeFileSync(CEL, crlf ? uj.replaceAll('\n', '\r\n') : uj)
  console.log(uj === regi ? 'src/content/mintak.ts unchanged' : `src/content/mintak.ts written (${uj.length} bytes)`)
}
