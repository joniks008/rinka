// Bendros funkcijos visiems puslapiams
const RM = window.RM;
const $ = id => document.getElementById(id);
const sk = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const eur = n => (n == null || isNaN(n)) ? '—' : sk(n) + ' €';
const usd = n => (n == null || isNaN(n)) ? '—' : sk(n) + ' $';
const km = n => (n == null || isNaN(n)) ? '—' : sk(n) + ' km';
const pct = n => (n == null) ? '—' : (n > 0 ? '+' : '') + Math.round(n) + ' %';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const modelis = id => RM.modeliai.find(m => m.id === id);
const pavadinimas = m => m.pav + ' ' + m.karta.split(' ')[0];
const mediana = arr => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y); const h = a.length >> 1; return a.length % 2 ? a[h] : Math.round((a[h - 1] + a[h]) / 2); };
const vid = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const SPALVOS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

// Nuokrypio klasifikacija — vienoda visur
// dauztas: pardavėjas pažymėjo "Daužtas", arba aprašyme daužtas / dar ne Lietuvoje
// geras: -35 % .. -12 %   |  itartinas: < -35 % (nedaužtas!)  | brangus: > +15 %
function nuokrypioKlase(s) {
  if (s.dauztas) return { k: 'b', t: s.ne_lt ? 'dar ne Lietuvoje' : 'daužtas' };
  if (s.nuokrypis == null) return { k: 'n', t: 'nėra palyginimo' };
  if (s.nuokrypis <= -35) return { k: 'b', t: 'įtartinai pigu' };
  if (s.nuokrypis <= -12) return { k: 'g', t: 'pigiau nei rinka' };
  if (s.nuokrypis >= 15) return { k: 'a', t: 'brangiau nei rinka' };
  return { k: 'n', t: 'rinkos kaina' };
}
const svarus = s => !s.dauztas;
const isejes = s => !!(s.parduota || s.dingo); // parduota arba dingo iš rinkos
const geras = s => svarus(s) && s.nuokrypis != null && s.nuokrypis <= -12 && s.nuokrypis > -35 && !isejes(s);
// Parduoti / dingę šio modelio skelbimai (pardavimo greičiui)
const parduotieji = mid => RM.skelbimai.filter(s => s.parduota && (!mid || s.modelis === mid)).concat((RM.dingo || []).filter(s => !mid || s.modelis === mid));
const dataTxt = d => d ? d.slice(5).replace('-', '.') : '';
const itartinas = s => svarus(s) && s.nuokrypis != null && s.nuokrypis <= -35;
const dienosTxt = d => d == null ? '—' : (d < 1 ? 'šiandien' : d + ' d.');

// Nuotrauka iš sprite lapo
function fotoHtml(s, papildoma) {
  const m = modelis(s.modelis);
  if (s.fl) return `<div class="foto-w"><img class="foto-img" src="foto/${s.id}.jpg" loading="lazy" alt=""></div>`.replace('</div>', (papildoma || '') + '</div>');
  if (s.fc == null || !m.spr) return `<div class="foto-w nera">nėra nuotraukos${papildoma || ''}</div>`;
  return `<div class="foto-w"><div class="foto" style="background-image:url('foto-${m.id}.jpg');background-position:${-s.fc * 218}px ${-s.fr * 154}px"></div>${papildoma || ''}</div>`;
}

