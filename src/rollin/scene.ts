import { Anchor, Cylinder, Ellipse, Group, Illustration, Rect, Shape, SvgRenderer, type Vector } from 'zdog'

export type RollinStage = 'docked' | 'signal' | 'open' | 'leaving' | 'ride' | 'return' | 'locking' | 'charge'

type RollinScene = {
  /** `scale` shortens the stage's own duration (a key's whole sequence ends within 1200 ms; mount.ts computes it). */
  show(stage: RollinStage, animate?: boolean, complete?: () => void, scale?: number): void
  destroy(): void
}

/** The stages' own durations (ms) when they animate; the resting poses ('ride', 'charge') take no time. mount.ts sums them to scale a key's sequence. */
export const STAGE_MS: Record<RollinStage, number> = { docked: 0, signal: 450, open: 350, leaving: 850, ride: 0, return: 850, locking: 350, charge: 0 }

// Piecewise-linear easings, copies of the page's own (src/site/elemek/anim.ts `rc`, src/site/fooldal/core.ts `ring`): importing them would share a chunk between this scene and the page scripts.
const piecewise = (pts: readonly (readonly [number, number])[]) => (t: number) => {
  if (t <= 0) return 0
  for (let i = 1; i < pts.length; i++) {
    const [t1, v1] = pts[i]!
    if (t <= t1) {
      const [t0, v0] = pts[i - 1]!
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
    }
  }
  return 1
}
/** The circuit easing of the page: the travel. */
const rc = piecewise([[0, 0], [0.25, 0.632], [0.5, 0.865], [0.75, 0.95], [1, 1]])
/** The ring easing of the page: the latch, the one physical part (it overshoots and settles). */
const ring = piecewise([[0, 0], [0.15, 0.72], [0.3, 1.16], [0.45, 1.02], [0.58, 0.95], [0.75, 1.01], [1, 1]])

// The drawing's colours are the page's tokens, written as var(): Zdog puts them into the SVG's paint attributes, so the drawing follows the theme with no script and no hex in this folder.
// Faces --lap, side faces --oldal, outlines and tyres --tinta, the unlock request --jel, the charge indicator and the lit dock light --be (in an ink outline), unlit lights --oldal.
const INK = 'var(--tinta)'
const LAP = 'var(--lap)'
const SIDE = 'var(--oldal)'
const JEL = 'var(--jel)'
const BE = 'var(--be)'
const TAU = Math.PI * 2

/** A solid box drawn as six faces, each a filled rectangle with an ink outline on top of it (a Zdog Box paints a face's outline in the face's own colour, which would lose the edges on the sheet). */
function solid(addTo: Anchor, o: { width: number; height: number; depth: number; translate?: Partial<Vector> }): Group {
  const { width: w, height: h, depth: d } = o
  const box = new Group({ addTo, translate: o.translate, updateSort: true })
  const faces: { w: number; h: number; translate: Partial<Vector>; rotate: Partial<Vector>; fill: string }[] = [
    { w, h, translate: { z: d / 2 }, rotate: {}, fill: LAP },
    { w, h, translate: { z: -d / 2 }, rotate: { y: TAU / 2 }, fill: SIDE },
    { w: d, h, translate: { x: -w / 2 }, rotate: { y: -TAU / 4 }, fill: SIDE },
    { w: d, h, translate: { x: w / 2 }, rotate: { y: TAU / 4 }, fill: SIDE },
    { w, h: d, translate: { y: -h / 2 }, rotate: { x: -TAU / 4 }, fill: LAP },
    { w, h: d, translate: { y: h / 2 }, rotate: { x: TAU / 4 }, fill: SIDE },
  ]
  for (const f of faces) {
    const face = new Group({ addTo: box, translate: f.translate, rotate: f.rotate })
    new Rect({ addTo: face, width: f.w, height: f.h, stroke: 1, color: f.fill, fill: true })
    new Rect({ addTo: face, width: f.w, height: f.h, stroke: 1.5, color: INK, fill: false })
  }
  return box
}

// Zdog 1.1.3 graph internals that @types/zdog leaves out. The version is
// pinned: the first frame below walks them instead of updateRenderGraph().
// A zdog bump needs a manual diff of Anchor (update, updateGraph), Group
// (render, updateFlatGraph) and Illustration (renderGraphSvg) against the replay
// below; e2e/rollin.spec.ts compares the resumable first frame with a plain
// illo.updateRenderGraph() frame of the same state and fails on any difference.
declare module 'zdog' {
  export const SvgRenderer: unknown
}
type Item = Anchor & {
  children: Item[]
  flatGraph: Item[]
  sortValue: number
  visible?: boolean
  reset(): void
  transform(translation: Vector, rotation: Vector, scale: Vector): void
  updateFlatGraph(): void
  updateSortValue(): void
  render(svg: SVGSVGElement, renderer: unknown): void
}
const groupRender = (Group.prototype as unknown as Item).render

