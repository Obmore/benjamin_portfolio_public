// The two motion helpers the contact end (masolo.ts) and the home chunk (fooldal/core.ts) share: the page's circuit easing and a frame-clock animation.
// Nothing here touches the DOM or imports a page module, so a page that carries only the component does not pull in the home chunk.

// The circuit easing of the page (08 4.1, "rc"): a quick rise that settles.
const RC: [number, number][] = [[0, 0], [0.25, 0.632], [0.5, 0.865], [0.75, 0.95], [1, 1]]
export function rc(t: number): number {
  if (t <= 0) return 0
  for (let i = 1; i < RC.length; i++) {
    const [t1, v1] = RC[i]!
    if (t <= t1) {
      const [t0, v0] = RC[i - 1]!
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
    }
  }
  return 1
}

export interface Anim { stop(): void }

/** Plays `frame(ease(t))` over `ms` on the animation frames (the clock starts at the first frame), then calls `done`. `live` ends it early (a dead page). */
export function anim(ms: number, ease: (t: number) => number, frame: (e: number, t: number) => void, done?: () => void, live: () => boolean = () => true): Anim {
  let raf = 0
  let t0 = -1
  let stopped = false
  const step = (now: number) => {
    if (stopped || !live()) return
    if (t0 < 0) t0 = now
    const t = Math.min(1, (now - t0) / ms)
    frame(ease(t), t)
    if (t < 1) raf = requestAnimationFrame(step)
    else done?.()
  }
  raf = requestAnimationFrame(step)
  return { stop: () => { stopped = true; cancelAnimationFrame(raf) } }
}
