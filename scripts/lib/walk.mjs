import fs from 'node:fs'
import path from 'node:path'

/** Every file under `dir` that the predicate accepts (an empty list when the folder does not exist). */
export function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full, predicate)
    return predicate(full) ? [full] : []
  })
}
