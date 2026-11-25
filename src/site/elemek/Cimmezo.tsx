import { HIVAS_LEVEL, VALASZIDO, VALLALKOZO, levelCim } from '@/content/alapadatok'
import { ErtekJel } from '../util'

/** The strings of the contact end (`JEL.kapcsolat` of src/content/fooldal.ts): the key's label, the lamp's legends, the failed copy's status sentence and the mail link's label. */
export interface CimmezoSzoveg {
  masolas: string
  kimasolva: string
  hiba: string
  allapotHiba: string
  link: string
  beszelgetes: string
}

/**
 * The contact end of the site, C1 "address field with a copy key": the address in a field (a real mailto link), the copy key in the field's
 * right end (script only), the reply promise, and two text links, "Levelet írok" and the talk request. The line, the terminal, the underline and the lamp are drawn by the
 * component's own behaviour (./masolo.ts), from the lane's x, so any page that has the shared header can carry it. The lamp group, the status region and the key's strings are
 * read from this markup (no second copy of a string in the script). `targy`: an optional subject for the "Levelet írok" link (the offer page's "Megrendelés"); the field's own address link stays plain.
 */
export function Cimmezo({ szoveg, id = 'cmz-cim', targy }: { szoveg: CimmezoSzoveg; id?: string; targy?: string }) {
  const [helyi, domain] = VALLALKOZO.email.split('@') as [string, string]
  return (
    <div
      className="cmz"
      data-cimmezo=""
      data-kimasolva={szoveg.kimasolva}
      data-hiba={szoveg.hiba}
      data-allapot-hiba={szoveg.allapotHiba}
    >
      <div className="cmz-sor">
        <div className="cmz-mezo">
          {/* One break opportunity, right before the "@" (the only place the address may break, at 320 px); the text is the whole address. */}
          <a className="cmz-cim" id={id} href={`mailto:${VALLALKOZO.email}`} data-esemeny="email">
            <span className="cmz-t">
              {helyi}
              <wbr />@{domain}
              <span className="cmz-alap" aria-hidden="true" />
            </span>
          </a>
          <div className="cmz-kc">
            <button type="button" className="cmz-gomb" aria-describedby={id} data-esemeny="email" data-cmz-js="" disabled>
              <span className="cmz-jel" aria-hidden="true">
                <i />
                <i />
              </span>
              <span>{szoveg.masolas}</span>
            </button>
          </div>
        </div>
        <span className="cmz-lampa" aria-hidden="true">
          <i className="cmz-lampa-l" />
          <span className="cmz-lampa-t" />
        </span>
      </div>
      <p className="cmz-mondat">
        <ErtekJel ertek={VALASZIDO} />
      </p>
      <div className="cmz-linkek">
        <a className="lnk tlnk" href={targy ? levelCim({ targy }) : `mailto:${VALLALKOZO.email}`} data-esemeny="email">
          {szoveg.link}
        </a>
        <a className="lnk tlnk" href={levelCim({ targy: HIVAS_LEVEL.targy, torzs: HIVAS_LEVEL.torzs })} data-esemeny="hivas">
          {szoveg.beszelgetes}
        </a>
      </div>
      <span className="sr cmz-allapot" role="status" />
    </div>
  )
}
