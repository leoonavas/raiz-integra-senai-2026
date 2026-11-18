from mini import Doc
from dados import *
from xl import planilha

# (solução, categoria, o que a fonte afirma, solo/clima, vazão e alerta, operação sem internet, observação, fonte)
SOL = [
    ['Rain Bird ESP-LXME / ESP-LXMEF', 'Controlador modular de irrigação',
     'Controlador modular de 8 a 48 estações; módulo opcional de vazão com utilitário "Learn Flow" e totalizador; FloWatch protege contra vazão alta e baixa com reações definidas pelo usuário (exige sensor de vazão). Monitoramento remoto é opcional via IQ4.',
     'A página não menciona sensor de solo nem recomendação por clima', 'Sim: FloWatch (vazão alta e baixa) com sensor de vazão',
     'A página não afirma que exija internet para o FloWatch; o remoto (IQ4) é opcional', 'Voltado à programação de estações; não é específico para cana nem para poço com bomba única', 'RAIN BIRD ([s.d.])'],
    ['Lindsay FieldNET', 'Plataforma de monitoramento e controle remoto de irrigação',
     'Acesso e controle remotos de pivôs, bombas, medidores de vazão e sensores; o controle de bombas monitora pressão, nível, temperatura, vazão e vazão totalizada e liga e desliga até duas bombas. ',
     'A página não destaca recomendação por solo e clima (o monitoramento inclui chuva, temperatura e outros sensores)', 'Monitora vazão e vazão totalizada; a página não descreve alertas',
     'A página não informa o requisito de conectividade', 'Orientada a pivôs e grandes áreas', 'LINDSAY ([s.d.])'],
    ['CropX', 'Plataforma de agronomia digital',
     'Sensores de solo em várias profundidades, estações meteorológicas e pluviômetro; modelos agronômicos transformam umidade e temperatura do solo em orientação de quando irrigar; integrações com controladores e softwares de fazenda por API.',
     'Sim', 'A página não destaca detecção de anomalia de vazão', 'A página não informa; é uma plataforma de software com telemetria', 'Solução ampla de agronomia, com mais de 180 integrações declaradas', 'CROPX ([s.d.])'],
    ['Agrosmart (BoosterPRO)', 'Plataforma brasileira de clima e manejo de irrigação',
     'Plataforma de monitoramento climático e manejo de irrigação; declara apoiar mais de 90 culturas em mais de 9 países; oferece aplicativo gratuito com informações climáticas e agronômicas.',
     'Sim (manejo de irrigação e clima)', 'A página não menciona vazão', 'A página não informa', 'Empresa brasileira; a página não descreve como as recomendações são geradas', 'AGROSMART ([s.d.])'],
    ['Bermad MUT1000 (série MC608)', 'Medidor de vazão eletromagnético',
     'Medidor de vazão eletromagnético para tubulações de 1" a 12" (DN25 a DN300), conforme a ficha em português.',
     'Não se aplica', 'Mede vazão; a interpretação do desvio fica por conta do usuário', 'Não se aplica (instrumento de medição)', 'Equipamento de medição isolado; não decide irrigação', 'BERMAD ([s.d.])'],
]
PAT = [
    ['US 10,166,565 B2 (Lemkin, 2019)', 'Patente', 'Sistema de monitoramento de irrigação com sensor de vazão, controlador de irrigação com ao menos duas saídas e monitor que detecta condição de falha e toma uma ação; a falha é identificada quando a vazão medida se afasta de um valor nominal ou esperado.', 'Concedida em 1 jan. 2019 (depósito em 23 nov. 2016). A página do Google Patents indica situação ativa; a equipe não verificou a vigência jurídica.'],
    ['US 10,039,240 B2 (Darnold, 2018)', 'Patente', 'Método de monitoramento de fluxo em ramais de aspersão: estabelece vazão de referência por ramal, define dois limiares (alerta e redução ou parada do fluxo) e compara as leituras com esses limiares.', 'Concedida em 7 ago. 2018; página do Google Patents indica depósito em 14 ago. 2014.'],
]

