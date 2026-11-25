// Shared-link alignment for every page that runs keret.ts (the legal pages, /megrendeles/, /munkaim/ and 404). Started from horgony-futtat.ts.

const root = document.documentElement

// The element the URL hash names (decoded; a malformed %-encoding keeps the raw hash), or null.
function hashCel(): { id: string; cel: HTMLElement | null } {
  let id = location.hash.slice(1)
  try { id = decodeURIComponent(id) } catch { /* hibás %-kódolás: a nyers hash marad */ }
  return { id, cel: id ? document.getElementById(id) : null }
}

// A shared link scrolls to its target under the fallback font; the web-font swap then changes the height above it and the target drifts under the header
// (Chromium keeps it with scroll anchoring in most cases; WebKit has none, so the drift stays). Once the page, its scrolling and its fonts are in, re-align it a single time.
// The home page does not call this (main.ts): its chunk relayouts and plays its own load after the fonts. Not on reload or back/forward:
// the browser restores the old scroll offset there, which the visitor expects to keep.
// The page-load jump to a fragment is instant (keret.css: smooth scrolling only under html[data-sima], set after the load), so it is over before the font swap
// and the target is aligned when this script starts (the first sighting below). The settling logic (scrollend or quiet frames, the sightings during it) covers a
// browser whose own fragment scroll is still running at the load event.
// keret.ts starts it through horgony-futtat.ts (a classic script bundled on its own, added only when there is a hash): a behaviour module shared by page entries gets no script tag of its own.
// "Moved" = an input event, a changed hash id, or a scrollY change that the target's document-position shift (scroll anchoring) does not explain. The reference is the scroll
// position where the target was last seen aligned (the browser's own, possibly smooth, fragment scroll can still be running at the load event, so the load is no baseline);
// the font swap alone leaves scrollY unchanged. When the target was never seen aligned, the scroll position once the scrolling has settled is the reference.
// "Moved" also covers input before this script ran: the loader (keret.ts) flags it on <html> (data-horgony-mozdult); this file removes the flag when it is done.
// One 15 s budget covers every wait (load, scroll settling, fonts), so nothing outlives it.
const FEL_MS = 15000
const FONT_MS = 5000
const SCROLLEND_MS = 3000

export async function horgonyUtanBetoltes(): Promise<void> {
  const id0 = hashCel().id
  if (!id0) return
  const tipus = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type
  const fonts = document.fonts as FontFaceSet | undefined
  if (tipus === 'reload' || tipus === 'back_forward' || !fonts) { delete root.dataset.horgonyMozdult; return }
  const ac = new AbortController()
  const { signal } = ac
  const timers: number[] = []
  // The one deadline: aborting makes every pending wait reject, and the finally block lets go of everything.
  const deadline = new Promise<never>((_, nem) => { signal.addEventListener('abort', () => nem(new Error('deadline')), { once: true }) })
  deadline.catch(() => { /* seen */ })
  timers.push(window.setTimeout(() => ac.abort(), FEL_MS))
  const waiting = <T>(p: Promise<T>) => Promise.race([p, deadline])
  let moved = false
  const stop = () => { moved = true }
  for (const e of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.addEventListener(e, stop, { passive: true, once: true, signal })
  const docPos = (cel: HTMLElement) => window.scrollY + cel.getBoundingClientRect().top
  // Where a hash jump puts the target: the root's scroll-padding-top plus the target's own scroll-margin-top (h2 on the legal pages).
  const hely = (cel: HTMLElement) => (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(cel).scrollMarginTop) || 0)
  let yRef = NaN
  let dRef = 0
  let scrolled = true
  let inflight = false
  // The target element is looked up once per hash value; a scroll event only reads its position.
  let cache = { hash: '', cel: null as HTMLElement | null }
  const sight = () => {
    if (!cache.cel || cache.hash !== location.hash) cache = { hash: location.hash, cel: hashCel().cel }
    const cel = cache.cel
    if (cel && Math.abs(cel.getBoundingClientRect().top - hely(cel)) <= 2) { yRef = window.scrollY; dRef = docPos(cel) }
  }
  const onScroll = () => {
    scrolled = true
    inflight = true
    sight()
  }
  window.addEventListener('scroll', onScroll, { passive: true, signal })
  // The page-load jump is instant (keret.css: smooth scrolling only under `html[data-sima]`, set after the load) and can be over before this script starts, so no scroll event is
  // left to see the aligned target: a target that is aligned now is the first sighting.
  sight()
  window.addEventListener('scrollend', () => { inflight = false }, { signal })
  const frame = () => waiting(new Promise<void>((done) => requestAnimationFrame(() => done())))
  const wait = (ms: number) => new Promise<void>((done) => { timers.push(window.setTimeout(done, ms)) })
  try {
    // Gives up (the deadline rejects) if the load event never comes.
    if (document.readyState !== 'complete') await waiting(new Promise<void>((done) => window.addEventListener('load', () => done(), { once: true, signal })))
    // The page's own (maybe smooth) fragment scroll can still be running: decide only once the scrolling has settled (scrollend where it exists, else quiet frames).
    const canEnd = 'onscrollend' in window
    const t0 = performance.now()
    // Without scrollend a pause between two scroll events can hide a running smooth scroll: three quiet frames then.
    for (let quiet = 0; quiet < (canEnd ? 2 : 3);) {
      await frame()
      if (inflight && canEnd && performance.now() - t0 < SCROLLEND_MS) { quiet = 0; continue }
      if (scrolled) { scrolled = false; quiet = 0 } else quiet++
    }
    if (Number.isNaN(yRef)) {
      yRef = window.scrollY
      const base = hashCel().cel
      dRef = base ? docPos(base) : 0
    }
    await waiting(fonts.ready)
    // The fonts may have been requested late: ready can already be resolved before the swap. Wait for the one loadingdone, then the frame.
    if (fonts.status !== 'loaded') {
      await waiting(Promise.race([new Promise<void>((done) => fonts.addEventListener('loadingdone', () => done(), { once: true, signal })), wait(FONT_MS)]))
    }
    await frame()
    const { id, cel } = hashCel()
    if (moved || root.dataset.horgonyMozdult !== undefined || !cel || id !== id0) return
    const dy = window.scrollY - yRef
    const shift = docPos(cel) - dRef
    // A partial scroll-anchoring adjustment (the anchor node is not the target) is a share of the target's own shift: same sign, no larger.
    const explained = Math.abs(dy) <= 2 || (dy * shift > 0 && Math.abs(dy) <= Math.abs(shift) + 2)
    if (!explained) return
    if (Math.abs(cel.getBoundingClientRect().top - hely(cel)) <= 2) return
    cel.scrollIntoView({ behavior: 'instant' })
  } catch { /* the browser's own scroll stays */ } finally {
    ac.abort()
    delete root.dataset.horgonyMozdult
    for (const t of timers) clearTimeout(t)
  }
}
