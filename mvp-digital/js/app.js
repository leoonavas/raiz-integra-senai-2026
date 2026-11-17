/* Raiz — MVP digital (simulador). Todos os dados são simulados. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const KEY = 'raiz-mvp-v1';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const n = (x, d = 1) => Number(x).toFixed(d).replace('.', ',');
const pad = v => String(v).padStart(2, '0');

const DEF = { crit: 30, target: 42, rainLimit: 60, devPct: 20, persist: 3, interval: 5, nominal: 6, maxRun: 60, temp: 28, rainProb: 20 };
const GAIN = 0.35;                                   // % de umidade por minuto, na vazão nominal
const FM = { none: 1, clog: 0.62, leak: 1.35, dry: 0.02 };   // multiplicador da vazão
const SG = { none: 1, clog: 0.62, leak: 0.7, dry: 0 };       // fração que chega ao solo
const PB = { none: 2.0, clog: 2.9, leak: 1.3, dry: 0.2 };    // pressão (bar)
const FNAME = { none: 'Normal', clog: 'Entupimento', leak: 'Vazamento', dry: 'Bomba a seco' };

let cfg = { ...DEF };
const S = {
  tick: 0, M: 44, Q: 0, P: 0, pump: false, pumpLeft: 0, runMin: 0,
  fault: 'none', manifest: null, detected: false,
  raining: false, rainLeft: 0, online: true, offlineSince: null, lastSync: null,
  baseline: 6, calibrating: false, cal: [], devCount: 0, dryCount: 0,
  alert: null, lock: null, rec: null, recKey: '', snooze: 0,
  speed: 5, running: true, demo: null,
  log: [], remote: [], nextId: 1, dirtyLog: true,
  hist: { M: [], Q: [], on: [] },
  power: true, powerBackAt: null, netBackAt: null, repairAt: null, cool: 0, glitchNext: false, tBase: null, vopWait: 0, vopRearm: 0, bk: null
};
const ENV = { prod: false, k: 1, seed: 20261117, vop: false };   // modo Operação (eventos aleatórios)
function mk(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mk(ENV.seed), saveN = 0;
const ST = {
  injected: { clog: 0, leak: 0, dry: 0 }, detected: { clog: 0, leak: 0, dry: 0 }, delays: [],
  falseAlerts: 0, confirmed: 0, discarded: 0, dec: { accept: 0, adjust: 0, refuse: 0 },
  offlineReadings: 0, offlineCmd: false, synced: false, readings: 0, expected: 0, t4: false,
  env: { rain: 0, net: 0, power: 0, clog: 0, leak: 0, dry: 0, glitch: 0, repairs: 0 }
};
let view = 'painel', timer = null;

/* ---------- persistência ---------- */
let noSave = false;
function save() {
  if (noSave) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cfg, tick: S.tick, M: S.M, baseline: S.baseline, nextId: S.nextId, lastSync: S.lastSync,
      log: S.log.slice(-800), remote: S.remote.slice(-400), ST, ENV
    }));
  } catch (e) { /* armazenamento indisponível: segue sem salvar */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d) return;
    cfg = { ...DEF, ...d.cfg }; S.tick = d.tick || 0; S.M = d.M ?? 44; S.baseline = d.baseline || cfg.nominal;
    S.nextId = d.nextId || 1; S.lastSync = d.lastSync ?? null; S.log = d.log || []; S.remote = d.remote || [];
    Object.assign(ST, d.ST || {});
    ST.injected = { clog: 0, leak: 0, dry: 0, ...(d.ST && d.ST.injected) };
    ST.detected = { clog: 0, leak: 0, dry: 0, ...(d.ST && d.ST.detected) };
    ST.dec = { accept: 0, adjust: 0, refuse: 0, ...(d.ST && d.ST.dec) };
    ST.env = { rain: 0, net: 0, power: 0, clog: 0, leak: 0, dry: 0, glitch: 0, repairs: 0, ...(d.ST && d.ST.env) };
    Object.assign(ENV, d.ENV || {}); rng = mk(ENV.seed + S.tick);
  } catch (e) { /* ignora estado corrompido */ }
}

/* ---------- utilidades de tempo, log, toast ---------- */
function fmtT(t) { const m = 360 + t, d = Math.floor(m / 1440) + 1, mm = m % 1440; return `d${d} ${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`; }
function fmtClock(t) { const m = 360 + t, d = Math.floor(m / 1440) + 1, mm = m % 1440; return `Dia ${d} · ${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`; }
function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4200);
}
function log(type, msg, data) {
  const e = { id: S.nextId++, t: S.tick, type, msg, data: data || null, synced: false, off: !S.online };
  S.log.push(e); if (S.log.length > 1500) S.log.splice(0, S.log.length - 1500);
  S.dirtyLog = true; if (S.online) sync(); return e;
}
function sync() {
  const p = S.log.filter(e => !e.synced); if (!p.length) return 0;
  p.forEach(e => { e.synced = true; S.remote.push({ ...e, syncT: S.tick }); });
  if (S.remote.length > 600) S.remote.splice(0, S.remote.length - 600);
  S.lastSync = S.tick;
  const off = p.filter(e => e.off).length;
  if (off > 0) { ST.synced = true; toast(`Sincronizados ${off} registros guardados offline`); }
  return p.length;
}
const pending = () => S.log.filter(e => !e.synced).length;

function setOnline(v) {
  if (S.online === v) return; S.online = v;
  if (!v) { S.offlineSince = S.tick; log('conexão', 'Internet indisponível — operação local (leitura, registro, alerta e comando continuam)'); toast('Internet caiu: o controlador segue em modo local', 'warn'); }
  else { log('conexão', 'Internet restabelecida — enviando registros pendentes'); sync(); S.offlineSince = null; }
  updateNet();
}

