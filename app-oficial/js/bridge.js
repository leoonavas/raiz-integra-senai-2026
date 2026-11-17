/* Ponte WebView ⇄ app nativo.
   Web → nativo: Bridge.emit(tipo, dados) envia JSON {type,payload,ts} para o canal disponível:
     • React Native / Expo:  window.ReactNativeWebView.postMessage(json)
     • iOS (WKWebView):      window.webkit.messageHandlers.raiz.postMessage(json)
     • Android (WebView):    window.RaizAndroid.postMessage(json)   (addJavascriptInterface)
     • navegador:            apenas console (modo desenvolvimento)
   Nativo → web: window.Raiz.setState(parcial) mescla o estado e redesenha;
                 window.Raiz.receive({type, payload}) para eventos (ex.: 'alert.new', 'toast'). */
(function () {
  const sent = [], listeners = [];
  const Bridge = {
    sent,
    on(fn) { listeners.push(fn); },                       // ouvintes locais (ex.: js/live.js envia comandos à fazenda)
    emit(type, payload) {
      const msg = JSON.stringify({ type, payload: payload ?? null, ts: Date.now() });
      sent.unshift(`${new Date().toLocaleTimeString('pt-BR')} ${type} ${payload ? JSON.stringify(payload, (k, v) => (k === 'pin' ? '••••' : v)) : ''}`); sent.length = Math.min(sent.length, 8);
      try {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.raiz) window.webkit.messageHandlers.raiz.postMessage(msg);
        else if (window.RaizAndroid) window.RaizAndroid.postMessage(msg);
        else console.info('[Raiz bridge]', type, payload);
      } catch (e) { console.warn('[Raiz bridge] falha ao enviar', e); }
      listeners.forEach(fn => { try { fn(type, payload); } catch (e) { console.warn('[Raiz bridge] ouvinte', e); } });
      if (window.RaizUI && window.RaizUI.onEmit) window.RaizUI.onEmit();
    }
  };
  window.RaizBridge = Bridge;
})();
