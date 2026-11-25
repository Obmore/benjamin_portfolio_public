// The gate: whether the world may run at all, and whether the page may download it ahead of the click. Decisions are pure functions of plain inputs (the node tests feed them
// synthetic inputs); the one function that touches the browser is `kapuProba`. Reasons are short English codes for the diagnostic line and the tests, never page copy.
//
// What the gate protects: a visitor on a weak, software-rendered or metered setup never gets a button, never downloads the world and never sees a half-working one. The ordinary page is
// always complete, so a refusal costs nothing but the world itself.

/** Software renderers the gate refuses (a CPU draws every frame: far too slow, and it heats a laptop). */
export const SZOFTVERES = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|warp/i

export interface KapuBemenet {
  /** `typeof WebGL2RenderingContext !== 'undefined'`. */
  webgl2: boolean
  /** navigator.connection.saveData, or the prefers-reduced-data media query. */
  mentesiAdat: boolean
  /** What `getContext('webgl2', { failIfMajorPerformanceCaveat: true })` gave: a context, nothing, or nothing because the browser says the GPU path is a software one. */
  kontextus: 'ok' | 'nincs' | 'teljesitmeny'
  /** The renderer string where the browser lets a page read it (a local gate input: it is never sent anywhere). */
  renderer: string
  /** The CI hook: admit a software renderer. */
  szoftveresEngedett?: boolean
}

/** The reason the world must not run, or null when it may. */
export function kapuIndok(b: KapuBemenet): string | null {
  if (!b.webgl2) return 'no-webgl2'
  if (b.mentesiAdat) return 'save-data'
  if (b.szoftveresEngedett) return b.kontextus === 'nincs' ? 'no-context' : null
  if (b.kontextus === 'teljesitmeny') return 'performance-caveat'
  if (b.kontextus === 'nincs') return 'no-context'
  if (SZOFTVERES.test(b.renderer)) return `software-renderer: ${b.renderer}`
  return null
}

export interface HalozatBemenet {
  mentesiAdat: boolean
  /** navigator.connection.effectiveType (Chromium only; undefined elsewhere, where only the idle rule applies). */
  tipus?: string
  /** document.visibilityState === 'visible'. */
  lathato: boolean
  /** The gate said no (kapuIndok gave a reason): nothing is fetched. */
  kapuElutasitotta: boolean
}

/** The reason the page must not download the world ahead of the click (the private plan kaland-v2 5.1 point 5), or null when it may. A download is a fetch only: no evaluation, no GL context. */
export function bemelegitesIndok(b: HalozatBemenet): string | null {
  if (b.kapuElutasitotta) return 'gate-refused'
  if (b.mentesiAdat) return 'save-data'
  if (b.tipus !== undefined && b.tipus !== '4g') return `slow-connection: ${b.tipus}`
  if (!b.lathato) return 'tab-hidden'
  return null
}

export interface KapuEredmeny {
  indok: string | null
  renderer: string
}

/** The browser part of the gate: one throwaway context, read once, then released. `proba.szoftveres` (CI) admits a software renderer. */
export function kapuProba(szoftveresEngedett = false): KapuEredmeny {
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined'
  const mentesiAdat = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches
  let renderer = '-'
  let kontextus: KapuBemenet['kontextus'] = 'nincs'
  if (webgl2 && !mentesiAdat) {
    const vaszon = document.createElement('canvas')
    let gl: WebGL2RenderingContext | null = null
    try {
      gl = vaszon.getContext('webgl2', { failIfMajorPerformanceCaveat: !szoftveresEngedett })
    } catch {
      gl = null
    }
    if (gl) {
      kontextus = 'ok'
      renderer = rendererNev(gl)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } else {
      // A refusal because of the performance caveat looks like "no context"; the context without the flag tells the two apart.
      let enyhe: WebGL2RenderingContext | null = null
      try {
        enyhe = document.createElement('canvas').getContext('webgl2')
      } catch {
        enyhe = null
      }
      kontextus = enyhe ? 'teljesitmeny' : 'nincs'
      enyhe?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
  return { indok: kapuIndok({ webgl2, mentesiAdat, kontextus, renderer, szoftveresEngedett }), renderer }
}

/** The unmasked renderer string where the browser allows reading it, else the generic one. */
export function rendererNev(gl: WebGL2RenderingContext): string {
  const e = gl.getExtension('WEBGL_debug_renderer_info')
  return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
}
