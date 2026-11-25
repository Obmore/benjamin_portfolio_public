# Kaland M0: prototype of "Az út a Mintatérben"

**Not the live site.** This folder is outside the build (`vite.config.ts` builds only the `OLDALAK` entries), so nothing here is
deployed and nothing here is imported by `src/`. It exists so the owner and the reviewers can see and run the idea before any
production code is written. The plan is `the private plan kaland-terv`; the Mintatér plan it builds on is `the private plan mintater-*`.

## Run it
| What | Command | Notes |
|---|---|---|
| Look at it in a browser | `npm run dev`, then open `http://localhost:5173/proto/kaland-m0/` | Vite serves the folder; no build step |
| One self-contained file | `node proto/kaland-m0/szallit.mjs [out.html]` | CSS, fonts, picture, data and script inlined (about 230 KB), opens from `file://` |
| The same, for the Artifact host | `node proto/kaland-m0/szallit.mjs out.html --artifakt` | content only, host theme mapped to the page's own, demo links made absolute |
| Frames and checks | `node proto/kaland-m0/proba.mjs` | env `BASE`, `OUT`, `CHROMIUM` (binary path) or `CHANNEL` (e.g. `msedge`), `GL=hw` for a real GPU |
| Regenerate the data | `node proto/kaland-m0/epit.mjs` | writes `adat.js` from the repository's own files (below) |

On the owner's PC, for real-GPU numbers: `GL=hw CHANNEL=msedge node proto/kaland-m0/proba.mjs`. Every frame's log line records the
renderer string; a frame from a software renderer (SwiftShader) is void for judging the look and the speed (plan 6.1).
The page's header also prints the renderer, the first shader compile time and the median frame time of the first 30 animated frames.

## Where every value comes from
`epit.mjs` writes `adat.js`; nothing in the folder is typed by hand except layout constants and the working strings.
- GÉPADAT: the demo's own `step()` (`public/demos/adatgyujto/app.js`, seed 20261026) run in Node for 480 minutes from 6:00; the
  first 60 samples are asserted equal to `CNC1_HOMERSEKLET`; the shift-change sentence is the demo's own announcement.
- GÉPKÖNYV: `QR_MODULOK` (the real code of the manual demo, `https://ottbenjamin.hu/demos/kezikonyv/`).
- HONLAP and the first screen: the block means of `public/work/lelek-es-nyelv-telefon.webp`, measured in linear light at load.
- Évek: `IDOVONAL` and `TERULETEK` (`src/content/tapasztalat.ts`, approved 2026-11-05); no employer names, no CV.
- Contact: the address from `src/content/alapadatok.ts` (`VALLALKOZO`, `levelCim`); the mail subject is a working string. No phone (owner decision 2026-11-05).
- Colours: read from the Grafit tokens (`src/site/fooldal/jel-tokens.css`) at run time; there is no colour literal in the scripts.

## Files
| File | Holds |
|---|---|
| `index.html`, `kaland.css`, `kaland.js` | the page, its styles and the whole app (gate, stations, probe, route) |
| `gl.js`, `arnyekolok.js`, `matek.js` | raw WebGL2 helper (parallel-compile polling, R32F/RGBA8 textures), GLSL ES 3.00 sources, the shared projection with a self-test |
| `adat.js`, `epit.mjs` | generated data and its generator |
| `proba.mjs`, `szallit.mjs` | frame/check run and the single-file packer |

## What this proves, and what it does not
Proven (software GL, Chromium, both themes, 1280 and 390 px, reduced motion, gate off): the in-flow canvas per station; the fall
with the three true data sets; the probe by pointer and keyboard with a live-region readout; the screen assembling from block
means; the years fall from the approved timeline; the found-trace and reward behaviour; the route lane (CSS scroll-driven where
supported, flat otherwise); the reduced-motion form is a still with no idle motion (pixel check over 2 s); the gate-off form is the
plain DOM page; no horizontal scroll on the phone; no console error or page error in the run (the only console warnings are the
software renderer's "GPU stall due to ReadPixels" driver messages).

Not proven: speed and look on a real GPU; Safari and iOS; a real screen reader; the GÉPKÖNYV code decoded to its URL (planned for
the section PR); the RENDELÉS pair; page transitions; the 404; approved copy (every string is a working string, `[copy: owner]`).
