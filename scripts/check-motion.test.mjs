import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkCss, movingKeyframes, parseCss, transitionProperties } from './lib/motion-rules.mjs'

const NP = '@media (prefers-reduced-motion: no-preference)'
const RD = '@media (prefers-reduced-motion: reduce)'

test('the parser keeps the at-rule context of a rule and collects keyframes', () => {
  const { rules, keyframes } = parseCss(`@keyframes a { from { opacity: 0; } }\n${NP} { @supports (x: y) { .a { color: red; } } }\n.b { color: blue; }`)
  assert.deepEqual([...keyframes.keys()], ['a'])
  assert.equal(rules.length, 2)
  assert.deepEqual(rules[0].context.length, 2)
  assert.equal(rules[1].context.length, 0)
})

test('a moving keyframes block is allowed under no-preference only', () => {
  const kf = '@keyframes up { from { translate: 0 24px; } }'
  assert.deepEqual(checkCss(`${kf}\n${NP} { .a { animation: up 1s both; } }`, 'x.css'), [])
  assert.equal(checkCss(`${kf}\n.a { animation: up 1s both; }`, 'x.css').length, 1)
  assert.equal(checkCss(`${kf}\n${RD} { .a { animation-name: up; } }`, 'x.css').length, 2)
})

test('every moving property counts: transform, translate, scale, rotate', () => {
  for (const prop of ['transform: none', 'translate: 0 1px', 'scale: 1.1', 'rotate: 3deg']) {
    const css = `@keyframes k { from { ${prop}; } }\n.a { animation: k 1s; }`
    assert.equal(checkCss(css, 'x.css').length, 1, prop)
  }
})

test('an opacity or line-drawing keyframes block may run under reduced motion', () => {
  const css = `@keyframes fade { from { opacity: 0; } }\n@keyframes draw { from { stroke-dashoffset: 1; } }\n@keyframes line { from { clip-path: inset(0 100% 0 0); } }\n.a { animation: fade 1s both; }\n${RD} { .b { animation: draw 200ms; } .c { animation: line 250ms; } }`
  assert.deepEqual(checkCss(css, 'x.css'), [])
})

