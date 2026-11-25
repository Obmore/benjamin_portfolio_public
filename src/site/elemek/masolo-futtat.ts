// Entry of the contact end (src/site/elemek/masolo.ts). main.ts and the other page entries load it through a <script type=module> that Vite bundles on its own (`?worker&url`, then a
// <script> element; it must not rely on worker globals), because a module shared by more than one page entry would become a shared chunk with a script tag in every page that uses it
// (or, as a dynamic import, would pull Vite's preload helper into one), and the pages' script lists are fixed.
import { cimmezoIndit } from './masolo.ts'

try { cimmezoIndit() } catch { /* the contact end stays as the server rendered it */ }
