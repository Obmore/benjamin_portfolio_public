import { VALLALKOZO } from '@/content/alapadatok'
import { JEL } from '@/content/fooldal'
import { RETEG } from '@/content/retegek'
import { OB_UT } from '../ob-jel'

/** Which page the shared header is on: the home page (anchors, the current section marked by the page script) or any other page. */
export type KeretOldal =
  | { oldal: 'fooldal' }
  /** `aktualis`: the nav link that is this page ("munkak" on /munkaim/, "csomagok" on /megrendeles/); `sajatKapcsolat`: the page has its own #kapcsolat, so "Kapcsolat" stays on the page. */
  | { oldal: 'aloldal'; nyelv: 'hu' | 'en'; aktualis?: 'munkak' | 'csomagok'; sajatKapcsolat?: boolean }

const SZOVEG = {
  hu: { ugras: 'Ugrás a tartalomra', fonav: 'Fő navigáció', fooldal: `${VALLALKOZO.nev}, főoldal`, kapcsolo: JEL.temaKapcsolo },
  // The English labels are the owner-approved proposals of the design system (5.1); the navigation label is the one the English imprint already had.
  en: { ugras: 'Skip to content', fonav: 'Pages', fooldal: `${VALLALKOZO.nev} home page`, kapcsolo: 'Dark mode' },
} as const

/**
 * The one header of the site (design system 5.1): the OB mark in the lane, three links and the "Sötét mód" key (a switch for assistive
 * technology; script only, disabled until its script is ready). On the home page the links are its own sections (Csomagok goes to the packages page);
 * on every other page they are real pages; the one that is the page itself carries aria-current (`aktualis`) and "Kapcsolat" goes to the page's own #kapcsolat when it has one (`sajatKapcsolat`). The nav labels stay Hungarian on the English imprint: each link goes to a Hungarian page.
 */
export function JelFejlec({ keret = { oldal: 'fooldal' } }: { keret?: KeretOldal }) {
  const fooldal = keret.oldal === 'fooldal'
  const nyelv = keret.oldal === 'aloldal' ? keret.nyelv : 'hu'
  const sz = SZOVEG[nyelv]
  const aktualis = keret.oldal === 'aloldal' ? keret.aktualis : undefined
  const sajatKapcsolat = keret.oldal === 'aloldal' && keret.sajatKapcsolat === true
  const most = (nev: 'munkak' | 'csomagok') => (aktualis === nev ? { 'aria-current': 'page' as const } : {})
  const magyar = nyelv === 'en' ? { lang: 'hu', hrefLang: 'hu' } : {}
  return (
    <>
      <a className="ugras" href="#tartalom">
        {sz.ugras}
      </a>
      <header className="tsec hdr fejlec" data-fejlec>
        <div className="in">
          <div className="lane">
            <a className="mklink" href="/" aria-label={sz.fooldal}>
              <svg className="mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                <rect width="64" height="64" fill="var(--tinta)" />
                <path fill="var(--papir)" d={OB_UT} />
              </svg>
            </a>
          </div>
          <div className="hr">
            <nav aria-label={sz.fonav}>
              <a className="lnk" href={fooldal ? '#munkak' : '/munkaim/'} {...(fooldal ? { 'data-sec': 'munkak' } : { ...magyar, ...most('munkak') })}>
                {JEL.nav.munkak}
              </a>
              <a className="lnk" href="/megrendeles/" {...magyar} {...most('csomagok')}>
                {JEL.nav.csomagok}
              </a>
              <a className="lnk" href={fooldal || sajatKapcsolat ? '#kapcsolat' : '/#kapcsolat'} {...(fooldal ? { 'data-sec': 'kapcsolat' } : magyar)}>
                {JEL.nav.kapcsolat}
              </a>
            </nav>
            {fooldal ? (
              <button type="button" className="szkey" role="switch" aria-checked="false" data-rt-kulcs="" disabled>
                <span className="tk-l">{RETEG.kulcs}</span>
              </button>
            ) : (
              <span className="szkey szkey-hely" aria-hidden="true" />
            )}
            <button type="button" className="tkey" role="switch" aria-checked="false" aria-label={sz.kapcsolo} data-jel-js="" disabled>
              <span className="tk-l">{sz.kapcsolo}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
