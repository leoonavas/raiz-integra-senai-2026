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
  L.devAuth = cfg.transport !== 'supabase' && !(window.ReactNativeWebView || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.raiz) || window.RaizAndroid);

  let link = null;
  try { link = window.RaizLink.open({ farmId: cfg.farmId, role: 'app', transport: cfg.transport }); L.link = link; }
  catch (e) { L.error = e.message; console.error('[Raiz live]', e); }

  const plot = id => D.plots.find(p => p.id === id);
  const dev = id => D.devices.find(d => d.id === id);
  let farmNow = 0, lastMsg = 0, structural = false, dirty = false, timers = false, lastRender = 0, down = false, cidSeq = 0;
  const pending = {};
  const SUPA = () => !!link && link.transport === 'supabase';
  const edge = { ok: false, fails: 0, internet: true, farmAge: null };            // estado do gateway na nuvem (Edge Function)
  const call = async body => { await link.ready; return link.invoke('gateway', Object.assign({ farm_id: link.farmId }, body)); };

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
    if (!L.connected) { L.connected = true; UI().receive({ type: 'gateway.found' }); if (q.has('auto') || link.transport === 'supabase') UI().receive({ type: 'auth.ok' }); /* com Supabase o login já foi feito (link mágico) */ }
  }

  function onMessage(m) {
    if (!m || m.v !== 1 || m.src !== 'farm') return;
    L.stats.in++; lastMsg = Date.now(); if (m.ts) farmNow = Math.max(farmNow, m.ts);
    const gwDown = m.type === 'heartbeat' && m.payload && m.payload.gateway === 'offline';              // a fazenda avisou que o gateway local caiu
    if (gwDown) { if (D.net.gateway !== 'offline') { D.net.gateway = 'offline'; mark(true); } }
    else if (D.net.gateway !== 'online' && L.connected) { D.net.gateway = 'online'; mark(true); askHello(); }
    const p = m.payload;
    switch (m.type) {
      case 'hello': applyHello(p); break;
      case 'telemetry': if (L.connected) onTelemetry(m); break;
      case 'heartbeat': {
        const ls = ago(p.lastSync); if (D.net.internet !== p.internet || D.net.pending !== p.pending || D.net.lastSync !== ls) mark(true);
        Object.assign(D.net, { internet: p.internet, pending: p.pending, lastSync: ls }); refreshSeen(); break;
      }
      case 'device.status': { const d = dev(p.device); if (d) { d.status = p.status; d._ts = p.seen || d._ts; const pl = d.plot && plot(d.plot); if (pl && d.type === 'soil' && p.status === 'offline') { pl.moisture = null; pl._mts = d._ts; } mark(true); refreshSeen(); } break; }
      case 'alert.new': if (!D.alerts.some(a => a.id === p.id)) { D.alerts.unshift(p); mark(true); if (p.state !== 'resolvido') { toast(p.title, p.sev === 'info' ? '' : 'bad'); notify(p); } } break;
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
  async function sendCmd(cmd, args) {
    if (!link) { toast('Canal com a fazenda indisponível', 'bad'); return; }
    if (cmd === 'settings.update' && !(args && args.rules)) return;               // tema/notificações são locais
    if ((cmd === 'alert.confirm' || cmd === 'alert.discard' || cmd === 'alert.maintenance') && String(args && args.id).startsWith('local-')) { localAlert(args.id, cmd); return; }
    const cid = 'c' + Date.now().toString(36) + (++cidSeq);
    pending[cid] = setTimeout(() => { delete pending[cid]; toast('Sem resposta do gateway — o comando pode não ter chegado', 'bad'); }, 9000);
    if (SUPA() && edge.ok && edge.internet) {                                      // com internet: a Edge Function valida (perfil, limites) e executa
      try {
        const r = await call({ op: 'command', cid, cmd, args: args || {} }); L.stats.out++;
        if (r && r.ok) return;                                                      // a confirmação chega pelo Realtime (command.ack)
        if (!r || (r.error !== 'local' && r.error !== 'sem_dados')) {
          clearTimeout(pending[cid]); delete pending[cid];
          if (r && r.error !== 'fazenda_sem_sinal') toast((r && (r.text || r.error)) || 'Comando recusado', 'bad');   // 'fazenda_sem_sinal' já vem com ack explicando
          return;
        }
      } catch (e) { console.warn('[Raiz live] edge indisponível, usando a rede local', e); }
    }
    link.send('command', { cid, cmd, args: args || {} }); L.stats.out++;           // sem internet: gateway local, pela rede da fazenda
  }
  B.on((type, payload) => {
    if (L.devAuth && type === 'auth.pin') setTimeout(() => UI().receive({ type: payload && payload.pin === cfg.devPin ? 'auth.ok' : 'auth.fail' }), 200);
    else if (L.devAuth && type === 'auth.biometric') setTimeout(() => UI().receive({ type: 'auth.ok' }), 200);
    else if (type === 'logout' && link && link.transport === 'supabase') link.signOut();
    else if (CMD.has(type)) sendCmd(type, payload);
  });

  /* ---------- gateway na nuvem: status por consulta (não depende da aba da fazenda estar ativa) ---------- */
  async function invokeHello() {
    try { const r = await call({ op: 'hello' }); if (r && r.ok && r.hello) { applyHello(r.hello); return true; } } catch (e) { }
    return false;
  }
  function askHello() { if (link) link.send('hello.request', { app: 'raiz-app' }); if (SUPA()) invokeHello(); }
  function localAlert(id, how) {                                                    // alertas gerados pelo próprio app (ex.: fazenda sem dados)
    const a = D.alerts.find(x => x.id === id); if (!a) return;
    if (how === 'alert.maintenance') { toast('Este alerta não depende de manutenção do gateway', 'bad'); return; }
    a.state = 'resolvido'; mark(true); toast(how === 'alert.confirm' ? 'Alerta confirmado' : 'Alerta descartado');
  }
  function silentAlert(age) {
    const id = 'local-silent', a = D.alerts.find(x => x.id === id);
    if (age != null && age > 25) {
      const msg = `Nenhuma leitura chegou da fazenda há ${age} s. O gateway na nuvem está ativo, mas os dispositivos (ou a internet da fazenda) não estão enviando dados — os valores na tela podem estar desatualizados. Ação: confira energia, internet e o gateway da fazenda.`;
      if (!a) { const n = { id, sev: 'warn', plot: null, state: 'aberto', title: 'Sem dados da fazenda', time: 'Agora', msg }; D.alerts.unshift(n); mark(true); toast(n.title, 'bad'); notify(n); }
      else if (a.state === 'resolvido' && age > 40) { a.state = 'aberto'; a.msg = msg; mark(true); toast(a.title, 'bad'); }
      else if (a.state === 'aberto') { a.msg = msg; mark(); }
    } else if (a && a.state === 'aberto' && (age == null || age < 12)) { a.state = 'resolvido'; a.msg += ' Os dados voltaram.'; mark(true); }
  }
  function notify(a) {
    try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && D.settings.notif.alerts) new Notification(a.title, { body: String(a.msg || '').slice(0, 140), tag: a.id }); } catch (e) { }
  }
  async function pollStatus() {
    if (!SUPA()) return;
    try {
      const r = await call({ op: 'status' });
      if (!r || !r.gateway) throw new Error((r && r.error) || 'sem resposta');
      edge.ok = true; edge.fails = 0; edge.internet = r.internet !== false; edge.farmAge = r.farmAgeSec;
      if (r.ts) farmNow = Math.max(farmNow, r.ts);
      if (!L.connected) return;
      if (!edge.internet) { if (D.net.internet) { D.net.internet = false; mark(true); } return; }                // fazenda sem internet: quem fala é o gateway local (mensagens)
      const up = r.gateway === 'online' ? 'online' : 'offline', ls = ago(r.lastSync);
      if (D.net.gateway !== up) { D.net.gateway = up; mark(true); if (up === 'online') invokeHello(); }
      if (!D.net.internet || D.net.pending !== r.pending || D.net.lastSync !== ls) mark(true);
      Object.assign(D.net, { internet: true, pending: r.pending, lastSync: ls });
      if (r.hasState) silentAlert(r.farmAgeSec);
    } catch (e) {
      edge.fails++; console.warn('[Raiz live] status', e);
      if (edge.fails >= 3 && D.net.gateway === 'online') { D.net.gateway = 'offline'; mark(true); }          // o celular perdeu a conexão com a nuvem
    }
  }

  /* ---------- ciclo: conexão, redesenho com calma, gateway fora do ar ---------- */
  window.addEventListener('load', () => {
    if (!link) return;
    link.on(onMessage);
    link.ready.then(info => {                                                      // perfil e fazenda vêm do banco (Supabase)
      if (info.role) D.user.role = info.role;
      if (info.email) { D.user.name = info.email; D.user.initials = info.email.slice(0, 2).toUpperCase(); }
      mark(true);
    }).catch(() => { });
    askHello(); setInterval(() => { if (!L.connected) askHello(); }, 2500);
    if (SUPA()) { link.ready.then(pollStatus).catch(() => { }); setInterval(pollStatus, 6000); document.addEventListener('visibilitychange', () => { if (!document.hidden) pollStatus(); }); }
    setInterval(() => link.send('app.ping', { app: 'raiz-app' }), 4000); link.send('app.ping', { app: 'raiz-app' });
    document.addEventListener('pointerdown', () => { down = true; }, true);
    ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { down = false; }, true));
    setInterval(() => {
      const cloud = SUPA() && edge.ok && edge.internet;                          // na nuvem a presença vem do status; em rede local, das mensagens
      if (!cloud && L.connected && D.net.gateway === 'online' && Date.now() - lastMsg > (SUPA() ? 12000 : 6500)) { D.net.gateway = 'offline'; mark(true); }
      if (!dirty && !timers) return;
      if (down) return;                                                          // não redesenha no meio de um toque
      const now = Date.now();
      if (dirty && (structural || now - lastRender > 1200)) { refreshSeen(); UI().refresh(); lastRender = now; dirty = false; structural = false; timers = false; }
      else if (timers && !dirty) { UI().refreshTimers(); timers = false; }
    }, 300);
  });
})();
