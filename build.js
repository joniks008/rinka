// Paverčia duomenys/raw.json + det.json + istorija.json + sprites.json į site/duomenys.js
// node build.js <duomenų katalogas> <site katalogas>
const fs = require('fs'), path = require('path');
const DIR = process.argv[2] || __dirname, SITE = process.argv[3] || __dirname;
const rd = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const raw = rd('raw.json');
const IST = rd('istorija.json');
const DATA = IST.paskutine;
const dienuTarp = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

const MODELIAI = [
  { id: 'q7a', pav: 'Audi Q7', karta: '2017–2019 (4M, iki facelift)', metai: [2017, 2019], europinimas: 200 },
  { id: 'q7b', pav: 'Audi Q7', karta: '2020–2025 (4M facelift)', metai: [2020, 2025], europinimas: 200 },
  { id: 'q8',  pav: 'Audi Q8', karta: '2019–2024', metai: [2019, 2024], europinimas: 250 },
  { id: 'x5',  pav: 'BMW X5', karta: '2019–2024 (G05)', metai: [2019, 2024], europinimas: 200 },
  { id: 'cay', pav: 'Porsche Cayenne', karta: '2019–2024 (E3)', metai: [2019, 2024], europinimas: 250 },
  { id: 'gle', pav: 'Mercedes-Benz GLE', karta: '2020–2024 (V167 / C167 Coupe)', metai: [2020, 2024], europinimas: 200 },
  { id: 'dur', pav: 'Dodge Durango', karta: '2019–2025', metai: [2019, 2025], europinimas: 200 },
  { id: 'my',  pav: 'Tesla Model Y', karta: '2020–2025', metai: [2020, 2025], europinimas: 0 },
];

function num(s) { return +String(s || '').replace(/[^\d]/g, '') || null; }

function parse(m, r) {
  const y = r.y || '';
  const ym = y.match(/^(\d{4})(?:-(\d{2}))?\s*(.*)$/);
  const metai = ym ? +ym[1] : null;
  const menuo = ym && ym[2] ? +ym[2] : null;
  const kebulas = ym ? ym[3].trim() : '';
  // kaina
  const prices = (r.pt || '').match(/\d[\d ]*\s*€/g) || [];
  const kaina = prices.length ? num(prices[0]) : null;
  const bePvm = /be PVM|eksportui/i.test(r.pt || '') && prices[1] ? num(prices[1]) : null;
  const naujas = /NAUJAS AUTOMOBILIS/i.test(r.tags || '');
  // parametrai
  let p = r.p || '';
  let kuras = (p.match(/^(.*?)\s+(Automatinė|Mechaninė)/) || [])[1] || (p.split(' ')[0] || '');
  kuras = kuras.replace(/,.*$/, '').trim();
  const deze = (p.match(/(Automatinė|Mechaninė)/) || [])[1] || '';
  const litrai = +((p.match(/(\d+\.\d+)\s*l\./) || [])[1] || 0) || null;
  const kw = +((p.match(/(\d+)\s*kW\b/) || [])[1] || 0) || null;
  const kwh = +((p.match(/(\d+)\s*kWh/) || [])[1] || 0) || null;
  const kms = [...p.matchAll(/(\d[\d ]*)\s*km\b/g)].map(x => num(x[1]));
  const rida = kms.length ? kms[0] : null;
  const miestas = (p.match(/km\s+([^\d]+)$/) || [])[1]?.trim() || (p.split(' ').slice(-1)[0] || '');
  const parduota = /PARDUOTA/i.test(r.b || '');
  const hibridas = /elektra/i.test(kuras) && !/^Elektra$/i.test(kuras);
  const elektra = /^Elektra$/i.test(kuras);
  const dyzelis = /Dyzel/i.test(kuras);
  const foto = r.f && r.f.length ? `https://autoplius-img.dgn.lt/ann_${r.f[0]}/${r.slug}.jpg` : null;
  const fotos = (r.f || []).map(f => `https://autoplius-img.dgn.lt/ann_${f}/${r.slug}.jpg`);
  const out = {
    id: r.id, modelis: m.id, nuoroda: `https://autoplius.lt/skelbimai/${r.slug}-${r.id}.html`,
    foto, fotos, metai, menuo, kebulas, kaina, be_pvm: bePvm, pvm: !!bePvm,
    kuras, deze, litrai, kw, kwh, rida, miestas, parduota, naujas,
    autoistorija: /Autoistorija/i.test(r.tags || ''), vin: /\bVIN\b/.test(r.tags || ''),
    garantija: /GARANTIJA/i.test(r.tags || ''),
    fotu: r.f ? r.f.length : 0,
  };
  out.variantas = variantas(m.id, out, hibridas, elektra, dyzelis, r.slug);
  return out;
}

