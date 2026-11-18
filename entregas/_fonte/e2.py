from mini import Doc
from dados import *

def build():
    d = Doc('Entrega 2 — Diagnóstico', 'Entrega 2 — Diagnóstico do problema ou oportunidade', 'RAIZ_ATLAS_E2_Diagnostico')
    abertura(d, 'Entrega 2 — Diagnóstico do problema ou oportunidade')
    d.note('**Como ler este diagnóstico.** Cada afirmação é classificada como **dado** (número publicado por fonte oficial, com ano), **inferência** (cálculo ou dedução da equipe a partir de dados) ou **hipótese** (provável, ainda não confirmada em campo). A tabela da seção 7 reúne todas as afirmações com a fonte correspondente. Nenhum número neste documento foi medido pela equipe em propriedades reais.')

    d.h1('1. Problema ou oportunidade identificada')
    d.p('Em propriedades de cana-de-açúcar com captação própria de água, a decisão de quando irrigar e a percepção de falhas na linha de irrigação (vazamento, entupimento, bomba funcionando sem água) dependem de inspeção humana e de rotina, sem medição contínua e sem registro histórico. Quando a falha é percebida tarde, há desperdício de água e de energia e risco de parada da irrigação em momento de necessidade da cultura. Em locais com internet instável, soluções que dependem exclusivamente de painel na nuvem deixam de funcionar justamente quando o operador precisa de alerta.')
    d.p('Classificação: a existência de falhas de vazão e do uso de rotina para decidir a irrigação é uma **hipótese** a confirmar na pesquisa de campo (Entrega 3). O que está comprovado por fonte oficial é a **relevância** do tema (seção 4), não a frequência do problema em cada propriedade.')

    d.h1('2. Contexto de ocorrência')
    d.tb(['Aspecto', 'Descrição', 'Classificação e fonte'], [
        ['Onde', 'Propriedades de cana-de-açúcar de Jaú (SP) e região, com irrigação pressurizada, poço próprio e bomba elétrica. Recorte inicial de planejamento: um talhão de cerca de 10 hectares.', 'Recorte de projeto definido pela equipe; Jaú tem valor de produção de cana de R$ 399,4 milhões em 2025 (dado; IBGE, 2025).'],
        ['Quando', 'Período de irrigação da cultura, em que a decisão de ligar a bomba e a verificação da vazão são recorrentes.', 'Hipótese de contexto, a confirmar nas entrevistas.'],
        ['Com quem', 'Produtor ou gestor, operador de irrigação e técnico agrícola.', 'Papéis descritos em Embrapa (BUFON, [s.d.]) e a confirmar na pesquisa de campo.'],
        ['Situação', 'A decisão de irrigação combina clima, solo e, quando existente, sensoriamento. A literatura técnica recomenda o método combinado (clima como referência, com sensores de solo para aferir). Falhas de vazão exigem comparação com um valor esperado.', 'Dado: método combinado recomendado para cana irrigada (BUFON, [s.d.]). Dado: controladores comerciais protegem contra vazão alta e baixa (RAIN BIRD, [s.d.]) e patentes descrevem a comparação da vazão medida com a esperada (LEMKIN, 2019).'],
    ], [13, 47, 40])

    d.h1('3. Público afetado ou beneficiário')
    d.tb(['Grupo', 'Como é afetado', 'Classificação'], [
        ['Produtor ou gestor da propriedade', 'Custo de água e energia; risco à produtividade; precisa de registro para decidir e para prestar contas de uso da água.', 'Hipótese; a validar na Entrega 3.'],
        ['Operador de irrigação', 'Liga e desliga a bomba e percorre a linha. A mudança prevista é de acionar por rotina para supervisionar alertas (requalificação).', 'Hipótese; requalificação conforme o Guia de Tecnologias (SENAI, 2026).'],
        ['Técnico agrícola ou agrônomo', 'Precisa de dados de umidade, vazão e histórico para ajustar o manejo.', 'Hipótese; a validar na Entrega 3.'],
        ['Meio ambiente e sociedade', 'A irrigação concentra a maior parte da retirada de água do país; desperdício reduz a disponibilidade para outros usos.', 'Dado: 50,3% da retirada em 2024 (ANA, 2026).'],
    ], [26, 50, 24])

    d.h1('4. Relevância: dados oficiais')
    d.tb(['Dado', 'Valor', 'Ano', 'Fonte', 'Tipo'], [
        ['Participação da irrigação na retirada de água para usos consuntivos no Brasil', '50,3% (1.056,3 m³/s)', '2024', 'ANA (2026)', 'Dado'],
        ['Retirada total de água no Brasil (cálculo a partir do dado anterior)', 'cerca de 2.100 m³/s (1.056,3 ÷ 0,503)', '2024', 'Cálculo da equipe sobre ANA (2026)', 'Inferência'],
        ['Área de cana-de-açúcar no Brasil e área irrigada (água, ou água combinada com água de reúso)', '11,2 milhões de ha; 749 mil ha irrigados (6,7%)', 'safra 2018/2019', 'ANA (2019)', 'Dado'],
        ['Valor da produção de cana-de-açúcar em Jaú (SP)', 'R$ 399,4 milhões (2025); R$ 335,5 milhões (2024); R$ 476,0 milhões (2023)', '2023–2025', 'IBGE, PAM (2025)', 'Dado'],
        ['Fatores que limitam a expansão da irrigação no Brasil', 'Custo dos equipamentos e demora e complexidade da outorga', '2025', 'Valor Econômico, 31/07/2025 (NERY, 2025)', 'Dado (reportagem com fontes identificadas)'],
        ['Ganhos de produtividade da cana irrigada em relação ao sequeiro', 'Registrados em experimentos de longa duração da Embrapa Cerrados', 'série de experimentos', 'BUFON ([s.d.])', 'Dado'],
    ], [30, 25, 10, 20, 15])
    d.p('Limites dos dados. O percentual de 50,3% refere-se ao uso nacional e não mede o desperdício dentro de uma propriedade. O valor da produção de cana em Jaú comprova a presença da cultura no município, mas não informa quantas propriedades irrigam, nem se têm poço próprio, nem sua disposição de adotar uma solução. A variação entre 2023 e 2025 (de R$ 476,0 para R$ 335,5 e depois R$ 399,4 milhões) mostra que o valor da produção oscila de um ano para o outro e deve ser lido como ordem de grandeza.')

    d.h1('5. Causas prováveis')
    d.tb(['Causa provável', 'Justificativa', 'Situação'], [
        ['Decisão de irrigar sem leitura contínua de solo e clima', 'A literatura recomenda combinar clima e sensores de solo (BUFON, [s.d.]); sem sensores, o manejo se baseia apenas em estimativas, cujos erros só são percebidos depois de dano à cultura (mesma fonte).', 'Hipótese: a prática local deve ser confirmada em entrevistas.'],
        ['Ausência de medição e de registro histórico da vazão da bomba', 'Controladores comerciais tratam a medição de vazão como módulo opcional (Rain Bird FloWatch exige sensor de vazão e módulo próprio) (RAIN BIRD, [s.d.]).', 'Hipótese, apoiada em evidência indireta: o recurso existe, mas é opcional.'],
        ['Inspeção apenas periódica da linha', 'Falhas como vazamento e entupimento só aparecem quando alguém percorre a linha ou quando a produção é afetada.', 'Hipótese; a confirmar na pergunta 4 do roteiro (Entrega 3).'],
        ['Internet instável em áreas rurais', 'Soluções em nuvem dependem de conexão; a necessidade de operação local é um requisito do projeto.', 'Hipótese; a confirmar na pergunta 5 do roteiro (Entrega 3).'],
        ['Custo dos equipamentos e burocracia de outorga', 'O custo e a demora da outorga limitam a expansão da irrigação (NERY, 2025).', 'Dado; afeta a adoção de soluções, não a existência do problema.'],
    ], [28, 45, 27])

    d.h1('6. Impactos')
    d.tb(['Impacto', 'Natureza', 'Situação'], [
        ['Água e energia aplicadas fora do momento ideal ou perdidas em vazamentos', 'Produtivo, ambiental e econômico', 'Hipótese. Não há medição própria da equipe.'],
        ['Bomba funcionando sem água ou com restrição na saída (danos ao equipamento)', 'Técnico e econômico', 'Hipótese. A medição de vazão é a forma direta de detectar o desvio.'],
        ['Paradas inesperadas da irrigação em período de necessidade da cultura', 'Produtivo', 'Hipótese; ligada à produtividade da cana irrigada (BUFON, [s.d.]).'],
        ['Pressão sobre a água disponível para outros usos', 'Ambiental e social', 'Dado de contexto: a irrigação é a maior parcela da retirada nacional (ANA, 2026).'],
    ], [48, 22, 30])

    d.h1('7. Evidências utilizadas e rastreabilidade')
    d.p('Todas as evidências desta entrega são documentais (fontes públicas). Não foram usadas fotos, entrevistas nem medições de campo. A tabela relaciona cada afirmação principal à fonte e ao tipo, para facilitar a conferência pela banca.')
    d.tb(['Afirmação', 'Fonte', 'Tipo', 'Como conferir'], [
        ['A irrigação respondeu por 50,3% (1.056,3 m³/s) da retirada de água em 2024', 'ANA (2026)', 'Dado', 'Página "Série especial: água e desenvolvimento", portal da ANA'],
        ['749 mil ha de cana irrigados em 11,2 milhões de ha (6,7%) na safra 2018/2019', 'ANA (2019)', 'Dado', 'Registro de metadados do SNIRH'],
        ['Valor da produção de cana em Jaú: R$ 399.375 mil em 2025', 'IBGE (2025)', 'Dado', 'Consulta à tabela 1612 do SIDRA para o município de Jaú (código 3525300)'],
        ['Custo dos equipamentos e a outorga limitam a expansão da irrigação', 'Valor Econômico (2025)', 'Dado', 'Reprodução da reportagem em arquivo PDF'],
        ['O método combinado (clima, solo e planta) é recomendado para cana irrigada', 'BUFON ([s.d.])', 'Dado', 'Seção 26.4.1.3 do capítulo 26'],
        ['Controladores comerciais protegem contra vazão alta e baixa; patentes descrevem a comparação com a vazão esperada', 'Rain Bird ([s.d.]); Lemkin (2019)', 'Dado', 'Página do produto ESP-LXME (FloWatch); patente US 10,166,565'],
        ['Decisão por rotina, falhas percebidas tarde e internet instável em propriedades de Jaú', 'Sem fonte', 'Hipótese', 'Entrevistas da Entrega 3 (ainda não realizadas)'],
    ], [38, 18, 10, 34])

    d.h1('8. Oportunidade de inovação')
    d.p('A literatura técnica orienta o manejo combinando clima e sensores de solo, e controladores comerciais e patentes já tratam da vazão alta, baixa e esperada. A oportunidade identificada não é inventar essas funções, mas reuni-las em um sistema modular e de baixo custo para a propriedade com poço próprio, com **operação local sem internet** como requisito, **decisão final do operador** e registro histórico. A existência de soluções semelhantes e as lacunas encontradas estão na Entrega 4; a proposta de valor está na Entrega 5.')

    d.h1('9. Limitações deste diagnóstico')
    d.bl(['Não há pesquisa de campo realizada: causas, impactos e público são hipóteses até a conclusão da Entrega 3.',
          'Os números de contexto são nacionais, estaduais ou municipais e não representam uma propriedade específica.',
          'O recorte de 10 hectares é um parâmetro de planejamento do piloto, não uma medida de uma propriedade real.'])
    d.h1('Referências')
    d.refs(refs_de('ANA2026', 'ANAcana', 'IBGE', 'Valor', 'Bufon', 'RainBird', 'Pat166', 'Guia', 'Caderno', 'Regul'))
    return d