def build():
    d = Doc('Entrega 4 — Anterioridade e benchmarking', 'Entrega 4 — Pesquisa de anterioridade, benchmarking e referências', 'RAIZ_ATLAS_E4_Anterioridade_Benchmarking')
    abertura(d, 'Entrega 4 — Pesquisa de anterioridade, benchmarking e referências')
    d.note('**Limites desta pesquisa.** A equipe consultou, em ' + ACESSO + ', páginas oficiais de fabricantes, a base Google Patents e um periódico científico. **Não foi feita busca na base do INPI** (patentes e programas de computador no Brasil), nem análise de liberdade de operação (freedom to operate) por profissional da área. Cada afirmação sobre um produto reproduz o que a fonte citada diz; quando a fonte não informa algo, a matriz registra "não consta na fonte consultada" e **não** conclui que o produto não tem a função. Os acessórios e preços não foram cotados.')

    d.h1('1. Tema pesquisado')
    d.p('Monitoramento e apoio à decisão de irrigação com medição de vazão e alerta de anomalias, com operação local sem internet, para propriedades agrícolas de pequeno e médio porte com captação própria.')
    d.h1('2. Palavras-chave e bases consultadas')
    d.tb(['Item', 'Registro'], [
        ['Palavras-chave (português)', 'irrigação cana-de-açúcar; manejo da irrigação sensor de solo; sensor de umidade de baixo custo ESP32; medidor de vazão eletromagnético irrigação; outorga de poço tubular São Paulo'],
        ['Palavras-chave (inglês)', 'irrigation controller flow sensor alarm; irrigation monitoring flow fault detection patent; soil moisture irrigation platform; remote pump monitoring flow meter'],
        ['Bases e sites consultados', 'Páginas de fabricantes (Rain Bird, Lindsay, CropX, Agrosmart, Bermad); Google Patents; revista Irriga (UNESP); portais da ANA e do IBGE; infoteca da Embrapa'],
        ['Base não consultada', 'INPI (busca de patentes e programas de computador); a ser consultada antes de qualquer pedido de proteção ou comercialização'],
        ['Data de acesso', ACESSO],
    ], [26, 74])

    d.h1('3. Soluções similares encontradas')
    d.tb(['Solução', 'Categoria', 'O que a fonte afirma', 'Fonte'], [[s[0], s[1], s[2], s[7]] for s in SOL], [18, 17, 49, 16])
    d.h2('Patentes relacionadas (anterioridade técnica)')
    d.tb(['Documento', 'Tipo', 'O que descreve', 'Situação informada pela fonte'], PAT, [20, 10, 45, 25])
    d.h2('Referência científica')
    d.p('Sensor de umidade do solo de baixo custo com ESP32 foi desenvolvido e calibrado contra umidade gravimétrica em Latossolos Vermelhos, com R² = 0,9421 (OLIVEIRA et al., 2025). O trabalho não é um produto, mas sustenta a escolha de microcontrolador e sensor de baixo custo, desde que haja calibração no solo usado.')

    d.h1('4. Critérios de comparação')
    d.p('Funcionalidade (decisão de irrigação por solo e clima; medição de vazão e alerta de desvio); operação sem internet; possibilidade de aproveitar a infraestrutura existente (retrofit); porte e foco do produto. Custo e maturidade não foram comparados porque preços não foram cotados.')
    d.tb(['Solução', 'Decisão por solo e clima', 'Vazão e alerta de desvio', 'Operação sem internet', 'Porte e foco'],
         [[s[0], s[3], s[4], s[5], s[6]] for s in SOL] + [
         ['Planilhas e anotações manuais', 'Depende do operador', 'Depende da inspeção', 'Sim', 'Prática corrente (hipótese a confirmar nas entrevistas — Entrega 3)']], [20, 20, 22, 20, 18])

    d.h1('5. Lacunas identificadas')
    d.bl(['**Funções separadas.** Nas fontes consultadas, a decisão por solo e clima aparece em plataformas de nuvem (CropX, Agrosmart, Lindsay), enquanto a proteção de vazão aparece em controladores e instrumentos (Rain Bird, medidores). Nenhuma das páginas consultadas descreve um conjunto único que reúna recomendação por solo e clima, alerta de vazão e operação local para o poço de uma propriedade.',
          '**Operação sem internet pouco declarada.** As páginas das plataformas consultadas não informam o que continua funcionando sem conexão. Isso não prova que não funcionem offline; indica que a informação não está disponível ao comprador nessas fontes.',
          '**Escala e foco.** Os produtos encontrados atendem pivôs, grandes áreas ou culturas diversas; não encontramos nas fontes oferta voltada a pequenas e médias propriedades de cana com poço próprio e bomba única.',
          '**Limite da lacuna.** A busca foi feita em poucas fontes e sem consulta ao INPI. A lacuna é uma conclusão provisória e deve ser revisada se uma solução equivalente for encontrada.'])

    d.h1('6. Anterioridade, inspiração, cópia e adaptação')
    d.tb(['Elemento do Raiz', 'Classificação', 'Justificativa'], [
        ['Comparar a vazão medida com um valor esperado e alertar o desvio', 'Anterioridade existente', 'Descrito nas patentes US 10,166,565 e US 10,039,240 e oferecido por controladores comerciais (FloWatch). O Raiz **não reivindica novidade** nesta ideia.'],
        ['Usar umidade do solo e previsão de chuva para recomendar irrigação', 'Prática técnica conhecida', 'Método combinado recomendado pela Embrapa (BUFON, [s.d.]) e oferecido por plataformas comerciais.'],
        ['Regras do gateway (limiar de umidade, tolerância de vazão, persistência de leituras, tempo máximo de bomba)', 'Implementação própria', 'Código escrito pela equipe no repositório do projeto; os valores iniciais (30% de umidade crítica, 20% de tolerância, 3 leituras, 60 minutos de bomba) são parâmetros de partida a calibrar, não cópia de produto.'],
        ['Gateway que roda no local e passa a execução para a nuvem quando há internet, com um único dono ativo', 'Combinação própria', 'Arquitetura do projeto (EQUIPE ATLAS, 2026). A equipe não encontrou descrição equivalente nas fontes consultadas, mas não afirma ineditismo.'],
        ['Decisão final sempre do operador (aceita, ajusta ou recusa)', 'Princípio de projeto', 'Decisão de desenho para segurança e para requalificação do operador (SENAI, 2026).'],
    ], [32, 20, 48])
    d.p('Cuidado de propriedade intelectual. Patentes têm validade territorial e as citadas são dos Estados Unidos; a equipe não verificou depósitos equivalentes no Brasil. Antes de qualquer comercialização, é necessário consultar o INPI e um profissional de propriedade intelectual. Nenhum código, texto, imagem ou marca de terceiros foi copiado neste projeto; os nomes de produtos aparecem apenas como referência de pesquisa (Art. 104).')

    d.h1('7. Diferencial proposto')
    d.p('O diferencial não está em uma função isolada, mas na **combinação** de: (a) recomendação por solo e previsão de chuva com decisão final do operador; (b) alerta de desvio de vazão por regra de persistência (reduz falso alerta); (c) operação local sem internet como requisito, com sincronização posterior; (d) foco em propriedade com poço próprio e possibilidade de retrofit; (e) implantação por módulos. Esses pontos são hipóteses de valor a validar com usuários (Entrega 3) e com a bancada física.')

    d.h1('8. Parecer técnico final')
    d.p('Há espaço para a proposta como solução de entrada para pequenas e médias propriedades, desde que o Raiz não seja apresentado como inovação de função (a comparação de vazão já é conhecida e patenteada em outros países) e sim como combinação local-first, modular e de baixo custo. Cuidados: (1) consultar o INPI e avaliar liberdade de operação antes de comercializar; (2) confirmar com cotações se o custo é realmente menor que o das alternativas; (3) confirmar nas entrevistas que a operação sem internet é valorizada; (4) não afirmar economia sem dados comparáveis.')

    d.h1('Referências')
    d.refs(refs_de('RainBird', 'Lindsay', 'CropX', 'Agrosmart', 'Bermad', 'Pat166', 'Pat039', 'Irriga', 'Bufon', 'Guia', 'Repo', 'Caderno'))
    return d