// Anchor#update(), which no Zdog class overrides: reset, update the children,
// then apply the own transform. Yields after each child with descendants.
function* update(item: Item): Generator<void, void, void> {
  item.reset()
  for (const child of item.children) {
    yield* update(child)
    if (child.children.length) yield
  }
  item.transform(item.translate, item.rotate, item.scale)
}

// Group#render() paints its sorted flat graph while visible. Any other item,
// including a cylinder's own group, paints itself. Yields after each group.
function* render(item: Item, svg: SVGSVGElement): Generator<void, void, void> {
  if (item.render !== groupRender) return item.render(svg, SvgRenderer)
  if (!item.visible) return
  for (const child of item.flatGraph) yield* render(child, svg)
  yield
}

// One coordinate system and complete solids keep the scooter aligned with a
// single dock. This is an original illustration, not a manufacturer CAD model.
// Building and first painting the scene takes about 80 ms of main-thread work
// at 8x CPU throttling; the first frame's transform pass alone took ~20 ms.
// Each bare `yield` is a point where the caller may hand the main thread back.
// At 8x a step between them takes 0.4 ms (median), 5 ms (95th percentile)
// and 14 ms at worst seen. The scene is complete when the generator returns.
export function* buildRollinScene(svg: SVGSVGElement): Generator<void, RollinScene, void> {
  const illo = new Illustration({ element: svg, zoom: 1.25, dragRotate: false })
  illo.setSize(500, 310)
  const world = new Group({ addTo: illo, rotate: { x: -.38, y: -24 * Math.PI / 180 }, translate: { x: -15, y: 0 } })
  yield
  // Within this front-facing camera arc the station stays behind the vehicle.
  // Never interleave station solids with the much taller steering column.
  const model = new Group({ addTo: world })
  // The wide plinth's average depth does not describe the depth beneath each
  // dock. Paint its complete solid first, then the housings standing on it;
  // otherwise its top face erases the far housing at oblique viewpoints.
  const station = new Group({ addTo: model })
  solid(station, { width: 268, height: 10, depth: 40, translate: { y: 34, z: -10 } })
  yield
  const docks = new Group({ addTo: station, updateSort: true })
  const lights: Shape[] = []
  let gate!: Anchor
  for (let i = 0; i < 4; i++) {
    // Surface indicators are drawn after their solid housing, in this fixed
    // order (the dock group does not sort). The restricted camera always sees
    // this face, avoiding painter-order loss of small decals.
    const dock = new Group({ addTo: docks, translate: { x: -99 + i * 66, y: 6, z: 0 } })
    solid(dock, { width: 28, height: 45, depth: 27 })
    solid(dock, { width: 19, height: 6, depth: 9, translate: { y: -12, z: 17 } })
    const latch = new Anchor({ addTo: dock, translate: { x: -9, y: -16, z: 19 } })
    new Shape({ addTo: latch, path: [{}, { x: 18 }], stroke: 4, color: INK })
    if (i === 2) gate = latch
    // A light is a slot in an ink outline; it fills with --be when the bay is lit.
    const slot = { path: [{ x: -7 }, { x: 7 }], translate: { y: 8, z: 14.2 } }
    new Shape({ addTo: dock, ...slot, stroke: 6, color: INK })
    lights.push(new Shape({ addTo: dock, ...slot, translate: { y: 8, z: 14.4 }, stroke: 3, color: i === 2 ? BE : SIDE }))
    yield
  }
  // Zdog sorts by each shape's average depth, not by pixel depth. Keep the
  // vehicle together so a dock cannot cut through its long steering column.
  // https://zzz.dog/extras#z-fighting
  const scooter = new Group({ addTo: model, translate: { x: 33 }, updateSort: true })
  for (const z of [27, 137]) {
    const wheel = new Group({ addTo: scooter, translate: { y: 25, z }, rotate: { y: Math.PI / 2 }, updateSort: true })
    new Cylinder({ addTo: wheel, diameter: 31, length: 9, stroke: false, color: INK, frontFace: INK, backface: INK })
    for (const side of [-1, 1]) {
      new Ellipse({ addTo: wheel, diameter: 16, translate: { z: side * 5 }, stroke: 3, fill: true, color: SIDE })
      new Shape({ addTo: wheel, translate: { z: side * 5.3 }, stroke: 5, color: INK })
    }
    yield
  }
  solid(scooter, { width: 17, height: 6, depth: 85, translate: { y: 16, z: 88 } })
  new Shape({ addTo: scooter, path: [{ y: 24, z: 137 }, { y: 8, z: 125 }, { y: 8, z: 113 }], stroke: 5, color: INK })
  new Shape({ addTo: scooter, path: [{ y: 16, z: 48 }, { y: -1, z: 28 }, { y: 25, z: 27 }], stroke: 6, color: INK })
  yield
  // The reflector and clamp belong to the column surface. Sorting their
  // average depths separately flipped the reflector behind the column between
  // -24 and -23 degrees. Keep these attached details in a fixed paint order.
  const steering = new Group({ addTo: scooter })
  new Shape({ addTo: steering, path: [{ y: 13, z: 27 }, { y: -102, z: 2 }], stroke: 7, color: INK })
  new Shape({ addTo: steering, path: [{ x: 2, y: 7, z: 26 }, { x: 2, y: -100, z: 3 }], stroke: 2, color: LAP })
  new Shape({ addTo: steering, translate: { y: -9, z: 22.2 }, stroke: 5, color: LAP })
  new Shape({ addTo: steering, path: [{ x: -22, y: -104, z: 2 }, { x: 22, y: -104, z: 2 }], stroke: 7, color: INK })
  solid(steering, { width: 8, height: 3, depth: 10, translate: { y: -108, z: 3 } })
  const signal = new Shape({ addTo: model, translate: { x: -99, y: 1, z: 20 }, stroke: 6, color: JEL, visible: false })
  // Keep the charging indicator beside the occupied third bay, clear of the
  // steering column throughout the supported camera arc.
  const charging = new Group({ addTo: world, translate: { x: 10, y: -34, z: 15 }, visible: false })
  new Ellipse({ addTo: charging, diameter: 23, stroke: 1.5, fill: true, color: INK })
  new Ellipse({ addTo: charging, diameter: 20, stroke: false, fill: true, color: LAP })
  const bolt = [{ x: 2, y: -8 }, { x: -5, y: 1 }, { x: 0, y: 1 }, { x: -2, y: 8 }, { x: 5, y: -1 }, { x: 0, y: -1 }]
  new Shape({ addTo: charging, path: bolt, closed: true, stroke: 3, fill: true, color: INK })
  new Shape({ addTo: charging, path: bolt, closed: true, stroke: 1, fill: true, color: BE })
  yield
  let pose = { travel: 0, lock: 0, signal: 0 }, frame = 0
  const place = () => {
    scooter.translate.z = pose.travel * 72
    gate.rotate.z = -pose.lock * Math.PI / 2
    signal.translate.x = -99 + pose.signal * 132
  }
  const draw = () => { place(); illo.updateRenderGraph() }
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; svg.dataset.motion = 'idle' }
  const show = (stage: RollinStage, animate = false, complete?: () => void, scale = 1) => {
    cancel()
    const target = { travel: stage === 'leaving' || stage === 'ride' ? 1 : 0, lock: ['open', 'leaving', 'ride', 'return'].includes(stage) ? 1 : 0, signal: stage === 'signal' ? 1 : 0 }
    signal.visible = stage === 'signal'
    charging.visible = stage === 'charge'
    // Bay 3 is lit while the vehicle stands in it.
    lights[2].color = stage === 'leaving' || stage === 'ride' || stage === 'return' ? SIDE : BE
    const duration = animate ? STAGE_MS[stage] * scale : 0
    if (!duration) { pose = target; draw(); complete?.(); return }
    const from = { ...pose }, start = performance.now()
    svg.dataset.motion = 'active'
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      // Travel follows the page's circuit easing, the latch its ring easing (the one physical part), the request moves evenly.
      pose = { travel: from.travel + (target.travel - from.travel) * rc(p), lock: from.lock + (target.lock - from.lock) * ring(p), signal: from.signal + (target.signal - from.signal) * p }
      draw()
      if (p < 1) frame = requestAnimationFrame(tick)
      else { frame = 0; svg.dataset.motion = 'idle'; complete?.() }
    }
    frame = requestAnimationFrame(tick)
  }
  svg.dataset.motion = 'idle'
  // The first frame is draw()'s updateRenderGraph() in resumable steps: the
  // same work in the same order, so it paints the same artwork.
  place()
  const root = illo as unknown as Item
  // Anchor#updateGraph()
  yield* update(root)
  root.updateFlatGraph()
  root.flatGraph.forEach(item => item.updateSortValue())
  root.flatGraph.sort((a, b) => a.sortValue - b.sortValue)
  yield
  // Illustration#renderGraph(). The <svg> is still empty and no onPrerender
  // hook is set, so only the graph walk remains.
  for (const item of root.flatGraph) yield* render(item, svg)
  return { show, destroy: cancel }
}
