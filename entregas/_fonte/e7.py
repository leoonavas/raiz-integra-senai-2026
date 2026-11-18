from mini import Doc
from dados import *
from xl import planilha

CAMPOS = ['Nº', 'Data', 'Ferramenta de IA', 'Objetivo do uso', 'Prompt utilizado (resumo)', 'Resposta gerada (síntese)', 'Análise crítica da equipe', 'Validação humana realizada', 'Decisão final', 'Justificativa', 'Fontes verificadas']

# Cada linha segue os campos acima. Só consta o que foi efetivamente feito; o que ainda falta aparece como "Pendente".
REG = [
 ['1', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Analisar o Regulamento, o Caderno de Templates e o Guia de Tecnologias e adaptar o projeto às 8 entregas.',
  'Pedido de adaptação dos documentos do projeto ao regulamento do INTEGRA SENAI 2026.', 'Matriz de aderência entre o relatório da semifinal e o regulamento e um primeiro dossiê com campos pendentes.',
  'Limitação: o primeiro dossiê usava campos de preenchimento coloridos, deixava lacunas e tinha fontes ainda por conferir.', 'A equipe pediu a refação das entregas em formato sóbrio e justificado (18/11/2026). Conferência de artigos do regulamento: feita na refação.',
  'Adaptado', 'O conteúdo foi reaproveitado e substituído pelas versões das Entregas 1 a 8.', 'Regulamento v3, Caderno e Guia (arquivos oficiais).'],
 ['2', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Codificar o MVP digital em HTML, CSS e JavaScript (simulador com demonstração, operação e modo offline).',
  'Pedido de construção de um MVP e de um site demonstrável do Raiz.', 'Código do MVP digital (pasta mvp-digital) com as funções F1, F2 e F3 simuladas.',
  'O código é funcional, mas as regras e os limiares são valores de partida, não calibrados em campo.', 'O MVP foi executado durante o desenvolvimento e serviu de base do aplicativo. Pendente: revisão formal do código pela equipe. Limitações registradas na Entrega 6.',
  'Adaptado', 'Serviu de base; a arquitetura final passou a ser app, fazenda digital e gateway.', 'Execução do código pela equipe; leitura do código.'],
 ['3', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Criar a interface do aplicativo oficial (HTML para WebView) a partir das referências visuais fornecidas.',
  'Pedido de interface do app seguindo o padrão visual oficial da equipe.', 'Aplicativo com abas de início, irrigação, alertas, rede e configurações, em tema claro e escuro.',
  'A interface mostra dados simulados; precisa ser testada com operadores reais (T4).', 'A equipe pediu a execução do app oficial e solicitou ajustes. Pendente: teste com operadores reais (T4).', 'Adaptado', 'Usado com ajustes pedidos pela equipe.', 'Teste manual pela equipe.'],
 ['4', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Criar a fazenda digital (fazenda simulada em HTML) que emite sinais de dispositivos e recebe comandos, e adaptar o app para receber esses dados.',
  'Pedido de uma fazenda desenhada em HTML, com dia e noite, clima, lavoura e comandos de irrigação, para testar o app sem alterá-lo.', 'Fazenda digital em SVG e modo "live" do aplicativo.',
  'É uma simulação: não substitui dados de campo. O desenho dos sinais segue o protocolo documentado.', 'A equipe testou a fazenda e o app e relatou defeitos (ver registro 6).', 'Utilizado', 'Atende ao objetivo de ambiente controlado de testes.', 'Execução e teste pela equipe.'],
 ['5', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Hospedar o app e a fazenda (Vercel) e integrar o banco e a autenticação (Supabase), com conta de teste.',
  'Pedido de vínculo com Vercel e Supabase e criação de conta de teste por link mágico.', 'Projeto Supabase com tabelas e regras de acesso por linha; publicação do app e da fazenda; convite de teste.',
  'Há configurações que só o titular da conta pode concluir (endereços de redirecionamento de autenticação). Dados de acesso não foram colocados no código.', 'A equipe autorizou logins pela linha de comando (Vercel e Supabase) e escolheu o método de acesso por link mágico. Pendente: a equipe testar o fluxo hospedado completo.',
  'Adaptado', 'Usado; configuração final de autenticação fica com a equipe.', 'Painéis do Supabase e do Vercel; testes de acesso.'],
 ['6', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Corrigir defeitos achados nos testes: conexão do gateway caindo, alertas que não chegavam, umidade e bomba com valores errados no modo nuvem.',
  'Relatos da equipe: "o gateway cai", "os alertas não chegam", "a umidade oscila e a bomba aparece sempre ligada".', 'Gateway na nuvem (Edge Function) com alternativa local; alertas para toda ação do usuário; posse única da fazenda e filtro por origem; correção dos cenários de entupimento e vazamento.',
  'Os defeitos foram achados pela equipe em uso real; a IA propôs as correções, que precisam de novos ensaios formais (T1 a T3).', 'A equipe repetiu os testes depois de cada correção ("vou testar agora") e relatou novos defeitos até a estabilização.', 'Adaptado', 'Correções aceitas; ensaios formais pendentes.', 'Testes manuais repetidos pela equipe.'],
 ['7', '17/11/2026', 'Claude (Anthropic), via Claude Code', 'Adicionar modo imersivo à fazenda digital (esconder cabeçalho e opções).', 'Pedido da equipe após captura de tela do problema.', 'Modo imersivo com atalhos de teclado.', 'Funcionalidade de apresentação, sem impacto nas regras.', 'Pedido originado por observação da equipe na tela da fazenda. Pendente: conferência final registrada.', 'Utilizado', 'Melhora a demonstração em vídeo.', 'Teste manual.'],
 ['8', '17/11/2026 a 18/11/2026', 'Claude (Anthropic), via Claude Code', 'Pesquisar dados públicos e redigir o texto de Problema, Público e Pesquisa do pitch.',
  'Pedido de texto reformulado com dados da internet, porque a equipe não conhece produtores.', 'Texto com dados da ANA e do IBGE e declaração de que não houve entrevistas.',
  'O dado de irrigação tem dois anos de referência na ANA (50,5% em 2022 e 50,3% em 2024), e o dado de área de cana irrigada inclui irrigação combinada com água de reúso; isso exigiu reconferir as fontes.', 'Os números foram reconferidos nas páginas oficiais em 18/11/2026. A equipe aprovou o texto do pitch, que usa o dado de 2022; as entregas usam o dado mais recente (2024). Pendente: alinhar o vídeo.', 'Adaptado', 'Dados corrigidos e fontes citadas.', 'ANA (2026); ANA (2019); IBGE (2025).'],
 ['9', '18/11/2026', 'Claude (Anthropic), via Claude Code; whisper.cpp (modelo de transcrição executado no computador da equipe)', 'Editar o vídeo de pitch: transcrever as gravações, mapear erros de fala, cortar, compor gráficos e legendas.',
  'Pedido de edição como editor sênior, com mapeamento de erros de gravação e planejamento de cenas.', 'Plano de edição, cortes, gráficos animados, legendas, composições e vídeo final.',
  'A transcrição automática e os tempos de palavras tinham erros que cortaram frases; foi necessário refazer cortes usando a energia do áudio e conferir cada trecho por nova transcrição.', 'A equipe assistiu ao vídeo, listou 15 problemas (cortes de frases, áudio vazado, legenda divergente) e eles foram corrigidos; o limite de 5 minutos foi respeitado.', 'Adaptado', 'Versão 4 do vídeo atende às correções pedidas; a cena de abertura do problema aguarda regravação.', 'Conferência da fala por transcrição de cada cena; revisão da equipe.'],
 ['10', '18/11/2026', 'Voz neural da Microsoft (pt-BR-AntonioNeural) via pacote edge-tts; vozes do macOS (testadas)', 'Gerar narração sintética das cenas sem fala gravada.',
  'Textos das narrações (escritos e revisados pela equipe) enviados ao serviço de síntese de voz.', 'Arquivos de áudio de narração.', 'Vozes do macOS soaram robotizadas; a voz neural foi mais natural. O texto enviado ao serviço é conteúdo público do pitch e não contém dados pessoais.', 'A equipe ouviu as amostras, escolheu a voz Antonio e aprovou o vídeo. A tela final do vídeo informa que a narração foi gerada por IA.', 'Utilizado (macOS: descartado)', 'Voz neural escolhida pela equipe; aviso de IA incluído.', 'Revisão do texto narrado contra o roteiro.'],
 ['11', '18/11/2026', 'Claude (Anthropic), via Claude Code', 'Pesquisar fontes e redigir as Entregas 1 a 8 em formato sóbrio, com justificativa e referências.',
  'Pedido de produção dos documentos exigidos pelo regulamento, justificados e sem elementos coloridos.', 'Documentos em Word e PDF, planilhas, apresentação e índice de evidências.',
  'A IA não tinha dados da unidade (curso, unidade curricular, carga horária) e não pode inventar entrevistas; esses campos ficaram como pendência declarada. Cada afirmação foi ligada a fonte e classificada como dado, inferência ou hipótese.', 'Fontes abertas e conferidas em 18/11/2026 (ANA, IBGE, Embrapa, fabricantes, patentes, periódico). Pendente: leitura completa pela equipe e pelo orientador antes da assinatura.', 'Adaptado', 'Texto base aprovado para revisão; assinaturas e dados da unidade ficam com a equipe e o docente.', 'ANA (2026); ANA (2019); IBGE (2025); Embrapa; Valor Econômico; Rain Bird; Lindsay; CropX; Agrosmart; Bermad; patentes US 10,166,565 e US 10,039,240; Irriga (2025).'],
]

