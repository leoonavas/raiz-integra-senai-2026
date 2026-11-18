from mini import Doc
from dados import *

PERGUNTAS = [
    ('P1', 'Como você decide quando irrigar? Quem decide e com base em quê (calendário, olhar o solo, previsão do tempo, aplicativo)?', 'H1'),
    ('P2', 'Você mede a umidade do solo? Como e com que frequência?', 'H1'),
    ('P3', 'Você mede ou registra a vazão ou o volume bombeado? Como?', 'H2'),
    ('P4', 'Nos últimos 12 meses, houve vazamento, entupimento, bomba funcionando sem água ou queda de pressão? Quanto tempo depois foi percebido e qual foi o custo aproximado?', 'H2'),
    ('P5', 'Como é o sinal de internet ou de celular na área do poço e do talhão?', 'H3'),
    ('P6', 'Você já usou algum sistema, sensor ou aplicativo de irrigação? O que funcionou e o que não funcionou?', 'H3, H4'),
    ('P7', 'Você confiaria em uma recomendação do sistema? O que precisaria ver para confiar? Prefere decidir sozinho ou aceitar e ajustar a sugestão?', 'H4'),
    ('P8', 'Como o trabalho do operador mudaria com um painel de alertas? Que habilidades seriam úteis?', 'H4'),
    ('P9', 'Que riscos o preocupariam (segurança elétrica, bomba acionada sozinha, dados)?', 'H4'),
    ('P10', 'Que faixa de investimento e de mensalidade faria sentido? (resposta de percepção, não compromisso de compra)', 'H5'),
]

