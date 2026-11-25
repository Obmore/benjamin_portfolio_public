/**
 * Whether the attribute text of one <script> tag of the notice is allowed: exactly `data-jel-fej` (the shared head snippet), or exactly
 * `type="module"`, `crossorigin` and `src="/assets/<name>.js"` in any order (Vite's own module tag). An extra, missing or repeated attribute,
 * another value or another src fails.
 */
export function scriptAttrsAllowed(attrText) {
  const text = attrText.trim()
  const attr = /([^\s="'<>/]+)(?:="([^"]*)")?/y
  const attrs = []
  for (let i = 0; i < text.length; ) {
    attr.lastIndex = i
    const m = attr.exec(text)
    if (!m) return false
    attrs.push([m[1], m[2]])
    i = attr.lastIndex
    if (i < text.length && !/\s/.test(text[i])) return false
    while (i < text.length && /\s/.test(text[i])) i++
  }
  const names = attrs.map(([n]) => n)
  if (new Set(names).size !== names.length) return false
  if (attrs.length === 1 && names[0] === 'data-jel-fej') return attrs[0][1] === undefined
  const v = Object.fromEntries(attrs)
  return attrs.length === 3 && v.type === 'module' && 'crossorigin' in v && v.crossorigin === undefined && /^\/assets\/[\w.-]+\.js$/.test(v.src ?? '')
}
