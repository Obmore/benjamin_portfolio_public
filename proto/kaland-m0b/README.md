# Kaland M0b: one cinematic scene ("A Mintatér világa")

**Not the live site.** Outside the build (nothing is deployed or imported by `src/`). It answers the owner's verdict that the first prototype
(`proto/kaland-m0/`, flat squares) was too weak: a full-viewport raw-WebGL2 world with light, depth, a camera and optional sound.
Concept, rules and plan: `the private plan kaland-v2`.

## What it shows
The shift's true temperature series (the demo's own run, from `../kaland-m0/adat.js`) is a ribbon of 60,000 particles (30,000 on a phone) whose height is the
value; a thin thread marks the trace. The camera opens in a wide view, flies back along the ribbon (depth = time) and settles in front of the real client page,
which the same particles form as 40 x 48 block means. The pointer pushes the cloud apart; the sound key sings the true value under the camera (silent unless
you move). Wheel, touch, keys and the depth slider set one state; the DOM twin is the same page as text.

## Run it
| What | Command |
|---|---|
| In a browser | `npm run dev`, open `http://localhost:5173/proto/kaland-m0b/` (`?p=0.5` opens at half depth) |
| One self-contained file | `node proto/kaland-m0b/szallit.mjs [out.html]`; `--artifakt` for the Artifact host |
| Frames and checks | `node proto/kaland-m0b/proba.mjs` (env `BASE`, `OUT`, `CHROMIUM` or `CHANNEL`, `GL=hw`) |
On the owner's PC: `GL=hw CHANNEL=msedge node proto/kaland-m0b/proba.mjs`. The page header prints the renderer, the compile time and, rewritten every 40-frame window, the median, the trimmed mean and the p95 of the frame interval, the canvas size and render scale, and the last ladder step.