/* ---------- ações do operador ---------- */
function startPump(min, origin) {
  if (!S.power) { toast('Sem energia: o controlador está desligado', 'warn'); return false; }
  if (S.lock) { toast('Bomba bloqueada: rearme após inspeção', 'warn'); return false; }
  if (S.pump) return false;
  min = clamp(Math.round(min) || 1, 1, cfg.maxRun);
  S.pump = true; S.pumpLeft = min; S.runMin = 0; S.dryCount = 0; S.devCount = 0;
  if (!S.online) ST.offlineCmd = true;
  log('comando', `Bomba LIGADA por ${min} min (${origin})`);
  return true;
}
function stopPump(reason) {
  if (!S.pump) return;
  S.pump = false; S.pumpLeft = 0; S.Q = 0; S.P = 0; S.devCount = 0; S.dryCount = 0;
  if (S.calibrating) { S.calibrating = false; S.cal = []; log('evento', 'Calibração interrompida'); }
  log('comando', `Bomba DESLIGADA (${reason})`);
}
function emergency() {
  stopPump('PARADA DE EMERGÊNCIA'); S.lock = { reason: 'Parada de emergência acionada' };
  log('alerta', 'Parada de emergência acionada pelo operador — bomba bloqueada'); render();
}
function rearm() { if (!S.lock) return; S.lock = null; log('comando', 'Bomba rearmada pelo operador após inspeção'); render(); }
function setFault(f, src) {
  if (f === S.fault) return; S.fault = f; S.manifest = null; S.detected = false;
  if (f !== 'none') { ST.injected[f]++; if (src) ST.env[f]++; log(src ? 'ambiente' : 'teste', (src ? 'Falha espontânea: ' : 'Falha simulada injetada: ') + FNAME[f]); }
  else log(src ? 'ambiente' : 'teste', src ? 'Falha corrigida pela manutenção — operação normal' : 'Falha simulada removida — bancada normal');
  render();
}
function startCal() {
  if (S.fault !== 'none') { toast('Normalize a bancada (sem falha) antes de calibrar', 'warn'); return; }
  if (S.lock) { toast('Bomba bloqueada: rearme antes', 'warn'); return; }
  if (!S.pump && !startPump(12, 'calibração da linha de base')) return;
  S.calibrating = true; S.cal = []; log('evento', 'Calibração da linha de base iniciada (8 leituras)'); render();
}
function decide(kind, label) { ST.dec[kind]++; log('decisão', label); }
function ackAlert(confirm) {
  const a = S.alert; if (!a) return;
  if (confirm) {
    ST.confirmed++; log('decisão', `Alerta confirmado por inspeção local: ${a.title}`);
    if (ENV.prod && S.fault !== 'none' && S.repairAt == null) { if (S.pump) stopPump('inspeção confirmou a falha'); S.repairAt = S.tick + 8; log('ambiente', 'Manutenção acionada — reparo previsto em ~8 min'); }
  } else { ST.discarded++; log('decisão', `Alerta descartado pelo operador: ${a.title}${a.truth ? ' (havia falha simulada)' : ' (falso alerta)'}`); }
  S.cool = S.tick + 15; S.alert = null; render();
}

/* ---------- motor da simulação ---------- */
/* ---------- modo Operação: eventos aleatórios (semente reprodutível) ---------- */
function amb(msg) { log('ambiente', msg); }
function envStep() {
  if (!ENV.prod) return;
  const k = ENV.k, r = rng;
  // clima: ciclo diário de temperatura e previsão de chuva que varia
  const hh = ((360 + S.tick) % 1440) / 60;
  if (S.tBase == null || S.tick % 1440 === 1) S.tBase = 21 + r() * 9;
  cfg.temp = Math.round(S.tBase + 6 * Math.sin((hh - 9) / 24 * 2 * Math.PI));
  if (S.tick % 30 === 0) cfg.rainProb = clamp(Math.round(cfg.rainProb * 0.9 + 3 + (r() - 0.5) * 40), 0, 100);   // tende a ~30%
  if (!S.raining && r() < (cfg.rainProb / 100) * 0.0009 * k) { S.raining = true; S.rainLeft = 20 + Math.floor(r() * 70); ST.env.rain++; amb(`Chuva iniciou (previsão ${cfg.rainProb}%, duração ~${S.rainLeft} min)`); }
  // internet
  if (S.online && r() < 0.0015 * k) { S.netBackAt = S.tick + 15 + Math.floor(r() * 105); ST.env.net++; setOnline(false); }
  else if (!S.online && S.netBackAt != null && S.tick >= S.netBackAt) { S.netBackAt = null; setOnline(true); }
  // energia
  if (S.power && r() < 0.0007 * k) { S.power = false; S.powerBackAt = S.tick + 10 + Math.floor(r() * 30); ST.env.power++; if (S.pump) stopPump('queda de energia'); amb(`Queda de energia (~${S.powerBackAt - S.tick} min): sem leitura, registro nem comando`); }
  else if (!S.power && S.tick >= S.powerBackAt) { S.power = true; amb('Energia restabelecida — controlador reiniciou e retomou o registro'); }
  // falhas espontâneas (latentes com a bomba parada; se manifestam ao ligar) e reparo
  if (S.fault === 'none' && S.power) {
    const pk = (S.pump ? 1 : 0.15) * k, x = r();
    if (x < 0.006 * pk) setFault('clog', 'amb'); else if (x < 0.010 * pk) setFault('leak', 'amb'); else if (x < 0.013 * pk) setFault('dry', 'amb');
  }
  if (S.pump && r() < 0.01 * k) S.glitchNext = true;
  if (S.repairAt != null && S.tick >= S.repairAt) { S.repairAt = null; ST.env.repairs++; setFault('none', 'amb'); }
}
function vop() {   // operador virtual (opcional), para a simulação rodar sem ninguém na tela
  if (!ENV.vop) return;
  if (S.alert && S.tick - S.alert.tick >= 2) { ackAlert(S.alert.truth); return; }
  if (S.lock && S.fault === 'none' && !S.alert && S.repairAt == null) { if (++S.vopRearm >= 3) { S.vopRearm = 0; rearm(); } } else S.vopRearm = 0;
  if (S.rec && S.rec.type === 'go' && S.power && !S.lock && !S.pump) {
    if (++S.vopWait >= 3) { S.vopWait = 0; const d = S.rec.dur; if (startPump(d, 'operador virtual (simulado)')) decide('accept', `Recomendação aceita pelo operador virtual: ${d} min`); }
  } else S.vopWait = 0;
}
function setMode(m) {
  const prod = m === 'prod'; if (ENV.prod === prod) return; ENV.prod = prod;
  if (prod) {
    S.bk = { temp: cfg.temp, rain: cfg.rainProb }; endDemo(false); setFault('none'); if (!S.online) setOnline(true); S.alert = null; S.tBase = null;
    log('evento', `Modo Operação ativado — eventos aleatórios (semente ${ENV.seed})`); toast('Modo Operação: os eventos agora acontecem sozinhos');
  } else {
    if (S.bk) { cfg.temp = S.bk.temp; cfg.rainProb = S.bk.rain; } S.power = true; S.repairAt = null; S.netBackAt = null; if (!S.online) setOnline(true);
    log('evento', 'Modo Demonstração ativado'); toast('Modo Demonstração: você injeta os eventos');
  }
  rng = mk(ENV.seed + S.tick); save(); render();
}