def planilhas(pasta):
    linhas = [[s[0], s[1], s[3], s[4], s[5], s[6], s[7]] for s in SOL] + [
        ['Planilhas e anotações manuais', 'Prática corrente', 'Depende do operador', 'Depende da inspeção', 'Sim', 'Hipótese a confirmar (Entrega 3)', 'Sem fonte (hipótese)']]
    fontes = [[ 'Rain Bird — ESP-LXME e ESP-LXMEF', 'Página de fabricante', 'https://www.rainbird.com/products/esp-lxme-esp-lxmef-modular-controllers', ACESSO],
              ['Lindsay — FieldNET (monitoramento e controle remoto)', 'Página de fabricante', 'https://www.lindsay.com/lam/en/irrigation/brands/fieldnet/solutions/remote-monitoring-control', ACESSO],
              ['CropX', 'Página de fabricante', 'https://www.cropx.com', ACESSO], ['Agrosmart', 'Página de fabricante', 'https://www.agrosmart.com.br', ACESSO],
              ['Bermad — MUT1000 MC608 (ficha em português)', 'Ficha técnica', 'https://catalog.bermad.com/BERMAD-Assets/Electromagnetic-Flow-Meters/Product-Pages/MUT1000-MC608/MUT1000-MC608-Product-Page-Metric-Portuguese.pdf', ACESSO],
              ['US 10,166,565 B2', 'Patente (Google Patents)', 'https://patents.google.com/patent/US10166565', ACESSO], ['US 10,039,240 B2', 'Patente (Google Patents)', 'https://patents.google.com/patent/US10039240B2/en', ACESSO],
              ['Irriga v. 30, 2025, p. 102-107', 'Artigo científico', 'https://revistas.fca.unesp.br/index.php/irriga/article/view/4979', ACESSO],
              ['Embrapa Cerrados — capítulo 26 (Bufon)', 'Capítulo técnico', 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1137282/1/Bufon-Cap.-26.pdf', ACESSO]]
    return planilha(f'{pasta}/RAIZ_ATLAS_E4_Matriz_Benchmarking.xlsx', [
        dict(nome='Matriz comparativa', titulo='Raiz — Entrega 4 — Matriz comparativa de soluções similares',
             nota='Cada célula reproduz o que a fonte citada afirma. "A página não informa" significa que a informação não consta na fonte consultada, e não que o produto não tenha a função. Custos não foram cotados.',
             head=['Solução', 'Categoria', 'Decisão por solo e clima', 'Vazão e alerta de desvio', 'Operação sem internet', 'Porte e foco', 'Fonte'], rows=linhas, widths=[28, 24, 28, 30, 30, 36, 20]),
        dict(nome='Patentes', titulo='Patentes relacionadas (Google Patents)', head=['Documento', 'Tipo', 'O que descreve', 'Situação informada'], rows=PAT, widths=[28, 12, 70, 40]),
        dict(nome='Fontes consultadas', titulo='Fontes consultadas e data de acesso', head=['Fonte', 'Tipo', 'Endereço', 'Acesso em'], rows=fontes, widths=[44, 22, 80, 14]),
    ])
