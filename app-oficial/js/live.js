/* Raiz — modo ao vivo. Recebe do gateway da fazenda (telemetria, alertas, recomendações, confirmações)
   e envia os comandos do operador. Hoje o canal é a Fazenda Digital (BroadcastChannel); na próxima etapa
   troca-se só o transporte (Supabase Realtime) — as telas e este arquivo não mudam. Protocolo: docs/PROTOCOLO.md.
   Ativa com ?live (ou RAIZ_CONFIG.mode = 'live'). Sem isso, nada daqui executa e o app usa os dados de exemplo. */
(function () {
  'use strict';
  const cfg = Object.assign({ mode: 'mock', transport: 'broadcast', farmId: 'f1', devPin: '1234' }, window.RAIZ_CONFIG);
  const q = new URLSearchParams(location.search);
  const mode = q.has('live') ? 'live' : q.has('mock') ? 'mock' : cfg.mode;
  const L = window.RAIZ_LIVE = { on: mode === 'live', connected: false, devAuth: false, devPin: cfg.devPin, stats: { in: 0, out: 0 } };
  if (!L.on) return;

  window.RAIZ_MOCK = false;
  if (q.get('farm')) cfg.farmId = q.get('farm');
  if (q.get('transport')) cfg.transport = q.get('transport');
  const D = window.RAIZ_STATE, B = window.RaizBridge;

  /* limpa os dados de exemplo: tudo passa a vir da fazenda */
  D.plots.length = 0; D.alerts.length = 0; D.devices.length = 0;
  Object.assign(D.net, { gateway: 'offline', gatewayName: '—', ip: '—', link: '—', internet: false, pending: 0, lastSync: '—' });
  Object.assign(D.weather, { temp: null, rainProb: 0, hourly: [] });
  Object.assign(D.farm, { name: 'Fazenda', city: '' });
  Object.assign(D.user, { name: 'Operador de teste', initials: 'OT' });
  if (['gestor', 'operador'].includes(q.get('role'))) D.user.role = q.get('role');
  L.devAuth = !(window.ReactNativeWebView || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.raiz) || window.RaizAndroid);

  let link = null;
  try { link = window.RaizLink.open({ farmId: cfg.farmId, role: 'app', transport: cfg.transport }); L.link = link; }
  catch (e) { L.error = e.message; console.error('[Raiz live]', e); }

  const plot = id => D.plots.find(p => p.id === id);
  const dev = id => D.devices.find(d => d.id === id);
  let farmNow = 0, lastMsg = 0, structural = false, dirty = false, timers = false, lastRender = 0, down = false, cidSeq = 0;
  const pending = {};

  const ago = ts => { if (!ts || !farmNow) return '—'; const m = Math.round((farmNow - ts) / 60000); return m < 1 ? 'agora' : m < 90 ? `há ${m} min` : `há ${Math.round(m / 60)} h`; };
  const UI = () => window.Raiz;
  const toast = (text, kind) => UI().receive({ type: 'toast', payload: { text, kind: kind || '' } });
  const mark = s => { dirty = true; if (s) structural = true; };

  function refreshSeen() {
    const g = dev('gw-01'); if (g) { g._ts = farmNow; g.status = D.net.gateway === 'online' ? 'online' : 'offline'; }       // o gateway é quem fala conosco
    D.devices.forEach(d => { if (d._ts) d.seen = ago(d._ts); }); D.plots.forEach(p => { p.lastReading = p._mts ? ago(p._mts) : '—'; }); }

  /* ---------- recepção ---------- */
  function applyDevice(d, patch) { const x = dev(d); if (!x) return null; Object.assign(x, patch); return x; }
  function onTelemetry(m) {
    const p = m.payload || {}, v = p.values || {}, d = dev(p.device), pl = p.plot ? plot(p.plot) : null;
    if (d) { if (d.status !== 'online') { d.status = 'online'; mark(true); } d._ts = m.ts; if (p.batt != null) d.batt = p.batt; if (p.rssi != null) d.rssi = p.rssi; }
    if (p.kind === 'soil' && pl) { const old = pl.moisture; pl.moisture = v.moisture; pl._mts = m.ts; if (old == null || Math.abs(old - v.moisture) >= .05) mark(); }
    else if (p.kind === 'flow' && pl) {
      if (Math.abs(pl.flow.now - v.flow) >= .05 || Math.abs(pl.pressure - v.pressure) >= .005) mark();
      pl.flow.now = v.flow; pl.pressure = v.pressure; pl.flow.ref = pl.flow.ref || pl._ref;
    } else if (p.kind === 'controller') {
      D.plots.forEach(x => {
        const z = (v.zones || {})[x.id] || { state: 'off', left: 0, total: 0 }, was = x.pump.state;
        const next = v.state === 'nopower' ? { state: 'nopower', left: 0, total: 0 } : v.state === 'locked' ? { state: 'locked', left: 0, total: 0, reason: v.reason } : z.state === 'on' ? { state: 'on', left: z.left, total: z.total } : { state: 'off', left: 0, total: 0 };
        x.pump = next; if (was !== next.state) { mark(true); if (next.state !== 'on') { x.flow.now = 0; x.pressure = 0; } } else if (next.state === 'on') timers = true;
      });
    } else if (p.kind === 'weather') { if (D.weather.temp !== v.temp) mark(); D.weather.temp = v.temp; D.weather.humidity = v.humidity; D.weather.rainNow = v.rain; }
  }
  function applyHello(h) {
    const keep = {}; D.plots.forEach(p => { keep[p.id] = p; });
    D.farm.id = h.farm.id; D.farm.name = h.farm.name; D.farm.city = h.farm.city;
    Object.assign(D.net, h.net); Object.assign(D.settings, h.settings); D.modules.length = 0; (h.modules || []).forEach(x => D.modules.push(x));
    D.plots.length = 0;
    h.plots.forEach(p => D.plots.push(Object.assign({ moisture: null, series: [], lastReading: '—', pump: { state: 'off', left: 0, total: 0 }, flow: { now: 0, ref: p.flowRef }, pressure: 0, rec: null, runs: [] }, keep[p.id] || {}, { id: p.id, name: p.name, crop: p.crop, area: p.area, _ref: p.flowRef })));
    D.plots.forEach(p => { p.flow.ref = p._ref; });
    D.devices.length = 0; h.devices.forEach(d => D.devices.push({ id: d.id, name: d.name, type: d.type, plot: d.plot, status: d.status, rssi: d.rssi, batt: d.batt, fw: d.fw, link: d.link, _ts: d.seen, seen: '—' }));
    const sn = h.snapshot || {};
    farmNow = Math.max(farmNow, ...D.devices.map(d => d._ts || 0));
    (sn.telemetry || []).forEach(t => onTelemetry({ ts: farmNow, payload: t }));
    D.alerts.length = 0; (sn.alerts || []).slice().reverse().forEach(a => D.alerts.push(a));
    Object.keys(sn.recs || {}).forEach(id => { const p = plot(id); if (p) p.rec = sn.recs[id]; });
    Object.keys(sn.runs || {}).forEach(id => { const p = plot(id); if (p) p.runs = sn.runs[id].slice(); });
    Object.keys(sn.series || {}).forEach(id => { const p = plot(id); if (p) p.series = sn.series[id].slice(); });
    if (sn.forecast) { D.weather.rainProb = sn.forecast.rainProb; D.weather.hourly = sn.forecast.hourly; }
    D.net.gateway = 'online'; refreshSeen(); mark(true);
    if (!L.connected) { L.connected = true; UI().receive({ type: 'gateway.found' }); if (q.has('auto')) UI().receive({ type: 'auth.ok' }); }
  }

  function onMessage(m) {
    if (!m || m.v !== 1 || m.src !== 'farm') return;
    L.stats.in++; lastMsg = Date.now(); if (m.ts) farmNow = Math.max(farmNow, m.ts);
    if (D.net.gateway !== 'online' && L.connected) { D.net.gateway = 'online'; mark(true); link.send('hello.request', { app: 'raiz-app' }); }
    const p = m.payload;
    switch (m.type) {
      case 'hello': applyHello(p); break;
      case 'telemetry': if (L.connected) onTelemetry(m); break;
      case 'heartbeat': {
        const ls = ago(p.lastSync); if (D.net.internet !== p.internet || D.net.pending !== p.pending || D.net.lastSync !== ls) mark(true);
        Object.assign(D.net, { internet: p.internet, pending: p.pending, lastSync: ls }); refreshSeen(); break;
      }
      case 'device.status': { const d = dev(p.device); if (d) { d.status = p.status; d._ts = p.seen || d._ts; const pl = d.plot && plot(d.plot); if (pl && d.type === 'soil' && p.status === 'offline') { pl.moisture = null; pl._mts = d._ts; } mark(true); refreshSeen(); } break; }
      case 'alert.new': if (!D.alerts.some(a => a.id === p.id)) { D.alerts.unshift(p); mark(true); if (p.state !== 'resolvido') toast(p.title, 'bad'); } break;
      case 'alert.update': { const a = D.alerts.find(x => x.id === p.id); if (a) { Object.assign(a, p.patch); mark(true); } break; }
      case 'recommendation': { const pl = plot(p.plot); if (pl) { pl.rec = p.rec; mark(true); } break; }
      case 'forecast': D.weather.rainProb = p.rainProb; D.weather.hourly = p.hourly; mark(true); break;
      case 'series': { const pl = plot(p.plot); if (pl) { pl.series = p.values; mark(true); } break; }
      case 'run.log': { const pl = plot(p.plot); if (pl) { pl.runs.unshift(p.run); pl.runs.length = Math.min(pl.runs.length, 8); mark(true); } break; }
      case 'command.ack': { const t = pending[p.cid]; if (t) { clearTimeout(t); delete pending[p.cid]; } toast(p.text, p.ok ? '' : 'bad'); break; }
    }
  }

  /* ---------- envio de comandos ---------- */
  const CMD = new Set(['pump.start', 'pump.stop', 'pump.emergency', 'pump.rearm', 'recommendation.refuse', 'alert.confirm', 'alert.discard', 'alert.maintenance', 'device.restart', 'sync.now', 'settings.update']);
  function sendCmd(cmd, args) {
    if (!link) { toast('Canal com a fazenda indisponível', 'bad'); return; }
    if (cmd === 'settings.update' && !(args && args.rules)) return;               // tema/notificações são locais
    const cid = 'c' + Date.now().toString(36) + (++cidSeq);
    pending[cid] = setTimeout(() => { delete pending[cid]; toast('Sem resposta do gateway — o comando pode não ter chegado', 'bad'); }, 6000);
    link.send('command', { cid, cmd, args: args || {} }); L.stats.out++;
  }
  B.on((type, payload) => {
    if (L.devAuth && type === 'auth.pin') setTimeout(() => UI().receive({ type: payload && payload.pin === cfg.devPin ? 'auth.ok' : 'auth.fail' }), 200);
    else if (L.devAuth && type === 'auth.biometric') setTimeout(() => UI().receive({ type: 'auth.ok' }), 200);
    else if (CMD.has(type)) sendCmd(type, payload);
  });

  /* ---------- ciclo: conexão, redesenho com calma, gateway fora do ar ---------- */
  window.addEventListener('load', () => {
    if (!link) return;
    link.on(onMessage);
    const hello = () => link.send('hello.request', { app: 'raiz-app' });
    hello(); setInterval(() => { if (!L.connected) hello(); }, 2500);
    setInterval(() => link.send('app.ping', { app: 'raiz-app' }), 4000); link.send('app.ping', { app: 'raiz-app' });
    document.addEventListener('pointerdown', () => { down = true; }, true);
    ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { down = false; }, true));
    setInterval(() => {
      if (L.connected && D.net.gateway === 'online' && Date.now() - lastMsg > 6500) { D.net.gateway = 'offline'; mark(true); }
      if (!dirty && !timers) return;
      if (down) return;                                                          // não redesenha no meio de um toque
      const now = Date.now();
      if (dirty && (structural || now - lastRender > 1200)) { refreshSeen(); UI().refresh(); lastRender = now; dirty = false; structural = false; timers = false; }
      else if (timers && !dirty) { UI().refreshTimers(); timers = false; }
    }, 300);
  });
})();