function step() {
  S.tick++;
  envStep();
  let dM = -Math.max(0.004, 0.012 + 0.0012 * (cfg.temp - 15));
  if (S.raining) { dM += 0.25; if (--S.rainLeft <= 0) { S.raining = false; log('evento', 'Chuva simulada terminou'); } }
  let Q = 0, P = 0;
  if (S.pump) {
    if (S.fault !== 'none' && S.manifest == null) S.manifest = S.tick;
    const noise = () => 1 + (Math.random() - 0.5) * 0.04;
    Q = cfg.nominal * FM[S.fault] * noise(); P = PB[S.fault] * noise();
    if (S.glitchNext) { Q *= rng() < 0.5 ? 0.45 : 1.6; S.glitchNext = false; ST.env.glitch++; amb('Leitura espúria de vazão (1 amostra) — a regra de persistência evita falso alerta'); }
    dM += GAIN * SG[S.fault];
    S.runMin++; S.pumpLeft--;
  }
  S.Q = Q; S.P = P; S.M = clamp(S.M + dM, 0, 60);

  if (S.pump) {
    if (S.calibrating) {
      S.cal.push(Q);
      if (S.cal.length >= 8) {
        S.baseline = S.cal.reduce((a, b) => a + b, 0) / S.cal.length; S.calibrating = false; S.cal = []; ST.calibrated = true;
        log('evento', `Linha de base calibrada: ${n(S.baseline, 2)} L/min`); toast(`Linha de base: ${n(S.baseline, 2)} L/min`); stopPump('calibração concluída');
      }
    } else detect(Q, P);
  }
  if (S.pump && S.pumpLeft <= 0) stopPump('tempo concluído');
  else if (S.pump && S.runMin >= cfg.maxRun) stopPump('limite de segurança de funcionamento contínuo');

  if (S.tick % cfg.interval === 0) {
    ST.expected++;
    if (S.power) { ST.readings++; if (!S.online) ST.offlineReadings++; log('leitura', `Umid ${n(S.M)}% · Vazão ${n(S.Q, 2)} L/min · Pressão ${n(S.P, 2)} bar`, { M: S.M, Q: S.Q, P: S.P }); }
  }
  evalRec();
  const h = S.hist; h.M.push(S.M); h.Q.push(S.Q); h.on.push(S.pump); ['M', 'Q', 'on'].forEach(k => { if (h[k].length > 180) h[k].shift(); });
  runDemo(); vop();
}

function detect(Q, P) {
  const base = S.baseline;
  if (Q < base * 0.1) {
    if (++S.dryCount >= 2) {
      stopPump('proteção contra funcionamento a seco'); S.lock = { reason: 'Funcionamento a seco detectado' };
      raise('dry', 'crit', 'Funcionamento a seco', `Vazão ≈ 0 com a bomba ligada (pressão ${n(P, 2)} bar). Bomba parada e bloqueada; verifique o reservatório e a sucção.`);
    }
    return;
  }
  S.dryCount = 0;
  const dev = (Q - base) / base * 100;
  if (Math.abs(dev) > cfg.devPct) S.devCount++; else S.devCount = 0;
  if (S.devCount >= cfg.persist && !S.alert && S.tick >= S.cool) {
    if (dev < 0) raise('clog', 'warn', 'Queda de vazão — possível entupimento', `Vazão ${n(Q, 2)} L/min, ${n(Math.abs(dev), 0)}% abaixo da referência (${n(base, 2)}). Pressão ${n(P, 2)} bar ${P > 2.4 ? '(alta: reforça entupimento)' : ''}. Confirme em inspeção local.`);
    else raise('leak', 'warn', 'Vazão acima do esperado — possível vazamento', `Vazão ${n(Q, 2)} L/min, ${n(dev, 0)}% acima da referência (${n(base, 2)}). Pressão ${n(P, 2)} bar ${P < 1.6 ? '(baixa: reforça vazamento)' : ''}. Confirme em inspeção local.`);
  }
}
function raise(kind, sev, title, msg) {
  let truth = false;
  if (S.fault !== 'none') { truth = true; if (!S.detected) { S.detected = true; ST.detected[S.fault]++; if (S.manifest != null) ST.delays.push(S.tick - S.manifest); } }
  else ST.falseAlerts++;
  S.alert = { kind, sev, title, msg, tick: S.tick, truth };
  log('alerta', `${title}. ${msg}`);
  toast(title, 'bad');
}

function evalRec() {
  if (S.pump || S.lock || !S.power) { S.rec = null; S.recKey = ''; return; }
  if (S.tick < S.snooze) return;
  let rec = null;
  if (S.M < cfg.crit) {
    if (cfg.rainProb >= cfg.rainLimit || S.raining) rec = { type: 'wait' };
    else rec = { type: 'go', dur: clamp(Math.ceil((cfg.target - S.M) / GAIN), 5, cfg.maxRun) };
  }
  const key = rec ? rec.type + (rec.dur || '') : '';
  if (key !== S.recKey) {
    S.recKey = key;
    if (rec) log('recomendação', rec.type === 'go' ? `Recomendado irrigar por ${rec.dur} min (umidade abaixo do limiar, chuva prevista ${cfg.rainProb}%)` : `Solo abaixo do limiar, mas chuva prevista (${cfg.rainProb}%) — recomendado aguardar`);
  }
  S.rec = rec;
}

