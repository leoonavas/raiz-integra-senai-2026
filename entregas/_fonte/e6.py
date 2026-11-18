from mini import Doc
from dados import *
from xl import planilha

ETAPAS = [
    # etapa, descrição, início, fim, responsável, situação, evidência
    ['E1', 'Diagnóstico e delimitação do problema (dados ANA e IBGE)', '09/2026', '09/2026', 'Equipe', 'Concluída (versão inicial no relatório semifinal)', 'Relatório da semifinal (ATLAS); Entrega 2'],
    ['E2', 'MVP digital: app, fazenda digital simulada, protocolo de mensagens', 'até 17/11/2026', '17/11/2026', 'Leonardo Henrique Navas (autoria dos commits no repositório)', 'Concluída (versão 1)', 'Repositório: pastas app-oficial, fazenda-digital, docs/PROTOCOLO.md'],
    ['E3', 'Gateway com núcleo único de regras (local e na nuvem), banco com RLS e autenticação por link mágico', '17/11/2026', '17/11/2026', 'Leonardo Henrique Navas (autoria dos commits)', 'Concluída (versão 1)', 'Pastas shared, supabase/functions, supabase/migrations'],
    ['E4', 'Correção de defeitos achados em ensaio: mistura de dados com várias abas, bomba sempre ligada, alertas que não chegavam', '17/11/2026', '17/11/2026', 'Equipe (teste) e Leonardo Henrique Navas (correção)', 'Concluída', 'Histórico de commits de 17/11/2026'],
    ['E5', 'Vídeo de pitch (gravações, narração e edição)', '18/11/2026', '18/11/2026', 'Equipe', 'Versão 4 pronta; cena de abertura do problema pendente de regravação', 'Arquivo raiz_pitch_v4.mp4'],
    ['E6', 'Documentos das 8 entregas', '17/11/2026', '19/11/2026', 'Equipe, com orientação docente', 'Em andamento; Entrega 3 depende de entrevistas', 'Pasta entregas'],
    ['E7', 'Submissão pela unidade ao Departamento Regional', '—', '19/11/2026', 'Orientador e coordenação', 'Prazo oficial (confirmar prazo interno da unidade)', 'Regulamento, Art. 41'],
    ['E8', 'Entrevistas com produtores, técnicos e operador (mínimo 5 a 7)', '20/11/2026', '04/12/2026', 'Equipe (distribuir por integrante)', 'Não iniciada', 'Roteiro e termo da Entrega 3'],
    ['E9', 'Ensaios formais T1 a T4 do MVP digital e registro de resultados', '20/11/2026', '08/12/2026', 'Equipe', 'Não iniciada', 'Protocolo da seção 6'],
    ['E10', 'Banca regional', '23/11/2026', '11/12/2026', 'Equipe e orientador', 'Prevista (data de apresentação a combinar)', 'Regulamento, Art. 41'],
    ['E11', 'Atualização de projetos classificados para a fase nacional', '14/12/2026', '16/12/2026', 'Equipe', 'Prevista', 'Regulamento, Art. 41'],
    ['E12', 'Bancada física: ESP32, sensor, medidor de vazão, mini-bomba 12 V (TRL 4)', 'após a banca regional', 'a definir', 'Equipe', 'Planejada; sem data confirmada', 'Lista de materiais (aba Recursos)'],
    ['E13', 'Piloto de campo de cerca de 10 ha, com poço regularizado e autorização do produtor', 'a definir', 'a definir', 'Equipe e parceiro de campo', 'Planejada; depende de parceiro e de outorga', 'Relatório da semifinal (cronograma de 12 meses)'],
]
RISCOS = [
    ['R1', 'Sem entrevistas, a pesquisa de campo (critério C2) fica fraca', 'Alta', 'Alto', 'Distribuir contatos por integrante; pedir indicação a professores, sindicato rural, usinas e cooperativas; usar o termo e o roteiro prontos', 'Equipe'],
    ['R2', 'Prazo curto até a banca regional', 'Alta', 'Médio', 'Priorizar F1 a F3; registrar mudanças de escopo; cortar funções antes de atrasar documentos', 'Equipe'],
    ['R3', 'Dados simulados confundidos com resultados reais', 'Média', 'Alto', 'Selo "Dados simulados" em vídeo e documentos; declarar limites em cada entrega', 'Equipe'],
    ['R4', 'Falso alerta de vazamento', 'Média', 'Médio', 'Regra de persistência (3 leituras) e confirmação por inspeção local antes de qualquer decisão', 'Equipe'],
    ['R5', 'Dois navegadores abertos misturando dados da fazenda', 'Média', 'Médio', 'Posse única da fazenda por concessão de tempo (lease) e filtro por origem, já implementados', 'Leonardo Henrique Navas'],
    ['R6', 'Dependência de serviços externos (Supabase, Vercel) durante a demonstração', 'Média', 'Médio', 'Gateway local como alternativa quando a nuvem não responde; vídeo gravado como reserva', 'Equipe'],
    ['R7', 'Risco elétrico ao passar para hardware real', 'Baixa agora', 'Alto', 'Bancada em tensão ≤ 12 V; ligação à rede ou a bomba real só com profissional habilitado (NR-10)', 'Equipe e orientador'],
    ['R8', 'Dependência de IA sem compreensão pela equipe', 'Média', 'Alto', 'Registro de IA (Entrega 7); cada integrante deve conseguir explicar o código e os textos (Art. 72)', 'Equipe'],
    ['R9', 'Poço sem regularização para o piloto', 'Média', 'Alto', 'Exigir licença e outorga conforme o DAEE antes de instalar (DAEE, 2017)', 'Equipe e parceiro de campo'],
]
TESTES = [
    ['T1', 'Operação local sem internet', 'Desligar a internet do gateway; executar ciclos de irrigação com leitura, registro, alerta e comando local', 'Leitura, registro e comando em 100% dos ciclos sem internet', 'Não executado formalmente'],
    ['T2', 'Operação conectada e sincronização', 'Religar a internet; verificar que o gateway da nuvem assume, que os registros pendentes sincronizam e que os alertas chegam ao app', '≥ 90% das leituras programadas registradas; 100% dos registros pendentes sincronizados', 'Demonstrado no vídeo; sem registro formal de n repetições'],
    ['T3', 'Falhas simuladas', 'Provocar entupimento, vazamento e poço seco na fazenda digital em n repetições; registrar detecção, falso alerta e tempo até o alerta', 'Todas as falhas provocadas geram alerta; falsos alertas registrados', 'Demonstrado no vídeo (entupimento e vazamento); sem n repetições registradas'],
    ['T4', 'Usabilidade com operador ou técnico', 'Operador lê o app e explica a recomendação e o alerta; registrar dúvidas e ajustes', 'Compreensão relatada; ajustes de interface registrados', 'Não executado (depende da Entrega 3)'],
]
RECURSOS = [
    ['Software', 'Repositório Git e hospedagem do código (GitHub)', 'Já em uso', 'Sem custo no plano utilizado (a confirmar)'],
    ['Software', 'Banco de dados e serviços de borda (Supabase, PostgreSQL com RLS e Edge Functions)', 'Já em uso', 'Plano utilizado pela equipe (a confirmar custo)'],
    ['Software', 'Hospedagem do app e da fazenda digital (Vercel)', 'Já em uso', 'Plano utilizado pela equipe (a confirmar custo)'],
    ['Hardware (bancada)', 'Microcontrolador com Wi-Fi (ESP32) e relógio de tempo real', 'A adquirir', 'A cotar'],
    ['Hardware (bancada)', 'Sensor de umidade do solo (capacitivo) para calibrar no solo usado', 'A adquirir', 'A cotar'],
    ['Hardware (bancada)', 'Medidor de vazão (efeito Hall) e tubulação de bancada; calibração com recipiente graduado e cronômetro', 'A adquirir', 'A cotar'],
    ['Hardware (bancada)', 'Mini-bomba 12 V, fonte 12 V, relé ou driver, reservatório e válvulas para simular entupimento e vazamento', 'A adquirir', 'A cotar'],
    ['Hardware (bancada)', 'Armazenamento local, display e caixa de proteção', 'A adquirir', 'A cotar'],
    ['Pessoas e mentoria', 'Orientação docente; mentoria técnica em irrigação; propriedade-piloto em Jaú', 'Buscar', 'Pedido final do pitch'],
]

