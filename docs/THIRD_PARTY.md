# Third-party material

What the site ships or copies from elsewhere, with its source and licence. The text that is served to visitors is
`public/third-party-notices.txt` (`npm run check:site` checks that it names every shipped library version and font file).

## Typeface

| Item | Source | Licence | Where |
| --- | --- | --- | --- |
| Archivo (variable, weight 400-800, width 68-112 %) | `@fontsource-variable/archivo` 5.3.0, from <https://github.com/Omnibus-Type/Archivo> | SIL Open Font License 1.1 (OFL-1.1). Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo) | `public/fonts/archivo-latin.woff2`, `public/fonts/archivo-latin-ext.woff2`, built by `npm run build:fonts` (`scripts/build-fonts.mjs`; the build fails if a Hungarian letter is missing from the shipped subsets) |
| Martian Mono (500, latin and latin-ext) | `@fontsource/martian-mono` 5.3.0 (devDependency), from <https://github.com/evilmartians/mono> | SIL Open Font License 1.1 (OFL-1.1). Copyright 2020 The Martian Mono Project Authors (https://github.com/evilmartians/mono) | `public/fonts/martian-mono-500-latin.woff2`, `public/fonts/martian-mono-500-latin-ext.woff2` (readings and drawing labels of the home page; not preloaded), built by `npm run build:fonts`; the build fails if a, o, u with the double acute are missing |
| DM Sans (400, 500, 600) and JetBrains Mono (400, 500) | made earlier from `@fontsource/dm-sans` and `@fontsource/jetbrains-mono` (no longer dependencies) | OFL-1.1 | only the standalone demos: `public/demos/kezikonyv/fonts/` and an identical copy in `public/demos/tudaslap/fonts/`. The site itself does not use them |

## Libraries

| Item | Version | Licence | Where |
| --- | --- | --- | --- |
| Zdog | 1.1.3 | MIT | the Rollin dock scene (`src/rollin/scene.ts`, started by `src/rollin/rollin-futtat.ts`) on /munkaim/ |

## Pictures of other people's work

| Item | Source | Terms | Where |
| --- | --- | --- | --- |
| `public/work/lelek-es-nyelv-telefon.webp` (780 x 928 px: the top of the page as a phone shows it) | <https://lelekesnyelv.hu/>, captured 2026-11-18 with `scripts/telefonkep.mjs lelek` (Global Privacy Control on; one load, no click, no scroll) | Client work. The name, the screenshot and the link are shown with the client's consent (owner's confirmation 2026-11-06); the use on the home page's first screen was confirmed by the owner on 2026-11-17. The picture holds the client's own header (the brand, the first name and the signing initial), the page's headings and service text; no portrait, phone number, e-mail or street address, no other person's name | the home page's first screen (HONLAP pair), `src/content/fooldal.ts` |
| `public/work/rollin-allomas.webp` (922 x 576 px: `rollin-06.jpeg` cropped to x 170-1092, full height, no scaling) | The owner's copy `rollin-06.jpeg` of a photo from the gallery of <https://rollindocking.com/hotel> (Rollin Technologies Kft.); the exact file URL on that site is **not recorded yet** (open, owner to confirm; a fetch of the page could not tell which gallery file it is). Converted to WebP with Pillow, quality 78, 2026-11-24 | Used with the owner's go-ahead of 2026-11-17 (the work is a team project; the picture is the company's). Content: the station, five scooters and the station panel, no person. Plates, prices and the panel's QR are not legible at this size (OpenCV's QR decoder finds no code at 1x to 8x upscaling; a control code of 40 px decodes, the panel's is about 22 px). If a plate character is readable at 200 % zoom, that patch is pixelated | `/munkaim/` (the Rollin block's still) and the home page's works list (Rollin detail picture), `src/content/munkak.ts` |
| `public/work/demo-kezikonyv-telefon.webp` (780 x 928 px) | the first screen of this site's own QR-kódos gépkönyv demo (`public/demos/kezikonyv/`), captured 2026-11-18 with `scripts/telefonkep.mjs kezikonyv`; the demo's QR library is qrcode-generator (MIT, see the demo's folder) | Own work (a made-up machine and manufacturer); no consent needed | the home page's first screen (GÉPKÖNYV pair), `src/content/fooldal.ts` |
| `public/work/demo-lapszabaszat-kijelzo.webp` (1165 x 960 px) | the first screen of this site's own lapszabászat demo (`public/demos/lapszabaszat/`) with its own "Kitöltési példa" filled in, captured 2026-11-18 with `scripts/telefonkep.mjs lapszabaszat` | Own work (made-up sample data); no consent needed | the home page's first screen (RENDELÉS pair), `src/content/fooldal.ts` |
