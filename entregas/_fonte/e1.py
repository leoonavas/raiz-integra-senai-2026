from mini import Doc
from dados import *

def build():
    d = Doc('Entrega 1 — Plano de Ensino', 'Entrega 1 — Plano de Ensino da Unidade Curricular e planos de aula', 'RAIZ_ATLAS_E1_PlanoEnsino', paisagem=True)
    abertura(d, 'Entrega 1 — Plano de Ensino da Unidade Curricular e planos de aula')
    d.note('**Natureza do documento.** Proposta elaborada pela equipe, a partir do Template 1 do Caderno Nacional, para revisão do docente orientador e da coordenação pedagógica. Conforme o Art. 62 do Regulamento, o documento só comprova a validação pedagógica depois de assinado pelos docentes envolvidos e pelo coordenador pedagógico. Os campos que dependem do Plano de Curso e dos registros da unidade (nome da Unidade Curricular, carga horária e número de aulas) não foram preenchidos por suposição: estão marcados para preenchimento pela unidade.')

    d.h1('1. Identificação da Unidade Curricular')
    d.kv([
        ['Curso', CURSO],
        ['Unidade Curricular (ou planejamento integrado — Art. 60)', 'O projeto mobiliza mais de uma Unidade Curricular do curso (programação de aplicações, banco de dados, integração de sistemas e segurança da informação). Unidades Curriculares a indicar pelo docente conforme o Plano de Curso: ' + PENDENTE],
        ['Carga horária da UCR', PENDENTE],
        ['Nº de aulas previstas', PENDENTE],
        ['Nº de Situações de Aprendizagem', '1 (uma), descrita na seção 2'],
        ['Objetivo da UCR (proposta para este projeto)', 'Desenvolver, com método e de forma integrada, uma solução digital completa (aplicativo, serviço de integração e banco de dados) para um problema real do mundo do trabalho, aplicando levantamento de requisitos, modelagem, programação, testes, segurança e proteção de dados, e documentando o processo e as decisões.'],
    ], (34, 66))
    d.p('Capacidades de referência. A coluna "Onde aparece" mostra em que atividade do projeto cada capacidade é exercida e a coluna "Como é avaliada" indica a evidência. A redação das capacidades deve ser conformada ao Plano de Curso pelo docente; a lista abaixo é de referência e não substitui o texto oficial do Plano de Curso.')
    d.tb(['Tipo', 'Capacidade (de referência)', 'Onde aparece no projeto', 'Como é avaliada'], [
        ['Básica', 'Comunicar-se tecnicamente por escrito e oralmente, com clareza e fontes', 'Diagnóstico, relatório de pesquisa, pitch e documentação', 'Entregas 2, 3, 4 e 8; rubrica C6'],
        ['Básica', 'Interpretar dados e indicadores (percentuais, séries, unidades)', 'Uso de dados da ANA e do IBGE; leitura de vazão e umidade no app', 'Entrega 2 (quadro de dados e fontes)'],
        ['Técnica', 'Modelar e implementar aplicações (interface, regras de negócio, comunicação cliente-servidor)', 'App Raiz (interface), fazenda digital e gateway (regras de recomendação e alerta)', 'Demonstração do MVP; repositório; rubrica C4'],
        ['Técnica', 'Modelar e operar banco de dados relacional com controle de acesso por linha (RLS)', 'Tabelas de fazendas, membros, convites, eventos e estado do gateway no Supabase (PostgreSQL)', 'Migrações SQL versionadas; rubrica C4'],
        ['Técnica', 'Integrar sistemas por protocolo documentado (mensagens, comandos, confirmação)', 'Protocolo fazenda ⇄ app em docs/PROTOCOLO.md; função de borda (Edge Function) do gateway', 'Documento de protocolo; testes de bancada digital'],
        ['Técnica', 'Aplicar segurança da informação e proteção de dados pessoais', 'Autenticação por link mágico, convites por papel, anonimização nos anexos, LGPD', 'Entregas 3 e 7; rubrica C7'],
        ['Técnica', 'Testar e documentar software', 'Cenários de falha simulados (entupimento, vazamento, queda de internet) e vídeo de demonstração', 'Entregas 6 e 8'],
        ['Socioemocional', 'Trabalhar em equipe e cumprir prazos', 'Divisão de responsabilidades e cronograma (Entrega 6)', 'Registro de etapas e responsáveis'],
        ['Socioemocional', 'Pensar criticamente e agir com ética no uso de dados e de IA', 'Registro do uso de IA com validação humana (Entrega 7)', 'Entrega 7; rubrica C7'],
    ], [10, 33, 33, 24])

    d.h1('2. Situação de Aprendizagem nº 1 — Raiz: decidir quando irrigar e perceber falhas de vazão')
    d.kv([
        ['Estratégia de Aprendizagem Desafiadora', '( X ) Projeto    ( X ) Pesquisa aplicada    (   ) Situação-problema    (   ) Estudo de caso'],
        ['Contextualização', 'A irrigação respondeu por 50,3% das retiradas de água para usos consuntivos no Brasil em 2024, o equivalente a 1.056,3 m³/s (ANA, 2026). Experimentos de longa duração da Embrapa Cerrados registram ganhos de produtividade da cana irrigada em relação ao sequeiro (BUFON, [s.d.]) e o município de Jaú registrou valor de produção de cana de R$ 399,4 milhões em 2025 (IBGE, 2025). Em propriedades com captação própria, decidir o momento da irrigação e perceber a tempo falhas de vazão é um problema real de gestão da água e da energia. Esta afirmação sobre a prática das propriedades é uma hipótese a confirmar na pesquisa de campo (Entrega 3).'],
        ['Desafio', 'Projetar, construir e demonstrar um sistema que recomende quando irrigar (umidade do solo e previsão de chuva), sinalize desvios de vazão e continue lendo, registrando e alertando sem internet, com decisão final sempre do operador, segurança no acionamento e proteção dos dados dos usuários.'],
        ['Resultados esperados', 'As 8 entregas obrigatórias; MVP digital demonstrável (aplicativo, fazenda digital e gateway); vídeo de demonstração; registro do uso de IA; pesquisa com usuários documentada; pitch e portfólio de evidências.'],
        ['Relação com o INTEGRA SENAI', 'A Situação de Aprendizagem é o próprio projeto inscrito. Cada etapa do plano de aula gera uma entrega obrigatória, de modo que o projeto integra o percurso formativo e não é atividade paralela (Art. 60 e 61).'],
    ], (22, 78))

    d.h1('3. Plano de aula')
    d.p('A sequência abaixo organiza as aulas em etapas. O número de aulas de cada etapa deve ser definido pelo docente com base na carga horária da unidade; por isso a coluna indica a proporção prevista e não valores absolutos.')
    d.tb(['Etapa e nº de aulas', 'Capacidades', 'Conhecimentos', 'Estratégia e atividade', 'Recursos e ambientes', 'Critérios de avaliação', 'Instrumentos', 'Evidência gerada'], [
        ['1. Problema e contexto (aulas: ____)', 'Interpretar dados; comunicar-se tecnicamente', 'Fontes públicas (ANA, IBGE); leitura crítica; citação em ABNT', 'Pesquisa aplicada em fontes oficiais; mapa do processo de irrigação; delimitação do recorte', 'Sala com internet; portais da ANA e do IBGE', 'Problema delimitado; dados com fonte e ano; separação entre dado e hipótese', 'Rubrica C1; checklist do Template 2', 'Entrega 2'],
        ['2. Pesquisa com usuários (aulas: ____)', 'Comunicar-se; agir com ética no tratamento de dados', 'Entrevista semiestruturada; LGPD; síntese de achados', 'Elaboração do roteiro e do termo de ciência; contato com produtores, técnicos e operadores; registro das respostas', 'Roteiro; formulário; sala', 'Perguntas ligadas às hipóteses; consentimento registrado; interpretação separada do dado coletado', 'Rubrica C2; checklist do Template 3', 'Entrega 3'],
        ['3. Anterioridade e benchmarking (aulas: ____)', 'Interpretar dados; comunicar-se tecnicamente', 'Busca de soluções e patentes; critérios de comparação; propriedade intelectual', 'Busca em sites de fabricantes, artigos e bases de patentes; matriz comparativa; parecer técnico', 'Laboratório de informática; Google Patents; INPI; periódicos', 'Mais de uma fonte por categoria; lacunas reais; diferença entre anterioridade, inspiração e cópia', 'Rubrica C3; checklist do Template 4', 'Entrega 4'],
        ['4. Proposta de valor e planejamento (aulas: ____)', 'Trabalhar em equipe; comunicar-se', 'Proposta de valor; Lean Canvas; planejamento de MVP; riscos', 'Construção do Lean Canvas e do plano de etapas, responsáveis, riscos e metas', 'Sala; planilha; documento', 'Coerência entre problema, cliente, solução e custos; metas verificáveis', 'Rubricas C3 e C5; checklists dos Templates 5 e 6', 'Entregas 5 e 6'],
        ['5. Desenvolvimento do MVP (aulas: ____)', 'Modelar e implementar aplicações; modelar banco de dados; integrar sistemas', 'HTML/CSS/JavaScript; PostgreSQL com RLS; Edge Functions; protocolo de mensagens', 'Codificação do app, da fazenda digital e do gateway; modelagem das tabelas; documentação do protocolo', 'Laboratório de informática; repositório Git; Supabase; hospedagem', 'Funções F1 a F3 demonstradas; código versionado; protocolo documentado', 'Rubrica C4; demonstração', 'Entrega 8 (MVP)'],
        ['6. Testes e segurança (aulas: ____)', 'Testar e documentar software; aplicar segurança e proteção de dados', 'Cenários de falha; autenticação; controle de acesso; LGPD', 'Execução de cenários de falha simulados; correção de defeitos; revisão de acesso e de dados', 'Laboratório; fazenda digital; registros de teste', 'Falhas reproduzidas e registradas; defeitos corrigidos; limites declarados', 'Rubrica C4; registro de testes', 'Entregas 6 e 8'],
        ['7. IA, autoria e integridade (aulas: ____)', 'Pensar criticamente; agir com ética', 'Uso responsável de IA; verificação de fontes; autoria', 'Registro de cada uso de IA com prompt, saída, análise crítica e decisão; conferência de fontes', 'Planilha de registro; fontes primárias', 'Registro completo; equipe explica e defende o conteúdo', 'Rubrica C7; checklist do Template 7', 'Entrega 7'],
        ['8. Pitch e portfólio (aulas: ____)', 'Comunicar-se oralmente; trabalhar em equipe', 'Narrativa de pitch; seleção de evidências', 'Roteiro, vídeo de pitch e organização da pasta de evidências', 'Sala; editor de vídeo; pasta de evidências', 'Pitch dentro do tempo; evidências acessíveis e nomeadas', 'Rubrica C6; checklist do Template 8', 'Entrega 8 (pitch e portfólio)'],
    ], [11, 11, 12, 16, 11, 14, 10, 15])

    d.h1('4. Cronograma essencial')
    d.p('As datas nacionais vêm do Art. 41 do Regulamento. O prazo interno da unidade e a data da apresentação regional devem ser confirmados com a coordenação, pois a unidade pode adotar prazo anterior.')
    d.tb(['Data ou período', 'Marco', 'Origem'], [
        ['Até 17/11/2026', 'MVP digital, protocolo e primeira versão dos documentos registrados no repositório do projeto', 'Histórico do repositório (EQUIPE ATLAS, 2026)'],
        ['Até 19/11/2026', 'Submissão dos projetos pelos Departamentos Regionais', 'Regulamento, Art. 41'],
        ['23/11/2026 a 11/12/2026', 'Avaliação pela banca regional', 'Regulamento, Art. 41'],
        ['14/12/2026 a 16/12/2026', 'Atualização, ajuste ou substituição dos projetos classificados para a fase nacional', 'Regulamento, Art. 41'],
        ['A partir de 17/12/2026', 'Início da avaliação nacional', 'Regulamento, Art. 41'],
        ['25/02/2027', 'Divulgação do resultado nacional', 'Regulamento, Art. 41'],
    ], [22, 50, 28])

    d.h1('5. Critérios e instrumentos de avaliação')
    d.p('Os critérios abaixo reproduzem os sete critérios da rubrica do Regulamento (capítulo 9) e indicam a evidência do projeto que será usada para cada um. Os pesos oficiais são os do Regulamento.')
    d.tb(['Critério da rubrica', 'Evidência neste projeto', 'Instrumento'], [
        ['C1 — Relevância do problema', 'Diagnóstico com dados da ANA e do IBGE e causas listadas como hipóteses (Entrega 2)', 'Documento e checklist do Template 2'],
        ['C2 — Pesquisa e entendimento do usuário', 'Pesquisa de contexto em fontes públicas e pesquisa de campo conforme instrumento da Entrega 3', 'Registro de entrevistas e síntese'],
        ['C3 — Proposta de valor e diferenciação', 'Proposta de valor, Lean Canvas e benchmarking com fontes (Entregas 4 e 5)', 'Matriz comparativa e Lean Canvas'],
        ['C4 — Viabilidade técnica e qualidade do MVP', 'Aplicativo, fazenda digital e gateway funcionando; cenários de falha demonstrados', 'Demonstração, vídeo e repositório'],
        ['C5 — Processo e integração curricular', 'Plano de ensino, cronograma e registro de etapas (Entregas 1 e 6)', 'Este documento e a planilha de planejamento'],
        ['C6 — Comunicação, pitch e evidências', 'Vídeo de pitch dentro do tempo e portfólio organizado (Entrega 8)', 'Pitch e índice de evidências'],
        ['C7 — Integridade, autoria e uso responsável de IA', 'Registro de IA com validação humana e declaração de limites (Entrega 7)', 'Planilha de registro'],
    ], [30, 45, 25])

    d.h1('6. Conexão do projeto com o percurso formativo')
    d.p('O projeto exige que os estudantes mobilizem, em um mesmo produto, capacidades que o curso desenvolve separadamente: programação da interface e das regras de negócio, modelagem e consulta de banco de dados, integração por protocolo, segurança e proteção de dados, testes e documentação. A situação-problema é real e delimitada (decisão de irrigação e falhas de vazão em propriedades de cana-de-açúcar), o que dá sentido às escolhas técnicas e permite avaliá-las com critérios objetivos. O vínculo com o mundo do trabalho vem do contexto produtivo estudado e da requalificação prevista para o operador de irrigação, que passa de acionar por calendário a supervisionar alertas (Guia de Tecnologias, 2026).')

    d.h1('7. Validação pedagógica (Art. 62)')
    d.sig(['Docente responsável\n' + ORIENTADOR, 'Coorientador\n' + COORIENTADOR, 'Coordenação pedagógica/técnica\n(nome: ____________________)'])

    d.h1('8. Checklist do Plano de Ensino')
    d.tb(['Item', 'Situação'], [
        ['Curso, UC, carga horária, aulas e Situações de Aprendizagem identificados', 'Curso e Situação de Aprendizagem: preenchidos. UC, carga horária e aulas: a preencher pela unidade'],
        ['Objetivo da UCR preenchido', 'Preenchido (proposta, sujeita à revisão do docente)'],
        ['Capacidades vinculadas ao desafio', 'Preenchidas como referência; conformar ao Plano de Curso'],
        ['Estratégia de Aprendizagem Desafiadora marcada', 'Preenchida (Projeto e Pesquisa aplicada)'],
        ['Contextualização, desafio e resultados esperados', 'Preenchidos'],
        ['Plano de aula com critérios e instrumentos de avaliação', 'Preenchido; número de aulas a definir pelo docente'],
        ['Validação pedagógica prevista', 'Campos de assinatura incluídos; pendentes de assinatura'],
    ], [55, 45])

    d.h1('Referências')
    d.refs(refs_de('Regul', 'Caderno', 'Guia', 'ANA2026', 'IBGE', 'Bufon', 'Repo'))
    return d
