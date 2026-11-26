// The world's DOM: the root, the canvas, the loader scene, the controls, the route lane, the depth slider, the readout and the text twin. Built when the world is made, not when its module loads.
// Every word comes from src/content/kaland.ts; every control is a real element with a name; the canvas is aria-hidden and the twin is the accessible copy of what it shows.
import { KALAND } from '../content/kaland.ts'
import { MINTAK } from '../content/mintak.ts'
import { FELIRAT_HORGONY, type Felirat, type Helyzet } from './feliratok.ts'
import { GAZDAG_HATASOK, RETEGEK, type HatasKapcsolo, type HatasNev, type RetegNev } from './hatasok.ts'
import { FEJEZETEK, type FejezetId } from './idovonal.ts'
import { NEZET_NEV, type NezetId } from './nezet.ts'
import { palya } from './palya.ts'
import CSS from './vilag.css?inline'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, klassz?: string, szoveg?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (klassz) e.className = klassz
  if (szoveg !== undefined) e.textContent = szoveg
  return e
}

function gomb(szoveg: string, nev?: string, nyomhato = false): HTMLButtonElement {
  const g = el('button', 'vilag-gomb', szoveg)
  g.type = 'button'
  if (nev) g.setAttribute('aria-label', nev)
  if (nyomhato) g.setAttribute('aria-pressed', 'false')
  return g
}

/** The labels hung in the scene: DOM text in the site's own type, `aria-hidden` (the twin lists the same facts). */
export interface FeliratReteg {
  /** Builds one element per label (once; a second call replaces them). */
  keszit(lista: readonly Felirat[]): void
  /** Places the labels; only a changed value is written. */
  ir(helyzetek: readonly Helyzet[]): void
}

/** The review build's keys under the diagnostic line: the look, the costly effects, the layers. Nothing here exists for a visitor. */
export interface Kulcsok {
  nezet: ReadonlyMap<NezetId | 'auto', HTMLButtonElement>
  hatas: ReadonlyMap<HatasNev, HTMLButtonElement>
  reteg: ReadonlyMap<RetegNev, HTMLButtonElement>
  /** The review build's loader keys: the loader scene pinned at 15, 50 and 100 % (`'0.15'`, `'0.5'`, `'1'`), or `'ki'` for the world. */
  tolt: ReadonlyMap<string, HTMLButtonElement>
}

export interface Hud {
  gyoker: HTMLElement
  vaszon: HTMLCanvasElement
  hang: HTMLButtonElement
  nyugodt: HTMLButtonElement
  kilep: HTMLButtonElement
  csuszka: HTMLInputElement
  olvasat: HTMLElement
  utGombok: ReadonlyMap<FejezetId, HTMLButtonElement>
  merj: HTMLButtonElement
  letra: HTMLButtonElement
  diag: HTMLOutputElement
  merjKi: HTMLOutputElement
  feliratok: FeliratReteg
  kulcsok: Kulcsok
  /** Marks the review keys with the state of the switches and the pinned look. */
  kulcsokFrissit(h: Readonly<Record<HatasNev, HatasKapcsolo>>, r: Readonly<Record<RetegNev, boolean>>, rogzitett: NezetId | null): void
  /** The first control the focus goes to when the world opens. */
  elsoFokusz: HTMLElement
  /** The text twin's chapter by id (so a test or V7 can find it). */
  iker: HTMLElement
  /** Sets the loader's counter to n of N stages (the scene itself is drawn by the engine on the canvas). `lathato` true shows it, false fades it out (or hides it at once when `azonnal` is true), left out only updates the counters. */
  toltes(n: number, osszes: number, lathato?: boolean, azonnal?: boolean): void
  /** How visible each chapter's caption is (0..1, in the order of the route's chapters): the caption is the chapter's title, its sentence and its note, set in the scene's own type (a visual copy; the twin has the words). */
  cimIr(lathato: readonly number[]): void
  /** The line the loader's pen reads out (a visual line, not a live region). */
  toltesOlvasat(szoveg: string): void
  /** The probe (the ring and the line beside the sample under the pointer): a visual aid, hidden from assistive technology, and a `null` hides it. `o` is its opacity 0..1. */
  szondaIr(h: { x: number; y: number; o: number; szoveg: string } | null): void
  /** Sets the readout and the slider's spoken value together (a live region; only a changed text is written). */
  olvasatIr(szoveg: string): void
  fejezetJelol(id: FejezetId): void
  hiba(szoveg: string | null): void
  nyitva(be: boolean): void
}

