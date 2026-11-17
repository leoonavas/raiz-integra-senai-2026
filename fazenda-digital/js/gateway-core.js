/* Núcleo do gateway Raiz — as regras (recomendação, alertas, vazão, comandos) independentes de onde rodam.
   O MESMO arquivo roda: (1) no navegador, como gateway LOCAL da Fazenda Digital (modo sem internet);
   (2) na Edge Function `gateway` do Supabase (modo nuvem). Cópias em fazenda-digital/js/ e supabase/functions/gateway/ —
   edite SÓ este arquivo e rode `bash scripts/sync-shared.sh`.

   O núcleo não conhece o simulador nem o banco. Quem o usa fornece um ambiente (env):
     env.send(type, payload)             saída para o app (mensagens do protocolo)
     env.actuate(cmd, args, cid)         pede algo ao controlador → { ok, text } ou { pending:true } (resposta depois por gw.complete)
                                         cmd: 'pump.start'|'pump.stop'|'pump.emergency'|'pump.rearm'|'device.restart'|'fix'
     env.internet()                      há internet agora?
     env.tsOf(t) · env.when(t, now)      relógio da fazenda (minutos simulados → epoch ms / "Hoje · 09:34")
     env.log(msg, kind)                  opcional
     env.forecast()                      opcional: previsão local (na nuvem a previsão chega por gw.setForecast)
     env.plots() · env.devices()         opcional: sem elas usa gw.cfg (configurado por gw.configure)
     env.extra()                         opcional: campos extras do heartbeat
   Estado: tudo em gw.* é JSON puro → gw.exportState() / gw.importState(s) (persistência e passagem de bastão local ⇄ nuvem). */
