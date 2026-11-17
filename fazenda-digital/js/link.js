/* RaizLink — canal de mensagens entre a fazenda (dispositivos + gateway) e o app.
   O MESMO arquivo existe em fazenda-digital/js e app-oficial/js (cada pasta é hospedada de forma independente).
   Contrato das mensagens: docs/PROTOCOLO.md.

   Envelope:  { v:1, id, src:'farm'|'app', farm:'f1', type, ts, payload }
     ts = horário do emissor. Na fazenda é o relógio da fazenda (simulado); no app é Date.now().

   Transportes (adaptadores com a mesma interface: send(msg) · subscribe(fn) · close()):
     • broadcast — BroadcastChannel (abas/iframes da mesma origem). Usado no ambiente de teste local.
     • supabase  — Realtime Broadcast privado do Supabase (canal "farm:<id da fazenda>"), com login por link mágico.
                   Só membros da fazenda (tabela farm_members, RLS) enviam/recebem. Config em window.RAIZ_SUPABASE = { url, key }.
   link.ready resolve quando o canal está pronto: { farm:{id,slug,name,city}, role, email } (no broadcast: {}). */
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
  function gateUI() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d1612;color:#e8f1ec;display:grid;place-items:center;padding:24px;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    ov.innerHTML = '<div style="width:100%;max-width:360px;text-align:center"><div style="font-size:28px;font-weight:800;letter-spacing:-.3px">Raiz</div><p id="gm" style="color:#93a69b;margin:8px 0 20px">Entre com o e-mail cadastrado na fazenda. Enviaremos um link de acesso, sem senha.</p>'
      + '<form id="gf"><input id="ge" type="email" required autocomplete="email" placeholder="seu@email.com" style="width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #25372f;background:#15211b;color:inherit;font:inherit;margin-bottom:10px">'
      + '<button id="gb" style="width:100%;padding:14px;border:0;border-radius:12px;background:#4cbf80;color:#07130d;font:inherit;font-weight:800;cursor:pointer">Enviar link de acesso</button></form></div>';
    document.body.appendChild(ov); return ov;
  }
  function supabaseT(o, ctx) {
    const cfg = window.RAIZ_SUPABASE || {}, subs = new Set(), queue = [], win = []; let sb = null, ch = null, up = false, gate = null, info = {};
    let okReady, badReady; const ready = new Promise((a, b) => { okReady = a; badReady = b; }); ready.catch(() => { });
    const say = (txt, err) => { if (gate) { const m = gate.querySelector('#gm'); m.textContent = txt; m.style.color = err ? '#ef7a6d' : '#93a69b'; } };
    const deliver = m => { if (m && m.v === V && m.src !== o.role && m.farm === ctx.farmId) subs.forEach(f => { try { f(m); } catch (e) { console.error('[RaizLink]', e); } }); };
    function askLogin() {
      return new Promise(resolve => {
        gate = gate || gateUI(); const form = gate.querySelector('#gf'), btn = gate.querySelector('#gb');
        sb.auth.onAuthStateChange((ev, ses) => { if (ses && ses.user) resolve(ses); });
        form.onsubmit = async e => {
          e.preventDefault(); btn.disabled = true; btn.textContent = 'Enviando…';
          const email = gate.querySelector('#ge').value.trim();
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
          btn.disabled = false; btn.textContent = 'Enviar link de acesso';
          if (error) say(/rate/i.test(error.message) ? 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.' : 'Não foi possível enviar: ' + error.message, true);
          else say('Enviamos um link para ' + email + '. Abra-o neste mesmo navegador.');
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
      const { data: farms, error } = await sb.from('farms').select('id,slug,name,city');
      if (error) throw error;
      const farm = (farms || []).find(f => f.slug === wanted) || (farms || [])[0];
      if (!farm) { gate = gate || gateUI(); gate.querySelector('#gf').innerHTML = '<button id="go" style="width:100%;padding:14px;border:0;border-radius:12px;background:#25372f;color:inherit;font:inherit;font-weight:700;cursor:pointer">Sair</button>'; gate.querySelector('#go').onclick = () => out(); say('Este e-mail ainda não está vinculado a nenhuma fazenda. Peça o convite ao gestor.', true); throw new Error('sem fazenda'); }
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
    init().catch(e => { console.error('[RaizLink]', e); if (!gate) gate = gateUI(); if (e.message !== 'sem fazenda') say('Falha ao conectar: ' + e.message, true); badReady(e); });
    return {
      name: 'supabase', ready, signOut: out,
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
