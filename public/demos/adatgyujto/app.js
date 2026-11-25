'use strict'
// Gépadat-gyűjtő – semleges bemutató („Minta Gépgyár”). Minden adat szimulált, és csak a böngészőben keletkezik.
;(() => {
  // Három műszak; a szimuláció folyamatos, műszakváltáskor a műszakjelentés újraindul.
  const SHIFTS = [
    { start: 6 * 60, code: 'de', label: 'délelőtt, 6:00–14:00' },
    { start: 14 * 60, code: 'du', label: 'délután, 14:00–22:00' },
    { start: 22 * 60, code: 'ej', label: 'éjszaka, 22:00–6:00' },
  ]
  const SHIFT_LEN = 8 * 60
  const WARMUP = 60 // betöltéskor ennyi percet szimulálunk előre, hogy legyen előzmény
  const HISTORY = 60 // a grafikon ennyi percet mutat
  const params = new URLSearchParams(location.search)
  const tempo = Math.min(20, Math.max(1, Number.parseInt(params.get('tempo') || '1', 10) || 1)) // percek / másodperc
  // ?kezdes=ÓÓPP – a bemutatóidő kezdete (alapból 7:00); a műszakváltás kipróbálásához
  const startParam = /^([01]\d|2[0-3])([0-5]\d)$/.exec(params.get('kezdes') || '')
  const START = startParam ? Number(startParam[1]) * 60 + Number(startParam[2]) : 7 * 60

  // Kitalált gépek, jelek és határértékek; éles bevezetésnél a cég saját gépei és határai kerülnek a helyükre.
  const MACHINES = [
    { id: 'cnc1', name: 'CNC-1', type: 'CNC megmunkálóközpont', tempLabel: 'Orsóhőmérséklet', tempBase: 52, tempLimit: 70,
      tempRange: [30, 90], currentBase: 11, currentLimit: 18, currentRange: [0, 24], rate: 24 },
    { id: 'pres2', name: 'Prés-2', type: 'Hidraulikus prés', tempLabel: 'Olajhőmérséklet', tempBase: 45, tempLimit: 60,
      tempRange: [20, 80], currentBase: 14, currentLimit: 22, currentRange: [0, 28], rate: 60 },
    { id: 'heg3', name: 'Hegesztő-3', type: 'Hegesztőrobot-cella', tempLabel: 'Hűtővíz-hőmérséklet', tempBase: 24, tempLimit: 32,
      tempRange: [8, 40], currentBase: 9, currentLimit: 15, currentRange: [0, 20], rate: 18 },
  ]
  const IDLE_REASONS = ['Anyagra vár', 'Átállás', 'Szerszámcsere']
  const SIGNALS = {
    temp: { unit: '°C', label: (m) => m.tempLabel, limit: (m) => m.tempLimit, range: (m) => m.tempRange, digits: 1 },
    current: { unit: 'A', label: () => 'Áramfelvétel', limit: (m) => m.currentLimit, range: (m) => m.currentRange, digits: 1 },
    rate: { unit: 'ciklus/óra', label: () => 'Ciklus / óra', limit: () => null, range: (m) => [0, Math.ceil((m.rate * 1.3) / 20) * 20], digits: 0 },
  }

  // Determinisztikus álvéletlen (mulberry32), hogy a bemutató minden betöltéskor ugyanúgy induljon.
  let seed = 20261026
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const noise = (amp) => (rnd() * 2 - 1) * amp

  const nf = (v, digits) => v.toLocaleString('hu-HU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const day = (min) => ((Math.floor(min) % 1440) + 1440) % 1440 // éjfél előtti (negatív) percre is 0…1439
  const clock = (min) => `${Math.floor(day(min) / 60)}:${String(day(min) % 60).padStart(2, '0')}`
  const shiftOf = (min) => SHIFTS[Math.floor((((min - SHIFTS[0].start) % 1440) + 1440) % 1440 / SHIFT_LEN)]
  const duration = (min) => `${Math.floor(min / 60)}:${String(Math.floor(min) % 60).padStart(2, '0')}`

  let now = START - WARMUP
  let shift = shiftOf(now)
  let shiftStartAt = -Infinity // a mostani műszak kezdete (bemutatóperc); az első, csonka műszaknál a betöltés
  const announce = [] // a következő rajzoláskor a felolvasónak szóló üzenetek: { t: bemutatóperc, text }
  let running = true
  let timer = null
  const alarms = [] // { key, machine, text, at, clearedAt }
  const active = new Map() // riasztási feltétel kulcsa → riasztás

  const state = MACHINES.map((m) => ({
    m,
    status: 'run', // run | idle | fault
    reason: '',
    left: 0, // a mostani állás vagy hiba hátralévő perce
    overheat: 0, // a szimulált hiba hátralévő perce
    temp: m.tempBase,
    current: m.currentBase,
    rate: m.rate,
    parts: 0,
    runMin: 0,
    idleMin: 0,
    faultMin: 0,
    alarmCount: 0,
    history: { temp: [], current: [], rate: [] },
  }))

  function raise(key, s, text) {
    if (active.has(key)) return false
    const a = { key, machine: s.m.name, text, at: now, clearedAt: null }
    active.set(key, a)
    alarms.unshift(a)
    s.alarmCount += 1
    announce.push({ t: now, text: `Riasztás: ${text}.` })
    return true
  }
  function clear(key) {
    const a = active.get(key)
    if (!a) return false
    a.clearedAt = now
    active.delete(key)
    return true
  }

  function step() {
    let changed = false
    for (const s of state) {
      const { m } = s
      // állapotváltás
      if (s.status === 'run') {
        if (s.overheat === 0 && rnd() < 0.015) {
          s.status = 'idle'
          s.reason = IDLE_REASONS[Math.floor(rnd() * IDLE_REASONS.length)]
          s.left = 3 + Math.floor(rnd() * 8)
        }
      } else if (--s.left <= 0) {
        if (s.status === 'fault') changed = clear(`${m.id}:fault`) || changed
        s.status = 'run'
        s.reason = ''
      }
      // mért jelek
      const isRun = s.status === 'run'
      const tempTarget = s.overheat > 0 ? m.tempLimit + 9 : m.tempBase - (isRun ? 0 : 7)
      s.temp += (tempTarget - s.temp) * (s.overheat > 0 ? 0.35 : 0.12) + noise(0.6)
      s.current = isRun ? m.currentBase + noise(1.1) : s.status === 'idle' ? 1.6 + noise(0.3) : 0.6 + noise(0.2)
      s.rate = isRun ? Math.max(0, m.rate * (0.92 + rnd() * 0.12)) : 0
      s.parts += s.rate / 60
      if (s.overheat > 0) s.overheat -= 1
      // túlmelegedés: a gép a határ fölött 4 fokkal automatikusan leáll
      if (s.status !== 'fault' && s.temp > m.tempLimit + 4) {
        s.status = 'fault'
        s.reason = 'Túlmelegedés – automatikus leállás'
        s.left = 6
        s.overheat = 0
        changed = raise(`${m.id}:fault`, s, `${m.name}: hiba – ${s.reason}`) || changed
      }
      if (s.status === 'run') s.runMin += 1
      else if (s.status === 'idle') s.idleMin += 1
      else s.faultMin += 1
      // riasztási határok
      for (const sig of ['temp', 'current']) {
        const key = `${m.id}:${sig}`
        const limit = SIGNALS[sig].limit(m)
        if (s[sig] > limit) {
          changed = raise(key, s, `${m.name}: ${SIGNALS[sig].label(m).toLowerCase()} ${nf(s[sig], 1)} ${SIGNALS[sig].unit} (határ: ${limit} ${SIGNALS[sig].unit})`) || changed
        } else if (s[sig] < limit - (sig === 'temp' ? 2 : 1)) {
          changed = clear(key) || changed
        }
      }
      for (const sig of ['temp', 'current', 'rate']) {
        const h = s.history[sig]
        h.push({ t: now, v: s[sig] })
        if (h.length > HISTORY) h.shift()
      }
    }
    now += 1
    if (shiftOf(now) !== shift) {
      shift = shiftOf(now)
      shiftStartAt = now
      for (const s of state) {
        s.parts = 0
        s.runMin = 0
        s.idleMin = 0
        s.faultMin = 0
        s.alarmCount = 0
      }
      announce.push({ t: now, text: `Műszakváltás: ${shift.label}. A műszakjelentés újraindult.` })
    }
    return changed
  }

  // ----- megjelenítés -----
  const $ = (id) => document.getElementById(id)
  const els = {}
  function buildCards() {
    const wrap = $('machines')
    for (const s of state) {
      const card = document.createElement('article')
      card.className = 'machine'
      card.dataset.machine = s.m.id
      card.innerHTML = `<div class="machine-head"><h3></h3><span class="state"></span></div><p class="machine-type"></p>
        <dl><div><dt></dt><dd data-k="temp"></dd></div><div><dt>Áramfelvétel</dt><dd data-k="current"></dd></div>
        <div><dt>Ciklus / óra</dt><dd data-k="rate"></dd></div><div><dt>Darab a műszakban</dt><dd data-k="parts"></dd></div></dl>`
      card.querySelector('h3').textContent = s.m.name
      card.querySelector('.machine-type').textContent = s.m.type
      card.querySelector('dt').textContent = s.m.tempLabel
      wrap.appendChild(card)
      els[s.m.id] = { card, state: card.querySelector('.state'), dd: Object.fromEntries([...card.querySelectorAll('dd')].map((d) => [d.dataset.k, d])) }
      const opt = document.createElement('option')
      opt.value = s.m.id
      opt.textContent = `${s.m.name} – ${s.m.type}`
      $('chartMachine').appendChild(opt)
    }
  }
  const STATUS_TEXT = { run: 'Fut', idle: 'Áll', fault: 'Hiba' }
  function renderCards() {
    for (const s of state) {
      const e = els[s.m.id]
      e.card.className = `machine${s.status === 'run' ? '' : ` ${s.status}`}`
      e.state.className = `state ${s.status}-s`
      e.state.textContent = s.reason ? `${STATUS_TEXT[s.status]} – ${s.reason}` : STATUS_TEXT[s.status]
      e.dd.temp.textContent = `${nf(s.temp, 1)} °C`
      e.dd.temp.classList.toggle('over', s.temp > s.m.tempLimit)
      e.dd.current.textContent = `${nf(s.current, 1)} A`
      e.dd.current.classList.toggle('over', s.current > s.m.currentLimit)
      e.dd.rate.textContent = nf(s.rate, 0)
      e.dd.parts.textContent = nf(Math.floor(s.parts), 0)
    }
  }

  const SVG = 'http://www.w3.org/2000/svg'
  const H = 240
  const PAD = { l: 46, r: 14, t: 14, b: 30 }
  function svgEl(name, attrs, text) {
    const el = document.createElementNS(SVG, name)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (text !== undefined) el.textContent = text
    return el
  }
  function renderChart() {
    const s = state.find((x) => x.m.id === $('chartMachine').value) || state[0]
    const sigKey = $('chartSignal').value
    const sig = SIGNALS[sigKey]
    const [lo, hi] = sig.range(s.m)
    const h = s.history[sigKey]
    const svg = $('chart')
    // a rajz szélessége a tényleges szélességet követi, hogy telefonon is olvasható maradjon a felirat
    const W = Math.round(Math.min(640, Math.max(300, svg.clientWidth || 640)))
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    for (const n of [...svg.childNodes]) if (n.nodeName !== 'title' && n.nodeName !== 'desc') svg.removeChild(n)
    const x = (i) => PAD.l + (i / (HISTORY - 1)) * (W - PAD.l - PAD.r)
    const y = (v) => PAD.t + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
    for (let k = 0; k <= 4; k++) {
      const v = lo + ((hi - lo) * k) / 4
      svg.appendChild(svgEl('line', { class: 'grid-line', x1: PAD.l, x2: W - PAD.r, y1: y(v), y2: y(v) }))
      svg.appendChild(svgEl('text', { class: 'axis', x: PAD.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, nf(v, 0)))
    }
    if (h.length) {
      const offset = HISTORY - h.length
      for (const [i, anchor] of [[0, 'start'], [Math.floor((h.length - 1) / 2), 'middle'], [h.length - 1, 'end']]) {
        svg.appendChild(svgEl('text', { class: 'axis', x: x(offset + i), y: H - 8, 'text-anchor': anchor }, clock(h[i].t)))
      }
    }
    const limit = sig.limit(s.m)
    if (limit !== null) {
      svg.appendChild(svgEl('line', { class: 'limit', x1: PAD.l, x2: W - PAD.r, y1: y(limit), y2: y(limit) }))
      svg.appendChild(svgEl('text', { class: 'limit-label', x: W - PAD.r - 4, y: y(limit) - 6, 'text-anchor': 'end' }, `határ: ${limit} ${sig.unit}`))
    }
    const offset = HISTORY - h.length
    const pts = h.map((p, i) => `${x(offset + i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
    svg.appendChild(svgEl('polyline', { class: 'series', points: pts }))
    if (h.length) {
      const last = h[h.length - 1]
      svg.appendChild(svgEl('circle', { class: 'last', cx: x(HISTORY - 1), cy: y(last.v), r: 4 }))
      const lim = limit !== null ? ` · határ: ${limit} ${sig.unit}` : ''
      $('chartCaption').textContent = `${s.m.name} · ${sig.label(s.m)}: most ${nf(last.v, sig.digits)} ${sig.unit}${lim}`
    }
    $('chartInfo').textContent = 'utolsó 60 perc'
  }

  function renderReport() {
    const tbody = $('report')
    tbody.textContent = ''
    for (const s of state) {
      const tr = document.createElement('tr')
      for (const v of [s.m.name, nf(Math.floor(s.parts), 0), duration(s.runMin), duration(s.idleMin), duration(s.faultMin), nf(s.alarmCount, 0)]) {
        const td = document.createElement('td')
        td.textContent = v
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  }

  function renderAlarms() {
    const ol = $('alarms')
    ol.textContent = ''
    for (const a of alarms.slice(0, 30)) {
      const li = document.createElement('li')
      if (a.clearedAt !== null) li.className = 'cleared'
      const t = document.createElement('time')
      t.textContent = a.clearedAt === null ? `${clock(a.at)} · aktív` : `${clock(a.at)} – megszűnt ${clock(a.clearedAt)}`
      li.append(t, a.text)
      ol.appendChild(li)
    }
    $('alarmCount').textContent = `${active.size} aktív · ${alarms.length} összesen`
    $('noAlarm').hidden = alarms.length > 0
  }

  function renderClock() {
    $('simTime').textContent = clock(now)
    $('shift').textContent = shift.label
    const r = $('runState')
    r.textContent = running ? 'Fut' : 'Megállítva'
    r.className = `run ${running ? 'on' : 'off'}`
  }
  let sayTimer = null
  const pending = [] // a még ki nem írt üzenetek – egy sem vész el, gyors tempónál sem
  function say(text, t = now) {
    // a riasztások listája nem élő régió (újraépül); a felolvasó csak az új eseményt kapja meg, mindegyiket a saját
    // idejével. Ürítés után kis késleltetéssel írjuk ki, hogy az ismételt, azonos üzenet is elhangozzék; a közben érkező
    // üzenetek ugyanabba a kiírásba kerülnek (a késleltetést nem indítják újra, így folyamatos eseményeknél sem akad el).
    pending.push(`${clock(t)} – ${text}`)
    if (sayTimer !== null) return
    $('status').textContent = ''
    sayTimer = setTimeout(() => {
      $('status').textContent = pending.join(' ')
      pending.length = 0
      sayTimer = null
    }, 100)
  }

  function render(alarmsChanged) {
    renderClock()
    renderCards()
    renderChart()
    renderReport()
    if (alarmsChanged) renderAlarms()
    if (announce.length) {
      for (const a of announce) say(a.text, a.t)
      announce.length = 0
    }
  }

  function tick() {
    if (!running) return
    render(step())
  }
  function start() {
    if (timer === null) timer = setInterval(tick, Math.round(1000 / tempo))
  }
  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function csv() {
    const cell = (v) => {
      const s = String(v)
      return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
    }
    const rows = [['Műszak', shift.label, 'Bemutatóidő', clock(now)], [], ['Gép', 'Típus', 'Darab', 'Üzemidő (perc)', 'Állásidő (perc)', 'Hibaidő (perc)', 'Riasztások', 'Utolsó hőmérséklet (°C)', 'Utolsó áramfelvétel (A)']]
    for (const s of state) {
      rows.push([s.m.name, s.m.type, Math.floor(s.parts), s.runMin, s.idleMin, s.faultMin, s.alarmCount, nf(s.temp, 1), nf(s.current, 1)])
    }
    rows.push([])
    rows.push(['Riasztás kezdete', 'Gép', 'Üzenet', 'Megszűnt', 'Megjegyzés'])
    // a mostani műszak riasztásai, és az előzőből még aktívak vagy ebben a műszakban megszűntek (megjelölve; a gépenkénti
    // „Riasztások” szám csak a műszakban indultakat számolja)
    for (const a of [...alarms].reverse()) {
      if (a.at >= shiftStartAt || a.clearedAt === null || a.clearedAt >= shiftStartAt) {
        rows.push([clock(a.at), a.machine, a.text, a.clearedAt === null ? 'aktív' : clock(a.clearedAt), a.at < shiftStartAt ? 'előző műszakból' : ''])
      }
    }
    const text = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const name = `muszakjelentes_minta-gepgyar_${date}_${shift.code}_${clock(now).replace(':', '').padStart(4, '0')}.csv`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const selected = () => state.find((x) => x.m.id === $('chartMachine').value) || state[0]
  function syncLabels() {
    const s = selected()
    $('fault').textContent = `Hiba szimulálása: ${s.m.name}`
    $('chartSignal').querySelector('option[value="temp"]').textContent = `${s.m.tempLabel} (°C)`
  }

  function init() {
    buildCards()
    for (let i = 0; i < WARMUP; i++) step()
    announce.length = 0
    syncLabels()
    render(true)
    renderAlarms()
    $('chartMachine').addEventListener('change', () => {
      syncLabels()
      renderChart()
    })
    $('chartSignal').addEventListener('change', renderChart)
    window.addEventListener('resize', renderChart)
    $('pause').addEventListener('click', () => {
      running = !running
      $('pause').textContent = running ? 'Szimuláció megállítása' : 'Szimuláció folytatása'
      if (running) start()
      else stop()
      renderClock()
      say(running ? 'A szimuláció fut.' : 'A szimuláció megállítva.')
    })
    $('fault').addEventListener('click', () => {
      const s = selected()
      if (s.status === 'fault' || s.overheat > 0) {
        say(`${s.m.name}: a hiba szimulálása már folyamatban van.`)
        return
      }
      s.overheat = 12
      if (s.status === 'idle') {
        s.status = 'run'
        s.reason = ''
      }
      $('chartSignal').value = 'temp'
      renderChart()
      say(running
        ? `${s.m.name}: hiba szimulálva – a hőmérséklet emelkedik, a határ fölött a gép leáll.`
        : `${s.m.name}: hiba szimulálva – a szimuláció áll, a folytatás után jelenik meg.`)
    })
    $('csv').addEventListener('click', csv)
    start()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
