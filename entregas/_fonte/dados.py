"""Dados comuns às entregas: identificação, referências (ABNT) e funções de abertura."""
DATA = '18/11/2026'
ACESSO = '18 nov. 2026'
PROJETO = 'Raiz'
SUBTITULO = 'Sistema modular para decidir quando irrigar e detectar anomalias de vazão na cana-de-açúcar, com operação local mesmo sem internet'
EQUIPE = 'Atlas'
INTEGRANTES = ['Leonardo Henrique Navas (líder)', 'Thomaz de Freitas Candelaria', 'Guilherme Gimenez Nahas', 'Isabella Garcia Luque', 'João Francisco de Freitas Candelaria Filho']
ORIENTADOR = 'Prof. Fernando Pereira de Souza Silva'
COORIENTADOR = 'Cristiano de Paula'
UNIDADE = 'Escola SENAI Edward Savio, Jaú (SP) — Departamento Regional SENAI-SP'
CURSO = 'Desenvolvimento de Sistemas'
PENDENTE = '____________________ (a preencher pela unidade/docente)'
CATEGORIA = 'INTEGRA Inovação Aberta'

REF = {
 'ANA2026': 'AGÊNCIA NACIONAL DE ÁGUAS E SANEAMENTO BÁSICO (Brasil). **Série especial: água e desenvolvimento**. Brasília, DF: ANA, 2026. Disponível em: https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias-periodo-eleitoral-2026/serie-especial-agua-e-desenvolvimento. Acesso em: ' + ACESSO + '.',
 'ANAcana': 'AGÊNCIA NACIONAL DE ÁGUAS E SANEAMENTO BÁSICO (Brasil). **Cana-de-açúcar irrigada e fertirrigada no Brasil**: safra 2018/2019. Brasília, DF: ANA, 2019. Registro de metadados. Disponível em: https://metadados.snirh.gov.br/geonetwork/srv/api/records/9e7e1384-6f05-4400-879f-af714e9ab740. Acesso em: ' + ACESSO + '.',
 'IBGE': 'INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA (IBGE). **Pesquisa Agrícola Municipal**: valor da produção de cana-de-açúcar, Jaú (SP), 2023 a 2025. Sistema IBGE de Recuperação Automática (SIDRA), tabela 1612. Disponível em: https://apisidra.ibge.gov.br/values/t/1612/n6/3525300/v/215/p/last%203/c81/2696. Acesso em: ' + ACESSO + '.',
 'Bufon': 'BUFON, V. B. **Sistema irrigado de produção de cana-de-açúcar no Brasil**: métodos, recomendações e resposta produtiva (capítulo 26). Planaltina, DF: Embrapa Cerrados, [s.d.]. Disponível em: https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1137282/1/Bufon-Cap.-26.pdf. Acesso em: ' + ACESSO + '.',
 'Valor': 'NERY, C. Alto custo dos equipamentos e complexidade dos processos de outorga limitam a expansão da área irrigada. **Valor Econômico**, 31 jul. 2025. Reprodução em: DEMAREST ADVOGADOS. Na Mídia. Disponível em: https://www.demarest.com.br/wp-content/uploads/2025/07/Alto-custo-dos-equipamentos-e-complexidade-dos-processos-de-outorga-limitam-a-expansao-da-area-irrigada.pdf. Acesso em: ' + ACESSO + '.',
 'RainBird': 'RAIN BIRD. **ESP-LXME & ESP-LXMEF Modular Controllers**. [S. l.]: Rain Bird, [s.d.]. Disponível em: https://www.rainbird.com/products/esp-lxme-esp-lxmef-modular-controllers. Acesso em: ' + ACESSO + '.',
 'Lindsay': 'LINDSAY CORPORATION. **FieldNET — remote irrigation monitoring and control**. [S. l.]: Lindsay, [s.d.]. Disponível em: https://www.lindsay.com/lam/en/irrigation/brands/fieldnet/solutions/remote-monitoring-control. Acesso em: ' + ACESSO + '.',
 'CropX': 'CROPX. **CropX — digital agronomy platform**. [S. l.]: CropX, [s.d.]. Disponível em: https://www.cropx.com. Acesso em: ' + ACESSO + '.',
 'Agrosmart': 'AGROSMART. **Agrosmart — monitoramento climático e manejo de irrigação (BoosterPRO)**. [S. l.]: Agrosmart, [s.d.]. Disponível em: https://www.agrosmart.com.br. Acesso em: ' + ACESSO + '.',
 'Bermad': 'BERMAD. **Medidor de vazão eletromagnético MUT1000 (série MC608)**: ficha de produto. [S. l.]: Bermad, [s.d.]. Disponível em: https://catalog.bermad.com/BERMAD-Assets/Electromagnetic-Flow-Meters/Product-Pages/MUT1000-MC608/MUT1000-MC608-Product-Page-Metric-Portuguese.pdf. Acesso em: ' + ACESSO + '.',
 'Pat166': 'LEMKIN, M. A. **Irrigation monitoring system and method for monitoring flow rate into irrigation system to determine the existence or absence of an irrigation fault**. Depositante: indivíduo. US 10,166,565 B2. Depósito: 23 nov. 2016. Concessão: 1 jan. 2019. Disponível em: https://patents.google.com/patent/US10166565. Acesso em: ' + ACESSO + '.',
 'Pat039': 'DARNOLD, R. A. **Device for monitoring and controlling water flow**. Depositante: indivíduo. US 10,039,240 B2. Depósito: 14 ago. 2014. Concessão: 7 ago. 2018. Disponível em: https://patents.google.com/patent/US10039240B2/en. Acesso em: ' + ACESSO + '.',
 'Irriga': 'OLIVEIRA, T. H. de et al. Desenvolvimento e calibração de um sensor de umidade do solo de baixo custo com ESP32 para aplicação em Latossolos Vermelhos. **Irriga**, Botucatu, v. 30, p. 102-107, 2025. DOI: 10.15809/irriga.2025v30p102-107. Disponível em: https://revistas.fca.unesp.br/index.php/irriga/article/view/4979. Acesso em: ' + ACESSO + '.',
 'DAEE': 'SÃO PAULO (Estado). Departamento de Águas e Energia Elétrica (DAEE). **Instrução Técnica DPO nº 10/2017**: licença de execução de poços tubulares e outorga de direito de uso de recursos hídricos subterrâneos. São Paulo: DAEE, 2017. Disponível em: https://www.comitespcj.org.br/images/Download/IT-DAEE-DPO-10-17.pdf. Acesso em: ' + ACESSO + '.',
 'LGPD': 'BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: ' + ACESSO + '.',
 'Regul': 'SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL (SENAI). Departamento Nacional. **Regulamento INTEGRA SENAI 2026**, versão 3, 21 maio 2026. Brasília, DF: SENAI, 2026.',
 'Caderno': 'SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL (SENAI). Departamento Nacional. **Caderno Nacional de Templates das Entregas Obrigatórias — INTEGRA SENAI 2026** (Anexo 1). Brasília, DF: SENAI, 2026.',
 'Guia': 'SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL (SENAI). Departamento Nacional. **Guia de Tecnologias INTEGRA SENAI 2026** (Anexo 3), versão final v3. Brasília, DF: SENAI, 2026.',
 'Repo': 'EQUIPE ATLAS. **Raiz — INTEGRA SENAI 2026**: repositório do projeto (app, fazenda digital, gateway, protocolo e documentos). Jaú, SP, 2026. Disponível em: https://github.com/leoonavas/raiz-integra-senai-2026. Acesso em: ' + ACESSO + '.',
}

def refs_de(*chaves): return [REF[c] for c in chaves]

def abertura(d, titulo, extra=None):
    """Título + quadro de identificação exigido pelo Caderno (projeto, equipe, unidade, curso/turma, docente orientador)."""
    d.title(titulo, f'Projeto {PROJETO} · Equipe {EQUIPE} · INTEGRA SENAI 2026 · versão de {DATA}')
    rows = [['Nome do projeto', f'{PROJETO} — {SUBTITULO}'], ['Nome da equipe', f'Equipe {EQUIPE}'],
            ['Integrantes', '; '.join(INTEGRANTES)], ['Unidade SENAI', UNIDADE], ['Curso / turma', f'{CURSO} / turma: {PENDENTE}'],
            ['Docente orientador', ORIENTADOR], ['Coorientador', COORIENTADOR], ['Categoria', CATEGORIA]]
    if extra: rows += extra
    d.tb(['Identificação', ''], rows, [28, 72])
