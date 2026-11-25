'use strict'
// Digitális kezelési kézikönyv – semleges bemutató („Minta Gépgyár”).
// A gép, a gyártó és a kézikönyv szövege kitalált mintaszöveg. Nincs hálózati kérés: minden a böngészőben készül.
;(() => {
  const $ = (id) => document.getElementById(id)
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  // Szövegjelölés a tartalomban: `kód`, **kiemelés**, [hivatkozás](#horgony)
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(#([a-z0-9-]+)\)/g, '<a href="#$2">$1</a>')
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const isDesktop = () => matchMedia('(min-width: 960px)').matches
  const huDate = (d) => new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const huDateTime = (d) => `${huDate(d)} ${new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' }).format(d)}`

  // ---------------------------------------------------------------------------
  // Adatok: gép, kiadások, gyári számok. Éles bevezetésnél a gyártó saját listája.
  // ---------------------------------------------------------------------------
  const MODEL = 'MV-200 szalagfűrész'
  const VERSIONS = [
    { v: '1.3', date: '2026. 09. 15.', scope: 'A 2026-tól gyártott, feszességjelzővel szerelt gépekre vonatkozik.', changes: [
      'Új: a szalag feszítése a feszességjelzővel.',
      'Új hibakód: `E04`.',
      'Tömített vezetőgörgő-csapágy, új cikkszám. A heti zsírzás elmarad.',
    ] },
    { v: '1.2', date: '2025. 02. 10.', changes: [
      'A hűtőfolyadék-koncentráció havi mérése a karbantartási tervben.',
      'A szalagsebesség-táblázat kiegészült a szerszámacéllal.',
    ] },
    { v: '1.1', date: '2024. 06. 03.', changes: [
      'A vészleállító próbája a műszak előtti ellenőrzésben.',
      'Elírások javítása.',
    ] },
    { v: '1.0', date: '2024. 01. 15.', changes: ['Első kiadás.'] },
  ]
  const UNITS = {
    'MV200-0001': { version: '1.2', built: '2025. 03.', builtText: '2025 márciusában' },
    'MV200-0002': { version: '1.3', built: '2026. 10.', builtText: '2026 októberében' },
  }
  const LATEST = VERSIONS[0].v
  const edition = (v) => VERSIONS.find((e) => e.v === v)
  const cmp = (a, b) => {
    const [x, y] = [a, b].map((s) => s.split('.').map(Number))
    return x[0] - y[0] || x[1] - y[1]
  }

  // ---------------------------------------------------------------------------
  // Tartalom (mintaszöveg). from: ettől a kiadástól, until: eddig a kiadásig látszik.
  // chg: a „from” kiadásban új vagy módosult rész; abban a kiadásban módosítássáv jelöli.
  // ---------------------------------------------------------------------------
  const P = (x, o) => ({ t: 'p', x, ...o })
  const H = (x, id, o) => ({ t: 'h3', x, id, ...o })
  const STEPS = (items, o) => ({ t: 'steps', items, ...o })
  const LIST = (items, o) => ({ t: 'list', items, ...o })
  const CALL = (level, title, x, avoid, o) => ({ t: 'callout', level, title, x, avoid, ...o })
  const TABLE = (o) => ({ t: 'table', ...o })
  const GROUP = (blocks, o) => ({ t: 'group', blocks, ...o })
  const R = (c, o) => ({ c, ...o })
  const LOCKOUT = ['Kapcsolja ki a főkapcsolót.', 'Biztosítsa a saját lakatjával.', 'Ellenőrizze, hogy a START gombra a gép nem indul el.']

  const CHAPTERS = [
    { id: 'biztonsag', title: 'Biztonsági előírások', short: 'Biztonság', blocks: [
      { t: 'sample', x: '**Mintaszöveg.** Valós gépnél itt a gyártó saját biztonsági előírásai állnak. Ez a fejezet csak a megjelenítést mutatja.' },
      H('Rendeltetésszerű használat', 'rendeltetes'),
      P('Az MV-200 fémipari szalagfűrész. Acél, rozsdamentes acél és alumínium rudak, csövek és profilok darabolására készült.'),
      P('Fát, műanyagot és kézben tartott munkadarabot ne vágjon vele. Csak satuba fogott munkadarabbal dolgozzon.'),
      CALL('danger', 'Forgó fűrészszalag', 'A futó szalag súlyos vágási sérülést okoz.', ['Üzem közben ne nyúljon a vágási zónába.', 'A szalagvédő burkolatot csak álló gépnél nyissa ki.']),
      H('Ki kezelheti a gépet?', 'kezelo'),
      P('Csak betanított kezelő dolgozzon a géppel. A betanítást a gép üzemeltetője szervezi.'),
      H('Egyéni védőeszközök', 'vedoeszkozok'),
      LIST(['Védőszemüveg.', 'Hallásvédő.', 'Munkavédelmi cipő.', 'Vágásbiztos kesztyű szalagcseréhez és a forgács kezeléséhez. Futó szalag mellett ne viseljen kesztyűt.']),
      CALL('warning', 'Váratlan indulás', 'Karbantartás közben a gép elindulhat, ha valaki bekapcsolja.', LOCKOUT),
      CALL('caution', 'Éles, forró forgács', 'A forgács vágási és égési sérülést okozhat.', ['Kézzel ne távolítsa el.', 'Használja a mellékelt kefét és forgácshorgot.']),
      H('Vészleállítás', 'veszleallitas'),
      P('A piros vészleállító gomb a kezelőpanel jobb oldalán van. Benyomva a szalag azonnal megáll.'),
      P('Újraindítás előtt szüntesse meg a veszélyt. Ezután fordítsa el a gombot az óramutató járásával egyezően.'),
    ] },
    { id: 'uzembe-helyezes', title: 'Üzembe helyezés', short: 'Üzembe helyezés', blocks: [
      H('Szállítás és emelés', 'szallitas'),
      P('A gép tömege raklappal együtt kb. 230 kg. Villás targoncával vagy raklapemelővel mozgassa, a raklapra rögzítve.'),
      CALL('warning', 'Billenő gép', 'A fűrészkeret miatt a gép súlypontja magasan van.', ['Emelés előtt engedje le a keretet alsó helyzetbe.', 'A gépet csak a jelölt emelési pontoknál emelje.']),
      H('Elhelyezés', 'elhelyezes'),
      LIST(['Sík, teherbíró padló.', 'Körben legalább 0,8 m szabad hely a kezeléshez és a karbantartáshoz.', 'Száraz, fedett helyiség, +5 és +40 °C között.', 'Hosszú anyaghoz görgősort tegyen a gép mindkét oldalára.']),
      H('Műszaki adatok', 'muszaki-adatok'),
      TABLE({ kind: 'kv', caption: 'Műszaki adatok', rows: [
        R(['Vágási kapacitás, 90°', 'kör Ø 200 mm, négyszög 200 × 160 mm']),
        R(['Vágási kapacitás, 45°', 'kör Ø 130 mm']),
        R(['Szalagméret', '2450 × 27 × 0,9 mm']),
        R(['Szalagsebesség', '40 és 80 m/perc']),
        R(['Motor', '1,1 kW, 400 V, 3 fázis']),
        R(['Hűtőfolyadék-tartály', 'kb. 12 liter']),
        R(['Tömeg', '210 kg']),
      ] }),
      H('Villamos bekötés', 'bekotes'),
      P('A gép 400 V-os, háromfázisú hálózatra csatlakozik, 16 A-es biztosítóval.'),
      CALL('warning', 'Áramütés', 'A hibás bekötés életveszélyes.', ['A gépet csak villamos szakember kösse be.', 'A védőföldelést az első bekapcsolás előtt ellenőriztesse.']),
      H('Első indítás', 'elso-inditas'),
      STEPS([
        'Ellenőrizze, hogy a szalagvédő burkolat zárva van.',
        'Kapcsolja be a főkapcsolót.',
        'Nyomja meg röviden a START gombot, majd a STOP gombot.',
        'Nézze meg a szalag futásirányát. A nyíl a szalagvédőn van.',
        'Ha a szalag fordítva fut, kapcsolja ki a gépet. A fázissorrendet villamos szakember cserélje meg.',
      ]),
      H('Hűtő-kenő folyadék feltöltése', 'hutofolyadek'),
      P('A tartály a gép talpában van. Vízzel kevert, emulzióképző folyadékot töltsön bele, a folyadék gyártója által megadott arányban.'),
    ] },
    { id: 'kezeles', title: 'Kezelés', short: 'Kezelés', blocks: [
      H('Kezelőelemek', 'kezeloelemek'),
      TABLE({ kind: 'kv', caption: 'Kezelőelemek', rows: [
        R(['Főkapcsoló', 'A kapcsolószekrény oldalán. 0 = ki, I = be.']),
        R(['START, zöld', 'Elindítja a szalagot és a hűtést.']),
        R(['STOP, fekete', 'Leállítja a szalagot.']),
        R(['Vészleállító, piros', 'Azonnal leállít minden mozgást.']),
        R(['Sebességválasztó', '40 vagy 80 m/perc. Csak álló szalagnál váltson.']),
        R(['Leeresztésszabályzó', 'A fűrészkeret süllyedési sebességét állítja.']),
        R(['Kijelző', 'Hibánál kódot mutat, például `E01`. Lásd: [Hibaelhárítás](#hibaelharitas).']),
      ] }),
      H('Munkadarab befogása', 'befogas'),
      STEPS([
        'Emelje a fűrészkeretet felső helyzetbe.',
        'Tegye a munkadarabot a satupofák közé. A vágás helye legyen a szalag alatt.',
        'Húzza meg a satut a karral. A munkadarab ne mozduljon el.',
      ]),
      CALL('caution', 'Kicsúszó munkadarab', 'A rövid darab vágás közben kifordulhat a satuból.', ['A befogott rész legalább 30 mm legyen.', 'Rövid darabot távtartóval fogjon be.']),
      H('Szalagsebesség választása', 'szalagsebesseg'),
      TABLE({ kind: 'grid', cls: 'speed', caption: 'Szalagsebesség anyagonként', head: ['Anyag', 'Sebesség', 'Megjegyzés'], rows: [
        R(['Szerkezeti acél', '80 m/perc', 'Hűtéssel.']),
        R(['Rozsdamentes acél', '40 m/perc', 'Bő hűtés, lassú leeresztés.']),
        R(['Szerszámacél', '40 m/perc', 'Lassú leeresztés.']),
        R(['Alumínium', '80 m/perc', 'Hűtéssel, a forgácsot gyakran takarítsa.']),
      ] }),
      H('Vágás', 'vagas'),
      STEPS([
        'Állítsa a leeresztésszabályzót középállásba.',
        'Nyomja meg a START gombot.',
        'Oldja ki a keretet. A keret a beállított sebességgel süllyed.',
        'A vágás végén a végálláskapcsoló leállítja a szalagot.',
        'Emelje fel a keretet, és vegye ki a levágott darabot.',
      ]),
      CALL('notice', null, 'Ha a szalag ferdén vág, ne erőltesse a leeresztést. Nézze meg a [Hibaelhárítás](#hibaelharitas) fejezetet.'),
      GROUP([
        H('Szalag feszítése', 'szalag-feszitese'),
        P('A szalag feszességét a feszítőkerékkel állítja. Feszítés után a szalag a két vezető között középen 2–3 mm-re nyomható be.'),
        CALL('caution', 'Rossz szalagfeszesség', 'A laza szalag lefut a kerékről, a túl feszes elszakad.', ['Feszítés után mindig ellenőrizze a benyomódást.']),
      ], { until: '1.2' }),
      GROUP([
        H('Szalag feszítése a feszességjelzővel', 'szalag-feszitese'),
        P('A feszítőkerék mellett feszességjelző van. A mutató zöld mezője a helyes feszesség.'),
        STEPS([
          'Fordítsa a feszítőkereket az óramutató járásával egyezően.',
          'Feszítsen, amíg a mutató a zöld mezőbe ér.',
          'Ha a mutató a piros mezőben áll, lazítson, amíg visszaér a zöldbe.',
        ]),
        P('Piros mezőnél a gép nem indul, a kijelzőn `E04` látható.'),
      ], { from: '1.3', chg: 'Módosult' }),
      H('Szögvágás', 'szogvagas'),
      P('A fűrészkeret 0° és 45° között fordítható. Oldja a rögzítőkart, állítsa be a szöget a skálán, majd húzza meg a kart.'),
      H('Munka végén', 'munka-vegen'),
      LIST(['Kapcsolja ki a főkapcsolót.', 'Távolítsa el a forgácsot kefével.', 'Ha a gép egy napnál tovább áll, lazítsa meg a szalagot.']),
    ] },
    { id: 'karbantartas', title: 'Karbantartás', short: 'Karbantartás', blocks: [
      CALL('warning', 'Váratlan indulás', 'Karbantartás közben a gép elindulhat, ha valaki bekapcsolja.', LOCKOUT),
      H('Karbantartási terv', 'karbantartasi-terv'),
      TABLE({ kind: 'stack', cls: 'maint', caption: 'Karbantartási terv', head: ['Időköz', 'Teendő', 'Ki végzi'], rows: [
        R(['Minden műszak előtt', 'A szalag és a fogak szemrevételezése. A vészleállító próbája.', 'Kezelő']),
        R(['Minden műszak után', 'A forgács eltávolítása, a szalagvezetők tisztítása.', 'Kezelő']),
        R(['Hetente', 'A vezetőgörgők zsírzása. A szalagtisztító kefe ellenőrzése.', 'Kezelő'], { until: '1.2' }),
        R(['Hetente', 'A vezetőgörgők és a szalagtisztító kefe ellenőrzése. A tömített csapágyat nem kell zsírozni.', 'Kezelő'], { from: '1.3', chg: 'Módosult' }),
        R(['Havonta', 'A hűtőfolyadék-koncentráció mérése refraktométerrel. Előírt érték: 5–8 %.', 'Kezelő']),
        R(['500 üzemóránként', 'A hajtómű olajszintjének ellenőrzése.', 'Karbantartó']),
        R(['2000 üzemóránként vagy évente', 'A hajtóműolaj cseréje.', 'Karbantartó']),
        R(['Évente', 'Villamos biztonsági felülvizsgálat.', 'Villamos szakember']),
      ] }),
      H('Szalagcsere', 'szalagcsere'),
      STEPS([
        'Kapcsolja ki és biztosítsa a főkapcsolót.',
        'Emelje a keretet felső helyzetbe, és nyissa ki a szalagvédőt.',
        'Lazítsa meg a szalagot a feszítőkerékkel.',
        'Vegye le a szalagot a kerekekről. Viseljen vágásbiztos kesztyűt.',
        'Tegye fel az új szalagot. A fogak a futásirányba mutassanak.',
        'Feszítse meg a szalagot. Lásd: [Szalag feszítése](#szalag-feszitese).',
        'Zárja be a szalagvédőt, és járassa a gépet egy percig terhelés nélkül.',
      ]),
      CALL('notice', null, 'Új szalaggal az első vágásokat fél leeresztési sebességgel végezze. Így a fogak tovább élnek.'),
    ] },
    { id: 'hibaelharitas', title: 'Hibaelhárítás', short: 'Hibaelhárítás', blocks: [
      P('Ha a hiba a táblázat alapján nem szűnik meg, kapcsolja ki a gépet, és értesítse a karbantartót.'),
      TABLE({ kind: 'stack', cls: 'fault', caption: 'Hibaelhárítási táblázat', head: ['Hiba', 'Lehetséges ok', 'Teendő'], rows: [
        R(['`E01` A gép nem indul', 'A vészleállító be van nyomva.', 'Szüntesse meg a veszélyt. Fordítsa el a vészleállítót, és nyomja meg a START gombot.']),
        R(['`E02` A gép nem indul', 'A szalagvédő burkolat nyitva van.', 'Zárja be a burkolatot. A reteszkapcsoló kattanjon.']),
        R(['`E03` A gép vágás közben leáll', 'Túlterhelés miatt kioldott a motorvédő.', 'Várjon 5 percet. Csökkentse a leeresztési sebességet, és indítsa újra.']),
        R(['`E04` A gép nem indul', 'A szalag feszessége nincs a zöld mezőben.', 'Állítsa be a feszességet a jelző szerint. Lásd: [Szalag feszítése](#szalag-feszitese).'], { from: '1.3', chg: 'Új' }),
        R(['Ferde vágás', 'Kopott szalag, túl gyors leeresztés vagy távol álló vezetőkar.', 'Cseréljen szalagot. Lassítsa a leeresztést. Tolja a vezetőkart a munkadarabhoz.']),
        R(['A szalag lefut a kerékről', 'Laza szalag vagy kopott vezetőgörgő.', 'Feszítse meg a szalagot. Ellenőrizze a görgőket.']),
        R(['A szalag gyakran elszakad', 'Túl feszes szalag, vagy vékony falhoz túl durva fogosztás.', 'Lazítson a feszítésen. Vékony falú anyaghoz finomabb fogosztású szalagot használjon.']),
        R(['Erős rezgés vagy zaj', 'Laza befogás vagy sérült fogak.', 'Húzza meg a satut. Nézze át a szalagot.']),
        R(['Kevés hűtőfolyadék a vágásnál', 'Alacsony szint vagy eltömődött szűrő.', 'Töltse fel a tartályt. Tisztítsa ki a szűrőt.']),
      ] }),
      P('A szervizhez készítse elő a gép gyári számát és a kijelzőn látható hibakódot.'),
    ] },
    { id: 'alkatreszek', title: 'Alkatrészek', short: 'Alkatrészek', blocks: [
      P('Alkatrészt a cikkszámmal és a gép gyári számával rendeljen.'),
      TABLE({ kind: 'stack', cls: 'parts', caption: 'Alkatrészlista', head: ['Megnevezés', 'Cikkszám', 'Megjegyzés'], rows: [
        R(['Fűrészszalag, bimetál, 6/10 fog/col', '`MV2-SZ-2450-610`', 'Általános acélvágáshoz.']),
        R(['Fűrészszalag, bimetál, 10/14 fog/col', '`MV2-SZ-2450-1014`', 'Vékony falú csőhöz és profilhoz.']),
        R(['Vezetőgörgő-csapágy', '`MV2-CS-6202`', '4 db gépenként.'], { until: '1.2' }),
        R(['Vezetőgörgő-csapágy, tömített', '`MV2-CS-6202-2RS`', '4 db gépenként. Nem kell zsírozni.'], { from: '1.3', chg: 'Módosult' }),
        R(['Szalagfeszesség-jelző', '`MV2-FJ-01`', ''], { from: '1.3', chg: 'Új' }),
        R(['Szalagtisztító kefe', '`MV2-KF-01`', '']),
        R(['Satupofa', '`MV2-SP-200`', '2 db gépenként.']),
        R(['Hűtőfolyadék-szivattyú', '`MV2-HSZ-40`', '']),
        R(['Szalagvédő reteszkapcsoló', '`MV2-RK-02`', 'Csak villamos szakember cserélje.']),
      ] }),
    ] },
  ]
  const AUX = [{ id: 'valtozatok', title: 'Kiadások' }, { id: 'papir', title: 'Papír példány' }]

  // ---------------------------------------------------------------------------
  // Megjelenítés
  // ---------------------------------------------------------------------------
  const shown = (b, v) => (!b.from || cmp(v, b.from) >= 0) && (!b.until || cmp(v, b.until) <= 0)
  const isChange = (b, v) => Boolean(b.chg && b.from === v)
  // „a v1.3-ban”, „a v1.2-ben”: a rag a kimondott utolsó számjegyhez illeszkedik
  const inSuffix = (v) => ('036'.includes(v.at(-1)) || v.at(-1) === '8' ? 'ban' : 'ben')
  const chgTag = (b) => `<span class="chg-tag" data-nosearch>${esc(b.chg)} a v${esc(b.from)}-${inSuffix(b.from)}</span>`
  const ALERT = '<svg viewBox="0 0 22 20" aria-hidden="true"><path d="M11 1.5L21 18.5H1z" fill="currentColor"/><path d="M11 7.5v5.2" stroke="var(--c)" stroke-width="2.2" stroke-linecap="round"/><circle cx="11" cy="15.4" r="1.3" fill="var(--c)"/></svg>'
  const SIGNAL = { danger: 'Veszély', warning: 'Figyelmeztetés', caution: 'Vigyázat', notice: 'Megjegyzés' }

  function blocksHtml(blocks, v, ctx) {
    let out = ''
    for (const b of blocks) {
      if (!shown(b, v)) continue
      const changed = isChange(b, v)
      const cls = changed ? ' class="chg"' : ''
      switch (b.t) {
        case 'sample': out += `<p class="sample">${inline(b.x)}</p>`; break
        case 'p': out += `<p${cls}>${inline(b.x)}${changed ? chgTag(b) : ''}</p>`; break
        case 'h3': {
          ctx.n += 1
          const tag = ctx.tag || (changed ? chgTag(b) : '')
          ctx.tag = ''
          out += `<h3 id="${b.id}"${cls}><span class="n">${ctx.ch}.${ctx.n}</span><span>${inline(b.x)}</span>${tag}</h3>`
          break
        }
        case 'steps': out += `<ol class="steps">${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`; break
        case 'list': out += `<ul class="bullets">${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`; break
        case 'callout':
          out += `<div class="callout ${b.level}${changed ? ' chg' : ''}" role="note"><p class="signal">${b.level === 'notice' ? '' : ALERT}<span>${SIGNAL[b.level]}</span></p><div class="callout-body">${b.title ? `<p class="hazard">${inline(b.title)}</p>` : ''}<p>${inline(b.x)}</p>${b.avoid ? `<ul>${b.avoid.map((a) => `<li>${inline(a)}</li>`).join('')}</ul>` : ''}</div></div>`
          break
        case 'table': out += tableHtml(b, v); break
        case 'group':
          if (changed) ctx.tag = chgTag(b)
          out += changed ? `<div class="chg">${blocksHtml(b.blocks, v, ctx)}</div>` : blocksHtml(b.blocks, v, ctx)
          break
      }
    }
    return out
  }
  function tableHtml(b, v) {
    const rows = b.rows.filter((r) => shown(r, v))
    const tr = (r) => (isChange(r, v) ? ' class="chg"' : '')
    if (b.kind === 'kv') {
      return `<table class="tbl kv"><caption class="sr-only">${esc(b.caption)}</caption><tbody>${rows.map((r) => `<tr${tr(r)}><th scope="row">${inline(r.c[0])}${isChange(r, v) ? chgTag(r) : ''}</th><td>${inline(r.c[1])}</td></tr>`).join('')}</tbody></table>`
    }
    const head = `<thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>`
    const body = rows.map((r) => `<tr${tr(r)}>${r.c.map((c, i) => `<td${i ? ` data-label="${esc(b.head[i])}"` : ''}>${inline(c) || '–'}${!i && isChange(r, v) ? chgTag(r) : ''}</td>`).join('')}</tr>`).join('')
    // „stack”: keskeny kijelzőn soronként egymás alá rendezett táblázat; „grid”: mindig táblázat
    return `<table class="tbl ${b.kind === 'stack' ? 'stack ' : ''}${b.cls || ''}"><caption class="sr-only">${esc(b.caption)}</caption>${head}<tbody>${body}</tbody></table>`
  }
  function manualHtml(v) {
    return '<p class="sample"><strong>Mintaszöveg.</strong> A gép, a gyártó és a kézikönyv tartalma kitalált. Valós gép kezeléséhez nem használható.</p>' +
      CHAPTERS.map((ch, i) => `<section class="chapter" id="${ch.id}"><h2><span class="n">${i + 1}</span><span>${esc(ch.title)}</span></h2>${blocksHtml(ch.blocks, v, { ch: i + 1, n: 0, tag: '' })}</section>`).join('')
  }
  function versionsHtml(sn, unit) {
    const ed = edition(unit.version)
    const older = cmp(unit.version, LATEST) < 0
    const newer = VERSIONS.filter((e) => cmp(e.v, unit.version) > 0)
    const items = VERSIONS.filter((e) => cmp(e.v, unit.version) <= 0).map((e) => `<li${e.v === unit.version ? ' class="current"' : ''}><span class="v">v${esc(e.v)}</span><div><span class="meta">Kiadva: ${esc(e.date)}</span>${e.v === unit.version ? '<span class="this">ez a kézikönyv</span>' : ''}<ul>${e.changes.map((c) => `<li>${inline(c)}</li>`).join('')}</ul></div></li>`).join('')
    const newerItems = newer.map((e) => `<li class="newer"><span class="v">v${esc(e.v)}</span><div><span class="meta">Kiadva: ${esc(e.date)}. Nem ehhez a géphez tartozik.</span>${e.scope ? `<p class="scope">${esc(e.scope)}</p>` : ''}</div></li>`).join('')
    return `<h2>Kiadások és változások</h2>
<p class="cur-ed">Az <span class="mono">${esc(sn)}</span> gyári számú géphez a <strong>v${esc(ed.v)}</strong> kiadás tartozik. Kiadva: ${esc(ed.date)}</p>
${older ? `<div class="older-note"><p><strong>Van újabb kiadás (v${esc(LATEST)}), de az nem erre a gépre vonatkozik.</strong></p><p>${esc(VERSIONS[0].scope)} Ez a gép ${esc(unit.builtText)} készült, ezért a v${esc(unit.version)} tartozik hozzá.</p></div>` : ''}
<ol class="log">${newerItems}${items}</ol>`
  }
  function qrSvg(text, cls) {
    if (typeof window.qrcode !== 'function') return `<span class="qr-fallback">${esc(text)}</span>`
    const qr = window.qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount(), m = 4, size = n + m * 2
    let d = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue
        let e = c
        while (e + 1 < n && qr.isDark(r, e + 1)) e++
        d += `M${c + m} ${r + m}h${e - c + 1}v1h-${e - c + 1}z`
        c = e
      }
    }
    return `<svg class="${cls || 'qr'}" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR-kód: ${esc(text)}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1c2320"/></svg>`
  }
  const unitUrl = (sn) => {
    const u = new URL(location.href)
    u.search = `?sn=${encodeURIComponent(sn)}`
    u.hash = ''
    return u.href
  }
  const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="M5.8 10.2l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" stroke-width="2"/></svg>'
  function plateHtml(sn, unit) {
    const ed = edition(unit.version)
    const older = cmp(unit.version, LATEST) < 0
    const status = older
      ? `<strong>Ez a kiadás tartozik ehhez a gyári számhoz.</strong> Van újabb (v${esc(LATEST)}), de az más gépekre vonatkozik. <a href="#valtozatok">Miért?</a>`
      : '<strong>Ez a kiadás tartozik ehhez a gyári számhoz.</strong> Ez a legújabb kiadás.'
    const cells = [
      ['sn', 'Gyári szám', sn],
      ['', 'Kézikönyv', `v${ed.v}`],
      ['', 'Kiadva', ed.date],
      ['', 'Gyártva', unit.built],
    ]
    return `<div class="plate-head"><h1 id="plateTitle">${esc(MODEL)}<span class="doc">Kezelési kézikönyv</span></h1></div>
<dl class="plate-cells">${cells.map(([c, k, v]) => `<div${c ? ` class="${c}"` : ''}><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<div class="plate-qr">${qrSvg(unitUrl(sn))}<span>A gépen lévő kód</span></div>
<p class="plate-status">${CHECK}<span>${status}</span></p>`
  }

  // ---------------------------------------------------------------------------
  // Gépválasztó: QR-kód nélküli megnyitás vagy ismeretlen gyári szám
  // ---------------------------------------------------------------------------
  function showChooser(badSn) {
    $('chooserView').hidden = false
    if (badSn) {
      const err = $('snError')
      err.hidden = false
      err.innerHTML = `<p><strong>Ehhez a gyári számhoz nincs kézikönyv:</strong> <span class="mono">${esc(badSn)}</span></p><p>Ellenőrizze a számot a gép adattábláján, vagy válasszon alább.</p>`
    }
    $('units').innerHTML = Object.entries(UNITS).map(([sn, u]) => {
      const ed = edition(u.version)
      const url = unitUrl(sn)
      return `<li><a class="unit" href="?sn=${encodeURIComponent(sn)}"><span class="unit-qr" aria-hidden="true">${qrSvg(url)}</span><span class="unit-info"><span class="unit-model">${esc(MODEL)}</span><span class="unit-sn">${esc(sn)}</span><span class="unit-ed">Kézikönyv <span class="mono">v${esc(ed.v)}</span>, ${esc(ed.date)}</span><span class="open">Kézikönyv megnyitása</span><span class="unit-url">${esc(url)}</span></span></a></li>`
    }).join('')
  }

  // ---------------------------------------------------------------------------
  // Kézikönyv-nézet
  // ---------------------------------------------------------------------------
  let state = null
  function showReader(sn, unit) {
    state = { sn, unit, v: unit.version }
    document.title = `${sn} – MV-200 kézikönyv v${unit.version} • Minta Gépgyár demó`
    $('readerView').hidden = false
    $('plate').innerHTML = plateHtml(sn, unit)
    $('manual').innerHTML = manualHtml(unit.version)
    $('valtozatok').innerHTML = versionsHtml(sn, unit)
    $('toc').innerHTML = CHAPTERS.map((ch, i) => `<li data-id="${ch.id}"><a href="#${ch.id}"><span class="n">${i + 1}</span><span class="t">${esc(ch.title)}</span><span class="hits" aria-hidden="true"></span></a></li>`).join('') +
      AUX.map((a) => `<li class="aux" data-id="${a.id}"><a href="#${a.id}"><span class="t">${esc(a.title)}</span></a></li>`).join('')
    $('pSerial').value = sn
    setPageStyle(sn, unit)
    setupRail()
    setupSearch()
    setupPaper()
    $('printBtn').addEventListener('click', () => window.print())
    $('downloadBtn').addEventListener('click', download)
    if (location.hash) {
      let hashId = location.hash.slice(1)
      try { hashId = decodeURIComponent(hashId) } catch { /* hibás %-kódolás: a nyers hash marad */ }
      const target = document.getElementById(hashId)
      if (target) requestAnimationFrame(() => target.scrollIntoView())
    }
  }

  // Nyomtatás: futófej és oldalszám (Chromium-alapú böngészőkben az oldalmargóba kerül)
  function setPageStyle(sn, unit) {
    const css = (s) => `"${String(s).replace(/["\\]/g, '\\$&')}"`
    const ed = edition(unit.version)
    const box = 'font-family: "DM Sans", "DM Sans Fallback", sans-serif; font-size: 8pt; color: #515c56;'
    const style = document.createElement('style')
    style.id = 'pageStyle'
    style.textContent = `@page { @top-left { content: ${css(`${MODEL} – ${sn}`)}; ${box} } @top-right { content: ${css(`Kézikönyv v${ed.v}, ${ed.date}`)}; ${box} } @bottom-left { content: ${css('Bemutató – mintaszöveg, kitalált gép és gyártó')}; ${box} } @bottom-right { content: counter(page) " / " counter(pages); ${box} } }`
    document.head.append(style)
  }

  // Ragadó fejezetsáv: a magassága adja a horgonyok eltolását, az aktuális fejezet kiemelve
  function setupRail() {
    const rail = $('rail')
    const toc = $('tocNav')
    const links = [...$('toc').querySelectorAll('a')]
    const sections = [...CHAPTERS.map((c) => c.id), ...AUX.map((a) => a.id)].map((id) => $(id))
    const setH = () => document.documentElement.style.setProperty('--rail-h', isDesktop() ? '0px' : `${rail.offsetHeight}px`)
    setH()
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(rail)
    addEventListener('resize', setH)
    let current = null, ticking = false
    const update = () => {
      ticking = false
      const off = (isDesktop() ? 0 : rail.offsetHeight) + 28
      let active = null
      for (const s of sections) if (s.getBoundingClientRect().top - off <= 0) active = s
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2 && sections.at(-1).getBoundingClientRect().top < innerHeight) active = sections.at(-1)
      const id = active ? active.id : null
      if (id === current) return
      current = id
      for (const a of links) {
        if (a.getAttribute('href') === `#${id}`) {
          a.setAttribute('aria-current', 'location')
          if (!isDesktop()) {
            const tr = toc.getBoundingClientRect(), ar = a.getBoundingClientRect()
            if (ar.left < tr.left || ar.right > tr.right - 28) toc.scrollBy({ left: ar.left - tr.left - 8, behavior: reduceMotion() ? 'auto' : 'smooth' })
          }
        } else a.removeAttribute('aria-current')
      }
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }, { passive: true })
    update()
    const toggle = $('searchToggle')
    toggle.addEventListener('click', () => {
      const open = !rail.classList.contains('open')
      rail.classList.toggle('open', open)
      toggle.setAttribute('aria-expanded', String(open))
      if (open) $('q').focus()
    })
  }

  // ---------------------------------------------------------------------------
  // Teljes szöveges keresés: ékezet- és kisbetű-független, a találatok kiemelve
  // ---------------------------------------------------------------------------
  const fold = (s) => {
    let out = ''
    const map = []
    for (let i = 0; i < s.length; i++) {
      const f = s[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      for (let k = 0; k < f.length; k++) { out += f[k]; map.push(i) }
    }
    return { out, map }
  }
  let marks = [], hit = -1
  function clearMarks() {
    for (const m of marks) {
      const parent = m.parentNode
      if (!parent) continue
      parent.replaceChild(document.createTextNode(m.textContent), m)
      parent.normalize()
    }
    marks = []
    hit = -1
  }
  function highlight(root, q) {
    const nodes = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('[data-nosearch]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    while (walker.nextNode()) nodes.push(walker.currentNode)
    const found = []
    for (const node of nodes) {
      const text = node.nodeValue
      const { out, map } = fold(text)
      let idx = out.indexOf(q)
      if (idx < 0) continue
      const frag = document.createDocumentFragment()
      let last = 0
      while (idx >= 0) {
        const s = map[idx], e = map[idx + q.length - 1] + 1
        if (s > last) frag.append(text.slice(last, s))
        const m = document.createElement('mark')
        m.textContent = text.slice(s, e)
        frag.append(m)
        found.push(m)
        last = e
        idx = out.indexOf(q, idx + q.length)
      }
      if (last < text.length) frag.append(text.slice(last))
      node.replaceWith(frag)
    }
    return found
  }
  function setupSearch() {
    const input = $('q'), status = $('searchStatus'), rail = $('rail')
    const prev = $('prevHit'), next = $('nextHit')
    let timer = 0, pending = false
    const counts = (perChapter) => {
      for (const li of $('toc').querySelectorAll('li[data-id]')) {
        const n = perChapter ? perChapter[li.dataset.id] || 0 : 0
        const badge = li.querySelector('.hits')
        if (badge) badge.textContent = n ? String(n) : ''
        li.classList.toggle('nohit', Boolean(perChapter) && !n)
      }
      rail.classList.toggle('searching', Boolean(perChapter))
    }
    const chapterOf = (m) => CHAPTERS.find((c) => c.id === m.closest('.chapter')?.id)
    const go = (i, jump) => {
      if (!marks.length) return
      if (hit >= 0) marks[hit].classList.remove('now')
      hit = (i + marks.length) % marks.length
      const m = marks[hit]
      m.classList.add('now')
      const ch = chapterOf(m)
      const chapters = new Set(marks.map((x) => x.closest('.chapter')?.id)).size
      status.textContent = `${marks.length} találat ${chapters} fejezetben. Most: ${hit + 1} / ${marks.length}, ${ch ? ch.title : ''}.`
      if (jump) m.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
    }
    const run = (jump) => {
      clearMarks()
      const raw = input.value.trim().replace(/\s+/g, ' ')
      const q = fold(raw).out
      prev.disabled = next.disabled = true
      if (!q) { status.textContent = ''; counts(null); return }
      if (q.length < 2) { status.textContent = 'Írjon be legalább 2 karaktert.'; counts(null); return }
      marks = highlight($('manual'), q)
      const per = {}
      for (const m of marks) { const id = m.closest('.chapter')?.id; if (id) per[id] = (per[id] || 0) + 1 }
      counts(per)
      if (!marks.length) { status.textContent = `Nincs találat erre: „${raw}”. Próbáljon rövidebb vagy más szót.`; return }
      prev.disabled = next.disabled = marks.length < 2
      go(0, jump)
    }
    input.addEventListener('input', () => {
      clearTimeout(timer)
      pending = true
      timer = setTimeout(() => { pending = false; run(true) }, 200)
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Enter: ha a szöveg változott, új keresés; különben a következő (Shift+Enter: az előző) találat
        if (pending || !marks.length) { clearTimeout(timer); pending = false; run(true) }
        else go(hit + (e.shiftKey ? -1 : 1), true)
      } else if (e.key === 'Escape') {
        input.value = ''
        run(false)
        if (!isDesktop() && rail.classList.contains('open')) {
          rail.classList.remove('open')
          $('searchToggle').setAttribute('aria-expanded', 'false')
          $('searchToggle').focus()
        }
      }
    })
    input.addEventListener('search', () => { if (!input.value) run(false) })
    prev.addEventListener('click', () => go(hit - 1, true))
    next.addEventListener('click', () => go(hit + 1, true))
  }

  // ---------------------------------------------------------------------------
  // Letöltés: egyetlen, önálló HTML-fájl offline használatra (szkript nélkül)
  // ---------------------------------------------------------------------------
  const FONTS = [['DM Sans', 400, 'dm-sans-400'], ['DM Sans', 500, 'dm-sans-500'], ['DM Sans', 600, 'dm-sans-600'], ['JetBrains Mono', 400, 'jetbrains-mono-400'], ['JetBrains Mono', 500, 'jetbrains-mono-500']]
  const toDataUrl = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
  async function embeddedFonts() {
    const rules = await Promise.all(FONTS.map(async ([family, weight, file]) => {
      try {
        const res = await fetch(new URL(`./fonts/${file}.woff2`, location.href))
        if (!res.ok) return ''
        const data = await toDataUrl(await res.blob())
        return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(${data}) format("woff2")}`
      } catch { return '' }
    }))
    return rules.join('\n')
  }
  function pageCss() {
    const sheet = [...document.styleSheets].find((s) => s.href && s.href.includes('style.css'))
    if (!sheet) return ''
    // a webes betűfájl-hivatkozások kimaradnak; a betűk beágyazva érkeznek
    return [...sheet.cssRules].filter((r) => !(r instanceof CSSFontFaceRule) || r.cssText.includes('local(')).map((r) => r.cssText).join('\n')
  }
  async function download() {
    const btn = $('downloadBtn'), msg = $('actionStatus')
    btn.disabled = true
    msg.textContent = 'A letölthető fájl készül…'
    try {
      const { sn, unit } = state
      const ed = edition(unit.version)
      const now = new Date()
      const css = `${await embeddedFonts()}\n${pageCss()}\n${$('pageStyle').textContent}`
      const name = `MV-200_kezikonyv_${sn}_v${ed.v}.html`
      const mfr = document.querySelector('.mfr').outerHTML
      const toc = `<nav class="toc-static" aria-label="Fejezetek"><h2>Tartalom</h2><ol>${CHAPTERS.map((c) => `<li><a href="#${c.id}">${esc(c.title)}</a></li>`).join('')}<li><a href="#valtozatok">Kiadások és változások</a></li></ol></nav>`
      const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(`${MODEL} – kezelési kézikönyv – ${sn} – v${ed.v}`)}</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>
<body class="offline">${mfr}<main><section class="plate" aria-labelledby="plateTitle">${plateHtml(sn, unit)}</section>
<p class="offline-note">Offline példány, letöltve: ${esc(huDate(now))}. Internet nélkül is megnyitható. A gépen lévő QR-kód mindig a géphez tartozó aktuális kiadást nyitja meg.</p>
${toc}<article>${manualHtml(unit.version)}</article><section class="chapter" id="valtozatok">${versionsHtml(sn, unit)}</section></main></body></html>`
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      msg.textContent = `Letöltve: ${name}. Internet nélkül is megnyitható.`
    } catch (err) {
      msg.textContent = 'A letöltés nem sikerült. Próbálja a „Nyomtatás / mentés PDF-be” gombot.'
      console.warn(err)
    } finally {
      btn.disabled = false
    }
  }

  // ---------------------------------------------------------------------------
  // Papíralapú példány igénylése – bemutató: semmit nem küld el
  // ---------------------------------------------------------------------------
  function setupPaper() {
    const form = $('paperForm'), result = $('paperResult'), status = $('paperStatus')
    const F = { name: $('pName'), company: $('pCompany'), serial: $('pSerial'), zip: $('pZip'), city: $('pCity'), street: $('pStreet') }
    const err = (el, text) => {
      el.setAttribute('aria-invalid', text ? 'true' : 'false')
      const box = $(`${el.id}Err`)
      if (box) box.textContent = text
    }
    const check = () => {
      const v = Object.fromEntries(Object.entries(F).map(([k, el]) => [k, el.value.trim()]))
      v.serial = v.serial.toUpperCase()
      const problems = []
      const need = (el, ok, text) => { err(el, ok ? '' : text); if (!ok) problems.push(el) }
      need(F.name, v.name.length > 1, 'Adja meg a nevét.')
      need(F.serial, Boolean(UNITS[v.serial]), v.serial ? 'Ismeretlen gyári szám. A bemutatóban: MV200-0001 vagy MV200-0002.' : 'Adja meg a gép gyári számát.')
      need(F.zip, /^\d{4}$/.test(v.zip), 'Négyjegyű irányítószámot adjon meg.')
      need(F.city, v.city.length > 1, 'Adja meg a települést.')
      need(F.street, v.street.length > 2, 'Adja meg az utcát és a házszámot.')
      return { v, problems }
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const { v, problems } = check()
      if (problems.length) {
        result.hidden = true
        status.textContent = problems.length === 1 ? 'Egy mezőt javítani kell.' : `${problems.length} mezőt javítani kell.`
        problems[0].focus()
        return
      }
      status.textContent = ''
      const unit = UNITS[v.serial], ed = edition(unit.version)
      const rows = [
        ['Tárgy', `Papíralapú kézikönyv igénylése – ${v.serial}`],
        ['Gép', MODEL],
        ['Gyári szám', v.serial],
        ['Nyomtatandó kiadás', `v${ed.v}, ${ed.date}`],
        ['Név', v.name],
        ['Cég', v.company || '–'],
        ['Postacím', `${v.zip} ${v.city}, ${v.street}`],
        ['Igényelve', huDateTime(new Date())],
      ]
      result.innerHTML = `<h3 id="receiptTitle">Ezt kapná meg a gyártó</h3><dl>${rows.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${k === 'Gyári szám' ? `<span class="mono">${esc(val)}</span>` : esc(val)}</dd></div>`).join('')}</dl><p class="demo-foot"><strong>Bemutató:</strong> az igénylés nem lett elküldve, és sehol sincs tárolva. Éles rendszerben a gyártó által választott helyre érkezik, például e-mailben.</p>`
      result.hidden = false
      result.focus()
    })
    for (const el of Object.values(F)) el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') err(el, '') })
    $('paperSample').addEventListener('click', () => {
      F.name.value = 'Minta Kezelő'
      F.company.value = 'Minta Üzem Kft.'
      F.serial.value = state.sn
      F.zip.value = '1111'
      F.city.value = 'Budapest'
      F.street.value = 'Minta utca 1.'
      for (const el of Object.values(F)) err(el, '')
      status.textContent = 'Példaadatok kitöltve.'
    })
  }

  // ---------------------------------------------------------------------------
  // Indítás: ?sn=… a gépen lévő QR-kódból
  // ---------------------------------------------------------------------------
  function start() {
    if (isDesktop()) $('owner').open = true
    const raw = new URLSearchParams(location.search).get('sn')
    const sn = raw ? raw.trim().toUpperCase() : ''
    if (sn && UNITS[sn]) showReader(sn, UNITS[sn])
    else showChooser(raw ? raw.trim().slice(0, 40) : '')
    // az átmenetek csak a felhasználó műveletére induljanak, a kezdeti nyitásra ne
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')))
  }
  start()
})()