function variantas(mid, o, hib, el, dz, slug) {
  const L = o.litrai, K = o.kw || 0;
  switch (mid) {
    case 'q7a':
      if (dz && hib) return '3.0 TDI e-tron (hibridas)';
      if (dz) return '3.0 TDI (dyzelis)';
      if (L === 2) return '2.0 TFSI (benzinas)';
      if (L === 4) return 'SQ7 4.0';
      return '3.0 TFSI (benzinas)';
    case 'q7b':
      if (L === 4) return 'SQ7 4.0';
      if (dz && hib) return '50 TDI e-hybrid';
      if (dz) return '50 TDI (dyzelis)';
      if (hib) return '55 TFSI e (hibridas)';
      if (L === 2) return '45 TFSI 2.0 (benzinas)';
      return '55 TFSI 3.0 (benzinas)';
    case 'q8':
      if (L === 4) return 'SQ8 / RS Q8 4.0';
      if (dz && hib) return '50 TDI (dyzelis)';
      if (dz) return '50 TDI (dyzelis)';
      if (hib) return '55 TFSI e (hibridas)';
      return '55 TFSI 3.0 (benzinas)';
    case 'x5':
      if (L === 4.4 && K >= 440) return 'X5 M 4.4';
      if (L === 4.4) return 'M50i / M60i 4.4';
      if (hib && K >= 330) return '50e (hibridas)';
      if (hib) return '45e (hibridas)';
      if (dz && K >= 250) return '40d / M50d (dyzelis)';
      if (dz) return '30d (dyzelis)';
      return '40i 3.0 (benzinas)';
    case 'cay':
      const coupe = /coupe/i.test(slug) ? ' Coupe' : '';
      if (L === 4 && hib) return 'Turbo S E-Hybrid' + coupe;
      if (L === 4 && K >= 400) return 'Turbo 4.0' + coupe;
      if (L === 4) return 'GTS 4.0' + coupe;
      if (hib) return 'E-Hybrid 3.0' + coupe;
      if (L === 2.9) return 'S 2.9' + coupe;
      return 'Cayenne 3.0 V6' + coupe;
    case 'gle': {
      const c = /coupe/i.test(slug) ? ' Coupe' : '';
      const g = (slug.match(/gle-?(?:coupe-)?(\d{2,3})/) || [])[1];
      if (g === '63') return 'GLE 63 AMG' + c;
      if (g === '53') return 'GLE 53 AMG' + c;
      if (g === '450' || g === '400') return 'GLE 450 / 400' + (dz ? 'd' : '') + c;
      if (g === '350') return dz ? 'GLE 350d' + c : (hib ? 'GLE 350de (hibridas)' + c : 'GLE 350' + c);
      if (g === '300') return 'GLE 300d' + c;
      return 'GLE kita' + c;
    }
    case 'dur':
      if (L === 6.4) return 'SRT 6.4 V8';
      if (L === 5.7) return 'R/T 5.7 V8';
      if (L === 6.2) return 'Hellcat 6.2';
      return '3.6 V6';
    case 'my':
      if (o.kwh && o.kwh <= 62) return 'Standard / RWD (~60 kWh)';
      if (o.kwh) return 'Long Range / Performance (75–85 kWh)';
      return 'Baterija nenurodyta';
  }
  return 'kita';
}

