// Entry of Rollin's dock scene (src/rollin/mount.ts) as a script of its own: src/site/munkaim.ts appends it as a `<script type="module">` when the work block comes within 600 px of the viewport
// (`?worker&url`: Vite bundles this file with the scene library into one self-contained file, so no chunk is shared with another page entry and the page's script list stays as it is).
// It builds the drawing into the page's box and arms the keys; on an error it removes the keys and the drawing box and the still stays (the same ending as a script that fails to load).
import { mountRollin } from './mount'

const blokk = document.getElementById('munka-rollin')
if (blokk) {
  mountRollin(blokk).catch(() => {
    blokk.querySelector('[data-rollin-vez]')?.remove()
    blokk.querySelector('[data-rollin-rajz]')?.remove()
  })
}
