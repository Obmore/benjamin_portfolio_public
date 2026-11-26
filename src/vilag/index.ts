// "Az út a Mintatérben": the world engine (thread V2 of the private plan kaland-v2). ONE persistent full-screen WebGL2 canvas over the page, a route of chapters the visitor moves along with one number
// (depth is time), a post stack, a quality ladder, sound that is off until asked, and a text twin that is always complete. This file is the bundle's whole public face; the page's entry (V7) calls it.
//
// Two stages, as the private plan kaland-v2 5.1 decided:
//   1. FETCH: the page downloads this file into the HTTP cache (`fetch`, no evaluation). This module has NO top-level side effect: importing it creates nothing, reads nothing, draws nothing.
//   2. START: `keszit()` makes the object (cheap: it builds a detached DOM and nothing else); `elokeszit()` creates the GL context, compiles the programs in parallel, builds the textures and
//      draws one frame, counting each real stage for the loader scene; `megnyit()` shows the world (and runs `elokeszit()` first if the visitor was faster than the preparation).
// Nothing leaves the site's own origin, no renderer string is sent anywhere, and nothing is stored in the browser.
import { honlapRGBA, MINTAK } from '../content/mintak.ts'
import { KALAND } from '../content/kaland.ts'
import { IDOVONAL } from '../content/tapasztalat.ts'
import { feliratHelyzet, feliratUtkozes, type Felirat, type Helyzet } from './feliratok.ts'
import { Hang } from './hang.ts'
import { ALAP_HATASOK, ALAP_RETEGEK, GAZDAG_HATASOK, RETEGEK, type HatasKapcsolo, type HatasNev, type RetegNev } from './hatasok.ts'
import { hudEpit } from './hud.ts'
import { evekAdat, type EvekAdat } from './evek.ts'
import { ATMENET_KOZEP, ELSO_SZAKASZ, FEJEZETEK, cimLathato, fejezetAt, Halado, jelenetPl, lathatok, type FejezetId } from './idovonal.ts'
import type { Jelenet, Kocka, Mutato, Szinek, Vetites } from './jelenet.ts'
import { kapcsolatAdat } from './kapcsolat.ts'
import { betuRaszter, cimSorok } from './kapcsolat-raszter.ts'
import { Kepzes, KepzesProgramok } from './kepzes.ts'
import { palyazatAdat } from './palyazat.ts'
import { kapuIndok, rendererNev } from './kapu.ts'
import { kontextus } from './gl.ts'
import { Letra, type LetraLepes } from './letra.ts'
import { korl, sm } from './matek.ts'
import { NEZET_NEV, NEZETEK, hatasos, nezetAt, nezetNev, type NezetId } from './nezet.ts'
import { Reszecskek } from './reszecskek.ts'
import { Toltoszal, toltesIndex } from './toltoszal.ts'
import { LEPESEK, Lepesek } from './toltes.ts'
import { Utofeldolgozas } from './utofeldolgozas.ts'
import type { Allapot, Beallitas, BezarOk, Vilag } from './tipusok.ts'

export type { Allapot, Beallitas, BezarOk, Proba, Vilag } from './tipusok.ts'
export { bemelegitesIndok, kapuProba } from './kapu.ts'

/** The tiers' particle budgets: the full tier with the "sok" effect on has 150,000, without it 60,000 (the density compensation keeps the picture the same), the light tier 30,000. */
const DB = { sok: 150000, teljes: 60000, konnyu: 30000 } as const

/** The year of the build (vite defines it: the "Évek" axis runs to it, as the live page's does); a clock fallback where nothing defines it (the review build defines it too). */
const EPITES_EV = Math.max(typeof __EPITES_EV__ === 'number' ? __EPITES_EV__ : new Date().getFullYear(), ...IDOVONAL.map((i) => i.veg ?? i.kezdet))

/** What a scene left behind in the frame, with its weight and its own progress (the labels, the probe and the post stack read it). */
interface Meszet {
  id: string
  v: Vetites
  gain: number
  pl: number
}

/** A phone-sized viewport starts on the light tier (the ladder only ever goes down). */
const TELEFON_SZELESSEG = 727

