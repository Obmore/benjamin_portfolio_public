// The true samples of the adventure world ("Kaland", the private plan kaland-v2): the numbers a chapter draws, each one a run or a measurement of a named source in this repository.
// A pure data module (no DOM, no pixel, no network): the world's bundle, the node tests and the e2e spec all read it. What other content files already hold is not copied here:
// "Évek" is src/site/evek.ts over IDOVONAL (src/content/tapasztalat.ts), the contact line is VALLALKOZO (src/content/alapadatok.ts), the first-screen QR modules and CNC-1's first hour are src/content/sorozatok.ts.
//
// The regions between the <generated:...> markers are written by `node scripts/mintak-epit.mjs`; do not edit them by hand. scripts/mintak.test.mjs recomputes the Gépadat run from the
// demo's own source and pins the picture file; e2e/mintak.spec.ts recomputes the picture's block means from the pixels a browser decodes. A number nobody can recompute does not belong here.
//
// What this file does NOT say: no string here is page copy. Names such as "CNC-1" and "Orsóhőmérséklet" are the demo's own labels; every sentence the world speaks is decided elsewhere (docs, `[copy: owner]`).

// <generated:gepadat>
const GEPADAT_ERTEKEK: readonly number[] = [
  // 6:00
  51.5, 51.9, 52.5, 51.9, 52, 52.2, 52.3, 51.7, 51.2, 51.2, 51.2, 51.3, 50.8, 50.8, 51, 51.4, 52, 51.6, 52.1, 51.5, 51, 50.7, 50.7, 50.9, 51.2, 51.9, 52.1, 52.4, 52.4, 52.6,
  // 6:30
  52.4, 52.9, 52.7, 53.1, 52.4, 52.7, 52.8, 53.1, 52.4, 52.1, 51.9, 51.9, 51.9, 51.7, 52, 52, 51.9, 51.9, 52.5, 52.6, 52, 52.2, 51.9, 51.6, 51.8, 51.4, 51.3, 51.9, 51.8, 51.6,
  // 7:00
  52.2, 52.4, 52.3, 52, 52.5, 52.8, 53.2, 52.7, 53, 52.6, 52.2, 52.1, 52.4, 51.9, 52.2, 52.4, 52.4, 52.9, 53.3, 53.1, 53.1, 52.6, 52.3, 52.9, 52.6, 52.4, 51.8, 51.9, 52.3, 52.6,
  // 7:30
  52, 52.2, 52.6, 52, 51.9, 51.8, 51.6, 52, 52, 51.9, 51.9, 52.3, 52, 52.4, 52.8, 52.9, 52.4, 51.9, 52.4, 52.8, 52.4, 52.5, 52.5, 52.7, 52.8, 52.5, 52.6, 52.3, 52, 52.1,
  // 8:00
  52.4, 52.9, 52.4, 52.9, 53.2, 53.3, 53.3, 53.3, 52.9, 52.4, 52.2, 51.9, 51.6, 51.2, 50.8, 51.4, 51.9, 52.1, 51.6, 52.2, 52.5, 52.9, 53.2, 53.4, 53.3, 53.4, 53, 53.2, 52.7, 52.7,
  // 8:30
  52.1, 51.6, 52.2, 52.5, 52.5, 52.2, 52.7, 52.7, 52.7, 52.8, 52.4, 52.2, 52, 51.4, 51.8, 50.4, 49.9, 49.7, 49.2, 49.1, 49.2, 48.5, 48.5, 49, 49.4, 49.4, 50.3, 50.7, 50.8, 51.2,
  // 9:00
  51.1, 50.8, 51.2, 50.8, 51.5, 51, 50.5, 50.9, 50.5, 50.9, 50.9, 51.7, 52, 51.5, 51.2, 51.7, 51.7, 52.3, 52.1, 52, 51.4, 51.2, 51.5, 51.8, 51.5, 52.1, 52.5, 52.6, 52.8, 52.8,
  // 9:30
  52.9, 53.4, 53.5, 53.3, 53.3, 53.8, 54, 54.2, 53.8, 53.1, 53.2, 52.6, 52.7, 52.1, 51.6, 51.2, 51, 51.6, 51.2, 50.7, 50.8, 51, 51.4, 51.5, 51.6, 52.1, 52.6, 52.7, 53.1, 52.6,
  // 10:00
  52, 51.8, 52.3, 52.7, 53.2, 52.8, 52.6, 53.1, 52.8, 52.4, 52.4, 52.3, 51.7, 51.2, 51, 51.3, 51.3, 51.4, 51.8, 51.4, 51.2, 51.8, 51.5, 52.1, 51.9, 51.4, 51.5, 52.1, 51.6, 51.3,
  // 10:30
  50.3, 49.2, 48.6, 49.6, 49.9, 50, 50.6, 51.1, 51.5, 51.4, 51.9, 52.4, 51.9, 51.9, 51.4, 51.8, 51.5, 51.2, 51.1, 51.1, 51.7, 52, 51.9, 51.9, 51.9, 52.2, 52.4, 51.9, 51.4, 51,
  // 11:00
  50.9, 51.1, 51.7, 51.6, 51.9, 51.8, 52.1, 51.6, 52.2, 52.2, 52.6, 52.3, 52, 52.4, 52, 52.4, 52.6, 52, 52.1, 51.6, 51.1, 51.5, 51.9, 51.7, 52, 51.9, 51.4, 50.9, 50.8, 51.3,
  // 11:30
  51.2, 50.9, 51.3, 50.9, 50.4, 50.4, 51.1, 51.7, 52, 51.4, 51.7, 51.4, 51.6, 52, 52.5, 52.6, 52.2, 51.9, 51.5, 51.9, 51.6, 51.2, 50.8, 50.5, 51, 51, 51, 51.5, 51.3, 51.2,
  // 12:00
  51.3, 51, 50.9, 50.7, 50.6, 50.6, 51.2, 51.9, 51.9, 52.1, 52.6, 53, 52.6, 53, 52.5, 53, 52.3, 51.9, 51.9, 51.5, 51.7, 52.3, 52, 51.4, 51.6, 52.1, 51.8, 52.1, 52.7, 52.6,
  // 12:30
  52.5, 53.1, 52.8, 52.9, 52.6, 52.2, 51.7, 51.3, 51.1, 50.8, 51.4, 51, 50.8, 50.3, 51, 51.3, 51.3, 51.3, 51, 50.7, 50.5, 50.9, 51.5, 51.4, 51.9, 52, 51.9, 52.1, 52.2, 52.3,
  // 13:00
  52.4, 52.4, 52.7, 52.6, 52.3, 52.6, 52.2, 51.7, 51.2, 51.3, 51.1, 51, 51.5, 51.2, 51.2, 51.1, 51.4, 51.9, 52.5, 52.3, 52.3, 52.3, 52.3, 52, 51.6, 52.2, 52.7, 53, 53.4, 53.7,
  // 13:30
  53.6, 53.3, 53, 53.1, 53.2, 53.1, 52.9, 53, 53.5, 53.5, 53.7, 54, 53.5, 53.2, 52.7, 53, 52.4, 52.8, 53.1, 52.6, 52.5, 52.1, 52.3, 52.3, 52.3, 52.5, 52.7, 52.1, 52.3, 51.9,
]
const GEPADAT_KEZDET_PERC = 360
const GEPADAT_GEP = { nev: 'CNC-1', jel: 'Orsóhőmérséklet', hatar: 70 }
const GEPADAT_MUSZAKVALTAS = { perc: 840, szoveg: 'Műszakváltás: délután, 14:00–22:00. A műszakjelentés újraindult.' }
// </generated:gepadat>