/* ---------- demonstração guiada ---------- */
const DEMO = [
  [0, 'Solo seco e dia quente: o Raiz mede a umidade e recomenda irrigar.', () => { setFault('none'); S.M = 28.5; cfg.temp = 32; cfg.rainProb = 10; S.alert = null; S.lock = null; setOnline(true); S.snooze = 0; }],
  [6, 'A internet cai. O controlador continua lendo, registrando e alertando localmente.', () => setOnline(false)],
  [9, 'O operador aceita a recomendação e liga a bomba (comando local, sem internet).', () => { stopPump('demo'); startPump(36, 'recomendação aceita (demonstração)'); decide('accept', 'Recomendação aceita pelo operador (demonstração)'); }],
  [18, 'Falha 1: entupimento na válvula. A vazão cai e o desvio persiste.', () => setFault('clog')],
  [27, 'O operador confirma o alerta em inspeção e a bancada é normalizada.', () => { if (S.alert) ackAlert(true); setFault('none'); }],
  [30, 'Falha 2: vazamento na tubulação. A vazão sobe e a pressão cai.', () => setFault('leak')],
  [39, 'Alerta confirmado e vazamento corrigido.', () => { if (S.alert) ackAlert(true); setFault('none'); }],
  [41, 'A internet volta: os registros guardados offline sincronizam com o painel remoto.', () => setOnline(true)],
  [43, 'Falha 3: reservatório vazio (bomba a seco). A bomba para sozinha e bloqueia.', () => setFault('dry')],
  [50, 'Operador inspeciona, enche o reservatório e rearma a bomba. Fim da demonstração.', () => { if (S.alert) ackAlert(true); setFault('none'); rearm(); endDemo(true); }]
];
function startDemo() {
  S.demo = { start: S.tick, i: 0 }; S.speed = 2; $('#speed').value = '2'; S.running = true; $('#btnPlay').textContent = '⏸ Pausar'; schedule();
  $('#demoCap').hidden = false; $('#btnDemo').disabled = true; runDemo();
}
function runDemo() {
  const d = S.demo; if (!d) return;
  while (d.i < DEMO.length && S.tick - d.start >= DEMO[d.i][0]) { const [, txt, fn] = DEMO[d.i]; $('#demoTxt').textContent = `Passo ${d.i + 1}/${DEMO.length}: ${txt}`; d.i++; fn(); if (!S.demo) return; }
}
function endDemo(done) { S.demo = null; $('#btnDemo').disabled = false; if (done) { $('#demoTxt').textContent = 'Demonstração concluída. Veja o Registro e a aba Testes.'; setTimeout(() => { if (!S.demo) $('#demoCap').hidden = true; }, 6000); } else $('#demoCap').hidden = true; }

/* ---------- renderização ---------- */
const set = (sel, t) => { const e = $(sel); if (e && e.textContent !== t) e.textContent = t; };
function chip(sel, cls, t) { const e = $(sel); if (!e) return; e.className = 'chip ' + cls; e.textContent = t; }

function updateMetrics() {
  set('#vM', n(S.M) + '%');
  chip('#cM', S.M < cfg.crit ? 'bad' : S.M < cfg.crit + 5 ? 'warn' : 'ok', S.M < cfg.crit ? 'Abaixo do limiar' : S.M < cfg.crit + 5 ? 'Atenção' : 'Adequada');
  $('#barM').style.width = (S.M / 60 * 100) + '%'; $('#mkCrit').style.left = (cfg.crit / 60 * 100) + '%'; $('#mkTarget').style.left = (cfg.target / 60 * 100) + '%';
  set('#sCrit', cfg.crit); set('#sTarget', cfg.target);
  set('#vQ', n(S.Q, 2));
  const dev = S.baseline ? (S.Q - S.baseline) / S.baseline * 100 : 0;
  if (!S.pump) chip('#cQ', 'info', 'Bomba parada');
  else if (S.calibrating) chip('#cQ', 'info', `Calibrando ${S.cal.length}/8`);
  else chip('#cQ', Math.abs(dev) <= cfg.devPct ? 'ok' : 'bad', Math.abs(dev) <= cfg.devPct ? 'Dentro do esperado' : `Desvio ${dev > 0 ? '+' : ''}${n(dev, 0)}%`);
  set('#subQ', `Referência ${n(S.baseline, 2)} L/min · tolerância ±${cfg.devPct}% · alerta após ${cfg.persist} leituras`);
  set('#vP', n(S.P, 2));
  if (!S.pump) chip('#cP', 'info', '—'); else chip('#cP', S.P > 2.4 ? 'warn' : S.P < 1.6 ? 'warn' : 'ok', S.P > 2.4 ? 'Alta' : S.P < 1.6 ? 'Baixa' : 'Normal');
  set('#vT', String(cfg.temp)); set('#vR', String(cfg.rainProb));
  chip('#cR', S.raining ? 'info' : cfg.rainProb >= cfg.rainLimit ? 'warn' : 'ok', S.raining ? 'Chovendo' : cfg.rainProb >= cfg.rainLimit ? 'Chuva provável' : 'Tempo firme');
}