function ikerEpit(): HTMLElement {
  const iker = el('section', 'vilag-iker')
  iker.dataset.vilagIker = ''
  const g = KALAND.gepadat
  const h = KALAND.honlap
  iker.append(el('h2', undefined, g.cim), el('p', undefined, g.mondat), el('p', undefined, g.ikerOsszegzes))
  const gl = el('a', undefined, g.link.felirat)
  gl.href = g.link.href
  const gp = el('p')
  gp.append(gl)
  // The facts the labels in the scene show, as text: one line per hour (clock, value), the maximum and the minimum with their times, the end of the run. The same strings as the labels.
  const P = palya(MINTAK.gepadat.ertekek, MINTAK.honlap.racs.oszlop, MINTAK.honlap.racs.sor, MINTAK.gepadat.kezdetPerc)
  const f = g.feliratok
  const lista = el('ul')
  for (const i of P.oraIdx) lista.append(el('li', undefined, i === MINTAK.gepadat.ertekek.length - 1 ? f.muszakvaltas : `${f.ora(i)} \u{b7} ${f.ertek(i)}`))
  lista.append(el('li', undefined, f.csucs(P.iMax)), el('li', undefined, f.melypont(P.iMin)))
  iker.append(el('h3', undefined, g.ikerCim), lista)
  iker.append(gp)
  iker.append(el('h2', undefined, h.cim), el('p', undefined, h.mondat), el('p', undefined, h.alt), el('p', undefined, h.minta), el('p', undefined, h.meretek))
  const hl = el('a', undefined, h.link.felirat)
  hl.href = h.link.href
  const hp = el('p')
  hp.append(hl)
  iker.append(hp)

  // Chapter 3: the page's own table (the years and the areas, row for row) and its closing sentence: everything the lanes and the cells of the scene show.
  const e = KALAND.evek
  const tabla = el('table')
  tabla.append(el('caption', undefined, e.tablazat.felirat))
  const fej = el('tr')
  for (const [szoveg] of [[e.tablazat.ev], [e.tablazat.terulet]]) {
    const th = el('th', undefined, szoveg)
    th.scope = 'col'
    fej.append(th)
  }
  const thead = el('thead')
  thead.append(fej)
  const tbody = el('tbody')
  for (const sor of e.sorok) {
    const tr = el('tr')
    tr.append(el('td', undefined, sor.ev), el('td', undefined, sor.terulet))
    tbody.append(tr)
  }
  tabla.append(thead, tbody)
  iker.append(el('h2', undefined, e.cim), el('p', undefined, e.mondat), tabla, el('p', undefined, e.zaro))

  // Chapter 4: the sentence, the sheets (title and sentence of each), the limit and the mail link.
  const p = KALAND.palyazat
  const lapok = el('ul')
  for (const l of p.lapok) lapok.append(el('li', undefined, `${l.cim}: ${l.mondat}`))
  const pl = el('a', undefined, p.level.felirat)
  pl.href = p.level.href
  pl.setAttribute('aria-label', p.level.nev)
  const pp = el('p')
  pp.append(pl)
  iker.append(el('h2', undefined, p.cim), el('p', undefined, p.vallalas), el('h3', undefined, p.ikerCim), lapok, el('p', undefined, p.hatar), pp)

  // Chapter 5: the address as text and as a link (the particles of the scene only draw it), the response time, the talk request.
  const k = KALAND.kapcsolat
  const ap = el('p')
  const al = el('a', undefined, k.adat)
  al.href = k.href
  ap.append(al)
  const bp = el('p')
  const bl = el('a', undefined, k.beszelgetes.felirat)
  bl.href = k.beszelgetes.href
  bp.append(bl)
  iker.append(el('h2', undefined, k.cim), el('p', undefined, k.mondat), ap, el('p', undefined, k.valaszido), bp)
  return iker
}