// <generated:honlap>
const HONLAP_FAJL_SHA256 = '8a6b2387ee88c8d1a270dfef456ee562fb2d89c03aa79ec60b99fd174aadf108'
const HONLAP_SZELESSEG = 780
const HONLAP_MAGASSAG = 928
const HONLAP_OSZLOP = 40
const HONLAP_SOROK: readonly string[] = [
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7+rh5eHY5uPZ6OTc8+7l7+rh8Ovj7+rh7unh8Ovi8Ovi8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l4+DW8+7l3drR7Onf6ubdz83FzcvCxsW8vLy0zMvC1tPK8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l5uLZ5+PawcC48+7l5uLZ8+7l8u3k8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l6ebc3NnQ3drR8+7l8+7l8+7l',
  '8+7l8+7l4+DW5eLZ3tvS7Ojf6ubd5uPZ2tnP2djO2tjP6eXc2NbM2NbN3NrQ3dvR4d7V4+DW8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7+rh5eLY5uPZ6OTb8+7l8Ozj8ezj8Ozj8e3j8+7k8ezj8+7k8+7k8ezj8ezj8+7k8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi8Ovi',
  '8+7k8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8Ozi8+7l8+7l8+7l8+7l8Ovi8+7l8Ovi8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8Ozi8+7l8Ovi8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8Ojf7ePZ7ePZ8uzj3trQzszDw8K4wcO81tLJysi/0s7EzMrCxcO8yMi/yMi/u7uzyse/39vQ2djQyce+wsG2ysi/ysnAxsa90dDGyMa8zcrBzs3E1dLIysi/yce/8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l9O7l8+7l8+7l9O7l9O/m8+7l9O/l9O7l8+7l9O7l9O7l9O/m8+7k8+7l9O/m9O7l9O7l9O/l9O/m9O7m9O/l8+7l8+7l8+7l9O/l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7+rh4d7V5+Pa8+7l7Off8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l7urh8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8e3jnJyV29jPvbuzyMe98e3k8u3k7eng39zT8+7l7+rh8+7l8Ozi8e3j8+7l2tjP8u7k6+fe0s/G8+7l8Ozj8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7lmJmRyce+yce/np6W1dLJm5yUu7myvLqyvr211dLJurmxpKWdz8zE8+7lm5yV3NnQwcC3pqafrq2mtbSt49/W8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7loaGa8u7ln6CYpqae09DIx8W9yMa+zMjApKSc8+7lrq6mxcO7pKSc8+7lqqqj29fOs7Kq1dLJt7au6+bd3NjP9O7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7ungzcrC2NXM5eHY0M3F1NHI2dbN49/VzMrB5uLZ09DI6+bd1tPK3NnQ8+7l29fP4t7Vz8zE1tLK2dXM5uLY1tPK9O/l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l5NTJ49DG5tfN8+7l7OHX7uTb8+7l8+7l8+7l8+7l8+7l8uvi3MW68+7l5NPJ69/V8+7l8erg3ce88+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l1ruw8+rg1LSp7+fd3MS47ODW2r+05NTK5dbM8Ojf5NPJ7uTa07Gm5dTJ28S548/F7uTa8+3k1LWo49HH8+3k5dXL6d3T5dXL4dDG8uzj6t3T5dbM8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l0rGl4MvB4Mm/2L2w17uv5dbL5dbL07Km6NfN0rGk3MW75dPI1rqu0bCk0q6i7N/U2b+159jO2r+z1bSo2Lyw49HG5dPJz6id1rer3se76dvQ1rmu8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7OHXy6aa4MvB1LSo17ywyqCT07On6NjNz62i8enfzqicyqCT2Luv3ca628C0z6me2Lyx7uXa07ar7d/V07OmzaebyqGU38a849HHzqic0K2h2L2x17yw59jO8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l9O7l8+7l8+7l8uzj8uzj8uzj8+3k8uzi8+7l8uzi8uzj8+7l8uzi8+7l8+3j8+3j8+7l8+zj8+7l8uzj8uzj8uzj8+3j8+7l8uvi6t3S28K38Oje8+7k8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l5dbM8Oje8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l5ODX2tnP3tzS3NrQ2dbN19XL6eXa2NfP4N7V3drR2tfN2dbM2tjP3dzT3drQ3tzS3dvR3drR39zT5+LY29nP3tvR3dvS39zT4d7U393U2dbL2NjO4d7U4+HX7+rh19XL6ufe8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7Ojf39zS3NnQ2NjP39zS4N3T6eXb3dvS4N3T4N3U4t/U3tvS393T4d/W49/V39zU5OHX39zU5OHY6eTa4d7V49/W6ebc2NfO09LI19fN3tvR5OHY4N3U4+DW6eXb4t/V5uPa8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l9O7l9O/l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l6OTb3tvS3tvR4N3U1tTI29rQ3t3V3NnQ4d7U4N7V1tTM2NfN393T3dvS5uPZ3dvR2tjO3tvS3tzT4t/V3NrR1NLJ2djO393U5uLY3dvR4d7U39zT2dfN3tzT8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7Ojf5+Pa3tzS0dDH3NnQ4N3U4N7W5ODX5OHX3tvT3dvR393T3tzS5OHY5+PZ6ufd4N3U1tPJ3t3U5OHX4eDW3NnO4uDX5uPa5+PZ5OHX1dPJ3drS4N3U4d3U7+vi8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l39vR2tjO39zT4N3T0M/G2tjP29jP3dvQ29nQ29jO5eLY29jP3tvS1dPK3dvR4N7V4t7V2NbM2NfN3tvS3drQ4N3T5OHY4N3T5+PZ3drS4d7Tzs7E8ezk8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7Ojf6+bc1NLJ29jP4t/X5eLZ5uLY5+Pa5+PZ5eLZ5uPZ5eHX49/W4t/V5uPZ4d7W5OHX4N3T3tzT1NLJ0tHG4d7V5uPa4d7U7ene3drQ2NbN4d7V8e3k8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l5+Pa1dTK3NnQ393T4t7U393U39zSz8/F3drR29nQ6+fe8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l7Onf5uLY5uLZ5+Ta4+DW4d7V4+DW4N3U4d7V5uPa6ubc8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
  '8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l8+7l',
]
// </generated:honlap>