function updateRec() {
  const box = $('#recBody'), r = S.rec;
  const key = r ? r.type + (r.dur || '') + cfg.rainProb + cfg.rainLimit + cfg.crit : 'none' + (S.pump ? 'p' : '') + (S.lock ? 'l' : '') + Math.floor(S.M >= cfg.crit);
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    if (r && r.type === 'go') {
      box.innerHTML = `<div class="rec go"><b class="big">Irrigar por ${r.dur} min</b>
        <span class="why">Umidade <b data-m></b>% abaixo do limiar de ${cfg.crit}% e chuva prevista de ${cfg.rainProb}% (limite ${cfg.rainLimit}%). Meta: ${cfg.target}%.</span>
        <div class="acts"><button class="btn" data-a="accept">Aceitar e ligar</button>
        <label>ou ajustar <input type="number" id="adjMin" min="1" max="${cfg.maxRun}" value="${r.dur}"> min</label>
        <button class="btn ghost" data-a="adjust">Aplicar ajuste</button><button class="btn ghost" data-a="refuse">Recusar (30 min)</button></div></div>`;
    } else if (r && r.type === 'wait') {
      box.innerHTML = `<div class="rec wait"><b class="big">Aguardar chuva prevista</b>
        <span class="why">Umidade <b data-m></b>% abaixo do limiar, mas a chuva prevista (${cfg.rainProb}%) atinge o limite de ${cfg.rainLimit}%. Irrigar agora pode desperdiçar água.</span>
        <div class="acts"><button class="btn ghost" data-a="force">Irrigar mesmo assim (15 min)</button><button class="btn ghost" data-a="refuse">Dispensar (30 min)</button></div></div>`;
    } else {
      const why = S.pump ? 'Bomba em operação — a recomendação volta ao fim do ciclo.' : S.lock ? 'Bomba bloqueada: rearme após inspeção.' : `Solo dentro da faixa (≥ ${cfg.crit}%). Nenhuma ação necessária.`;
      box.innerHTML = `<div class="rec ok"><b class="big">${S.pump ? 'Irrigando' : S.lock ? 'Bloqueada' : 'Sem necessidade de irrigar'}</b><span class="why">${why}</span></div>`;
    }
  }
  const m = $('[data-m]', box); if (m) m.textContent = n(S.M);
}

function updateControl() {
  if (S.lock) chip('#pumpState', 'bad', 'Bloqueada'); else chip('#pumpState', S.pump ? 'ok' : 'info', S.pump ? 'Ligada' : 'Desligada');
  set('#pumpTimer', S.pump ? `${S.pumpLeft} min` : '—');
  set('#pumpSub', S.pump ? `restantes · ligada há ${S.runMin} min` : S.lock ? '' : 'Aguardando comando do operador');
  $('#btnStart').disabled = S.pump || !!S.lock || !S.power; $('#btnStop').disabled = !S.pump;
  if (!S.power) chip('#pumpState', 'bad', 'Sem energia');
  $('#lockBox').hidden = !S.lock; if (S.lock) set('#lockMsg', S.lock.reason);
}

function updateAlert() {
  const bar = $('#alertbar'), a = S.alert; bar.hidden = !a;
  if (a) { bar.className = 'alertbar' + (a.sev === 'warn' ? ' warn' : ''); set('#alertTitle', a.title); set('#alertMsg', a.msg); }
}

function updateNet() {
  const b = $('#btnNet'); b.className = 'net ' + (S.online ? 'on' : 'off'); b.setAttribute('aria-pressed', String(S.online));
  set('#netTxt', S.online ? 'Online' : 'Offline');
  $('#netIco').src = S.online ? 'assets/icon-cloud.svg' : 'assets/icon-cloud-off.svg'; $('#cloudIco').src = $('#netIco').src;
}

function updateLcd() {
  const q = pending(), l = [];
  l.push(`UMID ${n(S.M).padStart(5)}%   VAZAO ${n(S.Q, 2).padStart(5)} L/min`);
  l.push(`BOMBA: ${S.lock ? '<span class="e">BLOQUEADA</span>' : S.pump ? 'LIGADA ' + S.pumpLeft + ' min' : 'DESLIGADA'}   PRESSAO ${n(S.P, 2)} bar`);
  l.push(`REDE : ${S.online ? 'ONLINE' : '<span class="w">OFFLINE</span>'}   FILA: ${q} pendente(s)`);
  l.push(`MEM  : ${S.log.length} registros   ENERGIA: ${S.power ? 'OK' : '<span class="e">SEM ENERGIA</span>'}`);
  l.push(S.alert ? `<span class="e">ALERTA: ${S.alert.title}</span>` : S.rec && S.rec.type === 'go' ? `<span class="w">REC.: irrigar ${S.rec.dur} min</span>` : 'STATUS: operação normal');
  $('#lcd').innerHTML = l.join('\n');
}

function updateRemote() {
  const box = $('#remoteBody'), lastR = [...S.remote].reverse().find(e => e.type === 'leitura');
  const alerts = S.remote.filter(e => e.type === 'alerta'), q = pending();
  const state = S.online
    ? `<div class="note ok">Conectado — última sincronização ${S.lastSync != null ? fmtT(S.lastSync) : '—'}</div>`
    : `<div class="note bad">Sem sinal desde ${fmtT(S.offlineSince ?? S.tick)} — a nuvem mostra dados desatualizados; ${q} registro(s) aguardam envio</div>`;
  const evs = [...S.remote].reverse().filter(e => e.type === 'alerta' || e.type === 'comando').slice(0, 4).map(e => `<li>${fmtT(e.t)} — ${e.msg.length > 80 ? e.msg.slice(0, 80) + '…' : e.msg}</li>`).join('');
  box.innerHTML = `<div class="rem ${S.online ? '' : 'stale'}">${state}
    <div class="row d"><span>Última leitura na nuvem</span><b>${lastR ? `${n(lastR.data.M)}% · ${n(lastR.data.Q, 2)} L/min` : '—'}</b></div>
    <div class="row d"><span>Idade do dado</span><b>${lastR ? (S.tick - lastR.t) + ' min' : '—'}</b></div>
    <div class="row"><span>Registros na nuvem</span><b>${S.remote.length}</b></div>
    <div class="row"><span>Alertas recebidos</span><b>${alerts.length}</b></div>
    <ul>${evs || '<li>Nenhum evento recebido ainda</li>'}</ul></div>`;
}

