// Helyőrző-kapu: az éles build (ELES_BUILD=1) leáll, ha egy élesítendő oldalon „[KÉRDÉS: …]”
// helyőrző maradt. Az ágon, a PR-ben és a Verify-tesztekben a build a helyőrzőkkel is zöld.
// A vite.config.ts hívja; a logika itt van, hogy a scripts/helyorzo-kapu.test.mjs is tesztelje.

export const JEL = '[KÉRDÉS:'

/**
 * Megkeresi a helyőrzőket a megadott fájlokban.
 * @param {{ utvonal: string, szoveg: string }[]} fajlok
 * @returns {{ utvonal: string, talalatok: string[] }[]}
 */
export function helyorzok(fajlok) {
  const eredmeny = []
  for (const { utvonal, szoveg } of fajlok) {
    const normalt = utvonal.replaceAll('\\', '/')
    const talalatok = []
    let honnan = 0
    for (;;) {
      const kezdet = szoveg.indexOf(JEL, honnan)
      if (kezdet === -1) break
      const veg = szoveg.indexOf(']', kezdet)
      talalatok.push(szoveg.slice(kezdet, veg === -1 ? kezdet + 120 : veg + 1).replace(/<[^>]*>/g, ''))
      honnan = kezdet + JEL.length
    }
    if (talalatok.length) eredmeny.push({ utvonal: normalt, talalatok })
  }
  return eredmeny
}

/**
 * @param {{ utvonal: string, talalatok: string[] }[]} lista
 * @returns {string}
 */
export function kapuUzenet(lista) {
  const sorok = lista.flatMap(({ utvonal, talalatok }) => [`  ${utvonal}:`, ...talalatok.map((t) => `    ${t}`)])
  return [
    'Helyőrző-kapu: az éles buildben nem maradhat „[KÉRDÉS: …]” egy élesítendő oldalon.',
    ...sorok,
    'Feloldás: a src/content/ megfelelő kerdes(…) hívását cserélje a valós értékre, vagy null-ra,',
    'ha az elem ne jelenjen meg.',
  ].join('\n')
}

/** Igaz, ha a build éles (a Deploy workflow állítja). */
export function elesBuild(env = process.env) {
  return env.ELES_BUILD === '1'
}
