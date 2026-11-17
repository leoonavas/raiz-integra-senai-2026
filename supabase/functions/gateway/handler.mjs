/* Gateway Raiz na nuvem (Supabase Edge Function) — lógica pura; o acesso ao banco/Realtime entra por `deps`.
   Usa o MESMO núcleo de regras do gateway local (core.js, copiado de shared/gateway-core.js).

   Operações (POST JSON { op, farm_id, ... }, JWT de usuário membro da fazenda):
     ingest   (gestor)   a fazenda envia leituras dos dispositivos → regras → alertas/recomendações → app via Realtime
     command  (membro)   comando do app (valida perfil e estado) → executa no gateway ou repassa ao controlador
     hello    (membro)   estado completo para o app abrir/reconectar
     status   (membro)   o gateway está de pé? internet, pendências, idade do último dado da fazenda
     sync     (gestor)   passagem de bastão: o gateway local (sem internet) devolve o estado para a nuvem
     reset    (gestor)   apaga o estado (nova simulação) */
import './core.js';

const Core = globalThis.RaizGatewayCore;
const V = 1;
const STALE_FARM_SEC = 45;                                       // sem leitura há mais que isso = fazenda sem comunicação
const ACTUATING = new Set(['pump.start', 'pump.stop', 'pump.emergency', 'pump.rearm', 'device.restart']);
const COMMANDS = new Set([...ACTUATING, 'recommendation.refuse', 'alert.confirm', 'alert.discard', 'alert.maintenance', 'sync.now', 'settings.update']);
const LOGGED = new Set(['alert.new', 'alert.update', 'run.log', 'command.ack', 'command']);

/* relógio da fazenda (igual ao do simulador) */
const BASE = Date.UTC(2026, 10, 17), WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], pad = n => String(n).padStart(2, '0');
const tsOf = t => BASE + Math.round(t) * 60000;
const minOfDay = t => ((Math.floor(t) % 1440) + 1440) % 1440;
const hhmm = t => pad(Math.floor(minOfDay(t) / 60)) + ':' + pad(minOfDay(t) % 60);
const when = (t, now) => { const d = Math.floor((now == null ? t : now) / 1440) - Math.floor(t / 1440); return (d === 0 ? 'Hoje' : d === 1 ? 'Ontem' : WD[new Date(tsOf(t)).getUTCDay()]) + ' · ' + hhmm(t); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));

export const clock = { tsOf, when };

/* monta o gateway sobre o estado salvo */
function build(row, internetFlag) {
  const ctx = { outApp: [], actQ: [], gwUp: true, tickAt: null, gw: null };
  const state = row && row.state && Object.keys(row.state).length ? row.state : null;
  const env = {
    tsOf, when, internet: () => true, linkName: 'Supabase Edge (nuvem)', log() { },
    send: (type, payload) => ctx.outApp.push({ type, payload: clone(payload), ts: tsOf(ctx.gw.now) }),
    actuate(cmd, args, cid) {
      ctx.actQ.push({ cid, cmd, args: clone(args) });                  // a fazenda busca na resposta do próximo ingest
      return cmd === 'fix' ? { ok: true } : { pending: true };          // o controlador responde depois (ack no ingest seguinte)
    }
  };
  const gw = ctx.gw = Core.create(env);
  if (state) { gw.importState(state); ctx.tickAt = state.tickAt == null ? null : state.tickAt; ctx.actQ = state.actQ || []; ctx.gwUp = state.gwUp !== false; }
  ctx.save = () => Object.assign(gw.exportState(), { tickAt: ctx.tickAt, actQ: ctx.actQ, gwUp: ctx.gwUp });
  return ctx;
}