function updateBench() {
  const on = S.pump && S.Q > 0.1;
  ['pp1', 'pp2', 'pp3', 'pp4'].forEach(id => { const e = document.getElementById(id); e.classList.toggle('flowing', on); });
  $('#impeller').classList.toggle('spin', S.pump);
  $('#pumpLed').setAttribute('fill', S.lock ? '#c0392b' : S.pump ? '#3d9a63' : '#999');
  $('#valveBlock').setAttribute('opacity', S.fault === 'clog' ? 1 : 0);
  $('#drops').setAttribute('opacity', S.fault === 'leak' && S.pump ? 1 : S.fault === 'leak' ? 0.5 : 0);
  const th = S.fault === 'dry' ? 6 : 109; $('#tankWater').setAttribute('y', 369 - th); $('#tankWater').setAttribute('height', th);
  const sh = 110 * S.M / 60; $('#soilFill').setAttribute('y', 372 - sh); $('#soilFill').setAttribute('height', sh);
  set('#bM', n(S.M, 0) + '%'); set('#bQ', n(S.Q, 2));
  $('#ledAlert').setAttribute('fill', S.alert ? '#c0392b' : '#555'); $('#ledNet').setAttribute('fill', S.online ? '#3d9a63' : '#c98500');
  $('#noNet').setAttribute('opacity', S.online ? 0 : 1); $('#wireCloud').classList.toggle('off', !S.online);
  set('#mcuTxt', !S.power ? 'SEM ENERGIA' : S.alert ? 'ALERTA: ' + S.alert.title.split(' — ')[0] : S.lock ? 'bomba bloqueada' : S.pump ? 'irrigando' : S.online ? 'pronto · online' : 'pronto · modo local');
}

function drawChart(cv, ser, o) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const pad_ = { l: 34, r: 8, t: 8, b: 14 }, pw = w - pad_.l - pad_.r, ph = h - pad_.t - pad_.b, N = 180;
  const X = i => pad_.l + pw * (i / (N - 1)), Y = v => pad_.t + ph * (1 - (v - o.ymin) / (o.ymax - o.ymin));
  c.font = '11px system-ui'; c.textBaseline = 'middle'; c.fillStyle = '#5b6a62'; c.strokeStyle = '#e3ebe5'; c.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = o.ymin + (o.ymax - o.ymin) * k / 4, y = Y(v); c.beginPath(); c.moveTo(pad_.l, y); c.lineTo(w - pad_.r, y); c.stroke(); c.textAlign = 'right'; c.fillText(v.toFixed(o.ymax > 20 ? 0 : 1), pad_.l - 5, y); }
  const off = N - ser.v.length;
  c.fillStyle = 'rgba(27,111,168,.14)'; ser.on.forEach((p, i) => { if (p) c.fillRect(X(i + off) - pw / N / 2, pad_.t, pw / N + 0.5, ph); });
  if (o.band) { c.fillStyle = 'rgba(61,154,99,.16)'; c.fillRect(pad_.l, Y(o.band[1]), pw, Y(o.band[0]) - Y(o.band[1])); }
  (o.lines || []).forEach(l => { c.strokeStyle = l.color; c.setLineDash(l.dash || []); c.lineWidth = 1.6; c.beginPath(); c.moveTo(pad_.l, Y(l.y)); c.lineTo(w - pad_.r, Y(l.y)); c.stroke(); });
  c.setLineDash([]); c.strokeStyle = o.color; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath();
  ser.v.forEach((v, i) => { const x = X(i + off), y = Y(clamp(v, o.ymin, o.ymax)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
}
function updateCharts() {
  if (view !== 'painel') return;
  drawChart($('#chM'), { v: S.hist.M, on: S.hist.on }, { ymin: 0, ymax: 60, color: '#1f6b43', lines: [{ y: cfg.crit, color: '#c0392b', dash: [5, 4] }, { y: cfg.target, color: '#3d9a63', dash: [5, 4] }] });
  const b = S.baseline, tol = cfg.devPct / 100;
  drawChart($('#chQ'), { v: S.hist.Q, on: S.hist.on }, { ymin: 0, ymax: Math.max(cfg.nominal * 1.8, b * 1.8), color: '#1b6fa8', band: [b * (1 - tol), b * (1 + tol)], lines: [{ y: b, color: '#3d9a63', dash: [4, 3] }] });
}

function renderLog() {
  const f = $('#logFilter').value, rows = S.log.filter(e => !f || e.type === f).slice(-300).reverse();
  $('#logBody').innerHTML = rows.map(e => `<tr><td class="t">${fmtT(e.t)}</td><td><span class="pill ${e.type}">${e.type}</span></td><td>${e.msg}</td><td>${e.synced ? '✓ enviado' : '⏳ pendente'}</td></tr>`).join('') || '<tr><td colspan="4">Sem registros.</td></tr>';
  set('#logCount', `${S.log.length} registros locais · ${pending()} aguardando envio à nuvem · exibindo até 300 mais recentes`);
}
function csv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['id', 'tempo_simulado', 'tipo', 'mensagem', 'umidade_pct', 'vazao_lmin', 'pressao_bar', 'sincronizado'].join(';')];
  S.log.forEach(e => rows.push([e.id, fmtT(e.t), e.type, q(e.msg), e.data ? n(e.data.M, 2) : '', e.data ? n(e.data.Q, 2) : '', e.data ? n(e.data.P, 2) : '', e.synced ? 'sim' : 'nao'].join(';')));
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'raiz_registro_simulado.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function summaryText() {
  const inj = ST.injected.clog + ST.injected.leak + ST.injected.dry, det = ST.detected.clog + ST.detected.leak + ST.detected.dry;
  const avg = ST.delays.length ? ST.delays.reduce((a, b) => a + b, 0) / ST.delays.length : null;
  return `RAIZ · RESUMO DO SIMULADOR (DADOS SIMULADOS — não são resultados de campo nem de bancada)
Parâmetros: limiar crítico ${cfg.crit}% · alvo ${cfg.target}% · tolerância de vazão ±${cfg.devPct}% por ${cfg.persist} leituras · referência ${n(S.baseline, 2)} L/min
Tempo simulado: ${fmtClock(S.tick)}
F1 Recomendações: aceitas ${ST.dec.accept} · ajustadas ${ST.dec.adjust} · recusadas ${ST.dec.refuse}
F2 Falhas injetadas: ${inj} (entupimento ${ST.injected.clog}, vazamento ${ST.injected.leak}, a seco ${ST.injected.dry}) · detectadas: ${det} · atraso médio: ${avg == null ? '—' : n(avg, 1) + ' min'} · falsos alertas: ${ST.falseAlerts}
Alertas confirmados: ${ST.confirmed} · descartados: ${ST.discarded}
F3 Registros em modo offline: ${ST.offlineReadings} · sincronização após retorno: ${ST.synced ? 'sim' : 'não'} · fila atual: ${pending()}
Leituras registradas: ${ST.readings}/${ST.expected} (${n(ST.expected ? ST.readings / ST.expected * 100 : 100, 1)}%)
Modo Operação (eventos aleatórios, semente ${ENV.seed}): chuvas ${ST.env.rain} · quedas de internet ${ST.env.net} · quedas de energia ${ST.env.power} · falhas espontâneas ${ST.env.clog + ST.env.leak + ST.env.dry} · leituras espúrias ${ST.env.glitch} · reparos ${ST.env.repairs}
Observação: a lógica é determinística; as metas de ≥90% de leituras e de detecção devem ser medidas na bancada física.`;
}
function updateTests() {
  const inj = ST.injected.clog + ST.injected.leak + ST.injected.dry, det = ST.detected.clog + ST.detected.leak + ST.detected.dry;
  set('#tInj', String(inj)); set('#tDet', String(det));
  set('#tDelay', ST.delays.length ? n(ST.delays.reduce((a, b) => a + b, 0) / ST.delays.length, 1) : '—');
  set('#tFalse', String(ST.falseAlerts)); set('#tConf', `${ST.confirmed} / ${ST.discarded}`); set('#tDec', String(ST.dec.accept + ST.dec.adjust + ST.dec.refuse));
  const pct = ST.expected ? ST.readings / ST.expected * 100 : 100;
  set('#tRead', `Leituras registradas / programadas: ${ST.readings} / ${ST.expected} (${n(pct, 1)}%). ` + (ST.readings === ST.expected ? 'Sem perdas até agora: no modo Operação, quedas de energia geram lacunas e deixam a meta de ≥ 90% mensurável (no hardware real o valor será outro).' : pct >= 90 ? 'Meta de ≥ 90% atendida na simulação.' : 'Abaixo da meta de 90% por causa das quedas de energia simuladas.'));
  const E = ST.env; set('#eRain', String(E.rain)); set('#eNet', String(E.net)); set('#ePower', String(E.power)); set('#eFault', String(E.clog + E.leak + E.dry)); set('#eGlitch', String(E.glitch)); set('#eRepair', String(E.repairs));
  const done = { ck1: ST.offlineReadings >= 3 && ST.offlineCmd, ck2: ST.synced && pending() === 0 && S.online, ck3: ST.detected.clog > 0 && ST.detected.leak > 0 && ST.detected.dry > 0, ck4: ST.t4 };
  Object.keys(done).forEach(k => $('#' + k).classList.toggle('done', !!done[k]));
  $('#t4').checked = ST.t4; set('#summary', summaryText());
}

