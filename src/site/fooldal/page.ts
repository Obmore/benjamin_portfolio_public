// @ts-nocheck
// The home page's browser chunk: layout of every overlay, the load sequence, the scroll drivers (ported from the approved prototype, page.js).
import { JL } from './core.ts'
import { KESKENY_PX } from './jelalak.ts'
import './parts.ts'
import { mountSwitch } from './tema.ts'
import { nyitas } from './nyito.ts'
import { JEL } from '@/content/fooldal'

const jelControls = () => [].slice.call(document.querySelectorAll('[data-jel-js]'))

/* What the server rendered, taken before the chunk touches anything: the markup of the `.page` wrapper (landmarks, spine overlay, theme clones: everything the chunk touches or appends) and the root's inline style. */
let base = null
function takeBase() {
  base = { parts: [].slice.call(document.querySelectorAll('.page')).map(function (el) { return { el: el, html: el.outerHTML } }), rootStyle: document.documentElement.getAttribute('style') }
}
/* After a failure the page is the page without script, exactly: the `.page` wrapper is put back as the server rendered it (dimmed slots, replaced figure and
   readout markup, inline sizes and everything else the chunk set on server elements go with the nodes it touched), and so is the root's inline style (the
   scale variables). Focus: if it was inside a section of main, that section's heading
   takes it (a restored page cannot give the focused element back, but the reader keeps their place); focus in the header, the footer or nowhere stays unset. */
function restoreBase() {
  if (!base) return
  const act = document.activeElement
  const secId = act && act.closest && act.closest('main section[id]') ? act.closest('main section[id]').id : ''
  base.parts.forEach(function (b) {
    try {
      if (!b.el.isConnected) return
      const t = document.createElement('template')
      t.innerHTML = b.html
      b.el.replaceWith(t.content)
    } catch { /* the root style and the focus still get their turn */ }
  })
  try { if (base.rootStyle === null) document.documentElement.removeAttribute('style'); else document.documentElement.setAttribute('style', base.rootStyle) } catch { /* nothing left to do */ }
  try {
    const h = secId ? document.querySelector('#' + CSS.escape(secId) + ' h1, #' + CSS.escape(secId) + ' h2, #' + CSS.escape(secId) + ' h3') : null
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }) }
  } catch { /* nothing left to do */ }
}

/** The one failure fallback: stop everything the chunk started (one abort), put the server-rendered page back, disable the chunk-only controls. */
export function fail() {
  JL.dead = true
  JL.ac.abort()
  document.documentElement.classList.remove('jel-var', 'jel-kesz', 'jel-hullam', 'jel-vege')
  restoreBase()
  jelControls().forEach(function (b) { b.disabled = true })   // backstop: the restored markup is disabled already
}

export function indit() {
  takeBase()
  try {
    init()
  } catch {
    fail()
  }
}

