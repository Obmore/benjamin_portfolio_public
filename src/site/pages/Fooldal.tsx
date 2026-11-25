import { JelFejlec } from '../fooldal/Fejlec'
import { Nyitas } from '../fooldal/Nyitas'
import { Retegek } from '../retegek/Szakasz'
import { Munkak } from '../fooldal/Munkak'
import { Partnerek } from '../fooldal/Partnerek'
import { Kapcsolat } from '../fooldal/Kapcsolat'
import { JelLablec } from '../fooldal/Lablec'

// The home page, direction D "Egy jel útja" (owner decision 2026-11-16): one line runs from the device rail through the works, the partners
// and the contact end (the shared address field) to the earth symbol in the footer. All markup and drawings are built here; the lazy chunk src/site/fooldal/jel.ts only
// moves them. The skeleton hooks the shared specs use stay: a.ugras, main#tartalom, header.fejlec, footer.
export function Fooldal() {
  return (
    <div className="page" id="top">
      <JelFejlec />
      <main id="tartalom" tabIndex={-1}>
        <Nyitas />
        <Retegek />
        <Munkak />
        <Partnerek />
        <Kapcsolat />
      </main>
      <JelLablec />
    </div>
  )
}
