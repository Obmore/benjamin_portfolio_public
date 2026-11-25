// Entry of the shared-link alignment (src/site/horgony.ts). keret.ts loads it through a <script type=module> that Vite bundles on its own (`?worker&url`, then a
// <script> element; it must not rely on worker globals), because a module shared by more than one page entry would become a shared chunk with a script tag in every page that uses it
// (or, as a dynamic import, would pull Vite's preload helper into one), and the pages' script lists are fixed.
import { horgonyUtanBetoltes } from './horgony.ts'

horgonyUtanBetoltes().catch(() => { /* the browser's own scroll stays */ })
