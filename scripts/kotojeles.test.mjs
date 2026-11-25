import assert from 'node:assert/strict'
import test from 'node:test'
import { kotojelesekEgyben as nb } from '../src/site/kotojeles.ts'

const szoveg = (html) => html.replace(/<[^>]*>/g, '')

test('wraps a compound in a heading and keeps the text content identical', () => {
  const html = '<h1 id="a-b">Egy QR-kód itt</h1>'
  assert.equal(nb(html), '<h1 id="a-b">Egy <span class="nb">QR-kód</span> itt</h1>')
  assert.equal(szoveg(nb(html)), szoveg(html))
})

test('entities stay as they are and separate compounds', () => {
  assert.equal(nb('<h2>Kód &amp; QR-kód</h2>'), '<h2>Kód &amp; <span class="nb">QR-kód</span></h2>')
  assert.equal(nb('<h2>QR-&shy;kód</h2>'), '<h2>QR-&shy;kód</h2>')
})

test('a tag next to a compound does not take part in it', () => {
  assert.equal(nb('<h3><em>x</em>QR-kód<strong>y</strong></h3>'), '<h3><em>x</em><span class="nb">QR-kód</span><strong>y</strong></h3>')
})

test('hyphens in attributes are untouched', () => {
  const html = '<a class="gomb gomb-fo" href="/a-b" aria-label="Meg-hívás" data-esemeny="fo-gomb">Küldés</a>'
  assert.equal(nb(html), html)
})

test('a plain-text .gomb gets one wrapper span around its text', () => {
  const html = '<a class="gomb gomb-keretes" href="/x" data-esemeny="demo">Kipróbálom a gépadat-bemutatót</a>'
  const ki = nb(html)
  assert.equal(ki, '<a class="gomb gomb-keretes" href="/x" data-esemeny="demo"><span>Kipróbálom a <span class="nb">gépadat-bemutatót</span></span></a>')
  assert.equal(szoveg(ki), szoveg(html))
})

test('a mixed-content button: each text run with a compound is enclosed whole, others and child elements stay', () => {
  const html = '<button type="button"><svg><path d="a-b"/></svg> Mentés a gépadat-bemutatóba <b>Új</b> szó <i>x</i> e-mail</button>'
  const ki = nb(html)
  assert.equal(
    ki,
    '<button type="button"><svg><path d="a-b"/></svg><span> Mentés a <span class="nb">gépadat-bemutatóba</span> </span><b>Új</b> szó <i>x</i><span> <span class="nb">e-mail</span></span></button>',
  )
  assert.equal(szoveg(ki), szoveg(html))
})

test('elements whose name only starts like a target are not matched', () => {
  for (const html of ['<header>QR-kód</header>', '<hr/>QR-kód', '<article>QR-kód</article>', '<abbr>QR-kód</abbr>', '<p>QR-kód</p>']) assert.equal(nb(html), html)
})

test('h4 and summary are in scope', () => {
  assert.equal(nb('<h4>QR-kód</h4>'), '<h4><span class="nb">QR-kód</span></h4>')
  assert.equal(nb('<details><summary>e-mailes kérdés</summary>QR-kód</details>'), '<details><summary><span class="nb">e-mailes</span> kérdés</summary>QR-kód</details>')
})

test('the package name span is in scope', () => {
  assert.equal(nb('<span class="belepo-nev">Termékleírás-próbakör:</span>'), '<span class="belepo-nev"><span class="nb">Termékleírás-próbakör</span>:</span>')
})

test('a number range counts as a compound and stays on one line too', () => {
  assert.equal(nb('<h3>2026-11-10</h3>'), '<h3><span class="nb">2026-11-10</span></h3>')
})

test('a second pass changes nothing', () => {
  const html =
    '<h1>QR-kód</h1><a class="gomb" href="/x">Egy gépadat-bemutató</a><button><b>x</b> e-mail</button><span class="belepo-nev">A-B</span><h4>Á-Ú &amp; B-C</h4>'
  const egyszer = nb(html)
  assert.notEqual(egyszer, html)
  assert.equal(nb(egyszer), egyszer)
})

test('the package name span matches as a class token (other classes allowed)', () => {
  assert.equal(nb('<span class="x belepo-nev y">A-B</span>'), '<span class="x belepo-nev y"><span class="nb">A-B</span></span>')
  assert.equal(nb('<span class="belepo-nev-x">A-B</span>'), '<span class="belepo-nev-x">A-B</span>')
})

test('a package name span with a nested span: the block ends at the first </span>, output stays valid and stable', () => {
  const html = '<span class="belepo-nev">A-B <span>x-y</span> C-D</span>'
  const ki = nb(html)
  assert.equal(ki, '<span class="belepo-nev"><span class="nb">A-B</span> <span><span class="nb">x-y</span></span> C-D</span>')
  assert.equal(szoveg(ki), szoveg(html))
  assert.equal(nb(ki), ki)
})

test('a button nested in a heading or a summary gets the same whole-run wrapper', () => {
  assert.equal(
    nb('<h3>Cím <button class="x">Kipróbálom a QR-kódot</button> vége</h3>'),
    '<h3>Cím <button class="x"><span>Kipróbálom a <span class="nb">QR-kódot</span></span></button> vége</h3>',
  )
  assert.equal(
    nb('<details><summary>Kérdés <a class="gomb" href="/x">e-mail írása</a></summary></details>'),
    '<details><summary>Kérdés <a class="gomb" href="/x"><span><span class="nb">e-mail</span> írása</span></a></summary></details>',
  )
  // Top-level button behaviour is unchanged.
  assert.equal(nb('<button>QR-kód</button>'), '<button><span><span class="nb">QR-kód</span></span></button>')
})

test('svg, script and style subtrees are never touched', () => {
  assert.equal(
    nb('<button><svg><title>QR-kód</title></svg>Küld QR-kód</button>'),
    '<button><svg><title>QR-kód</title></svg><span>Küld <span class="nb">QR-kód</span></span></button>',
  )
  assert.equal(nb('<h2>Cím <svg><text>A-B</text></svg> B-C</h2>'), '<h2>Cím <svg><text>A-B</text></svg> <span class="nb">B-C</span></h2>')
  const html = '<h2><style>a-b{}</style><script>var a-b</script>x</h2>'
  assert.equal(nb(html), html)
})

test('void elements written without a slash leave no stack entry', () => {
  assert.equal(nb('<a class="gomb" href="/x"><embed><track><param>QR-kód</a>'), '<a class="gomb" href="/x"><embed><track><param><span><span class="nb">QR-kód</span></span></a>')
})

test('a <wbr/> (void) inside a transformed block does not disturb the tag stack', () => {
  const html = '<a class="gomb" href="/x">Ár<wbr/> QR-kód</a>'
  const ki = nb(html)
  assert.equal(ki, '<a class="gomb" href="/x">Ár<wbr/><span> <span class="nb">QR-kód</span></span></a>')
  assert.equal(szoveg(ki), szoveg(html))
})

test('gomb is a whole class token: gomb-alatt is not a button and is left untouched', () => {
  const html = '<a class="gomb-alatt" href="/x">QR-kód</a>'
  assert.equal(nb(html), html)
  assert.equal(nb('<a class="gomb gomb-keretes gomb-kicsi" href="/x">QR-kód</a>'), '<a class="gomb gomb-keretes gomb-kicsi" href="/x"><span><span class="nb">QR-kód</span></span></a>')
  assert.equal(nb('<a class="x gomb" href="/x">QR-kód</a>'), '<a class="x gomb" href="/x"><span><span class="nb">QR-kód</span></span></a>')
})
