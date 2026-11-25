// @ts-nocheck
// Drawing parts and the one device of the first screen, ported from the approved direction-D prototype (art.js).
// Everything is drawn from the shared parts (screw, lamp, legend, key) and one module width M: straight front view, two outlines,
// no shadow. Pure string builders (they run at build time in render.tsx).
  var Art: any = {};
  function n(v) { return Math.round(v * 100) / 100; }
  function at(o) { var s = ''; for (var k in o) { if (o[k] !== undefined && o[k] !== null && o[k] !== false) s += ' ' + k + '="' + o[k] + '"'; } return s; }
  function E(t, o, i) { return '<' + t + at(o) + '>' + (i || '') + '</' + t + '>'; }
  function V(t, o) { return '<' + t + at(o) + '/>'; }
  Art.svg = function (W, H, inner, cls, extra) {
    return '<svg class="' + (cls || '') + '" xmlns="http://www.w3.org/2000/svg" width="' + n(W) + '" height="' + n(H) + '" viewBox="0 0 ' + n(W) + ' ' + n(H) + '" aria-hidden="true" focusable="false"' + (extra || '') + '>' + inner + '</svg>';
  };

  /* ---- shared parts ---- */
  function screw(cx, cy, r, rot) {
    rot = rot == null ? 35 : rot; var d = r * 0.74;
    return '<g class="scr">' + V('circle', { cx: n(cx), cy: n(cy), r: n(r), pathLength: 1 }) +
      V('line', { x1: n(cx - d), y1: n(cy), x2: n(cx + d), y2: n(cy), pathLength: 1, transform: 'rotate(' + rot + ' ' + n(cx) + ' ' + n(cy) + ')' }) + '</g>';
  }
  function lamp(id, cx, cy, r, col) {
    return '<g class="lmp" data-l="' + id + '" data-c="' + col + '">' + V('circle', { class: 'lo', cx: n(cx), cy: n(cy), r: n(r) }) + V('circle', { class: 'ln', cx: n(cx), cy: n(cy), r: n(r) }) + '</g>';
  }
  function legend(x, y, wd, h, txt, cls) {
    return V('rect', { class: 'leg', x: n(x), y: n(y), width: n(wd), height: n(h), rx: 2 }) +
      E('text', { class: 'legt ' + (cls || ''), x: n(x + wd / 2), y: n(y + h / 2), dy: '.34em' }, txt);
  }
  function lt(txt, x, y, cls) { return E('text', { class: 'lt ' + (cls || ''), x: n(x), y: n(y) }, txt); }
  function body(wd, h) { return V('rect', { class: 'bd', x: .75, y: .75, width: n(wd - 1.5), height: n(h - 1.5), rx: 3 }); }
  function key(x, y, wd, h) {
    return '<g class="key">' + V('rect', { class: 'k0', x: n(x), y: n(y), width: n(wd), height: n(h), rx: 3 }) + V('rect', { class: 'k1', x: n(x + 3), y: n(y + 3), width: n(wd - 6), height: n(h - 6), rx: 2 }) + '</g>';
  }

  /* ---- wires ---- */
  Art.pathRound = function (p, r) {
    var d = 'M' + n(p[0][0]) + ' ' + n(p[0][1]);
    for (var i = 1; i < p.length - 1; i++) {
      var a = p[i - 1], b = p[i], c = p[i + 1];
      var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      d += ' L' + n(b[0] - (b[0] - a[0]) / l1 * rr) + ' ' + n(b[1] - (b[1] - a[1]) / l1 * rr) + ' Q' + n(b[0]) + ' ' + n(b[1]) + ' ' + n(b[0] + (c[0] - b[0]) / l2 * rr) + ' ' + n(b[1] + (c[1] - b[1]) / l2 * rr);
    }
    var z = p[p.length - 1]; return d + ' L' + n(z[0]) + ' ' + n(z[1]);
  };

  /* ---- the one device of the first screen: the BUSZ-3 bus module (the Gépadat pair's source) ---- */
  Art.devGep = function (M, T, bare) {
    var W = 3 * M, H = 5 * M, o = body(W, H), i;
    for (i = 0; i < 3; i++) o += screw((i + .5) * M, .5 * M, .27 * M, [20, 55, 35][i]);
    o += legend(.3 * M, 1.05 * M, 2.4 * M, .55 * M, T.legenda);
    o += lamp('kerd', .85 * M, 2.15 * M, .2 * M, 'z') + lamp('val', 2.15 * M, 2.15 * M, .2 * M, 'z');
    /* `bare` (the phone size): the plate, the two lamps, the key and the screws, but no engraving small enough to run into each other (no lamp legends, no type) */
    if (!bare) o += lt(T.kerdes, .85 * M, 2.15 * M + .2 * M + .4 * M) + lt(T.valasz, 2.15 * M, 2.15 * M + .2 * M + .4 * M);
    o += key(.6 * M, 3.3 * M, 1.8 * M, .45 * M) + (bare ? '' : lt(T.tipus, W / 2, 4.05 * M));
    o += V('rect', { class: 'bi', x: n(.45 * M), y: n(4.15 * M), width: n(2.1 * M), height: n(.78 * M), rx: 2 });
    o += screw(1 * M, 4.54 * M, .26 * M, 70) + screw(2 * M, 4.54 * M, .26 * M, 15);
    return { w: W, h: H, svg: Art.svg(W, H, o, 'dv') };
  };
  Art.n = n; Art.E = E; Art.V = V;
export { Art }
