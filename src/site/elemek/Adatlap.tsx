import type { ReactNode } from 'react'

/** The price of a record, already formatted by the page (src/data/pricing.ts through huf() / VAT_LABEL: the component never formats a price). */
export interface AdatlapAr {
  osszeg: string
  utotag: string
  afa: string
}

export interface AdatlapSor {
  cimke: string
  ertek: ReactNode
}

export interface AdatlapProps {
  /** The panel's id: the entry square fills when the panel is the page's :target. */
  id?: string
  /** The head row's label ("Csomag" on packages), in the label voice. */
  fej: string
  /** The package's or the record's name. */
  cim: string
  /** `h3` on a package page; left out where the panel stands above the page's first H2 (the home page's source panel): then the title is a paragraph. */
  cimSzint?: 'h3'
  sorok?: AdatlapSor[]
  /** Undefined: no price part. A price: the plate. `null`: the plate with "Egyedi ajánlat" and no third line. */
  ar?: AdatlapAr | null
  /** The plate's engraved legend; stored in natural case ("Ár"), the capitals come from the style. */
  arCimke?: string
  /** The line 2 of a plate without a price in the data. */
  egyedi?: string
  gomb?: { felirat: string; href: string; esemeny?: string }
  garancia?: string
  link?: { felirat: string; href: string; esemeny?: string }
}

/** A screw head in the built form: a ring with one slot. `fok` is the slot's angle from level (75: 15 degrees off vertical; 35: 35 degrees off level). */
function Csavar({ fok }: { fok: number }) {
  return (
    <svg className="adl-skr" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="6.25" />
      <line x1="2.6" y1="7" x2="11.4" y2="7" transform={`rotate(${fok} 7 7)`} />
    </svg>
  )
}

/**
 * The record panel with a rating plate, P2 "Adatlap adattáblával": the one component for an offer record. Parts in this order, every part except the
 * head row and the title optional: head row (label, rule), entry (a hollow square on the left edge at the head row's centre; filled when the panel is the :target),
 * title, rows (label above value), the price plate (two screws and the engraved "Ár", the amount with its suffix, the VAT line; or "Egyedi ajánlat"), one key button,
 * the guarantee line, one text link. No corner screws. The page that uses it draws the tap to the entry; nothing here depends on a page.
 */
export function Adatlap(p: AdatlapProps) {
  const Cim = p.cimSzint ?? 'p'
  return (
    <section className="adl" {...(p.id ? { id: p.id } : {})} aria-labelledby={p.id ? `${p.id}-cim` : undefined}>
      <div className="adl-fej">{p.fej}</div>
      <i className="adl-bel" aria-hidden="true" />
      <div className="adl-test">
        <Cim className="adl-cim" {...(p.id ? { id: `${p.id}-cim` } : {})}>
          {p.cim}
        </Cim>
        {p.sorok && p.sorok.length > 0 ? (
          <dl className="adl-sorok">
            {p.sorok.map((s) => (
              <div className="adl-sor" key={s.cimke}>
                <dt className="adl-cimke">{s.cimke}</dt>
                <dd className="adl-ertek">{s.ertek}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {p.ar !== undefined ? (
          <div className="adl-ar">
            <p className="adl-ar1">
              <Csavar fok={75} />
              <span className="adl-leg">{p.arCimke ?? 'Ár'}</span>
              <span className="adl-ar-ter" />
              <Csavar fok={35} />
            </p>
            {p.ar ? (
              <>
                <p className="adl-sum">
                  <span className="adl-ossz">{p.ar.osszeg}</span>
                  {p.ar.utotag ? <span className="adl-utotag">{p.ar.utotag}</span> : null}
                </p>
                <p className="adl-afa">{p.ar.afa}</p>
              </>
            ) : (
              <p className="adl-sum adl-egyedi">{p.egyedi ?? 'Egyedi ajánlat'}</p>
            )}
          </div>
        ) : null}
        {p.gomb ? (
          <a className="adl-gomb" href={p.gomb.href} {...(p.gomb.esemeny ? { 'data-esemeny': p.gomb.esemeny } : {})}>
            {p.gomb.felirat}
          </a>
        ) : null}
        {p.garancia ? <p className="adl-gar">{p.garancia}</p> : null}
        {p.link ? (
          <a className="lnk tlnk adl-link" href={p.link.href} {...(p.link.esemeny ? { 'data-esemeny': p.link.esemeny } : {})}>
            {p.link.felirat}
          </a>
        ) : null}
      </div>
    </section>
  )
}