/**
 * One shift of one machine as the demo itself simulates it: CNC-1's spindle temperature, one reading a demo minute, from 6:00 (the start of the morning shift, which is also where the demo's
 * own warm-up hour begins) to 13:59; the demo announces the shift change at 14:00. Taken by running the demo's own `step()` (seed 20261026) 480 times and rounding each reading to the
 * one decimal the demo displays ("51,5"); the first 60 are the same values the home page's trace pins (CNC1_HOMERSEKLET). The sequence is deterministic: the demo seeds its generator.
 */
const gepadat = {
  forras: 'public/demos/adatgyujto/app.js: step(), machine MACHINES[0], seed 20261026, 480 steps from 6:00',
  gep: GEPADAT_GEP.nev,
  jel: GEPADAT_GEP.jel,
  egyseg: '°C',
  lepes: '1 perc',
  /** The demo minute of ertekek[0], counted from midnight (6:00 = 360). */
  kezdetPerc: GEPADAT_KEZDET_PERC,
  /** The alarm limit the demo draws and raises on for this signal (MACHINES[0].tempLimit); no reading of this shift reaches it. */
  hatar: GEPADAT_GEP.hatar,
  ertekek: GEPADAT_ERTEKEK,
  /** The demo's own announcement at the shift change (its `announce` entry, demo minute `perc` = 14:00). */
  muszakValtas: GEPADAT_MUSZAKVALTAS,
}

