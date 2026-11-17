/* DADOS DE EXEMPLO — apenas para desenhar a interface.
   Na integração real, defina window.RAIZ_MOCK = false e envie o estado pelo app nativo:
   Raiz.setState({...}) (veja README.md). Nada aqui vem de sensores ou da rede da fazenda. */
window.RAIZ_MOCK = true;

(function () {
  const hist = (base, amp, n = 24) => Array.from({ length: n }, (_, i) => +(base + Math.sin(i / 3.2) * amp - i * 0.12).toFixed(1));
  window.RAIZ_STATE = {
    user: { name: 'Operador Exemplo', role: 'operador', initials: 'OE' },          // role: 'operador' | 'gestor'
    farm: { id: 'f1', name: 'Fazenda Exemplo', city: 'Jaú · SP' },
    net: { gateway: 'online', gatewayName: 'Raiz GW-01', ip: '192.168.0.20', link: 'Wi-Fi da fazenda', internet: true, pending: 0, lastSync: 'há 2 min' },
    weather: { temp: 31, rainProb: 15, hourly: [
      { h: '14h', t: 31, p: 10 }, { h: '15h', t: 32, p: 15 }, { h: '16h', t: 31, p: 20 }, { h: '17h', t: 29, p: 25 }, { h: '18h', t: 27, p: 20 }, { h: '19h', t: 25, p: 10 }] },
    settings: { crit: 30, target: 42, rainLimit: 60, tolPct: 20, persist: 3, maxRun: 60,
      notif: { alerts: true, recs: true, sync: false, quiet: true }, biometrics: true },
    modules: [
      { id: 'irrig', name: 'Irrigação', desc: 'Recomendação e comando da bomba', on: true },
      { id: 'flow', name: 'Vazão e anomalias', desc: 'Detecção de vazamento e entupimento', on: true },
      { id: 'water', name: 'Qualidade da água', desc: 'Triagem de pH, condutividade e turbidez — não atesta potabilidade', on: false, soon: true }],
    plots: [
      { id: 't1', name: 'Talhão 1', crop: 'Cana-de-açúcar', area: 10.2, moisture: 27.4, series: hist(36, 2),
        pump: { state: 'off', left: 0, total: 0 }, flow: { now: 0, ref: 25.0 }, pressure: 0,
        rec: { type: 'go', duration: 40, reason: 'Umidade abaixo do limiar (27,4% < 30%) e chuva prevista de 15% (limite 60%).' },
        runs: [{ when: 'Ontem · 05:40', dur: 35, vol: 14.6, origin: 'Recomendação aceita' }, { when: 'Seg · 05:55', dur: 40, vol: 16.7, origin: 'Comando manual' }, { when: 'Dom · 06:10', dur: 30, vol: 12.5, origin: 'Recomendação aceita' }] },
      { id: 't2', name: 'Talhão 2', crop: 'Cana-de-açúcar', area: 8.6, moisture: 36.8, series: hist(38, 1.5),
        pump: { state: 'on', left: 1260, total: 1800 }, flow: { now: 24.6, ref: 25.0 }, pressure: 2.4, rec: null,
        runs: [{ when: 'Hoje · 13:30', dur: 30, vol: 12.3, origin: 'Em andamento' }, { when: 'Ontem · 06:20', dur: 25, vol: 10.4, origin: 'Recomendação aceita' }] },
      { id: 't3', name: 'Talhão 3', crop: 'Cana-de-açúcar', area: 12.0, moisture: null, series: [], lastReading: 'há 3 h',
        pump: { state: 'off', left: 0, total: 0 }, flow: { now: 0, ref: 25.0 }, pressure: 0, rec: null,
        runs: [{ when: 'Dom · 06:40', dur: 45, vol: 18.8, origin: 'Comando manual' }] }],
    alerts: [
      { id: 'a1', sev: 'warn', plot: 't1', state: 'aberto', title: 'Queda de vazão — possível entupimento', time: 'Hoje · 05:52',
        msg: 'Na irrigação das 05:40 a vazão ficou 38% abaixo da referência por 3 leituras seguidas. Pressão elevada reforça entupimento. Confirme em inspeção local.',
        q: 15.5, ref: 25.0, p: 3.1, series: [25.1, 24.8, 25.2, 24.9, 22.4, 18.0, 15.8, 15.5, 15.6, 15.4] },
      { id: 'a2', sev: 'warn', plot: 't3', state: 'aberto', title: 'Sensor de umidade sem comunicação', time: 'Hoje · 11:03',
        msg: 'O sensor do Talhão 3 não envia leitura há 3 h. A bateria estava em 12%. Sem a leitura, não há recomendação para este talhão.' },
      { id: 'a3', sev: 'info', plot: null, state: 'resolvido', title: 'Internet restabelecida', time: 'Ontem · 22:18', msg: '14 registros guardados no modo local foram sincronizados.' },
      { id: 'a4', sev: 'bad', plot: 't2', state: 'resolvido', title: 'Vazão acima do esperado — vazamento confirmado', time: 'Seg · 07:12', msg: 'Confirmado em inspeção e corrigido pela manutenção.' }],
    devices: [
      { id: 'd1', name: 'Gateway Raiz GW-01', type: 'gateway', status: 'online', plot: null, rssi: null, batt: null, seen: 'agora', fw: '1.2.0', link: 'Wi-Fi / Ethernet' },
      { id: 'd2', name: 'Controlador do poço', type: 'controller', status: 'online', plot: null, rssi: -71, batt: null, seen: 'agora', fw: '1.2.0', link: 'LoRa' },
      { id: 'd3', name: 'Medidor de vazão', type: 'flow', status: 'online', plot: null, rssi: -68, batt: null, seen: 'agora', fw: '1.1.4', link: 'LoRa' },
      { id: 'd4', name: 'Sensor de umidade · T1', type: 'soil', status: 'online', plot: 't1', rssi: -80, batt: 91, seen: 'há 1 min', fw: '1.0.7', link: 'LoRa' },
      { id: 'd5', name: 'Sensor de umidade · T2', type: 'soil', status: 'online', plot: 't2', rssi: -77, batt: 64, seen: 'há 1 min', fw: '1.0.7', link: 'LoRa' },
      { id: 'd6', name: 'Sensor de umidade · T3', type: 'soil', status: 'offline', plot: 't3', rssi: null, batt: 12, seen: 'há 3 h', fw: '1.0.5', link: 'LoRa' },
      { id: 'd7', name: 'Estação meteorológica', type: 'weather', status: 'online', plot: null, rssi: -74, batt: 78, seen: 'há 3 min', fw: '1.0.2', link: 'LoRa' }]
  };
})();