(function (root) {
'use strict';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const br = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const OFFLINE_AFTER = { soil: 35, flow: 50, weather: 35, controller: 25 };      // minutos simulados sem leitura
const RULE_KEYS = ['crit', 'target', 'rainLimit', 'tolPct', 'persist', 'maxRun'];
const SENSOR_NAME = { soil: 'Sensor de umidade', flow: 'Medidor de vazão', weather: 'Estação meteorológica', controller: 'Controlador do poço' };
const STATE_KEYS = ['settings', 'alerts', 'seq', 'active', 'suppress', 'keyOf', 'runs', 'recs', 'series', 'last', 'lastSeen', 'devStatus', 'lastMoist', 'rainNow', 'forecast',
  'zones', 'flowBuf', 'flowCnt', 'flowStart', 'refused', 'origin', 'maint', 'pending', 'lastSync', 'forecastAt', 'prevNet', 'now', 'batt', 'cmdp', 'cfg'];

function create(env) {
  const gw = {
    muted: false,
    settings: { crit: 30, target: 42, rainLimit: 60, tolPct: 20, persist: 3, maxRun: 60 },
    alerts: [], seq: 0, active: {}, suppress: {}, keyOf: {},
    runs: {}, recs: {}, series: {}, last: {}, lastSeen: {}, devStatus: {}, lastMoist: {}, rainNow: 0, forecast: null,
    zones: {}, flowBuf: {}, flowCnt: {}, flowStart: {}, refused: {}, origin: {}, maint: [], batt: {}, cmdp: {},
    pending: 0, lastSync: 0, forecastAt: -9999, prevNet: true, now: 0,
    cfg: { plots: [], devices: [], farm: null }
  };
  const send = (type, payload) => { if (!gw.muted) env.send(type, payload); };
  const log = (m, k) => { if (env.log) env.log(m, k); };
  const plots = () => (env.plots ? env.plots() : gw.cfg.plots);
  const devices = () => (env.devices ? env.devices() : gw.cfg.devices);
  const plotOf = id => plots().find(p => p.id === id);
  const ts = () => env.tsOf(gw.now);

  function ensurePlots() {
    plots().forEach(p => {
      if (!gw.runs[p.id]) gw.runs[p.id] = []; if (!gw.series[p.id]) gw.series[p.id] = [];
      if (!gw.zones[p.id]) gw.zones[p.id] = { on: false, startT: 0, origin: '' };
      if (!gw.flowBuf[p.id]) gw.flowBuf[p.id] = []; if (!gw.flowCnt[p.id]) gw.flowCnt[p.id] = { low: 0, high: 0 };
    });
    devices().forEach(d => { if (d.type !== 'gateway' && !gw.devStatus[d.id]) gw.devStatus[d.id] = 'online'; });
  }
  /* nuvem: a fazenda informa talhões e dispositivos (inventário) */
  function configure(cfg) { gw.cfg = Object.assign({ plots: [], devices: [], farm: null }, gw.cfg, cfg); ensurePlots(); }

  /* ---------- alertas ---------- */
  function raise(key, a) {
    if (gw.suppress[key]) return;
    const cur = gw.active[key] && gw.alerts.find(x => x.id === gw.active[key]);
    if (cur && cur.state === 'aberto') return;
    const alert = Object.assign({ id: 'a' + (++gw.seq), state: 'aberto', time: env.when(gw.now, gw.now) }, a);
    gw.alerts.unshift(alert); if (gw.alerts.length > 80) gw.alerts.length = 80;
    gw.active[key] = alert.id; gw.keyOf[alert.id] = key;
    send('alert.new', alert); log('Gateway abriu alerta: ' + alert.title, a.sev === 'info' ? 'sim' : 'bad');
  }
  function patchAlert(id, patch) { const a = gw.alerts.find(x => x.id === id); if (!a) return; Object.assign(a, patch); send('alert.update', { id, patch }); }
  function resolve(key, note) {
    const id = gw.active[key]; if (!id) return;
    const a = gw.alerts.find(x => x.id === id); delete gw.active[key];
    if (a && a.state === 'aberto') patchAlert(id, { state: 'resolvido', msg: a.msg + (note ? ' ' + note : '') });
  }
  function infoDone(title, msg) {
    const a = { id: 'a' + (++gw.seq), sev: 'info', plot: null, state: 'resolvido', title, msg, time: env.when(gw.now, gw.now) };
    gw.alerts.unshift(a); send('alert.new', a);
  }

  /* ---------- umidade: recomendação + ALERTA (o usuário precisa agir) ---------- */
  function evalRec(plot) {
    const m = gw.lastMoist[plot], st = gw.settings, cur = gw.recs[plot] || null, name = (plotOf(plot) || {}).name || plot;
    const fresh = gw.devStatus['sm-' + plot] !== 'offline', irrigating = !!(gw.zones[plot] && gw.zones[plot].on);
    const rp = gw.forecast ? gw.forecast.rainProb : 0, raining = gw.rainNow > .5, hold = raining || rp >= st.rainLimit;
    let next = null;
    if (m != null && fresh && !irrigating && !((gw.refused[plot] || -1) > gw.now)) {
      if (m < st.crit || (cur && m < st.crit + 2)) {
        if (hold) next = { type: 'wait', reason: `Umidade abaixo do limiar (${br(m)}% < ${st.crit}%), mas ${raining ? 'está chovendo agora' : `há chuva prevista de ${rp}% (limite ${st.rainLimit}%)`}. Aguardar pode economizar água.` };
        else next = { type: 'go', duration: clamp(Math.ceil((st.target - m) / .30 / 5) * 5, 10, st.maxRun), reason: `Umidade abaixo do limiar (${br(m)}% < ${st.crit}%) e chuva prevista de ${rp}% (limite ${st.rainLimit}%).` };
      }
    }
    /* alerta: umidade baixa sem irrigação em curso exige ação do operador */
    if (m != null && fresh) {
      if (irrigating) { resolve('moist:' + plot, 'Irrigação iniciada.'); resolve('mcrit:' + plot, 'Irrigação iniciada.'); }
      else if (m < st.crit) {
        const acao = hold ? `Há ${raining ? 'chuva agora' : `chuva prevista de ${rp}%`}: o Raiz recomenda aguardar. Se a chuva não vier, irrigue.` : `Ação: irrigue por cerca de ${clamp(Math.ceil((st.target - m) / .30 / 5) * 5, 10, st.maxRun)} min (Irrigação → Ligar bomba).`;
        raise('moist:' + plot, { sev: 'warn', plot, title: `Umidade baixa — ${name}`, msg: `A umidade está em ${br(m)}%, abaixo do limiar de ${st.crit}%. ${acao}` });
        if (m < st.crit - 5) raise('mcrit:' + plot, { sev: 'bad', plot, title: `Umidade crítica — ${name}`, msg: `A umidade caiu para ${br(m)}% (${st.crit - 5}% ou menos). A lavoura pode sofrer estresse hídrico: irrigue o quanto antes.` });
      } else if (m >= st.crit + 2) {
        gw.suppress['moist:' + plot] = false; gw.suppress['mcrit:' + plot] = false;
        resolve('moist:' + plot, 'Umidade recuperada.'); resolve('mcrit:' + plot, 'Umidade recuperada.');
      }
    }
    const same = (!cur && !next) || (cur && next && cur.type === next.type && Math.abs((cur.duration || 0) - (next.duration || 0)) < 10);   // evita oscilar por ruído da leitura
    if (same) return;
    gw.recs[plot] = next; send('recommendation', { plot, rec: next });
  }

  /* ---------- vazão ---------- */
  function analyzeFlow(plot, v) {
    const z = gw.zones[plot]; if (!z || !z.on || gw.now - z.startT < 2) return;
    const p = plotOf(plot); if (!p) return;
    const ref = p.flowRef, tol = gw.settings.tolPct / 100;
    const buf = gw.flowBuf[plot], c = gw.flowCnt[plot]; buf.push(v.flow); if (buf.length > 14) buf.shift();
    if (v.flow < ref * .10) return;
    const dev = (v.flow - ref) / ref;
    if (dev < -tol) { c.low++; c.high = 0; } else if (dev > tol) { c.high++; c.low = 0; }
    else { c.low = 0; c.high = 0; gw.suppress['low:' + plot] = false; gw.suppress['high:' + plot] = false; }
    const base = { plot, q: v.flow, ref, p: v.pressure, series: buf.slice(-10) };
    if (c.low >= gw.settings.persist) raise('low:' + plot, Object.assign({ sev: 'warn', title: 'Queda de vazão — possível entupimento', msg: `Na irrigação em andamento a vazão ficou ${Math.round(-dev * 100)}% abaixo da referência por ${c.low} leituras seguidas.${v.pressure > 2.8 ? ' Pressão elevada reforça entupimento.' : ''} Ação: confirme em inspeção local ou chame a manutenção.` }, base));
    if (c.high >= gw.settings.persist) raise('high:' + plot, Object.assign({ sev: 'bad', title: 'Vazão acima do esperado — possível vazamento', msg: `A vazão ficou ${Math.round(dev * 100)}% acima da referência por ${c.high} leituras seguidas${v.pressure < 2.1 ? ', com queda de pressão' : ''}. Ação: verifique mangueiras, conexões e válvulas do setor.` }, base));
  }

  /* ---------- telemetria: reading = { device, kind, plot, values, batt, rssi, name, t } ---------- */
  function ingest(r) {
    const id = r.device;
    if (r.t != null && gw.lastSeen[id] != null && r.t < gw.lastSeen[id]) return;        // leitura atrasada/de outro relógio: nunca sobrescreve a mais nova
    if (r.t != null) gw.now = Math.max(gw.now, r.t);
    const v = r.values || {};
    gw.lastSeen[id] = gw.now; gw.last[id] = v; if (r.batt != null) gw.batt[id] = r.batt;
    if (!env.internet()) gw.pending++;
    if (gw.devStatus[id] !== 'online') { gw.devStatus[id] = 'online'; send('device.status', { device: id, status: 'online', seen: ts() }); resolve('off:' + id, 'Comunicação restabelecida.'); }
    if (r.batt != null) {
      if (r.batt <= 15) raise('batt:' + id, { sev: 'warn', plot: r.plot || null, title: `Bateria baixa — ${r.name || id}`, msg: `A bateria está em ${Math.round(r.batt)}%. Ação: troque ou recarregue antes que o dispositivo pare de enviar leituras.` });
      else if (r.batt > 30) resolve('batt:' + id, 'Bateria normalizada.');
    }
    send('telemetry', { device: id, kind: r.kind, plot: r.plot || null, values: v, batt: r.batt != null ? Math.round(r.batt) : null, rssi: r.rssi });
    if (r.kind === 'soil') { gw.lastMoist[r.plot] = v.moisture; evalRec(r.plot); }
    else if (r.kind === 'weather') { gw.rainNow = v.rain; if (v.rain > .5) plots().forEach(p => evalRec(p.id)); }
    else if (r.kind === 'flow') analyzeFlow(r.plot, v);
    else if (r.kind === 'controller') onController(v);
  }
  function onController(v) {
    plots().forEach(p => {
      const z = (v.zones || {})[p.id]; if (!z) return;
      const g = gw.zones[p.id], on = z.state === 'on';
      if (on && !g.on) {
        g.on = true; g.startT = gw.now; g.origin = gw.origin[p.id] || 'Comando manual'; delete gw.origin[p.id];
        gw.flowStart[p.id] = (gw.last['fm-' + p.id] || {}).total || 0; gw.flowBuf[p.id] = []; gw.flowCnt[p.id] = { low: 0, high: 0 };
        if (gw.recs[p.id]) { gw.recs[p.id] = null; send('recommendation', { plot: p.id, rec: null }); }
        evalRec(p.id);
      } else if (!on && g.on) {
        g.on = false; const dur = Math.max(1, Math.round(gw.now - g.startT)), tot = (gw.last['fm-' + p.id] || {}).total || 0, vol = Math.max(0, tot - (gw.flowStart[p.id] || 0));
        const run = { when: env.when(g.startT, gw.now), dur, vol: Math.round(vol * 10) / 10, origin: g.origin };
        gw.runs[p.id].unshift(run); gw.runs[p.id].length = Math.min(gw.runs[p.id].length, 8); send('run.log', { plot: p.id, run });
        gw.flowCnt[p.id] = { low: 0, high: 0 }; evalRec(p.id);
      }
    });
    if (v.state === 'locked' && /seco/i.test(v.reason)) raise('dry', { sev: 'bad', plot: null, title: 'Funcionamento a seco — bomba bloqueada', msg: 'O controlador detectou vazão e pressão quase nulas com a bomba ligada e bloqueou o equipamento para protegê-lo. Ação: verifique o nível do poço e só então rearme a bomba.' });
    else if (v.state === 'ok' && v.well !== 'dry') resolve('dry', 'Bomba rearmada.');
    if (v.state === 'locked' && !/seco/i.test(v.reason)) raise('lock', { sev: 'bad', plot: null, title: 'Bomba bloqueada', msg: `${v.reason || 'Bloqueio do controlador.'} Nenhuma irrigação será feita até o rearme. Ação: inspecione a instalação e rearme a bomba em Irrigação.` });
    else if (v.state === 'ok') resolve('lock', 'Bomba rearmada.');
    if (v.state === 'nopower') raise('power', { sev: 'bad', plot: null, title: 'Falta de energia no controlador', msg: 'O controlador do poço está sem energia (operando com a bateria de reserva). Nenhuma irrigação pode ser feita até a energia voltar. Ação: verifique o disjuntor e a rede elétrica.' });
    else resolve('power', 'Energia restabelecida.');
  }

  /* ---------- passo do gateway (1 min simulado) ---------- */
  function tick(t) {
    if (t != null) gw.now = t;
    devices().forEach(d => {
      const lim = OFFLINE_AFTER[d.type]; if (!lim || gw.devStatus[d.id] === 'offline') return;
      if (gw.lastSeen[d.id] != null && gw.now - gw.lastSeen[d.id] >= lim) {
        gw.devStatus[d.id] = 'offline'; send('device.status', { device: d.id, status: 'offline', seen: env.tsOf(gw.lastSeen[d.id]) });
        const bt = gw.batt[d.id] != null ? ` A bateria estava em ${Math.round(gw.batt[d.id])}%.` : '';
        raise('off:' + d.id, { sev: d.type === 'controller' ? 'bad' : 'warn', plot: d.plot || null, title: `${SENSOR_NAME[d.type]} sem comunicação`,
          msg: `${d.name} não envia leitura desde ${env.when(gw.lastSeen[d.id], gw.now)}.${bt}${d.type === 'soil' ? ' Sem a leitura, não há recomendação para este talhão.' : ''} Ação: verifique a bateria, o sinal e a instalação do dispositivo.` });
        if (d.type === 'soil') evalRec(d.plot);
      }
    });
    const net = env.internet();
    if (net && env.forecast && gw.now - gw.forecastAt >= 30) { gw.forecastAt = gw.now; setForecast(env.forecast()); }
    if (!net) raise('net', { sev: 'info', plot: null, title: 'Sem internet — operando em modo local', msg: 'O gateway segue lendo os sensores e aceitando comandos pela rede da fazenda. Os registros ficam guardados e são enviados sozinhos quando a internet voltar. Nada a fazer agora.' });
    else if (!gw.prevNet) { resolve('net', 'Internet restabelecida.'); if (gw.pending > 0) { infoDone('Internet restabelecida', `${gw.pending} registros guardados no modo local foram sincronizados.`); gw.pending = 0; } gw.lastSync = gw.now; }
    if (net && gw.pending === 0 && Math.floor(gw.now) % 15 === 0) gw.lastSync = gw.now;
    gw.prevNet = net;
    if (Math.floor(gw.now) % 60 === 0) plots().forEach(p => { const m = gw.lastMoist[p.id]; if (m == null) return; const a = gw.series[p.id]; a.push(m); if (a.length > 24) a.shift(); send('series', { plot: p.id, values: a.slice() }); });
    gw.maint = gw.maint.filter(m => {
      if (gw.now < m.due) return true;
      env.actuate('fix', { key: m.key }, null); log('Manutenção concluída: ' + ((gw.alerts.find(a => a.id === m.id) || {}).title), 'sim');
      const al = gw.alerts.find(a => a.id === m.id); patchAlert(m.id, { msg: (al ? al.msg : '') + ' Manutenção informa que o reparo foi concluído — confirme após conferir.' }); return false;
    });
  }
  function setForecast(f) { gw.forecast = f; send('forecast', f); plots().forEach(p => evalRec(p.id)); }

  /* ---------- comandos do app ---------- */
  const ack = (cid, cmd, ok, text, extra) => send('command.ack', Object.assign({ cid, cmd, ok, text }, extra));
  function finish(cid, cmd, a, r) {
    const plot = a.plot && plotOf(a.plot);
    if (cmd === 'pump.start') { if (!r.ok && plot) delete gw.origin[plot.id]; return ack(cid, cmd, r.ok, r.ok ? `Bomba ligada · ${plot.name} · ${Math.round(a.minutes)} min` : r.text); }
    if (cmd === 'device.restart' && r.ok) { gw.devStatus[a.id] = 'offline'; send('device.status', { device: a.id, status: 'offline', seen: ts(), reason: 'reiniciando' }); }
    ack(cid, cmd, r.ok, r.text);
  }
  function act(cid, cmd, a) {
    const r = env.actuate(cmd, a, cid) || { ok: false, text: 'Controlador indisponível.' };
    if (r.pending) { gw.cmdp[cid] = { cmd, a, at: gw.now }; return; }
    finish(cid, cmd, a, r);
  }
  /* resposta tardia do controlador (modo nuvem) */
  function complete(cid, r) { const p = gw.cmdp[cid]; if (!p) return; delete gw.cmdp[cid]; finish(cid, p.cmd, p.a, r); }

  function command(c) {
    const cmd = c.cmd, a = c.args || {}, cid = c.cid, plot = a.plot && plotOf(a.plot);
    switch (cmd) {
      case 'pump.start': {
        if (!plot) return ack(cid, cmd, false, 'Talhão desconhecido.');
        const min = Math.round(a.minutes);
        if (!(min >= 5)) return ack(cid, cmd, false, 'Duração inválida.');
        if (min > gw.settings.maxRun) return ack(cid, cmd, false, `Acima do limite contínuo de ${gw.settings.maxRun} min.`);
        gw.origin[plot.id] = gw.recs[plot.id] && gw.recs[plot.id].type === 'go' ? 'Recomendação aceita' : 'Comando manual';
        return act(cid, cmd, { plot: plot.id, minutes: min });
      }
      case 'pump.stop': if (!plot) return ack(cid, cmd, false, 'Talhão desconhecido.'); return act(cid, cmd, { plot: plot.id });
      case 'pump.emergency': return act(cid, cmd, {});
      case 'pump.rearm': return act(cid, cmd, {});
      case 'recommendation.refuse': gw.refused[a.plot] = gw.now + 30; evalRec(a.plot); return ack(cid, cmd, true, 'Recomendação recusada por 30 min.');
      case 'alert.confirm': case 'alert.discard': {
        const al = gw.alerts.find(x => x.id === a.id); if (!al) return ack(cid, cmd, false, 'Alerta não encontrado.');
        const key = gw.keyOf[al.id]; if (key && gw.active[key] === al.id) { delete gw.active[key]; gw.suppress[key] = true; }
        gw.maint = gw.maint.filter(m => m.id !== al.id); patchAlert(al.id, { state: 'resolvido' });
        return ack(cid, cmd, true, cmd === 'alert.confirm' ? 'Alerta confirmado.' : 'Alerta descartado.');
      }
      case 'alert.maintenance': {
        const al = gw.alerts.find(x => x.id === a.id); if (!al) return ack(cid, cmd, false, 'Alerta não encontrado.');
        const key = gw.keyOf[al.id]; if (!key || !/^(low|high|off|batt):|^(dry|power)$/.test(key)) return ack(cid, cmd, false, 'Este alerta não depende de manutenção.');
        if (!gw.maint.some(m => m.id === al.id)) gw.maint.push({ id: al.id, key, due: gw.now + 60 });
        log('Manutenção acionada para: ' + al.title + ' (chega em 1 h simulada)', 'sim');
        return ack(cid, cmd, true, 'Manutenção acionada — chegada estimada em 1 h.');
      }
      case 'device.restart': return act(cid, cmd, { id: a.id });
      case 'sync.now': if (!env.internet()) return ack(cid, cmd, false, 'Sem internet — a sincronização acontece quando ela voltar.'); gw.pending = 0; gw.lastSync = gw.now; return ack(cid, cmd, true, 'Sincronizado.');
      case 'settings.update': { const r = a.rules || {}; RULE_KEYS.forEach(k => { if (typeof r[k] === 'number' && isFinite(r[k])) gw.settings[k] = r[k]; }); plots().forEach(p => evalRec(p.id)); log('Regras atualizadas pelo app: ' + JSON.stringify(gw.settings), 'sim'); return ack(cid, cmd, true, 'Regras salvas no gateway.'); }
      default: return ack(cid, cmd, false, 'Comando desconhecido: ' + cmd);
    }
  }

  /* ---------- conexão ---------- */
  function hello() {
    const f = gw.cfg.farm || { id: 'f1', name: 'Fazenda Digital', city: 'Jaú · SP' };
    return {
      farm: f, net: { gatewayName: 'Raiz GW-01', ip: '192.168.0.20', link: env.linkName || 'Wi-Fi da fazenda' }, settings: Object.assign({}, gw.settings),
      modules: [
        { id: 'irrig', name: 'Irrigação', desc: 'Recomendação e comando da bomba', on: true },
        { id: 'flow', name: 'Vazão e anomalias', desc: 'Detecção de vazamento e entupimento', on: true },
        { id: 'water', name: 'Qualidade da água', desc: 'Triagem de pH, condutividade e turbidez — não atesta potabilidade', on: false, soon: true }],
      plots: plots().map(p => ({ id: p.id, name: p.name, crop: p.crop, area: p.area, flowRef: p.flowRef })),
      devices: devices().map(d => ({ id: d.id, name: d.name, type: d.type, plot: d.plot || null, fw: d.fw, link: d.link, status: d.type === 'gateway' ? 'online' : (gw.devStatus[d.id] || 'online'), seen: gw.lastSeen[d.id] != null ? env.tsOf(gw.lastSeen[d.id]) : ts(), batt: gw.batt[d.id] != null ? Math.round(gw.batt[d.id]) : null, rssi: d.rssi })),
      snapshot: {
        telemetry: devices().filter(d => gw.last[d.id]).map(d => ({ device: d.id, kind: d.type, plot: d.plot || null, values: gw.last[d.id], batt: gw.batt[d.id] != null ? Math.round(gw.batt[d.id]) : null, rssi: d.rssi })),
        alerts: gw.alerts.slice().reverse(), recs: Object.assign({}, gw.recs), runs: gw.runs, series: gw.series, forecast: gw.forecast
      }
    };
  }
  function heartbeat() { return Object.assign({ internet: env.internet(), pending: gw.pending, lastSync: env.tsOf(gw.lastSync) }, env.extra ? env.extra() : {}); }

  function exportState() { const o = {}; STATE_KEYS.forEach(k => { o[k] = gw[k]; }); return JSON.parse(JSON.stringify(o)); }
  function importState(s) { if (!s) return; const c = JSON.parse(JSON.stringify(s)); STATE_KEYS.forEach(k => { if (c[k] !== undefined) gw[k] = c[k]; }); ensurePlots(); }

  Object.assign(gw, { ingest, tick, command, complete, hello, heartbeat, evalRec, setForecast, configure, exportState, importState, plotOf });
  ensurePlots();
  return gw;
}

root.RaizGatewayCore = { create, RULE_KEYS };
if (typeof module !== 'undefined') module.exports = root.RaizGatewayCore;
})(typeof window !== 'undefined' ? window : globalThis);
