/* Gateway Raiz simulado — o que, na instalação real, roda no gateway/borda (e depois no Supabase).
   Recebe a telemetria dos dispositivos, aplica as regras do Raiz (recomendação, detecção de vazão,
   sensores sem comunicação…), guarda o histórico e conversa com o app pelo protocolo (docs/PROTOCOLO.md).
   Só enxerga o que os dispositivos enviam por telemetria — nunca o estado "verdadeiro" do solo. */
(function (root) {
'use strict';
const Sim = root.FarmSim;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const br = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const OFFLINE_AFTER = { soil: 35, flow: 50, weather: 35, controller: 25 };      // minutos simulados sem leitura
const RULE_KEYS = ['crit', 'target', 'rainLimit', 'tolPct', 'persist', 'maxRun'];
const SENSOR_NAME = { soil: 'Sensor de umidade', flow: 'Medidor de vazão', weather: 'Estação meteorológica', controller: 'Controlador do poço' };

function createGateway(S, send0) {
  const gw = {
    send: send0, muted: false,
    settings: { crit: 30, target: 42, rainLimit: 60, tolPct: 20, persist: 3, maxRun: 60 },
    alerts: [], seq: 0, active: {}, suppress: {}, keyOf: {},
    runs: {}, recs: {}, series: {}, last: {}, lastSeen: {}, devStatus: {}, lastMoist: {}, rainNow: 0, forecast: null,
    zones: {}, flowBuf: {}, flowCnt: {}, flowStart: {}, refused: {}, origin: {}, maint: [],
    pending: 0, lastSync: S.t, forecastAt: -999, prevNet: true
  };
  S.plots.forEach(p => { gw.runs[p.id] = []; gw.series[p.id] = []; gw.zones[p.id] = { on: false, startT: 0, origin: '' }; gw.flowBuf[p.id] = []; gw.flowCnt[p.id] = { low: 0, high: 0 }; });
  const send = (type, payload) => { if (!gw.muted) gw.send(type, payload); };
  gw.out = send;
  const ts = () => Sim.tsOf(S.t);
  const plotName = id => (S.plots.find(p => p.id === id) || {}).name || id;

  /* ---------- alertas ---------- */
  function raise(key, a) {
    if (gw.suppress[key]) return;
    const cur = gw.active[key] && gw.alerts.find(x => x.id === gw.active[key]);
    if (cur && cur.state === 'aberto') return;
    const alert = Object.assign({ id: 'a' + (++gw.seq), state: 'aberto', time: Sim.when(S.t) }, a);
    gw.alerts.unshift(alert); gw.active[key] = alert.id; gw.keyOf[alert.id] = key;
    send('alert.new', alert); S.hooks.log('Gateway abriu alerta: ' + alert.title, a.sev === 'info' ? 'sim' : 'bad');
  }
  function patchAlert(id, patch) {
    const a = gw.alerts.find(x => x.id === id); if (!a) return; Object.assign(a, patch); send('alert.update', { id, patch });
  }
  function resolve(key, note) {
    const id = gw.active[key]; if (!id) return;
    const a = gw.alerts.find(x => x.id === id); delete gw.active[key];
    if (a && a.state === 'aberto') patchAlert(id, { state: 'resolvido', msg: a.msg + (note ? ' ' + note : '') });
  }
  function infoDone(title, msg) {
    const a = { id: 'a' + (++gw.seq), sev: 'info', plot: null, state: 'resolvido', title, msg, time: Sim.when(S.t) };
    gw.alerts.unshift(a); send('alert.new', a);
  }

  /* ---------- recomendação ---------- */
  function evalRec(plot) {
    const m = gw.lastMoist[plot], st = gw.settings, cur = gw.recs[plot] || null;
    let next = null;
    const fresh = gw.devStatus['sm-' + plot] !== 'offline';
    if (m != null && fresh && !gw.zones[plot].on && !((gw.refused[plot] || -1) > S.t)) {
      if (m < st.crit || (cur && m < st.crit + 2)) {
        const rp = gw.forecast ? gw.forecast.rainProb : 0, raining = gw.rainNow > .5;
        if (raining || rp >= st.rainLimit) next = { type: 'wait', reason: `Umidade abaixo do limiar (${br(m)}% < ${st.crit}%), mas ${raining ? 'está chovendo agora' : `há chuva prevista de ${rp}% (limite ${st.rainLimit}%)`}. Aguardar pode economizar água.` };
        else next = { type: 'go', duration: clamp(Math.ceil((st.target - m) / .30 / 5) * 5, 10, st.maxRun), reason: `Umidade abaixo do limiar (${br(m)}% < ${st.crit}%) e chuva prevista de ${rp}% (limite ${st.rainLimit}%).` };
      }
    }
    const same = (!cur && !next) || (cur && next && cur.type === next.type && cur.duration === next.duration);
    if (same) return;
    gw.recs[plot] = next; send('recommendation', { plot, rec: next });
  }

  /* ---------- análise de vazão ---------- */
  function analyzeFlow(plot, v) {
    const z = gw.zones[plot]; if (!z.on || S.t - z.startT < 2) return;
    const p = S.plots.find(x => x.id === plot), ref = p.flowRef, tol = gw.settings.tolPct / 100;
    const buf = gw.flowBuf[plot], c = gw.flowCnt[plot]; buf.push(v.flow); if (buf.length > 14) buf.shift();
    if (v.flow < ref * .10) return;                                       // a seco: quem trata é o controlador
    const dev = (v.flow - ref) / ref;
    if (dev < -tol) { c.low++; c.high = 0; } else if (dev > tol) { c.high++; c.low = 0; }
    else { c.low = 0; c.high = 0; gw.suppress['low:' + plot] = false; gw.suppress['high:' + plot] = false; }
    const base = { plot, q: v.flow, ref, p: v.pressure, series: buf.slice(-10) };
    if (c.low >= gw.settings.persist) raise('low:' + plot, Object.assign({ sev: 'warn', title: 'Queda de vazão — possível entupimento', msg: `Na irrigação em andamento a vazão ficou ${Math.round(-dev * 100)}% abaixo da referência por ${c.low} leituras seguidas.${v.pressure > 2.8 ? ' Pressão elevada reforça entupimento.' : ''} Confirme em inspeção local.` }, base));
    if (c.high >= gw.settings.persist) raise('high:' + plot, Object.assign({ sev: 'bad', title: 'Vazão acima do esperado — possível vazamento', msg: `A vazão ficou ${Math.round(dev * 100)}% acima da referência por ${c.high} leituras seguidas${v.pressure < 2.1 ? ', com queda de pressão' : ''}. Verifique mangueiras, conexões e válvulas do setor.` }, base));
  }

  /* ---------- telemetria dos dispositivos ---------- */
  function ingest(d, v) {
    gw.lastSeen[d.id] = S.t; gw.last[d.id] = v;
    if (!S.net.internet) gw.pending++;
    if (gw.devStatus[d.id] !== 'online') {
      gw.devStatus[d.id] = 'online'; send('device.status', { device: d.id, status: 'online', seen: ts() }); resolve('off:' + d.id, 'Comunicação restabelecida.');
    }
    if (d.batt != null) { if (d.batt <= 15) raise('batt:' + d.id, { sev: 'warn', plot: d.plot || null, title: `Bateria baixa — ${d.name}`, msg: `A bateria está em ${Math.round(d.batt)}%. Troque ou recarregue antes que o dispositivo pare de enviar leituras.` }); else if (d.batt > 30) resolve('batt:' + d.id, 'Bateria normalizada.'); }
    send('telemetry', { device: d.id, kind: d.type, plot: d.plot || null, values: v, batt: d.batt != null ? Math.round(d.batt) : null, rssi: d.rssi });
    if (d.type === 'soil') { gw.lastMoist[d.plot] = v.moisture; evalRec(d.plot); }
    else if (d.type === 'weather') { gw.rainNow = v.rain; if (v.rain > .5) S.plots.forEach(p => evalRec(p.id)); }
    else if (d.type === 'flow') analyzeFlow(d.plot, v);
    else if (d.type === 'controller') onController(v);
  }
  function onController(v) {
    S.plots.forEach(p => {
      const z = v.zones[p.id], g = gw.zones[p.id], on = z.state === 'on';
      if (on && !g.on) {
        g.on = true; g.startT = S.t; g.origin = gw.origin[p.id] || 'Comando manual'; delete gw.origin[p.id];
        gw.flowStart[p.id] = (gw.last['fm-' + p.id] || {}).total || 0; gw.flowBuf[p.id] = []; gw.flowCnt[p.id] = { low: 0, high: 0 };
        if (gw.recs[p.id]) { gw.recs[p.id] = null; send('recommendation', { plot: p.id, rec: null }); }
      } else if (!on && g.on) {
        g.on = false; const dur = Math.max(1, Math.round(S.t - g.startT)), tot = (gw.last['fm-' + p.id] || {}).total || 0, vol = Math.max(0, tot - (gw.flowStart[p.id] || 0));
        const run = { when: Sim.when(g.startT, S.t), dur, vol: Math.round(vol * 10) / 10, origin: g.origin };
        gw.runs[p.id].unshift(run); gw.runs[p.id].length = Math.min(gw.runs[p.id].length, 8); send('run.log', { plot: p.id, run });
        gw.flowCnt[p.id] = { low: 0, high: 0 }; evalRec(p.id);
      }
    });
    if (v.state === 'locked' && /seco/i.test(v.reason)) raise('dry', { sev: 'bad', plot: null, title: 'Funcionamento a seco — bomba bloqueada', msg: 'O controlador detectou vazão e pressão quase nulas com a bomba ligada e bloqueou o equipamento para protegê-lo. Verifique o nível do poço antes de rearmar.' });
    else if (v.state === 'ok' && !(v.well === 'dry')) resolve('dry', 'Bomba rearmada.');
    if (v.state === 'nopower') raise('power', { sev: 'bad', plot: null, title: 'Falta de energia no controlador', msg: 'O controlador do poço está sem energia (operando com a bateria de reserva). Nenhuma irrigação pode ser feita até a energia voltar.' });
    else resolve('power', 'Energia restabelecida.');
  }

  /* ---------- passo do gateway (1 min simulado) ---------- */
  function tick() {
    S.devices.forEach(d => {
      const lim = OFFLINE_AFTER[d.type]; if (!lim || gw.devStatus[d.id] === 'offline') return;
      if (gw.lastSeen[d.id] != null && S.t - gw.lastSeen[d.id] >= lim) {
        gw.devStatus[d.id] = 'offline'; send('device.status', { device: d.id, status: 'offline', seen: Sim.tsOf(gw.lastSeen[d.id]) });
        if (d.plot) { const bt = d.batt != null ? ` A bateria estava em ${Math.round(d.batt)}%.` : ''; raise('off:' + d.id, { sev: d.type === 'controller' ? 'bad' : 'warn', plot: d.plot, title: `${SENSOR_NAME[d.type]} sem comunicação`, msg: `${d.name} não envia leitura desde ${Sim.when(gw.lastSeen[d.id], S.t)}.${bt}${d.type === 'soil' ? ' Sem a leitura, não há recomendação para este talhão.' : ''}` }); if (d.type === 'soil') evalRec(d.plot); }
        else raise('off:' + d.id, { sev: d.type === 'controller' ? 'bad' : 'warn', plot: null, title: `${SENSOR_NAME[d.type]} sem comunicação`, msg: `${d.name} não envia leitura desde ${Sim.when(gw.lastSeen[d.id], S.t)}.` });
      }
    });
    if (S.net.internet && (S.t - gw.forecastAt >= 30)) { gw.forecastAt = S.t; gw.forecast = Sim.forecast(S); send('forecast', gw.forecast); S.plots.forEach(p => evalRec(p.id)); }
    if (S.net.internet && !gw.prevNet && gw.pending > 0) { infoDone('Internet restabelecida', `${gw.pending} registros guardados no modo local foram sincronizados.`); gw.pending = 0; gw.lastSync = S.t; }
    if (S.net.internet && gw.pending === 0 && S.t % 15 === 0) gw.lastSync = S.t;
    gw.prevNet = S.net.internet;
    if (Math.floor(S.t) % 60 === 0) S.plots.forEach(p => { const m = gw.lastMoist[p.id]; if (m == null) return; const a = gw.series[p.id]; a.push(m); if (a.length > 24) a.shift(); send('series', { plot: p.id, values: a.slice() }); });
    gw.maint = gw.maint.filter(m => {
      if (S.t < m.due) return true;
      const k = m.key, p = (k.split(':')[1] || '');
      if (k.startsWith('low:')) S.plots.find(x => x.id === p).clog = false; else if (k.startsWith('high:')) S.plots.find(x => x.id === p).leak = false;
      else if (k.startsWith('off:')) { const d = Sim.dev(S, k.slice(4)); if (d) { d.forcedOff = false; if (!d.restartUntil) d.online = true; } }
      else if (k.startsWith('batt:')) { const d = Sim.dev(S, k.slice(5)); if (d) { d.lowBatt = false; d.batt = 100; } }
      else if (k === 'dry') S.pump.wellDry = false; else if (k === 'power') S.pump.power = true;
      S.hooks.log('Manutenção concluída: ' + (gw.alerts.find(a => a.id === m.id) || {}).title, 'sim');
      patchAlert(m.id, { msg: ((gw.alerts.find(a => a.id === m.id) || {}).msg || '') + ' Manutenção informa que o reparo foi concluído — confirme após conferir.' }); return false;
    });
  }

  /* ---------- comandos do app ---------- */
  function command(c) {
    const cmd = c.cmd, a = c.args || {}, cid = c.cid;
    const ack = (ok, text, extra) => send('command.ack', Object.assign({ cid, cmd, ok, text }, extra));
    const plot = a.plot && S.plots.find(p => p.id === a.plot);
    switch (cmd) {
      case 'pump.start': {
        if (!plot) return ack(false, 'Talhão desconhecido.');
        const min = Math.round(a.minutes);
        if (!(min >= 5)) return ack(false, 'Duração inválida.');
        if (min > gw.settings.maxRun) return ack(false, `Acima do limite contínuo de ${gw.settings.maxRun} min.`);
        gw.origin[plot.id] = gw.recs[plot.id] && gw.recs[plot.id].type === 'go' ? 'Recomendação aceita' : 'Comando manual';
        const r = Sim.act.start(S, plot.id, min); if (!r.ok) delete gw.origin[plot.id];
        return ack(r.ok, r.ok ? `Bomba ligada · ${plot.name} · ${min} min` : r.text);
      }
      case 'pump.stop': { if (!plot) return ack(false, 'Talhão desconhecido.'); const r = Sim.act.stop(S, plot.id); return ack(r.ok, r.text); }
      case 'pump.emergency': { const r = Sim.act.emergency(S); return ack(r.ok, r.text); }
      case 'pump.rearm': { const r = Sim.act.rearm(S); return ack(r.ok, r.text); }
      case 'recommendation.refuse': gw.refused[a.plot] = S.t + 30; evalRec(a.plot); return ack(true, 'Recomendação recusada por 30 min.');
      case 'alert.confirm': case 'alert.discard': {
        const al = gw.alerts.find(x => x.id === a.id); if (!al) return ack(false, 'Alerta não encontrado.');
        const key = gw.keyOf[al.id]; if (key && gw.active[key] === al.id) { delete gw.active[key]; gw.suppress[key] = true; }
        gw.maint = gw.maint.filter(m => m.id !== al.id); patchAlert(al.id, { state: 'resolvido' });
        return ack(true, cmd === 'alert.confirm' ? 'Alerta confirmado.' : 'Alerta descartado.');
      }
      case 'alert.maintenance': {
        const al = gw.alerts.find(x => x.id === a.id); if (!al) return ack(false, 'Alerta não encontrado.');
        const key = gw.keyOf[al.id]; if (key && !gw.maint.some(m => m.id === al.id)) gw.maint.push({ id: al.id, key, due: S.t + 60 });
        S.hooks.log('Manutenção acionada para: ' + al.title + ' (chega em 1 h simulada)', 'sim');
        return ack(true, 'Manutenção acionada — chegada estimada em 1 h.');
      }
      case 'device.restart': { const r = Sim.act.restart(S, a.id); if (r.ok) { gw.devStatus[a.id] = 'offline'; send('device.status', { device: a.id, status: 'offline', seen: ts(), reason: 'reiniciando' }); } return ack(r.ok, r.text); }
      case 'sync.now': if (!S.net.internet) return ack(false, 'Sem internet — a sincronização acontece quando ela voltar.'); gw.pending = 0; gw.lastSync = S.t; return ack(true, 'Sincronizado.');
      case 'settings.update': { const r = a.rules || {}; RULE_KEYS.forEach(k => { if (typeof r[k] === 'number' && isFinite(r[k])) gw.settings[k] = r[k]; }); S.plots.forEach(p => evalRec(p.id)); S.hooks.log('Regras atualizadas pelo app: ' + JSON.stringify(gw.settings), 'sim'); return ack(true, 'Regras salvas no gateway.'); }
      default: return ack(false, 'Comando desconhecido: ' + cmd);
    }
  }

  /* ---------- mensagens de conexão ---------- */
  function hello() {
    return {
      farm: { id: 'f1', name: 'Fazenda Digital', city: 'Jaú · SP' },
      net: { gatewayName: 'Raiz GW-01', ip: '192.168.0.20', link: 'Wi-Fi da fazenda' },
      settings: Object.assign({}, gw.settings),
      modules: [
        { id: 'irrig', name: 'Irrigação', desc: 'Recomendação e comando da bomba', on: true },
        { id: 'flow', name: 'Vazão e anomalias', desc: 'Detecção de vazamento e entupimento', on: true },
        { id: 'water', name: 'Qualidade da água', desc: 'Triagem de pH, condutividade e turbidez — não atesta potabilidade', on: false, soon: true }],
      plots: S.plots.map(p => ({ id: p.id, name: p.name, crop: p.crop, area: p.area, flowRef: p.flowRef })),
      devices: S.devices.map(d => ({ id: d.id, name: d.name, type: d.type, plot: d.plot || null, fw: d.fw, link: d.link, status: d.type === 'gateway' ? 'online' : (gw.devStatus[d.id] || 'online'), seen: gw.lastSeen[d.id] != null ? Sim.tsOf(gw.lastSeen[d.id]) : ts(), batt: d.batt != null ? Math.round(d.batt) : null, rssi: d.rssi })),
      snapshot: {
        telemetry: S.devices.filter(d => gw.last[d.id]).map(d => ({ device: d.id, kind: d.type, plot: d.plot || null, values: gw.last[d.id], batt: d.batt != null ? Math.round(d.batt) : null, rssi: d.rssi })),
        alerts: gw.alerts.slice().reverse(), recs: Object.assign({}, gw.recs), runs: gw.runs, series: gw.series, forecast: gw.forecast
      }
    };
  }
  function heartbeat() {
    return { internet: S.net.internet, pending: gw.pending, lastSync: Sim.tsOf(gw.lastSync), running: S.running, speed: S.speed };
  }

  /* inicialização: primeira previsão e estado dos dispositivos */
  S.devices.forEach(d => { if (d.type !== 'gateway') gw.devStatus[d.id] = 'online'; });
  gw.forecast = Sim.forecast(S); gw.forecastAt = S.t;

  Object.assign(gw, { ingest, tick, command, hello, heartbeat, evalRec });
  return gw;
}

root.FarmGateway = { create: createGateway };
if (typeof module !== 'undefined') module.exports = root.FarmGateway;
})(typeof window !== 'undefined' ? window : globalThis);
