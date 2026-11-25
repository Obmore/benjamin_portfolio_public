// The numbers behind the home page's traces (and behind the Rétegek sheets' lanes and samples), as content: each series is numbers with a unit and a sampling step, and the drawings
// (src/site/fooldal/jelalak.ts, src/site/retegek/sav.ts) are generated from them. No import: a pure data file the build, the browser chunks and the node tests all read.
// A pair with no series has none: HONLAP's speech trace is a drawn curve (its Szabály sheet says so), RENDELÉS's cut order has the lengths of the demo's sample, not samples at a step.

/**
 * The 29 x 29 modules of the "QR-kódos gépkönyv" demo's code ('1' = dark), made by the demo's own library (public/demos/kezikonyv/qrcode-generator.min.js, error level M)
 * for DEMO_URL (src/site/fooldal/regulo/ctrl.ts). Pinned against the library by the unit test; the first screen draws it as a printed label.
 */
export const QR_MODULOK = [
  '11111110101111101111001111111',
  '10000010111100100010001000001',
  '10111010000111110011101011101',
  '10111010111101100100101011101',
  '10111010010000011101001011101',
  '10000010011110100011001000001',
  '11111110101010101010101111111',
  '00000000111000111100100000000',
  '10110111001110011110001001011',
  '01101100100101001011111110001',
  '00001010010101001110110110110',
  '10010000000011111010111000001',
  '00101111111100000101000001100',
  '00100100000111111001101000111',
  '01110110011010100011010000111',
  '10001000100011010001111110010',
  '10010010101010010011110011010',
  '01010000111101010100100101110',
  '10001011110000010100111010100',
  '00000101100010010110101000100',
  '01100010011011010110111111100',
  '00000000110101101000100011111',
  '11111110101011001001101011010',
  '10000010110000000010100011010',
  '10111010011110110110111110100',
  '10111010111000111001110011001',
  '10111010101101100110100100101',
  '10000010001100000000110101010',
  '11111110101111010011110010010',
] as const

/**
 * CNC-1's spindle temperature as the demo itself holds it at its first screen: the 60 samples of `history.temp` (one a minute, 6:00 to 6:59, the last one is the reading
 * at 7:00 after the 60-minute warm-up), rounded to the one decimal the demo shows (public/demos/adatgyujto/app.js: tempBase 52 line 21, the seeded mulberry32 generator
 * lines 35-40, the temperature step lines 112-113, the history lines 139-143, the display line 191). Taken by running the demo's own code, not by estimating:
 * the page's rest reading is the last of them, 51,6 degC. The trace never invents a warm-up the demo does not have.
 */
export const CNC1_HOMERSEKLET: readonly number[] = [
  51.5, 51.9, 52.5, 51.9, 52, 52.2, 52.3, 51.7, 51.2, 51.2, 51.2, 51.3, 50.8, 50.8, 51, 51.4, 52, 51.6, 52.1, 51.5, 51, 50.7, 50.7, 50.9, 51.2, 51.9, 52.1, 52.4, 52.4, 52.6, 52.4, 52.9, 52.7, 53.1,
  52.4, 52.7, 52.8, 53.1, 52.4, 52.1, 51.9, 51.9, 51.9, 51.7, 52, 52, 51.9, 51.9, 52.5, 52.6, 52, 52.2, 51.9, 51.6, 51.8, 51.4, 51.3, 51.9, 51.8, 51.6,
]

/** The lengths in mm the cut order's trace draws as its two blocks (the lapszabaszat demo's own sample, public/demos/lapszabaszat/app.js line 23: the 720 and 564 mm lengths of its two parts; the 400 mm is a width, not a block). */
export const PANEL_HOSSZAK: readonly number[] = [720, 564]

/** Row 0 of the demo QR code: the "QR-kódos gépkönyv" trace. */
export const QR_SOR0 = QR_MODULOK[0]

/** A sample series behind a pair's trace: numbers with their unit and sampling step. No entry = no series (the pair's curve is drawn). */
interface Sorozat {
  /** The unit of a value ('°C', 'bit'; 'mm' for the lengths of a cut). */
  egyseg: string
  /** The sampling step as the Szabály sheet says it ("1 perc", "1 modul"); null where the values are not samples at a step (the blocks of a cut order). */
  lepes: string | null
  ertekek: readonly number[]
}

export const SOROZATOK = {
  // public/demos/adatgyujto/app.js: CNC-1's history.temp, one `step()` a demo minute (lines 12, 94, 141): the same 60 values as the band's.
  gepadat: { egyseg: '°C', lepes: '1 perc', ertekek: CNC1_HOMERSEKLET },
  // public/demos/kezikonyv: row 0 of the 29 x 29 QR code the demo draws: 1 = dark module, one module a step.
  gepkonyv: { egyseg: 'bit', lepes: '1 modul', ertekek: [...QR_SOR0].map(Number) },
  rendeles: { egyseg: 'mm', lepes: null, ertekek: PANEL_HOSSZAK },
} satisfies Record<'gepadat' | 'gepkonyv' | 'rendeles', Sorozat>