function syncInputs() {
  $$('[data-cfg]').forEach(i => {
    const k = i.dataset.cfg; if (document.activeElement !== i) i.value = cfg[k];
    const o = i.parentElement.querySelector('output'); if (o) o.textContent = (k === 'nominal' ? n(cfg[k]) : cfg[k]) + (i.dataset.u || '');
  });
  set('#baseTxt', `${n(S.baseline, 2)} L/min`);
  set('#calStatus', S.calibrating ? `Calibrando… ${S.cal.length}/8 leituras` : '');
  $('#btnCal').disabled = S.calibrating;
  $$('.btn.f').forEach(b => b.classList.toggle('on', b.dataset.fault === S.fault));
  document.body.classList.toggle('prod', ENV.prod);
  $$('#modeSeg button').forEach(b => b.classList.toggle('on', (b.dataset.mode === 'prod') === ENV.prod));
  $$('[data-cfg="temp"],[data-cfg="rainProb"]').forEach(i => { i.disabled = ENV.prod; });
  $('#btnNet').disabled = ENV.prod; $('#btnNet').title = ENV.prod ? 'No modo Operação a internet cai e volta sozinha' : 'Simula queda e retorno da internet';
  if (document.activeElement !== $('#envK')) $('#envK').value = String(ENV.k);
  $('#vop').checked = ENV.vop; set('#seedTxt', String(ENV.seed));
}
function updateEnv() {
  if (!ENV.prod) return;
  const ev = S.log.filter(e => e.type === 'ambiente').slice(-8).reverse();
  const html = ev.map(e => `<li><span class="t">${fmtT(e.t)}</span> ${e.msg}</li>`).join('') || '<li>Nenhum evento ainda — aumente a velocidade ou aguarde.</li>';
  const f = $('#envFeed'); if (f.dataset.h !== html) { f.dataset.h = html; f.innerHTML = html; }
  const E = ST.env; set('#envChips', `Acumulado: ${E.rain} chuvas · ${E.net} quedas de internet · ${E.power} quedas de energia · ${E.clog + E.leak + E.dry} falhas · ${E.glitch} leituras espúrias · ${E.repairs} reparos`);
}

function render() {
  updateMetrics(); updateRec(); updateControl(); updateAlert(); updateLcd(); updateRemote(); updateBench(); updateCharts();
  set('#clock', fmtClock(S.tick)); syncInputs(); updateEnv();
  if (view === 'registro' && S.dirtyLog) { renderLog(); S.dirtyLog = false; }
  if (view === 'testes') updateTests();
}

/* ---------- controle do relógio ---------- */
function schedule() {
  clearInterval(timer); if (!S.running) return;
  const ms = S.speed <= 20 ? 1000 / S.speed : 50, reps = S.speed <= 20 ? 1 : S.speed / 20;
  timer = setInterval(() => { for (let i = 0; i < reps; i++) step(); render(); if (++saveN % 10 === 0) save(); }, ms);
}
function showView(v) {
  view = v; $$('.view').forEach(e => e.classList.toggle('on', e.id === 'view-' + v)); $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  S.dirtyLog = true; render(); if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
}

