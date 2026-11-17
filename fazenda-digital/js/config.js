/* Configuração da Fazenda Digital. Parâmetros de URL têm prioridade (?farm=jacutinga&transport=broadcast&app=...).
   Local (localhost): transporte 'broadcast' (abas da mesma origem, sem login).
   Hospedado: transporte 'supabase' (login por link mágico; só membros da fazenda). */
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
window.FARM_CONFIG = {
  farmId: 'f1',                                  // só no transporte 'broadcast'; no supabase vem do banco
  transport: LOCAL ? 'broadcast' : 'supabase',
  appUrl: LOCAL ? '../app-oficial/index.html' : 'https://raiz-app.vercel.app/',   // ajuste para o endereço público do app
  seed: 20261117
};

/* Supabase (projeto "raiz"). A chave "anon" é pública por desenho: quem protege os dados é a RLS do banco
   (só membros da fazenda leem/enviam). NUNCA coloque aqui a chave service_role. */
window.RAIZ_SUPABASE = {
  url: 'https://jodgchdwpnwuirhsrtvh.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGdjaGR3cG53dWlyaHNydHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDg0MjksImV4cCI6MjExMDA4NDQyOX0.tPTrLDJ8fgR8c43Vjz9uSNy1uskwiXl1hfnsBTiv7bk'
};
