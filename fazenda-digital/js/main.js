/* Fazenda Digital — liga tudo: simulação + gateway + cena + canal com o app + painel de controle. */
(() => {
'use strict';
const Sim = window.FarmSim, Scene = window.FarmScene, Gw = window.FarmGateway;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const q = new URLSearchParams(location.search);
const cfg = Object.assign({}, window.FARM_CONFIG);
if (q.get('farm')) cfg.farmId = q.get('farm'); if (q.get('transport')) cfg.transport = q.get('transport'); if (q.get('app')) cfg.appUrl = q.get('app');

/* ---------- mundo, gateway, canal ---------- */
const S = Sim.create({ seed: cfg.seed });
let fast = false, appSeen = 0, link = null, selPlot = 't1', tab = 'amb', logPaused = false, logSeq = 0;
const logs = [], openLogs = new Set(), filt = { tel: true, evt: true, cmd: true, sim: true }, sched = [];
const visual = () => !fast && S.speed <= 15 && !document.hidden;
const CAT = { telemetry: 'tel', heartbeat: 'tel', command: 'cmd', 'command.ack': 'cmd' };
const hhmmOfTs = ts => { const d = new Date(ts); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

function addLog(e) {
  e.id = ++logSeq; logs.unshift(e); if (logs.length > 400) logs.length = 400; dirtyLog = true;
}
let dirtyLog = false;
try {
  link = RaizLink.open({ farmId: cfg.farmId, role: 'farm', transport: cfg.transport });
  link.tap((dir, m) => {
    if (m.type === 'app.ping' || logPaused) return;
    addLog({ dir, t: dir === 'out' ? hhmmOfTs(m.ts) : Sim.hhmm(S.t), type: m.type, payload: m.payload, cat: CAT[m.type] || 'evt', msg: m });
  });
} catch (e) { console.error(e); setTimeout(() => { $('#hint').textContent = 'Canal indisponível: ' + e.message; }, 0); }

/* Dois gateways com as mesmas regras (shared/gateway-core.js):
   • nuvem (Edge Function do Supabase) — manda quando há internet: a fazenda envia as leituras em lotes e recebe as ordens na resposta;
   • local (aqui no navegador, como o gateway instalado na fazenda) — assume sem internet ou se a nuvem falhar, e devolve o estado quando a internet volta. */
const SUPA = !!link && link.transport === 'supabase';
let mode = 'local', E = null, booted = false, farmInfo = null, retryAt = 0, readOnly = false, gwWasUp = true;
const call = (op, body) => link.invoke('gateway', Object.assign({ op, farm_id: farmInfo.id }, body));

function toApp(type, payload) {
  if (!S.net.gateway || !link || mode === 'edge') return;
  link.send(type, payload, Sim.tsOf(S.t));
  if (visual() && type !== 'telemetry' && type !== 'heartbeat') Scene.fly('gw', 'app', 'evt');
}
const gw = Gw.create(S, toApp);
const helloMsg = () => { const h = gw.hello(); if (farmInfo) h.farm = { id: farmInfo.id, name: farmInfo.name, city: farmInfo.city || '' }; return h; };
S.hooks.telemetry = (d, v) => {
  if (visual()) { Scene.flash(d.id); Scene.fly(d.id, 'gw', 'tel', () => { if (visual() && S.net.gateway) Scene.fly('gw', 'app', 'tel'); }); }
  if (!S.net.gateway) return;
  if (mode === 'edge') E.push(d, v); else gw.ingestDev(d, v);
};
S.hooks.log = (m, k) => { if (!logPaused) addLog({ dir: 'sim', t: Sim.hhmm(S.t), type: k === 'bad' ? 'alerta' : 'simulação', payload: m, cat: 'sim', bad: k === 'bad' }); };
S.hooks.zone = () => { };

async function toEdge() {
  mode = 'sync';
  try {
    const r = await call('sync', { state: gw.exportState(), t: S.t });
    if (!r || !r.ok) throw new Error((r && r.error) || 'sem resposta');
    gw.muted = true; E.needConfig = false; E.fails = 0; E.queue.length = 0; E.acks.length = 0; mode = 'edge';
    S.hooks.log('Gateway na nuvem (Edge Function) assumiu', 'sim');
  } catch (e) { mode = 'local'; retryAt = Date.now() + 15000; S.hooks.log('Edge Function indisponível — seguindo no gateway local (' + e.message + ')', 'bad'); }
}
function toLocal() {
  if (E.lastState) gw.importState(E.lastState);
  gw.muted = false; mode = 'local'; E.queue.length = 0; E.acks.length = 0;
  if (S.net.internet) retryAt = Date.now() + 15000; else E.flush({ internet: false });      // avisa a nuvem (simulação) antes de silenciar
  E.fails = 0; S.hooks.log(S.net.internet ? 'Nuvem indisponível — o gateway local assumiu' : 'Sem internet — o gateway local assumiu', 'sim');
}
function modeCheck() {
  if (!SUPA || !E || !booted || readOnly) return;
  if (mode === 'edge' && (!S.net.internet || E.fails >= 3)) toLocal();
  else if (mode === 'local' && S.net.internet && Date.now() > retryAt) toEdge();
}

function stepAll() {
  Sim.step(S, 1);
  if (S.net.gateway) {
    if (!gwWasUp) { S.devices.forEach(d => { gw.lastSeen[d.id] = S.t; }); gw.prevNet = S.net.internet; if (mode === 'edge') E.flush(); }
    if (mode !== 'edge') gw.tick(S.t);
  } else if (gwWasUp && mode === 'edge') E.flush();                      // simulação: a fazenda avisa a nuvem que o gateway local caiu
  gwWasUp = S.net.gateway;
  modeCheck();
  for (let i = sched.length - 1; i >= 0; i--) if (S.t >= sched[i].at) { const f = sched[i].fn; sched.splice(i, 1); f(); }
}

/* histórico de 24 h: roda a simulação antes de abrir o canal */
function prerun() {
  gw.muted = true; fast = true;
  for (let i = 0; i < 1440; i++) stepAll();
  gw.muted = false; fast = false; logs.length = 0; S.t = Math.round(S.t); gw.forecastAt = S.t - 999;
}

async function saveSim() {
  if (!SUPA || !booted || readOnly || mode === 'sync') return;
  try { await link.sb.from('sim_state').upsert({ farm_id: farmInfo.id, state: { sim: Sim.snapshot(S), gw: (mode === 'edge' && E.lastState) || gw.exportState() }, updated_at: new Date().toISOString() }); } catch (e) { console.warn('[sim_state]', e); }
}
async function resetAll() {
  if (!confirm('Reiniciar a simulação do zero? A fazenda volta ao dia 1 e o histórico de alertas do gateway é apagado.')) return;
  if (SUPA && booted && !readOnly) { try { await call('reset'); await link.sb.from('sim_state').delete().eq('farm_id', farmInfo.id); } catch (e) { console.warn(e); } }
  location.reload();
}

async function bootSupa() {
  let info;
  try { info = await link.ready; } catch (e) { $('#hint').textContent = 'Sem conexão com a nuvem: ' + e.message; return; }
  farmInfo = info.farm;
  if (info.role !== 'gestor') { readOnly = true; S.running = false; booted = true; $('#hint').textContent = 'Somente o gestor opera a Fazenda Digital. Abra o app para acompanhar.'; return; }
  let restored = false;
  try {
    const { data } = await link.sb.from('sim_state').select('state').eq('farm_id', farmInfo.id).maybeSingle();
    if (data && data.state && Sim.restore(S, data.state.sim)) { if (data.state.gw) gw.importState(data.state.gw); restored = true; gwWasUp = S.net.gateway; S.hooks.log('Simulação retomada de onde parou', 'sim'); }
  } catch (e) { console.warn(e); }
  if (!restored) prerun();
  E = FarmEdge.create({ S, call });
  try {
    const st = await call('status');
    if (!restored || !st.hasState) { const r = await call('sync', { state: gw.exportState(), t: S.t }); if (!r || !r.ok) throw new Error((r && r.error) || 'sync'); }
    E.needConfig = false;
    if (S.net.internet) { gw.muted = true; mode = 'edge'; S.hooks.log('Gateway na nuvem (Edge Function) ativo', 'sim'); }
  } catch (e) { mode = 'local'; retryAt = Date.now() + 15000; S.hooks.log('Edge Function indisponível — gateway local ativo (' + e.message + ')', 'bad'); }
  booted = true; setInterval(saveSim, 15000);
}

if (link) {
  link.on(m => {
    if (m.type === 'app.ping') { appSeen = Date.now(); return; }
    if (m.type === 'hello.request') { appSeen = Date.now(); if (mode !== 'edge') toApp('hello', helloMsg()); return; }
    if (m.type === 'command') {
      appSeen = Date.now();
      if (mode === 'edge') { S.hooks.log('Comando recebido pelo canal local ignorado: com internet a nuvem decide', 'bad'); return; }
      if (!S.net.gateway) { S.hooks.log('Comando ' + (m.payload && m.payload.cmd) + ' perdido: o gateway está fora do ar', 'bad'); return; }
      if (visual()) Scene.fly('app', 'gw', 'cmd', () => { if (/^pump\./.test(m.payload.cmd)) Scene.fly('gw', 'pc-01', 'cmd'); });
      gw.command(m.payload || {}); refresh(true);
    }
  });
  if (SUPA) bootSupa();
  else { link.ready.then(info => { farmInfo = info.farm || null; setTimeout(() => toApp('hello', helloMsg()), 300); }).catch(() => { }); prerun(); booted = true; }
}

/* ---------- laço principal ----------
   Roda num Web Worker: o navegador atrasa timers de abas em segundo plano (e a conexão com o gateway "caía"),
   mas mensagens vindas de um Worker não são atrasadas. */
let tickN = 0, lastTick = performance.now();
function advance(n) { for (let i = 0; i < n; i++) stepAll(); }
function onTick() {
  tickN++;
  const now = performance.now(), dt = Math.min(5, (now - lastTick) / 1000); lastTick = now;
  if (booted && !readOnly && S.running && S.speed > 0) { S.acc += S.speed * dt; const n = Math.min(Math.floor(S.acc), 120); S.acc -= Math.floor(S.acc); advance(n); }
  refresh(false);
  if (booted && mode === 'edge' && S.net.gateway && tickN % 3 === 0) E.flush();                                   // a cada ~1,5 s
  if (booted && link && mode !== 'edge' && S.net.gateway && tickN % 4 === 0) link.send('heartbeat', gw.heartbeat(), Sim.tsOf(S.t));
}
try {
  const w = new Worker(URL.createObjectURL(new Blob(['let id;onmessage=e=>{clearInterval(id);id=setInterval(()=>postMessage(0),e.data)}'], { type: 'text/javascript' })));
  w.onmessage = onTick; w.postMessage(500);
} catch (e) { setInterval(onTick, 500); }
setInterval(() => { if (S.wx.kind === 'storm' && !document.hidden && Math.random() < .55) Scene.lightning(); }, 5200);

/* ---------- interface ---------- */
const SPEEDS = [[0, '⏸'], [1, '1'], [2, '2'], [5, '5'], [15, '15'], [60, '60']];
const WXBTN = [['auto', 'Automático'], ['sun', 'Ensolarado'], ['part', 'Parcial'], ['cloud', 'Nublado'], ['rain', 'Chuva'], ['storm', 'Tempestade'], ['heat', 'Onda de calor']];
const TABS = [['amb', 'Ambiente'], ['flt', 'Falhas e cenários'], ['dev', 'Dispositivos'], ['log', 'Sinais']];
const setFault = (key, plot, on) => { if (Sim.faults.isOn(S, key, plot) !== on) Sim.faults.toggle(S, key, plot); };
const refreshForecast = () => { if (mode === 'edge') { E.lastForecastAt = -1e9; E.flush(); } else { gw.forecastAt = -9999; if (S.net.gateway) gw.tick(S.t); } };
const SCN = [
  ['Dia seco e quente', 'Onda de calor, sem chuva à vista', () => { S.wx.mode = 'manual'; S.wx.manual = 'heat'; S.forecastOverride = 3; refreshForecast(); }],
  ['Chuva forte em 2 h', 'Tempestade agendada; previsão sobe', () => { S.wx.mode = 'auto'; S.forecastOverride = null; S.plan.push({ s: S.t + 120, e: S.t + 220, kind: 'storm' }); S.plan.sort((a, b) => a.s - b.s); refreshForecast(); }],
  ['Entupimento no Talhão 1', 'Vazão cai ~38% ao irrigar', () => setFault('clog', 't1', true)],
  ['Vazamento no Talhão 2', 'Vazão sobe ~45% ao irrigar', () => setFault('leak', 't2', true)],
  ['Poço seco', 'Bomba trava a seco em ~2 min', () => setFault('well', null, true)],
  ['Queda de energia', 'Controlador sem energia', () => setFault('power', null, true)],
  ['Sem internet por 2 h', 'Gateway guarda registros e sincroniza depois', () => { setFault('internet', null, true); sched.push({ at: S.t + 120, fn: () => { setFault('internet', null, false); } }); }],
  ['Sensor do Talhão 3 morre', 'Sem leitura + bateria baixa', () => { setFault('soil', 't3', true); setFault('battery', 't3', true); }]
];

function renderTabs() { $('#tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" class="${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join(''); }
function renderSpeed() { $('#speedBtns').innerHTML = SPEEDS.map(([v, l]) => `<button class="${(v === 0 ? !S.running || S.speed === 0 : S.running && S.speed === v) ? 'on' : ''}" data-act="speed" data-v="${v}" title="${v ? v + ' min simulados por segundo' : 'Pausar'}">${l}</button>`).join(''); }
function jump(min) { const cur = Sim.hourOf(S.t) * 60, d = ((min - cur) % 1440 + 1440) % 1440 || 1440; fast = true; advance(Math.round(d)); fast = false; refresh(true); }

function renderPanel() {
  const p = $('#panel');
  if (tab === 'amb') {
    p.innerHTML = `<div class="cols">
      <div class="box"><h3>Clima</h3><div class="row">${WXBTN.map(([k, l]) => `<button class="btn wx ${(k === 'auto' ? S.wx.mode === 'auto' : S.wx.mode === 'manual' && S.wx.manual === k) ? 'on' : ''}" data-act="wx" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="hint" id="wxNow"></div></div>
      <div class="box"><h3>Hora do dia</h3><div class="row">${[['Amanhecer', 5 * 60 + 30], ['Meio-dia', 720], ['Fim de tarde', 17 * 60 + 30], ['Noite', 21 * 60], ['Madrugada', 120]].map(([l, m]) => `<button class="btn" data-act="goto" data-v="${m}">${l}</button>`).join('')}</div>
        <div class="row"><button class="btn" data-act="adv" data-v="60">+1 h</button><button class="btn" data-act="adv" data-v="360">+6 h</button></div>
        <div class="hint">A simulação só avança no tempo; todos os dispositivos e o gateway acompanham.</div></div>
      <div class="box"><h3>Previsão do tempo (serviço de internet)</h3><div class="row"><label class="chk"><input type="checkbox" id="fcOn" ${S.forecastOverride != null ? 'checked' : ''}> Forçar chuva prevista:</label><b id="fcVal" class="num">${S.forecastOverride ?? '—'}${S.forecastOverride != null ? '%' : ''}</b></div>
        <input class="sl" type="range" id="fcRange" min="0" max="100" step="5" value="${S.forecastOverride ?? 20}" ${S.forecastOverride != null ? '' : 'disabled'}>
        <div class="hint">Acima do limite do Raiz (60%), a recomendação vira “aguardar chuva”.</div>
        <div class="row" style="margin-top:12px"><button class="btn" data-act="reset">Reiniciar simulação do zero</button></div></div></div>`;
  } else if (tab === 'flt') {
    const f = Sim.faults.list(S, selPlot), on = (k, pl) => Sim.faults.isOn(S, k, pl);
    p.innerHTML = `<div class="cols">
      <div class="box"><h3>Falhas do talhão</h3><div class="row">${S.plots.map(x => `<button class="btn ${x.id === selPlot ? 'on' : ''}" data-act="plot" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <div class="row">${f.map(([k, l, v]) => `<button class="btn danger ${v ? 'on' : ''}" data-act="fault" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="box"><h3>Infraestrutura</h3><div class="row">${[['well', 'Poço seco'], ['power', 'Falta de energia'], ['gateway', 'Gateway fora do ar'], ['internet', 'Internet fora do ar'], ['wstation', 'Estação sem comunicação']].map(([k, l]) => `<button class="btn danger ${on(k) ? 'on' : ''}" data-act="infra" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="row"><button class="btn" data-act="clear">Corrigir todas as falhas</button></div>
        <div class="hint">Falhas não aparecem como alerta por mágica: o gateway só as percebe pelo que os dispositivos enviam.</div></div>
      <div class="box"><h3>Cenários prontos</h3><div class="row">${SCN.map((s, i) => `<button class="btn" data-act="scn" data-v="${i}" title="${esc(s[1])}">${s[0]}</button>`).join('')}</div></div></div>`;
  } else if (tab === 'dev') tickPanel(true);
  else if (tab === 'log') p.innerHTML = `<div class="tools">${[['tel', 'Telemetria'], ['evt', 'Eventos'], ['cmd', 'Comandos'], ['sim', 'Simulação']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-act="filt" data-v="${k}" ${filt[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <button class="btn sm" data-act="logpause">${logPaused ? 'Retomar' : 'Pausar'} registro</button><button class="btn sm" data-act="logclear">Limpar</button><span class="mut small">↑ fazenda → app · ↓ app → fazenda · clique numa linha para ver o JSON</span></div><div class="log" id="logList"></div>`, drawLog();
  tickPanel(false);
}
function drawLog() {
  const el = $('#logList'); if (!el) return;
  el.innerHTML = logs.filter(l => filt[l.cat]).slice(0, 120).map(l => {
    const body = typeof l.payload === 'string' ? l.payload : JSON.stringify(l.payload);
    return `<details data-id="${l.id}" class="${l.bad ? 'bad' : ''}" ${openLogs.has(l.id) ? 'open' : ''}><summary><span class="t">${esc(l.t)}</span><span class="d ${l.dir}">${l.dir === 'out' ? '↑ fazenda→app' : l.dir === 'in' ? '↓ app→fazenda' : '· simulação'}</span><span class="ty">${esc(l.type)}</span><span class="bd">${esc((body || '').slice(0, 160))}</span></summary><pre>${esc(l.msg ? JSON.stringify(l.msg, null, 2) : body)}</pre></details>`;
  }).join('') || '<div class="mut">Nenhum sinal ainda.</div>';
  dirtyLog = false;
}
function ago(t) { if (t == null) return '—'; const m = Math.round(S.t - t); return m < 1 ? 'agora' : m < 90 ? `há ${m} min` : `há ${Math.round(m / 60)} h`; }
function devValue(d) { const v = d.last; if (!v) return '—'; if (d.type === 'soil') return fmt(v.moisture) + ' %'; if (d.type === 'flow') return `${fmt(v.flow)} m³/h · ${fmt(v.pressure, 2)} bar`; if (d.type === 'weather') return `${fmt(v.temp)} °C · ${v.humidity}% · ${fmt(v.rain)} mm/h`; if (d.type === 'controller') return `${v.state === 'ok' ? 'ok' : v.state}${v.well === 'dry' ? ' · poço seco' : ''}`; return '—'; }
function tickPanel(force) {
  const w = S.wx;
  const n = $('#wxNow'); if (n) n.innerHTML = `<b>Agora:</b> ${Sim.KINDS[w.kind].label}${w.mode === 'auto' ? ' (automático)' : ''} · ${fmt(w.temp)} °C · UR ${Math.round(w.hum)}% · vento ${Math.round(w.wind)} km/h · chuva ${fmt(w.rain)} mm/h`;
  if (tab === 'dev') {
    const rows = S.devices.map(d => {
      const st = d.type === 'gateway' ? (S.net.gateway ? 'online' : 'offline') : (gw.devStatus[d.id] || 'online'), real = d.type === 'gateway' ? S.net.gateway : d.online;
      return `<tr><td><b>${esc(d.name)}</b><div class="mut small">${esc(d.id)} · ${esc(d.link)} · fw ${esc(d.fw)}</div></td><td><i class="dot ${st === 'online' ? 'ok' : 'bad'}"></i>${st === 'online' ? 'online' : 'sem comunicação'}${real !== (st === 'online') ? ' <span class="mut small">(real: ' + (real ? 'ligado' : 'falha') + ')</span>' : ''}</td><td class="num">${esc(devValue(d))}</td><td class="num">${d.batt != null ? Math.round(d.batt) + ' %' : '—'}</td><td class="num">${d.rssi != null && d.online ? d.rssi + ' dBm' : '—'}</td><td>${d.type === 'gateway' ? '—' : ago(gw.lastSeen[d.id])}</td></tr>`;
    }).join('');
    $('#panel').innerHTML = `<table><thead><tr><th>Dispositivo</th><th>Estado no gateway</th><th>Última leitura</th><th>Bateria</th><th>Sinal</th><th>Visto</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

/* ---------- atualização ---------- */
let lastLogDraw = 0, lastDevDraw = 0;
function refresh(now) {
  $('#clkTime').textContent = Sim.hhmm(S.t); $('#clkDate').textContent = Sim.dateLabel(S.t);
  $('#clkWx').textContent = `${Sim.KINDS[S.wx.kind].label} · ${fmt(S.wx.temp, 0)} °C`;
  const set = (id, cls, txt) => { const e = $(id); e.className = 'pill ' + cls; if (txt) e.lastChild.textContent = txt; };
  set('#hGw', S.net.gateway ? (mode === 'local' && SUPA ? 'warn' : 'ok') : 'bad', !S.net.gateway ? 'Gateway fora do ar' : !SUPA ? 'Gateway online' : mode === 'edge' ? 'Gateway: nuvem (Edge)' : mode === 'sync' ? 'Gateway: trocando…' : 'Gateway: local');
  set('#hNet', S.net.internet ? 'ok' : 'warn', S.net.internet ? 'Internet' : 'Sem internet');
  const appOn = Date.now() - appSeen < 9000; set('#hApp', appOn ? 'ok' : 'warn', appOn ? 'App conectado' : 'App aguardando');
  Scene.update(S); renderSpeed();
  const t = Date.now();
  if (tab === 'log') { if (dirtyLog && (now || t - lastLogDraw > 600) && !document.querySelector('#logList details:hover')) { drawLog(); lastLogDraw = t; } }
  else if (tab === 'dev') { if (now || t - lastDevDraw > 900) { tickPanel(true); lastDevDraw = t; } }
  else tickPanel(false);
  if (now && tab !== 'dev' && tab !== 'log') renderPanel();
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, v = b.dataset.v;
  if (b.tagName === 'INPUT' && b.type === 'checkbox' && a !== 'filt') return;
  switch (a) {
    case 'tab': tab = v; renderTabs(); renderPanel(); break;
    case 'speed': { const n = +v; if (n === 0) S.running = !S.running; else { S.running = true; S.speed = n; } renderSpeed(); break; }
    case 'wx': if (v === 'auto') S.wx.mode = 'auto'; else { S.wx.mode = 'manual'; S.wx.manual = v; } refreshForecast(); renderPanel(); break;
    case 'goto': jump(+v); break;
    case 'adv': fast = true; advance(+v); fast = false; refresh(true); break;
    case 'plot': selPlot = v; Scene.select(v); renderPanel(); break;
    case 'fault': Sim.faults.toggle(S, v, selPlot); refresh(true); break;
    case 'infra': Sim.faults.toggle(S, v, null); refresh(true); break;
    case 'clear': Sim.faults.clearAll(S); sched.length = 0; refresh(true); break;
    case 'scn': SCN[+v][2](); refresh(true); break;
    case 'reset': resetAll(); break;
    case 'logpause': logPaused = !logPaused; renderPanel(); break;
    case 'logclear': logs.length = 0; renderPanel(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fcOn') { S.forecastOverride = t.checked ? +$('#fcRange').value : null; $('#fcRange').disabled = !t.checked; $('#fcVal').textContent = t.checked ? S.forecastOverride + '%' : '—'; refreshForecast(); }
  if (t.dataset && t.dataset.act === 'filt') { filt[t.dataset.v] = t.checked; drawLog(); }
});
document.addEventListener('input', e => { if (e.target.id === 'fcRange') { S.forecastOverride = +e.target.value; $('#fcVal').textContent = S.forecastOverride + '%'; refreshForecast(); } });
document.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.dataset.id) { d.open ? openLogs.add(+d.dataset.id) : openLogs.delete(+d.dataset.id); } }, true);
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); S.running = !S.running; renderSpeed(); } });

Scene.mount($('#scene'), {
  onPlot: id => { selPlot = id; Scene.select(id); if (tab === 'flt') renderPanel(); },
  onDevice: id => {
    const m = /^(sm|fm)-(t\d)$/.exec(id);
    if (m) { selPlot = m[2]; Scene.select(selPlot); Sim.faults.toggle(S, m[1] === 'sm' ? 'soil' : 'meter', m[2]); }
    else if (id === 'pc-01') Sim.faults.toggle(S, 'power', null); else if (id === 'gw-01') Sim.faults.toggle(S, 'gateway', null); else if (id === 'ws-01') Sim.faults.toggle(S, 'wstation', null);
    refresh(true);
  }
});
Scene.select(selPlot);

/* app embutido */
const frame = $('#appFrame');
function appUrl(embed) {
  const u = new URL(cfg.appUrl, location.href); u.searchParams.set('live', '1'); u.searchParams.set('farm', cfg.farmId); u.searchParams.set('role', 'gestor');
  if (embed) { u.searchParams.set('embed', '1'); if ($('#autoLogin').checked) u.searchParams.set('auto', '1'); }
  return u.toString();
}
function loadApp() { frame.src = appUrl(true); $('#btnOpen').href = appUrl(false); }
$('#btnReload').onclick = loadApp; $('#autoLogin').onchange = loadApp;
const setPhone = hide => { $('#layout').classList.toggle('nophone', hide); $('#btnPhone').textContent = hide ? 'Mostrar app' : 'Ocultar app'; $('#btnPhone').setAttribute('aria-pressed', String(!hide)); };
$('#btnPhone').onclick = () => setPhone(!$('#layout').classList.contains('nophone'));
setPhone(window.innerWidth < 1000);
if (cfg.transport === 'broadcast') loadApp();
else {                                                       // hospedado: o app roda em outro endereço — abre em outra aba
  setPhone(true); $('#btnPhone').hidden = true; $('#btnOpen').href = appUrl(false); $('#autoLogin').closest('.phone-tools').hidden = true;
  $('#btnOut').hidden = false; $('#btnOut').onclick = () => link.signOut();
  link.ready.then(info => { if (info.farm) $('#hint').textContent = info.farm.name + ' · ' + info.email + ' (' + info.role + '). Clique em um talhão para selecioná-lo; clique em um dispositivo na cena para simular uma falha nele.'; }).catch(() => { });
}

renderTabs(); renderPanel(); refresh(true);
window.__farm = { S, gw, link, Sim, Scene, advance, get E() { return E; }, get mode() { return mode; } };
})();
