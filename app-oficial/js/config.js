/* Configuração do app. Parâmetros de URL têm prioridade (?live  ?mock  ?farm=f1  ?transport=broadcast).
   mode 'mock'  → dados de exemplo (desenvolvimento de interface).
   mode 'live'  → recebe dados e envia comandos pelo canal (js/live.js) — fazenda digital hoje, Supabase depois.
   Na integração nativa/real: use mode 'live' com transport 'supabase', ou defina RAIZ_MOCK=false e use Raiz.setState. */
window.RAIZ_CONFIG = {
  mode: 'mock',
  transport: 'broadcast',        // 'broadcast' (teste local, mesma origem) | 'supabase' (próxima etapa)
  farmId: 'f1',
  devPin: '1234'                 // PIN do ambiente de teste (só vale sem ponte nativa; o PIN real é validado no nativo)
};