const lin = (b: number): number => {
  const c = b / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** The token colours as linear light, read through a 1x1 canvas so that whatever the CSS says (hex, oklch for a wide screen) comes out as the screen's own sRGB bytes. */
function szinekOlvas(gyoker: HTMLElement): Szinek {
  const px = document.createElement('canvas')
  px.width = px.height = 1
  const c2 = px.getContext('2d', { willReadFrequently: true })
  const el = document.createElement('i')
  el.style.display = 'none'
  gyoker.append(el)
  const ki: Record<string, [number, number, number]> = {}
  for (const [nev, tok] of [['toll', '--jel'], ['forro', '--jel-forro'], ['hatter', '--papir'], ['tinta', '--tinta-halk']] as const) {
    el.style.color = `var(${tok})`
    let rgb: [number, number, number] = [0, 0, 0]
    if (c2) {
      c2.clearRect(0, 0, 1, 1)
      c2.fillStyle = 'black' // the fallback if the computed colour cannot be parsed (never a design colour: every drawn colour is a token)
      c2.fillStyle = getComputedStyle(el).color
      c2.fillRect(0, 0, 1, 1)
      const d = c2.getImageData(0, 0, 1, 1).data
      rgb = [lin(d[0]), lin(d[1]), lin(d[2])]
    }
    ki[nev] = rgb
  }
  el.remove()
  return { toll: ki.toll, forro: ki.forro, hatter: ki.hatter, tinta: ki.tinta }
}

const f1 = (v: number | null): string => (v == null ? '-' : v.toFixed(1))

export function keszit(beallitas: Beallitas = {}): Vilag {
  const proba = beallitas.proba
  const diagnosztika = !!beallitas.diagnosztika
  const rm = matchMedia('(prefers-reduced-motion: reduce)')
  const telefon = innerWidth < TELEFON_SZELESSEG

  const hud = hudEpit(diagnosztika)
  const root = hud.gyoker
  let nyitott = false
  // the loader scene (toltoszal.ts): drawn on the canvas while the world's own programs compile, as far as the real stages have got
  let toltoszal: Toltoszal | null = null
  let toltesKi = 0
  let toltesTart = false
  let toltesRaf = 0
  let toltesElozo = 0
  let toltesRogzitett: number | null = null
  let tw = 0
  let th = 0
  /** 0..1: the atmosphere coming in after the world opens (the particles, the glow, the labels); 1 for a still world. */
  let giris = 1
  const lepesek = new Lepesek(LEPESEK, () => frissitToltes())
  lepesek.kesz('module')

  let fazis: Allapot['fazis'] = 'uj'
  let hiba: string | null = null
  let megsemmisitve = false
  let elokeszites: Promise<void> | null = null

  // the state of the running world
  let gl: WebGL2RenderingContext | null = null
  let post: Utofeldolgozas | null = null
  const jelenetek = new Map<string, Jelenet>()
  let szinek: Szinek = { toll: [1, 1, 1], forro: [1, 1, 1], hatter: [0, 0, 0], tinta: [1, 1, 1] }
  let renderer = '-'
  let maxPont = 64
  let hdr = true
  let fordit: number | null = null
  let dpr = 1
  let skala = 1
  let db: number = telefon ? DB.konnyu : DB.sok
  // A phone starts on the light tier without the mirror and the effects (the private plan kaland-v2 4.1 rule 3); the ladder's first step takes them away from the rest.
  const letra = new Letra({ szint: telefon ? 'konnyu' : 'teljes', hatasok: !telefon, ablak: proba?.ablak, gpuMax: proba?.koltsegMax })
  const retegek: Record<RetegNev, boolean> = { ...ALAP_RETEGEK, ...(telefon ? { tukor: false } : {}), ...beallitas.retegek }
  let nezetRogzitett: NezetId | null = null
  let vetitesek: Meszet[] = []
  // the formation scenes' data the readouts and the twin name (chapter 3's lanes and years)
  let evekD: EvekAdat | null = null
  let kepProg: KepzesProgramok | null = null
  /** Where each scene's labels start in the one list the DOM layer holds, and the whole list. */
  const felirOffset = new Map<string, number>()
  let osszesFelirat: Felirat[] = []
  /** The look as the last frame drew it (the labels follow the same one). */
  let nzKi: ReturnType<typeof nezetAt> = NEZETEK.muszer
  let helyzetek: Helyzet[] = []
  const halado = new Halado(0)
  const mutato: Mutato = { x: 0, y: 0, er: 0 }
  let mx = 0
  let my = 0
  let mutatoIdo = -1e9
  // the pointer in CSS pixels over the world (a mouse resting on it), or null: the probe names the sample under it
  let szondaPoz: { x: number; y: number } | null = null
  const hangObj = new Hang()
  let nyugodt = false
  let kocka = 0
  let t = 0
  let last = 0
  let raf = 0
  let merjFut = false
  const megjegyzesek: string[] = []
  let kapElkapva = false
  let gpuKoltseg: number | null = null
  let W = 0
  let H = 0
  let fejezetId = FEJEZETEK[0].id
  let lap: { el: HTMLElement; volt: boolean } | null = null
  let nyitoElem: Element | null = null
  let ty0: number | null = null

  const jegyzet = (s: string): void => {
    megjegyzesek.push(s)
    if (megjegyzesek.length > 20) megjegyzesek.shift()
  }
  const mozdulatlan = (): boolean => rm.matches || nyugodt

  /** Counts only while the world is still closed (a prepared world must not flash its loader when it opens); shows the loader once it is open. */
  function frissitToltes(): void {
    hud.toltes(lepesek.kesznek, lepesek.osszes, nyitott ? true : undefined)
    if (toltesTart) toltesKerj()
  }

  /** Draws the loader scene once at the displayed progress (the canvas is sized here: the post stack's targets do not exist yet). */
  function toltesRajz(): void {
    if (!gl || !toltoszal) return
    const cw = Math.max(1, root.clientWidth)
    const ch = Math.max(1, root.clientHeight)
    const w = Math.max(2, Math.round(cw * dpr * skala))
    const h = Math.max(2, Math.round(ch * dpr * skala))
    if (w !== tw || h !== th) {
      tw = w
      th = h
      hud.vaszon.width = w
      hud.vaszon.height = h
    }
    toltoszal.rajz(toltesKi, sm(0, 0.5, toltesKi), w, h, w / cw, szinek)
    hud.toltesOlvasat(toltesKi > 0 ? KALAND.gepadat.olvasat(Math.round(toltesIndex(toltesKi, MINTAK.gepadat.ertekek.length))) : '')
  }

  /** Under reduced motion the loader is one frame per real stage; otherwise a loop eases the line toward the stages done (quickly once everything is ready, so the line does not leave the visitor waiting). */
  function toltesKerj(): void {
    if (!toltoszal || !toltesTart) return
    if (rm.matches) {
      toltesKi = lepesek.arany
      toltesRajz()
    } else if (!toltesRaf) toltesRaf = requestAnimationFrame(toltesCiklus)
  }
  function toltesCiklus(now: number): void {
    toltesRaf = 0
    if (!toltesTart || !toltoszal || !nyitott) return
    const dt = toltesElozo ? Math.min(0.1, (now - toltesElozo) / 1000) : 1 / 60
    toltesElozo = now
    const cel = lepesek.arany
    toltesKi += (cel - toltesKi) * (1 - Math.exp(-dt * (lepesek.vege ? 14 : 6)))
    if (Math.abs(cel - toltesKi) < 0.002) toltesKi = cel
    toltesRajz()
    toltesRaf = requestAnimationFrame(toltesCiklus)
  }
  /** Resolves when the line has reached the end of the run (or after a moment: the wait is cosmetic and short, and only a world that really had to load pays it). */
  function toltesVege(): Promise<void> {
    if (!toltesTart || !toltoszal || rm.matches) return Promise.resolve()
    return new Promise((res) => {
      const t0 = performance.now()
      const v = (): void => {
        if (!nyitott || toltesKi >= 0.985 || performance.now() - t0 > 350) res()
        else setTimeout(v, 16)
      }
      v()
    })
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // stage two: context, programs, textures, one frame
  async function epit(): Promise<void> {
    const hely = beallitas.hely ?? document.body
    hely.append(root)
    const vaszon = hud.vaszon
    const mentesiAdat = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined'
    gl = webgl2 && !mentesiAdat ? kontextus(vaszon, !proba?.szoftveres) : null
    renderer = gl ? rendererNev(gl) : '-'
    const indok = kapuIndok({ webgl2, mentesiAdat, kontextus: gl ? 'ok' : 'nincs', renderer, szoftveresEngedett: !!proba?.szoftveres })
    if (indok || !gl) throw new Error(indok ?? 'no-context')
    lepesek.kesz('context')
    const g = gl
    maxPont = (g.getParameter(g.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64
    hdr = !!(g.getExtension('EXT_color_buffer_float') || g.getExtension('EXT_color_buffer_half_float'))
    dpr = Math.min(devicePixelRatio || 1, letra.szint === 'teljes' ? 1.5 : 1)
    skala = letra.skala
    vaszon.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      jegyzet('context lost')
      fazis = 'hiba'
      hiba = 'context-lost'
      bezar('kontextus')
    })
    szinek = szinekOlvas(root)

    const t0 = performance.now()
    const kesz = (nev: string): void => lepesek.kesz(nev)
    // the loader's own tiny program compiles first; the moment it is ready the visitor (if they are waiting) sees the instrument power on while the big programs finish
    void Toltoszal.keszit(g, { ertekek: MINTAK.gepadat.ertekek, kezdetPerc: MINTAK.gepadat.kezdetPerc, oszlop: MINTAK.honlap.racs.oszlop, sor: MINTAK.honlap.racs.sor }, kesz).then(
      (t) => {
        if (megsemmisitve) return t.dispose()
        toltoszal = t
        toltesKerj()
      },
      (e: unknown) => jegyzet(`loader scene: ${e instanceof Error ? e.message : String(e)}`),
    )
    // the effects with a real cost start off on a phone (the page's own overrides still win)
    const kezdet: Partial<Record<HatasNev, Partial<HatasKapcsolo>>> = {}
    for (const n of GAZDAG_HATASOK) kezdet[n] = { ...(telefon ? { be: false } : {}), ...beallitas.hatasok?.[n] }
    for (const n of Object.keys(beallitas.hatasok ?? {}) as HatasNev[]) kezdet[n] ??= beallitas.hatasok?.[n]
    const [p, sz, kp] = await Promise.all([
      Utofeldolgozas.keszit(g, hdr, kesz, jegyzet, kezdet),
      Reszecskek.keszit(
        g,
        {
          ertekek: MINTAK.gepadat.ertekek,
          kezdetPerc: MINTAK.gepadat.kezdetPerc,
          oszlop: MINTAK.honlap.racs.oszlop,
          sor: MINTAK.honlap.racs.sor,
          rgba: honlapRGBA(),
          feliratok: KALAND.gepadat.feliratok,
        },
        kesz,
      ),
      KepzesProgramok.keszit(g, kesz),
    ])
    if (megsemmisitve) {
      kp.dispose()
      return
    }
    kepProg = kp
    // chapter 5's address, drawn into a bitmap in the site's own mono face (the one place the world asks the browser to draw text); chapters 3 to 5 then build their targets and lines from true data
    const betutipus = getComputedStyle(root).getPropertyValue('--vilag-mono').trim() || 'monospace'
    const raszter = await betuRaszter(cimSorok(KALAND.kapcsolat.adat), betutipus)
    evekD = evekAdat(IDOVONAL, EPITES_EV)
    const uj = [new Kepzes(g, evekD, kp), new Kepzes(g, palyazatAdat(KALAND.palyazat.lapok), kp), new Kepzes(g, kapcsolatAdat(raszter), kp)]
    kesz('chapters')
    post = p
    jelenetek.set(sz.id, sz)
    for (const j of uj) jelenetek.set(j.id, j)
    // one list of labels for the DOM layer: the first scene's, then each formation scene's in the order of the route
    osszesFelirat = []
    for (const j of jelenetek.values()) {
      felirOffset.set(j.id, osszesFelirat.length)
      osszesFelirat.push(...j.feliratok)
    }
    hud.feliratok.keszit(osszesFelirat)
    helyzetek = osszesFelirat.map(() => ({ o: 0, x: 0, y: 0, s: 1 }))
    frissitDb()
    hud.kulcsokFrissit(p.hatasok, retegek, nezetRogzitett)
    fordit = performance.now() - t0
    if (megsemmisitve) return
    meret()
    // The first frame, drawn and waited for: a driver may defer the real compile to the first draw, and this is where that cost belongs (not in the visitor's first frame).
    rajz()
    g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4))
    lepesek.kesz('frame')
  }

  function elokeszit(): Promise<void> {
    if (!elokeszites) {
      if (megsemmisitve) return Promise.reject(new Error('destroyed'))
      fazis = 'keszul'
      elokeszites = epit().then(
        () => {
          if (fazis === 'keszul') fazis = nyitott ? 'nyitva' : 'kesz'
        },
        (e: unknown) => {
          fazis = 'hiba'
          hiba = e instanceof Error ? e.message : String(e)
          jegyzet(`prepare: ${hiba}`)
          throw e
        },
      )
    }
    return elokeszites
  }

  /** The particle count of the tier and the "sok" switch. */
  function frissitDb(): void {
    db = letra.szint === 'konnyu' ? DB.konnyu : post?.hatasok.sok.be === false ? DB.teljes : DB.sok
  }

  /** The look at route position `p` and its name: the pinned one (the review build's key), else the route's keyframes; the light tier always takes Mérőműszer. */
  function nezetKi(p: number): { id: NezetId; nezet: ReturnType<typeof nezetAt> } {
    if (letra.szint === 'konnyu') return { id: 'muszer', nezet: NEZETEK.muszer }
    if (nezetRogzitett) return { id: nezetRogzitett, nezet: NEZETEK[nezetRogzitett] }
    return { id: nezetNev(p), nezet: nezetAt(p) }
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // size and drawing
  function meret(): void {
    if (!post || !gl) return
    const asp = Math.max(1, root.clientWidth)
    const w = Math.max(2, Math.round(asp * dpr * skala))
    const h = Math.max(2, Math.round(Math.max(1, root.clientHeight) * dpr * skala))
    if (w === W && h === H) return
    W = w
    H = h
    hud.vaszon.width = w
    hud.vaszon.height = h
    post.meret(w, h)
  }

  function rajz(): void {
    if (!gl || !post) return
    meret()
    if (toltesRogzitett !== null && toltoszal) {
      // the loader pinned at a progress (a test or the review build asks for a frame of it)
      toltesKi = toltesRogzitett
      vetitesek = []
      toltesRajz()
      return
    }
    const asp = Math.max(1, root.clientWidth) / Math.max(1, root.clientHeight)
    const p = halado.sima
    // the scenes on screen at this place on the route: one, or two while a scene hands over to the next (each with its own camera and its weight)
    const lat = lathatok(p).filter((l) => jelenetek.has(l.jelenet))
    if (lat.length === 0) return
    const nz = hatasos(nezetKi(p).nezet, post.hatasok, retegek)
    nzKi = nz
    const sc = post.scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, sc.fbo)
    gl.viewport(0, 0, sc.w, sc.h)
    // the engine clears once; every scene ADDS its light with its own weight
    gl.clearColor(szinek.hatter[0], szinek.hatter[1], szinek.hatter[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    const ki: Meszet[] = []
    for (const l of lat) {
      const jelenet = jelenetek.get(l.jelenet)
      if (!jelenet) continue
      const poz = jelenet.poz(l.pl, asp, nz.kamera)
      const eye: [number, number, number] = [poz.eye[0] + mutato.x * 0.6 * mutato.er, poz.eye[1] + mutato.y * 0.35 * mutato.er, poz.eye[2]]
      const k = H / (2 * Math.tan(poz.fov / 2))
      const keret: Kocka = { gl, w: W, h: H, k, t, kocka, asp, p: l.pl, gain: l.gain, mutato, szinek, szint: letra.szint, db, dbRef: DB.teljes, nezet: nz, maxPont, giris }
      ki.push({ id: l.jelenet, v: jelenet.rajz(keret, { eye, tgt: poz.tgt, fov: poz.fov, shift: poz.shift }), gain: l.gain, pl: l.pl })
    }
    vetitesek = ki
    // the post stack takes how far the pictures have formed as the weighted mean, and the light of the scene that weighs most
    let sg = 0
    let forma = 0
    for (const w of ki) {
      sg += w.gain
      forma += w.gain * w.v.forma
    }
    const eloter = ki.reduce((a, b) => (b.gain > a.gain ? b : a))
    post.rajzol(letra.szint, szinek, { nezet: nz, forma: forma / (sg || 1), mozdulatlan: mozdulatlan(), kocka, feny: eloter.v.feny, kep: eloter.v.kep, giris })
  }

  /** Pins the loader scene at a fraction (the review key and the tests), or gives the world back with `null`. */
  function toltesKepAllit(arany: number | null): void {
    toltesRogzitett = arany === null ? null : Math.min(1, Math.max(0, arany))
    if (gl && post) {
      rajz()
      keres()
    }
  }

  /** Places the labels with the matrices of the frame that was just drawn (never inside `rajz`: the cost measurements draw many frames and must not write the DOM). Every scene on screen places its own labels, weighted by its gain. */
  function feliratFrissit(): void {
    if (vetitesek.length === 0) return
    const lb = nzKi.lb
    const sw = Math.max(1, root.clientWidth)
    const sh = Math.max(1, root.clientHeight)
    const mind: Helyzet[] = osszesFelirat.map(() => ({ o: 0, x: 0, y: 0, s: 1 }))
    for (const w of vetitesek) {
      const jelenet = jelenetek.get(w.id)
      const off = felirOffset.get(w.id)
      if (!jelenet || off === undefined) continue
      jelenet.feliratok.forEach((f, i) => {
        const h = feliratHelyzet(f, w.v, lb, sw, sh, nzKi.fr)
        mind[off + i] = { ...h, o: h.o * w.gain * giris }
      })
    }
    helyzetek = feliratUtkozes(osszesFelirat, mind)
    hud.feliratok.ir(helyzetek)
    // the probe belongs to the first scene (the thread of true samples), and only while that scene is the one on screen
    const elso = vetitesek.find((w) => w.id === 'reszecskek')
    const j = elso ? jelenetek.get(elso.id) : undefined
    if (elso && j) szondaFrissit(elso.v, j, sw, sh, elso.gain)
    else hud.szondaIr(null)
  }

  /** The probe: the sample nearest to a resting mouse, while the thread is what the scene shows (it yields as the picture forms, like the labels). */
  function szondaFrissit(v: Vetites, jelenet: Jelenet, sw: number, sh: number, gain: number): void {
    const o = (1 - sm(0.3, 0.7, v.forma)) * giris * gain
    const m = szondaPoz && o > 0.02 && jelenet.szonda ? jelenet.szonda(v, sw, sh, szondaPoz.x, szondaPoz.y) : null
    hud.szondaIr(m ? { x: m.x, y: m.y, o, szoveg: KALAND.gepadat.olvasat(m.i) } : null)
  }

  /** The synchronous cost of one frame at the current state (a draw plus a one-pixel readback): independent of the display's refresh rate and of any requestAnimationFrame throttle. */
  function koltseg(n = 8): number {
    if (!gl) return 0
    const px = new Uint8Array(4)
    const ts: number[] = []
    for (let i = 0; i < n; i++) {
      const a = performance.now()
      rajz()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      if (i >= 2) ts.push(performance.now() - a)
    }
    ts.sort((a, b) => a - b)
    return ts[ts.length >> 1]
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // the frame loop
  const keres = (): void => {
    if (!raf && nyitott && fazis === 'nyitva' && !toltesTart) raf = requestAnimationFrame(ciklus)
  }

  function fejlec(): void {
    if (!diagnosztika) return
    const l = letra
    hud.diag.textContent = `GPU: ${renderer} · fordítás ${fordit === null ? '-' : fordit.toFixed(0)} ms · képkocka: medián ${f1(l.utolso?.median ?? null)} ms, átlag ${f1(l.utolso?.ort ?? null)} ms, p95 ${f1(l.utolso?.p95 ?? null)} ms (${l.ablak}. ablak)${gpuKoltseg == null ? '' : ` · GPU-költség ${gpuKoltseg.toFixed(1)} ms${kapElkapva ? ' (a képkockaszám korlátozott, nem a GPU)' : ''}`} · ${W}×${H} px, skála ${skala.toFixed(2)} · ${l.szint}${hdr ? '' : ' · LDR'}${l.rogzitve ? ' · rögzítve' : ''} · nézet: ${NEZET_NEV[nezetKi(halado.sima).id]}${nezetRogzitett ? ' (rögzítve)' : ''} · hatás ${post ? GAZDAG_HATASOK.filter((n) => post!.hatasok[n].be).length : 0}/${GAZDAG_HATASOK.length} · réteg ${RETEGEK.filter((n) => retegek[n]).length}/${RETEGEK.length}${megjegyzesek.length ? ' · ' + megjegyzesek[megjegyzesek.length - 1] : ''}`
  }

  function letraLepes(r: LetraLepes): void {
    kapElkapva = letra.kap
    if (r.tipus === 'hatasKi') {
      // the first rung: the mirror and the costly effects go (and with them the 150,000 particles), the world is what the V2 ladder was measured on
      if (post) for (const n of GAZDAG_HATASOK) post.hatasok[n].be = false
      retegek.tukor = false
      frissitDb()
      if (post) hud.kulcsokFrissit(post.hatasok, retegek, nezetRogzitett)
      jegyzet(`mirror and effects off at ${r.ort.toFixed(1)} ms, GPU ${r.gpu.toFixed(1)} ms`)
    } else if (r.tipus === 'skala') {
      skala = r.skala
      meret()
      jegyzet(`scale ${skala.toFixed(2)} at ${r.ort.toFixed(1)} ms, GPU ${r.gpu.toFixed(1)} ms`)
    } else if (r.tipus === 'konnyu') {
      frissitDb()
      dpr = Math.min(dpr, 1)
      skala = r.skala
      meret()
      jegyzet(`light tier at ${r.ort.toFixed(1)} ms, GPU ${r.gpu.toFixed(1)} ms`)
    } else if (r.tipus === 'kap') {
      jegyzet(`interval ${r.ort.toFixed(1)} ms but GPU ${r.gpu.toFixed(1)} ms: frame rate capped, no step`)
    } else if (r.tipus === 'iker') {
      jegyzet(`DOM twin at GPU ${r.gpu.toFixed(1)} ms`)
      fazis = 'hiba'
      hiba = `ladder: GPU cost ${r.gpu.toFixed(1)} ms`
      fejlec()
      bezar('letra')
    }
  }

  /** The line under the camera for a chapter and the sample the scene names (the first scene's index of a minute; chapter 3's year cell; chapter 4's sheet). */
  function olvasat(id: FejezetId, i: number | null): string {
    switch (id) {
      case 'gepadat':
        return i !== null ? KALAND.gepadat.olvasat(i) : KALAND.honlap.olvasat
      case 'honlap':
        return KALAND.honlap.olvasat
      case 'evek': {
        const e = evekD
        if (!e) return ''
        const c = e.tengely.cellak
        return i !== null ? KALAND.evek.olvasat(c[i], e.futnak(i)) : KALAND.evek.osszkep(c[0], c[c.length - 1], e.savok.length)
      }
      case 'palyazat':
        return i !== null ? (KALAND.palyazat.lapok[i]?.cim ?? '') : ''
      case 'kapcsolat':
        return KALAND.kapcsolat.valaszido
    }
  }

  function ciklus(now: number): void {
    raf = 0
    if (!nyitott || fazis !== 'nyitva' || merjFut || !gl) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
    last = now
    const still = mozdulatlan()
    giris = still ? 1 : Math.min(1, giris + dt / 0.9)
    const mozog = halado.lep(dt, still) || giris < 1
    if (!still) t += dt
    // the pointer: eased, a force for 1.2 s after the last move (a response to input, never idle motion); none at all while the world is still
    const aktiv = !still && now - mutatoIdo < 1200
    mutato.x += (mx - mutato.x) * Math.min(1, dt * 8)
    mutato.y += (my - mutato.y) * Math.min(1, dt * 8)
    mutato.er += ((aktiv ? 1 : 0) - mutato.er) * Math.min(1, dt * 6)
    if (still) mutato.er = 0
    rajz()
    feliratFrissit()
    hud.cimIr(FEJEZETEK.map((f) => cimLathato(f.id, halado.sima) * giris))
    kocka++

    // the readout and the sound: the true sample under the camera, in the scene of the chapter the visitor is in
    const asp = Math.max(1, root.clientWidth) / Math.max(1, root.clientHeight)
    const fej = fejezetAt(halado.sima)
    if (fej.id !== fejezetId) {
      fejezetId = fej.id
      hud.fejezetJelol(fejezetId)
    }
    const jelenet = jelenetek.get(fej.jelenet)
    if (jelenet) {
      const pl = jelenetPl(fej.jelenet, halado.sima)
      hud.olvasatIr(olvasat(fej.id, jelenet.minta(pl, asp)))
      const v = jelenet.ertek(pl, asp)
      if (v !== null) hangObj.hang(v, korl(halado.mozgas / ELSO_SZAKASZ, 0, 1)) // the first scene's speed is the one the sound was tuned to
    }

    // the ladder: frame intervals decide, the synchronous GPU cost arbitrates (letra.ts). Not while the world is still: frames are rare then and say nothing about the load.
    if (!still && (!proba || proba.leptek)) {
      const r = letra.kocka(dt * 1000, () => {
        gpuKoltseg = proba?.koltseg ?? koltseg()
        return gpuKoltseg
      })
      if (r) {
        letraLepes(r)
        fejlec()
        if (!nyitott) return
      }
    } else if (still) letra.nullaz()
    if (!still || mozog || mutato.er > 0.01) keres()
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // input (wired when the world opens, removed when it closes)
  const allit = (p: number, azonnal = false): void => {
    if (azonnal) halado.ugrik(p)
    else halado.allit(p)
    hud.csuszka.value = String(Math.round(halado.cel * 1000))
    keres()
  }
  const setMutato = (x: number, y: number): void => {
    const r = root.getBoundingClientRect()
    mx = ((x - r.left) / r.width) * 2 - 1
    my = 1 - ((y - r.top) / r.height) * 2
    mutatoIdo = performance.now()
    keres()
  }
  const ikerben = (e: Event): boolean => e.target instanceof Node && hud.iker.contains(e.target)
  const onWheel = (e: WheelEvent): void => {
    if (ikerben(e)) return // the twin panel scrolls like any panel while it holds the focus
    e.preventDefault()
    allit(halado.cel + (e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY) * 0.0007 * ELSO_SZAKASZ) // the first scene keeps the pace it had as the whole route
  }
  const onTouchStart = (e: TouchEvent): void => {
    if (!ikerben(e)) ty0 = e.touches[0].clientY
  }
  const onTouchMove = (e: TouchEvent): void => {
    if (ty0 === null) return
    const y = e.touches[0].clientY
    allit(halado.cel - ((y - ty0) / (innerHeight * 1.1)) * ELSO_SZAKASZ)
    ty0 = y
    setMutato(e.touches[0].clientX, y)
  }
  const onTouchEnd = (): void => {
    ty0 = null
    mutatoIdo = -1e9
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      bezar('esc')
      return
    }
    const cel = e.target instanceof Element ? e.target : null
    if (cel === hud.csuszka || cel?.closest('button, a, input, textarea, select')) return
    const lep: Record<string, number> = { ArrowDown: 0.03 * ELSO_SZAKASZ, ArrowUp: -0.03 * ELSO_SZAKASZ, PageDown: 0.12 * ELSO_SZAKASZ, PageUp: -0.12 * ELSO_SZAKASZ, ' ': 0.12 * ELSO_SZAKASZ }
    if (e.key in lep) {
      e.preventDefault()
      allit(halado.cel + lep[e.key])
    } else if (e.key === 'Home') allit(0)
    else if (e.key === 'End') allit(1)
  }
  const onPointer = (e: PointerEvent): void => {
    // a mouse resting over the picture of the world (not over a control, not a finger) is what the probe follows
    const r = root.getBoundingClientRect()
    const cel = e.target instanceof Element ? e.target : null
    szondaPoz = e.pointerType === 'mouse' && !cel?.closest('button, a, input, textarea, select, .vilag-iker') ? { x: e.clientX - r.left, y: e.clientY - r.top } : null
    setMutato(e.clientX, e.clientY)
  }
  const onPointerLeave = (): void => {
    szondaPoz = null
    hud.szondaIr(null)
  }
  const onLathatosag = (): void => {
    if (document.hidden) hangObj.szuntet()
    else {
      hangObj.folytat()
      last = 0
      letra.nullaz()
      keres()
    }
  }
  const onMotion = (): void => {
    last = 0
    keres()
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { meret(); keres() }) : null

  hud.csuszka.addEventListener('input', () => allit(hud.csuszka.valueAsNumber / 1000))
  for (const f of FEJEZETEK) hud.utGombok.get(f.id)?.addEventListener('click', () => allit(f.nyugalom))
  hud.hang.addEventListener('click', async () => {
    if (hangObj.on) {
      hangObj.ki()
      hud.hang.setAttribute('aria-pressed', 'false')
      return
    }
    const ok = await hangObj.be()
    hud.hang.setAttribute('aria-pressed', ok ? 'true' : 'false')
  })
  hud.nyugodt.addEventListener('click', () => {
    nyugodt = !nyugodt
    hud.nyugodt.setAttribute('aria-pressed', String(nyugodt))
    if (nyugodt) {
      halado.ugrik(halado.cel)
      mutato.er = 0
    }
    last = 0
    keres()
  })
  hud.kilep.addEventListener('click', () => bezar('kulcs'))
  hud.hibaKilep.addEventListener('click', () => bezar('kulcs'))
  hud.merj.addEventListener('click', () => void merj())
  hud.letra.addEventListener('click', () => {
    letra.rogzitve = !letra.rogzitve
    hud.letra.setAttribute('aria-pressed', String(letra.rogzitve))
    hud.letra.textContent = letra.rogzitve ? 'Minőség: rögzítve' : 'Minőség: auto'
    fejlec()
  })
  // the review build's keys: the look, the costly effects, the layers (one function applies a change from a key and from the API alike)
  const kulcsokKi = (): void => {
    if (post) hud.kulcsokFrissit(post.hatasok, retegek, nezetRogzitett)
    fejlec()
    keres()
  }
  const hatasAllit = (nev: HatasNev, be: boolean, ero?: number): void => {
    if (!post) return
    post.hatasok[nev].be = be
    if (ero !== undefined) post.hatasok[nev].ero = ero
    if (nev === 'sok') frissitDb()
    kulcsokKi()
  }
  const retegAllit = (nev: RetegNev, be: boolean): void => {
    retegek[nev] = be
    kulcsokKi()
  }
  const nezetAllit = (id: NezetId | null): void => {
    nezetRogzitett = id
    kulcsokKi()
  }
  for (const [k, g] of hud.kulcsok.hatas) g.addEventListener('click', () => post && hatasAllit(k, !post.hatasok[k].be))
  for (const [k, g] of hud.kulcsok.reteg) g.addEventListener('click', () => retegAllit(k, !retegek[k]))
  for (const [k, g] of hud.kulcsok.nezet) g.addEventListener('click', () => nezetAllit(k === 'auto' ? null : k))
  for (const [k, g] of hud.kulcsok.tolt) {
    g.addEventListener('click', () => {
      toltesKepAllit(k === 'ki' ? null : Number(k))
      for (const [k2, g2] of hud.kulcsok.tolt) g2.setAttribute('aria-pressed', String(k2 === k))
    })
  }
  root.addEventListener('wheel', onWheel, { passive: false })
  root.addEventListener('touchstart', onTouchStart, { passive: true })
  root.addEventListener('touchmove', onTouchMove, { passive: true })
  root.addEventListener('touchend', onTouchEnd, { passive: true })
  root.addEventListener('keydown', onKey)
  root.addEventListener('pointermove', onPointer)
  root.addEventListener('pointerleave', onPointerLeave)

  // ---------------------------------------------------------------------------------------------------------------------------------
  // the "Mérés" key: the synchronous cost of one frame in sixteen fixed configurations. Every effect and layer is measured ALONE against the bare base (all effects and layers off, the stage look
  // pinned so that the base is the same in every row), then the look as it stands on the route at three places of the first scene (written in its own progress: 0.1 is the wide opening, 0.35 the flight
  // (the comets), 0.9 the picture close up) and once at render scale 0.7, then the three formation scenes where each chapter reads best and one hand-over, where two scenes are drawn at once.
  async function merj(n = 30): Promise<string[]> {
    if (merjFut || !gl || !post || !nyitott) return []
    merjFut = true
    hud.merj.disabled = true
    hud.merj.textContent = 'Mérés fut…'
    const g = gl
    const hatasok = post.hatasok
    const mentve = {
      skala,
      cel: halado.cel,
      sima: halado.sima,
      seb: halado.seb,
      mozgas: halado.mozgas,
      t,
      be: GAZDAG_HATASOK.map((k) => hatasok[k].be),
      ret: { ...retegek },
      rogzitett: nezetRogzitett,
    }
    const px = new Uint8Array(4)
    const sor: string[] = []
    type Sor = { cim: string; hatas?: HatasNev; reteg?: RetegNev; igy?: boolean; s: number; p: number }
    const E = ELSO_SZAKASZ
    const cfg: Sor[] = [
      { cim: 'alap', s: 1, p: 0.1 * E },
      { cim: 'alap', s: 1, p: 0.9 * E },
      { cim: '+ mélységélesség', hatas: 'melyseg', s: 1, p: 0.1 * E },
      { cim: '+ fénycsóva', hatas: 'fenycsova', s: 1, p: 0.1 * E },
      { cim: '+ por', hatas: 'por', s: 1, p: 0.1 * E },
      { cim: '+ több részecske', hatas: 'sok', s: 1, p: 0.1 * E },
      { cim: '+ rács', reteg: 'racs', s: 1, p: 0.1 * E },
      { cim: '+ tükör', reteg: 'tukor', s: 1, p: 0.1 * E },
      { cim: 'nézet így', igy: true, s: 1, p: 0.1 * E },
      { cim: 'nézet így', igy: true, s: 1, p: 0.35 * E },
      { cim: 'nézet így', igy: true, s: 1, p: 0.9 * E },
      { cim: 'nézet így', igy: true, s: 0.7, p: 0.9 * E },
      // the formation scenes at the place where each chapter reads best, and the hand-over where two scenes are drawn at once
      { cim: 'nézet így', igy: true, s: 1, p: FEJEZETEK[2].nyugalom },
      { cim: 'nézet így', igy: true, s: 1, p: FEJEZETEK[3].nyugalom },
      { cim: 'nézet így', igy: true, s: 1, p: FEJEZETEK[4].nyugalom },
      { cim: 'nézet így, két jelenet', igy: true, s: 1, p: ATMENET_KOZEP[1] },
    ]
    try {
      for (const r of cfg) {
        for (const [i, k] of GAZDAG_HATASOK.entries()) hatasok[k].be = r.igy ? mentve.be[i] : k === r.hatas
        for (const k of RETEGEK) retegek[k] = r.igy ? mentve.ret[k] : k === r.reteg
        nezetRogzitett = r.igy ? mentve.rogzitett : 'szinpad'
        skala = r.s
        frissitDb()
        halado.ugrik(r.p)
        meret()
        const ts: number[] = []
        for (let i = 0; i < n; i++) {
          t += 1 / 60
          const a = performance.now()
          rajz()
          g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px)
          const d = performance.now() - a
          if (i >= 6) ts.push(d)
          if (i % 6 === 5) {
            await new Promise((res) => setTimeout(res, 0))
            if (megsemmisitve || gl !== g) return sor // the world was torn down (or lost its context) while measuring: stop, the rows so far stand
          }
        }
        ts.sort((a, b) => a - b)
        sor.push(`${r.cim}${r.igy ? ` (${NEZET_NEV[nezetKi(r.p).id]})` : ''} · skála ${r.s} · mélység ${+r.p.toFixed(3)} · ${db / 1000}k: medián ${ts[ts.length >> 1].toFixed(1)} ms (min ${ts[0].toFixed(1)}) · ${W}×${H}`)
        hud.merjKi.textContent = sor.join('\n')
        hud.merjKi.hidden = false
      }
    } finally {
      skala = mentve.skala
      halado.cel = mentve.cel
      halado.sima = mentve.sima
      halado.seb = mentve.seb
      halado.mozgas = mentve.mozgas
      t = mentve.t
      for (const [i, k] of GAZDAG_HATASOK.entries()) hatasok[k].be = mentve.be[i]
      Object.assign(retegek, mentve.ret)
      nezetRogzitett = mentve.rogzitett
      frissitDb()
      meret()
      merjFut = false
      last = 0
      letra.nullaz()
      hud.merj.disabled = false
      hud.merj.textContent = 'Mérés'
      if (post) hud.kulcsokFrissit(post.hatasok, retegek, nezetRogzitett)
      fejlec()
      keres()
    }
    return sor
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // open and close
  async function megnyit(): Promise<void> {
    if (megsemmisitve) throw new Error('destroyed')
    if (nyitott) return
    nyitott = true
    nyitoElem = beallitas.nyito ?? document.activeElement
    const hely = beallitas.hely ?? document.body
    if (!root.isConnected) hely.append(root)
    document.documentElement.classList.add('vilag-nyitva')
    hud.nyitva(true)
    const l = beallitas.lap
    if (l && !l.contains(root)) {
      lap = { el: l, volt: l.inert }
      l.inert = true
    }
    document.addEventListener('visibilitychange', onLathatosag)
    rm.addEventListener('change', onMotion)
    ro?.observe(root)
    try {
      // A world that failed for good (preparing was refused or broke, the context was lost, the ladder gave up) still answers the click: with the one-sentence message and the exit key, never with nothing.
      if (fazis === 'hiba') throw new Error(hiba ?? 'the world failed')
      const keszVolt = lepesek.vege && fazis !== 'uj'
      if (!keszVolt) {
        toltesTart = true
        toltesElozo = 0
        toltesKi = 0
        frissitToltes()
      }
      await elokeszit()
      await toltesVege()
    } catch (e) {
      toltesTart = false
      hud.toltes(lepesek.kesznek, lepesek.osszes, false)
      hud.hiba(KALAND.vezerlok.hiba)
      hud.hibaKilep.focus()
      throw e
    }
    if (!nyitott) return // closed while preparing
    fazis = 'nyitva'
    toltesTart = false
    if (toltesRaf) cancelAnimationFrame(toltesRaf)
    toltesRaf = 0
    giris = mozdulatlan() ? 1 : 0 // the atmosphere comes in over the first moments (the visitor is never kept waiting: the slider answers at once)
    hud.toltes(lepesek.kesznek, lepesek.osszes, false)
    last = 0
    fejezetId = fejezetAt(halado.sima).id
    hud.fejezetJelol(fejezetId)
    hud.csuszka.value = String(Math.round(halado.cel * 1000))
    keres()
    fejlec()
    hud.elsoFokusz.focus({ preventScroll: true })
  }

  function bezar(ok: BezarOk = 'api'): void {
    if (!nyitott) return
    nyitott = false
    if (fazis === 'nyitva' || fazis === 'keszul') fazis = elokeszites && lepesek.vege ? 'kesz' : 'uj'
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    toltesTart = false
    if (toltesRaf) cancelAnimationFrame(toltesRaf)
    toltesRaf = 0
    hangObj.ki()
    hangObj.szuntet()
    hud.hang.setAttribute('aria-pressed', 'false')
    hud.hiba(null)
    hud.nyitva(false)
    document.documentElement.classList.remove('vilag-nyitva')
    document.removeEventListener('visibilitychange', onLathatosag)
    rm.removeEventListener('change', onMotion)
    ro?.disconnect()
    if (lap) {
      lap.el.inert = lap.volt
      lap = null
    }
    const fok = nyitoElem
    nyitoElem = null
    if (fok instanceof HTMLElement && fok.isConnected) fok.focus({ preventScroll: true })
    beallitas.bezarva?.(ok)
  }

  function megsemmisit(): void {
    if (megsemmisitve) return
    bezar('api')
    megsemmisitve = true
    for (const j of jelenetek.values()) j.dispose()
    jelenetek.clear()
    kepProg?.dispose()
    kepProg = null
    toltoszal?.dispose()
    toltoszal = null
    post?.megsemmisit()
    post = null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    gl = null
    hangObj.megsemmisit()
    root.remove()
    fazis = 'hiba'
    hiba = hiba ?? 'destroyed'
  }

  return {
    elokeszit,
    megnyit,
    bezar,
    megsemmisit,
    allit,
    merj,
    toltesKep: toltesKepAllit,
    hatas: hatasAllit,
    reteg: retegAllit,
    nezet: nezetAllit,
    allapot(): Allapot {
      return {
        fazis,
        hiba,
        lepesek: { kesz: lepesek.kesznek, osszes: lepesek.osszes, nevek: lepesek.lista },
        renderer,
        szint: letra.szint,
        skala,
        p: halado.sima,
        fejezet: fejezetAt(halado.sima).id,
        kepkockak: kocka,
        fordit,
        median: letra.utolso?.median ?? null,
        ort: letra.utolso?.ort ?? null,
        p95: letra.utolso?.p95 ?? null,
        gpu: gpuKoltseg,
        kap: letra.kap,
        rogzitve: letra.rogzitve,
        ablak: letra.ablak,
        megjegyzesek: [...megjegyzesek],
        hang: hangObj.on,
        nyugodt,
        nyitott,
        hatasok: post ? { ...post.hatasok } : { ...ALAP_HATASOK },
        retegek: { ...retegek },
        nezet: nezetKi(halado.sima).id,
        nezetRogzitett,
        jelenetek: vetitesek.map((w) => ({ id: w.id, suly: w.gain })),
        db,
        vaszon: { w: W, h: H },
      }
    },
  }
}
