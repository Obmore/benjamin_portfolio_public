import fs from 'node:fs'
import zlib from 'node:zlib'

// The Hungarian letters every shipped font subset must cover together: a e i o u with an acute, o and u with an umlaut or a
// double acute, lower and upper case. The double acute (o, u) is not in Latin-1, which is why the "latin" subset alone is not enough.
export const HUNGARIAN_GLYPHS = 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ'

/** The Hungarian letters that are not in `codePoints` (a Set of numbers). */
export function missingHungarian(codePoints) {
  return [...HUNGARIAN_GLYPHS].filter((glyph) => !codePoints.has(glyph.codePointAt(0)))
}

// WOFF2 "known table tags" (the index in the directory flags byte).
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']

/** Code points of the cmap of a WOFF2 file (the cmap table is stored untransformed). Throws on a file it cannot read. */
export function woff2CodePoints(buffer) {
  if (buffer.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file')
  const numTables = buffer.readUInt16BE(12)
  const compressedSize = buffer.readUInt32BE(20)
  let pos = 48
  const readBase128 = () => {
    let value = 0
    for (let i = 0; i < 5; i++) {
      const byte = buffer[pos++]
      value = value * 128 + (byte & 0x7f)
      if (!(byte & 0x80)) return value
    }
    throw new Error('bad UIntBase128')
  }
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const flags = buffer[pos++]
    const index = flags & 0x3f
    const version = flags >> 6
    const tag = index === 63 ? buffer.toString('latin1', pos, (pos += 4)) : KNOWN_TAGS[index]
    const origLength = readBase128()
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
    const storedLength = transformed ? readBase128() : origLength
    tables.push({ tag, storedLength })
  }
  const data = zlib.brotliDecompressSync(buffer.subarray(pos, pos + compressedSize))
  let offset = 0
  let cmap = null
  for (const table of tables) {
    if (table.tag === 'cmap') cmap = data.subarray(offset, offset + table.storedLength)
    offset += table.storedLength
  }
  if (!cmap) throw new Error('no cmap table')
  const points = new Set()
  const subtables = cmap.readUInt16BE(2)
  for (let i = 0; i < subtables; i++) {
    const start = cmap.readUInt32BE(4 + i * 8 + 4)
    const format = cmap.readUInt16BE(start)
    if (format === 4) {
      const segments = cmap.readUInt16BE(start + 6) / 2
      const ends = start + 14
      const starts = ends + segments * 2 + 2
      for (let s = 0; s < segments; s++) {
        const from = cmap.readUInt16BE(starts + s * 2)
        const to = cmap.readUInt16BE(ends + s * 2)
        if (from === 0xffff) continue
        for (let cp = from; cp <= to; cp++) points.add(cp)
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(start + 12)
      for (let g = 0; g < groups; g++) {
        const from = cmap.readUInt32BE(start + 16 + g * 12)
        const to = cmap.readUInt32BE(start + 20 + g * 12)
        for (let cp = from; cp <= to; cp++) points.add(cp)
      }
    }
  }
  return points
}

/** Union of the code points of several WOFF2 files. */
export function shippedCodePoints(files) {
  const all = new Set()
  for (const file of files) for (const cp of woff2CodePoints(fs.readFileSync(file))) all.add(cp)
  return all
}