## Rules in force
Meaning is only data (height = the true value, picture = the true block means); spread, swirl, bloom, grain and vignette are atmosphere. Every particle comes from a
fixed integer hash of `gl_VertexID` (no `Math.random`). Colours are read from the Grafit tokens (dark set forced: a night scene). Reduced motion draws one still
frame (a 2-second pixel test shows no change). The gate (WebGL2 without the performance caveat, no software renderer, no Save-Data, the key) and a frame-time ladder
decide: when the trimmed mean of a window is over 20.5 ms, the synchronous GPU cost of a frame is measured first (8 frames, a stall of a fraction of a second). Only if that cost is over 14 ms is the GPU blamed: the render scale drops by 15 % (floor 0.55), then the light tier (30,000 particles, scale back to 0.8), then, if the cost is over 26 ms, the DOM twin. If the interval is slow but the GPU cost is low, the frame rate is capped or throttled by the host (it happened on the owner's PC, see below): no step, the header says so, and the check repeats every 10th window. The ladder only goes down in a session; the "Minőség" key freezes it. Sound is off until the key is pressed and uses no audio file.

## M0b.3: the richness experiment (spending the GPU headroom)
After the first real-GPU "Mérés" (3.3 to 4.6 ms at full scale) the owner chose to use the headroom. Five **keys under the header** switch the effects, so the owner decides which stay; all are on by default except on phones.
**Principle: the data stays sharp, only the dressing is blurred or glowing.** The thread along the true trace and the picture's blocks never blur; none of the effects carries a value.

| Key | What it does | Cost lever |
|---|---|---|
| Mélységélesség | Depth of field: sprites grow with their distance from the focus (the point the camera looks at) and get a flat disc with a brighter rim; energy falls with size | sprite overdraw |
| Fénycsóva | Light shafts: a radial march (28 taps, quarter resolution) from a point beyond the look target through the glow; fades out as the picture forms | one quarter-resolution pass |
| Lencsecsík | Anamorphic streak: the brightest glow blurred wide and flat (49 taps, quarter resolution) | one bright pass and one blur at quarter resolution |
| Por | 3,000 faint, always out-of-focus specks around the flight path (atmosphere, no value) | extra points |
| Több részecske | 150,000 instead of 60,000 particles; brightness is compensated so the look does not change with the count | vertex work |

The "Mérés" key now measures every effect **alone** against the bare base, then all together at three settings. The frame-time ladder gained a rung: after the render scale is at its floor it switches the effects off before it drops the particle tier. Software-GL frames were used to tune the strengths and to catch bugs (the effects were first too strong: the depth of field swamped the thread, the dust filled the screen); the real look and the cost are judged only on the owner's GPU.

## M0b.4: worked out, not just stronger (three looks, six layers)
The owner saw M0b.3 on the real PC and said it "did not look that good" and, asked what bothers, that it felt **not worked out enough**. My own software frames agreed: one orange cloud, one layer, the thread lost in it, the end picture glaring. Turning effect strengths further would not fix that, so M0b.4 adds **layers with a job** and three **looks** (presets of numbers) that combine them differently. Three header rows: look (Mérőműszer, Színpad, Áramlás, Előző), layers, effects. "Mérőszöveg el" hides the diagnostic text so the world can be seen (and screenshotted) clean.

| Layer key | What it adds | Where the facts come from |
|---|---|---|
| Rács | A floor under the ribbon: rails, a rung every 10 minutes (the full hours brighter), a drop line from the thread to the floor at each hour, a brighter drop line and a marker on the true maximum and minimum | the time axis is the run's own minutes (6:00 to 14:00, 480 samples); the extremes are the series' own max and min |
| Tükör | The strands and the thread mirrored on the floor, dim and soft (a thinner set of 40,000 strands, compensated) | none (dressing) |
| Feliratok | Labels in the scene as DOM text in the site's own type: the full hours on the floor, the value at each hour (Mérőműszer), "csúcs" and "mélypont" with value and time, and "14:00 műszakváltás" at the run's end | all from `adat.js` (the series and the demo's own shift-change fact); `aria-hidden`, the DOM twin and the live readout carry the same facts |
| Háttérfény | A faint glow behind the focus so the scene has air | none (dressing) |

Other changes: the **thread is now a polyline through the 480 true samples** (three hairlines side by side, a soft tube around it), not points: a steep minute made the point version a string of beads, and the polyline is the data itself. The camera is part of a look (the opening and the flight offsets). The end picture got less exposure and less bloom (it glared). Structure (grid, labels) uses the neutral ink token; light stays one hue (Q8).

| Look | Idea | Particles | Camera | Layers |
|---|---|---|---|---|
| Mérőműszer | data first, an instrument: a readable 3D line chart wrapped by sparks | tight strands (spread 0.5), low exposure | high three-quarter view | grid, drop lines, markers, value labels at every hour, faint mirror |
| Színpad | cinematic: a dark stage, depth, a glossy floor | wider strands, light shafts, mild depth of field | low, looking far down the ribbon | strong mirror, hour labels, glow |
| Áramlás | the flow: strands as hairline comets along the time direction | 127,000 hairlines + the picture's own points | close, beside the stream | mirror, hour labels |
| Előző | M0b.3 exactly as it was, for comparison | | | none |

Cost: the grid and drops are about 3,000 line vertices (negligible); the mirror draws another 40,000 strands (the one layer that matters; it is switched off by the ladder together with the effects, and on phones); the polyline is 3 x 480 vertices. **Nothing is measured on a real GPU yet**: the "Mérés" key now has 12 rows (each effect alone, grid alone, mirror alone, and "nézet így" for the look as it stands at three settings). Look and bugs were checked on software frames; **the real look is the owner's to judge.**

The owner approved keeping all three looks and bringing them in chapter by chapter (2026-11-25); which look goes where, and the rules for the engine, are in `the private plan kaland-v2` §4.1.

## The "Mérés" key (M0b.1, extended in M0b.3)
The frame interval is capped by the display's refresh rate, so it hides how much GPU headroom there is. The key runs twelve fixed configurations (since M0b.4: the bare base at two camera depths, each effect alone, the grid alone, the mirror alone, and the current look as it stands at scale 1 and 0.7) and prints, for each, the median synchronous cost of one frame: the draw plus a one-pixel `readPixels`, timed with `performance.now()`. It takes a few seconds to about
15 s (my estimate) and shows where the time goes: pixel work (sprite overdraw, bloom) falls with the square of the render scale, vertex work follows the particle count. Browsers log "GPU stall due to ReadPixels" for it: expected.
Software GL runs it too (`window.__vilag.merjFuttat(n)`), but those numbers are void.

## Measured, and not
**M0b on the owner's real GPU (2026-11-25, Intel integrated graphics 0x7D67, D3D11 through ANGLE):** compile 14 ms; the first header printed 31.3 ms for **one frame** (frame 30), not a median, and never refreshed. M0b.1 then showed, in window 2 at render scale 0.85: median 31.2, mean 31.2, p95 31.7 ms, and the ladder stepped to 0.72. An interval that constant, and unchanged after 28 % fewer pixels, looks like a cap or throttle of the frame rate (about 32 fps) and not like load, but that is an inference: the GPU cost itself is shown by the "Mérés" key and, since M0b.2, in the header. M0b.2 stops the ladder from degrading on a capped frame rate.
**The "Mérés" key on the same PC:** synchronous GPU cost 3.3 ms (wide opening) and 4.6 ms (picture close up) at 1225×1017 px, render scale 1, 60,000 particles; 1.8 / 3.0 ms at scale 0.7; 2.2 ms with 30,000 particles; 1.7 ms for the post stack alone. The GPU is not the limit (about a fifth of a 16.7 ms frame); the 31 ms interval is not ours and its cause is unknown (see `the private plan kaland-v2` §6).
Software GL (SwiftShader): no page error, no horizontal scroll at 390 px, the world bundle is 33.7 KB (15.5 KB gzip, 12 KB of it data). **Software speed and look are void.**
Not measured: a real GPU, phones, Safari, a screen reader.
