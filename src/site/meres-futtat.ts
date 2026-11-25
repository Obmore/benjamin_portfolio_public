// Entry of the visitor analytics (src/site/meres.ts). main.ts and the other page entries load it through a <script type=module> that Vite bundles on its own (`?worker&url`, then a
// <script> element; it must not rely on worker globals), for the same reason as horgony-futtat.ts: no shared chunk, no new head tag, no change to the pages' script lists.
import { meresIndit } from './meres.ts'

try { meresIndit() } catch { /* a measuring failure must never reach the visitor */ }
