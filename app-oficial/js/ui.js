/* Raiz — interface do app oficial (WebView). Somente UI: o estado vem de window.RAIZ_STATE
   (exemplo em mock.js) ou do app nativo via Raiz.setState(). Ações do usuário saem por RaizBridge.emit. */
(() => {
'use strict';
const D = window.RAIZ_STATE, B = window.RaizBridge;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const MOCK = () => !!window.RAIZ_MOCK;
const LIVE = () => !!(window.RAIZ_LIVE && window.RAIZ_LIVE.on);               // ligado à fazenda (js/live.js)
const cmdToast = (t, k) => { if (!LIVE()) toast(t, k); };                   // ao vivo, quem avisa é a confirmação (ack) do gateway
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const fmt = (v, d = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = v => String(v).padStart(2, '0');
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const params = new URLSearchParams(location.search);

const UI = {
  stage: ['splash', 'connect', 'login', 'app'].includes(params.get('stage')) ? params.get('stage') : 'splash',
  tab: ['home', 'irrig', 'alerts', 'net', 'more'].includes(params.get('tab')) ? params.get('tab') : 'home',
  plot: 't1', filter: 'abertos', pin: '', gwFound: false, sheet: null, start: { plot: 't1', min: 40 },
  theme: params.get('theme') || (() => { try { return localStorage.getItem('raiz-theme') || 'auto'; } catch (e) { return 'auto'; } })(),
  preview: params.has('preview'), pvOpen: false
};
let lastKey = '', hold = null;

/* ---------- helpers de domínio ---------- */
const plotOf = id => D.plots.find(p => p.id === id);
const openAlerts = () => D.alerts.filter(a => a.state === 'aberto');
const canCmd = () => D.net.gateway === 'online';
const isGestor = () => D.user.role === 'gestor';
function moistState(p) {
  if (p.moisture == null) return { k: 'off', cls: '', txt: 'Sem leitura' };
  const c = D.settings.crit;
  return p.moisture < c ? { k: 'bad', cls: 'bad', txt: 'Abaixo do limiar' } : p.moisture < c + 5 ? { k: 'warn', cls: 'warn', txt: 'Atenção' } : { k: 'ok', cls: 'ok', txt: 'Adequada' };
}
const pumpTxt = p => ({ on: 'Ligada', off: 'Desligada', locked: 'Bloqueada', nopower: 'Sem energia' }[p.pump.state] || '—');
const sevIcon = s => ({ bad: 'warn', warn: 'warn', info: 'info' }[s] || 'info');
const devIcon = t => ({ gateway: 'net', controller: 'cpu', flow: 'flow', soil: 'leaf', weather: 'sun', pressure: 'gauge' }[t] || 'cpu');

/* ---------- componentes ---------- */
function gauge(p) {
  const s = moistState(p), R = 78, C = Math.PI * R, max = 60, v = p.moisture;
  const ang = x => Math.PI * (1 - x / max), pt = (x, r) => [100 + r * Math.cos(ang(x)), 100 - r * Math.sin(ang(x))];
  const tick = (x, cls) => { const a = pt(x, R - 10), b = pt(x, R + 10); return `<line class="${cls}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`; };
  return `<svg viewBox="0 0 200 118" class="gauge ${s.cls}" role="img" aria-label="Umidade do solo ${v == null ? 'sem leitura' : fmt(v, 1) + '%'}">
    <path class="g-bg" d="M22 100A78 78 0 0 1 178 100"/>${v == null ? '' : `<path class="g-fg" d="M22 100A78 78 0 0 1 178 100" stroke-dasharray="${(C * clamp(v / max, 0, 1)).toFixed(1)} ${C.toFixed(1)}"/>`}
    ${tick(D.settings.crit, 't-crit')}${tick(D.settings.target, 't-target')}
    <text x="100" y="90" class="g-val">${v == null ? '—' : fmt(v, 1) + '%'}</text><text x="100" y="110" class="g-lab">umidade do solo</text></svg>
    <div class="legend"><span><i style="background:var(--bad)"></i>limiar ${D.settings.crit}%</span><span><i style="background:var(--brand)"></i>alvo ${D.settings.target}%</span></div>`;
}
function line(pts, o = {}) {
  const { min = 0, max = 60, ref = null, crit = null, band = null, w = 320, h = 124, lx = ['−24 h', 'agora'], dec = 0 } = o;
  if (!pts || !pts.length) return '';
  const L = 34, R = 8, T = 8, Bm = 22, pw = w - L - R, ph = h - T - Bm, n = pts.length;
  const X = i => L + pw * i / Math.max(1, n - 1), Y = v => T + ph * (1 - (v - min) / (max - min));
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">`;
  [0, .5, 1].forEach(f => { const v = min + (max - min) * f, y = Y(v); s += `<line class="ax" x1="${L}" x2="${w - R}" y1="${y}" y2="${y}"/><text class="lbl" x="${L - 5}" y="${y + 3}" text-anchor="end">${fmt(v, dec)}</text>`; });
  if (band) s += `<rect class="band" x="${L}" y="${Y(band[1])}" width="${pw}" height="${Y(band[0]) - Y(band[1])}"/>`;
  if (ref != null) s += `<line class="ref" x1="${L}" x2="${w - R}" y1="${Y(ref)}" y2="${Y(ref)}"/>`;
  if (crit != null) s += `<line class="crit" x1="${L}" x2="${w - R}" y1="${Y(crit)}" y2="${Y(crit)}"/>`;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(clamp(v, min, max)).toFixed(1)}`).join(' ');
  s += `<path class="area" d="${d} L${X(n - 1).toFixed(1)} ${Y(min)} L${X(0).toFixed(1)} ${Y(min)}Z"/><path class="ln" d="${d}"/>`;
  s += `<text class="lbl" x="${L}" y="${h - 5}">${lx[0]}</text><text class="lbl" x="${w - R}" y="${h - 5}" text-anchor="end">${lx[1]}</text></svg>`;
  return s;
}
function ring(p) {
  const C = 2 * Math.PI * 60, f = p.pump.total ? clamp(p.pump.left / p.pump.total, 0, 1) : 0;
  return `<svg class="ring" viewBox="0 0 150 150" role="img" aria-label="Tempo restante"><circle class="bg" cx="75" cy="75" r="60"/><circle class="fg" data-ring="${p.id}" cx="75" cy="75" r="60" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}"/>
    <text class="big num" x="75" y="82" data-timer="${p.id}">${mmss(p.pump.left)}</text><text class="sm" x="75" y="104">restantes</text></svg>`;
}
const chip = (cls, txt, icon) => `<span class="chip ${cls}">${icon ? ic(icon, 'sm') : '<i class="dot"></i>'}${txt}</span>`;
const banners = () => {
  let s = '';
  if (D.net.gateway !== 'online') s += `<div class="banner bad">${ic('warn')}<div><b>Sem conexão com o gateway da fazenda</b>Os comandos estão desativados. Verifique se o celular está na rede da fazenda.</div></div>`;
  else if (!D.net.internet) s += `<div class="banner">${ic('info')}<div><b>Sem internet — operando na rede local</b>Leitura, alertas e comandos seguem normalmente. ${D.net.pending ? `${D.net.pending} registros aguardam envio.` : ''}</div></div>`;
  return s;
};
const topbar = (title, sub, right = '') => `<div class="topbar"><div class="t"><h1>${title}</h1>${sub ? `<div class="s">${sub}</div>` : ''}</div>${right}</div>`;
const bell = () => { const n = openAlerts().length; return `<button class="iconbtn" data-act="tab" data-tab="alerts" aria-label="Alertas">${ic('bell')}${n ? `<span class="badge">${n}</span>` : ''}</button>`; };

/* ---------- telas do fluxo inicial ---------- */
const splash = () => `<div class="splash"><div><img src="assets/logo-raiz.svg" alt=""><h1>Raiz</h1><p>Gestão da água na irrigação</p></div></div>`;
const connect = () => `<div class="flow"><img class="logo" src="assets/logo-raiz.svg" alt=""><h1>Conectar à fazenda</h1>
  <p class="lead">O Raiz funciona dentro da rede local da fazenda — não precisa de internet para operar.</p>
  <div class="small b mut" style="margin-bottom:8px">GATEWAYS ENCONTRADOS</div>
  ${UI.gwFound ? `<button class="gw" data-act="gw" data-id="gw1"><span class="item"><span class="ico">${ic('net')}</span></span><span class="grow"><div class="b">${esc(D.net.gatewayName)}</div><div class="small mut">${esc(D.net.ip)} · sinal forte</div></span>${ic('chev')}</button>`
    : `<div class="mut" style="padding:14px 4px"><span class="spin"></span>Procurando gateways Raiz na rede…${LIVE() ? '<div class="small" style="margin-top:6px">Nenhuma resposta ainda — confira se a Fazenda Digital está aberta.</div>' : ''}</div>`}
  <div style="flex:1"></div>
  <div class="btns"><button class="btn line" data-act="scan-qr">${ic('qr')} Ler QR code do gateway</button><button class="btn ghost" data-act="gw-code">Inserir código manualmente</button></div>
  <p class="small mut" style="text-align:center;margin-top:14px">Conecte o celular ao Wi-Fi da fazenda antes de continuar.</p></div>`;
const login = () => `<div class="flow"><img class="logo" src="assets/logo-raiz.svg" alt=""><h1>Entrar</h1><p class="lead">${esc(D.farm.name)} · ${esc(D.net.gatewayName)}</p>
  <div class="pindots" aria-label="PIN">${[0, 1, 2, 3].map(i => `<i class="${i < UI.pin.length ? 'on' : ''}"></i>`).join('')}</div>
  <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="pin" data-d="${n}" aria-label="${n}">${n}</button>`).join('')}
    <button class="n" data-act="bio" aria-label="Biometria">${D.settings.biometrics ? ic('bio', 'lg') : ''}</button><button data-act="pin" data-d="0" aria-label="0">0</button><button class="n" data-act="pin-del" aria-label="Apagar">${ic('back', 'lg')}</button></div>
  <p class="small mut" style="text-align:center;margin-top:22px">Informe o PIN de 4 dígitos do seu perfil.${MOCK() ? ' <b>(Exemplo: qualquer PIN entra.)</b>' : ''}${LIVE() && window.RAIZ_LIVE.devAuth ? ' <b>(Ambiente de teste: PIN ' + esc(window.RAIZ_LIVE.devPin) + '.)</b>' : ''}</p></div>`;

/* ---------- abas ---------- */
function home() {
  const open = openAlerts(), gw = D.net.gateway === 'online';
  const worst = !gw ? 'bad' : open.some(a => a.sev === 'bad') ? 'bad' : open.length ? 'warn' : '';
  const title = !gw ? 'Sem conexão com a fazenda' : open.length === 0 ? 'Tudo em ordem' : open.length === 1 ? '1 alerta aberto' : `${open.length} alertas abertos`;
  const sub = !gw ? 'Aproxime-se da rede local da fazenda.' : open.length ? 'Toque no sino para ver os detalhes.' : 'Sistema operando normalmente.';
  const rp = D.plots.find(p => p.rec && p.pump.state === 'off');
  let rec;
  if (rp && rp.rec.type === 'go') rec = `<div class="card"><div class="row"><span class="item" style="padding:0;min-height:0;width:auto"><span class="ico info">${ic('drop')}</span></span><div class="grow"><div class="small mut b">AÇÃO RECOMENDADA</div><div class="b" style="font-size:18px">Irrigar ${esc(rp.name)} por ${rp.rec.duration} min</div></div></div>
    <p class="small mut" style="margin:10px 0 14px">${esc(rp.rec.reason)}</p>
    <div class="btns two"><button class="btn ${canCmd() ? '' : 'off'}" data-act="open-start" data-plot="${rp.id}" data-min="${rp.rec.duration}">Revisar e ligar</button><button class="btn ghost" data-act="rec-refuse" data-plot="${rp.id}">Recusar</button></div></div>`;
  else if (rp) rec = `<div class="card"><div class="row"><span class="item" style="padding:0;min-height:0;width:auto"><span class="ico warn">${ic('rain')}</span></span><div class="grow"><div class="small mut b">RECOMENDAÇÃO</div><div class="b" style="font-size:18px">Aguardar chuva prevista</div></div></div><p class="small mut" style="margin-top:8px">${esc(rp.rec.reason)}</p></div>`;
  else rec = `<div class="card row"><span class="item" style="padding:0;min-height:0;width:auto"><span class="ico">${ic('check')}</span></span><div class="grow"><div class="b">Nenhuma irrigação necessária agora</div><div class="small mut">Os talhões com leitura estão dentro da faixa.</div></div></div>`;
  const plots = D.plots.map(p => {
    const s = moistState(p), v = p.moisture, max = 60;
    return `<button class="card plot" data-act="goto-plot" data-id="${p.id}"><div class="row"><div class="grow"><div class="b" style="font-size:17px">${esc(p.name)}</div><div class="small mut">${esc(p.crop)} · ${fmt(p.area, 1)} ha</div></div>${s.k === 'off' ? chip('', 'Sem leitura', 'warn') : chip(s.cls, s.txt)}</div>
      ${v == null ? `<p class="small mut" style="margin-top:10px">Última leitura ${esc(p.lastReading || '—')}.</p>` : `<div class="mbar ${s.cls}"><i style="width:${v / max * 100}%"></i><u style="left:${D.settings.crit / max * 100}%"></u><u class="t" style="left:${D.settings.target / max * 100}%"></u></div><div class="row small"><span class="b num">${fmt(v, 1)}%</span><span class="mut grow">umidade</span></div>`}
      <div class="chips" style="margin-top:10px">${p.pump.state === 'on' ? chip('info', `Bomba ligada · ${mmss(p.pump.left)}`, 'pump') : p.pump.state === 'locked' ? chip('bad', 'Bomba bloqueada', 'lock') : chip('', 'Bomba desligada', 'pump')}${p.pump.state === 'on' ? chip('', `${fmt(p.flow.now, 1)} m³/h`, 'flow') : ''}</div></button>`;
  }).join('');
  const al = open.slice(0, 2).map(a => alertItem(a)).join('');
  const w = D.weather;
  return `<div class="scroll">${topbar(esc(D.farm.name), esc(D.farm.city), bell())}
    <div class="hero ${worst}"><div class="small b" style="opacity:.85">${esc(D.farm.name).toUpperCase()}</div><h2>${title}</h2><p>${sub}</p>
      <div class="chips">${chip('', gw ? 'Gateway online' : 'Gateway offline')}${chip('', D.net.internet ? 'Internet' : 'Sem internet · modo local')}${D.net.pending ? chip('', `${D.net.pending} a enviar`) : ''}</div></div>
    ${banners()}${rec}
    <div class="sec"><h2>Talhões</h2></div>${plots}
    <div class="sec"><h2>Alertas abertos</h2>${open.length > 2 ? `<button data-act="tab" data-tab="alerts">Ver todos (${open.length})</button>` : ''}</div>
    ${open.length ? `<div class="list">${al}</div>` : `<div class="card row"><span class="item" style="padding:0;min-height:0;width:auto"><span class="ico">${ic('shield')}</span></span><div class="grow b">Nenhum alerta aberto</div></div>`}
    <div class="sec"><h2>Clima</h2></div>
    <div class="card"><div class="row" style="margin-bottom:12px"><span class="ico item" style="padding:0;width:auto;min-height:0"><span class="ico info" style="width:44px;height:44px">${ic('temp')}</span></span><div class="grow"><div class="b" style="font-size:22px">${w.temp == null ? '—' : fmt(w.temp) + '°C'}</div><div class="small mut">Chuva prevista: ${fmt(w.rainProb)}% (limite ${D.settings.rainLimit}%)</div></div></div>
      <div class="hours">${w.hourly.map(h => `<div><span class="mut">${h.h}</span><b>${fmt(h.t)}°</b><span class="p">${fmt(h.p)}%</span></div>`).join('')}</div></div>
    <div class="sec"><h2>Módulos</h2></div><div class="list">${D.modules.map(m => `<button class="item" data-act="${m.soon ? 'soon' : 'noop'}"><span class="ico ${m.on ? '' : 'off'}">${ic(m.id === 'water' ? 'drop' : m.id === 'flow' ? 'flow' : 'leaf')}</span><span class="grow"><div class="tt">${esc(m.name)}</div><div class="ss">${esc(m.desc)}</div></span>${m.soon ? chip('', 'Em breve') : chip('ok', 'Ativo')}</button>`).join('')}</div></div>`;
}

function pumpCard(p) {
  const st = p.pump.state, off = canCmd() ? '' : 'off';
  if (st === 'on') return `<div class="card">${ring(p)}<div class="chips" style="justify-content:center;margin:2px 0 14px">${chip('info', 'Irrigando', 'pump')}${chip('', `${fmt(p.flow.now, 1)} m³/h`, 'flow')}${chip('', `${fmt(p.pressure, 1)} bar`, 'gauge')}</div>
    <div class="btns"><button class="btn line ${off}" data-act="stop" data-plot="${p.id}">${ic('power')} Desligar bomba</button><button class="btn danger ${off}" data-act="emergency" data-plot="${p.id}">${ic('warn')} PARADA DE EMERGÊNCIA</button></div></div>`;
  if (st === 'locked') return `<div class="card"><div class="banner bad" style="margin:0 0 12px">${ic('lock')}<div><b>Bomba bloqueada</b>${esc(p.pump.reason || 'Aguardando inspeção e rearme.')}</div></div><button class="btn ${off}" data-act="rearm" data-plot="${p.id}">Rearmar após inspeção</button></div>`;
  if (st === 'nopower') return `<div class="card"><div class="banner bad" style="margin:0">${ic('power')}<div><b>Sem energia no controlador</b>O comando será liberado quando a energia voltar.</div></div></div>`;
  const rec = p.rec && p.rec.type === 'go' ? p.rec.duration : 30;
  return `<div class="card"><div class="row" style="margin-bottom:14px"><span class="item" style="padding:0;min-height:0;width:auto"><span class="ico off">${ic('pump')}</span></span><div class="grow"><div class="b">Bomba desligada</div><div class="small mut">Pronta para comando do operador</div></div></div>
    <button class="btn ${off}" data-act="open-start" data-plot="${p.id}" data-min="${rec}">${ic('pump')} Ligar bomba…</button>${canCmd() ? '' : '<p class="small mut" style="margin-top:10px">Comandos indisponíveis sem conexão com o gateway.</p>'}</div>`;
}
function irrig() {
  const p = plotOf(UI.plot) || D.plots[0];
  if (!p) return `<div class="scroll">${topbar('Irrigação', esc(D.farm.name), bell())}${banners()}<div class="card"><div class="b">Aguardando dados da fazenda</div><div class="small mut">Os talhões aparecem assim que o gateway enviar o primeiro estado.</div></div></div>`;
  const s = moistState(p);
  const runs = p.runs.map(r => `<div class="item"><span class="ico info">${ic('drop')}</span><span class="grow"><div class="tt">${esc(r.when)}</div><div class="ss">${esc(r.origin)}</div></span><span class="num b">${r.dur} min<div class="ss" style="text-align:right">${fmt(r.vol, 1)} m³</div></span></div>`).join('');
  return `<div class="scroll">${topbar('Irrigação', esc(D.farm.name), bell())}
    <div class="seg" role="tablist">${D.plots.map(x => `<button class="${x.id === p.id ? 'on' : ''}" data-act="plot" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
    ${banners()}
    <div class="card">${p.moisture == null ? `<div class="banner" style="margin:0">${ic('warn')}<div><b>Sensor sem comunicação</b>Última leitura ${esc(p.lastReading || '—')}. Verifique a bateria e o sinal do sensor.</div></div>` : gauge(p)}
      <div class="chips" style="justify-content:center;margin-top:12px">${s.k === 'off' ? chip('warn', 'Sem leitura', 'warn') : chip(s.cls, s.txt)}</div></div>
    ${p.rec && p.rec.type === 'go' && p.pump.state === 'off' ? `<div class="card"><div class="small b mut">RECOMENDAÇÃO</div><div class="b" style="font-size:18px;margin:2px 0 6px">Irrigar por ${p.rec.duration} min</div><p class="small mut">${esc(p.rec.reason)}</p></div>` : ''}
    <div class="grid3" style="margin-bottom:12px"><div class="kpi"><div class="l">${ic('flow', 'sm')} Vazão</div><div class="v num">${p.pump.state === 'on' ? fmt(p.flow.now, 1) : '—'}</div><div class="u">m³/h · ref. ${fmt(p.flow.ref, 1)}</div></div>
      <div class="kpi"><div class="l">${ic('gauge', 'sm')} Pressão</div><div class="v num">${p.pump.state === 'on' ? fmt(p.pressure, 1) : '—'}</div><div class="u">bar</div></div>
      <div class="kpi"><div class="l">${ic('pump', 'sm')} Bomba</div><div class="v" style="font-size:17px;padding-top:4px">${pumpTxt(p)}</div><div class="u">&nbsp;</div></div></div>
    ${pumpCard(p)}
    ${p.series && p.series.length ? `<div class="sec"><h2>Umidade nas últimas 24 h</h2></div><div class="card">${line(p.series, { ref: D.settings.target, crit: D.settings.crit })}</div>` : ''}
    <div class="sec"><h2>Irrigações recentes</h2></div><div class="list">${runs}</div></div>`;
}

function alertItem(a) {
  const pl = a.plot ? plotOf(a.plot) : null;
  return `<button class="item" data-act="alert" data-id="${a.id}"><span class="ico ${a.sev === 'info' ? 'info' : a.sev}">${ic(sevIcon(a.sev))}</span><span class="grow"><div class="tt">${esc(a.title)}</div><div class="ss">${esc(a.time)}${pl ? ' · ' + esc(pl.name) : ''}</div></span>${ic('chev')}</button>`;
}
function alertsScreen() {
  const nOpen = openAlerts().length, f = UI.filter;
  const list = D.alerts.filter(a => f === 'todos' || (f === 'abertos' ? a.state === 'aberto' : a.state !== 'aberto'));
  return `<div class="scroll">${topbar('Alertas', nOpen ? `${nOpen} aberto${nOpen > 1 ? 's' : ''}` : 'Nada pendente')}
    <div class="seg">${[['abertos', `Abertos (${nOpen})`], ['resolvidos', 'Resolvidos'], ['todos', 'Todos']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="list">${list.map(alertItem).join('')}</div>` : `<div class="card" style="text-align:center;padding:36px 16px"><span class="ico item" style="margin:0 auto 10px;padding:0;width:56px;height:56px;min-height:0;display:grid;place-items:center"><span class="ico" style="width:56px;height:56px">${ic('check', 'lg')}</span></span><div class="b">Nenhum alerta aqui</div><div class="small mut">Você será avisado se algo exigir atenção.</div></div>`}</div>`;
}

function topo() {
  const gw = D.net.gateway === 'online', net = D.net.internet, dv = t => D.devices.filter(d => d.type === t);
  const grp = ts => { const l = D.devices.filter(d => ts.includes(d.type)); return l.every(d => d.status === 'online') ? 'ok' : l.some(d => d.status === 'online') ? 'warn' : 'bad'; };
  const node = (x, y, w, t, cls) => `<rect class="n ${cls}" x="${x}" y="${y}" width="${w}" height="30" rx="9"/><text x="${x + w / 2}" y="${y + 19}">${t}</text>`;
  const e = (d, cls) => `<path class="e ${cls}" d="${d}"/>`;
  return `<svg class="topo" viewBox="0 0 340 152" role="img" aria-label="Topologia da rede da fazenda">
    ${e('M82 77H128', gw ? 'ok' : 'bad')}${e('M165 62V38', gw && net ? 'ok' : 'bad')}${e('M200 70C225 70 225 25 250 25', gw ? grp(['controller', 'flow']) === 'ok' ? 'ok' : '' : 'bad')}${e('M200 77H250', gw ? grp(['soil']) === 'ok' ? 'ok' : '' : 'bad')}${e('M200 84C225 84 225 127 250 127', gw ? grp(['weather']) === 'ok' ? 'ok' : '' : 'bad')}
    ${node(10, 62, 72, 'Celular', 'ok')}${node(128, 62, 74, 'Gateway', gw ? 'ok' : 'bad')}${node(128, 8, 74, 'Internet', net ? 'ok' : 'warn')}
    ${node(250, 10, 84, 'Controlador', grp(['controller', 'flow']))}${node(250, 62, 84, 'Sensores solo', grp(['soil']))}${node(250, 112, 84, 'Estação', grp(['weather']))}</svg>`;
}
const sig = (rssi, off) => { if (rssi == null || off) return ''; const n = rssi > -65 ? 4 : rssi > -75 ? 3 : rssi > -85 ? 2 : 1; return `<span class="sig ${n < 3 ? 'warn' : ''}">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`; };
function network() {
  const gw = D.net.gateway === 'online', n = D.net;
  const devs = D.devices.map(d => `<button class="item" data-act="device" data-id="${d.id}"><span class="ico ${d.status === 'online' ? '' : 'bad'}">${ic(devIcon(d.type))}</span><span class="grow"><div class="tt">${esc(d.name)}</div><div class="ss">${d.status === 'online' ? 'Online' : 'Sem comunicação'} · ${esc(d.seen)}${d.batt != null ? ` · ${ic('batt', 'sm')} ${d.batt}%` : ''}</div></span>${sig(d.rssi, d.status !== 'online')}${ic('chev')}</button>`).join('');
  return `<div class="scroll">${topbar('Rede da fazenda', esc(n.gatewayName) + ' · ' + esc(n.ip))}
    ${banners()}
    <div class="card">${topo()}<div class="chips" style="margin-top:10px">${chip(gw ? 'ok' : 'bad', gw ? 'Gateway online' : 'Gateway offline')}${chip(n.internet ? 'ok' : 'warn', n.internet ? 'Internet ativa' : 'Sem internet')}${chip('', esc(n.link))}</div></div>
    <div class="card"><div class="row"><div class="grow"><div class="b">Sincronização</div><div class="small mut">${n.internet ? `Última: ${esc(n.lastSync)}` : 'Aguardando a internet voltar'} · ${n.pending ? `${n.pending} registros pendentes` : 'nada pendente'}</div></div>
      <button class="btn sm ${n.internet && gw ? '' : 'off'}" data-act="sync">${ic('refresh', 'sm')} Sincronizar</button></div>
      <p class="small mut" style="margin-top:10px">O gateway guarda leituras e alertas localmente e envia à nuvem quando houver internet.</p></div>
    <div class="sec"><h2>Dispositivos (${D.devices.length})</h2></div><div class="list">${devs}</div></div>`;
}

const sw = (on, act, key) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" data-key="${key}"></button>`;
function more() {
  const u = D.user, s = D.settings;
  return `<div class="scroll">${topbar('Mais', '')}
    <div class="card row"><div class="item" style="padding:0;width:auto;min-height:0"><span class="ico" style="width:52px;height:52px;border-radius:50%;font-weight:800;font-size:18px">${esc(u.initials)}</span></div><div class="grow"><div class="b" style="font-size:18px">${esc(u.name)}</div><div class="small mut">${esc(D.farm.name)} · ${esc(D.farm.city)}</div></div>${chip(isGestor() ? 'info' : '', isGestor() ? 'Gestor' : 'Operador')}</div>
    <div class="sec"><h2>Irrigação</h2></div>
    <div class="list"><button class="item" data-act="thr"><span class="ico">${ic('sliders')}</span><span class="grow"><div class="tt">Limiares e regras</div><div class="ss">Limiar ${s.crit}% · alvo ${s.target}% · chuva ≥ ${s.rainLimit}% · tolerância ±${s.tolPct}%</div></span>${isGestor() ? ic('chev') : ic('lock')}</button></div>
    <div class="sec"><h2>Notificações</h2></div>
    <div class="list">${[['alerts', 'Alertas', 'Falhas de vazão, sensores e bomba'], ['recs', 'Recomendações', 'Quando irrigar'], ['sync', 'Sincronização', 'Resumo de envios à nuvem'], ['quiet', 'Não perturbar à noite', 'Silencia avisos de baixa prioridade']].map(([k, t, d]) => `<div class="item"><span class="grow"><div class="tt">${t}</div><div class="ss">${d}</div></span>${sw(s.notif[k], 'notif', k)}</div>`).join('')}</div>
    <div class="sec"><h2>Segurança e aparência</h2></div>
    <div class="list"><div class="item"><span class="ico">${ic('bio')}</span><span class="grow"><div class="tt">Entrar com biometria</div></span>${sw(s.biometrics, 'bioset', 'x')}</div>
      <div class="item" style="display:block"><div class="tt" style="margin-bottom:10px">Tema</div><div class="seg" style="padding:0">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button class="${UI.theme === k ? 'on' : ''}" data-act="theme" data-t="${k}">${l}</button>`).join('')}</div></div></div>
    <div class="sec"><h2>Sobre</h2></div>
    <div class="list"><button class="item" data-act="about"><span class="ico info">${ic('info')}</span><span class="grow"><div class="tt">Sobre o Raiz</div><div class="ss">Versão da interface 0.1.0</div></span>${ic('chev')}</button>
      <button class="item" data-act="support"><span class="ico info">${ic('phone')}</span><span class="grow"><div class="tt">Falar com o suporte</div></span>${ic('chev')}</button></div>
    <button class="btn line" data-act="logout" style="margin-top:6px">${ic('logout')} Sair</button>
    ${MOCK() ? '<p class="small mut" style="text-align:center;margin-top:16px">Interface em desenvolvimento · dados de exemplo</p>' : ''}</div>`;
}

const TABS = [['home', 'Início', 'home'], ['irrig', 'Irrigação', 'drop'], ['alerts', 'Alertas', 'bell'], ['net', 'Rede', 'net'], ['more', 'Mais', 'more']];
const tabbar = () => `<nav class="tabbar" aria-label="Navegação">${TABS.map(([k, l, i]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" ${UI.tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${k === 'alerts' && openAlerts().length ? `<span class="tb">${openAlerts().length}</span>` : ''}</button>`).join('')}</nav>`;

/* ---------- sheets ---------- */
const SHEETS = {
  start() {
    const p = plotOf(UI.start.plot), max = D.settings.maxRun, m = UI.start.min, vol = p.flow.ref * m / 60;
    return `<h3>Ligar bomba</h3><p class="mut">${esc(p.name)} · ${esc(p.crop)}</p>
      <div class="stepper"><button data-act="dur" data-d="-5" aria-label="Menos 5 minutos">${ic('minus', 'lg')}</button><div class="v num">${m}<span class="u">minutos</span></div><button data-act="dur" data-d="5" aria-label="Mais 5 minutos">${ic('plus', 'lg')}</button></div>
      <div class="card flat"><div class="row small"><span class="grow mut">Volume estimado</span><b class="num">≈ ${fmt(vol, 1)} m³</b></div><div class="row small" style="margin-top:6px"><span class="grow mut">Limite de funcionamento contínuo</span><b>${max} min</b></div></div>
      <div class="banner info" style="margin-top:12px">${ic('shield')}<div><b>Antes de ligar</b>Confirme que a área está livre e que não há manutenção em andamento. A parada de emergência fica sempre disponível.</div></div>
      <div class="btns" style="margin-top:6px"><button class="btn hold" data-done="start-confirm" aria-label="Segure para ligar">${ic('pump')} Segure para ligar <small>(1 s)</small></button><button class="btn ghost" data-act="sheet-close">Cancelar</button></div>`;
  },
  alert() {
    const a = D.alerts.find(x => x.id === UI.sheetArg); if (!a) return '';
    const pl = a.plot ? plotOf(a.plot) : null, open = a.state === 'aberto';
    return `<div class="chips" style="margin-bottom:8px">${chip(a.sev === 'info' ? 'info' : a.sev, a.sev === 'bad' ? 'Crítico' : a.sev === 'warn' ? 'Atenção' : 'Informativo')}${chip('', open ? 'Aberto' : 'Resolvido')}</div>
      <h3>${esc(a.title)}</h3><p class="small mut">${esc(a.time)}${pl ? ' · ' + esc(pl.name) : ''}</p><p style="margin:12px 0">${esc(a.msg)}</p>
      ${a.series ? `<div class="card flat" style="padding:10px">${line(a.series, { min: 0, max: 30, ref: a.ref, band: [a.ref * (1 - D.settings.tolPct / 100), a.ref * (1 + D.settings.tolPct / 100)], lx: ['início da irrigação', 'fim'], dec: 0 })}<div class="legend"><span><i style="background:var(--brand)"></i>referência ${fmt(a.ref, 1)} m³/h (±${D.settings.tolPct}%)</span></div></div>
      <div class="grid3" style="margin:12px 0"><div class="kpi"><div class="l">Vazão</div><div class="v num">${fmt(a.q, 1)}</div><div class="u">m³/h</div></div><div class="kpi"><div class="l">Referência</div><div class="v num">${fmt(a.ref, 1)}</div><div class="u">m³/h</div></div><div class="kpi"><div class="l">Pressão</div><div class="v num">${fmt(a.p, 1)}</div><div class="u">bar</div></div></div>
      <div class="small b mut" style="margin-bottom:6px">VERIFICAÇÕES SUGERIDAS</div><ul class="small" style="margin:0 0 14px;padding-left:18px"><li>Filtros e válvulas da linha</li><li>Pontos de emissão e conexões</li><li>Compare com a pressão e o horário</li></ul>` : ''}
      ${open ? `<div class="btns"><button class="btn" data-act="alert-confirm" data-id="${a.id}">${ic('check')} Confirmar após inspeção</button><button class="btn line" data-act="alert-call" data-id="${a.id}">${ic('phone')} Chamar manutenção</button><button class="btn ghost" data-act="alert-discard" data-id="${a.id}">Descartar como falso alerta</button></div>` : `<button class="btn ghost" data-act="sheet-close">Fechar</button>`}`;
  },
  device() {
    const d = D.devices.find(x => x.id === UI.sheetArg); if (!d) return '';
    const row = (k, v) => v == null ? '' : `<div class="item" style="padding:12px 0;min-height:0"><span class="grow mut">${k}</span><b>${v}</b></div>`;
    return `<div class="row" style="margin-bottom:10px"><span class="item" style="padding:0;width:auto;min-height:0"><span class="ico ${d.status === 'online' ? '' : 'bad'}" style="width:48px;height:48px">${ic(devIcon(d.type), 'lg')}</span></span><div class="grow"><h3 style="margin:0">${esc(d.name)}</h3>${chip(d.status === 'online' ? 'ok' : 'bad', d.status === 'online' ? 'Online' : 'Sem comunicação')}</div></div>
      <div>${row('Última comunicação', esc(d.seen))}${row('Conexão', esc(d.link))}${row('Sinal', d.rssi != null ? `${d.rssi} dBm` : null)}${row('Bateria', d.batt != null ? `${d.batt}%` : null)}${row('Talhão', d.plot && plotOf(d.plot) ? esc(plotOf(d.plot).name) : null)}${row('Firmware', esc(d.fw))}</div>
      ${d.batt != null && d.batt <= 15 ? `<div class="banner" style="margin-top:8px">${ic('batt')}<div><b>Bateria baixa</b>Troque ou recarregue em breve.</div></div>` : ''}
      <div class="btns" style="margin-top:12px"><button class="btn line ${d.status === 'online' && canCmd() ? '' : 'off'}" data-act="dev-restart" data-id="${d.id}">${ic('refresh')} Reiniciar dispositivo</button><button class="btn ghost" data-act="sheet-close">Fechar</button></div>`;
  },
  thr() {
    const s = D.settings;
    if (!isGestor()) return `<h3>Limiares e regras</h3><div class="banner info" style="margin-top:10px">${ic('lock')}<div><b>Somente gestores</b>Peça ao gestor da fazenda para alterar estes valores.</div></div><button class="btn ghost" data-act="sheet-close">Entendi</button>`;
    const f = (k, l, mn, mx, st, u) => `<div class="field"><div class="top"><span>${l}</span><span data-lab="${k}">${s[k]}${u}</span></div><input type="range" min="${mn}" max="${mx}" step="${st}" value="${s[k]}" data-set="${k}" data-u="${u}"></div>`;
    return `<h3>Limiares e regras</h3><p class="small mut">Valores iniciais sugeridos — calibre com a propriedade.</p>
      ${f('crit', 'Limiar crítico de umidade', 15, 45, 1, '%')}${f('target', 'Umidade-alvo da irrigação', 30, 55, 1, '%')}${f('rainLimit', 'Não irrigar se a chuva prevista ≥', 20, 100, 5, '%')}${f('tolPct', 'Tolerância da vazão', 5, 50, 1, '%')}${f('persist', 'Leituras seguidas para alertar', 1, 10, 1, '')}${f('maxRun', 'Tempo máximo contínuo da bomba', 10, 120, 5, ' min')}
      <div class="btns" style="margin-top:8px"><button class="btn" data-act="thr-save">Salvar</button><button class="btn ghost" data-act="sheet-close">Cancelar</button></div>`;
  },
  about() {
    return `<h3>Raiz</h3><p class="mut">Gestão da água na irrigação</p><div class="card flat" style="margin-top:12px"><div class="row small"><span class="grow mut">Versão da interface</span><b>0.1.0</b></div><div class="row small" style="margin-top:6px"><span class="grow mut">Gateway</span><b>${esc(D.net.gatewayName)}</b></div></div>
      <p class="small mut" style="margin:12px 0">Indicadores de pH, condutividade e turbidez, quando disponíveis, servem apenas como triagem e não atestam potabilidade. O comando de bomba exige instalação por profissional habilitado.</p>
      <button class="btn ghost" data-act="sheet-close">Fechar</button>`;
  }
};
function openSheet(kind, arg) {
  UI.sheet = kind; UI.sheetArg = arg;
  const r = $('#sheetRoot'); r.innerHTML = `<div class="backdrop" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${SHEETS[kind]()}</div>`;
  requestAnimationFrame(() => { r.querySelector('.backdrop').classList.add('on'); r.querySelector('.sheet').classList.add('on'); });
}
function refreshSheet() { const s = $('.sheet'); if (s && UI.sheet) s.innerHTML = `<div class="grab"></div>${SHEETS[UI.sheet]()}`; }
function closeSheet() {
  const r = $('#sheetRoot'), s = r.querySelector('.sheet'); if (!s) return;
  r.querySelector('.backdrop').classList.remove('on'); s.classList.remove('on'); UI.sheet = null; setTimeout(() => { if (!UI.sheet) r.innerHTML = ''; }, 260);
}

/* ---------- toast, tema, render ---------- */
function toast(msg, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3600); }
function applyTheme() { const t = UI.theme === 'auto' ? '' : UI.theme; if (document.documentElement.dataset.theme !== t) document.documentElement.dataset.theme = t; }
function render() {
  const app = $('#app'), sc = $('.scroll'), st = sc ? sc.scrollTop : 0, key = UI.stage + UI.tab + (UI.tab === 'irrig' ? UI.plot : '');
  let html;
  if (UI.stage === 'splash') html = splash(); else if (UI.stage === 'connect') html = connect(); else if (UI.stage === 'login') html = login();
  else html = ({ home, irrig, alerts: alertsScreen, net: network, more }[UI.tab] || home)() + tabbar();
  app.innerHTML = html;
  const s2 = $('.scroll'); if (s2 && key === lastKey) s2.scrollTop = st; lastKey = key;
  document.body.classList.toggle('frame', params.has('frame')); document.body.classList.toggle('embed', params.has('embed'));
  applyTheme(); renderPreview();
  if (UI.stage === 'splash' && !UI._sp) { UI._sp = setTimeout(() => { UI._sp = null; if (UI.stage === 'splash') { UI.stage = 'connect'; render(); } }, 1400); }
  if (UI.stage === 'connect' && !UI.gwFound && !UI._gw) { UI._gw = setTimeout(() => { UI._gw = null; UI.gwFound = !LIVE() || !!window.RAIZ_LIVE.connected; if (UI.stage === 'connect') render(); }, LIVE() ? 900 : 1600); }
}
const go = tab => { UI.tab = tab; UI.stage = 'app'; render(); };

/* ---------- ações ---------- */
function doAct(act, el) {
  const d = el ? el.dataset : {};
  const P = d.plot ? plotOf(d.plot) : null;
  switch (act) {
    case 'tab': go(d.tab); break;
    case 'plot': UI.plot = d.id; render(); break;
    case 'goto-plot': UI.plot = d.id; go('irrig'); break;
    case 'filter': UI.filter = d.f; render(); break;
    case 'noop': break;
    case 'soon': toast('Disponível em uma versão futura'); break;
    case 'gw': B.emit('gateway.select', { id: d.id }); UI.stage = 'login'; UI.pin = ''; render(); break;
    case 'gw-code': B.emit('gateway.code'); toast('O app nativo abrirá a entrada do código'); break;
    case 'scan-qr': B.emit('qr.scan'); toast('O app nativo abrirá a câmera'); break;
    case 'pin': if (UI.pin.length < 4) { UI.pin += d.d; render(); if (UI.pin.length === 4) { B.emit('auth.pin', { pin: UI.pin }); setTimeout(() => { if (MOCK()) { UI.stage = 'app'; UI.pin = ''; toast('Bem-vindo (modo de exemplo)'); render(); } }, 250); } } break;
    case 'pin-del': UI.pin = UI.pin.slice(0, -1); render(); break;
    case 'bio': if (D.settings.biometrics) { B.emit('auth.biometric'); if (MOCK()) { UI.stage = 'app'; render(); } } break;
    case 'logout': B.emit('logout'); UI.stage = 'login'; UI.pin = ''; render(); break;
    case 'theme': UI.theme = d.t; try { localStorage.setItem('raiz-theme', d.t); } catch (e) { } B.emit('settings.update', { theme: d.t }); render(); break;
    case 'notif': D.settings.notif[d.key] = !D.settings.notif[d.key]; if (d.key === 'alerts' && D.settings.notif.alerts && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { } } B.emit('settings.update', { notif: D.settings.notif }); render(); break;
    case 'bioset': D.settings.biometrics = !D.settings.biometrics; B.emit('settings.update', { biometrics: D.settings.biometrics }); render(); break;
    case 'thr': openSheet('thr'); break;
    case 'thr-save': B.emit('settings.update', { rules: D.settings }); closeSheet(); cmdToast('Regras salvas'); render(); break;
    case 'about': openSheet('about'); break;
    case 'support': B.emit('support.open'); toast('O app nativo abrirá o suporte'); break;
    case 'device': openSheet('device', d.id); break;
    case 'dev-restart': B.emit('device.restart', { id: d.id }); closeSheet(); cmdToast('Comando de reinício enviado'); break;
    case 'alert': openSheet('alert', d.id); break;
    case 'alert-confirm': case 'alert-discard': {
      const a = D.alerts.find(x => x.id === d.id), ok = act === 'alert-confirm';
      B.emit(ok ? 'alert.confirm' : 'alert.discard', { id: d.id }); if (MOCK() && a) a.state = 'resolvido';
      closeSheet(); cmdToast(ok ? 'Alerta confirmado' : 'Alerta descartado'); render(); break; }
    case 'alert-call': B.emit('alert.maintenance', { id: d.id }); cmdToast('Solicitação de manutenção enviada'); break;
    case 'rec-refuse': B.emit('recommendation.refuse', { plot: d.plot }); if (MOCK() && P) P.rec = null; cmdToast('Recomendação recusada por 30 min'); render(); break;
    case 'open-start': if (!canCmd()) { toast('Sem conexão com o gateway', 'bad'); break; } UI.start = { plot: d.plot, min: clamp(+d.min || 30, 5, D.settings.maxRun) }; openSheet('start'); break;
    case 'dur': UI.start.min = clamp(UI.start.min + +d.d, 5, D.settings.maxRun); refreshSheet(); break;
    case 'start-confirm': {
      const p = plotOf(UI.start.plot); B.emit('pump.start', { plot: p.id, minutes: UI.start.min });
      if (MOCK()) { p.pump = { state: 'on', left: UI.start.min * 60, total: UI.start.min * 60 }; p.flow.now = p.flow.ref; p.pressure = 2.4; p.rec = null; }
      closeSheet(); cmdToast(`Bomba ligada por ${UI.start.min} min`); render(); break; }
    case 'stop': B.emit('pump.stop', { plot: d.plot }); if (MOCK() && P) { P.pump = { state: 'off', left: 0, total: 0 }; P.flow.now = 0; P.pressure = 0; } cmdToast('Bomba desligada'); render(); break;
    case 'emergency': B.emit('pump.emergency', { plot: d.plot }); if (MOCK() && P) { P.pump = { state: 'locked', left: 0, total: 0, reason: 'Parada de emergência acionada.' }; P.flow.now = 0; P.pressure = 0; } cmdToast('Parada de emergência acionada', 'bad'); render(); break;
    case 'rearm': B.emit('pump.rearm', { plot: d.plot }); if (MOCK() && P) P.pump = { state: 'off', left: 0, total: 0 }; cmdToast('Bomba rearmada'); render(); break;
    case 'sync': B.emit('sync.now'); if (MOCK()) { D.net.pending = 0; D.net.lastSync = 'agora'; } cmdToast('Sincronização solicitada'); render(); break;
    case 'sheet-close': closeSheet(); break;
  }
}
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.classList.contains('hold')) return; doAct(el.dataset.act, el); });
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  D.settings[k] = parseFloat(e.target.value); const lab = $(`[data-lab="${k}"]`); if (lab) lab.textContent = D.settings[k] + (e.target.dataset.u || '');
});
/* segurar para confirmar */
function startHold(h) {
  endHold(); const t0 = performance.now(), dur = +h.dataset.ms || 1000; hold = { h, raf: 0 };
  const tick = () => { if (!hold) return; const p = Math.min(1, (performance.now() - t0) / dur); h.style.setProperty('--p', p);
    if (p >= 1) { const a = h.dataset.done; endHold(); try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { } if (a) doAct(a, h); } };
  hold.raf = setInterval(tick, 30); tick();
}
function endHold() { if (hold) { clearInterval(hold.raf); hold.h.style.setProperty('--p', 0); hold = null; } }
document.addEventListener('pointerdown', e => { const h = e.target.closest('.hold'); if (h && !h.classList.contains('off')) startHold(h); });
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, endHold, true));
document.addEventListener('contextmenu', e => { if (e.target.closest('.hold')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* atualiza só o contador e o anel (sem redesenhar a tela) — usado com dados ao vivo */
function refreshTimers() {
  D.plots.forEach(p => {
    if (p.pump.state !== 'on') return;
    const t = $(`[data-timer="${p.id}"]`); if (t) t.textContent = mmss(p.pump.left);
    const r = $(`[data-ring="${p.id}"]`); if (r && p.pump.total) { const C = 2 * Math.PI * 60; r.setAttribute('stroke-dasharray', `${(C * clamp(p.pump.left / p.pump.total, 0, 1)).toFixed(1)} ${C.toFixed(1)}`); }
  });
}

/* contagem regressiva da bomba (apenas modo exemplo; ao vivo a verdade vem do controlador) */
setInterval(() => {
  if (!MOCK() || UI.stage !== 'app') return;
  let done = false;
  D.plots.forEach(p => {
    if (p.pump.state !== 'on') return;
    p.pump.left = Math.max(0, p.pump.left - 1);
    if (p.pump.left <= 0) { p.pump = { state: 'off', left: 0, total: 0 }; p.flow.now = 0; p.pressure = 0; done = true; return; }
    const t = $(`[data-timer="${p.id}"]`); if (t) t.textContent = mmss(p.pump.left);
    const r = $(`[data-ring="${p.id}"]`); if (r) { const C = 2 * Math.PI * 60; r.setAttribute('stroke-dasharray', `${(C * p.pump.left / p.pump.total).toFixed(1)} ${C.toFixed(1)}`); }
  });
  if (done) { toast('Irrigação concluída'); render(); }
}, 1000);

/* ---------- painel de pré-visualização (?preview) ---------- */
function renderPreview() {
  const pv = $('#pv'); if (!UI.preview) return;
  let btn = $('#pvbtn'); if (!btn) { btn = document.createElement('button'); btn.id = 'pvbtn'; btn.className = 'pvbtn'; btn.setAttribute('aria-label', 'Pré-visualização'); btn.innerHTML = ic('sliders'); btn.onclick = () => { UI.pvOpen = !UI.pvOpen; renderPreview(); }; document.body.appendChild(btn); }
  pv.hidden = !UI.pvOpen; if (!UI.pvOpen) return;
  const g = (name, items) => `<h4>${name}</h4><div class="g">${items.map(([k, l, on]) => `<button class="${on ? 'on' : ''}" data-pv="${k}">${l}</button>`).join('')}</div>`;
  const p1 = plotOf('t1');
  pv.innerHTML = g('Tela', [['s:splash', 'Splash', UI.stage === 'splash'], ['s:connect', 'Conectar', UI.stage === 'connect'], ['s:login', 'Login', UI.stage === 'login'], ['s:app', 'App', UI.stage === 'app']])
    + (LIVE() ? '' : g('Rede', [['inet', D.net.internet ? 'Internet: on' : 'Internet: off', D.net.internet], ['gw', D.net.gateway === 'online' ? 'Gateway: on' : 'Gateway: off', D.net.gateway === 'online']])
    + g('Dados', [['alerts', openAlerts().length ? 'Alertas abertos' : 'Sem alertas', openAlerts().length > 0], ['pump', p1.pump.state === 'on' ? 'Bomba T1: ligada' : 'Bomba T1: desligada', p1.pump.state === 'on'], ['lock', 'Bloquear bomba T1', p1.pump.state === 'locked'], ['role', isGestor() ? 'Perfil: gestor' : 'Perfil: operador', isGestor()]])
    ) + g('Aparência', [['t:auto', 'Auto', UI.theme === 'auto'], ['t:light', 'Claro', UI.theme === 'light'], ['t:dark', 'Escuro', UI.theme === 'dark'], ['frame', 'Moldura de celular', params.has('frame')]])
    + `<h4>Eventos enviados ao app nativo</h4><pre>${B.sent.map(esc).join('\n') || '(nenhum ainda)'}</pre>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pv]'); if (!b) return; const k = b.dataset.pv;
  if (k.startsWith('s:')) { UI.stage = k.slice(2); UI.pin = ''; UI.gwFound = false; }
  else if (k.startsWith('t:')) { UI.theme = k.slice(2); }
  else if (k === 'inet') { D.net.internet = !D.net.internet; D.net.pending = D.net.internet ? 0 : 14; }
  else if (k === 'gw') D.net.gateway = D.net.gateway === 'online' ? 'offline' : 'online';
  else if (k === 'alerts') { const on = openAlerts().length > 0; D.alerts.filter(a => a.id === 'a1' || a.id === 'a2').forEach(a => { a.state = on ? 'resolvido' : 'aberto'; }); }
  else if (k === 'pump') { const p = plotOf('t1'); p.pump = p.pump.state === 'on' ? { state: 'off', left: 0, total: 0 } : { state: 'on', left: 1500, total: 1800 }; p.flow.now = p.pump.state === 'on' ? 25 : 0; p.pressure = p.pump.state === 'on' ? 2.4 : 0; p.rec = p.pump.state === 'on' ? null : p.rec; }
  else if (k === 'lock') { const p = plotOf('t1'); p.pump = p.pump.state === 'locked' ? { state: 'off', left: 0, total: 0 } : { state: 'locked', left: 0, total: 0, reason: 'Funcionamento a seco detectado.' }; }
  else if (k === 'role') D.user.role = isGestor() ? 'operador' : 'gestor';
  else if (k === 'frame') { const u = new URL(location.href); u.searchParams.has('frame') ? u.searchParams.delete('frame') : u.searchParams.set('frame', '1'); location.href = u.toString(); return; }
  render();
});
window.RaizUI = { onEmit() { if (UI.preview && UI.pvOpen) renderPreview(); } };

/* ---------- API para o app nativo ---------- */
function merge(t, s) { Object.keys(s || {}).forEach(k => { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') merge(t[k], s[k]); else t[k] = s[k]; }); return t; }
window.Raiz = {
  version: '0.1.0',
  getState: () => D,
  setState(patch) { merge(D, patch); render(); refreshSheet(); },
  go,
  /* redesenha sem atrapalhar uma interação em curso (segurar para ligar, ajuste de limiares) */
  refresh() { render(); if (UI.sheet && UI.sheet !== 'start' && UI.sheet !== 'thr' && !hold) refreshSheet(); },
  refreshTimers,
  receive(m) {
    if (!m || !m.type) return;
    if (m.type === 'gateway.found') { UI.gwFound = true; if (UI.stage === 'connect') render(); return; }
    if (m.type === 'state') this.setState(m.payload);
    else if (m.type === 'toast') toast(m.payload.text, m.payload.kind);
    else if (m.type === 'navigate') go(m.payload.tab);
    else if (m.type === 'alert.new') { D.alerts.unshift(m.payload); render(); if (m.payload.state !== 'resolvido') toast(m.payload.title, 'bad'); }
    else if (m.type === 'auth.ok') { UI.stage = 'app'; render(); }
    else if (m.type === 'auth.fail') { UI.pin = ''; render(); toast('PIN incorreto', 'bad'); }
  }
};

render();
})();
