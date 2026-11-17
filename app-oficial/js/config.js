/* Configuração do app. Parâmetros de URL têm prioridade (?live  ?mock  ?farm=jacutinga  ?transport=broadcast).
   mode 'mock'  → dados de exemplo (desenvolvimento de interface).
   mode 'live'  → recebe dados e envia comandos pelo canal (js/live.js).
   Local (localhost): modo exemplo por padrão; com ?live usa o transporte 'broadcast' (Fazenda Digital local).
   Hospedado: modo 'live' com transporte 'supabase' (login por link mágico). */
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
window.RAIZ_CONFIG = {
  mode: LOCAL ? 'mock' : 'live',
  transport: LOCAL ? 'broadcast' : 'supabase',
  farmId: 'f1',                  // só no transporte 'broadcast'
  devPin: '1234'                 // PIN do ambiente de teste local (só vale sem ponte nativa e sem Supabase)
};

/* Supabase (projeto "raiz"). A chave "anon" é pública por desenho: quem protege os dados é a RLS do banco
   (só membros da fazenda leem/enviam). NUNCA coloque aqui a chave service_role. */
window.RAIZ_SUPABASE = {
  url: 'https://jodgchdwpnwuirhsrtvh.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGdjaGR3cG53dWlyaHNydHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDg0MjksImV4cCI6MjExMDA4NDQyOX0.tPTrLDJ8fgR8c43Vjz9uSNy1uskwiXl1hfnsBTiv7bk'
};