def build():
    d = Doc('Entrega 7 — Registro do uso de IA', 'Entrega 7 — Registro do uso da inteligência artificial e validação humana', 'RAIZ_ATLAS_E7_RegistroIA')
    abertura(d, 'Entrega 7 — Registro do uso da inteligência artificial e validação humana')
    d.note('**Princípio.** A IA foi usada como apoio de produção; a equipe define o problema, o escopo e as decisões, testa o produto e é responsável por tudo que é entregue (Art. 70 e 72 do Regulamento). Este registro lista as interações relevantes até 18/11/2026. Onde a validação humana ainda não ocorreu, está escrito "Pendente". Se algum integrante usou outra ferramenta de IA (por exemplo, para texto ou imagem) fora das sessões listadas, **o registro deve ser completado antes da submissão**.')

    d.h1('1. Regras seguidas')
    d.bl(['Registrar data, ferramenta, objetivo, prompts relevantes, síntese da saída, validação humana e decisão final (Art. 73).',
          'Não inserir dados pessoais sensíveis nem informações sigilosas em ferramentas de IA (Art. 82). Os nomes dos integrantes e da equipe foram informados ao assistente apenas para montar créditos e identificação; não foram inseridos documentos pessoais, contatos de entrevistados nem dados de propriedades.',
          'Explicar como a equipe decidiu usar, adaptar ou descartar cada saída (Art. 74).',
          'Verificar informações técnicas e dados em fontes primárias antes de usá-las.'])

    d.h1('2. Ferramentas de IA utilizadas')
    d.tb(['Ferramenta', 'Para que foi usada', 'Onde roda'], [
        ['Claude (Anthropic), via Claude Code', 'Pesquisa, redação, código do MVP, scripts de edição de vídeo, planejamento e documentos', 'Serviço do fornecedor, a partir do computador da equipe'],
        ['whisper.cpp (modelo de transcrição de fala)', 'Transcrever as gravações para localizar frases e cortes', 'Localmente, no computador da equipe; o áudio não é enviado a terceiros'],
        ['Voz neural da Microsoft (pt-BR-AntonioNeural), via pacote edge-tts', 'Narração sintética de cenas sem fala gravada', 'Serviço online; apenas o texto da narração é enviado'],
        ['Vozes do macOS (síntese local)', 'Testadas e descartadas', 'Localmente'],
    ], [32, 44, 24])

    d.h1('3. Registro das interações')
    for r in REG:
        d.h2(f'Registro {r[0]} — {r[1]} — {r[2]}')
        d.kv([[CAMPOS[3], r[3]], [CAMPOS[4], r[4]], [CAMPOS[5], r[5]], [CAMPOS[6], r[6]], [CAMPOS[7], r[7]],
              ['Decisão final', ('( X ) ' + r[8]) if r[8].startswith('Utilizado') else ('( X ) ' + r[8])], [CAMPOS[9], r[9]], [CAMPOS[10], r[10]]], (26, 74))

    d.h1('4. Verificações pendentes antes da submissão')
    d.tb(['Item', 'Quem', 'Situação'], [
        ['Leitura integral das Entregas 1 a 8 e conferência dos artigos do regulamento citados', 'Equipe e orientador', 'Pendente'],
        ['Conferência das fontes (links acessados em 18/11/2026)', 'Equipe', 'Feita pela IA e pela busca; a equipe deve repetir uma amostra'],
        ['Complementar este registro com qualquer outro uso de IA que não esteja listado', 'Cada integrante', 'Pendente'],
        ['Todos os integrantes conseguirem explicar o código e os textos', 'Equipe', 'Pendente (preparação para a banca)'],
    ], [52, 22, 26])

    d.h1('5. Checklist')
    d.tb(['Item', 'Situação'], [['Ferramentas de IA identificadas', 'Sim'], ['Prompts relevantes registrados (resumidos)', 'Sim'], ['Respostas ou sínteses documentadas', 'Sim'],
                              ['Validação humana explicada', 'Sim, com pendências marcadas'], ['Fontes verificadas quando necessário', 'Sim'], ['Decisão final registrada', 'Sim']], [60, 40])
    d.h1('Referências')
    d.refs(refs_de('Regul', 'Caderno', 'Repo'))
    return d

def planilhas(pasta):
    return planilha(f'{pasta}/RAIZ_ATLAS_E7_RegistroIA.xlsx', [
        dict(nome='Registro de IA', titulo='Raiz — Entrega 7 — Registro do uso de IA e validação humana',
             nota='Registro até 18/11/2026. Decisão final: utilizado, adaptado ou descartado. "Pendente" indica validação humana ainda não realizada.', nota_h=34,
             head=CAMPOS, rows=REG, widths=[5, 14, 28, 40, 38, 38, 44, 44, 16, 34, 34])])
