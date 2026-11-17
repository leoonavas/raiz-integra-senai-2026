/* Configuração da Fazenda Digital. Parâmetros de URL têm prioridade (?farm=f1&transport=broadcast&app=...).
   Na próxima etapa (hospedagem + Supabase): transport:'supabase' e appUrl com o endereço público do app. */
window.FARM_CONFIG = {
  farmId: 'f1',
  transport: 'broadcast',                       // 'broadcast' (local, mesma origem) | 'supabase' (próxima etapa)
  appUrl: '../app-oficial/index.html',          // app embutido ao lado da fazenda
  seed: 20261117
};
