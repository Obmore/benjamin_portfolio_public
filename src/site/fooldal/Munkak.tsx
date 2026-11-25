import { JEL } from '@/content/fooldal'
import { reguloAbra } from './rajz'

/** The works: the exploded controller (its keys choose the work), the detail view, the list, the cable run. */
export function Munkak() {
  const M = JEL.munkak
  const { szeles, keskeny } = reguloAbra()
  const elso = M.tetelek[M.elso]!
  return (
    <section className="tsec sec-works" id="munkak" aria-labelledby="h-munkak">
      <div className="in">
        <h2 className="h2" id="h-munkak">
          {M.cim}
        </h2>
        <div className="wleft">
          <dl className="np-html" aria-label="Típustábla">
            {M.tipustabla.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <figure className="dview">
            <div className="dv-hd">
              <span className="dv-fej" data-fej={M.reszlet} data-terv-fej={M.tervezett.fej}>
                {M.reszlet}
              </span>
              <span className="mono">{M.skala}</span>
            </div>
            <div className="dv-box" data-dv>
              {elso.kep ? <img alt={elso.kep.alt} src={`/work/${elso.kep.fajl}`} width={1200} height={750} /> : null}
            </div>
            <figcaption className="dv-cap">
              <span className="sr" aria-live="polite" data-dv-live />
              <b className="dv-t">{elso.cim}</b>
              <span className="dv-s">{elso.mondat}</span>
              <a
                className="lnk tlnk dv-link"
                href={elso.link.href}
                {...(elso.link.kulso ? { rel: 'noopener', target: '_blank' } : { 'data-esemeny': 'demo' })}
              >
                {elso.link.felirat}
              </a>
            </figcaption>
          </figure>
          <div role="radiogroup" aria-label="Munkák">
          <ul className="wl">
            {M.tetelek.map((w, i) => (
              <li
                key={w.id}
                data-kep={w.kep?.fajl ?? ''}
                data-alt={w.kep?.alt ?? ''}
                data-jel={w.jel}
                data-href={w.link.href}
                data-link={w.link.felirat}
                data-kulso={w.link.kulso ? '1' : ''}
              >
                <button type="button" role="radio" aria-checked={i === M.elso} tabIndex={i === M.elso ? 0 : -1} data-wi={i} data-jel-js="" disabled>
                  <span className="wl-t" data-t={w.cim}>
                    <span>{w.cim}</span>
                  </span>
                </button>
                <div className="wi-extra">
                  <p className="ws">{w.mondat}</p>
                  <a className="lnk tlnk" href={w.link.href} {...(w.link.kulso ? { rel: 'noopener', target: '_blank' } : { 'data-esemeny': 'demo' })}>
                    {w.link.felirat}
                  </a>
                </div>
              </li>
            ))}
            <li data-jel="terv" data-href={M.tervezett.link.href} data-link={M.tervezett.link.felirat} data-terv="" data-kep="" data-alt="" data-kulso="">
              <button type="button" role="radio" aria-checked="false" tabIndex={-1} data-wi={M.tetelek.length} data-jel-js="" disabled>
                <span className="wl-t" data-t={M.tervezett.cim}>
                  <span>{M.tervezett.cim}</span>
                </span>
              </button>
              <div className="wi-extra">
                <a className="lnk tlnk" href={M.tervezett.link.href}>
                  {M.tervezett.link.felirat}
                </a>
              </div>
            </li>
          </ul>
          </div>
          <p className="allw">
            <a className="lnk tlnk" href={M.mind.href}>
              {M.mind.felirat}
            </a>
          </p>
        </div>
        <div className="cwrap" aria-hidden="true">
          <div
            className="cfig cw"
            style={{ width: szeles.info.W, height: szeles.info.H }}
            data-geo={JSON.stringify(szeles.info)}
            dangerouslySetInnerHTML={{ __html: szeles.html }}
          />
          <div
            className="cfig cn"
            style={{ width: keskeny.info.W, height: keskeny.info.H }}
            data-geo={JSON.stringify(keskeny.info)}
            dangerouslySetInnerHTML={{ __html: keskeny.html }}
          />
        </div>
        <div className="run trace" role="img" aria-label={M.kabelAlt}>
          <span className="reading mono" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