/**
 * The first screen's client picture as a grid of block means in linear light: the picture is cut into `oszlop` columns of width w / oszlop and as many rows of the same pitch as fit
 * (rows = round(oszlop * h / w), so the last row covers whatever is left, 12 px of 928 at 40 columns), each block is the mean of its pixels' linear-light colour (sRGB decoded, averaged, sRGB
 * encoded to a byte). Measured from the file's pixels by a browser (scripts/mintak-epit.mjs) with `blokkAtlag` below; `sorok` holds one base64 string per grid row, `oszlop` RGB byte triples each.
 * The picture is the live one of the home page (JEL.nyito.honlap.kep): a screenshot of the client's published site, shown with the client's permission (src/content/munkak.ts); this grid adds no content to it.
 */
const honlap = {
  forras: 'public/work/lelek-es-nyelv-telefon.webp: block means in linear light, measured from its decoded pixels',
  kep: { utvonal: '/work/lelek-es-nyelv-telefon.webp', fajl: 'public/work/lelek-es-nyelv-telefon.webp', szelesseg: HONLAP_SZELESSEG, magassag: HONLAP_MAGASSAG, sha256: HONLAP_FAJL_SHA256 },
  racs: { oszlop: HONLAP_OSZLOP, sor: HONLAP_SOROK.length },
  sorok: HONLAP_SOROK,
}

