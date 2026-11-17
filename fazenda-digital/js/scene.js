/* Fazenda Digital — cena SVG: céu (dia/noite), clima, lavoura, tubulação, bomba e dispositivos.
   Só desenha o estado da simulação (FarmSim). Também anima os "pacotes" de sinal entre dispositivos, gateway e app. */
(function (root) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const Sim = root.FarmSim;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const A = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const mx = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rgb = a => 'rgb(' + a.map(v => Math.round(v)).join(',') + ')';
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const el = (tag, attrs, parent, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
const fmt = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const PL = { t1: { x: 250, y: 320, w: 290, h: 300 }, t2: { x: 580, y: 320, w: 290, h: 300 }, t3: { x: 910, y: 320, w: 290, h: 300 } };
const MAIN_Y = 672, TOWER = { x: 196, y: 412 }, PUMP = { x: 120, y: 566 };
const POS = { gw: TOWER, app: { x: 1236, y: 66 }, 'pc-01': PUMP, 'ws-01': { x: 226, y: 452 } };
Object.keys(PL).forEach(id => { const p = PL[id]; p.cx = p.x + p.w / 2; POS['sm-' + id] = { x: p.x + 40, y: p.y + 118 }; POS['fm-' + id] = { x: p.cx, y: 640 }; });

const C = { skyDayTop: A('#3a9be8'), skyDayBot: A('#c4e7ff'), skyNightTop: A('#060a20'), skyNightBot: A('#1b2753'), dusk: A('#f7a35a'), greyD: A('#9aa6b2'), greyN: A('#2a3140'),
  soilDry: A('#d2ac72'), soilWet: A('#58392a'), hill: A('#3f7a45') };

let R = null;

function mount(svg, handlers) {
  R = { svg, h: handlers || {}, pk: 0, sel: 't1', lastRain: -1, flashT: 0 };
  svg.setAttribute('viewBox', '0 0 1280 720'); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  const sg = el('linearGradient', { id: 'skyG', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); R.skyTop = el('stop', { offset: 0 }, sg); R.skyBot = el('stop', { offset: 1 }, sg);
  const gg = el('linearGradient', { id: 'grassG', x1: 0, y1: 0, x2: 0, y2: 1 }, defs); el('stop', { offset: 0, 'stop-color': '#7bb35a' }, gg); el('stop', { offset: 1, 'stop-color': '#4f8f3f' }, gg);
  const glow = el('radialGradient', { id: 'glowG' }, defs); el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': .95 }, glow); el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, glow);
  Object.keys(PL).forEach(id => {
    const p = el('pattern', { id: 'cane-' + id, width: 14, height: 18, patternUnits: 'userSpaceOnUse' }, defs); R['pat_' + id] = p;
    el('path', { d: 'M7 18V5', stroke: '#2f7a33', 'stroke-width': 2, 'stroke-linecap': 'round' }, p);
    el('path', { d: 'M7 11Q2 8 1 2M7 11Q12 8 13 2M7 7Q4 4 3 0M7 7Q10 4 11 0', stroke: '#58b04b', fill: 'none', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, p);
  });

  /* céu */
  el('rect', { x: -900, y: -600, width: 3080, height: 900, fill: 'url(#skyG)' }, svg);
  R.stars = el('g', {}, svg); const rs = rng(7);
  for (let i = 0; i < 70; i++) el('circle', { cx: rs() * 1280, cy: rs() * 230, r: rs() * 1.3 + .4, fill: '#fff', opacity: .5 + rs() * .5 }, R.stars);
  R.sun = el('g', {}, svg); R.sunGlow = el('circle', { r: 90, fill: 'url(#glowG)' }, R.sun); R.sunDisc = el('circle', { r: 28, fill: '#fff3b0' }, R.sun);
  R.moon = el('g', {}, svg); el('circle', { r: 56, fill: 'url(#glowG)', opacity: .35 }, R.moon); el('circle', { r: 20, fill: '#eef2ff' }, R.moon);
  el('circle', { cx: -6, cy: -4, r: 3.6, fill: '#cfd6ee' }, R.moon); el('circle', { cx: 6, cy: 6, r: 2.6, fill: '#cfd6ee' }, R.moon);
  R.clouds = el('g', { class: 'clouds' }, svg); R.cloudEls = [];
  const rc = rng(11);
  for (let i = 0; i < 7; i++) {
    const g = el('g', { class: 'cloud', style: `--y:${30 + rc() * 150}px;--dur:${110 + rc() * 90}s;--delay:-${rc() * 150}s;--s:${.8 + rc() * .8}` }, R.clouds), s = el('g', {}, g);
    [[0, 0, 62, 20], [-38, 7, 40, 16], [40, 8, 44, 16], [-12, -12, 34, 18], [18, -10, 30, 15]].forEach(([x, y, rx, ry]) => el('ellipse', { cx: x, cy: y, rx, ry }, s));
    R.cloudEls.push(g);
  }
  /* terreno */
  el('path', { d: 'M-900 262H0Q120 218 260 250T520 240T800 250T1060 232T1280 250H2180V300H-900Z', fill: rgb(C.hill) }, svg); R.hills = svg.lastChild;
  el('rect', { x: -900, y: 270, width: 3080, height: 1100, fill: 'url(#grassG)' }, svg);
  const trees = el('g', {}, svg); const rt = rng(3);
  for (let i = -18; i < 44; i++) { const x = 20 + i * 50 + rt() * 20; el('circle', { cx: x, cy: 276 + rt() * 6, r: 11 + rt() * 7, fill: '#2f6a37' }, trees); }
  el('rect', { x: -900, y: 690, width: 3080, height: 700, fill: '#8a6a45', opacity: .55 }, svg);      // estrada de terra

  /* sede */
  const house = el('g', { transform: 'translate(40,292)' }, svg);
  el('rect', { x: 0, y: 28, width: 96, height: 56, rx: 3, fill: '#f0e2c8' }, house); el('path', { d: 'M-8 30L48 -6L104 30Z', fill: '#a8452f' }, house);
  el('rect', { x: 40, y: 50, width: 16, height: 34, rx: 2, fill: '#7a5334' }, house);
  R.win = [el('rect', { x: 10, y: 42, width: 20, height: 18, rx: 2, class: 'win' }, house), el('rect', { x: 66, y: 42, width: 20, height: 18, rx: 2, class: 'win' }, house)];
  el('rect', { x: 118, y: 24, width: 34, height: 60, rx: 4, fill: '#d6d9dc' }, house); el('ellipse', { cx: 135, cy: 24, rx: 17, ry: 8, fill: '#c1c6ca' }, house);     // silo
  el('text', { x: 48, y: 100, class: 'lbl' }, house, 'Sede');

  /* talhões */
  R.plot = {};
  Object.keys(PL).forEach(id => {
    const p = PL[id], g = el('g', { class: 'plot', 'data-plot': id }, svg), r = (R.plot[id] = { g });
    r.soil = el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 8, fill: rgb(C.soilDry) }, g);
    r.cane = el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 8, fill: `url(#cane-${id})` }, g);
    r.sel = el('rect', { x: p.x - 3, y: p.y - 3, width: p.w + 6, height: p.h + 6, rx: 10, class: 'sel' }, g);
    r.pipes = el('path', { d: `M${p.cx} ${MAIN_Y}V${p.y + 40}` + [70, 160, 250].map(dy => `M${p.x + 14} ${p.y + dy}H${p.x + p.w - 14}`).join(''), class: 'pipe' }, g);
    r.water = el('path', { d: r.pipes.getAttribute('d'), class: 'water' }, g);
    r.heads = el('g', {}, g);
    [70, 160, 250].forEach(dy => [p.x + 52, p.cx, p.x + p.w - 52].forEach((x, i) => {
      const h = el('g', { transform: `translate(${x},${p.y + dy})`, class: 'head' }, r.heads); el('circle', { r: 4.5, fill: '#cfd8dc', stroke: '#607d8b' }, h);
      el('circle', { r: 8, class: 'mist m1' }, h); el('circle', { r: 8, class: 'mist m2' }, h);
    }));
    r.badge = el('g', { transform: `translate(${p.x + 8},${p.y + 8})` }, g); r.badgeBg = el('rect', { width: 126, height: 40, rx: 9, class: 'badge' }, r.badge);
    r.badgeT = el('text', { x: 10, y: 17, class: 'b1' }, r.badge, 'Talhão ' + id.slice(1)); r.badgeV = el('text', { x: 10, y: 33, class: 'b2' }, r.badge, '—');
    r.leak = el('ellipse', { cx: p.cx + 26, cy: 648, rx: 24, ry: 7, class: 'puddle' }, g);
  });
  /* tubulação principal */
  R.main = el('path', { d: `M138 ${MAIN_Y}H1200`, class: 'pipe main' }, svg); R.mainW = el('path', { d: `M138 ${MAIN_Y}H138`, class: 'water' }, svg);
  Object.keys(PL).forEach(id => {                               // válvula + medidor
    const p = PL[id], r = R.plot[id], g = el('g', { 'data-dev': 'fm-' + id, class: 'dev' }, svg);
    el('rect', { x: p.cx - 30, y: 626, width: 60, height: 28, rx: 6, class: 'meter' }, g); r.meterT = el('text', { x: p.cx, y: 645, 'text-anchor': 'middle', class: 'mt' }, g, '0,0');
    r.fmLed = el('circle', { cx: p.cx - 22, cy: 632, r: 3, class: 'led' }, g);
    el('circle', { cx: p.cx, cy: 668, r: 6.5, fill: '#37474f' }, g); r.valve = el('rect', { x: p.cx - 2, y: 658, width: 4, height: 10, rx: 1, fill: '#ef5350' }, g);
    r.tag = el('text', { x: p.cx, y: 704, 'text-anchor': 'middle', class: 'tag' }, g, '');
    r.fault = el('text', { x: p.cx, y: 603, 'text-anchor': 'middle', class: 'faultT' }, svg, '');
    /* sensor de solo */
    const s = POS['sm-' + id], sg = el('g', { 'data-dev': 'sm-' + id, class: 'dev', transform: `translate(${s.x},${s.y})` }, svg);
    el('rect', { x: -1.5, y: -2, width: 3, height: 30, fill: '#455a64' }, sg); el('rect', { x: -9, y: -16, width: 18, height: 14, rx: 3, fill: '#eceff1', stroke: '#455a64' }, sg); r.smLed = el('circle', { cx: 0, cy: -9, r: 3, class: 'led' }, sg);
    el('path', { d: 'M-9 -4l-4 -8M9 -4l4 -8', stroke: '#455a64', 'stroke-width': 1.5 }, sg);
  });
  /* casa de bomba + poço */
  const ph = el('g', { 'data-dev': 'pc-01', class: 'dev', transform: 'translate(60,560)' }, svg);
  el('ellipse', { cx: 24, cy: 112, rx: 26, ry: 9, fill: '#6d5a44' }, ph); el('rect', { x: 8, y: 80, width: 32, height: 32, rx: 4, fill: '#b0bec5', stroke: '#546e7a', 'stroke-width': 2 }, ph); el('rect', { x: 4, y: 74, width: 40, height: 10, rx: 3, fill: '#90a4ae' }, ph);
  el('text', { x: 24, y: 134, 'text-anchor': 'middle', class: 'lbl' }, ph, 'Poço');
  R.pumpHouse = el('g', { class: 'pump' }, ph); el('rect', { x: 40, y: 20, width: 100, height: 64, rx: 4, fill: '#cfd8dc', stroke: '#78909c', 'stroke-width': 2 }, R.pumpHouse); el('path', { d: 'M34 22L90 -8L146 22Z', fill: '#546e7a' }, R.pumpHouse);
  R.pcWin = el('rect', { x: 52, y: 38, width: 22, height: 18, rx: 2, class: 'win' }, R.pumpHouse);
  R.motor = el('circle', { cx: 112, cy: 52, r: 13, fill: '#455a64', stroke: '#263238', 'stroke-width': 2 }, R.pumpHouse); R.rotor = el('path', { d: 'M112 42v20M102 52h20', stroke: '#eceff1', 'stroke-width': 3, 'stroke-linecap': 'round', class: 'rotor' }, R.pumpHouse);
  R.pcLed = el('circle', { cx: 130, cy: 30, r: 3.5, class: 'led' }, R.pumpHouse); el('text', { x: 90, y: 100, 'text-anchor': 'middle', class: 'lbl' }, R.pumpHouse, 'Controlador');
  R.pcBadge = el('text', { x: 90, y: 118, 'text-anchor': 'middle', class: 'faultT' }, ph, '');
  /* torre do gateway */
  const tw = el('g', { 'data-dev': 'gw-01', class: 'dev', transform: `translate(${TOWER.x},${TOWER.y})` }, svg);
  el('path', { d: 'M-14 130L0 0L14 130M-11 100H11M-8 70H8M-5 40H5M-12 112L8 88M12 112L-8 88', stroke: '#546e7a', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, tw);
  R.gwDot = el('circle', { cx: 0, cy: -4, r: 6, class: 'led' }, tw); R.gwWaves = el('g', { class: 'waves' }, tw);
  [14, 24, 34].forEach((r, i) => el('path', { d: `M${-r} ${-4 - r * .5}A${r} ${r} 0 0 1 ${r} ${-4 - r * .5}`, style: `--i:${i}` }, R.gwWaves));
  el('text', { x: 0, y: 148, 'text-anchor': 'middle', class: 'lbl' }, tw, 'Gateway'); R.gwBadge = el('text', { x: 0, y: -34, 'text-anchor': 'middle', class: 'faultT' }, tw, '');
  /* estação meteorológica */
  const ws = el('g', { 'data-dev': 'ws-01', class: 'dev', transform: `translate(${POS['ws-01'].x},${POS['ws-01'].y})` }, svg);
  el('rect', { x: -1.5, y: -6, width: 3, height: 40, fill: '#455a64' }, ws); el('rect', { x: -9, y: 2, width: 18, height: 12, rx: 3, fill: '#eceff1', stroke: '#455a64' }, ws); R.wsLed = el('circle', { cx: 0, cy: 8, r: 2.6, class: 'led' }, ws);
  R.anem = el('g', { transform: 'translate(0,-10)' }, ws); R.anemR = el('g', { class: 'anem' }, R.anem); el('circle', { r: 16, fill: 'none' }, R.anemR);
  [0, 120, 240].forEach(a => { el('line', { x1: 0, y1: 0, x2: 0, y2: -12, stroke: '#455a64', 'stroke-width': 2, transform: `rotate(${a})` }, R.anemR); el('circle', { cx: 0, cy: -13, r: 3.4, fill: '#90a4ae', transform: `rotate(${a})` }, R.anemR); });
  el('text', { x: 0, y: 48, 'text-anchor': 'middle', class: 'lbl' }, ws, 'Estação');
  /* app (ícone) */
  const ap = el('g', { transform: `translate(${POS.app.x - 14},${POS.app.y - 22})` }, svg);
  el('rect', { width: 28, height: 46, rx: 6, fill: '#1c2b24', stroke: '#fff', 'stroke-width': 2 }, ap); el('rect', { x: 4, y: 6, width: 20, height: 30, rx: 2, fill: '#1f6b43' }, ap); el('circle', { cx: 14, cy: 21, r: 5, fill: '#fff' }, ap);
  R.appBadge = el('text', { x: 14, y: 62, 'text-anchor': 'middle', class: 'lbl w' }, ap, 'App');

  /* noite, chuva, relâmpago, luzes, pacotes */
  R.night = el('rect', { x: -900, y: 200, width: 3080, height: 1200, fill: '#050b24', opacity: 0, 'pointer-events': 'none' }, svg);
  R.lights = el('g', { 'pointer-events': 'none' }, svg);
  R.rain = el('g', { class: 'rain', 'pointer-events': 'none' }, svg); R.rainEls = []; const rr = rng(5);
  for (let i = 0; i < 170; i++) R.rainEls.push((() => { const x = Math.round(rr() * 1300); return el('line', { x1: x, y1: 0, x2: x - 5, y2: 14, style: `animation-delay:-${(rr() * 0.9).toFixed(2)}s;animation-duration:${(.5 + rr() * .25).toFixed(2)}s` }, R.rain); })());
  R.flash = el('rect', { x: -900, y: -600, width: 3080, height: 2000, fill: '#e8f0ff', opacity: 0, 'pointer-events': 'none' }, svg);
  R.bolt = el('path', { d: 'M700 0L672 120L700 120L660 250L730 100L700 100L726 0Z', fill: '#fffbe0', opacity: 0, 'pointer-events': 'none' }, svg);
  R.pkts = el('g', { 'pointer-events': 'none' }, svg);
  svg.addEventListener('click', e => {
    const p = e.target.closest('[data-plot]'), d = e.target.closest('[data-dev]');
    if (d && R.h.onDevice) R.h.onDevice(d.dataset.dev); else if (p && R.h.onPlot) R.h.onPlot(p.dataset.plot);
  });
  return R;
}

function select(id) { R.sel = id; Object.keys(R.plot).forEach(k => R.plot[k].g.classList.toggle('picked', k === id)); }

function update(S) {
  if (!R) return;
  const e = Sim.elev(S.t), d = sstep(-.10, .22, e), h = Sim.hourOf(S.t), hh = h < 5.6 ? h + 24 : h, w = S.wx;
  const tw = Math.max(0, 1 - Math.abs(e - .05) / .26);
  const ov = clamp(w.cloud * .62 + (w.rain > 0 ? .15 : 0), 0, .85);
  const grey = mx(C.greyN, C.greyD, d);
  let top = mx(C.skyNightTop, C.skyDayTop, d), bot = mx(mx(C.skyNightBot, C.skyDayBot, d), C.dusk, tw * .7);
  top = mx(top, grey, ov); bot = mx(bot, mx(grey, [235, 240, 245], .15), ov * .9);
  if (w.kind === 'heat') bot = mx(bot, A('#ffd7a1'), .5 * d);
  R.skyTop.setAttribute('stop-color', rgb(top)); R.skyBot.setAttribute('stop-color', rgb(bot));
  R.hills.setAttribute('fill', rgb(mx(C.hill, [38, 70, 60], ov * .5)));
  R.stars.setAttribute('opacity', clamp((1 - d * 1.6) * (1 - ov), 0, 1).toFixed(2));
  /* sol e lua */
  const ts = (hh - 5.6) / 13, sunUp = ts >= -.02 && ts <= 1.02;
  R.sun.setAttribute('visibility', sunUp ? 'visible' : 'hidden');
  if (sunUp) {
    const sy = 280 - 235 * Math.sin(Math.PI * clamp(ts, 0, 1)), sx = 90 + 1100 * ts, hot = w.kind === 'heat';
    R.sun.setAttribute('transform', `translate(${sx.toFixed(1)},${sy.toFixed(1)})`);
    R.sunDisc.setAttribute('fill', rgb(mx(A(hot ? '#ff7d1a' : '#ff9a3c'), A('#fff3b0'), clamp(Math.sin(Math.PI * clamp(ts, 0, 1)) * 1.3, 0, 1))));
    R.sunDisc.setAttribute('r', hot ? 34 : 28); R.sunGlow.setAttribute('r', hot ? 130 : 90); R.sun.setAttribute('opacity', (1 - ov * .8).toFixed(2));
  }
  const tm = ((h < 18.6 ? h + 24 : h) - 18.6) / 11, moonUp = tm >= -.02 && tm <= 1.02;
  R.moon.setAttribute('visibility', moonUp ? 'visible' : 'hidden');
  if (moonUp) { R.moon.setAttribute('transform', `translate(${(100 + 1080 * tm).toFixed(1)},${(280 - 215 * Math.sin(Math.PI * clamp(tm, 0, 1))).toFixed(1)})`); R.moon.setAttribute('opacity', (1 - ov * .85).toFixed(2)); }
  /* nuvens */
  const cc = mx(A('#ffffff'), A('#7d8996'), clamp(w.cloud * .55 + (w.rain > 0 ? .3 : 0) + (w.rain > 20 ? .15 : 0), 0, 1)), cn = mx(A('#262e49'), cc, d);
  R.clouds.style.setProperty('--cl', rgb(cn));
  R.cloudEls.forEach((c, i) => c.style.opacity = (i + 1) / 7 <= w.cloud + .07 ? (.55 + .4 * clamp(w.cloud, 0, 1)).toFixed(2) : 0);
  /* escuro da noite / tempestade */
  R.night.setAttribute('opacity', ((1 - d) * .56 + d * w.cloud * .16 + (w.rain > 20 ? .08 : 0)).toFixed(3));
  R.win.concat([R.pcWin]).forEach(x => x.classList.toggle('lit', d < .55 && (x !== R.pcWin || S.pump.power)));
  /* chuva */
  const nr = Math.round(clamp(w.rain / 36, 0, 1) * 170 * (w.rain > 0 ? 1 : 0) + (w.rain > 0 ? 24 : 0));
  if (nr !== R.lastRain) { R.lastRain = nr; R.rainEls.forEach((l, i) => l.style.display = i < nr ? '' : 'none'); }
  R.rain.style.opacity = w.rain > 0 ? clamp(.35 + w.rain / 30, 0, .8) : 0;
  R.rain.classList.toggle('storm', w.kind === 'storm');
  R.anemR.style.animationDuration = Math.max(.25, 4 - w.wind / 12) + 's';
  /* talhões */
  const act = Sim.activeZones(S);
  S.plots.forEach(p => {
    const z = S.zones[p.id], r = R.plot[p.id], k = clamp((p.m - 15) / 35, 0, 1), on = z.on, f = Sim.flowTruth(S, p);
    r.soil.setAttribute('fill', rgb(mx(C.soilDry, C.soilWet, k)));
    const sc = .7 + .55 * p.grow; R['pat_' + p.id].setAttribute('patternTransform', `scale(${sc.toFixed(3)})`);
    r.g.classList.toggle('irrig', on);
    r.badgeV.textContent = 'umidade ' + fmt(p.m) + '%';
    r.badgeBg.setAttribute('class', 'badge ' + (p.m < 30 ? 'bad' : p.m < 35 ? 'warn' : 'ok'));
    r.meterT.textContent = fmt(f, 1);
    r.valve.setAttribute('transform', on ? `rotate(90 ${PL[p.id].cx} 668)` : '');
    r.tag.textContent = on ? `● Irrigando · ${Math.ceil(z.left / 60)} min` : '';
    r.leak.style.opacity = p.leak && on ? 1 : 0;
    r.fault.textContent = p.clog ? '⚠ entupimento' : p.leak ? '⚠ vazamento' : '';
    const fm = Sim.dev(S, 'fm-' + p.id), sm = Sim.dev(S, 'sm-' + p.id);
    r.fmLed.setAttribute('class', 'led ' + (fm.online ? 'ok' : 'bad') + (R.flashT && 0 ? '' : '')); r.smLed.setAttribute('class', 'led ' + (sm.online ? 'ok' : 'bad'));
  });
  /* água na tubulação principal */
  if (act.length) { const mxp = Math.max.apply(null, act.map(p => PL[p.id].cx)); R.mainW.setAttribute('d', `M138 ${MAIN_Y}H${mxp}`); R.mainW.classList.add('on'); } else R.mainW.classList.remove('on');
  R.pumpHouse.classList.toggle('run', act.length > 0);
  R.pcLed.setAttribute('class', 'led ' + (S.pump.locked ? 'bad' : S.pump.power ? 'ok' : 'off'));
  R.pcBadge.textContent = !S.pump.power ? '⚡ sem energia' : S.pump.locked ? '🔒 bloqueada' : S.pump.wellDry ? '⚠ poço seco' : '';
  R.gwDot.setAttribute('class', 'led ' + (S.net.gateway ? 'ok' : 'bad')); R.gwBadge.textContent = S.net.gateway ? (S.net.internet ? '' : 'sem internet') : 'gateway fora do ar';
  R.wsLed.setAttribute('class', 'led ' + (Sim.dev(S, 'ws-01').online ? 'ok' : 'bad'));
  R.svg.classList.toggle('gwoff', !S.net.gateway);
}

/* ---------- sinais ---------- */
function flash(devId) {
  if (!R) return; const map = { 'pc-01': R.pcLed, 'ws-01': R.wsLed, 'gw-01': R.gwDot }, m = /^(sm|fm)-(t\d)$/.exec(devId);
  const led = map[devId] || (m && R.plot[m[2]][m[1] === 'sm' ? 'smLed' : 'fmLed']); if (!led) return;
  led.classList.remove('tx'); void led.getBoundingClientRect(); led.classList.add('tx');
}
function fly(from, to, kind, then) {
  if (!R || R.pk >= 16 || document.hidden) { if (then) then(); return; }
  const a = POS[from], b = POS[to]; if (!a || !b) { if (then) then(); return; }
  const c = el('circle', { r: kind === 'cmd' ? 6 : kind === 'evt' ? 5.5 : 4, class: 'pkt ' + kind }, R.pkts); R.pk++;
  const an = c.animate([{ transform: `translate(${a.x}px,${a.y}px)` }, { transform: `translate(${b.x}px,${b.y}px)` }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
  an.onfinish = () => { c.remove(); R.pk--; if (then) then(); };
}
function lightning() {
  if (!R) return; R.flash.animate([{ opacity: .85 }, { opacity: 0, offset: .25 }, { opacity: .5, offset: .4 }, { opacity: 0 }], { duration: 520 });
  R.bolt.setAttribute('transform', `translate(${Math.round((Math.random() - .5) * 700)},0)`); R.bolt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
}

root.FarmScene = { mount, update, select, flash, fly, lightning, POS, PL };
})(window);
