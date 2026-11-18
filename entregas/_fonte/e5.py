from mini import Doc
from dados import *

def build():
    d = Doc('Entrega 5 — Proposta de valor', 'Entrega 5 — Proposta de valor e modelagem da solução', 'RAIZ_ATLAS_E5_PropostaValor_LeanCanvas')
    abertura(d, 'Entrega 5 — Proposta de valor e modelagem da solução')
    d.note('**Como ler.** Cada item da proposta de valor indica a evidência que o sustenta e se ela é **dado**, **inferência** ou **hipótese** a validar. Os valores financeiros são **premissas de planejamento** herdadas do plano de negócios do relatório da etapa semifinal; não são vendas, cotações fechadas nem resultados.')

    d.h1('1. Proposta de valor')
    d.tb(['Campo', 'Preenchimento', 'Evidência e situação'], [
        ['Público beneficiário e cliente', 'Produtores e gestores de propriedades de cana-de-açúcar de Jaú e região com irrigação pressurizada, captação própria e bomba elétrica. Usuário direto: o operador de irrigação.', 'Cana em Jaú: R$ 399,4 milhões em 2025 (IBGE, 2025). Quantas propriedades irrigam com poço próprio: desconhecido (hipótese; Entrega 3).'],
        ['Dores ou necessidades', 'Decidir o momento de irrigar sem leitura contínua; perceber tarde vazamento, entupimento ou bomba sem água; não ter registro histórico; sofrer com internet instável.', 'Hipóteses do diagnóstico (Entrega 2), a confirmar nas entrevistas. O manejo combinado por clima e solo é recomendado pela Embrapa (BUFON, [s.d.]).'],
        ['Ganhos esperados', 'Decisão de irrigação apoiada em dado; alerta precoce de desvio de vazão; registro contínuo; continuidade da leitura e do alerta sem internet.', 'Hipóteses. Nenhum ganho de economia é afirmado; só será declarado com dados comparáveis antes e depois.'],
        ['Solução proposta', 'Conjunto de aplicativo, gateway e dispositivos (sensor de umidade, medidor de vazão, estação de clima e controlador da bomba) que recomenda quando irrigar, alerta desvio de vazão e opera localmente sem internet, com decisão final do operador. Na versão atual, os dispositivos são simulados por uma fazenda digital.', 'MVP digital descrito na Entrega 6 e demonstrado no vídeo (Entrega 8). Dispositivos reais: etapa futura.'],
        ['Diferencial', 'Combinação de recomendação por solo e clima, alerta de vazão e operação local sem internet, em módulos e com possibilidade de retrofit. Não se reivindica novidade na comparação de vazão, que já existe (Entrega 4).', 'Benchmarking com fontes (Entrega 4). Valor percebido do diferencial: hipótese (Entrega 3).'],
        ['Evidências que sustentam a proposta', 'Dados da ANA e do IBGE; literatura técnica da Embrapa; benchmarking; MVP digital funcionando; registro de IA.', 'Ver referências. Falta: entrevistas e bancada física.'],
    ], [17, 45, 38])

    d.h1('2. Lean Canvas — Raiz')
    d.tb(['Dado', 'Informação'], [['Feito para', 'Projeto Raiz — Equipe Atlas'], ['Feito por', 'Leonardo Henrique Navas (líder) e equipe'], ['Data', DATA], ['Versão', 'v1.0']], [20, 80])
    d.tb(['2. Problema (até 3)', '4. Solução', '3. Proposta única de valor', '9. Vantagem difícil de copiar', '1. Segmentos de clientes'], [[
        '1) Decisão de irrigação por rotina, sem leitura contínua de solo e clima (hipótese).\n2) Falhas de vazão percebidas tarde (hipótese).\n3) Soluções que dependem de internet (hipótese).\n\n__Alternativas existentes:__ calendário e anotações; controladores com sensor de vazão; plataformas em nuvem; medidores isolados (Entrega 4).',
        'F1 Recomendação de irrigação por solo e previsão de chuva, com o operador decidindo.\nF2 Alerta de desvio de vazão com persistência de leituras.\nF3 Leitura, registro e alerta locais sem internet, com sincronização posterior.\nFuturo: indicadores da água (triagem) e comando de bomba com proteções.',
        'Saber quando irrigar e ser avisado quando a vazão foge do normal, com ou sem internet, e sempre com a decisão final do operador.\n\n__Conceito de alto nível:__ um painel de bordo com alarme para a irrigação.',
        'Calibração local para cana e solo de Jaú; histórico de dados de cada cliente; relacionamento com parceiros regionais. Hoje nenhuma dessas vantagens existe de fato: são metas a construir.',
        'Produtores e gestores de cana de Jaú e região com captação própria, bomba elétrica e irrigação pressurizada.\n\n__Primeiros adotantes:__ propriedade-piloto ainda não selecionada (exige poço regularizado e energia).'
    ]], [24, 22, 20, 18, 16])
    d.tb(['8. Métricas de desempenho', '5. Canais', '7. Estrutura de custos', '6. Estrutura de receita'], [[
        '≥ 90% das leituras programadas registradas; falhas simuladas detectadas; falsos alertas; tempo até o alerta; operação local em 100% dos ciclos de teste sem internet; compreensão da recomendação pelo operador.',
        'Visitas técnicas; dias de campo; cooperativas; empresas de irrigação; agrônomos; indicação de produtores.',
        'Componentes e kits; montagem; instalação e calibração; software e armazenamento; comunicação; deslocamento; suporte e garantia. Valores de planejamento no Anexo A.',
        'Premissa a validar: implantação de R$ 9.900 (talhão de 10 ha, infraestrutura principal existente) mais assinatura de R$ 249 por mês. Manutenção presencial, troca de sensores e análises laboratoriais fora do preço. Sem vendas realizadas.'
    ]], [28, 20, 26, 26])

    d.h1('3. Requalificação das atividades')
    d.p('O operador deixa de abrir e fechar a irrigação por calendário e de percorrer a linha sem informação e passa a supervisionar o painel, validar alertas, ajustar limiares e registrar ocorrências. O técnico passa a analisar dados e calibrar. Surgem funções de instalação e manutenção de sensores. Essa mudança é coerente com o Guia de Tecnologias (SENAI, 2026) e deve ser verificada nas perguntas 7 e 8 do roteiro da Entrega 3. A decisão final permanece humana por desenho.')

    d.h1('4. Coerência entre as entregas')
    d.tb(['Elemento', 'Onde está', 'Verificação de coerência'], [
        ['Problema e público', 'Entrega 2', 'Mesmo recorte: cana em Jaú, captação própria, bomba elétrica.'],
        ['Hipóteses de valor', 'Entrega 3', 'H1 a H5 correspondem às dores, ganhos e preço desta entrega.'],
        ['Diferencial', 'Entrega 4', 'Sem reivindicar novidade na comparação de vazão.'],
        ['Escopo do MVP', 'Entrega 6', 'F1, F2 e F3 correspondem à coluna "Solução" do canvas.'],
    ], [28, 20, 52])

    d.h1('Anexo A — Premissas econômicas (plano de negócios do projeto)')
    d.p('Origem: relatório da etapa semifinal da Equipe Atlas. São premissas de planejamento e devem ser substituídas por cotações e por dados do piloto. A equipe recalculou todos os resultados abaixo a partir das premissas e confirmou a aritmética.')
    d.tb(['Premissa', 'Valor'], [
        ['Investimento inicial estimado para um piloto comercial', 'R$ 26.000 (R$ 8.000 protótipo; R$ 12.000 dois kits de demonstração; R$ 3.000 software e comunicação; R$ 3.000 documentação, deslocamentos e reserva)'],
        ['Custo direto por implantação', 'R$ 6.200'], ['Preço estimado de implantação (talhão de 10 ha)', 'R$ 9.900'],
        ['Assinatura mensal · custo variável por assinatura', 'R$ 249 · R$ 60'], ['Despesa fixa mensal (conservador e base · otimista)', 'R$ 5.500 · R$ 7.000'],
        ['Provisão tributária de planejamento', '6% da receita (a confirmar com contador)'],
    ], [50, 50])
    d.tb(['Cenário', 'Volume anual', 'Faturamento', 'Resultado operacional aproximado'], [
        ['Conservador', '12 implantações; 6 assinaturas médias', 'R$ 136.728', '− R$ 16.200'],
        ['Base', '24 implantações; 12 assinaturas médias', 'R$ 273.456', 'R$ 33.600'],
        ['Otimista (exige parceiro de instalação)', '36 implantações; 18 assinaturas médias', 'R$ 410.184', 'R$ 65.400'],
    ], [26, 34, 16, 24])
    d.p('Memória de cálculo. Contribuição por assinatura: 249 − 60 − 6% × 249 (R$ 14,94) = R$ 174,06 por mês. Contribuição por implantação após a provisão: 9.900 × 0,94 − 6.200 = R$ 3.106. Cenário base: 24 × 3.106 + 12 × 12 × 174,06 − 12 × 5.500 ≈ R$ 33.609. Ponto de equilíbrio simplificado: 5.500 ÷ 174,06 ≈ 32 assinaturas sem novas implantações, ou 14 assinaturas com uma implantação no mês. Não foi elaborado fluxo de caixa mensal; portanto o prazo de retorno do investimento não é estimado.')

    d.h1('Referências')
    d.refs(refs_de('IBGE', 'Bufon', 'Guia', 'Repo', 'Caderno', 'Regul'))
    return d