/** Every set of true samples, by the pair or chapter it feeds (the keys follow SOROZATOK in sorozatok.ts). */
export const MINTAK = { gepadat, honlap } as const

export type MintaId = keyof typeof MINTAK

/** The demo's clock for sample `i` of the Gépadat run ("6:00", "7:00", "13:59"): the demo's own `clock()` format (no leading zero on the hour). */
export function gepadatIdo(i: number): string {
  const perc = gepadat.kezdetPerc + i
  return `${Math.floor(perc / 60) % 24}:${String(perc % 60).padStart(2, '0')}`
}

/** The lowest and highest reading of the shift, as the demo displays them. */
export const GEPADAT_MIN = Math.min(...gepadat.ertekek)
export const GEPADAT_MAX = Math.max(...gepadat.ertekek)

/** `n` base64 RGB triples (one grid row) as bytes. */
function sorBajt(sor: string): Uint8Array {
  const s = atob(sor)
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** The picture's block means as a texture-ready RGBA byte array (`oszlop` x `sor` blocks, row-major from the top, alpha 255); a fresh array on every call. */
export function honlapRGBA(): Uint8Array {
  const { oszlop, sor } = honlap.racs
  const ki = new Uint8Array(oszlop * sor * 4)
  honlap.sorok.forEach((s, r) => {
    const rgb = sorBajt(s)
    if (rgb.length !== oszlop * 3) throw new Error(`mintak: grid row ${r} has ${rgb.length} bytes, expected ${oszlop * 3}`)
    for (let c = 0; c < oszlop; c++) ki.set([rgb[c * 3], rgb[c * 3 + 1], rgb[c * 3 + 2], 255], (r * oszlop + c) * 4)
  })
  return ki
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// The definition of the block means (used by scripts/mintak-epit.mjs to make the table and by the tests to check it; the world itself reads the table).

const SRGB_LIN = Float64Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})
const srgbBajt = (x: number): number => Math.min(255, Math.round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055)))

export interface Blokkok {
  oszlop: number
  sor: number
  /** `oszlop` x `sor` RGB byte triples, row-major from the top: the sRGB encoding of each block's linear-light mean. */
  rgb: Uint8Array
}

/**
 * The block means of an opaque picture (RGBA bytes, row-major, `szelesseg` x `magassag`; alpha is ignored) on a grid of `oszlop` columns: block pitch szelesseg / oszlop, rows = round(oszlop * magassag / szelesseg),
 * block edges at floor(index * pitch), the last column and the last row reaching the picture's edge. Each channel is averaged in linear light.
 */
export function blokkAtlag(rgba: ArrayLike<number>, szelesseg: number, magassag: number, oszlop: number): Blokkok {
  if (rgba.length !== szelesseg * magassag * 4) throw new Error(`blokkAtlag: ${rgba.length} bytes is not a ${szelesseg} x ${magassag} RGBA picture`)
  const sor = Math.round((oszlop * magassag) / szelesseg)
  const lepes = szelesseg / oszlop
  const rgb = new Uint8Array(oszlop * sor * 3)
  for (let r = 0; r < sor; r++) {
    const y0 = Math.floor(r * lepes)
    const y1 = r === sor - 1 ? magassag : Math.floor((r + 1) * lepes)
    for (let c = 0; c < oszlop; c++) {
      const x0 = Math.floor(c * lepes)
      const x1 = c === oszlop - 1 ? szelesseg : Math.floor((c + 1) * lepes)
      let R = 0
      let G = 0
      let B = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * szelesseg + x) * 4
          R += SRGB_LIN[rgba[i]]
          G += SRGB_LIN[rgba[i + 1]]
          B += SRGB_LIN[rgba[i + 2]]
        }
      }
      const n = (y1 - y0) * (x1 - x0)
      if (n <= 0) throw new Error(`blokkAtlag: empty block ${r},${c}`)
      rgb.set([srgbBajt(R / n), srgbBajt(G / n), srgbBajt(B / n)], (r * oszlop + c) * 3)
    }
  }
  return { oszlop, sor, rgb }
}
