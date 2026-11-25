import { JEL } from '@/content/fooldal'

/** Partners (a bus with four stations) and the line to the packages page. */
export function Partnerek() {
  const P = JEL.partnerek
  return (
    <section className="tsec sec-partners" id="partnerek" aria-labelledby="h-partnerek">
      <div className="in">
        <h2 className="h2" id="h-partnerek">
          {P.cim}
        </h2>
        <div className="bus full">
          <ul className="slots">
            {P.nevek.map((nev) => (
              <li key={nev}>
                <span className="slot">{nev}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="offers full">
          <p className="offtxt">
            {P.ajanlat}
            <a className="lnk tlnk" href={P.link.href}>
              {P.link.felirat}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
