/* Gateway local da Fazenda Digital — usa o núcleo compartilhado (shared/gateway-core.js) ligado ao simulador.
   Opera sozinho quando não há internet (ou se a nuvem estiver indisponível). Com internet, quem decide é a Edge Function. */
(function (root) {
'use strict';
const Sim = root.FarmSim, Core = root.RaizGatewayCore;

function createGateway(S, send) {
  const env = {
    send, tsOf: Sim.tsOf, when: Sim.when, internet: () => S.net.internet,
    log: (m, k) => S.hooks.log(m, k), forecast: () => Sim.forecast(S),
    plots: () => S.plots, devices: () => S.devices, linkName: 'Wi-Fi da fazenda',
    extra: () => ({ running: S.running, speed: S.speed }),
    actuate: (cmd, a) => Sim.actuate(S, cmd, a)
  };
  const gw = Core.create(env);
  gw.configure({ plots: S.plots.map(p => ({ id: p.id, name: p.name, crop: p.crop, area: p.area, flowRef: p.flowRef })), devices: S.devices.map(d => ({ id: d.id, name: d.name, type: d.type, plot: d.plot || null, fw: d.fw, link: d.link, rssi: d.rssi })) });
  gw.now = S.t; gw.lastSync = S.t; gw.forecast = Sim.forecast(S); gw.forecastAt = S.t;
  const ing = gw.ingest;
  gw.ingestDev = (d, v) => ing({ device: d.id, kind: d.type, plot: d.plot || null, values: v, batt: d.batt, rssi: d.rssi, name: d.name, t: S.t });
  return gw;
}

root.FarmGateway = { create: createGateway };
if (typeof module !== 'undefined') module.exports = root.FarmGateway;
})(typeof window !== 'undefined' ? window : globalThis);
