// Entry of the 3D world's home-page button (src/site/vilag-belepo.ts). main.ts loads it through a <script type=module> that Vite bundles on its own (`?worker&url`, then a
// <script> element; it must not rely on worker globals), so no chunk is shared with another page entry and no new head tag appears.
import { vilagBelepoIndit } from './vilag-belepo.ts'

try { vilagBelepoIndit() } catch { /* the page is complete without the world */ }
