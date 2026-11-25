// Entry of the "Rétegek" stacks (src/site/retegek/mukodes.ts). main.ts and keret.ts load it through a <script type=module> that Vite bundles on its own (`?worker&url`, then a <script> element; it must not
// rely on worker globals): a module shared by page entries would become a shared chunk with a script tag in every page that uses it, and the pages' script lists are fixed. The script loads the stacks' stylesheet
// itself (it is a lazy sheet, not one of the page's own), so a page that has no stack never pays for it.
import cssUrl from './retegek/retegek.css?url'
import { start } from './retegek/mukodes.ts'

try { start(cssUrl) } catch { /* the page stays as the server rendered it */ }