def build():
    d = Doc('Entrega 6 — Planejamento do MVP', 'Entrega 6 — Planejamento do projeto e desenvolvimento do MVP', 'RAIZ_ATLAS_E6_PlanejamentoMVP')
    abertura(d, 'Entrega 6 — Planejamento do projeto e desenvolvimento do MVP')
    d.note('**Estado real do MVP.** O MVP existente é **digital e de média fidelidade**: um aplicativo, uma fazenda digital simulada (que emite os mesmos sinais que dispositivos reais emitiriam e recebe comandos) e um gateway com as regras de decisão. **Não há dispositivos físicos, bancada física nem dados de campo.** Todos os números exibidos pelo MVP são simulados e devem ser rotulados assim. A planilha RAIZ_ATLAS_E6_Planejamento.xlsx acompanha este documento com cronograma, riscos, recursos e testes.')

    d.h1('1. Objetivo do MVP')
    d.p('Demonstrar, em ambiente simulado, que um conjunto de aplicativo e gateway (a) recomenda irrigar a partir de umidade do solo e previsão de chuva, deixando a decisão ao operador, (b) alerta desvio de vazão em relação ao esperado, e (c) continua lendo, registrando e alertando sem internet, assumindo na nuvem quando a conexão existe. O MVP não pretende provar economia nem desempenho em campo; pretende testar a lógica central antes do investimento em hardware.')

    d.h1('2. Escopo')
    d.tb(['Entra no MVP atual', 'Não entra nesta etapa'], [[
        'Aplicativo Raiz (interface para o operador: início, irrigação, alertas, rede e configurações; limiares e regras).\nFazenda digital em SVG: talhões, sensores de umidade, medidor de vazão, estação de clima, controlador da bomba, dia e noite, clima e falhas (entupimento, vazamento, poço seco).\nGateway com núcleo único de regras, que roda no navegador (modo local) ou em Edge Function (modo nuvem), com execução transferida conforme a internet.\nProtocolo de mensagens documentado (docs/PROTOCOLO.md).\nBanco PostgreSQL com controle de acesso por linha (RLS) e autenticação por link mágico, com papéis por fazenda.',
        'Instalação em poço e bomba reais.\nTensão de rede.\nBancada física com ESP32, sensor e medidor reais.\nIndicadores de pH, condutividade e turbidez (módulo futuro, apenas triagem).\nQualquer afirmação de economia de água ou energia.\nPotabilidade da água.'
    ]], [55, 45])

    d.h1('3. Funcionalidades prioritárias')
    d.tb(['Função', 'Descrição', 'Como está no MVP', 'Evidência'], [
        ['F1 — Recomendação de irrigação', 'Recomenda irrigar quando a umidade do solo está abaixo do limiar crítico e a previsão de chuva está abaixo do limite configurado. O operador revisa e confirma (confirmação por pressão sustentada).', 'Implementada. Limiares iniciais: umidade crítica 30%, umidade-alvo 42%, não irrigar se chuva prevista acima de 60%, tempo máximo contínuo de bomba de 60 minutos. São valores de partida a calibrar.', 'Código do gateway (shared/gateway-core.js); vídeo, cenas de "Revisar e ligar"'],
        ['F2 — Alerta de desvio de vazão', 'Compara a vazão medida com a esperada; alerta quando o desvio persiste por leituras consecutivas.', 'Implementada. Tolerância inicial de 20% e persistência de 3 leituras. Cenários de entupimento e vazamento na fazenda digital geram alerta no app.', 'Código do gateway; vídeo, cenas de vazamento e entupimento'],
        ['F3 — Operação local e sincronização', 'Leitura, registro e alerta continuam sem internet; ao voltar o sinal, o estado é sincronizado.', 'Implementada. O gateway local mantém o estado; a nuvem assume com concessão de 20 segundos e um único dono ativo; o app mostra "operando na rede local".', 'Código (supabase/functions/gateway); vídeo, cena de internet fora do ar'],
        ['Complemento — Alertas de ação do usuário', 'Tudo que exige ação do operador vira alerta (umidade baixa, vazão fora do esperado, internet fora, dispositivo offline).', 'Implementado.', 'Aba Alertas do app'],
    ], [17, 30, 33, 20])

    d.h1('3.1 Maturidade')
    d.p('Nível de maturidade tecnológica estimado pela equipe: TRL 3 (prova de conceito em ambiente simulado). A meta seguinte é TRL 4 (validação em bancada de laboratório), e o piloto em campo corresponde a TRL 5, em fase posterior. Esta é uma autoavaliação, não uma certificação.')

    d.h1('4. Etapas, responsáveis e cronograma')
    d.p('As datas nacionais vêm do Regulamento (Art. 41). Onde o responsável está como "Equipe", a distribuição por integrante ainda será definida pelo grupo; a autoria técnica de código registrada no repositório aparece com o nome do titular dos commits. Nenhum responsável foi atribuído por suposição.')
    d.tb(['Etapa', 'Descrição', 'Início', 'Fim', 'Responsável', 'Situação'], [[e[0], e[1], e[2], e[3], e[4], e[5]] for e in ETAPAS], [6, 34, 11, 11, 20, 18])

    d.h1('5. Recursos necessários')
    d.tb(['Tipo', 'Item', 'Situação', 'Custo'], RECURSOS, [17, 48, 13, 22])
    d.p('Os custos de hardware serão preenchidos com cotações. A equipe não usou preços estimados sem fonte.')

    d.h1('6. Protocolo de teste e metas')
    d.p('As metas abaixo são critérios de acompanhamento, **não resultados**. Na data deste documento, os cenários foram demonstrados no vídeo de pitch e houve ensaios exploratórios durante o desenvolvimento (com correção de defeitos), mas não há registro formal de repetições. Resultados só serão declarados depois dos ensaios do item E9.')
    d.tb(['Teste', 'Nome', 'Descrição', 'Meta de validação', 'Situação'], TESTES, [6, 15, 36, 25, 18])

    d.h1('7. Riscos e mitigação')
    d.tb(['Nº', 'Risco', 'Probab.', 'Impacto', 'Mitigação', 'Responsável'], RISCOS, [5, 27, 8, 8, 40, 12])

    d.h1('8. Evidências existentes e esperadas')
    d.tb(['Evidência', 'Situação', 'Onde'], [
        ['Código-fonte, protocolo e migrações do banco', 'Existente', 'Repositório do projeto (EQUIPE ATLAS, 2026)'],
        ['App e fazenda digital publicados', 'Existente', 'Endereços listados no índice de evidências (Entrega 8)'],
        ['Vídeo de pitch com demonstração das funções', 'Existente (versão 4)', 'Arquivo raiz_pitch_v4.mp4'],
        ['Registro de ensaios T1 a T4 com n repetições', 'A produzir', 'Planilha de testes (aba Testes)'],
        ['Entrevistas', 'A produzir', 'Entrega 3'],
        ['Fotos e dados de bancada física', 'A produzir (etapa E12)', 'Pasta de evidências'],
    ], [45, 20, 35])

    d.h1('9. Registro de mudanças de escopo')
    d.p('O relatório da semifinal previa um piloto de campo com sensores, controlador, comando de bomba e indicadores de água. Ao planejar a etapa atual, a equipe delimitou o MVP a um ambiente digital simulado com três funções (F1, F2 e F3), por ser testável no prazo e por permitir validar a lógica antes de comprar hardware. Os módulos de água e de comando real de bomba permanecem como evolução. Essa mudança é registrada aqui para que a banca compare as duas etapas.')

    d.h1('Referências')
    d.refs(refs_de('Repo', 'DAEE', 'Regul', 'Caderno', 'Guia'))
    return d

