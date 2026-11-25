// The home page's lazy chunk: the entry that main.ts imports. The behaviour is in page.ts (layout, load sequence, scroll drivers), core.ts
// (animation clock, traces, spine, bus, offers, earth), nyito.ts (the first screen: keys, band, screen) and parts.ts (devices, controller, cable); the "Sötét mód" key is tema.ts. The contact end is its own module (src/site/elemek/masolo.ts).
export { indit, fail } from './page.ts'