test('an infinite animation needs no-preference', () => {
  assert.equal(checkCss('@keyframes f { to { opacity: 0; } }\n.a { animation: f 1s infinite; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { animation-iteration-count: infinite; }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`@keyframes f { to { opacity: 0; } }\n${NP} { .a { animation: f 1s infinite; } }`, 'x.css'), [])
})

test('a transform transition needs no-preference; a colour or opacity transition does not', () => {
  assert.equal(checkCss('.a { transition: transform 0.2s; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition: color 0.2s, translate 0.3s; }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`${NP} { .a { transition: transform 0.2s, translate 1s; } }`, 'x.css'), [])
  assert.deepEqual(checkCss('.a { transition: color 0.2s, opacity 0.3s, background-color 1s; }', 'x.css'), [])
})

test('under reduced motion no time may exceed 300 ms', () => {
  assert.equal(checkCss(`${RD} { .a { transition: opacity 0.4s; } }`, 'x.css').length, 1)
  assert.equal(checkCss(`${RD} { .a { animation: fade 301ms; } }`, 'x.css').length, 1)
  assert.deepEqual(checkCss(`${RD} { .a { transition: opacity 0.3s; animation-duration: 240ms; } }`, 'x.css'), [])
})

test('the old guarantees stay: nothing animates layout properties', () => {
  for (const prop of ['width: 0', 'height: 0', 'top: 0', 'left: 0', 'filter: blur(2px)', 'box-shadow: none']) {
    assert.equal(checkCss(`@keyframes k { from { ${prop}; } }`, 'x.css').length, 1, prop)
  }
})

test('transition: all, an unnamed property and transition-property: all are moving transitions', () => {
  assert.equal(checkCss('.a { transition: all 0.2s; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition: 0.2s; }', 'x.css').length, 1) // no property named: means all
  assert.equal(checkCss('.a { transition: 0.2s ease-in; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition-property: all; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition-property: color, all; }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`${NP} { .a { transition: all 0.2s; } }`, 'x.css'), [])
})

test('time-first transition syntax is read like any other order', () => {
  assert.equal(checkCss('.a { transition: 0.2s transform; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition: 0.2s ease-out 0.1s translate; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition: 0.2s cubic-bezier(0.2, 1, 0.3, 1) rotate, color 0.1s; }', 'x.css').length, 1)
  assert.deepEqual(checkCss('.a { transition: 0.2s color; }', 'x.css'), [])
  assert.deepEqual(transitionProperties('transition', '0.2s cubic-bezier(0.2, 1, 0.3, 1) opacity, color 1s'), ['opacity', 'color'])
})

test('a var() the checker cannot read counts as moving, but a var() easing or duration next to a named property does not', () => {
  assert.equal(checkCss('.a { animation: var(--x); }', 'x.css').length, 1)
  assert.equal(checkCss('.a { animation-name: var(--x); }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition: var(--t); }', 'x.css').length, 1)
  assert.equal(checkCss('.a { transition-property: var(--p); }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`${NP} { .a { animation: var(--x); transition: var(--t); } }`, 'x.css'), [])
  assert.deepEqual(checkCss('@keyframes f { to { opacity: 0; } }\n.a { animation: f var(--d) var(--ease) both; transition: opacity var(--d) var(--ease); }', 'x.css'), [])
})

test('keyframes defined in another file count (the moving names are collected over all files first)', () => {
  const defs = '@keyframes up { from { translate: 0 24px; } }'
  const uses = '.a { animation: up 1s both; }'
  assert.deepEqual(checkCss(uses, 'uses.css'), []) // alone, the checker cannot know `up` moves
  const moving = movingKeyframes(defs)
  assert.equal(checkCss(uses, 'uses.css', moving).length, 1)
  assert.deepEqual(checkCss(`${NP} { ${uses} }`, 'uses.css', moving), [])
})

test('@media not (...) never counts as no-preference or as reduce', () => {
  const kf = '@keyframes up { from { translate: 0 24px; } }'
  assert.equal(checkCss(`${kf}\n@media not (prefers-reduced-motion: reduce) { .a { animation: up 1s; } }`, 'x.css').length, 1)
  assert.equal(checkCss(`${kf}\n@media not (prefers-reduced-motion: no-preference) { .a { animation: up 1s; } }`, 'x.css').length, 1)
  assert.equal(checkCss(`${kf}\n@media not all and (prefers-reduced-motion: no-preference) { .a { transition: transform 1s; } }`, 'x.css').length, 1)
  // `not reduce` is not reduce: a long fade there is not limited to 300 ms
  assert.deepEqual(checkCss('@media not (prefers-reduced-motion: reduce) { .a { transition: opacity 2s; } }', 'x.css'), [])
})

test('a lone transition: none (or initial, inherit, unset) names no property', () => {
  for (const value of ['none', 'initial', 'inherit', 'unset', 'revert']) assert.deepEqual(checkCss(`.a { transition: ${value}; }`, 'x.css'), [], value)
  assert.deepEqual(transitionProperties('transition', 'none'), [])
  assert.deepEqual(transitionProperties('transition-property', 'none'), [])
  assert.equal(checkCss('.a { transition: none, transform 1s; }', 'x.css').length, 1)
})

test('!important is stripped before the value is read', () => {
  assert.equal(checkCss('.a { transition: transform 0.2s !important; }', 'x.css').length, 1)
  assert.equal(checkCss('@keyframes up { from { translate: 0 1px; } }\n.a { animation: up 1s !important; }', 'x.css').length, 1)
  assert.deepEqual(checkCss('.a { transition: color 0.2s ! important; }', 'x.css'), [])
  assert.equal(checkCss(`${RD} { .a { transition: opacity 0.5s !important; } }`, 'x.css').length, 1)
})

test('`not` negates a media query only as its first token', () => {
  const kf = '@keyframes up { from { translate: 0 24px; } }'
  assert.deepEqual(checkCss(`${kf}\n@media (prefers-reduced-motion: no-preference) and (not (pointer: coarse)) { .a { animation: up 1s; } }`, 'x.css'), [])
  assert.equal(checkCss(`${kf}\n@media (prefers-reduced-motion: reduce) and (not (pointer: coarse)) { .a { animation: up 1s; } }`, 'x.css').length, 3) // not no-preference, reduce, and 1 s over the limit
  assert.equal(checkCss(`${kf}\n@media not all and (prefers-reduced-motion: no-preference) { .a { animation: up 1s; } }`, 'x.css').length, 1)
})

test('a media list is no-preference only when every query is', () => {
  const kf = '@keyframes up { from { translate: 0 24px; } }'
  assert.equal(checkCss(`${kf}\n@media (prefers-reduced-motion: no-preference), print { .a { animation: up 1s; } }`, 'x.css').length, 1)
  assert.deepEqual(checkCss(`${kf}\n@media (prefers-reduced-motion: no-preference), (prefers-reduced-motion: no-preference) and (min-width: 1px) { .a { animation: up 1s; } }`, 'x.css'), [])
  // and a list with a reduce query is limited like reduce
  assert.equal(checkCss('@media (prefers-reduced-motion: reduce), print { .a { transition: opacity 2s; } }', 'x.css').length, 1)
})

test('more moving and layout properties: offset-*, background-position, perspective; margin*, inset*, right, bottom', () => {
  for (const prop of ['offset-distance: 10px', 'offset-path: none', 'background-position: 0 0', 'background-position-x: 1px', 'perspective: 100px', 'offset: none']) {
    assert.equal(checkCss(`@keyframes k { from { ${prop}; } }\n.a { animation: k 1s; }`, 'x.css').length, 1, prop)
  }
  for (const name of ['offset-distance', 'background-position', 'perspective']) {
    assert.equal(checkCss(`.a { transition: ${name} 1s; }`, 'x.css').length, 1, name)
    assert.deepEqual(checkCss(`${NP} { .a { transition: ${name} 1s; } }`, 'x.css'), [], name)
  }
  for (const prop of ['margin-top: 0', 'margin: 0', 'inset: 0', 'inset-inline: 0', 'right: 0', 'bottom: 0', 'padding-left: 1px']) {
    assert.equal(checkCss(`@keyframes k { from { ${prop}; } }`, 'x.css').length, 1, prop)
  }
})

test('vendor prefixes and letter case are read', () => {
  assert.equal(checkCss('.a { -webkit-transition: -webkit-transform 0.2s; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { TRANSITION: Transform 0.2s; }', 'x.css').length, 1)
  assert.equal(checkCss('@keyframes k { from { -webkit-transform: none; } }\n.a { -webkit-animation: k 1s; }', 'x.css').length, 1)
  assert.equal(checkCss('@KEYFRAMES k { FROM { TRANSLATE: 0 1px; } }\n.a { ANIMATION: k 1s; }', 'x.css').length, 1)
  assert.equal(checkCss('.a { animation: spin 1s INFINITE; }', 'x.css').length, 1)
  assert.equal(checkCss('@keyframes k { from { top: 0; } }', 'x.css').length, 1)
  assert.equal(checkCss('@-webkit-keyframes k { from { Width: 0; } }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`@MEDIA (PREFERS-REDUCED-MOTION: NO-PREFERENCE) { .a { transition: transform 1s; } }`, 'x.css'), [])
})

test('quoted keyframe names and calc() durations', () => {
  assert.equal(checkCss('@keyframes "up" { from { translate: 0 1px; } }\n.a { animation: "up" 1s; }', 'x.css').length, 1)
  assert.equal(checkCss('@keyframes up { from { translate: 0 1px; } }\n.a { animation-name: "up"; }', 'x.css').length, 1)
  assert.deepEqual(checkCss(`@keyframes "up" { from { translate: 0 1px; } }\n${NP} { .a { animation: "up" 1s; } }`, 'x.css'), [])
  // under reduce a calc() time cannot be checked
  assert.equal(checkCss(`${RD} { .a { transition: opacity calc(100ms * 4); } }`, 'x.css').length, 1)
  assert.equal(checkCss(`${RD} { .a { animation-duration: calc(2 * var(--d)); } }`, 'x.css').length, 1)
  assert.equal(checkCss(`${RD} { .a { transition-duration: var(--d); } }`, 'x.css').length, 1)
  assert.deepEqual(checkCss(`${RD} { .a { animation: halk both var(--ease) 200ms; } }`, 'x.css'), [])
})