const DET = rd('det.json');
const MAX_ID = IST.maxId[DATA];
const skelbimai = [], dingusieji = [];
for (const m of MODELIAI) {
  for (const r of raw[m.id] || []) {
    const o = parse(m, r);
    if (!o.kaina || !o.metai) continue;
    if (/Dyzel/i.test(o.kuras)) continue;
    if (o.metai < m.metai[0] || o.metai > m.metai[1]) continue;
    const d = DET[o.id];
    o.aprasymas = d ? (d.d || '') : '';
    o.defektai = d ? (d.df || '') : '';
    o.kilme = d ? (d.ks || '') : '';
    o.ne_lt = !!(d && d.nelt);
    o.spalva = d ? (d.sp || '') : '';
    o.zymes = d ? (d.f || {}) : {};
    const ap = o.aprasymas;
    const PAKELIUI = /pakeliui|keliauja|atplauk|plukdy|amerikoje|dar jav|dar ne lt|ne lietuvoje|atvyks|uoste|jūroje|juroje|iki grįžimo|iki grizimo|plius muitas|pagal u[žz]sakym|randasi vokietijoje|yra vokietijoje|vokietijoje ir/i;
    const DAUZTAS = /dau[žz]t|dauzt|avarij|eismo [įi]vyk|salvage|rebuilt|apgadint|defekt|neremontuot|reikia remonto|remontui|smūg|smug/i;
    const TVARKINGAS = /nedau[žz]t|nedauzt|be eismo|be avarij|be defekt|nebuvo dau|nėra buvus|nera buvus|ne tur[ėe]jo eismo|netur[ėe]j[ęe]s eismo|nedalyvav|tvarking|be remonto|po pilno remonto|suremontuot|sutvarkyt|švari istorij|svari istorij|buvo pakeist|pakeistas|defekt[ųu] n[ėe]ra|be joki[ųu]|10\/10/i;
    if (PAKELIUI.test(ap)) o.ne_lt = true;
    o.dauztas_apr = DAUZTAS.test(ap) && !TVARKINGAS.test(ap);
    o.dauztas = !!(o.defektai || o.dauztas_apr || o.ne_lt);
    o.importas = /JAV|Kanada/i.test(o.kilme);
    // Skelbimo amžius (dienomis): nuo įdėjimo dienos (pagal ID, ~11 700 ID per dieną) iki šiandien arba iki dingimo iš rinkos
    const mt = IST.matyta[o.id];
    const pradzia = mt ? mt.p : null;
    o.idejimas = pradzia;
    if (IST.dingo[o.id]) { o.dingo = IST.dingo[o.id]; o.dienos = Math.max(0, pradzia ? dienuTarp(pradzia, o.dingo) : 0); dingusieji.push(o); continue; }
    o.dienos = pradzia ? Math.max(0, dienuTarp(pradzia, DATA)) : Math.max(0, Math.round((MAX_ID - +o.id) / 11700));
    skelbimai.push(o);
  }
}

