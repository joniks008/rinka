// Rinkos monitorius — kasdienis autoplius.lt nuskaitymas (GitHub Actions).
// Atnaujina raw.json, det.json, istorija.json, parsisiunčia naujų skelbimų nuotraukas į foto/<id>.jpg,
// tada paleidžia build.js -> duomenys.js. Viskas repo šaknyje (GitHub Pages rodo šaknį).
const fs = require('fs'), path = require('path');
const cheerio = require('cheerio');
const ROOT = __dirname;
const F = 'fuel_id[30]=30&fuel_id[31]=31&fuel_id[36]=36&fuel_id[35]=35&fuel_id[31261]=31261'; // be dyzelių
// [raktas, keliai, metai nuo, metai iki, slug patikra]
const MODELIAI = [
  ['q7a', ['audi/q7'], 2017, 2019, /audi-q7/], ['q7b', ['audi/q7'], 2020, 2026, /audi-q7/], ['q8', ['audi/q8'], 2019, 2024, /audi-q8/], ['x5', ['bmw/x5'], 2019, 2024, /bmw-x5/],
  ['dur', ['dodge/durango'], 2019, 2026, /durango/], ['gle', ['mercedes_benz/gle-klase', 'mercedes_benz/gle-coupe'], 2020, 2024, /mercedes-benz-gle/],
  ['cay', ['porsche/cayenne'], 2019, 2024, /cayenne/], ['my', ['tesla/model-y'], 2020, 2026, /model-y/],
];
const HDR = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'lt-LT,lt;q=0.9,en;q=0.8', 'Referer': 'https://autoplius.lt/' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const wr = (f, o) => fs.writeFileSync(path.join(ROOT, f), JSON.stringify(o));
const siandien = () => new Date().toISOString().slice(0, 10);
// innerText pakaitalas: žymes keičiam tarpais, tada dekoduojam
const txt = html => cheerio.load('<div>' + (html || '').replace(/<[^>]+>/g, ' ') + '</div>')('div').text().replace(/\s+/g, ' ').trim();
const t = ($, el, sel) => { const e = $(el).find(sel).first(); return e.length ? txt(e.html()) : ''; };

let limitas = 0;
async function get(u, bin) {
  for (let a = 0; a < 4; a++) {
    const r = await fetch('https://autoplius.lt' + u, { headers: HDR });
    if (r.status === 429) { limitas++; log('429 — autoplius limitas, laukiu 5 min'); await sleep(300000); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u);
    return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
  }
  throw new Error('429 nepraeina: ' + u);
}

