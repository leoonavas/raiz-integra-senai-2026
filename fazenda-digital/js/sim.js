/* Fazenda Digital — mundo físico: relógio, clima, solo, bomba, poço e dispositivos de campo.
   Aqui NÃO há regra do Raiz (recomendação, alertas): isso é do gateway (gateway.js).
   Os dispositivos só medem e emitem leituras (telemetria) e o controlador só obedece comandos. */
(function (root) {
'use strict';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
const r1 = v => Math.round(v * 10) / 10;
const pad = n => String(n).padStart(2, '0');
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- tempo ----------
   t = minutos desde 17/11/2026 00:00 (hora local da fazenda). ts = epoch em ms lido com getters UTC. */
const BASE = Date.UTC(2026, 10, 17);
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const tsOf = t => BASE + Math.round(t) * 60000;
const minOfDay = t => ((Math.floor(t) % 1440) + 1440) % 1440;
const hourOf = t => minOfDay(t) / 60;
const hhmm = t => pad(Math.floor(minOfDay(t) / 60)) + ':' + pad(minOfDay(t) % 60);
const dayOf = t => Math.floor(t / 1440);
const when = (t, now) => { const d = dayOf(now == null ? t : now) - dayOf(t); return (d === 0 ? 'Hoje' : d === 1 ? 'Ontem' : WD[new Date(tsOf(t)).getUTCDay()]) + ' · ' + hhmm(t); };
const dateLabel = t => { const d = new Date(tsOf(t)); return WD[d.getUTCDay()] + ', ' + pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
/* elevação do sol aproximada (−1..1): nasce ≈ 05:36, põe ≈ 18:36 */
const elev = t => { const h = hourOf(t), hh = h < 5.6 ? h + 24 : h; return Math.sin(Math.PI * (hh - 5.6) / 13); };

/* ---------- clima ---------- */
const KINDS = {
  sun:   { label: 'Ensolarado',       cloud: .08, rain: 0,  dT: 0,    wind: 8 },
  part:  { label: 'Parcialmente nublado', cloud: .45, rain: 0, dT: -1,  wind: 12 },
  cloud: { label: 'Nublado',          cloud: .88, rain: 0,  dT: -2.5, wind: 12 },
  rain:  { label: 'Chuva',            cloud: 1,   rain: 12, dT: -5,   wind: 16 },
  storm: { label: 'Tempestade',       cloud: 1,   rain: 36, dT: -6.5, wind: 42 },
  heat:  { label: 'Onda de calor',    cloud: 0,   rain: 0,  dT: 5,    wind: 6 }
};

/* ---------- definição da propriedade ---------- */
const PLOT_DEFS = [
  { id: 't1', name: 'Talhão 1', crop: 'Cana-de-açúcar', area: 10.2, flowRef: 25.0, m0: 35.0, grow: .55, etK: 1.08 },
  { id: 't2', name: 'Talhão 2', crop: 'Cana-de-açúcar', area: 8.6,  flowRef: 22.0, m0: 40.0, grow: .78, etK: 1.0 },
  { id: 't3', name: 'Talhão 3', crop: 'Cana-de-açúcar', area: 12.0, flowRef: 30.0, m0: 44.0, grow: .32, etK: .92 }
];
const DEV_DEFS = [
  { id: 'gw-01', name: 'Gateway Raiz GW-01', type: 'gateway', link: 'Wi-Fi / Ethernet', fw: '1.2.0' },
  { id: 'pc-01', name: 'Controlador do poço', type: 'controller', link: 'LoRa', fw: '1.2.0', rssi: -71 },
  { id: 'fm-t1', name: 'Medidor de vazão · T1', type: 'flow', plot: 't1', link: 'LoRa', fw: '1.1.4', rssi: -68, batt: 88, drain: .00006 },
  { id: 'fm-t2', name: 'Medidor de vazão · T2', type: 'flow', plot: 't2', link: 'LoRa', fw: '1.1.4', rssi: -72, batt: 83, drain: .00006 },
  { id: 'fm-t3', name: 'Medidor de vazão · T3', type: 'flow', plot: 't3', link: 'LoRa', fw: '1.1.4', rssi: -76, batt: 79, drain: .00006 },
  { id: 'sm-t1', name: 'Sensor de umidade · T1', type: 'soil', plot: 't1', link: 'LoRa', fw: '1.0.7', rssi: -80, batt: 91, drain: .00005 },
  { id: 'sm-t2', name: 'Sensor de umidade · T2', type: 'soil', plot: 't2', link: 'LoRa', fw: '1.0.7', rssi: -77, batt: 64, drain: .00005 },
  { id: 'sm-t3', name: 'Sensor de umidade · T3', type: 'soil', plot: 't3', link: 'LoRa', fw: '1.0.5', rssi: -84, batt: 38, drain: .00005 },
  { id: 'ws-01', name: 'Estação meteorológica', type: 'weather', link: 'LoRa', fw: '1.0.2', rssi: -74, batt: 78, drain: .00004 }
];
const SOIL_FC = 46;         // capacidade de campo (% vol.): acima disso o solo drena
const SOIL_MAX = 52;

function create(opts) {
  const o = opts || {};
  const S = {
    t: 330, speed: 2, running: true, acc: 0,
    seed: o.seed || 20261117, rng: mulberry32(o.seed || 20261117),
    wx: { mode: 'auto', manual: 'sun', kind: 'sun', cloud: .08, rain: 0, temp: 21.3, hum: 70, wind: 8 },
    plan: [], planDay: -1, forecastOverride: null,
    plots: PLOT_DEFS.map(d => Object.assign({}, d, { m: d.m0, clog: false, leak: false, total: 0 })),
    zones: {}, pump: { power: true, wellDry: false, locked: false, reason: '', dry: 0 },
    net: { gateway: true, internet: true },
    devices: DEV_DEFS.map(d => Object.assign({ batt: null, rssi: null, drain: 0 }, d, { online: true, forcedOff: false, lowBatt: false, restartUntil: 0, lastEmit: -9999, last: null })),
    hooks: { telemetry() { }, log() { }, zone() { } }
  };
  S.plots.forEach(p => { S.zones[p.id] = { on: false, left: 0, total: 0, startT: 0 }; });
  ensurePlan(S);
  return S;
}

/* eventos de chuva planejados (usados também pela previsão do tempo) */
function ensurePlan(S) {
  const need = dayOf(S.t) + 2;
  while (S.planDay < need) {
    S.planDay++; const d = S.planDay, r = S.rng();
    if (d === 1) { S.plan.push({ s: 1440 + 15 * 60 + 10, e: 1440 + 15 * 60 + 90, kind: 'rain' }); continue; }
    const n = r < .55 ? 1 : r < .72 ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const night = S.rng() < .2, st = d * 1440 + (night ? Math.floor(S.rng() * 300) : 780 + Math.floor(S.rng() * 360)), dur = 60 + Math.floor(S.rng() * 120);
      S.plan.push({ s: st, e: st + dur, kind: S.rng() < .25 ? 'storm' : 'rain' });
    }
  }
  S.plan.sort((a, b) => a.s - b.s);
}
function autoKind(S) {
  const t = S.t, ev = S.plan.find(e => t >= e.s && t < e.e); if (ev) return ev.kind;
  if (S.plan.some(e => (t >= e.s - 60 && t < e.s) || (t >= e.e && t < e.e + 45))) return 'cloud';
  const d = dayOf(t), h = hourOf(t), dk = ((d % 5) + 5 + 3) % 5;
  return dk === 0 ? 'cloud' : ((h > 11 && h < 17) || dk === 1) ? 'part' : 'sun';
}
function baseTemp(t) { return 26.5 + 6.5 * Math.sin(2 * Math.PI * (hourOf(t) - 9) / 24); }

/* previsão (serviço de internet simulado): % de chuva nas próximas 6 h */
function forecast(S) {
  ensurePlan(S);
  const hours = [];
  for (let i = 0; i < 6; i++) {
    const a = S.t + i * 60, b = a + 60, hr = Math.floor(hourOf(a + 60)), jit = (hr * 37) % 9;
    let p;
    if (S.wx.mode === 'auto') {
      if (S.plan.some(e => e.s < b && e.e > a)) p = 72 + jit * 3;
      else if (S.plan.some(e => e.s >= b && e.s < b + 120)) p = 40 + jit;
      else p = 6 + jit;
    } else {
      const k = S.wx.manual; p = (k === 'storm' ? 95 : k === 'rain' ? 85 : k === 'cloud' ? 30 : k === 'part' ? 14 : k === 'heat' ? 2 : 6) + (k === 'storm' || k === 'rain' ? 0 : jit);
    }
    if (S.forecastOverride != null) p = S.forecastOverride;
    const off = S.wx.mode === 'auto' ? (p > 60 ? -5 : 0) : KINDS[S.wx.manual].dT;
    hours.push({ h: pad(hr) + 'h', t: Math.round(baseTemp(a + 60) + off), p: Math.round(clamp(p, 0, 100)) });
  }
  const rainProb = Math.max.apply(null, hours.slice(0, 3).map(x => x.p));
  return { rainProb, hourly: hours };
}

/* ---------- física (1 passo = dt minutos simulados) ---------- */
const activeZones = S => S.plots.filter(p => S.zones[p.id].on);
function flowTruth(S, p) {
  if (!S.zones[p.id].on) return 0;
  let f = p.flowRef * (activeZones(S).length > 1 ? .93 : 1);
  if (S.pump.wellDry) f *= .08; else if (p.clog) f *= .62; else if (p.leak) f *= 1.45;
  return f;
}
function pressTruth(S, p) {
  if (!S.zones[p.id].on) return 0;
  let v = 2.4 * (activeZones(S).length > 1 ? .95 : 1);
  if (S.pump.wellDry) v = .3; else if (p.clog) v *= 1.3; else if (p.leak) v *= .78;
  return v;
}
function weatherStep(S, dt) {
  const w = S.wx; w.kind = w.mode === 'auto' ? autoKind(S) : w.manual;
  const K = KINDS[w.kind], k = 1 - Math.pow(.88, dt);
  w.cloud += (K.cloud - w.cloud) * k;
  const rt = K.rain ? K.rain * (.8 + .4 * Math.abs(Math.sin(S.t / 7))) : 0;
  w.rain += (rt - w.rain) * Math.min(1, k * 1.6); if (w.rain < .05) w.rain = 0;
  w.temp += ((baseTemp(S.t) + K.dT) - w.temp) * Math.min(1, .08 * dt);
  w.hum = clamp(100 - (w.temp - 12) * 2.6 + w.cloud * 12 + (w.rain > 0 ? 15 : 0), 25, 99);
  w.wind += (K.wind - w.wind) * Math.min(1, .1 * dt);
}
function soilStep(S, dt) {
  const w = S.wx, e = Math.max(0, elev(S.t));
  const etBase = (0.0004 + 0.0115 * Math.pow(e, 1.2) * clamp((w.temp - 10) / 22, .3, 1.7)) * (1 - .55 * w.cloud) * (w.rain > 0 ? .2 : 1) * (w.kind === 'heat' ? 1.25 : 1);
  S.plots.forEach(p => {
    const z = S.zones[p.id], f = flowTruth(S, p);
    let d = -etBase * p.etK * dt + w.rain * .0038 * dt;
    if (z.on) d += .30 * (p.leak ? .85 : Math.min(1, f / p.flowRef)) * dt;
    if (p.m > SOIL_FC) d -= (p.m - SOIL_FC) * .01 * dt;
    p.m = clamp(p.m + d, 3, SOIL_MAX);
    p.total += f * dt / 60;
    p.grow = Math.min(1, p.grow + .0000025 * dt);
  });
}
function pumpStep(S, dt) {
  const P = S.pump; let any = false;
  S.plots.forEach(p => {
    const z = S.zones[p.id]; if (!z.on) return; any = true;
    z.left -= dt * 60;
    if (z.left <= 0) { z.on = false; z.left = 0; S.hooks.log('Temporizador do controlador encerrou a irrigação · ' + p.name, 'sim'); S.hooks.zone(p.id, 'done'); emitNow(S, 'pc-01'); emitNow(S, 'fm-' + p.id); }
  });
  if (P.wellDry && any) { P.dry += dt; if (P.dry >= 2) trip(S, 'Funcionamento a seco detectado.'); } else P.dry = 0;
}
function trip(S, reason) {
  S.plots.forEach(p => { const z = S.zones[p.id]; if (z.on) { z.on = false; z.left = 0; S.hooks.zone(p.id, 'trip'); emitNow(S, 'fm-' + p.id); } });
  S.pump.locked = true; S.pump.reason = reason; S.hooks.log('Controlador bloqueou a bomba: ' + reason, 'bad'); emitNow(S, 'pc-01');
}

/* ---------- dispositivos ---------- */
const dev = (S, id) => S.devices.find(d => d.id === id);
function periodOf(S, d) {
  if (d.type === 'controller') return activeZones(S).length ? 1 : 10;
  if (d.type === 'flow') return S.zones[d.plot].on ? 1 : 15;
  return d.type === 'soil' || d.type === 'weather' ? 10 : 999999;
}
function values(S, d) {
  const w = S.wx, p = d.plot ? S.plots.find(x => x.id === d.plot) : null;
  if (d.type === 'soil') return { moisture: r1(clamp(p.m + gauss() * .12, 0, 100)) };
  if (d.type === 'flow') { const f = flowTruth(S, p), pr = pressTruth(S, p); return { flow: Math.max(0, r1(f * (1 + gauss() * .015))), pressure: f > 0 ? Math.max(0, Math.round((pr + gauss() * .03) * 100) / 100) : 0, total: r1(p.total) }; }
  if (d.type === 'weather') return { temp: r1(w.temp + gauss() * .15), humidity: Math.round(clamp(w.hum + gauss(), 0, 100)), rain: r1(w.rain), wind: Math.round(w.wind + gauss() * 1.5), light: Math.round(Math.max(0, elev(S.t)) * (1 - .7 * w.cloud) * 100) };
  if (d.type === 'controller') {
    const z = {}; S.plots.forEach(q => { const zz = S.zones[q.id]; z[q.id] = { state: zz.on ? 'on' : 'off', left: Math.round(zz.left), total: zz.total }; });
    return { state: S.pump.power ? (S.pump.locked ? 'locked' : 'ok') : 'nopower', reason: S.pump.reason, well: S.pump.wellDry ? 'dry' : 'ok', zones: z };
  }
  return null;
}
function emit(S, d) {
  if (!d.online || d.type === 'gateway') return;
  d.lastEmit = S.t; if (d.rssi != null) d.rssi = clamp(d.rssi + Math.round(gauss() * 2), -95, -55);
  const v = values(S, d); if (!v) return; d.last = v;
  S.hooks.telemetry(d, v);
}
function emitNow(S, id) { const d = dev(S, id); if (d) emit(S, d); }
function deviceStep(S, dt) {
  S.devices.forEach(d => {
    if (d.type === 'gateway') return;
    if (d.restartUntil && S.t >= d.restartUntil) { d.restartUntil = 0; d.online = !d.forcedOff; d.lastEmit = -9999; }
    if (d.batt != null) { d.batt = Math.max(0, d.batt - d.drain * dt); if (d.lowBatt) d.batt = Math.min(d.batt, 9); }
    if (d.online && S.t - d.lastEmit >= periodOf(S, d)) emit(S, d);
  });
}

function step(S, dt) {
  dt = dt || 1; S.t += dt;
  ensurePlan(S); weatherStep(S, dt); soilStep(S, dt); pumpStep(S, dt); deviceStep(S, dt);
}

/* ---------- atuadores (o que o controlador aceita) ---------- */
const act = {
  start(S, plot, minutes) {
    const z = S.zones[plot], P = S.pump; if (!z) return { ok: false, text: 'Talhão desconhecido.' };
    if (!P.power) return { ok: false, text: 'Controlador sem energia.' };
    if (P.locked) return { ok: false, text: 'Bomba bloqueada — rearme após inspeção.' };
    if (z.on) return { ok: false, text: 'Este setor já está irrigando.' };
    if (activeZones(S).length >= 2) return { ok: false, text: 'Capacidade da bomba: no máximo 2 setores ao mesmo tempo.' };
    Object.assign(z, { on: true, left: minutes * 60, total: minutes * 60, startT: S.t });
    S.hooks.log('Controlador abriu a válvula do ' + plot.toUpperCase() + ' e ligou a bomba (' + minutes + ' min)', 'sim'); S.hooks.zone(plot, 'start');
    emitNow(S, 'pc-01'); emitNow(S, 'fm-' + plot); return { ok: true, text: 'Bomba ligada.' };
  },
  stop(S, plot) {
    const z = S.zones[plot]; if (!z) return { ok: false, text: 'Talhão desconhecido.' };
    if (!z.on) return { ok: true, text: 'O setor já estava desligado.' };
    z.on = false; z.left = 0; S.hooks.log('Controlador desligou o ' + plot.toUpperCase(), 'sim'); S.hooks.zone(plot, 'stop');
    emitNow(S, 'pc-01'); emitNow(S, 'fm-' + plot); return { ok: true, text: 'Bomba desligada.' };
  },
  emergency(S) {
    trip(S, 'Parada de emergência acionada.'); return { ok: true, text: 'Parada de emergência executada.' };
  },
  rearm(S) {
    const P = S.pump; if (!P.locked) return { ok: true, text: 'A bomba já estava liberada.' };
    if (/seco/.test(P.reason) && P.wellDry) return { ok: false, text: 'O poço ainda está sem água — verifique o nível antes de rearmar.' };
    P.locked = false; P.reason = ''; P.dry = 0; S.hooks.log('Controlador rearmado', 'sim'); emitNow(S, 'pc-01'); return { ok: true, text: 'Bomba rearmada.' };
  },
  restart(S, id) {
    const d = dev(S, id); if (!d || d.type === 'gateway') return { ok: false, text: 'Dispositivo não encontrado.' };
    if (!d.online) return { ok: false, text: 'Dispositivo sem comunicação — não é possível reiniciar à distância.' };
    d.online = false; d.restartUntil = S.t + 3; S.hooks.log(d.name + ' reiniciando…', 'sim'); return { ok: true, text: 'Reinício enviado.' };
  }
};


/* conserto de uma falha (manutenção concluída). key = chave do alerta do gateway */
function fix(S, key) {
  const id = key.split(':')[1] || '';
  if (key.startsWith('low:')) { const p = S.plots.find(x => x.id === id); if (p) p.clog = false; }
  else if (key.startsWith('high:')) { const p = S.plots.find(x => x.id === id); if (p) p.leak = false; }
  else if (key.startsWith('off:')) { const d = dev(S, id); if (d) { d.forcedOff = false; if (!d.restartUntil) d.online = true; } }
  else if (key.startsWith('batt:')) { const d = dev(S, id); if (d) { d.lowBatt = false; d.batt = 100; } }
  else if (key === 'dry') S.pump.wellDry = false;
  else if (key === 'power') S.pump.power = true;
  S.hooks.log('Manutenção concluída: ' + key, 'sim');
}


/* execução de um pedido no controlador (usado pelo gateway local e pelo pedido 'actuate' vindo da nuvem) */
function actuate(S, cmd, a) {
  a = a || {};
  switch (cmd) {
    case 'pump.start': return act.start(S, a.plot, a.minutes);
    case 'pump.stop': return act.stop(S, a.plot);
    case 'pump.emergency': return act.emergency(S);
    case 'pump.rearm': return act.rearm(S);
    case 'device.restart': return act.restart(S, a.id);
    case 'fix': fix(S, a.key); return { ok: true };
    default: return { ok: false, text: 'Comando desconhecido.' };
  }
}

/* instantâneo da simulação (para continuar de onde parou ao recarregar a página) */
function snapshot(S) {
  return {
    v: 1, t: S.t, speed: S.speed, wx: Object.assign({}, S.wx), plan: S.plan, planDay: S.planDay, forecastOverride: S.forecastOverride,
    plots: S.plots.map(p => ({ id: p.id, m: p.m, clog: p.clog, leak: p.leak, total: p.total, grow: p.grow })),
    zones: JSON.parse(JSON.stringify(S.zones)), pump: Object.assign({}, S.pump), net: Object.assign({}, S.net),
    devices: S.devices.map(d => ({ id: d.id, online: d.online, forcedOff: d.forcedOff, lowBatt: d.lowBatt, restartUntil: d.restartUntil, lastEmit: d.lastEmit, batt: d.batt, rssi: d.rssi }))
  };
}
function restore(S, o) {
  if (!o || o.v !== 1) return false;
  S.t = o.t; S.speed = o.speed || S.speed; Object.assign(S.wx, o.wx); S.plan = o.plan || []; S.planDay = o.planDay; S.forecastOverride = o.forecastOverride;
  (o.plots || []).forEach(q => { const p = S.plots.find(x => x.id === q.id); if (p) Object.assign(p, q); });
  Object.keys(o.zones || {}).forEach(k => { if (S.zones[k]) Object.assign(S.zones[k], o.zones[k]); });
  Object.assign(S.pump, o.pump); Object.assign(S.net, o.net);
  (o.devices || []).forEach(q => { const d = S.devices.find(x => x.id === q.id); if (d) Object.assign(d, q); });
  S.rng = mulberry32(((S.seed || 20261117) + Math.max(0, S.planDay)) >>> 0);     // a semente continua de onde o plano parou
  ensurePlan(S); return true;
}

/* ---------- falhas injetáveis ---------- */
const faults = {
  list(S, plotId) {
    const p = S.plots.find(x => x.id === plotId), sm = dev(S, 'sm-' + plotId), fm = dev(S, 'fm-' + plotId);
    return [
      ['clog', 'Entupimento', p.clog], ['leak', 'Vazamento', p.leak],
      ['soil', 'Sensor de umidade sem comunicação', sm.forcedOff], ['battery', 'Bateria do sensor baixa', sm.lowBatt], ['meter', 'Medidor de vazão sem comunicação', fm.forcedOff]
    ];
  },
  toggle(S, key, plotId) {
    const p = S.plots.find(x => x.id === plotId), sm = dev(S, 'sm-' + plotId), fm = dev(S, 'fm-' + plotId);
    if (key === 'clog') { p.clog = !p.clog; if (p.clog) p.leak = false; }
    else if (key === 'leak') { p.leak = !p.leak; if (p.leak) p.clog = false; }
    else if (key === 'soil') { sm.forcedOff = !sm.forcedOff; sm.online = !sm.forcedOff && !sm.restartUntil; }
    else if (key === 'battery') { sm.lowBatt = !sm.lowBatt; if (!sm.lowBatt) sm.batt = 60; }
    else if (key === 'meter') { fm.forcedOff = !fm.forcedOff; fm.online = !fm.forcedOff && !fm.restartUntil; }
    else if (key === 'well') { S.pump.wellDry = !S.pump.wellDry; }
    else if (key === 'power') { S.pump.power = !S.pump.power; if (!S.pump.power) { S.plots.forEach(q => { const z = S.zones[q.id]; if (z.on) { z.on = false; z.left = 0; emitNow(S, 'fm-' + q.id); } }); } emitNow(S, 'pc-01'); }
    else if (key === 'wstation') { const w = dev(S, 'ws-01'); w.forcedOff = !w.forcedOff; w.online = !w.forcedOff && !w.restartUntil; }
    else if (key === 'gateway') S.net.gateway = !S.net.gateway;
    else if (key === 'internet') S.net.internet = !S.net.internet;
    S.hooks.log('Falha/condição alterada: ' + key + (plotId ? ' · ' + plotId.toUpperCase() : ''), 'sim');
  },
  isOn(S, key, plotId) {
    if (key === 'well') return S.pump.wellDry; if (key === 'power') return !S.pump.power; if (key === 'wstation') return dev(S, 'ws-01').forcedOff;
    if (key === 'gateway') return !S.net.gateway; if (key === 'internet') return !S.net.internet;
    const f = this.list(S, plotId).find(x => x[0] === key); return f ? !!f[2] : false;
  },
  clearAll(S) {
    S.plots.forEach(p => { p.clog = false; p.leak = false; });
    S.devices.forEach(d => { d.forcedOff = false; d.lowBatt = false; if (!d.restartUntil) d.online = true; });
    S.pump.wellDry = false; S.pump.power = true; S.net.gateway = true; S.net.internet = true;
    S.hooks.log('Todas as falhas foram corrigidas', 'sim');
  }
};

const Sim = { create, step, forecast, act, fix, actuate, snapshot, restore, faults, emitNow, dev, KINDS, PLOT_DEFS, DEV_DEFS, activeZones, flowTruth, pressTruth, tsOf, hhmm, when, dateLabel, hourOf, dayOf, elev, baseTemp, ensurePlan };
root.FarmSim = Sim;
if (typeof module !== 'undefined') module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
