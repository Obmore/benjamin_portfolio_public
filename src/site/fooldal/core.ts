// @ts-nocheck
// The home page's motion core (ported from the approved direction-D prototype, core.js): animation clock, path tables,
// the work traces, the spine, the partner bus, the offers branch, the earth symbol and the scroll driver (the first screen's band and screen are nyito.ts).
// Pure signal functions are in jelalak.ts (shared with the build). The motion preference is read from the media query, never from a switch.
import { fmt, tempAt, nyomPontok, KESKENY_PX } from './jelalak.ts'
import { anim as animate, rc } from '../elemek/anim.ts'
var doc = document, root = doc.documentElement, NS = 'http://www.w3.org/2000/svg';
export var JL: any = {};
  /* ---------- helpers ---------- */
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  JL.reduced = function () { return reduceMq.matches; };
  function mk(tag, attrs, parent) {
    var e = doc.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(cs, name, d) { var v = parseFloat(cs.getPropertyValue(name)); return isNaN(v) ? d : v; }
  JL.clamp = clamp;

  /* ---------- easing family: circuit responses only ---------- */
  function pw(pts) {
    return function (t) {
      if (t <= 0) return 0; if (t >= 1) return 1;
      for (var i = 1; i < pts.length; i++) if (t <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
      return 1;
    };
  }
  var E = JL.E = {
    sweep: function (t) { return t; },
    rc: rc,
    ring: pw([[0, 0], [.15, .72], [.3, 1.16], [.45, 1.02], [.58, .95], [.75, 1.01], [1, 1]]),
  };
  /* One teardown: fail() aborts this controller. Every listener of the chunk outside the landmarks is added with its signal, every observer is disconnected
     from it, and every timer goes through JL.later, which the abort clears (and which does nothing once the chunk is dead). */
  JL.ac = new AbortController(); JL.sig = JL.ac.signal;
  var tms = [];
  JL.later = function (fn, ms) { var id = setTimeout(function () { var i = tms.indexOf(id); if (i > -1) tms.splice(i, 1); if (!JL.dead) fn(); }, ms); tms.push(id); return id; };
  JL.cancel = function (id) { clearTimeout(id); var i = tms.indexOf(id); if (i > -1) tms.splice(i, 1); };
  /* the hot head cools 400 ms after the last movement, over 300 ms rc (08 5.2 rule 1) */
  var HEAT_WAIT = 400, HEAT_COOL = 300;
  JL.sig.addEventListener('abort', function () { tms.forEach(clearTimeout); });
  JL.anim = function (dur, ease, onFrame, onDone, delay) {
    var a = null, to = 0, stopped = false;
    function start() { if (!stopped) a = animate(dur, ease, onFrame, onDone, function () { return !JL.dead; }); }   /* after fail() no step and no end callback runs */
    if (delay) to = JL.later(start, delay); else start();
    return { stop: function () { stopped = true; clearTimeout(to); if (a) a.stop(); } };
  };
  JL.narrow = function () { return window.innerWidth <= KESKENY_PX; };

  /* mode registry: every component re-evaluates when the motion switch moves */
  var modeHooks = [];
  JL.onMode = function (fn) { modeHooks.push(fn); };
  reduceMq.addEventListener('change', function () { modeHooks.forEach(function (f) { f(); }); }, { signal: JL.sig });
  /* a ResizeObserver that stops with the page: disconnected by the teardown */
  JL.ro = function (fn, el) {
    if (!('ResizeObserver' in window)) return null;
    var o = new ResizeObserver(function () { fn(); }); o.observe(el);
    JL.sig.addEventListener('abort', function () { o.disconnect(); });
    return o;
  };

  /* ---------- path tables: constant x-speed sweep along any path ---------- */
  function table(path, axis) {
    var L = path.getTotalLength(), n = Math.max(2, Math.ceil(L / 2)), v = new Float32Array(n + 1);
    for (var i = 0; i <= n; i++) { var p = path.getPointAtLength(L * i / n); v[i] = axis === 'y' ? p.y : p.x; }
    return { L: L, n: n, v: v };
  }
  function lenAt(tb, x) {
    if (x <= tb.v[0]) return 0; if (x >= tb.v[tb.n]) return tb.L;
    var lo = 0, hi = tb.n;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tb.v[m] <= x) lo = m; else hi = m; }
    return tb.L * lo / tb.n;
  }
  function setDash(path, tb, len) {
    path.style.strokeDasharray = tb.L + ' ' + (tb.L + 2);
    path.style.strokeDashoffset = tb.L - len;
    path.style.opacity = len > 0.6 ? 1 : 0;
  }
  /* empties an SVG and, when a size is given, sets its width and height */
  function reset(svg, w, h) { while (svg.firstChild) svg.removeChild(svg.firstChild); if (w != null) { svg.setAttribute('width', w); svg.setAttribute('height', h); } }
  function poly(pts) { var d = ''; for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1); return d; }

  /* =====================================================================
     TRACE  - one row's own curve (SVG, constant x-speed sweep with a dot)
     ===================================================================== */
  /* Rollin: charging voltage (V) against time, constant current up to the knee at 60 %, then constant voltage (a generic cell shape: no voltage figure is shown) */
  var CHG_KN = 0.6;
  function chargeV(t) { if (t >= CHG_KN) return 4.2; var u = t / CHG_KN; return 3.5 + 0.7 * (0.35 * (1 - Math.exp(-u / 0.04)) + 0.5 * u + 0.15 * Math.pow(u, 6)); }
  function geom(kind, o) {
    var lane = o.lane, cx = o.cx, W = o.W, H = o.H, x1 = cx + W, G = { segs: [], labels: [], tick: null, startY: H / 2, x1: x1, lane0: o.nostub ? cx : lane };
    function seg(pts, pen, nos) {
      var d = (o.nostub || nos) ? poly(pts) : 'M' + lane + ' ' + pts[0][1].toFixed(1) + 'H' + pts[0][0].toFixed(1) + poly(pts).replace(/^M[^L]*/, '');
      G.segs.push({ d: d, pen: pen });
      G.endY = pts[pts.length - 1][1];
    }
    var big = H > 80, i;
    if (kind !== 'charge') {
      var N = nyomPontok(kind, cx, W, H);
      seg(N.pts, 'r'); G.startY = N.startY; G.labels = N.labels;
    } else if (kind === 'charge') {
      var yA = big ? H - 20 : H - 12, yB = big ? 40 : 12, kn = CHG_KN, s1 = [], s2 = [], N2 = 90;
      var V = chargeV;
      var Y = function (v) { return lerp(yA, yB, (v - 3.45) / (4.25 - 3.45)); };
      for (i = 0; i <= N2; i++) { var t = i / N2; if (t <= kn) s1.push([cx + t * W, Y(V(t))]); }
      s1.push([cx + kn * W, Y(4.2)]);
      s2.push([cx + kn * W, Y(4.2)], [x1, Y(4.2)]);
      seg(s1, 'r'); seg(s2, 'r', true); G.startY = s1[0][1]; G.endY = Y(4.2); G.knee = { x: cx + kn * W, y: Y(4.2) };
    }
    G.tick = { x: x1, y: G.endY };
    return G;
  }

  /* A work's trace as one path in a w x h box with m clear left and right, for a screen that has no picture (08 5.5). The charge curve has its baseline at base * h and its plateau at top * h;
     the other four are the cable's own geometry. */
  JL.screenTrace = function (kind, w, h, m, base, top) {
    if (kind !== 'charge') return geom(kind, { lane: 0, cx: m, W: w - 2 * m, H: h, nostub: true }).segs.map(function (s) { return s.d; }).join('');
    var yB = h * base, yT = h * top, x0 = m, x1 = w - m, pts = [], i;
    for (i = 0; i <= 90; i++) { var t = i / 90; if (t <= CHG_KN) pts.push([x0 + t * (x1 - x0), lerp(yB, yT, (chargeV(t) - 3.5) / 0.7)]); }
    pts.push([x0 + CHG_KN * (x1 - x0), yT], [x1, yT]);
    return poly(pts);
  };

  JL.trace = function (box, spec) {
    var svg = mk('svg', { 'aria-hidden': 'true', class: 'tsvg' }, box), T = { box: box, p: 0, segs: [], G: null, dot: null };
    var readEl = box.querySelector('.reading');
    T.layout = function () {
      reset(svg);
      var cs = getComputedStyle(box), bw = box.clientWidth, H = num(cs, '--th', 112);
      var lane = num(cs, '--lane-c', 0), cx = num(cs, '--cx', 0), lw = num(cs, '--lw', 4);
      if (spec.nostub) { cx = 16; }
      var W = bw - cx - (spec.nostub ? 16 : 6);
      svg.setAttribute('width', bw); svg.setAttribute('height', H);
      var gk = spec.kind === 'terv' ? 'qr' : spec.kind;   /* the planned slot: no trace enters it, the cable keeps the geometry of a trace that ends on the baseline */
      var G = T.G = geom(gk, { lane: lane, cx: cx, W: W, H: H, nostub: spec.nostub });
      if (JL.laneShift && !spec.nostub) { var dx = JL.laneShift(box, G.startY); if (dx) { lane += dx; G = T.G = geom(gk, { lane: lane, cx: cx, W: W, H: H, nostub: spec.nostub }); } }
      if (spec.kind === 'terv') { G.segs = []; G.labels = []; G.tick = null; G.knee = null; }
      T.startY = G.startY; T.segs = [];
      G.segs.forEach(function (s) {
        var p = mk('path', { d: s.d, class: 'ln pen-' + s.pen }, svg);
        T.segs.push({ el: p, tb: table(p, 'x'), pen: s.pen, hot: JL.heat(svg, p) });
      });
      if (G.tick) T.tickEl = mk('path', { d: 'M' + G.tick.x.toFixed(1) + ' ' + (G.tick.y - 6).toFixed(1) + 'V' + (G.tick.y + 6).toFixed(1), class: 'tick', style: 'transition:opacity 120ms linear' }, svg);
      if (readEl) readEl.style.transition = 'opacity 120ms linear';
      if (readEl && G.tick) { readEl.style.right = (bw - G.tick.x) + 'px'; readEl.style.top = (G.tick.y - 32) + 'px'; }
      /* labels about 47 px wide: when neighbours are closer than 56 px apart they alternate between two rows (never overlapping) */
      var tight = false; for (var q = 1; q < G.labels.length; q++) if (G.labels[q].x - G.labels[q - 1].x < 56) tight = true;
      G.labels.forEach(function (l) { if (tight && l.i % 2) l.y -= 18; var t = mk('text', { x: l.x, y: l.y, 'text-anchor': 'middle', class: 'lbl' }, svg); t.textContent = l.t; });
      if (G.knee) T.kneeEl = mk('circle', { cx: G.knee.x, cy: G.knee.y, r: 5, class: 'tapn on' }, svg);
      T.dot = mk('circle', { r: lw * 1.75, class: 'dotc', cx: -20, cy: -20 }, svg);
      T.setP(T.p);
    };
    T.placeDot = function (xs, show) {
      var dotSet = false;
      T.segs.forEach(function (sg, i) {
        if (dotSet) return;
        var len = lenAt(sg.tb, xs);
        if (len < sg.tb.L - 0.5 || i === T.segs.length - 1) {
          var pt = sg.el.getPointAtLength(Math.max(0.01, len));
          T.dot.setAttribute('cx', pt.x); T.dot.setAttribute('cy', pt.y);
          T.dot.setAttribute('class', 'dotc' + (sg.pen === 'b' ? ' blue' : ''));
          dotSet = true;
        }
      });
      T.dot.style.opacity = show && !spec.noDot ? 1 : 0;
    };
    T.setP = function (p) {
      p = clamp(p, 0, 1); T.p = p;
      var G = T.G, xs = G.lane0 + p * (G.x1 - G.lane0);
      T.segs.forEach(function (sg) { var ln = lenAt(sg.tb, xs); setDash(sg.el, sg.tb, ln); JL.heatSet(sg.hot, sg.tb.L, ln, 0, p); });
      T.placeDot(xs, p > 0.002 && p < 0.998);
      /* the tick and the reading arrive with the head of the trace; in the reduced form they are simply present */
      var arrived = p >= 0.998;   /* the reduced form plays the trace in 300 ms, so reading and tick still arrive with it */
      if (T.tickEl) T.tickEl.style.opacity = arrived ? 1 : 0;
      if (T.kneeEl) T.kneeEl.style.opacity = (JL.reduced() || xs >= G.knee.x) ? 1 : 0;
      if (readEl) readEl.style.opacity = arrived ? 1 : 0;
      if (spec.kind === 'temp' && readEl) readEl.textContent = fmt(tempAt(Math.floor(p * 16) / 16)) + ' °C';
      return xs;
    };
    T.xs = function () { var G = T.G; return G.lane0 + T.p * (G.x1 - G.lane0); };
    T.svg = svg; T.destroy = function () { if (svg.parentNode) svg.parentNode.removeChild(svg); };
    T.layout();
    return T;
  };

  /* =====================================================================
     SPINE - the line down the whole page
     ===================================================================== */
  /* the sampled spine: one step every 48 px, each step's sideways offset read from a slow sine (period 384 px, amplitude 12 px) */
  var STEP = 48;
  JL.stairOff = function (y, from, to) {
    if (from == null || y < from || y >= to) return 0;
    var i = Math.floor((y - from) / STEP);
    return 12 * Math.sin(2 * Math.PI * (from + i * STEP + STEP / 2) / 384);
  };
  JL.spine = function (host) {
    var svg = mk('svg', { 'aria-hidden': 'true', class: 'spine-svg' }, host), S = { head: 0, loadK: 1, tb: null, ys: null };
    S.build = function (ys) {
      S.ys = ys;
      var h = host.clientHeight; reset(svg, host.clientWidth, h);
      var x0 = ys.x0, pts = [[x0, ys.top]], y;
      if (ys.stepFrom != null) {
        pts.push([x0, ys.stepFrom]);
        for (y = ys.stepFrom; y < ys.stepTo; y += STEP) {
          var dx = JL.stairOff(y, ys.stepFrom, ys.stepTo), y2 = Math.min(y + STEP, ys.stepTo);
          pts.push([x0 + dx, y], [x0 + dx, y2]);
        }
        pts.push([x0, ys.stepTo], [x0, ys.end]);
      } else pts.push([x0, ys.end]);
      S.path = mk('path', { d: poly(pts), class: 'ln pen-r' }, svg);
      S.tb = table(S.path, 'y'); S.hot = JL.heat(svg, S.path);
      S.nodes = ys.taps.map(function (t) { return { y: t, el: mk('circle', { cx: x0 + JL.stairOff(t, ys.stepFrom, ys.stepTo), cy: t, r: 5, class: 'tapn' }, svg) }; });
      S.headn = mk('circle', { r: num(getComputedStyle(root), '--lw', 4) * 2, class: 'headn', cx: x0, cy: ys.top }, svg);
      S.draw();
    };
    S.setHead = function (y) { S.head = y; S.draw(); };
    S.draw = function () {
      if (!S.tb) return;
      var red = JL.reduced(), yh = red ? S.ys.end : S.head, len = lenAt(S.tb, yh) * S.loadK;
      setDash(S.path, S.tb, len); JL.heatSet(S.hot, S.tb.L, len, JL.narrow() ? 120 : 240, window.scrollY + '|' + S.loadK);   /* the spine's head: 120 px on a phone, 240 px from 727 */
      var pt = S.path.getPointAtLength(Math.max(0.01, len));
      S.headn.setAttribute('cx', pt.x); S.headn.setAttribute('cy', pt.y);
      S.headn.style.opacity = red ? 0 : (len > 1 && len < S.tb.L - 1 ? 1 : 0);   /* the head node disappears into the earth symbol */
      var yReach = red ? yh : pt.y;
      S.nodes.forEach(function (n) { n.el.classList.toggle('on', yReach >= n.y - 0.5); });
    };
    S.setLoad = function (k) { S.loadK = k; S.draw(); };
    return S;
  };

  /* =====================================================================
     BUS - master polling four stations
     ===================================================================== */
  JL.bus = function (box) {
    var svg = mk('svg', { 'aria-hidden': 'true', class: 'bus-svg' }, box), B = { st: 'idle', anims: [], tm: [] }, slots = box.querySelectorAll('.slot');
    var BY = 26, DROP = 40, FW = 12, bits = [1, 0, 1, 1, 0, 0, 1, 0];
    function stopAll() { B.anims.forEach(function (a) { a.stop(); }); B.anims = []; B.tm.forEach(clearTimeout); B.tm = []; (B.cool || []).forEach(clearTimeout); B.cool = []; }
    function later(fn, ms) { B.tm.push(JL.later(fn, ms)); }
    B.layout = function () {
      var cs = getComputedStyle(box), lane = num(cs, '--lane-c', 0), cx = num(cs, '--cx', 0), bw = box.clientWidth, bh = box.clientHeight, br = box.getBoundingClientRect();
      /* the geometry this layout would draw: a layout that changes nothing leaves a running answer alone (no restart, so no loop) */
      var sig = [bw, bh, lane, cx].concat([].map.call(slots, function (sl) { var q = sl.getBoundingClientRect(); return (q.left - br.left).toFixed(1) + ',' + (q.top - br.top).toFixed(1); })).join('|');
      if (B.st === 'run' && sig === B.sig) return;
      B.sig = sig;
      reset(svg, bw, bh);
      var vert = JL.narrow(box) && !box.hasAttribute('data-h');
      B.vert = vert; B.lane = lane; B.taps = []; B.nodes = [];
      for (var i = 0; i < slots.length; i++) {
        var r = slots[i].getBoundingClientRect();
        if (vert) { var ty = r.top - br.top + r.height / 2; B.taps.push({ pos: ty, d: 'M' + lane + ' ' + ty.toFixed(1) + 'H' + (cx + 8), nx: cx + 8, ny: ty }); }
        else { var tx = r.left - br.left + r.width / 2; B.taps.push({ pos: tx, d: 'M' + tx.toFixed(1) + ' ' + BY + 'V' + (BY + DROP), nx: tx, ny: BY + DROP }); }
      }
      B.span0 = vert ? 0 : lane; B.span1 = vert ? bh : bw;
      if (vert) { B.bus = null; }
      else { B.bus = mk('path', { d: 'M' + lane + ' ' + BY + 'H' + bw, class: 'ln pen-r' }, svg); B.busTb = table(B.bus, 'x'); B.busHot = JL.heat(svg, B.bus); }
      B.drops = B.taps.map(function (t) { var p = mk('path', { d: t.d, class: 'ln pen-r' }, svg); return { el: p, L: p.getTotalLength() }; });
      B.nodes = B.taps.map(function (t) { return mk('circle', { cx: t.nx, cy: t.ny, r: 5, class: 'tapn on', style: 'fill:var(--jel)' }, svg); });
      if (vert) {
        /* the phone poll is a 48 px hot stretch of the spine itself (08 5.11): the same line in --jel-forro, no glyph, nothing outside the line's width */
        B.frame = mk('path', { d: 'M0 0V48', class: 'ln', style: 'stroke:var(--jel-forro)', transform: 'translate(-200 -200)' }, svg); B.frameW = 48;
      } else {
        var pt = [], x = 0;
        bits.forEach(function (b2, i2) { var y = b2 ? -9 : 9; if (i2 === 0) pt.push([0, y]); else if (y !== pt[pt.length - 1][1]) pt.push([x, pt[pt.length - 1][1]], [x, y]); x += FW; });
        pt.push([x, pt[pt.length - 1][1]]);
        var gid = 'jlg' + (++JL.gid), gr = mk('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: x, y2: 0 }, svg);
        mk('stop', { offset: 0, style: 'stop-color:var(--jel)' }, gr); mk('stop', { offset: 1, style: 'stop-color:var(--jel-forro)' }, gr);
        B.frame = mk('path', { d: poly(pt), class: 'ln', style: 'stroke:url(#' + gid + ')', transform: 'translate(-200 -200)' }, svg); B.frameW = x;
      }
      /* a layout that moved things while the bus is answering (the first resize frames after load, a resize) must not cancel the run and leave the slots waiting:
         the run starts again on the new geometry; a poll in flight ends complete */
      if (B.st === 'idle') B.reset(); else if (B.st === 'run') B.enter(); else B.finish();
    };
    function dropP(i, e) { var d = B.drops[i]; d.el.style.strokeDasharray = d.L + ' ' + (d.L + 2); d.el.style.strokeDashoffset = d.L * (1 - e); d.el.style.opacity = e > 0.01 ? 1 : 0; B.nodes[i].style.opacity = e > 0.98 ? 1 : 0; }
    function busP(e) { if (B.bus) { setDash(B.bus, B.busTb, B.busTb.L * e); JL.heatSet(B.busHot, B.busTb.L, B.busTb.L * e, 0, e); } }
    function frameAt(pos) {
      if (pos < -100) { B.frame.style.opacity = 0; if (B.vert) { B.frame.style.transition = 'none'; B.frame.style.stroke = 'var(--jel-forro)'; } return; }
      B.frame.setAttribute('transform', B.vert ? 'translate(' + B.lane + ' ' + (pos - B.frameW) + ')' : 'translate(' + (pos - B.frameW) + ' ' + BY + ')');
      B.frame.style.opacity = pos > B.span0 + 2 ? 1 : 0;
    }
    /* the end of a poll: the horizontal frame leaves; the phone's hot stretch stays on the spine, then cools into --jel (400 ms wait, 300 ms rc) and goes */
    function frameEnd() {
      if (!B.vert) { frameAt(-200); return; }
      var f = B.frame; if (!f) return;
      B.cool = [JL.later(function () { if (f !== B.frame) return; f.style.transition = 'stroke 300ms var(--rc)'; f.style.stroke = 'var(--jel)'; B.cool.push(JL.later(function () { frameAt(-200); }, 320)); }, 400)];
    }
    /* a new poll or run takes the stretch back from a cool-down still in flight */
    function frameStop() { (B.cool || []).forEach(clearTimeout); B.cool = []; if (B.vert && B.frame) frameAt(-200); }   /* off the old position first, then recoloured (frameAt) */
    B.reset = function () {
      stopAll(); B.st = 'idle'; busP(0);
      for (var i = 0; i < slots.length; i++) { dropP(i, 0); slots[i].classList.add('q'); }
      frameAt(-200);
    };
    B.finish = function () { stopAll(); B.st = 'done'; busP(1); for (var i = 0; i < slots.length; i++) { dropP(i, 1); slots[i].classList.remove('q'); } frameAt(-200); };
    function answer(i) {
      B.anims.push(JL.anim(JL.reduced() ? 200 : 240, JL.reduced() ? E.sweep : E.rc, function (e) { dropP(i, e); }, function () { slots[i].classList.remove('q'); }));
    }
    B.enter = function () {
      B.reset(); B.st = 'run';
      if (JL.reduced()) {   /* drop lines draw one after another, no travelling frame */
        B.anims.push(JL.anim(250, E.sweep, busP));
        for (var i = 0; i < slots.length; i++) (function (k) { B.anims.push(JL.anim(200, E.sweep, function (e) { dropP(k, e); }, function () { slots[k].classList.remove('q'); }, 250 + k * 200)); })(i);
        later(function () { B.st = 'done'; }, 1100);
        return;
      }
      var travel = 1900, span = B.span1 - B.span0, fired = [];
      B.anims.push(JL.anim(250, E.sweep, busP));
      B.anims.push(JL.anim(travel, E.sweep, function (e) {
        var x = B.span0 + e * span; frameAt(x);
        B.taps.forEach(function (t, i) { if (!fired[i] && x >= t.pos) { fired[i] = true; answer(i); } });
      }, function () { frameEnd(); later(function () { B.st = 'done'; }, 480); }, 250));
    };
    B.poll = function (i) {
      if (B.st !== 'done' || JL.reduced()) return;
      B.st = 'poll'; frameStop(); var t = B.taps[i], span = B.span1 - B.span0;
      slots[i].classList.add('q'); dropP(i, 0);
      var dur = (t.pos - B.span0) / span * 1900;
      B.anims.push(JL.anim(dur, E.sweep, function (e) { frameAt(B.span0 + e * (t.pos - B.span0)); }, function () { frameEnd(); answer(i); later(function () { B.st = 'done'; }, 260); }));
    };
    for (var i = 0; i < slots.length; i++) (function (k) {
      slots[k].addEventListener('pointerenter', function () { B.poll(k); });
    })(i);
    B.layout();
    JL.ro(function () { B.layout(); }, box);
    return B;
  };

  /* =====================================================================
     OFFERS - one branch line ending in a terminal
     ===================================================================== */
  JL.offers = function (box) {
    var svg = mk('svg', { 'aria-hidden': 'true', class: 'off-svg' }, box), O = { a: null };
    var YB = 22;
    O.layout = function () {
      reset(svg, box.clientWidth, box.clientHeight);
      var cs = getComputedStyle(box), lane = num(cs, '--lane-c', 0), cx = num(cs, '--cx', 0);
      var nx = cx + 6;
      O.ytap = YB;
      O.path = mk('path', { d: 'M' + lane + ' ' + YB + 'H' + nx, class: 'ln pen-r' }, svg); O.tb = table(O.path, 'x'); O.hot = JL.heat(svg, O.path);
      O.node = mk('circle', { cx: nx + 4, cy: YB, r: 8, class: 'term', style: 'fill:var(--jel);transform-box:fill-box;transform-origin:center' }, svg);
      O.apply(O.p == null ? 1 : O.p, O.n == null ? 1 : O.n);
    };
    O.apply = function (p, n) { O.p = p; O.n = n; setDash(O.path, O.tb, O.tb.L * p); JL.heatSet(O.hot, O.tb.L, O.tb.L * p, 0, p); O.node.style.transform = 'scale(' + n + ')'; O.node.style.opacity = n > 0.02 ? 1 : 0; };
    O.reset = function () { if (O.a) O.a.stop(); O.apply(0, 0); };
    O.finish = function () { if (O.a) O.a.stop(); O.apply(1, 1); };
    O.enter = function () {
      O.reset();
      if (JL.reduced()) { O.a = JL.anim(300, E.sweep, function (e) { O.apply(e, e); }); return; }
      O.a = JL.anim(400, E.sweep, function (e) { O.apply(e, 0); }, function () { O.a = JL.anim(240, E.rc, function (e) { O.apply(1, e); }); });
    };
    O.layout();
    JL.ro(function () { O.layout(); }, box);
    return O;
  };

  /* =====================================================================
     EARTH - the page ends where a circuit ends
     ===================================================================== */
  JL.earth = function (box) {
    var svg = mk('svg', { 'aria-hidden': 'true', class: 'earth-svg' }, box), Ea = { a: [] };
    Ea.layout = function () {
      reset(svg);
      /* the bars are centred on the spine's actual x (the lane column is 32 px on a phone and a twelfth of the page on a wide one), and their sizes
         follow the layout switch, not the width of this box */
      var ph = JL.narrow(), s = ph ? 0.78 : 1, W3 = ph ? [28, 18, 8] : [64, 40, 16];
      var lane = JL.laneAbs ? JL.laneAbs() - box.getBoundingClientRect().left : num(getComputedStyle(box), '--lane-c', 0);
      svg.setAttribute('width', box.clientWidth); svg.setAttribute('height', box.clientHeight);
      Ea.bars = [[W3[0], 8], [W3[1], 24], [W3[2], 40]].map(function (b) {
        var w = b[0], y = b[1] * s + 8, p = mk('path', { d: 'M' + (lane - w / 2) + ' ' + y + 'H' + (lane + w / 2), class: 'ln pen-r' }, svg);
        return { el: p, tb: table(p, 'x') };
      });
      Ea.stemLen = 8 * s + 8;
      Ea.apply(Ea.k == null ? 1 : Ea.k);
    };
    Ea.apply = function (k) { Ea.k = k; Ea.bars.forEach(function (b, i) { var e = clamp(k * 3 - i, 0, 1); setDash(b.el, b.tb, b.tb.L * e); }); };
    Ea.reset = function () { Ea.a.forEach(function (x) { x.stop(); }); Ea.a = []; Ea.apply(0); };
    Ea.finish = function () { Ea.a.forEach(function (x) { x.stop(); }); Ea.a = []; Ea.apply(1); };
    Ea.enter = function () { Ea.reset(); Ea.a.push(JL.anim(270, E.sweep, Ea.apply)); };   /* 3 x 90 ms, longest first; same in both forms */
    Ea.layout();
    JL.ro(function () { Ea.layout(); }, box);
    return Ea;
  };

  /* =====================================================================
     DRIVER - scroll-linked scrub and scroll-triggered once
     ===================================================================== */
  var W = [], tickQ = 0;
  JL.watch = function (comp, ref, kind, a, b) { var w = { comp: comp, ref: ref, kind: kind, a: a, b: b, entered: false, lastP: null }; W.push(w); return w; };
  JL.evalAll = function () {
    var vh = window.innerHeight, red = JL.reduced();
    W.forEach(function (w) {
      var r = w.ref.getBoundingClientRect();
      if (w.kind === 'scrub') {
        if (w.gate && !w.gate()) { if (!red && w.comp.override == null && w.lastP !== 0) { w.lastP = 0; w.comp.setP(0); } return; }
        if (red) {
          if (!w.entered && r.top < vh * 0.92) { w.entered = true; if (r.bottom < 0) w.comp.finish(); else w.comp.playReduced(); }
          else if (!w.entered && r.top > vh) { w.entered = true; w.comp.finish(); }   /* below the fold: drawn, never half drawn (a cable end with no line) */
        }
        else if (w.comp.override == null) {
          var p = clamp((vh * w.a - r.top) / (vh * (w.a - w.b) + (w.len ? w.len() : 0)), 0, 1);
          if (p !== w.lastP) { w.lastP = p; w.comp.setP(p); }
        }
      } else if (!w.entered) {
        if (r.top < vh * w.a && (!w.gate || w.gate())) { w.entered = true; if (r.bottom < 0) w.comp.finish(); else w.comp.enter(); }
        else if (red && r.top > vh && (!w.gate || w.gate())) { w.entered = true; w.comp.finish(); }   /* reduced motion: what is below the fold is simply drawn, so a full-page still never shows an unanswered bus (08 5.11) */
      }
    });
  };
  JL.resetWatch = function (comps) { W.forEach(function (w) { if (!comps || comps.indexOf(w.comp) > -1) { w.entered = false; w.lastP = null; } }); };
  JL.tickReq = function () { if (!tickQ) tickQ = requestAnimationFrame(function () { tickQ = 0; if (JL.dead) return; if (JL.onScrollTick) JL.onScrollTick(); JL.evalAll(); }); };
  window.addEventListener('scroll', JL.tickReq, { passive: true, signal: JL.sig });
  window.addEventListener('resize', JL.tickReq, { signal: JL.sig });
  JL.sig.addEventListener('abort', function () { cancelAnimationFrame(tickQ); tickQ = 0; });

  JL.gid = 0;
  /* The hot head (08 5.2): the stretch of a line directly behind its moving end, `head` px long (default min(240, a quarter of the run)). It exists only while the end moves:
     400 ms after the last movement it cools into --jel over 300 ms rc. Reduced motion: never drawn. The first call of an overlay only records where the line is. */
  JL.heat = function (host, path) { var o = [], d = path.getAttribute('d'), i; for (i = 0; i < 12; i++) { var p = mk('path', { d: d, class: 'ln heat' }, host); p.style.stroke = 'color-mix(in oklch, var(--jel-forro) ' + Math.round((i + 1) / 12 * 100) + '%, var(--jel))'; o.push(p); } o.k = 0; return o; };
  function heatPaint(ov) {
    var n = ov.length, hl = ov.head, seg = hl / n, len = ov.len, L = ov.L, i;
    for (i = 0; i < n; i++) {
      var p = ov[i], s = len - hl + i * seg, e = s + seg;
      if (JL.reduced() || ov.k <= 0 || len >= L - 0.5 || len < 2 || e <= 0) { p.style.opacity = 0; continue; }
      s = Math.max(0, s); e = Math.min(len, e); if (e <= s) { p.style.opacity = 0; continue; }
      p.style.opacity = ov.k; p.style.strokeDasharray = (e - s) + ' ' + (L * 3); p.style.strokeDashoffset = -s;
    }
  }
  /* `key` is the progress that moves the end (a scroll position, a draw fraction): only a change of it counts as movement, never a change of geometry (a resize rebuilds lengths) */
  JL.heatSet = function (ov, L, len, head, key) {
    if (!ov) return;
    if (key === undefined) key = len;
    var moved = ov.key !== undefined && ov.key !== key;
    ov.key = key; ov.len = len; ov.L = L; ov.head = head || Math.min(240, L * 0.25);
    if (len < 2) { JL.cancel(ov.tm); if (ov.cool) { ov.cool.stop(); ov.cool = null; } ov.k = 0; }
    else if (moved && !JL.reduced()) {
      ov.k = 1; if (ov.cool) { ov.cool.stop(); ov.cool = null; } JL.cancel(ov.tm);
      ov.tm = JL.later(function () { ov.cool = JL.anim(HEAT_COOL, E.rc, function (e) { ov.k = 1 - e; heatPaint(ov); }, function () { ov.k = 0; ov.cool = null; heatPaint(ov); }); }, HEAT_WAIT);
    }
    heatPaint(ov);
  };
  JL.mkEl = mk;
  JL.table = table; JL.setDash = setDash;