function skelbimas($, a) {
  const pid = s => { const m = (s || '').match(/ann_(\d+_\d+)/); return m ? m[1] : null; };
  const f = $(a).find('.announcement-media img').map((i, im) => pid($(im).attr('src')) || pid($(im).attr('data-src'))).get().filter(Boolean);
  const href = ($(a).attr('href') || '').replace(/^.*\/skelbimai\//, '').replace(/\.html.*$/, '');
  const id = (href.match(/-(\d+)$/) || [])[1];
  return { id, slug: href.replace(/-\d+$/, ''), f, y: t($, a, '.announcement-title-parameters'), pt: t($, a, '.announcement-pricing-info'), p: t($, a, '.announcement-parameters-block'), tags: t($, a, '.announcement-tags'), b: t($, a, '.announcement-badges') };
}

async function sarasai() {
  const raw = {};
  for (const [key, keliai, nuo, iki, tikr] of MODELIAI) {
    const seen = new Set(); raw[key] = [];
    for (const kelias of keliai) for (let p = 1; p <= 30; p++) {
      const $ = cheerio.load(await get('/skelbimai/naudoti-automobiliai/' + kelias + '?make_date_from=' + nuo + '&make_date_to=' + iki + '&' + F + '&page_nr=' + p));
      const items = $('a.announcement-item').map((i, a) => skelbimas($, a)).get().filter(x => x.id);
      if (p === 1 && items.length && !items.some(x => tikr.test(x.slug))) { log('KLAIDA: kelias', kelias, 'grąžina ne to modelio sąrašą'); break; }
      let n = 0; items.forEach(x => { if (!seen.has(x.id) && tikr.test(x.slug)) { seen.add(x.id); raw[key].push(x); n++; } });
      if (!items.length || n === 0) break;
      await sleep(1200);
    }
    log(key, raw[key].length);
  }
  return raw;
}

function detale(html) {
  const $ = cheerio.load(html);
  const rows = {}; let sdkTxt = '';
  $('.parameter-row').each((i, r) => { const l = t($, r, '.parameter-label'), v = t($, r, '.parameter-value'); if (l) rows[l] = v; if (/^SDK/i.test(l)) sdkTxt = txt($(r).html()); });
  const ap = txt($('.announcement-description').first().html()).slice(0, 500);
  return { d: ap, df: rows['Defektai'] || '', ks: rows['Pirmosios registracijos šalis'] || rows['Kilmės šalis'] || '', nelt: /ne Lietuvoje/i.test(sdkTxt) ? 1 : 0, sp: rows['Spalva'] || '', f: { garantija: /garantij/i.test(ap) ? 1 : 0 } };
}

(async () => {
  const data = siandien();
  const raw0 = rd('raw.json'), det = rd('det.json'), ist = rd('istorija.json');
  log('pradžia', data);
  const naujas = await sarasai();
  let viso = 0; for (const k in naujas) viso += naujas[k].length;
  if (viso < 250) { log('PER MAŽAI skelbimų (' + viso + ') — nuskaitymas nepilnas, nieko nekeičiu'); process.exit(2); }
  // sujungiam su senais: žinomiems atnaujinam kainą/ženkliukus, naujus pridedam
  const idx = {}; for (const k in raw0) raw0[k].forEach((r, i) => { idx[r.id] = [k, i]; });
  const dabar = new Set(), naujiIds = []; let maxId = 0, atn = 0;
  for (const k in naujas) for (const r of naujas[k]) {
    dabar.add(r.id); maxId = Math.max(maxId, +r.id);
    if (idx[r.id]) { const s = raw0[idx[r.id][0]][idx[r.id][1]]; s.pt = r.pt; s.b = r.b; s.p = r.p; s.tags = r.tags; if (r.f.length) s.f = r.f; atn++; }
    else { (raw0[k] = raw0[k] || []).push(r); naujiIds.push(r); }
  }
  log('atnaujinta', atn, 'naujų', naujiIds.length);
  // detalės tik naujiems (ir tiems, kurie dar neturi)
  let detN = 0, detK = 0;
  for (const k in raw0) for (const r of raw0[k]) {
    if (det[r.id] || !dabar.has(r.id) || !r.slug) continue;
    try { det[r.id] = detale(await get('/skelbimai/' + r.slug + '-' + r.id + '.html')); detN++; }
    catch (e) { detK++; log('detalė nepavyko', r.id, e.message); if (limitas >= 3) break; }
    await sleep(1500);
  }
  log('detalių', detN, 'klaidų', detK);
  // istorija: pirmą kartą matyti / dingę
  const dienaPagalId = id => { const d = new Date(data); d.setUTCDate(d.getUTCDate() - Math.max(0, Math.round((maxId - +id) / 11700))); return d.toISOString().slice(0, 10); };
  ist.maxId[data] = maxId;
  for (const id of dabar) {
    if (!ist.matyta[id]) ist.matyta[id] = { p: dienaPagalId(id), v: data };
    else { ist.matyta[id].v = data; if (ist.dingo[id]) delete ist.dingo[id]; }
  }
  let dingo = 0;
  for (const id in ist.matyta) if (!dabar.has(id) && !ist.dingo[id] && ist.matyta[id].v < data) { ist.dingo[id] = data; dingo++; }
  ist.paskutine = data;
  log('dingo', dingo, 'maxId', maxId);
  if (dingo > 150) { log('PER DAUG dingusių — įtartina, nieko nekeičiu'); process.exit(3); }
  // nuotraukos naujiems (ir seniems be sprite) -> foto/<id>.jpg
  const spr = rd('sprites.json'); fs.mkdirSync(path.join(ROOT, 'foto'), { recursive: true });
  let fotoN = 0;
  for (const k in raw0) for (const r of raw0[k]) {
    if (!dabar.has(r.id) || spr[r.id] || !r.f || !r.f.length || !r.slug) continue;
    const fp = path.join(ROOT, 'foto', r.id + '.jpg'); if (fs.existsSync(fp)) continue;
    try { const b = await fetch('https://autoplius-img.dgn.lt/ann_' + r.f[0] + '/' + r.slug + '.jpg', { headers: HDR }); if (b.ok) { fs.writeFileSync(fp, Buffer.from(await b.arrayBuffer())); fotoN++; } }
    catch (e) { log('foto nepavyko', r.id, e.message); }
    await sleep(400);
    if (fotoN >= 150) break;
  }
  // senų dingusių (>120 d.) nuotraukas trinam, kad repo neaugtų
  const dienuTarp = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
  for (const f of fs.readdirSync(path.join(ROOT, 'foto'))) { const id = f.replace('.jpg', ''); if (!dabar.has(id) && (!ist.dingo[id] || dienuTarp(ist.dingo[id], data) > 120)) fs.unlinkSync(path.join(ROOT, 'foto', f)); }
  log('nuotraukų pridėta', fotoN);
  wr('raw.json', raw0); wr('det.json', det); wr('istorija.json', ist);
  require('child_process').execSync('node build.js "' + ROOT + '" "' + ROOT + '"', { stdio: 'inherit' });
  fs.writeFileSync(path.join(ROOT, 'zurnalas.txt'), `${data}: skelbimų ${viso}, naujų ${naujiIds.length}, detalių ${detN}, dingo ${dingo}, nuotraukų ${fotoN}, 429 kartų ${limitas}\n` + (fs.existsSync(path.join(ROOT, 'zurnalas.txt')) ? fs.readFileSync(path.join(ROOT, 'zurnalas.txt'), 'utf8').split('\n').slice(0, 60).join('\n') : ''));
  log('baigta');
})().catch(e => { console.error('KLAIDA', e); process.exit(1); });