// --- Rinkos kainos modelis: ln(kaina) = a + b*rida(100k) + c*amžius, per modelį+variantą (n>=6), kitaip per modelį ---
function fit(rows) {
  const t = rows.filter(r => r.rida > 500 && r.kaina > 2000 && !r.naujas && !r.dauztas && (!r.dingo || dienuTarp(r.dingo, DATA) <= 90));
  if (t.length < 6) return null;
  // X = [1, rida/100000, amzius]; solve normal equations 3x3
  const X = t.map(r => [1, r.rida / 100000, 2026 - r.metai]);
  const Y = t.map(r => Math.log(r.kaina));
  const XtX = [[0,0,0],[0,0,0],[0,0,0]], XtY = [0,0,0];
  X.forEach((x, i) => { for (let a = 0; a < 3; a++) { XtY[a] += x[a] * Y[i]; for (let b = 0; b < 3; b++) XtX[a][b] += x[a] * x[b]; } });
  // Gaussian elimination
  const M = XtX.map((row, i) => [...row, XtY[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i; for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-9) return null;
    for (let j = 0; j < 3; j++) if (j !== i) { const f = M[j][i] / M[i][i]; for (let k = i; k < 4; k++) M[j][k] -= f * M[i][k]; }
  }
  const beta = [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  // sanity: rida ir amžius turi mažinti kainą
  if (beta[1] > 0) beta[1] = 0;
  if (beta[2] > 0) beta[2] = 0;
  // recompute intercept so mean residual = 0 after clamping
  let s = 0; t.forEach((r, i) => { s += Y[i] - (beta[1] * X[i][1] + beta[2] * X[i][2]); }); beta[0] = s / t.length;
  const resid = t.map((r, i) => Y[i] - (beta[0] + beta[1] * X[i][1] + beta[2] * X[i][2]));
  const sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / Math.max(1, t.length - 3));
  return { a: beta[0], b: beta[1], c: beta[2], n: t.length, sd: +sd.toFixed(3) };
}
const modeliaiOut = MODELIAI.map(m => {
  const rows = skelbimai.concat(dingusieji).filter(s => s.modelis === m.id);
  const variantai = {};
  rows.forEach(r => { (variantai[r.variantas] = variantai[r.variantas] || []).push(r); });
  const vOut = Object.entries(variantai).map(([v, rs]) => ({ pav: v, n: rs.length, fit: fit(rs) }))
    .sort((a, b) => b.n - a.n);
  return { ...m, n: rows.length, fit: fit(rows), variantai: vOut };
});
// apskaičiuojam rinkos kainą kiekvienam skelbimui
function estimate(m, s) {
  const v = m.variantai.find(x => x.pav === s.variantas);
  const f = (v && v.fit) || m.fit;
  if (!f || !s.rida) return null;
  return Math.round(Math.exp(f.a + f.b * s.rida / 100000 + f.c * (2026 - s.metai)));
}
skelbimai.concat(dingusieji).forEach(s => {
  const m = modeliaiOut.find(x => x.id === s.modelis);
  s.rinkos = estimate(m, s);
  s.nuokrypis = s.rinkos ? +((s.kaina / s.rinkos - 1) * 100).toFixed(1) : null;
});

// nuotraukų sprite pozicijos
const SPR = rd('sprites.json');
const sprMeta = {};
for (const [id, v] of Object.entries(SPR)) { const m = sprMeta[v[0]] = sprMeta[v[0]] || { cols: 10, n: 0 }; m.n++; }
for (const k in sprMeta) sprMeta[k].rows = Math.ceil(sprMeta[k].n / 10);
skelbimai.concat(dingusieji).forEach(s => { const v = SPR[s.id]; if (v) { s.fc = v[1] / 218; s.fr = v[2] / 154; } else if (fs.existsSync(path.join(SITE, 'foto', s.id + '.jpg'))) s.fl = 1; delete s.fotos; });
modeliaiOut.forEach(m => { m.n = skelbimai.filter(s => s.modelis === m.id).length; m.spr = sprMeta[m.id] || null; });
dingusieji.sort((a, b) => b.dingo.localeCompare(a.dingo) || a.kaina - b.kaina);
const dienos = Object.keys(IST.maxId).sort();
const out = { atnaujinta: DATA, nuskaitymu: dienos.length, pirmas: dienos[0], saltinis: 'autoplius.lt', modeliai: modeliaiOut, skelbimai, dingo: dingusieji };
fs.writeFileSync(path.join(SITE, 'duomenys.js'), 'window.RM=' + JSON.stringify(out) + ';\n');
console.log('skelbimu', skelbimai.length, 'dingusiu', dingusieji.length, 'data', DATA);
modeliaiOut.forEach(m => console.log(m.id, m.n, m.fit, m.variantai.map(v => v.pav + ':' + v.n + (v.fit ? '' : '(-)')).join(' | ')));
const kv = {}; skelbimai.forEach(s => { kv[s.kuras] = (kv[s.kuras] || 0) + 1; }); console.log(kv);
console.log('parduota', skelbimai.filter(s => s.parduota).length, 'be ridos', skelbimai.filter(s => !s.rida).length, 'pvm', skelbimai.filter(s => s.pvm).length);
console.log(JSON.stringify(skelbimai.find(s => s.modelis === 'my')));
console.log(JSON.stringify(skelbimai.filter(s => s.nuokrypis != null).sort((a, b) => a.nuokrypis - b.nuokrypis).slice(0, 5).map(s => [s.modelis, s.variantas, s.metai, s.rida, s.kaina, s.rinkos, s.nuokrypis])));
