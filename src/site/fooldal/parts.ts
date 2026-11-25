// @ts-nocheck
// The home page's instruments (ported from the approved prototype, parts.js): the controller and the cable run.
// The controller is drawn in the HTML at build time; this only moves it. The first screen is nyito.ts.
import { Art } from './art.ts'
import { JL } from './core.ts'
import { JEL } from '@/content/fooldal'
var E = JL.E, clamp = JL.clamp, mk = JL.mkEl;
  function $(r, s) { return r.querySelector(s); }
  function $$(r, s) { return [].slice.call(r.querySelectorAll(s)); }
  function reflow(el) { void el.offsetWidth; }

  /* ======================= CONTROLLER: the one dimetric figure, opened along the scroll axis ======================= */
  var WORKS = [];
  JL.WORKS = WORKS;
  var IMG = '/work/';
  JL.ctrl = function (fig, info) {
    var C = { ex: 1, sel: -1, info: info }, zk = info.zk, P = {}, circ = null, circA = null, drawn = false;
    info.parts.forEach(function (p) { P[p.no] = p; p.el = $(fig, '.cp[data-p="' + p.n + '"]'); });
    var SCL = 24 * zk;                           /* screw lift (24 mm) in px */
    fig.style.setProperty('--lift-sc', (-SCL).toFixed(1) + 'px');
    fig.style.setProperty('--turn', Math.round(SCL / 6 * 360) + 'deg');   /* one turn per 6 px of lift */
    C.setEx = function (e) {
      e = clamp(e, 0, 1); C.ex = e;
      var s = clamp(e / 0.4, 0, 1), q = clamp((e - 0.3) / 0.7, 0, 1);
      fig.style.setProperty('--sx', s.toFixed(4));
      var op = e >= 0.5 ? 'true' : 'false'; if (fig.getAttribute('data-open') !== op) fig.setAttribute('data-open', op);   /* the exploded state under a neutral name: a page-wide key can set it later */
      for (var n in P) { var p = P[n]; p.q = q; p.el.style.transform = 'translateY(' + ((1 - q) * p.L * zk).toFixed(2) + 'px)'; }
      $$(fig, '.ht').forEach(function (h) {
        var from = P[h.closest('.cp').getAttribute('data-n')], prev = P[h.getAttribute('data-prev')], zt = +h.getAttribute('data-zt');
        var oy = from.oy + (1 - q) * from.L * zk, py = prev.oy + (1 - q) * prev.L * zk;
        h.style.setProperty('--Lr', Math.max((oy - zt * zk) - (py - prev.zb * zk), 0.0001).toFixed(2));
      });
      if (circ) {
        if (e > 0.96 && !drawn) { drawn = true; C.drawCircle(); }
        if (e < 0.3 && drawn) { drawn = false; C.undrawCircle(); }
      }
    };
    C.circleEl = function () { return $(fig, '.dcirc'); };
    C.drawCircle = function () {
      var c = C.circleEl(); if (!c) return; if (circA) circA.stop();
      var d = JL.reduced() ? 300 : 400;
      circA = JL.anim(d, E.sweep, function (e) { c.style.strokeDashoffset = (1 - e).toFixed(4); if (C.onCircle) C.onCircle(e); });
    };
    C.undrawCircle = function () { var c = C.circleEl(); if (circA) circA.stop(); if (c) c.style.strokeDashoffset = 1.02; if (C.onCircle) C.onCircle(0); };
    circ = C.circleEl(); if (circ) { circ.style.strokeDasharray = '1 1'; circ.style.strokeDashoffset = 1.02; }
    /* the work shown on both little screens (cover window and display module) */
    C.show = function (i, animate) {
      var w = WORKS[i]; C.sel = i;
      $$(fig, '.key').forEach(function (k) { k.classList.toggle('sel', +k.getAttribute('data-k') === i); });
      $$(fig, '.lcd-img').forEach(function (im) {
        im.setAttribute('href', w.img ? IMG + w.img : ''); var g = im.parentNode; im.style.display = w.img ? '' : 'none';
        if (w.kind === 'terv') { var t0 = $(g, '.lcd-tr'); if (t0) t0.style.display = 'none'; if (animate) { g.classList.remove('lcd-redraw'); reflow(g.ownerSVGElement || g); g.classList.add('lcd-redraw'); } return; }   /* the planned slot: the screen keeps its face and shows nothing */
        /* a work without a picture: the screen keeps its face and shows the work's own trace (08 5.5), drawn in the screen's plane (ten units per mm, a constant-width stroke) */
        var tr = $(g, '.lcd-tr') || mk('path', { class: 'lcd-tr' }, g), iw = +im.getAttribute('width') * 10, ih = +im.getAttribute('height') * 10, tf = im.getAttribute('transform');
        tr.style.display = w.img || !tf ? 'none' : '';
        if (!w.img && tf && (tr.getAttribute('data-kind') !== w.kind || tr.getAttribute('transform') !== tf + ' scale(0.1)')) { tr.setAttribute('transform', tf + ' scale(0.1)'); tr.setAttribute('data-kind', w.kind); tr.setAttribute('d', JL.screenTrace(w.kind, iw, ih, 30, 0.66, 0.22)); }
        if (animate) { g.classList.remove('lcd-redraw'); reflow(g.ownerSVGElement || g); g.classList.add('lcd-redraw'); }
      });
    };
    C.press = function (i) {
      var ks = $$(fig, '.key[data-k="' + i + '"]');
      ks.forEach(function (k) { k.style.transform = 'translateY(2px)'; JL.later(function () { k.style.transform = ''; }, 60); });
    };
    C.reduced = function () {   /* reduced form: shown exploded, traces draw in 300 ms */
      C.setEx(1);
      $$(fig, '.ht .t, .sc-tr .t').forEach(function (t) { if (t.animate) t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'linear' }); });
    };
    C.plugEl = function () { return $(fig, '.cplug'); };
    return C;
  };

  /* ======================= RUN: the selected work's own trace along the cable, ending in the plug ======================= */
  var STATIC_READ = JEL.munkak.olvasat;
  JL.run = function (box, opt) {
    var R = { kind: opt.kind || 'temp', p: 0, T: null, old: null, a: null, override: null, seated: false, d: 0 };
    var cab = mk('svg', { 'aria-hidden': 'true', class: 'run-svg' }, box), cabP = mk('path', { class: 'ln pen-r', d: 'M0 0' }, cab);
    var rd = $(box, '.reading');
    var tail0 = null, ax = { x: -2, y: 1.5 }, D0 = 16, sc = 1;   /* sc: the scale of the controller figure (below 360 px) */
    function reading(kind, p) { if (!rd) return; if (kind === 'temp') return; rd.textContent = p > 0.02 ? (STATIC_READ[kind] || '') : ''; }
    R.layout = function (geo) {
      if (geo) { tail0 = geo.tail; ax = geo.axis; D0 = geo.pull || 16; R.plug = geo.plug; sc = geo.scale || 1; }
      cab.setAttribute('width', 1); cab.setAttribute('height', box.clientHeight);
      if (R.T) R.T.layout(); R.cable();
      R.setP(R.p);
    };
    R.make = function (kind) { var T = JL.trace(box, { kind: kind }); return T; };
    R.cable = function () {
      if (!R.T || !tail0) return;
      var G = R.T.G, tx = tail0.x + R.d * ax.x, ty = tail0.y + R.d * ax.y, x1 = G.x1, y1 = G.endY;
      var d = Math.abs(y1 - ty) < 0.5 ? 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + tx.toFixed(1) + ' ' + ty.toFixed(1) : Art.pathRound([[x1, y1], [tx - 24, y1], [tx - 24, ty], [tx, ty]], 6);
      cabP.setAttribute('d', d);
      var L = cabP.getTotalLength(); cabP.style.strokeDasharray = L + ' ' + (L + 2);
      var on = R.p >= 0.998 || JL.reduced();
      cabP.style.strokeDashoffset = on ? 0 : L; cabP.style.opacity = on ? 1 : 0;
      if (R.plug) R.plug.style.transform = 'translate(' + (R.d * ax.x / sc).toFixed(2) + 'px,' + (R.d * ax.y / sc).toFixed(2) + 'px)';
    };
    R.setP = function (p) {
      p = clamp(p, 0, 1); R.p = p;
      if (!R.T) R.T = R.make(R.kind);
      R.T.setP(p);
      if (p >= 0.998 && !R.seated) { R.seated = true; R.seat(); }
      if (p < 0.5 && R.seated && !R.seatA) { R.seated = false; R.d = D0; R.cable(); }
      if (p < 0.998 && !R.seated && !JL.reduced()) { R.d = D0; }
      reading(R.kind, p); R.cable();
      return p;
    };
    R.seat = function () {
      if (R.seatA) R.seatA.stop();
      if (JL.reduced()) { R.d = 0; R.cable(); return; }
      var d0 = R.d || D0;
      R.seatA = JL.anim(220, E.ring, function (e) { R.d = d0 * (1 - e); R.cable(); }, function () { R.d = 0; R.seatA = null; R.cable(); });
    };
    R.stop = function () { if (R.a) { R.a.stop(); R.a = null; } R.override = null; };
    R.reset = function () { R.stop(); if (R.seatA) { R.seatA.stop(); R.seatA = null; } R.seated = false; R.d = JL.reduced() ? 0 : D0; R.setP(0); };
    R.finish = function () { R.stop(); if (R.seatA) { R.seatA.stop(); R.seatA = null; } R.seated = true; R.d = 0; R.setP(1); R.d = 0; R.cable(); };
    R.playReduced = function () {
      R.stop(); R.override = 1; R.d = 0;
      R.a = JL.anim(300, E.sweep, function (e) { R.setP(e); }, function () { R.override = null; R.a = null; R.setP(1); });
    };
    /* choose another work: the old trace collapses to the baseline, the new one rises (480 ms rc) */
    R.setKind = function (kind, instant) {
      if (kind === R.kind && R.T) return; var prev = R.T; R.kind = kind;
      /* an interrupted swap: its outgoing trace is destroyed (its end callback never runs) and the trace that was coming in, at its current scale, goes out from there */
      var s0 = 1; if (R.kA) { R.kA.stop(); R.kA = null; if (R.outT) { R.outT.destroy(); R.outT = null; } s0 = R.inS; }
      var T2 = R.make(kind); R.T = T2; T2.setP(R.p);
      box.classList.toggle('terv', kind === 'terv');
      if (rd && kind !== 'temp') { rd.textContent = R.p > 0.02 ? (STATIC_READ[kind] || '') : ''; }
      R.cable();
      if (prev) {
        if (instant || JL.reduced()) {
          if (JL.reduced() && !instant) {
            prev.svg.style.transition = 'opacity 200ms linear'; T2.svg.style.opacity = 0; T2.svg.style.transition = 'none'; reflow(T2.svg); T2.svg.style.transition = 'opacity 200ms linear'; T2.svg.style.opacity = 1; prev.svg.style.opacity = 0;
            JL.later(function () { prev.destroy(); }, 220);
          } else prev.destroy();
          return;
        }
        var base = prev.G.startY; if (prev.G.endY != null) base = Math.max(prev.G.endY, base);
        var oy = (box.clientHeight - 14) + 'px';
        prev.svg.style.transformOrigin = '0px ' + oy; T2.svg.style.transformOrigin = '0px ' + oy;
        if (rd) rd.style.opacity = 0;
        R.outT = prev; R.inS = 0.001;
        R.kA = JL.anim(480, E.rc, function (e) { R.inS = Math.max(0.001, e); prev.svg.style.transform = 'scaleY(' + (s0 * (1 - e)).toFixed(4) + ')'; T2.svg.style.transform = 'scaleY(' + R.inS.toFixed(4) + ')'; }, function () { prev.destroy(); R.outT = null; T2.svg.style.transform = 'none'; R.kA = null; if (rd) { rd.style.opacity = R.p >= 0.998 ? 1 : 0; } });
      }
    };
    return R;
  };
