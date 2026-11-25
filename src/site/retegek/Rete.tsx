import type { ReactNode } from 'react'
import { HIVAS_LEVEL, levelCim } from '@/content/alapadatok'
import { JEL } from '@/content/fooldal'
import { BEMUTATKOZO } from '@/content/szegmensek/bemutatkozo'
import { CNC1_HOMERSEKLET, QR_SOR0, fmt } from '../fooldal/jelalak'
import { PAROK_LAPOK, RETEG, honlapLapok, type Blokk, type LapNev, type LapTartalom, type RetegPar } from '@/content/retegek'
import { GUT, savUt } from './sav'

// The "Rétegek" stack: one screen as three sheets in DOM order Adat, Szabály, Felület. Rendered here as plain markup (no script needed to read it); src/site/retegek-futtat.ts moves it.
// The sheet's local size is fixed (portrait 250 x 330, landscape 431 x 330); CSS scales and places it (retegek.css).

export const LAP_SZELESSEG = { p: 250, l: 431 } as const
/** The lane's local height and the head's: the level step of the stack is HEAD + LANE (44 + 36 on the first screen's cascade, 44 + 40 in the section). */
export const LANE = 40

/** The two sheets behind a pair's screen: its record (Adat) and its rule (Szabály), from the content files. */
export function parLapok(par: RetegPar): { adat: LapTartalom; szabaly: LapTartalom; alak: 'p' | 'l' } {
  if (par === 'honlap') return { alak: PAROK_LAPOK.honlap.alak, ...honlapLapok(BEMUTATKOZO.belepo) }
  const p = PAROK_LAPOK[par]
  return { alak: p.alak, adat: p.adat, szabaly: p.szabaly }
}

function Sorok({ sorok }: { sorok: { cimke: string; ertek: string; e?: number; halk?: { s: string; e?: number }; elo?: true }[] }) {
  return (
    <dl>
      {sorok.map((s) => (
        <div className="rt-s" key={s.cimke} {...(s.e ? { 'data-e': s.e } : {})}>
          <dt>{s.cimke}</dt>
          {s.ertek ? (
            <dd>
              {s.elo ? <span data-rt-olv="">{s.ertek}</span> : s.ertek}
              {s.halk ? <span className="rt-h" {...(s.halk.e ? { 'data-e': s.halk.e } : {})}>{s.halk.s}</span> : null}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

/** The 29 modules of the QR code's row 0 (public/demos/kezikonyv): filled squares for 1, outlined for 0. */
function QrSor() {
  return (
    <svg className="rt-qr" viewBox="0 0 29 1" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {[...QR_SOR0].map((b, i) => (b === '1' ? <rect key={i} x={i + 0.06} y="0" width="0.88" height="1" /> : <rect key={i} className="e" x={i + 0.1} y="0.1" width="0.8" height="0.8" />))}
    </svg>
  )
}

function Blokkok({ b }: { b: Blokk[] }): ReactNode {
  return b.map((k, i) => {
    const e = 'e' in k && k.e ? { 'data-e': k.e } : {}
    switch (k.t) {
      case 'sorok':
        return <div key={i} {...e}><Sorok sorok={k.sorok} /></div>
      case 'cim':
        return <p className="rt-c" key={i} {...e}>{k.s}</p>
      case 'szoveg':
        return <p className={`${k.halk ? 'rt-m' : ''}${k.mono ? ' mono' : ''}`} key={i} {...e}>{k.s}</p>
      case 'lista':
        return (
          <ul key={i}>
            {k.elemek.map((l) => (
              <li key={l.s} className={l.mono ? 'mono' : undefined} {...(l.e ? { 'data-e': l.e } : {})}>{l.s}</li>
            ))}
          </ul>
        )
      case 'osszes':
        return (
          <p className="rt-o" key={i}>
            <b>{k.cimke}</b> <span className={k.szam.length < 3 ? 'rt-n' : ''}>{k.szam}</span> <span className="rt-m">{k.felirat}</span>
          </p>
        )
      case 'oszlopok':
        return (
          <div className="rt-oc" key={i}>
            {k.oszlopok.map((o, j) => <div key={j}><Blokkok b={o} /></div>)}
          </div>
        )
      case 'qr':
        return <QrSor key={i} />
      case 'mintak':
        // the full row; the script keeps the last values that fit one line, led by "…", the last in bold (it is the head's reading)
        return <p className="rt-mi mono" key={i} data-mintak={CNC1_HOMERSEKLET.map((v) => fmt(v)).join(' ')}>{CNC1_HOMERSEKLET.slice(-8).map((v) => fmt(v)).join(' ')}</p>
    }
  })
}

/** The markers: zero-size points the script reads (their projected positions give the line its route and the bounds their check). */
export function Jelek({ extra }: { extra?: ReactNode }) {
  return (
    <>
      <i className="mk" data-m="tl" style={{ left: 0, top: 0 }} />
      <i className="mk" data-m="tr" style={{ left: '100%', top: 0 }} />
      <i className="mk" data-m="bl" style={{ left: 0, top: '100%' }} />
      <i className="mk" data-m="br" style={{ left: '100%', top: '100%' }} />
      {extra}
    </>
  )
}

/** One of the two back sheets: head (the name is a button once the stack is open and the sheet is not in front), the lane with the pair's own signal, the body, the foot. */
export function HatsoLap({ par, lap, tartalom, szeles, jel }: { par: RetegPar | 'hiba'; lap: Exclude<LapNev, 'felulet'>; tartalom: LapTartalom; szeles: number; jel?: boolean }) {
  const fajta = lap
  return (
    <section className="rt-lap" data-s={lap} {...(jel ? { 'data-p': par } : {})} role="group" aria-label={RETEG.nevek[lap]} hidden inert>
      <div className="rt-fej">
        <button type="button" className="rt-nev" data-rt-nev={lap} tabIndex={-1} disabled>{RETEG.nevek[lap]}</button>
        {tartalom.fej ? <span className="mono" {...(lap === 'szabaly' ? { 'data-rt-olv': '' } : {})}>{tartalom.fej}</span> : null}
      </div>
      <div className="rt-lane" aria-hidden="true">
        <svg viewBox={`0 0 ${szeles} ${LANE}`} preserveAspectRatio="none" focusable="false">
          <path className="rt-ut" pathLength="1" d={savUt(par, fajta, szeles, LANE)} />
        </svg>
      </div>
      <div className="rt-test"><Blokkok b={tartalom.blokkok} /></div>
      {tartalom.labl ? <div className="rt-lab"><a className="lnk tlnk" data-cel={tartalom.labl.href} tabIndex={-1}>{tartalom.labl.felirat}</a></div> : null}
      <Jelek extra={<><i className="mk" data-m="l" style={{ left: GUT, top: 44 + LANE / 2 }} /><i className="mk" data-m="r" style={{ left: '100%', top: 44 + LANE / 2 }} /></>} />
    </section>
  )
}

/** The earned link's mail: the offer mail pattern of the contact end, the subject naming the work (src/site/components/Szakaszok.tsx). */
export function erdeklodesHref(munka: string): string {
  const m = JEL.munkak.tetelek.find((t) => t.id === munka)
  return levelCim({ targy: `${HIVAS_LEVEL.targy} – ${m?.cim ?? munka}` })
}
