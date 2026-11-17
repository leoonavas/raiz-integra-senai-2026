/* RaizLink — canal de mensagens entre a fazenda (dispositivos + gateway) e o app.
   O MESMO arquivo existe em fazenda-digital/js e app-oficial/js (cada pasta é hospedada de forma independente).
   Contrato das mensagens: docs/PROTOCOLO.md.

   Envelope:  { v:1, id, src:'farm'|'app', farm:'f1', type, ts, payload }
     ts = horário do emissor. Na fazenda é o relógio da fazenda (simulado); no app é Date.now().

   Transportes (adaptadores com a mesma interface: send(msg) · subscribe(fn) · close()):
     • broadcast — BroadcastChannel (abas/iframes da mesma origem). Usado no ambiente de teste local.
     • supabase  — Realtime do Supabase (canal "farm:<id>"). Próxima etapa: basta registrar o adaptador em
                   RaizLink.transports.supabase = opts => ({ send, subscribe, close }) sem mexer nas telas. */
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

  const transports = { broadcast };

  window.RaizLink = {
    version: V,
    transports,
    /* RaizLink.open({ farmId, role:'farm'|'app', transport:'broadcast' }) */
    open(o) {
      const opts = Object.assign({ farmId: 'f1', transport: 'broadcast' }, o);
      const make = transports[opts.transport];
      if (!make) throw new Error('Transporte "' + opts.transport + '" não está disponível nesta versão.');
      const raw = make(opts), subs = new Set(), taps = new Set(), stats = { sent: 0, received: 0 };
      raw.subscribe(m => { stats.received++; subs.forEach(f => f(m)); taps.forEach(f => f('in', m)); });
      return {
        role: opts.role, farmId: opts.farmId, transport: raw.name || opts.transport, stats,
        send(type, payload, ts) {
          const m = { v: V, id: uid(), src: opts.role, farm: opts.farmId, type, ts: ts || Date.now(), payload: payload == null ? null : payload };
          stats.sent++; raw.send(m); taps.forEach(f => f('out', m)); return m;
        },
        on(f) { subs.add(f); return () => subs.delete(f); },
        tap(f) { taps.add(f); return () => taps.delete(f); },      // observa entrada e saída (usado no log de sinais)
        close() { raw.close(); subs.clear(); taps.clear(); }
      };
    }
  };
})();