// Viršus
function virsus(aktyvi, modId) {
  const n = RM.skelbimai.length;
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="virsus"><div class="virsus-v">
    <a class="zenklas" href="index.html"><i>RM</i>Rinkos monitorius</a>
    <nav>
      <a href="index.html" class="${aktyvi === 'index' ? 'aktyvi' : ''}">Apžvalga</a>
      <a href="skaiciuokle.html" class="${aktyvi === 'skaiciuokle' ? 'aktyvi' : ''}">Savikainos skaičiuoklė</a>
      <a href="parduota.html" class="${aktyvi === 'parduota' ? 'aktyvi' : ''}">Parduota · daužti · įtartini</a>
    </nav>
    <div class="data">autoplius.lt · ${RM.atnaujinta} · ${n} skelbimai (be dyzelių)${RM.dingo && RM.dingo.length ? ' · ' + RM.dingo.length + ' dingo iš rinkos' : ''}</div>
  </div>
  <div class="virsus-m"><div class="virsus-v" style="min-height:44px;gap:6px">
    ${RM.modeliai.map(m => `<a href="modelis.html#${m.id}" class="${aktyvi === 'modelis' && modId === m.id ? 'aktyvi' : ''}">${esc(m.pav.replace('Mercedes-Benz', 'MB'))} <span>${m.karta.split(' ')[0]}</span></a>`).join('')}
  </div></div></header>`);
  document.body.insertAdjacentHTML('beforeend', `<footer class="apacia">Duomenys: autoplius.lt, nuskaityti ${RM.atnaujinta} (skelbimų sąrašai + kiekvieno skelbimo vidus: aprašymas, defektai, kilmės šalis). Dyzeliai neįtraukti. Rinkos kaina skaičiuojama tik iš nedaužtų, Lietuvoje esančių to paties varianto skelbimų pagal metus ir ridą. „Rinkoje ~N d.“ — nuo skelbimo įdėjimo (pagal skelbimo ID). Robotas kasdien nuskaito rinką iš naujo${RM.nuskaitymu > 1 ? ' (nuskaitymų: ' + RM.nuskaitymu + ', nuo ' + RM.pirmas + ')' : ''}: skelbimas, kuris dingo iš autoplius, laikomas parduotu, o „per kiek dienų parduota“ — nuo įdėjimo iki dingimo.</footer>`);
}

// Skelbimo kortelė
function kortele(s) {
  const m = modelis(s.modelis);
  const nk = nuokrypioKlase(s);
  const zymos = (s.dingo ? '<span class="zyma parduota">DINGO ' + dataTxt(s.dingo) + '</span>' : s.parduota ? '<span class="zyma parduota">PARDUOTA</span>' : (s.naujas ? '<span class="zyma">NAUJAS</span>' : ''));
  const chipai = [];
  if (s.dauztas && !s.ne_lt) chipai.push('<span class="chip raudona">Daužtas' + (s.defektai ? '' : ' (pagal aprašymą)') + '</span>');
  if (s.ne_lt) chipai.push('<span class="chip raudona">Dar ne Lietuvoje</span>');
  if (s.importas) chipai.push('<span class="chip gelt">Iš ' + esc(s.kilme) + '</span>');
  else if (s.kilme) chipai.push('<span class="chip">Iš ' + esc(s.kilme) + '</span>');
  if (s.pvm) chipai.push('<span class="chip mel">PVM sąskaita</span>');
  if (s.autoistorija) chipai.push('<span class="chip">Autoistorija</span>');
  if (s.vin) chipai.push('<span class="chip">VIN</span>');
  if (s.garantija) chipai.push('<span class="chip">Garantija</span>');
  if (s.kebulas && !/Visureigis/.test(s.kebulas)) chipai.push('<span class="chip gelt">' + esc(s.kebulas) + '</span>');
  const galia = s.kw ? s.kw + ' kW' + (s.litrai ? ' · ' + s.litrai.toFixed(1) + ' l' : '') : (s.kwh ? s.kwh + ' kWh' : (s.litrai ? s.litrai.toFixed(1) + ' l' : '—'));
  return `<article class="skelb">
    ${fotoHtml(s, zymos)}
    <div class="vid">
      <div class="pav"><a href="${esc(s.nuoroda)}" target="_blank" rel="noopener">${esc(m.pav)} ${s.metai}${s.menuo ? '-' + String(s.menuo).padStart(2, '0') : ''}</a></div>
      <div class="var">${esc(s.variantas)}</div>
      <div class="chipai">${chipai.join('')}</div>
      <div class="spec">
        <div><small>Rida</small><b class="num">${km(s.rida)}</b></div>
        <div><small>Kuras</small><b>${esc(s.kuras || '—')}</b></div>
        <div><small>Galia / variklis</small><b class="num">${galia}</b></div>
        <div><small>Spalva</small><b>${esc(s.spalva || '—')}</b></div>
        <div><small>Miestas</small><b>${esc(s.miestas || '—')}</b></div>
        <div><small>${s.dingo ? 'Pardavė per' : s.parduota ? 'Parduota per' : 'Rinkoje (nuo įdėjimo)'}</small><b class="num">~${dienosTxt(s.dienos)}</b></div>
      </div>
      ${s.aprasymas ? `<details class="apr-d"><summary>${esc(s.aprasymas.slice(0, 110))}${s.aprasymas.length > 110 ? '…' : ''}</summary><div>${esc(s.aprasymas)}${s.aprasymas.length >= 320 ? '… <a href="' + esc(s.nuoroda) + '" target="_blank" rel="noopener">visas aprašymas ↗</a>' : ''}</div></details>` : '<div class="apr-d tuscias">Aprašymo nėra</div>'}
    </div>
    <div class="kaina-blokas">
      <div class="kaina num">${eur(s.kaina)}</div>
      ${s.be_pvm ? `<div class="bepvm">be PVM ${eur(s.be_pvm)}</div>` : ''}
      <span class="nuok ${nk.k}">${s.nuokrypis == null ? '—' : pct(s.nuokrypis)} · ${nk.t}</span>
      <div class="rinkos">Rinkos kaina tokiam auto: <b class="num">${eur(s.rinkos)}</b></div>
      <a class="mygt" href="${esc(s.nuoroda)}" target="_blank" rel="noopener">Atidaryti autoplius ↗</a>
    </div>
  </article>`;
}

// ---- SVG grafikų primityvai ----
function svgPradzia(W, H, aria) { return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">`; }
function asys(X, Y, xmin, xmax, ymin, ymax, W, H, L, R, T, B, fx, fy) {
  let s = '';
  for (let i = 0; i <= 4; i++) {
    const v = ymin + (ymax - ymin) * i / 4, y = Y(v);
    s += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="var(--linija2)" stroke-width="1"/>`;
    s += `<text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--antrinis)">${fy(v)}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    const v = xmin + (xmax - xmin) * i / 4, x = X(v);
    s += `<text x="${x}" y="${H - 8}" text-anchor="${i === 4 ? 'end' : (i === 0 ? 'start' : 'middle')}" font-size="11" fill="var(--antrinis)">${fx(v)}</text>`;
  }
  return s;
}
// Kaina vs rida, spalva pagal variantą, punktyras — rinkos kreivė (variantui, medianiniams metams)
function sklaida(el, rows, variantai, m) {
  const t = rows.filter(r => r.rida > 500 && r.kaina);
  if (t.length < 3) { el.innerHTML = '<div class="tuscia">Per mažai duomenų</div>'; return; }
  const W = 860, H = 380, L = 62, R = 30, T = 14, B = 34;
  const xmax = Math.max(...t.map(r => r.rida)) * 1.04, ymin = Math.min(...t.map(r => r.kaina)) * 0.9, ymax = Math.max(...t.map(r => r.kaina)) * 1.04;
  const X = v => L + v / xmax * (W - L - R), Y = v => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
  let s = svgPradzia(W, H, 'Kaina ir rida');
  s += asys(X, Y, 0, xmax, ymin, ymax, W, H, L, R, T, B, v => Math.round(v / 1000) + ' tūkst. km', v => Math.round(v / 1000) + ' k€');
  variantai.forEach((v, i) => {
    const f = v.fit; if (!f) return;
    const vr = t.filter(r => r.variantas === v.pav); if (vr.length < 4) return;
    const am = mediana(vr.map(r => 2026 - r.metai));
    let d = '', prev = false;
    for (let k = 0; k <= 40; k++) { const rida = xmax * k / 40; const y = Math.exp(f.a + f.b * rida / 100000 + f.c * am); if (y < ymin || y > ymax) { prev = false; continue; } d += (prev ? 'L' : 'M') + X(rida).toFixed(1) + ',' + Y(y).toFixed(1) + ' '; prev = true; }
    if (!d) return;
    s += `<path d="${d.trim()}" fill="none" stroke="${SPALVOS[i % 8]}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>`;
  });
  t.forEach((r, i) => {
    const vi = variantai.findIndex(v => v.pav === r.variantas);
    const it = itartinas(r), g = geras(r);
    s += `<circle cx="${X(r.rida).toFixed(1)}" cy="${Y(r.kaina).toFixed(1)}" r="${g || it ? 6 : 4.5}" fill="${SPALVOS[vi % 8]}" fill-opacity="${it ? 1 : .8}" stroke="${it ? 'var(--bloga)' : (g ? 'var(--gera)' : 'none')}" stroke-width="2.5" data-i="${i}" style="cursor:pointer"/>`;
  });
  s += '</svg>';
  el.style.position = 'relative';
  el.innerHTML = s + '<div class="tt" hidden></div>';
  el.insertAdjacentHTML('beforeend', '<div class="legenda">' + variantai.filter(v => t.some(r => r.variantas === v.pav)).map((v, i) => `<span><i style="background:${SPALVOS[variantai.indexOf(v) % 8]}"></i>${esc(v.pav)}</span>`).join('') + '<span><i style="background:transparent;box-shadow:0 0 0 2px var(--gera) inset"></i>pigiau nei rinka</span><span><i style="background:transparent;box-shadow:0 0 0 2px var(--bloga) inset"></i>įtartinai pigu</span><span>punktyras — rinkos kreivė</span></div>');
  tooltipai(el, t);
}
function tooltipai(el, t) {
  const tt = el.querySelector('.tt');
  el.querySelectorAll('circle[data-i],rect[data-i]').forEach(c => {
    c.addEventListener('mousemove', ev => {
      const p = t[+c.dataset.i]; tt.hidden = false;
      tt.textContent = p.tt || `${p.metai} · ${km(p.rida)} · ${eur(p.kaina)} · ${p.miestas || ''} · ${pct(p.nuokrypis)}`;
      const r = el.getBoundingClientRect();
      tt.style.left = Math.min(ev.clientX - r.left + 12, r.width - 230) + 'px'; tt.style.top = (ev.clientY - r.top - 34) + 'px';
    });
    c.addEventListener('mouseleave', () => tt.hidden = true);
    c.addEventListener('click', () => { const p = t[+c.dataset.i]; if (p.nuoroda) window.open(p.nuoroda, '_blank'); });
  });
}
// Stulpelinė: items [{pav, val, n}]
function stulpeliai(el, items, fmt, spalva) {
  if (!items.length) { el.innerHTML = '<div class="tuscia">Nėra duomenų</div>'; return; }
  const W = 420, rowH = 26, L = 110, R = 70, H = items.length * rowH + 10;
  const max = Math.max(...items.map(i => i.val)) || 1;
  let s = svgPradzia(W, H, 'Stulpelinė diagrama');
  items.forEach((it, i) => {
    const y = i * rowH + 5, w = Math.max(2, (W - L - R) * it.val / max);
    s += `<text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" fill="var(--tekstas)">${esc(it.pav.length > 18 ? it.pav.slice(0, 17) + '…' : it.pav)}</text>`;
    s += `<rect x="${L}" y="${y + 4}" width="${w.toFixed(1)}" height="${rowH - 9}" rx="3" fill="${spalva || 'var(--akcentas)'}" opacity=".85"/>`;
    s += `<text x="${L + w + 6}" y="${y + 17}" font-size="11.5" fill="var(--antrinis)">${fmt(it.val)}${it.n != null ? ' · ' + it.n + ' skelb.' : ''}</text>`;
  });
  el.innerHTML = s + '</svg>';
}
// Histograma
function histograma(el, vals, fmt) {
  if (vals.length < 3) { el.innerHTML = '<div class="tuscia">Nėra duomenų</div>'; return; }
  const W = 420, H = 200, L = 34, R = 10, T = 10, B = 30;
  const mn = Math.min(...vals), mx = Math.max(...vals), k = Math.min(12, Math.max(5, Math.round(Math.sqrt(vals.length))));
  const bw = (mx - mn) / k || 1; const bins = new Array(k).fill(0);
  vals.forEach(v => { let i = Math.floor((v - mn) / bw); if (i >= k) i = k - 1; bins[i]++; });
  const bm = Math.max(...bins);
  let s = svgPradzia(W, H, 'Histograma');
  bins.forEach((b, i) => {
    const x = L + i * (W - L - R) / k, w = (W - L - R) / k - 2, h = (H - T - B) * b / bm;
    s += `<rect x="${x.toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--akcentas)" opacity=".8"/>`;
    if (b) s += `<text x="${(x + w / 2).toFixed(1)}" y="${(H - B - h - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--antrinis)">${b}</text>`;
  });
  for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; s += `<text x="${L + (W - L - R) * i / 4}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="var(--antrinis)">${fmt(v)}</text>`; }
  el.innerHTML = s + '</svg>';
}
