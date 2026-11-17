/* Fazenda → gateway na nuvem (Edge Function). Junta as leituras dos dispositivos em lotes e envia (op 'ingest');
   executa no controlador os pedidos 'actuate' que a nuvem repassa e devolve o resultado (ack) no lote seguinte.
   `call(op, body)` é fornecido por quem usa (link.invoke no navegador; função de teste no Node). */
(function (root) {
'use strict';
const Sim = root.FarmSim;

function create(o) {
  const S = o.S, E = { lost: false, queue: [], acks: [], flushing: false, again: false, needConfig: true, lastForecastAt: -1e9, n: 0, lastState: null, fails: 0, okAt: 0, lastError: '' };
  const config = () => ({
    plots: S.plots.map(p => ({ id: p.id, name: p.name, crop: p.crop, area: p.area, flowRef: p.flowRef })),
    devices: S.devices.map(d => ({ id: d.id, name: d.name, type: d.type, plot: d.plot || null, fw: d.fw, link: d.link, rssi: d.rssi }))
  });
  E.config = config;
  E.push = (d, v) => {
    E.queue.push({ device: d.id, kind: d.type, plot: d.plot || null, values: v, batt: d.batt, rssi: d.rssi, name: d.name, t: S.t });
    if (E.queue.length > 500) E.queue.splice(0, E.queue.length - 500);
  };
  /* ordens da nuvem (vêm na resposta do ingest): o controlador executa e devolve o resultado no lote seguinte */
  E.runActs = list => {
    (list || []).forEach(p => { const r = Sim.actuate(S, p.cmd, p.args); if (p.cid) E.acks.push({ cid: p.cid, ok: !!r.ok, text: r.text || '' }); if (o.onAct) o.onAct(p, r); });
    if (list && list.some(p => p.cid)) E.again = true;
  };
  E.flush = async function (internetOverride) {
    if (E.flushing) { E.again = true; return; }
    E.flushing = true;
    const readings = E.queue.splice(0), acks = E.acks.splice(0);
    const body = { t: S.t, readings, acks, net: Object.assign({ internet: S.net.internet, gateway: S.net.gateway }, internetOverride), sim: { running: S.running, speed: S.speed } };
    if (E.needConfig) body.config = config();
    if (S.t - E.lastForecastAt >= 30 && S.net.internet) body.forecast = Sim.forecast(S);
    if (E.n % 10 === 0) body.want_state = true;
    try {
      const r = await o.call('ingest', body);
      if (r && r.ok) { E.runActs(r.actuate); E.needConfig = false; if (body.forecast) E.lastForecastAt = S.t; if (r.state) E.lastState = r.state; E.fails = 0; E.okAt = Date.now(); E.lastError = ''; }
      else if (r && r.error === 'outra_instancia') { E.lost = true; if (o.onLost) o.onLost(r); }
      else if (r && r.error === 'sem_config') { E.needConfig = true; E.queue.unshift(...readings); E.acks.unshift(...acks); }
      else throw new Error((r && (r.error || r.text)) || 'resposta inválida');
    } catch (e) {
      E.fails++; E.lastError = String(e && e.message || e); E.queue.unshift(...readings); E.acks.unshift(...acks);
      if (E.queue.length > 500) E.queue.splice(0, E.queue.length - 500);
    }
    E.flushing = false; E.n++;
    if (E.again) { E.again = false; return E.flush(); }
  };
  return E;
}

root.FarmEdge = { create };
if (typeof module !== 'undefined') module.exports = root.FarmEdge;
})(typeof window !== 'undefined' ? window : globalThis);
