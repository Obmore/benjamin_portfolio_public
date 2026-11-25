// Inserts generated text into HTML at a marker. String.prototype.replace(string, string) would read "$&", "$'", "$`" and
// "$1" in the inserted text as replacement patterns and corrupt the output; a function replacer inserts it literally.

/**
 * Replaces the first occurrence of `marker` in `html` with `text`, taken literally. Throws when the marker is missing, so a
 * template that lost its marker fails the build instead of silently shipping without the content. A site where the marker
 * is optional checks `html.includes(marker)` itself.
 */
export function insertAt(html: string, marker: string, text: string): string {
  if (!html.includes(marker)) throw new Error(`insertAt: marker ${marker} not found in the page`)
  return html.replace(marker, () => text)
}