/** Builds the world's DOM inside `gyoker` content (not yet attached). `diagnosztika` adds the review build's line and keys. */
export function hudEpit(diagnosztika: boolean): Hud {
  const gyoker = el('div', 'vilag')
  gyoker.setAttribute('role', 'dialog')
  gyoker.setAttribute('aria-modal', 'true')
  gyoker.setAttribute('aria-label', KALAND.vezerlok.nev)
  gyoker.dataset.tema = 'sotet'
  // Focusable by script and by a click, not by Tab: a click on the picture then leaves the focus inside the world, so Esc and the keys still reach it.
  gyoker.tabIndex = -1
  const stilus = el('style')
  stilus.textContent = CSS

  const vaszon = el('canvas', 'vilag-vaszon')
  vaszon.setAttribute('aria-hidden', 'true')
  // The labels hung in the scene: DOM text over the canvas, hidden from assistive technology (the twin lists the same facts).
  const felRoot = el('div', 'vilag-feliratok')
  felRoot.setAttribute('aria-hidden', 'true')
  let felEl: HTMLElement[] = []
  let felUtolso: number[] = []
  let felLista: readonly Felirat[] = []
  const feliratok: FeliratReteg = {
    keszit(lista) {
      felRoot.replaceChildren()
      felLista = lista
      felEl = lista.map((f) => {
        const e = el('span', 'vilag-felirat', f.szoveg)
        e.dataset.tip = f.tip
        if (f.sor && f.szoveg.length > f.sor) {
          // a long label wraps at this many characters (the width the layout assumed, feliratok.ts)
          e.dataset.sor = ''
          e.style.setProperty('--sor', String(f.sor))
        }
        felRoot.append(e)
        return e
      })
      felUtolso = lista.map(() => -1)
    },
    ir(helyzetek) {
      for (let i = 0; i < felEl.length; i++) {
        const h = helyzetek[i]
        const e = felEl[i]
        if (!h || h.o < 0.02) {
          if (felUtolso[i] !== 0) {
            e.style.opacity = '0'
            felUtolso[i] = 0
          }
          continue
        }
        e.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px) ${FELIRAT_HORGONY[felLista[i].tip]} scale(${h.s.toFixed(3)})`
        e.style.opacity = h.o.toFixed(2)
        felUtolso[i] = h.o
      }
    },
  }

  // header: the route lane (left), the keys (right)
  const fej = el('header', 'vilag-fej')
  const ut = el('nav', 'vilag-ut')
  ut.setAttribute('aria-label', KALAND.vezerlok.ut)
  const lista = el('ol')
  const utGombok = new Map<FejezetId, HTMLButtonElement>()
  for (const f of FEJEZETEK) {
    const li = el('li')
    const g = gomb(KALAND[f.id].cim)
    g.dataset.fejezet = f.id
    utGombok.set(f.id, g)
    li.append(g)
    lista.append(li)
  }
  ut.append(lista)
  const kulcsok = el('div', 'vilag-kulcsok')
  const hang = gomb(KALAND.vezerlok.hang, undefined, true)
  const nyugodt = gomb(KALAND.vezerlok.nyugodt.felirat, KALAND.vezerlok.nyugodt.nev, true)
  const kilep = gomb(KALAND.vezerlok.kilepes.felirat, KALAND.vezerlok.kilepes.nev)
  const merj = gomb('Mérés')
  const letra = gomb('Minőség: auto', undefined, true)
  merj.hidden = letra.hidden = !diagnosztika
  kulcsok.append(merj, letra, hang, nyugodt, kilep)
  fej.append(ut, kulcsok)

  // review build: the diagnostic line and the keys of the looks, the costly effects and the layers (the owner decides which stay)
  const diagP = el('div', 'vilag-diag')
  const diag = el('output')
  diag.setAttribute('aria-live', 'off')
  const merjKi = el('output', 'vilag-merjki')
  merjKi.setAttribute('aria-live', 'off')
  merjKi.hidden = true
  const sorok = el('div', 'vilag-sorok')
  const nezetG = new Map<NezetId | 'auto', HTMLButtonElement>()
  const hatasG = new Map<HatasNev, HTMLButtonElement>()
  const retegG = new Map<RetegNev, HTMLButtonElement>()
  const toltG = new Map<string, HTMLButtonElement>()
  const sor = <K>(cim: string, tetelek: readonly [K, string][], gyujto: Map<K, HTMLButtonElement>): void => {
    const d = el('div', 'vilag-sor')
    d.append(el('span', 'vilag-sor-cim', cim))
    for (const [k, felirat] of tetelek) {
      const g = gomb(felirat, undefined, true)
      g.classList.add('vilag-gomb-kicsi')
      gyujto.set(k, g)
      d.append(g)
    }
    sorok.append(d)
  }
  const HATAS_CIM: Readonly<Record<string, string>> = { melyseg: 'Mélységélesség', fenycsova: 'Fénycsóva', por: 'Por', sok: 'Több részecske' }
  const RETEG_CIM: Readonly<Record<RetegNev, string>> = { racs: 'Rács', tukor: 'Tükör', felirat: 'Feliratok', ragyogas: 'Háttérfény' }
  if (diagnosztika) {
    sor<NezetId | 'auto'>('Nézet', [['auto', 'Útvonal szerint'], ...(Object.keys(NEZET_NEV) as NezetId[]).map((k) => [k, NEZET_NEV[k]] as [NezetId, string])], nezetG)
    sor<HatasNev>('Hatás', GAZDAG_HATASOK.map((k) => [k, HATAS_CIM[k]] as [HatasNev, string]), hatasG)
    sor<RetegNev>('Réteg', RETEGEK.map((k) => [k, RETEG_CIM[k]] as [RetegNev, string]), retegG)
    sor<string>('Betöltő', [['ki', 'A világ'], ['0.15', '15 %'], ['0.5', '50 %'], ['1', '100 %']], toltG)
    toltG.get('ki')?.setAttribute('aria-pressed', 'true')
  }
  diagP.append(diag, sorok, merjKi)
  diagP.hidden = !diagnosztika

  // the chapter captions: title, sentence and note in the scene's own type, a visual copy of what the twin says (aria-hidden), so the simulated-data notice is never only in the text
  const cim = el('div', 'vilag-cim')
  cim.setAttribute('aria-hidden', 'true')
  const cimBlokk = (id: FejezetId, fej: string, mondat: string, jegyzet: string): HTMLElement => {
    const b = el('div', 'vilag-cim-blokk')
    b.dataset.fejezet = id
    b.style.opacity = '0'
    b.append(el('h2', 'vilag-cim-fej', fej), el('p', 'vilag-cim-mondat', mondat), el('p', 'vilag-cim-jegyzet', jegyzet))
    return b
  }
  const cimBlokkok = new Map<FejezetId, HTMLElement>()
  const cimek: Readonly<Record<FejezetId, readonly [string, string, string]>> = {
    gepadat: [KALAND.gepadat.cim, KALAND.gepadat.mondat, KALAND.gepadat.szimulalt],
    honlap: [KALAND.honlap.cim, KALAND.honlap.mondat, KALAND.honlap.minta],
    evek: [KALAND.evek.cim, KALAND.evek.mondat, KALAND.evek.zaro],
    palyazat: [KALAND.palyazat.cim, KALAND.palyazat.vallalas, KALAND.palyazat.hatar],
    kapcsolat: [KALAND.kapcsolat.cim, KALAND.kapcsolat.mondat, KALAND.kapcsolat.valaszido],
  }
  for (const fe of FEJEZETEK) {
    const b = cimBlokk(fe.id, ...cimek[fe.id])
    cimBlokkok.set(fe.id, b)
    cim.append(b)
  }

  // bottom: the readout, the slider, the contact line (never hidden)
  const als = el('div', 'vilag-als')
  const bal = el('div', 'vilag-bal')
  const olvasat = el('p', 'vilag-olvasat')
  olvasat.setAttribute('role', 'status')
  olvasat.setAttribute('aria-live', 'polite')
  const cimke = el('label', 'vilag-mely')
  const cimkeSzoveg = el('span', undefined, KALAND.vezerlok.csuszka)
  const csuszka = el('input')
  csuszka.type = 'range'
  csuszka.min = '0'
  csuszka.max = '1000'
  csuszka.step = '1'
  csuszka.value = '0'
  cimke.append(cimkeSzoveg, csuszka)
  const level = el('a', 'vilag-level', KALAND.kapcsolat.felirat)
  level.href = KALAND.kapcsolat.href
  bal.append(cim, olvasat)
  als.append(bal, cimke, level)

  // the loader scene
  const toltes = el('div', 'vilag-toltes')
  toltes.setAttribute('role', 'progressbar')
  toltes.setAttribute('aria-label', KALAND.vezerlok.betoltes)
  toltes.setAttribute('aria-valuemin', '0')
  toltes.hidden = true
  const szamlalo = el('p', 'vilag-szamlalo')
  szamlalo.setAttribute('aria-hidden', 'true')
  // what the pen reads while it draws (a visual line only: the live region is the readout, which must not announce a changing value during loading)
  const toltOlvasat = el('p', 'vilag-tolt-olvasat')
  toltOlvasat.setAttribute('aria-hidden', 'true')
  toltes.append(szamlalo, toltOlvasat)

  // the probe: a ring on the sample nearest to the pointer and its time and value, in the scene's own type (the twin has the same sentence for every sample)
  const szondaEl = el('div', 'vilag-szonda')
  szondaEl.setAttribute('aria-hidden', 'true')
  const szondaGyuru = el('span', 'vilag-szonda-gyuru')
  const szondaSzoveg = el('span', 'vilag-szonda-szoveg')
  szondaEl.append(szondaGyuru, szondaSzoveg)
  let szondaUtolso = ''

  const hibaP = el('p', 'vilag-hiba')
  hibaP.setAttribute('role', 'status')
  hibaP.hidden = true

  const iker = ikerEpit()
  gyoker.append(stilus, vaszon, felRoot, szondaEl, fej, diagP, als, iker, toltes, hibaP)

  let utolso = ''
  const cimUtolso = FEJEZETEK.map(() => 0)
  let fadeTimer = 0
  let fadeVeg: (() => void) | null = null
  const fadeMegszakit = (): void => {
    if (fadeTimer) {
      clearTimeout(fadeTimer)
      fadeTimer = 0
    }
    if (fadeVeg) {
      toltes.removeEventListener('transitionend', fadeVeg)
      fadeVeg = null
    }
  }
  return {
    gyoker, vaszon, hang, nyugodt, kilep, csuszka, olvasat, utGombok, merj, letra, diag, merjKi, iker, feliratok,
    kulcsok: { nezet: nezetG, hatas: hatasG, reteg: retegG, tolt: toltG },
    kulcsokFrissit(h, r, rogzitett) {
      for (const [k, g] of hatasG) g.setAttribute('aria-pressed', String(h[k].be))
      for (const [k, g] of retegG) g.setAttribute('aria-pressed', String(r[k]))
      for (const [k, g] of nezetG) g.setAttribute('aria-pressed', String(k === (rogzitett ?? 'auto')))
    },
    elsoFokusz: csuszka,
    toltes(n, osszes, lathato, azonnal) {
      if (lathato) {
        fadeMegszakit()
        toltes.hidden = false
        delete toltes.dataset.vege
      } else if (lathato === false && azonnal) {
        fadeMegszakit()
        if (!toltes.hidden) toltes.hidden = true
        delete toltes.dataset.vege
      } else if (lathato === false && !toltes.hidden) {
        fadeMegszakit()
        toltes.dataset.vege = ''
        // Under reduced motion the fade is the plain opacity change; without a running transition the element is removed from sight at once.
        const veg = (): void => {
          fadeMegszakit()
          if (toltes.dataset.vege !== undefined) toltes.hidden = true
        }
        if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
          fadeVeg = veg
          toltes.addEventListener('transitionend', veg, { once: true })
        }
        fadeTimer = window.setTimeout(veg, 600)
      }
      toltes.setAttribute('aria-valuemax', String(osszes))
      toltes.setAttribute('aria-valuenow', String(n))
      szamlalo.textContent = `${KALAND.vezerlok.betoltes} ${n} / ${osszes}`
    },
    toltesOlvasat(szoveg) {
      if (toltOlvasat.textContent !== szoveg) toltOlvasat.textContent = szoveg
    },
    cimIr(lathato) {
      FEJEZETEK.forEach((fe, i) => {
        const w = Math.round(Math.max(0, Math.min(1, lathato[i] ?? 0)) * 50) / 50
        if (w === cimUtolso[i]) return
        cimUtolso[i] = w
        const b = cimBlokkok.get(fe.id)
        if (b) b.style.opacity = String(w)
      })
    },
    szondaIr(h) {
      if (!h || h.o < 0.02) {
        if (szondaUtolso !== '') {
          szondaEl.style.opacity = '0'
          szondaUtolso = ''
        }
        return
      }
      if (szondaSzoveg.textContent !== h.szoveg) szondaSzoveg.textContent = h.szoveg
      szondaEl.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px)`
      szondaEl.style.opacity = h.o.toFixed(2)
      szondaUtolso = 'be'
    },
    olvasatIr(szoveg) {
      if (szoveg === utolso) return
      utolso = szoveg
      olvasat.textContent = szoveg
      csuszka.setAttribute('aria-valuetext', szoveg)
    },
    fejezetJelol(id) {
      for (const [k, g] of utGombok) {
        if (k === id) g.setAttribute('aria-current', 'step')
        else g.removeAttribute('aria-current')
      }
    },
    hiba(szoveg) {
      hibaP.hidden = szoveg === null
      if (szoveg !== null) hibaP.textContent = szoveg
    },
    nyitva(be) {
      if (be) gyoker.dataset.nyitva = ''
      else delete gyoker.dataset.nyitva
    },
  }
}