/* ---------- eventos ---------- */
function bind() {
  $$('.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#btnNet').addEventListener('click', () => { setOnline(!S.online); render(); });
  $('#btnPlay').addEventListener('click', () => { S.running = !S.running; $('#btnPlay').textContent = S.running ? '⏸ Pausar' : '▶ Retomar'; schedule(); });
  $('#speed').addEventListener('change', e => { S.speed = +e.target.value; schedule(); });
  $('#btnSeco').addEventListener('click', () => { cfg.temp = 35; cfg.rainProb = 5; S.M = Math.min(S.M, 31.5); S.snooze = 0; toast('Cenário: dia seco e quente'); render(); });
  $('#btnChuva').addEventListener('click', () => { cfg.rainProb = 85; S.snooze = 0; toast('Cenário: chuva prevista de 85%'); render(); });
  $('#btnRain').addEventListener('click', () => { S.raining = true; S.rainLeft = 30; log('evento', 'Chuva simulada iniciada (30 min)'); render(); });
  $('#btnDemo').addEventListener('click', startDemo);
  $('#btnDemoStop').addEventListener('click', () => endDemo(false));
  $$('.btn.f').forEach(b => b.addEventListener('click', () => setFault(b.dataset.fault)));
  $('#btnConfirm').addEventListener('click', () => ackAlert(true));
  $('#btnDiscard').addEventListener('click', () => ackAlert(false));
  $('#btnStart').addEventListener('click', () => { if (startPump(+$('#runMin').value, 'comando manual do operador')) render(); });
  $('#btnStop').addEventListener('click', () => { stopPump('comando manual do operador'); render(); });
  $('#btnEmerg').addEventListener('click', emergency);
  $('#btnRearm').addEventListener('click', rearm);
  $('#recBody').addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a || !S.rec) return; const act = a.dataset.a;
    if (act === 'accept') { if (startPump(S.rec.dur, 'recomendação aceita')) decide('accept', `Recomendação aceita: irrigar ${S.rec.dur} min`); }
    else if (act === 'adjust') { const m = +$('#adjMin').value; if (startPump(m, 'recomendação ajustada pelo operador')) decide('adjust', `Recomendação ajustada: ${S.rec.dur} → ${Math.round(m)} min`); }
    else if (act === 'force') { if (startPump(15, 'irrigação manual apesar da previsão de chuva')) decide('adjust', 'Operador irrigou mesmo com chuva prevista'); }
    else if (act === 'refuse') { S.snooze = S.tick + 30; decide('refuse', 'Recomendação recusada pelo operador (nova avaliação em 30 min)'); S.rec = null; S.recKey = ''; }
    render();
  });
  $$('[data-cfg]').forEach(i => i.addEventListener('input', () => { cfg[i.dataset.cfg] = parseFloat(i.value); S.snooze = 0; if (i.dataset.cfg === 'nominal' && !ST.calibrated) S.baseline = cfg.nominal; render(); save(); }));
  $('#btnDefaults').addEventListener('click', () => { cfg = { ...DEF }; S.baseline = cfg.nominal; toast('Valores iniciais restaurados'); render(); save(); });
  $('#btnCal').addEventListener('click', startCal);
  $('#btnReset').addEventListener('click', () => { if (confirm('Zerar toda a simulação, o registro e os contadores de teste?')) { noSave = true; clearInterval(timer); try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); } });
  $('#logFilter').addEventListener('change', () => { S.dirtyLog = true; render(); });
  $('#btnCsv').addEventListener('click', csv);
  $('#btnClearLog').addEventListener('click', () => { if (confirm('Limpar o registro local? Registros pendentes de envio serão perdidos.')) { S.log = []; S.dirtyLog = true; render(); } });
  $('#t4').addEventListener('change', e => { ST.t4 = e.target.checked; render(); save(); });
  $('#btnCopy').addEventListener('click', () => { const t = summaryText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Resumo copiado'), () => { const r = document.createRange(); r.selectNodeContents($('#summary')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selecione e copie com Ctrl/Cmd+C', 'warn'); }); });
  // bancada clicável
  $$('#modeSeg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#envK').addEventListener('change', e => { ENV.k = +e.target.value; log('evento', `Intensidade dos eventos alterada (×${ENV.k})`); save(); });
  $('#vop').addEventListener('change', e => { ENV.vop = e.target.checked; log('evento', ENV.vop ? 'Operador virtual ligado (simulado)' : 'Operador virtual desligado'); save(); });
  $('#btnSeed').addEventListener('click', () => { ENV.seed = Math.floor(Math.random() * 900000) + 100000; rng = mk(ENV.seed + S.tick); log('evento', `Nova semente dos eventos: ${ENV.seed}`); save(); render(); });
  const tog = (f) => { if (ENV.prod) { toast('No modo Operação as falhas são geradas pelo ambiente', 'warn'); return; } setFault(S.fault === f ? 'none' : f); };
  [['#valve', 'clog'], ['#leakpt', 'leak'], ['#tank', 'dry']].forEach(([s, f]) => { const e = $(s); e.addEventListener('click', () => tog(f)); e.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); tog(f); } }); });
  window.addEventListener('resize', updateCharts);
  window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}

/* ---------- início ---------- */
load();
if (!S.log.length) { S.hist.M = []; log('evento', 'Sistema iniciado — simulação com dados fictícios'); }
bind(); updateNet(); evalRec();
const h = (location.hash || '').slice(1); view = ['painel', 'bancada', 'registro', 'ajustes', 'testes', 'sobre'].includes(h) ? h : 'painel';
showView(view); $('#speed').value = String(S.speed); schedule();
if (location.search.includes('debug')) window.__raiz = { S, ST, ENV, cfg: () => cfg, step: () => { step(); render(); }, setFault, startDemo, setMode };
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
})();
