// Drift check for public/third-party-notices.txt: it must name the exact version of each bundled library and every shipped font file.

/** Libraries whose licence text is in the notices file, with the heading style the file uses (`Zdog v1.1.3`). */
export const LIBRARIES = [
  { pkg: 'zdog', label: 'Zdog' },
]

const EXACT = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/

/** The version the site ships: package.json when it is an exact pin, else the version installed per package-lock.json. */
export function shippedVersion(pkg, packageJson, lock) {
  const wanted = packageJson.dependencies?.[pkg] ?? packageJson.devDependencies?.[pkg]
  if (wanted && EXACT.test(wanted)) return wanted
  return lock.packages?.[`node_modules/${pkg}`]?.version ?? null
}

/** Error messages (empty when the notices are in step with package.json, the lockfile and public/fonts). */
export function noticeErrors({ text, packageJson, lock, fontFiles }) {
  const errors = []
  for (const { pkg, label } of LIBRARIES) {
    const version = shippedVersion(pkg, packageJson, lock)
    if (!version) errors.push(`third-party-notices.txt: cannot find the version of ${pkg} in package.json or package-lock.json`)
    else if (!text.includes(`${label} v${version}`)) errors.push(`third-party-notices.txt: must name "${label} v${version}" (the version of ${pkg} in use)`)
  }
  for (const file of fontFiles) {
    if (!text.includes(file)) errors.push(`third-party-notices.txt: must name the shipped font file ${file}`)
  }
  return errors
}
