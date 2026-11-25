// Kapcsolók, amelyekről Benjámin dönt. Az alapállapot az éles oldalon is érvényes, ezért ezek nem
// helyőrzők, hanem kikapcsolt funkciók.

// Látogatottságmérés (Umami Cloud, EU adatrégió; Benjámin döntése, 2026-11-10). Sütik nélkül méri az oldalmegtekintéseket,
// és azt, hogy melyik gombtípusra kattintottak (data-esemeny: fo-gomb, email, telefon, demo, hivas, ajto). Csak az éles
// címen (ottbenjamin.hu) töltődik be a szkript; helyi futtatás, előnézet és teszt semmit nem küld. A weboldal-azonosító
// nyilvános (minden oldalon ott van), nem titok. Kikapcsolás: null; ekkor az adatkezelési tájékoztatót is vissza kell írni.
export interface Analitika {
  szolgaltato: 'umami'
  szkript: string
  azonosito: string
}
export const ANALITIKA: Analitika | null = {
  szolgaltato: 'umami',
  szkript: 'https://cloud.umami.is/script.js',
  azonosito: 'f25856de-48a6-48dc-a6a8-c2611bd42fe5',
}