function init() {
  var doc = document, root = doc.documentElement, E = JL.E, clamp = JL.clamp;
  /* the controls that need this chunk are rendered disabled: they are enabled (and the page marked ready) only after a successful start, and
     disabled again by fail() when anything later throws */
  function ready() { root.classList.add('jel-kesz'); jelControls().forEach(function (b) { b.disabled = false; }); }
  var $ = function (s, r) { return (r || doc).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };
  var page = $('.page');
  var laneRef = $('.hdr .lane');
  function laneAbs() { var r = laneRef.getBoundingClientRect(); return r.left + r.width / 2; }
  JL.laneAbs = laneAbs;
  var narrow = JL.narrow;
  function pageY(el) { return el.getBoundingClientRect().top - page.getBoundingClientRect().top; }

  mountSwitch($('.tkey'));
  var op = nyitas($('.opening'), { laneX: laneAbs });

  JL.laneShift = function (box, yLocal) {
    var sp0 = sp; if (!sp0 || !sp0.ys) return 0;
    var y = box.getBoundingClientRect().top - page.getBoundingClientRect().top + yLocal;
    return JL.stairOff(y, sp0.ys.stepFrom, sp0.ys.stepTo);
  };

  /* ---------- works: the controller, the detail view, the list, the cable run ---------- */
  var W = JL.WORKS, wl = $('.wl'), dv = $('[data-dv]'), sel = JEL.munkak.elso;
  $$('li', wl).forEach(function (li) { W.push({ t: $('button', li).textContent, s: $('.ws', li) ? $('.ws', li).textContent : '', img: li.getAttribute('data-kep'), alt: li.getAttribute('data-alt'), kind: li.getAttribute('data-jel'), href: li.getAttribute('data-href'), link: li.getAttribute('data-link'), kulso: li.getAttribute('data-kulso') }); });
  var figEls = $$('.cfig'), ctrls = figEls.map(function (el) { return JL.ctrl(el, JSON.parse(el.getAttribute('data-geo'))); }), FI = { wide: ctrls[0].info, narrow: ctrls[1].info };
  var runEl = $('.run'), run = JL.run(runEl, { kind: 'temp' });
  function activeIdx() { return narrow() ? 1 : 0; }
  /* the detail view of a work without a picture shows the work's own trace (08 5.5): a signal-weight line over a baseline rule at 62 % of the area's height */
  var dvSvg = JL.mkEl('svg', { 'aria-hidden': 'true', class: 'dv-trace' }, dv), dvRule = JL.mkEl('path', { class: 'dv-rule' }, dvSvg), dvLine = JL.mkEl('path', { class: 'ln pen-r' }, dvSvg), dvKind = '';
  function layoutDvTrace() {
    var bw = dv.clientWidth, bh = dv.clientHeight, m = narrow() ? 16 : 24;
    dvSvg.setAttribute('width', bw); dvSvg.setAttribute('height', bh);
    dvSvg.style.display = dvKind ? 'block' : 'none';
    if (!dvKind) return;
    dvRule.setAttribute('d', 'M' + m + ' ' + (bh * 0.62).toFixed(1) + 'H' + (bw - m));
    dvLine.setAttribute('d', JL.screenTrace(dvKind, bw, bh, m, 0.62, 0.2));
  }
  /* the caption keeps the height of the longest caption of the list at the current width, so nothing below the detail view moves when a work is chosen (08 5.5, M1) */
  var cap = $('.dv-cap'), capW = -1;
  function fillCaption(w) {
    $('.dv-t').textContent = w.t; $('.dv-s').textContent = w.s;
    var dl = $('.dv-link'); dl.textContent = w.link; dl.setAttribute('href', w.href);
    if (w.kulso) { dl.setAttribute('rel', 'noopener'); dl.setAttribute('target', '_blank'); dl.removeAttribute('data-esemeny'); } else { dl.removeAttribute('rel'); dl.removeAttribute('target'); if (w.kind === 'terv') dl.removeAttribute('data-esemeny'); else dl.setAttribute('data-esemeny', 'demo'); }
  }
  /* measured on a hidden, inert clone: the live caption (an aria-live region with the link) is written only when a work is chosen */
  function reserveCaption() {
    var bw = cap.clientWidth; if (bw === capW) return; capW = bw;
    var ghost = cap.cloneNode(true), max = 0;
    ghost.setAttribute('aria-hidden', 'true'); ghost.setAttribute('inert', '');
    ghost.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;min-height:0;width:' + cap.getBoundingClientRect().width + 'px';
    [].forEach.call(ghost.querySelectorAll('[data-dv-live]'), function (n) { n.parentNode.removeChild(n); });
    cap.parentNode.appendChild(ghost);
    W.forEach(function (w) { $('.dv-t', ghost).textContent = w.t; $('.dv-s', ghost).textContent = w.s; $('.dv-link', ghost).textContent = w.link; max = Math.max(max, ghost.getBoundingClientRect().height); });
    cap.parentNode.removeChild(ghost); cap.style.minHeight = max + 'px';
  }
  function selectWork(i, animate) {
    var w = W[i], red = JL.reduced(); sel = i;
    $$('[data-wi]', wl).forEach(function (b) { var on = +b.getAttribute('data-wi') === i; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    ctrls.forEach(function (c) { c.show(i, animate && !red); if (animate && !red) c.press(i); });
    var img = $('img', dv);
    if (w.img) { img.hidden = false; img.src = '/work/' + w.img; img.alt = w.alt; } else img.hidden = true;
    var terv = w.kind === 'terv', fej = $('.dv-fej');
    /* the planned slot points at no display: the leader and the controller's circle are not drawn while it is selected */
    lsvg.style.display = terv ? 'none' : ''; $$('.dcirc').forEach(function (c) { c.style.display = terv ? 'none' : ''; });
    dv.parentNode.classList.toggle('terv', terv); fej.textContent = terv ? fej.getAttribute('data-terv-fej') : fej.getAttribute('data-fej');
    dvKind = w.img || terv ? '' : w.kind; layoutDvTrace();
    $('.dv-hd .mono').textContent = terv ? '' : w.img ? JEL.munkak.skala : JEL.munkak.olvasat[w.kind];   /* a trace has a reading; "M 5:1" is the scale of a picture */
    fillCaption(w);
    var lv = $('[data-dv-live]'); if (lv && animate) lv.textContent = w.t;
    if (animate) { dv.classList.remove('lcd-redraw'); void dv.offsetWidth; dv.classList.add('lcd-redraw'); }
    run.setKind(w.kind, !animate);
    /* the caption's height moves the link below 1024 px, and everything below the works block with it: the whole layout is redone once per selection
       (relayoutAll places and lays out the new trace, then the contact, bus, offers, earth and spine), not left to the page ResizeObserver a frame later; event-driven */
    if (window.innerWidth < 1024 && !narrow()) relayoutAll();
  }
  var wBtns = $$('[data-wi]', wl);
  wBtns.forEach(function (b) {
    b.addEventListener('click', function () { selectWork(+b.getAttribute('data-wi'), true); });
    b.addEventListener('keydown', function (e) {
      var i = +b.getAttribute('data-wi'), d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return; e.preventDefault(); var n = (i + d + wBtns.length) % wBtns.length; selectWork(n, true); wBtns[n].focus();
    });
  });
  /* the keys on the device are operable too (invisible hit areas riding on their part) */
  /* hit area of a key: a 32 x 32 square cut by the half-planes midway to its neighbours (keys step 12 mm along the dimetric y axis) */
  function hitClip() {
    var K = FI.wide.K, vx = K * 0.7071 * 12, vy = K * 0.7071 * 0.7431 * 12;
    var L = Math.hypot(vx, vy), nx = vx / L, ny = vy / L, d = L / 2 - 1, poly = [[-16, -16], [16, -16], [16, 16], [-16, 16]];
    function cut(p, sgn) { var out = []; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length], da = sgn * (a[0] * nx + a[1] * ny) - d, db = sgn * (b[0] * nx + b[1] * ny) - d; if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { var t = da / (da - db); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); } } return out; }
    poly = cut(cut(poly, 1), -1);
    return 'polygon(' + poly.map(function (q) { return (q[0] + 16).toFixed(1) + 'px ' + (q[1] + 16).toFixed(1) + 'px'; }).join(',') + ')';
  }
  function layoutHits() {
    /* the buttons are rebuilt, so a focused one (a keyboard selection through it) is found again by figure, panel and key and gets the focus back */
    var act = doc.activeElement, again = null, fi = -1, fp = '', fk = '';
    if (act && act.classList && act.classList.contains('khit')) { fi = figEls.indexOf(act.closest('.cfig')); fp = act.parentNode.getAttribute('data-p'); fk = act.getAttribute('data-k'); }
    figEls.forEach(function (fig, fidx) {
      $$('.khit', fig).forEach(function (h) { h.remove(); });
      if (fig.classList.contains('cn')) return;
      ['cover', 'display'].forEach(function (pn) {
        var cp = $('.cp[data-p="' + pn + '"]', fig); if (!cp) return; var cr = cp.getBoundingClientRect();
        $$('.key', cp).forEach(function (k) {
          var r = k.getBoundingClientRect(), b = doc.createElement('button');
          b.type = 'button'; b.className = 'khit'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
          var hs = fig.offsetWidth ? fig.getBoundingClientRect().width / fig.offsetWidth : 1; b.style.left = ((r.left + r.width / 2 - cr.left) / hs) + 'px'; b.style.top = ((r.top + r.height / 2 - cr.top) / hs) + 'px'; b.style.clipPath = hitClip();
          var i = +k.getAttribute('data-k'); b.addEventListener('click', function () { selectWork(i, true); });
          b.setAttribute('data-k', String(i));
          cp.appendChild(b);
          if (fidx === fi && pn === fp && String(i) === fk) again = b;
        });
      });
    });
    if (again) again.focus({ preventScroll: true });
  }
  var ctrlComp = {
    override: null,
    setP: function (p) { ctrls.forEach(function (c) { c.setEx(p); }); },
    finish: function () { ctrls.forEach(function (c) { c.setEx(1); }); },
    playReduced: function () { ctrls.forEach(function (c) { c.reduced(); }); },
    reset: function () { ctrls.forEach(function (c) { c.setEx(JL.reduced() ? 1 : 0); }); }
  };
  /* the thin leader from the display module's screen circle to the detail view (wide only) */
  var lsvg = JL.mkEl('svg', { 'aria-hidden': 'true', class: 'lead-svg' }, $('.sec-works .in')), lpath = JL.mkEl('path', { d: 'M0 0' }, lsvg), lLen = 1;
  function setLeader(e) { lpath.style.strokeDasharray = lLen + ' ' + (lLen + 2); lpath.style.strokeDashoffset = (lLen * (1 - e)).toFixed(2); lpath.style.opacity = e > 0.01 ? 1 : 0; }
  ctrls.forEach(function (c, i) { c.onCircle = function (e) { if (i === activeIdx()) setLeader(e); }; });
  function layoutLeader() {
    var inn = $('.sec-works .in'), ir = inn.getBoundingClientRect(); lsvg.setAttribute('width', inn.clientWidth); lsvg.setAttribute('height', inn.clientHeight);
    if (narrow()) { lpath.setAttribute('d', 'M0 0'); lLen = 1; setLeader(0); return; }
    var fr = figEls[0].getBoundingClientRect(), I = FI.wide, fs = figEls[0].offsetWidth ? fr.width / figEls[0].offsetWidth : 1, cx = fr.left - ir.left + I.dc.x * fs, cy = fr.top - ir.top + I.dc.y * fs, r = I.dc.r * fs;
    var dr = $('.dview').getBoundingClientRect(), sx = cx - r * 0.866, sy = cy - r * 0.5, ex = dr.right - ir.left, ey = dr.bottom - ir.top - 22;
    lpath.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1)); lLen = lpath.getTotalLength();
    var c = ctrls[0]; setLeader(c.circleEl() && c.circleEl().style.strokeDashoffset !== '' ? clamp(1 - parseFloat(c.circleEl().style.strokeDashoffset), 0, 1) : 0);
  }
  function placeRun() {
    var inn = $('.sec-works .in'), ir = inn.getBoundingClientRect(), nr = narrow(), fig = figEls[activeIdx()], fr = fig.getBoundingClientRect(), I = nr ? FI.narrow : FI.wide;
    var left = nr ? 0 : parseFloat(getComputedStyle(inn).paddingLeft) || 0;
    var fs = fig.offsetWidth ? fr.width / fig.offsetWidth : 1;   /* the narrow figure scales below 360 px */
    var tailX = fr.left - ir.left + I.tail.x * fs, tailY = fr.top - ir.top + I.tail.y * fs, top, x1;
    if (!nr) {
      top = tailY - 28; x1 = tailX - 84;
      /* folded band (below 1024 px): the run starts 32 px under the "Minden munka" link, level under the card column, and rises once beside the plug */
      var lk = $('.allw a'); if (lk && window.innerWidth < 1024) top = Math.max(top, lk.getBoundingClientRect().bottom - ir.top + 48);
    } else { top = fr.bottom - ir.top + 14; x1 = tailX - 56; }
    runEl.style.left = left + 'px'; runEl.style.top = top + 'px'; runEl.style.width = (x1 + 6 - left) + 'px';
    var plug = $('.cplug', fig);
    run.layout({ tail: { x: tailX - left, y: tailY - top }, axis: { x: I.axis.x * fs, y: I.axis.y * fs }, plug: plug, pull: 16, scale: fs });
  }

  /* ---------- partners, earth (the contact end draws its own tap: src/site/elemek/) ---------- */
  var bus = JL.bus($('.bus')), offers = JL.offers($('.offers')), earth = JL.earth($('.earth'));
  var sp = JL.spine(page);
  /* the contact end's tap and node wait for the spine: the page only says "the lane is here" (data-bahn itt / var); the component draws them itself (src/site/elemek/cimmezo.css).
     The node's y is read from the component's stable HTML box (.cmz-alap: the address baseline, + 8 px) in the same read as the page rect, before anything is written:
     the component relayouts on its own (resize, fonts), so it is never cached. */
  var cm = $('.cmz'), cmAlap = cm && cm.querySelector('.cmz-alap'), bahnV = null;
  function bahn(y) {
    if (!cm) return;
    if (y === undefined) y = cmAlap ? cmAlap.getBoundingClientRect().top - page.getBoundingClientRect().top + 8 : null;
    var v = JL.reduced() || !sp.ys || y === null || (sp.loadK >= 1 && sp.head >= y - 0.5) ? 'itt' : 'var';
    if (v !== bahnV) { bahnV = v; cm.setAttribute('data-bahn', v); }
  }
  function layoutSpine() {
    var pr = page.getBoundingClientRect(), x0 = laneAbs() - pr.left, mk = $('.hdr .mark'), ex = pageY(mk) + mk.getBoundingClientRect().height;
    /* the lane's nodes: the subline's, the source's and the band's baseline (the first screen), then the cable run, the bus and the offers */
    var inY = pageY($('.opening .in')), taps = op.taps().map(function (y) { return inY + y; }).concat([pageY(runEl) + (run.T ? run.T.startY : 28), pageY($('.bus')) + 26, pageY($('.offers')) + offers.ytap]);
    sp.build({ x0: x0, top: ex, stepFrom: pageY($('#h-munkak')), stepTo: taps[3] + 80, taps: taps, end: pageY($('.earth')) + earth.stemLen });
    updHead();
  }
  function updHead() {
    var pr = page.getBoundingClientRect(), cy = cmAlap ? cmAlap.getBoundingClientRect().top - pr.top + 8 : null;
    var vh = window.innerHeight, top = -pr.top, max = Math.max(1, doc.documentElement.scrollHeight - vh), frac = clamp(window.scrollY / max, 0, 1);
    var base = top + vh * 0.88, end = sp.ys ? sp.ys.end : base, extra = Math.max(0, end - (max + vh * 0.72));
    sp.setHead(Math.max(base + extra * frac, sp.ys ? sp.ys.taps[0] + 6 : 0));   /* maximum scroll maps to the full path: the head reaches the earth symbol */
    bahn(cy);
  }

  /* scroll-linked and scroll-triggered pieces */
  JL.watch(ctrlComp, $('.cwrap'), 'scrub', 0.95, 0.95).len = function () { return 0.6 * $('.cwrap').offsetHeight; };
  var gate = function (tapY) { return function () { return JL.reduced() || !sp.ys || sp.head >= tapY(); }; };
  JL.watch(run, runEl, 'scrub', 0.97, 0.84).gate = gate(function () { return pageY(runEl) + (run.T ? run.T.startY : 28); });
  JL.watch(bus, $('.bus'), 'once', 0.82).gate = gate(function () { return pageY($('.bus')) + 26; }); JL.watch(offers, $('.offers'), 'once', 0.9).gate = gate(function () { return pageY($('.offers')) + offers.ytap; }); JL.watch(earth, $('.earth'), 'once', 0.97).gate = gate(function () { return sp.ys ? sp.ys.end - 4 : 0; });
  var all = [ctrlComp, run, bus, offers, earth];

  function setScale() {
    /* below 360 px the narrow controller scales with the content column (100vw - 60 px of its 300 px): exact here, stepped in the css before this runs */
    root.style.setProperty('--ks', Math.min(1, (root.clientWidth - 60) / 300).toFixed(4));
    /* 701-899 px: the wide controller figure takes the room right of the 248 px card column (up to 46 px from the viewport edge) */
    var vwd = root.clientWidth, kw = 1;
    if (vwd > KESKENY_PX && vwd < 900) { var wl0 = $('.wleft'); kw = clamp((vwd - 46 - (wl0.getBoundingClientRect().left + 248 + 16)) / 397, 0.5, 1); }
    root.style.setProperty('--kw', kw.toFixed(4));
  }
  function relayoutAll() {
    setScale(); reserveCaption(); layoutDvTrace(); var rs = run.T; op.relayout(); placeRun(); layoutLeader(); layoutHits(); bus.layout(); offers.layout(); earth.layout(); layoutSpine();
    if (rs) { run.layout(); }
  }
  var roQ = 0;
  JL.ro(function () { if (roQ) return; roQ = requestAnimationFrame(function () { roQ = 0; if (JL.dead) return; relayoutAll(); JL.tickReq(); }); }, page);

  /* page load sequence */
  var loadA = null, loadT = 0;
  JL.sig.addEventListener('abort', function () { if (loadA) loadA.stop(); });
  function playLoad() {
        if (loadA) loadA.stop(); clearTimeout(loadT);
    sp.setLoad(0); bahn();
    var red = JL.reduced();
    op.load();
    loadT = JL.later(function () { loadA = JL.anim(red ? 300 : 500, E.sweep, function (e) { sp.setLoad(e); }, function () { sp.setLoad(1); bahn(); }); }, red ? 150 : 620);
  }

  JL.onScrollTick = function () {
    updHead();
    var vh = window.innerHeight, cur = null;
    $$('.hdr nav a[data-sec]').forEach(function (a) { var s = $('#' + a.getAttribute('data-sec')), r = s.getBoundingClientRect(); if (r.top < vh * 0.4 && r.bottom > vh * 0.4) cur = a; });
    $$('.hdr nav a').forEach(function (a) { if (a === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };

  JL.onMode(function () {
    op.reset();
    all.forEach(function (c) { c.reset(); });
    JL.resetWatch();
    sp.draw(); bahn();
    JL.evalAll();
  });

  function start() {
    selectWork(sel, false);
    capW = -1;   /* a layout frame before the fonts arrived may have measured the caption on fallback metrics */
    relayoutAll();
    JL.tickReq();
    all.forEach(function (c) { c.reset(); });
    JL.resetWatch();   /* an evaluation before the start (a layout frame) may have entered a part that was just reset */
    JL.evalAll();
    playLoad();
  }
  /* start() runs in a frame after fonts.ready, so an exception there is not seen by main.ts: the same cleanup runs here */
  var go = function () { requestAnimationFrame(function () { try { start(); ready(); } catch { fail(); } }); };
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go); else go();
}
