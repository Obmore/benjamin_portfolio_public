import assert from 'node:assert/strict'
import test from 'node:test'
import { SITE_URL } from '../src/content/alapadatok.ts'
import { ANALITIKA } from '../src/content/beallitasok.ts'
import { esemenyKovetes, mereshezBetolt } from '../src/site/meres.ts'

// Visitor analytics loader and click reporting (src/site/meres.ts): no browser, a minimal fake document.

function fakeDoc() {
  const head = { children: [], appendChild(el) { this.children.push(el) } }
  const listeners = []
  return {
    head,
    listeners,
    createElement: (tag) => ({ tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v } }),
    addEventListener: (type, fn, options) => listeners.push({ type, fn, options }),
  }
}

test('the setting names Umami Cloud with a script URL and a website id', () => {
  assert.equal(ANALITIKA?.szolgaltato, 'umami')
  assert.equal(ANALITIKA?.szkript, 'https://cloud.umami.is/script.js')
  assert.match(ANALITIKA?.azonosito ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
})

test('on the production host the script tag has the right src, async and data-website-id', () => {
  for (const host of ['ottbenjamin.hu', 'www.ottbenjamin.hu']) {
    const doc = fakeDoc()
    const el = mereshezBetolt(ANALITIKA, host, doc)
    assert.ok(el, host)
    assert.equal(doc.head.children.length, 1)
    assert.equal(el.tag, 'script')
    assert.equal(el.src, ANALITIKA.szkript)
    assert.equal(el.async, true)
    assert.equal(el.attrs['data-website-id'], ANALITIKA.azonosito)
    assert.equal(el.attrs['data-do-not-track'], 'true')
  }
})

test('production hosts come from the canonical site URL', () => {
  const host = new URL(SITE_URL).hostname
  assert.equal(host, 'ottbenjamin.hu')
  assert.ok(mereshezBetolt(ANALITIKA, host, fakeDoc()))
  assert.ok(mereshezBetolt(ANALITIKA, `www.${host}`, fakeDoc()))
})

test('each opt-out signal keeps the script away; without a signal it is added', () => {
  const jelek = [
    [{ doNotTrack: '1' }, {}],
    [{}, { doNotTrack: '1' }],
    [{ globalPrivacyControl: true }, {}],
  ]
  for (const [nav, win] of jelek) {
    const doc = fakeDoc()
    assert.equal(mereshezBetolt(ANALITIKA, 'ottbenjamin.hu', doc, nav, win), null, JSON.stringify([nav, win]))
    assert.equal(doc.head.children.length, 0)
  }
  for (const [nav, win] of [[{ doNotTrack: '0', globalPrivacyControl: false }, { doNotTrack: null }], [{ doNotTrack: 'unspecified' }, { doNotTrack: 'unspecified' }], [{}, {}]]) {
    const doc = fakeDoc()
    assert.ok(mereshezBetolt(ANALITIKA, 'ottbenjamin.hu', doc, nav, win))
    assert.equal(doc.head.children.length, 1)
  }
})

test('nothing is injected on any other host, or when the setting is null', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'obmore.github.io', 'ottbenjamin.hu.example.com', 'xottbenjamin.hu', '']) {
    const doc = fakeDoc()
    assert.equal(mereshezBetolt(ANALITIKA, host, doc), null, host)
    assert.equal(doc.head.children.length, 0, host)
  }
  const doc = fakeDoc()
  assert.equal(mereshezBetolt(null, 'ottbenjamin.hu', doc), null)
  assert.equal(doc.head.children.length, 0)
})

test('the click listener is one capture, passive listener that reports the closest data-esemeny and never throws', () => {
  const doc = fakeDoc()
  const calls = []
  esemenyKovetes(doc, { umami: { track: (nev) => calls.push(nev) } })
  assert.equal(doc.listeners.length, 1)
  const [{ type, fn, options }] = doc.listeners
  assert.equal(type, 'click')
  assert.deepEqual(options, { capture: true, passive: true })
  // Node has no DOM Element class: define a stand-in so the listener's `instanceof Element` check can pass here.
  // A target that is not an Element (the `{}` below) is ignored.
  globalThis.Element ??= class {}
  const gomb = Object.assign(new globalThis.Element(), { closest: (sel) => (sel === '[data-esemeny]' ? gomb : null), getAttribute: () => 'email' })
  const belso = Object.assign(new globalThis.Element(), { closest: () => gomb })
  fn({ target: belso })
  fn({ target: Object.assign(new globalThis.Element(), { closest: () => null }) })
  fn({ target: {} })
  assert.deepEqual(calls, ['email'])
  // umami missing or throwing: no exception reaches the caller.
  const doc2 = fakeDoc()
  esemenyKovetes(doc2, {})
  assert.doesNotThrow(() => doc2.listeners[0].fn({ target: belso }))
  const doc3 = fakeDoc()
  esemenyKovetes(doc3, { umami: { track: () => { throw new Error('boom') } } })
  assert.doesNotThrow(() => doc3.listeners[0].fn({ target: belso }))
})
