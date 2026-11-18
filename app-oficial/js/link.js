/* RaizLink — canal de mensagens entre a fazenda (dispositivos + gateway) e o app.
   O MESMO arquivo existe em fazenda-digital/js e app-oficial/js (cada pasta é hospedada de forma independente).
   Contrato das mensagens: docs/PROTOCOLO.md.

   Envelope:  { v:1, id, src:'farm'|'app', farm:'f1', type, ts, payload }
     ts = horário do emissor. Na fazenda é o relógio da fazenda (simulado); no app é Date.now().

   Transportes (adaptadores com a mesma interface: send(msg) · subscribe(fn) · close()):
     • broadcast — BroadcastChannel (abas/iframes da mesma origem). Usado no ambiente de teste local.
     • supabase  — Realtime Broadcast privado do Supabase (canal "farm:<id da fazenda>"), com login por link mágico.
                   Só membros da fazenda (tabela farm_members, RLS) enviam/recebem. Config em window.RAIZ_SUPABASE = { url, key }.
   link.ready resolve quando o canal está pronto: { farm:{id,slug,name,city}, role, email } (no broadcast: {}).
   link.invoke(fn, body) chama uma Edge Function (só supabase); link.sb é o cliente supabase-js. */
(function () {
  'use strict';
  const V = 1;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function broadcast(o) {
    const subs = new Set(), name = 'raiz:' + o.farmId, key = name + ':msg';
    const deliver = m => { if (m && m.v === V && m.farm === o.farmId && m.src !== o.role) subs.forEach(f => { try { f(m); } catch (e) { console.error('[RaizLink]', e); } }); };
    let bc = null, onStorage = null;
    if ('BroadcastChannel' in window) { bc = new BroadcastChannel(name); bc.onmessage = e => deliver(e.data); }
    else { onStorage = e => { if (e.key === key && e.newValue) { try { deliver(JSON.parse(e.newValue)); } catch (x) { } } }; window.addEventListener('storage', onStorage); }
    return {
      name: 'broadcast',
      send(m) { if (bc) bc.postMessage(m); else { try { localStorage.setItem(key, JSON.stringify(m)); } catch (e) { } } },
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      close() { if (bc) bc.close(); if (onStorage) window.removeEventListener('storage', onStorage); subs.clear(); }
    };
  }

  /* ---------- Supabase ---------- */
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const LOGGED = new Set(['alert.new', 'alert.update', 'command', 'command.ack', 'run.log']);       // vão também para a tabela farm_events
  const NOISY = new Set(['telemetry', 'heartbeat', 'app.ping']);
  const loadLib = () => new Promise((ok, fail) => {
    if (window.supabase && window.supabase.createClient) return ok();
    const s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = () => fail(new Error('Não foi possível carregar o Supabase (sem internet?).')); document.head.appendChild(s);
  });
  const FIELD = 'width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #25372f;background:#15211b;color:inherit;font:inherit;margin-bottom:10px';
  const BTN = 'width:100%;padding:14px;border:0;border-radius:12px;font:inherit;font-weight:800;cursor:pointer;margin-bottom:10px;';
  function gateUI() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d1612;color:#e8f1ec;display:grid;place-items:center;padding:24px;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:auto';
    ov.innerHTML = '<div style="width:100%;max-width:360px;text-align:center"><div style="font-size:28px;font-weight:800;letter-spacing:-.3px">Raiz</div><p id="gm" style="color:#93a69b;margin:8px 0 20px">Entre com seu e-mail e senha. No primeiro acesso, toque em “Criar conta”: a conta e a sua fazenda são criadas na hora, sem confirmar o e-mail.</p>'
      + '<form id="gf"><input id="ge" type="email" required autocomplete="email" placeholder="seu@email.com" style="' + FIELD + '">'
      + '<input id="gp" type="password" required minlength="6" autocomplete="current-password" placeholder="Senha (mínimo 6 caracteres)" style="' + FIELD + '">'
      + '<button id="gb" style="' + BTN + 'background:#4cbf80;color:#07130d">Entrar</button>'
      + '<button id="gc" type="button" style="' + BTN + 'background:#25372f;color:inherit">Criar conta</button>'
      + '<button id="gl" type="button" style="width:100%;padding:8px;border:0;background:none;color:#93a69b;font:inherit;font-size:14px;text-decoration:underline;cursor:pointer">Receber link de acesso por e-mail (sem senha)</button></form></div>';
    document.body.appendChild(ov); return ov;
  }
  const authMsg = m => /invalid login/i.test(m) ? 'E-mail ou senha incorretos. Se ainda não tem conta, toque em “Criar conta”.' : /already registered|already been registered/i.test(m) ? 'Este e-mail já tem conta. Use “Entrar”.' : /rate/i.test(m) ? 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.' : /password/i.test(m) ? 'Senha inválida: use pelo menos 6 caracteres.' : /invalid/i.test(m) ? 'E-mail inválido.' : m;
  function supabaseT(o, ctx) {
    const cfg = window.RAIZ_SUPABASE || {}, subs = new Set(), queue = [], win = []; let sb = null, ch = null, up = false, gate = null, info = {};
    let okReady, badReady; const ready = new Promise((a, b) => { okReady = a; badReady = b; }); ready.catch(() => { });
    const say = (txt, err) => { if (gate) { const m = gate.querySelector('#gm'); m.textContent = txt; m.style.color = err ? '#ef7a6d' : '#93a69b'; } };
    const deliver = m => { if (m && m.v === V && m.src !== o.role && m.farm === ctx.farmId) subs.forEach(f => { try { f(m); } catch (e) { console.error('[RaizLink]', e); } }); };
    function askLogin() {
      return new Promise(resolve => {
        gate = gate || gateUI(); const form = gate.querySelector('#gf'), q = id => gate.querySelector(id);
        sb.auth.onAuthStateChange((ev, ses) => { if (ses && ses.user) resolve(ses); });
        const busy = (on, el, txt) => { ['#gb', '#gc', '#gl'].forEach(i => q(i).disabled = on); if (el) el.textContent = on ? 'Aguarde…' : txt; };
        const creds = () => ({ email: q('#ge').value.trim(), password: q('#gp').value });
        form.onsubmit = async e => {
          e.preventDefault(); busy(true, q('#gb')); const { error } = await sb.auth.signInWithPassword(creds()); busy(false, q('#gb'), 'Entrar');
          if (error) say(authMsg(error.message), true);
        };
        q('#gc').onclick = async () => {
          if (!form.reportValidity()) return;
          busy(true, q('#gc')); const { data, error } = await sb.auth.signUp(creds()); busy(false, q('#gc'), 'Criar conta');
          if (error) say(authMsg(error.message), true);
          else if (!data.session) say('Conta criada, mas o projeto ainda exige confirmação por e-mail. Peça ao responsável para desligar a confirmação no Supabase.', true);
        };
        q('#gl').onclick = async () => {
          if (!q('#ge').reportValidity()) return;
          const email = q('#ge').value.trim(); busy(true, q('#gl'));
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } }); busy(false, q('#gl'), 'Receber link de acesso por e-mail (sem senha)');
          if (error) say(/rate/i.test(error.message) ? 'Limite de e-mails do projeto atingido. Entre com e-mail e senha.' : 'Não foi possível enviar: ' + error.message, true);
          else say('Enviamos um link para ' + email + '. Abra-o neste mesmo navegador.');
        };
      });
    }
    /* primeira vez: a pessoa ainda não tem fazenda -> cria a própria (vira gestora) */
    function askFarm() {
      return new Promise(resolve => {
        gate = gate || gateUI();
        gate.querySelector('#gf').outerHTML = '<form id="ff"><input id="fn" required maxlength="60" placeholder="Nome da fazenda (ex.: Fazenda Jacutinga)" style="' + FIELD + '">'
          + '<input id="fc" maxlength="60" placeholder="Cidade (opcional)" style="' + FIELD + '">'
          + '<button id="fb" style="' + BTN + 'background:#4cbf80;color:#07130d">Criar minha fazenda</button>'
          + '<button id="fo" type="button" style="' + BTN + 'background:#25372f;color:inherit">Sair</button></form>';
        say('Conta criada. Falta só o nome da sua fazenda.');
        gate.querySelector('#fo').onclick = () => out();
        gate.querySelector('#ff').onsubmit = async e => {
          e.preventDefault(); const b = gate.querySelector('#fb'); b.disabled = true; b.textContent = 'Criando…';
          const { error } = await sb.rpc('create_farm', { p_name: gate.querySelector('#fn').value, p_city: gate.querySelector('#fc').value });
          if (error) { b.disabled = false; b.textContent = 'Criar minha fazenda'; say(error.message, true); } else resolve();
        };
      });
    }
    async function init() {
      if (!cfg.url || !cfg.key) throw new Error('Supabase não configurado (RAIZ_SUPABASE).');
      await loadLib();
      sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, realtime: { params: { eventsPerSecond: 40 } } });
      let { data: { session } } = await sb.auth.getSession();
      if (!session) session = await askLogin();
      const wanted = new URLSearchParams(location.search).get('farm');
      const pick = fs => (fs || []).find(f => f.slug === wanted) || (fs || [])[0];
      let { data: farms, error } = await sb.from('farms').select('id,slug,name,city');
      if (error) throw error;
      let farm = pick(farms);
      while (!farm) {
        await askFarm();
        ({ data: farms, error } = await sb.from('farms').select('id,slug,name,city'));
        if (error) throw error; farm = pick(farms);
      }
      const { data: mem } = await sb.from('farm_members').select('role').eq('farm_id', farm.id).eq('user_id', session.user.id).maybeSingle();
      ctx.farmId = farm.id; info = { farm, role: (mem && mem.role) || 'operador', email: session.user.email };
      sb.realtime.setAuth(session.access_token);
      ch = sb.channel('farm:' + farm.id, { config: { private: true, broadcast: { self: false, ack: false } } });
      ch.on('broadcast', { event: 'msg' }, e => deliver(e.payload));
      ch.subscribe((st, err) => {
        if (st === 'SUBSCRIBED') { up = true; if (gate) { gate.remove(); gate = null; } while (queue.length) push(queue.shift()); okReady(info); }
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { console.error('[RaizLink] canal', st, err); if (!up) badReady(new Error('canal ' + st)); }
      });
      sb.auth.onAuthStateChange((ev, ses) => { if (ses) sb.realtime.setAuth(ses.access_token); });
    }
    const out = () => (sb ? sb.auth.signOut() : Promise.resolve()).then(() => location.reload());
    function push(m) {
      const now = Date.now(); while (win.length && now - win[0] > 1000) win.shift();
      if (NOISY.has(m.type) && win.length > 30) return;                         // protege o limite de mensagens por segundo
      win.push(now); ch.send({ type: 'broadcast', event: 'msg', payload: m });
      if (LOGGED.has(m.type)) sb.from('farm_events').insert({ farm_id: ctx.farmId, src: o.role, type: m.type, payload: m.payload }).then(r => { if (r.error) console.warn('[RaizLink] log', r.error.message); });
    }
    init().catch(e => { console.error('[RaizLink]', e); if (!gate) gate = gateUI(); say('Falha ao conectar: ' + e.message, true); badReady(e); });
    /* chama uma Edge Function com o login do usuário; respostas de erro HTTP voltam como objeto (com _status) */
    async function invoke(fn, body) {
      await ready; const r = await sb.functions.invoke(fn, { body });
      if (r.error) { let b = null; try { b = await r.error.context.json(); } catch (e) { } if (b) { b._status = r.error.context.status; return b; } throw r.error; }
      return r.data;
    }
    return {
      name: 'supabase', ready, signOut: out, invoke, get sb() { return sb; },
      send(m) { if (up) push(m); else if (queue.length < 200) queue.push(m); },
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      close() { if (ch && sb) sb.removeChannel(ch); subs.clear(); }
    };
  }

  const transports = { broadcast, supabase: supabaseT };

  window.RaizLink = {
    version: V,
    transports,
    /* RaizLink.open({ farmId, role:'farm'|'app', transport:'broadcast' }) */
    open(o) {
      const opts = Object.assign({ farmId: 'f1', transport: 'broadcast' }, o);
      const make = transports[opts.transport];
      if (!make) throw new Error('Transporte "' + opts.transport + '" não está disponível nesta versão.');
      const ctx = { farmId: opts.farmId }, raw = make(opts, ctx), subs = new Set(), taps = new Set(), stats = { sent: 0, received: 0 };
      raw.subscribe(m => { stats.received++; subs.forEach(f => f(m)); taps.forEach(f => f('in', m)); });
      return {
        role: opts.role, get farmId() { return ctx.farmId; }, transport: raw.name || opts.transport, stats,
        ready: raw.ready || Promise.resolve({}), signOut: raw.signOut || (() => Promise.resolve()),
        invoke: raw.invoke || (() => Promise.reject(new Error('Edge Functions só com o transporte supabase.'))), get sb() { return raw.sb || null; },
        send(type, payload, ts) {
          const m = { v: V, id: uid(), src: opts.role, farm: ctx.farmId, type, ts: ts || Date.now(), payload: payload == null ? null : payload };
          stats.sent++; raw.send(m); taps.forEach(f => f('out', m)); return m;
        },
        on(f) { subs.add(f); return () => subs.delete(f); },
        tap(f) { taps.add(f); return () => taps.delete(f); },      // observa entrada e saída (usado no log de sinais)
        close() { raw.close(); subs.clear(); taps.clear(); }
      };
    }
  };
})();
