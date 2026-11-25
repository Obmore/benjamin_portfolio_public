/// <reference types="vite/client" />

// The shared layer's copy of the "Rétegek" script URL (src/site/keret.ts): a different query keeps the URL module out of a chunk shared with main.ts.
declare module '*?worker&url&keret' {
  const src: string
  export default src
}

// /megrendeles/ (src/site/megrendeles.ts): its own bundle of each standalone script (the theme key, the contact end, the analytics), so that no chunk is shared with main.ts or the legal pages.
declare module '*?worker&url&megr' {
  const src: string
  export default src
}

// /munkaim/ (src/site/munkaim.ts): its own bundle of each standalone script (the theme key, the contact end, the analytics), so that no chunk is shared with another page.
declare module '*?worker&url&munk' {
  const src: string
  export default src
}
