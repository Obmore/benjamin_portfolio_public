'use strict'
// Tudáslap – műszaki tudás a gép mellett (bemutató, „Minta Fémmegmunkáló Üzem”).
// Az üzem, a gép, a frekvenciaváltó, a személyek és a lapok szövege kitalált mintaszöveg. Nincs hálózati kérés: minden a böngészőben készül.
;(() => {
  const $ = (id) => document.getElementById(id)
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------------------------------------------------------------------------
  // Adatok: a lapok azonosítója (ez van a QR-kódban) és verziói. A QR-kód a lap azonosítójához kötött,
  // nem a verzióhoz: új verziónál a kód ugyanaz marad.
  // ---------------------------------------------------------------------------
  const PLANT = 'Minta Fémmegmunkáló Üzem'
  const BADGE = 'Bemutató – kitalált üzem és gép, mintaadatok'
  const AUTHOR = { who: 'Minta Mihály (kitalált)', role: 'tapasztalt kolléga' }
  const RECORDER = { who: 'Minta Réka (kitalált)', role: 'új kolléga' }
  const MACHINE = '1. sz. szállítószalag, kb. 2,2 kW-os háromfázisú aszinkronmotorral és frekvenciaváltóval (kitalált típus: FV-22)'

  const SHEETS = [
    {
      id: 'atallas', no: 1, nav: 'Átállás', title: 'Átállás termékváltáskor', sub: 'Szalagsebesség és rámpaidők beállítása',
      blurb: 'Lépésről lépésre: a szalag sebessége és indítása, leállítása a következő termékhez.',
      version: '1.1', date: '2026. 10. 19.',
      log: [
        { v: '1.1', date: '2026. 10. 19.', notes: ['A mintatáblázat kiegészült a nehéz csapágyház termékkel.', 'Új kulcspont: a termékpróba két darabbal történik.', 'A QR-kód nem változott.'] },
        { v: '1.0', date: '2026. 09. 21.', notes: ['Első kiadás.'] },
      ],
    },
    {
      id: 'hibakereses', no: 2, nav: 'Hibakeresési fa', title: 'Hibakeresési fa', sub: 'Indításkor túláramhibával leold',
      blurb: 'A tünettől a teendőig: mit nézz meg, milyen sorrendben, és mikor kell szakember.',
      version: '1.1', date: '2026. 10. 26.',
      log: [
        { v: '1.1', date: '2026. 10. 26.', notes: ['Új mellékág: lassításkor túlfeszültség-hiba.', 'A záró ágba bekerült: a védelmet nem szabad megkerülni.', 'A QR-kód nem változott.'] },
        { v: '1.0', date: '2026. 09. 28.', notes: ['Első kiadás.'] },
      ],
    },
    {
      id: 'mirefigyelj', no: 3, nav: 'Mire figyelj', title: 'Mire figyelj', sub: 'Egy pont, egy kártya: biztonság a hajtás körül',
      blurb: 'Öt rövid kártya a frekvenciaváltó és a motor körüli munka előtt.',
      version: '1.1', date: '2026. 11. 02.',
      log: [
        { v: '1.1', date: '2026. 11. 02.', notes: ['Új 4. kártya: a vezérlőkábeleken külső feszültség lehet.', 'A QR-kód nem változott.'] },
        { v: '1.0', date: '2026. 10. 05.', notes: ['Első kiadás, négy kártyával.'] },
      ],
    },
  ]
  const BY_ID = new Map(SHEETS.map((s) => [s.id, s]))

  const NEW11 = '<span class="chg-tag">új a v1.1-ben</span>'
  const link = (id, text) => `<a href="?lap=${id}">${text}</a>`

  // ---------------------------------------------------------------------------
  // Tartalom (mintaszöveg)
  // ---------------------------------------------------------------------------
  const SAFETY_RULE = '<div class="callout" data-sec="Biztonság"><p class="signal"><svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2L1.5 20.5h21z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9v5.5M12 17v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Biztonság</p><div class="callout-body"><p>Védőburkolatot, reteszt vagy védelmet nem szabad áthidalni, kiiktatni vagy kikapcsolni, semmilyen lépés kedvéért.</p><p>Ha a gép nem úgy viselkedik, ahogy a lap írja: állítsd le a megszokott módon, és szólj a tapasztalt kollégának.</p></div></div>'

  const content = {
    atallas: () => `
<p class="lede" data-sec="Bevezető">Ezt a lapot termékváltáskor használd, ha a szalagnak más sebesség vagy más gyorsítás kell. Gép: ${esc(MACHINE)}.</p>
${SAFETY_RULE}
<section class="blk" data-sec="Eszközök és anyagok"><h2>Eszközök és anyagok</h2>
<ul class="bullets">
<li>Az új termék adatlapja a kért szalagsebességgel és rámpaidőkkel.</li>
<li>A frekvenciaváltó kezelőpanelje (billentyűzet és kijelző).</li>
<li>Az átállási napló.</li>
<li>Egy-két darab az új termékből próbának.</li>
<li>Kesztyű és az üzemben előírt védőfelszerelés.</li>
</ul></section>
<section class="blk" data-sec="Lépések"><h2>Lépések</h2>
<table class="tbl stack steps-tbl"><caption class="sr-only">Átállás lépései: fő lépés, kulcspont és az indok</caption>
<thead><tr><th scope="col">Fő lépés</th><th scope="col">Kulcspont</th><th scope="col">Miért</th></tr></thead>
<tbody>
<tr><th scope="row"><span class="n">1</span>Nézd meg az új termék adatlapját.</th>
<td data-label="Kulcspont">Keresd meg a kért szalagsebességet, a gyorsítási és a lassítási időt. Ha valamelyik hiányzik, ne találgass: kérdezd a tapasztalt kollégát.</td>
<td data-label="Miért">Rossz érték mellett a termék megcsúszhat vagy leeshet.</td></tr>
<tr><th scope="row"><span class="n">2</span>Állítsd le a szalagot a megszokott módon, és győződj meg róla, hogy üres.</th>
<td data-label="Kulcspont"><strong class="safety">Biztonság:</strong> a leállítás önmagában nem elég. Ha a szalagnál kézzel kell dolgozni (például tárgyat kivenni vagy vezetőt igazítani), csak leválasztás és kizárás után tedd, a ${link('mirefigyelj', '3. lap, 1. kártya')} szerint. A védőburkolatok a helyükön maradnak, a vészleállító működőképes.</td>
<td data-label="Miért">A mozgó szalag behúzhatja a kezet vagy a ruhát, és a csak leállított szalag is váratlanul elindulhat.</td></tr>
<tr><th scope="row"><span class="n">3</span>Állítsd be a kimeneti frekvencia alapjelét a kezelőpanelen.</th>
<td data-label="Kulcspont">Csak az alapjelet írd át az adatlap szerint. A motor névleges adataihoz és az áramkorláthoz ne nyúlj.</td>
<td data-label="Miért">A szalag sebessége a kimeneti frekvenciával nő. Az áramkorlát és a motoradatok a motort védik, átírásuk villamos szakember dolga.</td></tr>
<tr><th scope="row"><span class="n">4</span>Írd be a gyorsítási és a lassítási időt.</th>
<td data-label="Kulcspont">Az adatlap szerinti értéket használd. Ha a hajtás hibát jelez, ne kapcsold ki a védelmet: nézd meg a ${link('hibakereses', 'hibakeresési fát')}.</td>
<td data-label="Miért">A túl rövid idő megcsúsztatja a terméket, és a hajtás túláramhibával leoldhat.</td></tr>
<tr><th scope="row"><span class="n">5</span>Indítsd el a szalagot üresen, alacsony sebességgel, majd a beállított értéken.</th>
<td data-label="Kulcspont">Senki ne álljon a szalag közelében indításkor. Figyeld a szalag futását és a hangját; ha szokatlan, állítsd le.</td>
<td data-label="Miért">Az üres próba még nem tesz kárt a termékben, és megmutatja, ha valami akad.</td></tr>
<tr><th scope="row"><span class="n">6</span>Próbáld ki két darab termékkel. ${NEW11}</th>
<td data-label="Kulcspont">Nézd meg, hogy nem csúszik és nem borul fel. Ha egy darab megcsúszik vagy felborul, állítsd le a szalagot; benyúlni csak leválasztás és kizárás után szabad (${link('mirefigyelj', '3. lap, 1. kártya')}). Utána hosszabbítsd a rámpát, vagy kérdezd a tapasztalt kollégát.</td>
<td data-label="Miért">Két darabbal kiderül, mi történik, mielőtt a teljes sor ráfut.</td></tr>
<tr><th scope="row"><span class="n">7</span>Írd be az átállási naplóba az új értékeket.</th>
<td data-label="Kulcspont">Dátum, termék, alapjel, gyorsítási és lassítási idő, a neved.</td>
<td data-label="Miért">Ha később gond van, látszik, mi változott; a következő átállásnál nem kell újra kitalálni.</td></tr>
</tbody></table></section>
<section class="blk" data-sec="Mintaadatok"><h2>Mintaadatok</h2>
<p>Példa a kitalált üzem termékeire. A tényleges értéket mindig a termék adatlapja adja.</p>
<table class="tbl stack"><caption class="sr-only">Mintaadatok termékenként</caption>
<thead><tr><th scope="col">Termék (kitalált)</th><th scope="col">Kimeneti frekvencia alapjele</th><th scope="col">Gyorsítási idő</th><th scope="col">Lassítási idő</th></tr></thead>
<tbody>
<tr><th scope="row">Lemezkorong</th><td data-label="Kimeneti frekvencia alapjele">25 Hz</td><td data-label="Gyorsítási idő">4 s</td><td data-label="Lassítási idő">4 s</td></tr>
<tr><th scope="row">Zárt doboz</th><td data-label="Kimeneti frekvencia alapjele">35 Hz</td><td data-label="Gyorsítási idő">6 s</td><td data-label="Lassítási idő">6 s</td></tr>
<tr><th scope="row">Csapágyház (nehéz) ${NEW11}</th><td data-label="Kimeneti frekvencia alapjele">20 Hz</td><td data-label="Gyorsítási idő">8 s</td><td data-label="Lassítási idő">10 s</td></tr>
</tbody></table></section>`,

    hibakereses: () => {
      const branch = (n, title, symptom, check, result, action, extra) => `<li class="branch" data-sec="${esc(title)}">
<h3><span class="n">${n}</span>${title}</h3>${extra || ''}
<dl class="flow">
<div class="f-sym"><dt>Tünet</dt><dd>${symptom}</dd></div>
<div class="f-chk"><dt>Ellenőrzés</dt><dd>${check}</dd></div>
<div class="f-res"><dt>Eredmény</dt><dd>${result}</dd></div>
<div class="f-act"><dt>Teendő</dt><dd>${action}</dd></div>
</dl></li>`
      return `
<p class="lede" data-sec="Bevezető">Kiindulás: a frekvenciaváltó <strong>túláramhibával leold, amikor a szalagot elindítod</strong>. Írd fel a kijelzőn látható hibakódot és az időpontot, mielőtt bármit törölsz. Gép: ${esc(MACHINE)}.</p>
${SAFETY_RULE}
<section class="blk" data-sec="Menete"><h2>Menete, sorrendben</h2>
<p>Haladj felülről lefelé; egy ágat zárj le, mielőtt a következőre térsz. Egy ellenőrzés csak olvasás vagy szemrevételezés, kivéve ahol a lap mást mond.</p>
<ol class="branches">
${branch(1, 'Mechanika', 'Indításkor túláramhiba.',
  'Csak a hálózatról leválasztott és kizárt gépen: próbáld meg kézzel megmozdítani a szalagot. Nézd meg, nincs-e beszorult szalag vagy idegen tárgy, és szabadon forognak-e a görgők és a csapágyak.',
  'Ha a szalag akad, a görgő nehezen forog, vagy tárgyat találsz: ez a hiba oka. Ha minden szabadon mozog: tovább a 2. ágra.',
  'Távolítsd el a tárgyat, a nehezen forgó görgőt vagy csapágyat jelentsd a karbantartásnak. A hibát csak ezután töröld.',
  `<p class="branch-note"><strong class="safety">Biztonság:</strong> a szalaghoz csak leválasztás és kizárás után nyúlj. Lásd ${link('mirefigyelj', '3. lap, 1. kártya')}.</p>`)}
${branch(2, 'Túl rövid gyorsítási idő', 'A tünet marad: a mechanika rendben, a hajtás indításkor mégis leold.',
  'Nézd meg a kezelőpanelen a gyorsítási időt, és vesd össze az utolsó átállási naplóbejegyzéssel és a termék adatlapjával.',
  'Ha az érték rövidebb, mint az adatlapon, vagy mostanában átírták: valószínű ok. Ha egyezik: tovább a 3. ágra.',
  'Állítsd vissza az adatlap szerinti értékre, majd próbáld üres szalaggal, alacsony sebességgel. Az áramkorláthoz ne nyúlj.')}
${branch(3, 'Motoradatok a hajtásban és az adattáblán', 'A tünet marad: az idő rendben, a hajtás még mindig leold.',
  'Olvasd le a motor adattábláját (névleges teljesítmény, feszültség, áram, frekvencia, fordulatszám), és hasonlítsd össze a hajtásban megadott motor névleges adataival. Csak olvasd és hasonlítsd össze, ne írj át semmit.',
  'Ha valamelyik érték eltér: valószínű ok. Ha egyezik: tovább a 4. ágra.',
  'Ne javítsd magad: szólj villamos szakembernek, mert a motoradatok a motor védelmét is meghatározzák.')}
${branch(4, 'Motorkábel és szigetelés', 'A tünet marad: a motoradatok egyeznek.',
  'Ez villamos szakember munkája, leválasztott és kizárt állapotban: a motorkábel és a kapocsdoboz állapota, a szigetelés mérése, földzárlat keresése. Te csak kívülről nézd meg, hogy a kábel nem sérült-e, a szekrényt és a kapocsdobozt ne nyisd ki.',
  'Sérült kábel, nedvesség, gyenge szigetelés vagy földzárlat: a hiba oka. Ha a szakember nem talál hibát: tovább a „Ha egyik sem” ágra.',
  'Ne indítsd újra a szalagot, amíg a villamos szakember meg nem vizsgálta és ki nem javította.')}
</ol></section>
<section class="blk" data-sec="Mellékág"><h2>Mellékág ${NEW11}</h2>
<ol class="branches">
${branch('M', 'Lassításkor túlfeszültség-hibával leold', 'A hajtás nem indításkor, hanem a szalag lassításakor vagy leállításakor oldódik le túlfeszültség-hibával.',
  'Nézd meg a lassítási időt a kezelőpanelen az adatlaphoz képest. A hajtás kézikönyve szerint nézd meg, be van-e kapcsolva a túlfeszültség-szabályozó. Azt, hogy van-e fékellenállás és jó-e az állapota, villamos szakember nézi meg.',
  'Ha a lassítási idő rövidebb az adatlapon szereplőnél: valószínű ok, mert a lassuló motor visszatáplál a hajtás egyenfeszültségű körébe. Ha az idő rendben van: a szabályozó vagy a fékellenállás a gyanús.',
  'Állítsd vissza a lassítási időt az adatlap szerintire. A túlfeszültség-szabályozót ne kapcsold ki; a fékellenállással kapcsolatos munka villamos szakemberé, mert az ellenállás forró lehet.')}
</ol></section>
<section class="blk closing" data-sec="Ha egyik sem"><h2>Ha egyik sem</h2>
<div class="callout"><p class="signal"><svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2L1.5 20.5h21z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9v5.5M12 17v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Állj meg</p><div class="callout-body">
<p class="hazard">Ne próbálkozz tovább.</p>
<ul>
<li>Nézd meg a hajtás kézikönyvében a hibakódot.</li>
<li>Szólj villamos szakembernek, és add át neki a hibakódot, az időpontot és azt, mit ellenőriztél.</li>
<li>A védelmet ne kerüld meg és ne kapcsold ki, az áramkorláthoz ne nyúlj, és ne töröld ismételten a hibát azért, hogy újraindítsd a szalagot. ${NEW11}</li>
</ul></div></div></section>`
    },

    mirefigyelj: () => {
      const card = (n, title, know, why, doIt, tag) => `<li class="card" data-sec="${esc(title)}">
<div class="card-head"><span class="card-n">${n}. pont</span><span class="card-kind">Biztonság</span>${tag || ''}</div>
<h3>${title}</h3>
<dl>
<div><dt>Mit kell tudni</dt><dd>${know}</dd></div>
<div><dt>Miért</dt><dd>${why}</dd></div>
<div><dt>Mit tegyél</dt><dd>${doIt}</dd></div>
</dl></li>`
      return `
<p class="lede" data-sec="Bevezető">Egy pont, egy kártya. Olvasd el, mielőtt a frekvenciaváltó vagy a motor közelében dolgozol. Gép: ${esc(MACHINE)}.</p>
<section class="blk" data-sec="Kártyák"><h2 class="sr-only">Kártyák</h2>
<ol class="cards">
${card(1, 'Leválasztás a hálózatról és kizárás-címkézés',
  'A hajtáson és a motoron mechanikai munkát csak a hálózatról leválasztva, kizárva és megcímkézve szabad végezni. Villamos munkát csak villamos szakképzett személy végezhet, ő is csak leválasztás és kizárás után.',
  'Különben a szalag váratlanul elindulhat, vagy feszültség alatt maradhat valami.',
  'Kapcsold le a hajtást a hálózatról, zárd ki a saját lakatoddal, tedd rá a címkét. A pontos eljárást az üzem kizárási előírása adja, azt kövesd.')}
${card(2, 'A hajtás STOP parancsa nem leválasztás',
  'A STOP gomb vagy parancs csak leállítja a motort. A hajtás és a vezetékei ilyenkor is feszültség alatt maradnak.',
  'Leállított szalagnál könnyű elhinni, hogy biztonságos hozzányúlni. Nem az.',
  'A STOP után is végezd el az 1. kártya szerinti leválasztást és kizárást, mielőtt dolgozol.')}
${card(3, 'A DC-kör kisülési ideje típusonként eltér',
  'A frekvenciaváltó egyenfeszültségű (DC) körében a leválasztás után is maradhat veszélyes feszültség. A kisülési idő típusonként eltér (a gyártók jellemzően 4–15 perc közötti időt adnak meg). Mindig az adott hajtás adattábláján és kézikönyvében szereplő időt vedd, ne ezt a lapot.',
  'A kondenzátorok töltése lassan sül ki, és a szekrény nyitása után már késő.',
  'Várd ki az előírt időt, utána a feszültségmentességet villamos szakember mérje meg. Mérés nélkül ne nyúlj semmihez.')}
${card(4, 'A vezérlőkábeleken külső feszültség lehet',
  'A hajtás vezérlőkábelein (például relékimenet vagy külső vezérlés) a hálózatról való leválasztás után is lehet feszültség, mert egy másik áramkör táplálja őket.',
  'A hajtás leválasztása nem szünteti meg a külső áramkör feszültségét.',
  'Ezeket a vezetékeket is a villamos szakember méri meg és választja le. Ne a jelölés alapján dönts.', NEW11)}
${card(5, 'Csak villamos szakképzett személy dolgozhat rajta',
  'A hajtás szekrényét, a kapocsdobozt és a vezetékeket csak villamos szakképzett személy nyithatja ki. A kezelőpanel használata és a lapon leírt beállítások kezelői feladatok.',
  'A villamos hiba nem látszik, és nem hagy időt a tanulásra.',
  'Ha nem vagy biztos benne, hogy egy feladat a tiéd: állj meg, és szólj a tapasztalt kollégának vagy villamos szakembernek.')}
</ol></section>`
    },
  }

  // ---------------------------------------------------------------------------
  // QR-kód: a böngészőben, a mellékelt qrcode-generator rajzolja SVG-be
  // ---------------------------------------------------------------------------
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
  const sheetUrl = (id) => {
    const u = new URL(location.href)
    u.search = `?lap=${encodeURIComponent(id)}`
    u.hash = ''
    return u.href
  }

  // ---------------------------------------------------------------------------
  // Közös részek
  // ---------------------------------------------------------------------------
  const HOW = `<ol class="how-steps">
<li><strong>A tapasztalt kolléga elmondja és megmutatja.</strong> A gépnél végigmegy a feladaton, és elmondja, mire figyel és miért.</li>
<li><strong>Az új kolléga rögzíti.</strong> Lépésekre, kulcspontokra és indokokra bontva leírja, amit látott és hallott.</li>
<li><strong>A lap a tapasztalt kolléga jóváhagyásával élesedik.</strong> Csak a jóváhagyott verzió jelenik meg a QR-kód mögött; változásnál új verzió készül, a kód ugyanaz marad.</li>
</ol>`
  const DISCLAIMER = '<strong>Mintaszöveg.</strong> A lapok kitalált üzemről, gépről és frekvenciaváltóról szólnak, a nevek, a paraméterek és az értékek nem valósak. Valós gép kezeléséhez, javításához vagy biztonsági útmutatóként nem használhatók. Éles bevezetésnél az üzem saját tartalma, szakembere és jóváhagyása kerül a helyükre; a tartalomért és a jogszabályi megfelelésért az üzem felel.'

  function showChooser(bad) {
    $('chooserView').hidden = false
    document.title = `Tudáslapok • ${PLANT} demó`
    if (bad) {
      const err = $('lapError')
      err.hidden = false
      err.innerHTML = `<p><strong>Ehhez az azonosítóhoz nincs lap:</strong> <span class="mono">${esc(bad)}</span></p><p>Ellenőrizd a QR-kódot, vagy válassz alább.</p>`
    }
    $('sheets').innerHTML = SHEETS.map((s) => {
      const url = sheetUrl(s.id)
      return `<li><a class="sheet-card" href="?lap=${encodeURIComponent(s.id)}"><span class="card-qr" aria-hidden="true">${qrSvg(url)}</span><span class="card-info"><span class="card-no">${s.no}. lap</span><span class="card-title">${esc(s.title)}</span><span class="card-blurb">${esc(s.blurb)}</span><span class="card-ver">Verzió <span class="mono">v${esc(s.version)}</span>, jóváhagyva ${esc(s.date)}</span><span class="open">Lap megnyitása</span><span class="card-url">${esc(url)}</span></span></a></li>`
    }).join('')
    $('how1').innerHTML = HOW
  }

  function statusHtml(s) {
    const cells = [
      ['Készítette', `${AUTHOR.who}, ${AUTHOR.role}`],
      ['Rögzítette', `${RECORDER.who}, ${RECORDER.role}`],
      ['Jóváhagyta', `${AUTHOR.who}, ${AUTHOR.role}`],
      ['Jóváhagyás dátuma', s.date],
      ['Verzió', `v${s.version}`],
    ]
    return `<div class="status-head"><p class="kicker">${s.no}. lap</p><h1 id="sheetTitle">${esc(s.title)}<span class="doc">${esc(s.sub)}</span></h1></div>
<dl class="status-cells">${cells.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<div class="status-qr">${qrSvg(sheetUrl(s.id))}<span>A lap kódja</span></div>
<p class="status-note"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="M5.8 10.2l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" stroke-width="2"/></svg><span><strong>Jóváhagyott, élő verzió.</strong> A QR-kód a lap azonosítójához (<span class="mono">${esc(s.id)}</span>) kötött, ezért új verziónál is ugyanaz.</span></p>`
  }

  function versionsHtml(s) {
    const url = sheetUrl(s.id)
    const items = s.log.map((e, i) => `<li${i === 0 ? ' class="current"' : ''}><span class="v">v${esc(e.v)}</span><div><span class="meta">Jóváhagyva: ${esc(e.date)}, ${esc(AUTHOR.who)}</span>${i === 0 ? '<span class="this">ez a verzió</span>' : ''}<ul>${e.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul><p class="qr-same">QR-kód címe: <span class="mono">?lap=${esc(s.id)}</span>${i === 0 ? ', ugyanaz, mint a régebbi verzióknál' : ''}</p></div></li>`).join('')
    return `<h2 id="verTitle" data-sec="Verziók">Verziók és változások</h2>
<div class="qr-keep"><div class="qr-box">${qrSvg(url)}</div><div><p>A lap QR-kódja nem a verzióhoz, hanem a lap azonosítójához kötött. Ha a tapasztalt kolléga jóváhagy egy új verziót, a gépen lévő matrica ugyanaz marad, és mindig a legújabb jóváhagyott verziót nyitja meg.</p><p class="qr-url mono" data-nosearch>${esc(url)}</p></div></div>
<ol class="log">${items}</ol>`
  }

  // Nyomtatás: futófej és oldalszám (Chromium-alapú böngészőkben az oldalmargóba kerül)
  function setPageStyle(s) {
    const css = (x) => `"${String(x).replace(/["\\]/g, '\\$&')}"`
    const box = 'font-family: "DM Sans", "DM Sans Fallback", sans-serif; font-size: 8pt; color: #515c56;'
    const style = document.createElement('style')
    style.id = 'pageStyle'
    style.textContent = `@page { @top-left { content: ${css(`${PLANT} – ${s.title}`)}; ${box} } @top-right { content: ${css(`v${s.version}, jóváhagyva ${s.date}`)}; ${box} } @bottom-left { content: ${css(BADGE)}; ${box} } @bottom-right { content: counter(page) " / " counter(pages); ${box} } }`
    document.head.append(style)
  }

  function showReader(s) {
    document.title = `${s.title} – v${s.version} • ${PLANT} demó`
    $('readerView').hidden = false
    $('sheetNav').innerHTML = `<ul>${SHEETS.map((x) => `<li><a href="?lap=${x.id}"${x.id === s.id ? ' aria-current="page"' : ''}><span class="n">${x.no}</span>${esc(x.nav)}</a></li>`).join('')}<li class="all"><a href="${esc(location.pathname)}">Összes lap</a></li></ul>`
    $('status').innerHTML = statusHtml(s)
    $('sheet').innerHTML = content[s.id]()
    $('verziok').innerHTML = versionsHtml(s)
    $('how2').innerHTML = HOW
    $('disclaimer').innerHTML = DISCLAIMER
    setPageStyle(s)
    setupSearch()
    $('printBtn').addEventListener('click', () => window.print())
  }

  // ---------------------------------------------------------------------------
  // Keresés: ékezet- és kisbetű-független, a találatok kiemelve
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
      acceptNode: (n) => (n.parentElement.closest('[data-nosearch], .sr-only') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
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
    const input = $('q'), status = $('searchStatus')
    const prev = $('prevHit'), next = $('nextHit')
    let timer = 0, pending = false
    const where = (m) => m.closest('[data-sec]')?.dataset.sec || ''
    const go = (i, jump) => {
      if (!marks.length) return
      if (hit >= 0) marks[hit].classList.remove('now')
      hit = (i + marks.length) % marks.length
      const m = marks[hit]
      m.classList.add('now')
      const secs = new Set(marks.map(where)).size
      status.textContent = `${marks.length} találat ${secs} részben. Most: ${hit + 1} / ${marks.length}, ${where(m)}.`
      if (jump) m.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
    }
    const run = (jump) => {
      clearMarks()
      const raw = input.value.trim().replace(/\s+/g, ' ')
      const q = fold(raw).out
      prev.disabled = next.disabled = true
      if (!q) { status.textContent = ''; return }
      if (q.length < 2) { status.textContent = 'Írj be legalább 2 karaktert.'; return }
      marks = [...highlight($('sheet'), q), ...highlight($('verziok'), q)]
      if (!marks.length) { status.textContent = `Nincs találat erre: „${raw}”. Próbálj rövidebb vagy más szót.`; return }
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
      }
    })
    input.addEventListener('search', () => { if (!input.value) run(false) })
    prev.addEventListener('click', () => go(hit - 1, true))
    next.addEventListener('click', () => go(hit + 1, true))
  }

  // ---------------------------------------------------------------------------
  // Indítás: ?lap=… a gépen lévő QR-kódból
  // ---------------------------------------------------------------------------
  function start() {
    const raw = new URLSearchParams(location.search).get('lap')
    const id = raw ? raw.trim().toLowerCase() : ''
    if (id && BY_ID.has(id)) showReader(BY_ID.get(id))
    else showChooser(raw ? raw.trim().slice(0, 40) : '')
  }
  start()
})()