def build():
    d = Doc('Entrega 3 — Pesquisa', 'Entrega 3 — Pesquisa com usuários, stakeholders e contexto de aplicação', 'RAIZ_ATLAS_E3_Pesquisa')
    abertura(d, 'Entrega 3 — Pesquisa com usuários, stakeholders e contexto de aplicação')
    d.note('**Declaração de veracidade.** Na data deste documento a equipe **ainda não realizou entrevistas, observações nem questionários com produtores, operadores, técnicos ou outros stakeholders** (número de participantes: 0). O que foi feito é uma investigação do contexto em fontes públicas (Parte A). A pesquisa de campo (Parte B) está preparada com instrumento, termo de ciência, critérios de recorte e quadro de registro, **sem nenhuma resposta preenchida**. Respostas só serão inseridas depois de conversas reais; inventar respostas violaria os Arts. 72, 79 e 111 do Regulamento.')

    d.h1('1. Objetivo da pesquisa')
    d.p('Descobrir (a) como a irrigação é decidida hoje em propriedades de cana-de-açúcar com captação própria, (b) se a vazão é medida e como falhas de vazão são percebidas, (c) como é a conectividade na área do poço e do talhão, e (d) o que o operador e o gestor precisariam ver para confiar em uma recomendação do sistema. O objetivo é confirmar, ajustar ou rejeitar as hipóteses H1 a H5 da seção 7 antes de decidir o recorte final do MVP.')

    d.h1('Parte A — Investigação do contexto em fontes públicas (realizada)')
    d.h2('2. Método e fontes consultadas')
    d.p('A equipe consultou, em 18/11/2026, fontes oficiais e técnicas para responder a perguntas de contexto: qual é a relevância da irrigação, como a literatura técnica recomenda decidir a irrigação da cana, que barreiras limitam a adoção de irrigação e o que fabricantes oferecem em monitoramento. Esse método é chamado de pesquisa documental (fontes secundárias): ele fornece contexto e hipóteses, mas **não substitui** a escuta de usuários.')
    d.tb(['Pergunta de contexto', 'Fonte consultada', 'Achado', 'Implicação para o projeto'], [
        ['Qual a relevância da irrigação no uso de água?', 'ANA (2026)', 'A irrigação respondeu por 50,3% da retirada de água em 2024 (1.056,3 m³/s).', 'O tema é relevante; melhorar o momento e o controle da irrigação tem escala nacional.'],
        ['Como o manejo da irrigação da cana é orientado tecnicamente?', 'Embrapa Cerrados (BUFON, [s.d.])', 'Recomenda-se o método combinado: clima como referência, mais sensores de solo para aferir. Sensores de menor custo bastam quando só é preciso detectar presença de água.', 'Justifica combinar umidade do solo e previsão de chuva na recomendação (F1) e aceitar sensores de baixo custo.'],
        ['O que limita a adoção da irrigação?', 'Valor Econômico (NERY, 2025)', 'Custo dos equipamentos e demora e complexidade da outorga.', 'A solução deve aproveitar a infraestrutura existente (retrofit) e o piloto exige poço regularizado.'],
        ['Existem soluções que medem vazão e alertam?', 'Rain Bird, Lindsay, patentes (ver Entrega 4)', 'Há controladores com proteção de vazão alta e baixa e plataformas com monitoramento remoto de bombas e medidores.', 'O diferencial não é medir vazão, mas reunir solo, clima e vazão com operação local e decisão do operador.'],
        ['Sensores de baixo custo são viáveis tecnicamente?', 'Artigo na revista Irriga (OLIVEIRA et al., 2025)', 'Sensor de umidade com ESP32 calibrado contra umidade gravimétrica teve R² = 0,9421 em Latossolos Vermelhos.', 'A escolha de microcontrolador e sensor de baixo custo tem respaldo, desde que haja calibração no solo usado.'],
        ['Que cuidados legais se aplicam?', 'LGPD; DAEE (IT DPO 10/2017)', 'Dados pessoais exigem finalidade e consentimento; poços tubulares exigem licença de execução e outorga.', 'Termo de ciência na pesquisa; piloto só com poço regularizado.'],
    ], [20, 18, 32, 30])

    d.h2('3. Perfis de usuário (hipóteses de trabalho)')
    d.p('Os perfis abaixo organizam as perguntas da pesquisa de campo. Não são personas baseadas em entrevistas; são **hipóteses** derivadas dos papéis descritos nas fontes e do desenho do projeto.')
    d.tb(['Perfil', 'Papel provável', 'O que se quer descobrir'], [
        ['Produtor ou gestor', 'Decide investimento e tolera risco; responde pelo custo de água e energia.', 'Como decide a irrigação, quanto vale evitar uma falha e que investimento é aceitável.'],
        ['Operador de irrigação', 'Aciona a bomba e percorre a linha.', 'Como percebe falhas e se um painel de alertas ajudaria ou atrapalharia o trabalho.'],
        ['Técnico agrícola ou agrônomo', 'Define o manejo e interpreta dados.', 'Que dados usa hoje e em que ponto confiaria em uma recomendação automática.'],
        ['Empresa de irrigação, cooperativa ou usina', 'Instala, financia ou influencia a adoção.', 'Barreiras de adoção, assistência técnica e possibilidade de parceria (candidato a Embaixador de Negócios, Art. 16).'],
    ], [22, 38, 40])

    d.h1('Parte B — Pesquisa de campo (instrumento pronto; a realizar)')
    d.h2('4. Público, método e amostra')
    d.kv([
        ['Público a pesquisar', 'Meta mínima: 3 a 5 produtores ou gestores de cana em Jaú e região; 1 a 2 técnicos agrícolas; 1 operador de irrigação; 1 representante de empresa de irrigação, cooperativa ou usina.'],
        ['Como chegar aos participantes', 'Indicação por professores e familiares dos integrantes; sindicato rural e casa da agricultura do município; usinas e cooperativas da região; empresas de irrigação. A equipe declara que, até esta data, não possuía contatos no setor.'],
        ['Método', '( X ) Entrevista semiestruturada, presencial ou por telefone    ( X ) Observação (somente se autorizada)    (   ) Questionário    (   ) Grupo focal'],
        ['Quantidade de participantes', '0 (zero) até a data deste documento. O registro da seção 8 será preenchido conforme as conversas ocorrerem.'],
        ['Critério de recorte', 'Entram propriedades com cana-de-açúcar, irrigação pressurizada e captação própria. Saem propriedades sem irrigação ou com captação de terceiros, que serão registradas como contraste.'],
        ['Duração', 'De 20 a 30 minutos por entrevista.'],
    ], (26, 74))

    d.h2('5. Cuidados éticos e proteção de dados (LGPD)')
    d.bl(['Apresentar a finalidade (projeto estudantil do INTEGRA SENAI 2026) antes de perguntar.',
          'Obter consentimento registrado pelo termo de ciência do Anexo A; sem consentimento, não há entrevista.',
          'Não coletar dados pessoais além do necessário. Nos anexos, usar identificação anonimizada (ex.: "Produtor 1, 30 ha, Jaú").',
          'Não gravar áudio, vídeo nem fotografar sem autorização expressa.',
          'Não inserir nomes, telefones ou dados das propriedades em ferramentas de IA (Art. 82).',
          'Guardar os registros com acesso restrito à equipe e ao orientador.'])

    d.h2('6. Roteiro de perguntas')
    d.p('Cada pergunta está ligada a uma hipótese. As perguntas são abertas e não induzem a resposta.')
    d.tb(['Nº', 'Pergunta', 'Hipótese relacionada'], [[a, b, c] for a, b, c in PERGUNTAS], [8, 74, 18])

    d.h2('7. Hipóteses a confirmar, ajustar ou rejeitar')
    d.tb(['Hipótese', 'Enunciado', 'Origem', 'Perguntas', 'Resultado'], [
        ['H1', 'Alguns produtores decidem a irrigação por calendário ou observação visual, e a combinação de solo e clima melhoraria a decisão.', 'Diagnóstico (Entrega 2); BUFON ([s.d.])', 'P1, P2', 'Não verificado (sem entrevistas)'],
        ['H2', 'A vazão da bomba raramente é medida ou registrada de forma contínua, e falhas são percebidas tarde.', 'Diagnóstico (Entrega 2)', 'P3, P4', 'Não verificado'],
        ['H3', 'A conexão com a internet na área do poço é instável, e a operação local tem valor.', 'Requisito de projeto', 'P5, P6', 'Não verificado'],
        ['H4', 'O operador aceita recomendações se mantiver a decisão final e entender o motivo do alerta.', 'Princípio de projeto (operador decide)', 'P6, P7, P8, P9', 'Não verificado'],
        ['H5', 'Existe disposição de pagar por implantação e mensalidade em faixa compatível com o plano econômico.', 'Anexo econômico da Entrega 5', 'P10', 'Não verificado'],
    ], [8, 38, 22, 12, 20])

    d.h2('8. Registro das entrevistas (a preencher somente com conversas reais)')
    d.tb(['Nº', 'Perfil (anonimizado)', 'Data', 'Método', 'Principais respostas (o que foi dito)', 'Interpretação da equipe (separada)'],
         [[str(i), '', '', '', '', ''] for i in range(1, 6)], [5, 17, 10, 12, 31, 25])
    d.p('Regra de preenchimento: a coluna "Principais respostas" registra o que o participante disse, com as palavras dele quando possível; a coluna "Interpretação" registra o que a equipe entendeu. As duas não devem ser misturadas.')

    d.h1('9. Síntese de insights e implicações para a solução')
    d.p('**Insights da pesquisa de campo:** não há, porque ainda não houve coleta. **Aprendizados da Parte A** (documental) que já orientam o projeto: (1) combinar solo e clima tem respaldo técnico; (2) medição de vazão e proteção de vazão alta e baixa já existem em controladores comerciais, o que exige um diferencial claro; (3) custo e outorga freiam a adoção, o que pede retrofit e piloto com poço regularizado; (4) sensores de baixo custo funcionam quando calibrados. **Consequência prática:** o MVP foi limitado a três funções (F1 recomendação, F2 alerta de vazão, F3 operação local) e declarado como digital e simulado até que a pesquisa de campo confirme ou altere o recorte.')

    d.h1('10. Anexos e evidências')
    d.bl(['Anexo A — Termo de ciência e consentimento (abaixo).',
          'Fontes consultadas na Parte A: ver referências e Entrega 4.',
          'Planilha de registro das entrevistas: arquivo RAIZ_ATLAS_E3_Registro_Entrevistas.xlsx (em branco, mesmo formato da seção 8).'])

    d.h1('Anexo A — Termo de ciência e consentimento')
    d.p('Projeto Raiz — Equipe Atlas — Escola SENAI Edward Savio, Jaú (SP). Estamos fazendo um projeto estudantil que estuda como a irrigação é decidida em propriedades de cana-de-açúcar. Pedimos uma conversa de cerca de 20 a 30 minutos. A participação é voluntária e você pode parar a qualquer momento. As respostas serão usadas apenas para este projeto, sem divulgar seu nome nem o nome da propriedade. Não gravaremos áudio ou imagem sem sua autorização.')
    d.tb(['Autorização', 'Sim', 'Não'], [['Posso registrar suas respostas por escrito', '( )', '( )'], ['Posso gravar o áudio da conversa', '( )', '( )'], ['Posso fotografar a área (sem pessoas)', '( )', '( )'], ['Posso citar seu cargo ou função de forma anônima', '( )', '( )']], [70, 15, 15])
    d.sig(['Participante (nome ou rubrica)', 'Integrante da equipe responsável'])

    d.h1('Referências')
    d.refs(refs_de('ANA2026', 'Bufon', 'Valor', 'RainBird', 'Lindsay', 'Pat166', 'Irriga', 'LGPD', 'DAEE', 'Regul', 'Caderno'))
    return d