def planilhas(pasta):
    return planilha(f'{pasta}/RAIZ_ATLAS_E6_Planejamento.xlsx', [
        dict(nome='Cronograma', titulo='Raiz — Entrega 6 — Etapas, responsáveis e cronograma', nota='Datas nacionais conforme o Regulamento, Art. 41. "Equipe" indica que a distribuição por integrante será definida pelo grupo.',
             head=['Etapa', 'Descrição', 'Início', 'Fim', 'Responsável', 'Situação', 'Evidência'], rows=ETAPAS, widths=[8, 56, 16, 14, 32, 34, 42]),
        dict(nome='Riscos', titulo='Riscos e mitigação', head=['Nº', 'Risco', 'Probabilidade', 'Impacto', 'Mitigação', 'Responsável'], rows=RISCOS, widths=[7, 46, 14, 12, 70, 24]),
        dict(nome='Recursos', titulo='Recursos necessários (custos a cotar)', head=['Tipo', 'Item', 'Situação', 'Custo'], rows=RECURSOS, widths=[22, 70, 14, 40]),
        dict(nome='Testes', titulo='Protocolo de teste e registro de resultados', nota='As metas são critérios de acompanhamento, não resultados. Preencher as colunas de repetições e resultados somente com ensaios realizados.',
             head=['Teste', 'Nome', 'Descrição', 'Meta de validação', 'Situação', 'Repetições (n)', 'Detectados', 'Falsos alertas', 'Tempo até o alerta (s)', 'Data', 'Responsável'],
             rows=[t + ['', '', '', '', '', ''] for t in TESTES], widths=[8, 24, 52, 40, 30, 14, 12, 14, 18, 12, 18]),
    ])