export function makeHandler(deps) {
  const reply = (status, body) => ({ status, body });
  const fail = (status, error, extra) => reply(status, Object.assign({ ok: false, error }, extra));

  async function broadcast(farmId, ctx, ts) {
    const msgs = [], seenTel = new Map(), seenSer = new Map(), apps = ctx.outApp;
    apps.forEach((m, i) => { if (m.type === 'telemetry') seenTel.set(m.payload.device, i); if (m.type === 'series') seenSer.set(m.payload.plot, i); });
    apps.forEach((m, i) => {                                                  // só a última leitura de cada dispositivo; 'command' só vai para o registro
      if (m.type === 'command') return;
      if ((m.type === 'telemetry' && seenTel.get(m.payload.device) !== i) || (m.type === 'series' && seenSer.get(m.payload.plot) !== i)) return;
      msgs.push({ v: V, id: uid(), src: 'farm', farm: farmId, type: m.type, ts: m.ts, payload: m.payload });
    });
    if (msgs.length) await deps.broadcast(farmId, msgs);
    const rows = apps.filter(m => LOGGED.has(m.type)).map(m => ({ farm_id: farmId, src: 'farm', type: m.type, payload: m.payload }));
    if (rows.length && deps.log) await deps.log(rows);
  }

  /* lê → muda → grava com controle de versão → só então envia ao app */
  async function transact(farmId, fn) {
    for (let i = 0; i < 4; i++) {
      const row = await deps.load(farmId), r = await fn(row);
      if (r.abort) return r.result;
      if (r.skipSave) { await broadcast(farmId, r.ctx, r.ts); return r.result; }
      if (await deps.save(farmId, row ? row.version : null, r.row)) { await broadcast(farmId, r.ctx, r.ts); return r.result; }
    }
    throw new Error('conflito de versão ao gravar o estado');
  }

  return async function handle(req) {
    const user = await deps.user(req.authorization);
    if (!user) return fail(401, 'não autenticado');
    const b = req.body || {}, farmId = b.farm_id;
    if (!farmId || typeof farmId !== 'string') return fail(400, 'farm_id obrigatório');
    const mem = await deps.member(user.id, farmId);
    if (!mem) return fail(403, 'sem acesso a esta fazenda');
    const gestor = mem.role === 'gestor', now = deps.now();
    const farmInfo = { id: mem.farm.id, name: mem.farm.name, city: mem.farm.city || '' };

    switch (b.op) {
      case 'status': {
        const row = await deps.load(farmId);
        const age = row && row.last_ingest_at ? Math.round((now - Date.parse(row.last_ingest_at)) / 1000) : null;
        return reply(200, { ok: true, gateway: row && row.state && row.state.gwUp === false ? 'offline' : 'online', internet: row ? row.internet : true, farmAgeSec: age, pending: row && row.state ? row.state.pending || 0 : 0, lastSync: row && row.state && row.state.lastSync != null ? tsOf(row.state.lastSync) : null, hasState: !!(row && row.state && row.state.cfg && row.state.cfg.plots && row.state.cfg.plots.length), t: row ? row.t : null, ts: row && row.t != null ? tsOf(row.t) : null });
      }
      case 'hello': {
        const row = await deps.load(farmId);
        if (!row || !row.state || !row.state.cfg || !(row.state.cfg.plots || []).length) return fail(404, 'sem_dados', { hint: 'A fazenda ainda não enviou dados.' });
        const ctx = build(row), h = ctx.gw.hello(); h.farm = farmInfo;
        return reply(200, { ok: true, hello: h, t: row.t, farmAgeSec: row.last_ingest_at ? Math.round((now - Date.parse(row.last_ingest_at)) / 1000) : null });
      }
      case 'ingest': {
        if (!gestor) return fail(403, 'somente o gestor alimenta o gateway');
        const result = await transact(farmId, async row => {
          const ctx = build(row), gw = ctx.gw;
          gw.cfg.farm = farmInfo;
          const up = !(b.net && b.net.gateway === false);
          if (!ctx.gwUp && up && b.t != null) Object.keys(gw.lastSeen).forEach(k => { gw.lastSeen[k] = b.t; });   // o gateway da fazenda voltou: dá um tempo para os dispositivos reaparecerem
          if (b.config) gw.configure(Object.assign({}, b.config, { farm: farmInfo }));
          if (!gw.cfg.plots.length) return { abort: true, result: fail(409, 'sem_config', { hint: 'Envie config (talhões e dispositivos) no primeiro ingest.' }) };
          const advance = t => { let c = ctx.tickAt == null ? Math.floor(t) - 1 : ctx.tickAt, n = 0; while (c < Math.floor(t) && n < 1600) { c++; gw.tick(c); n++; } ctx.tickAt = c; };
          if (gw.lastSync === 0 && b.t != null) gw.lastSync = b.t;
          (b.readings || []).slice().sort((x, y) => x.t - y.t).forEach(r => { advance(r.t); gw.ingest(r); });
          if (b.t != null) advance(b.t);
          (b.acks || []).forEach(a => gw.complete(a.cid, { ok: !!a.ok, text: String(a.text || '') }));
          if (b.forecast) gw.setForecast(b.forecast);
          const internet = !(b.net && b.net.internet === false);
          ctx.gwUp = up;
          const acts = ctx.actQ.splice(0);                                         // ordens pendentes para o controlador
          ctx.outApp.push({ type: 'heartbeat', ts: tsOf(gw.now), payload: { gateway: ctx.gwUp ? 'online' : 'offline', internet, pending: gw.pending, lastSync: tsOf(gw.lastSync), running: !!(b.sim && b.sim.running), speed: b.sim ? b.sim.speed : 0 } });
          return { ctx, ts: now, row: { state: ctx.save(), t: gw.now, internet, last_ingest_at: new Date(now).toISOString() }, result: reply(200, { ok: true, t: gw.now, actuate: acts, state: b.want_state ? ctx.save() : undefined }) };
        });
        return result;
      }
      case 'command': {
        const cmd = b.cmd, cid = b.cid;
        if (!COMMANDS.has(cmd)) return fail(400, 'comando desconhecido');
        if (cmd === 'settings.update' && !gestor) return reply(200, { ok: false, error: 'perfil', text: 'Somente o gestor altera limiares e regras.' });
        return await transact(farmId, async row => {
          if (!row || !row.state || !row.state.cfg) return { abort: true, result: reply(200, { ok: false, error: 'sem_dados', text: 'O gateway ainda não recebeu dados da fazenda.' }) };
          if (row.internet === false) return { abort: true, result: reply(200, { ok: false, error: 'local', text: 'A fazenda está sem internet — use a rede local.' }) };
          const ctx = build(row), gw = ctx.gw, age = row.last_ingest_at ? (now - Date.parse(row.last_ingest_at)) / 1000 : 1e9;
          if (ACTUATING.has(cmd) && age > STALE_FARM_SEC) {
            ctx.outApp.push({ type: 'command.ack', ts: tsOf(gw.now), payload: { cid, cmd, ok: false, text: 'A fazenda não responde há ' + Math.round(age) + ' s — o comando NÃO foi enviado. Confira os equipamentos.' } });
            return { ctx, ts: now, row: null, result: reply(200, { ok: false, error: 'fazenda_sem_sinal' }), skipSave: true };
          }
          gw.command({ cid, cmd, args: b.args || {} });
          ctx.outApp.push({ type: 'command', ts: tsOf(gw.now), payload: { cid, cmd, args: b.args || {}, by: user.id, role: mem.role } });
          return { ctx, ts: now, row: { state: ctx.save(), t: row.t, internet: row.internet, last_ingest_at: row.last_ingest_at }, result: reply(200, { ok: true }) };
        });
      }
      case 'sync': {
        if (!gestor) return fail(403, 'somente o gestor');
        if (!b.state || typeof b.state !== 'object') return fail(400, 'state obrigatório');
        for (let i = 0; i < 4; i++) {
          const row = await deps.load(farmId), st = clone(b.state); st.tickAt = Math.floor(b.t != null ? b.t : (st.now || 0));
          if (await deps.save(farmId, row ? row.version : null, { state: st, t: b.t != null ? b.t : st.now, internet: true, last_ingest_at: new Date(now).toISOString() })) return reply(200, { ok: true });
        }
        return fail(409, 'conflito');
      }
      case 'reset': {
        if (!gestor) return fail(403, 'somente o gestor');
        await deps.remove(farmId); return reply(200, { ok: true });
      }
      default: return fail(400, 'op desconhecida');
    }
  };
}
