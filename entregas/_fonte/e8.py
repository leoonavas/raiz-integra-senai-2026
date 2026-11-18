import os, html, subprocess, tempfile
from mini import Doc, CHROME
from dados import *
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
# slides: título, lista de pontos, imagens, fonte (rodapé), nota do apresentador
SLIDES = [
 dict(t='Raiz', sub='Sistema modular para decidir quando irrigar e detectar anomalias de vazão na cana-de-açúcar, com operação local mesmo sem internet',
      b=['Equipe Atlas — Escola SENAI Edward Savio, Jaú (SP)', 'Leonardo Henrique Navas · Thomaz de Freitas Candelaria · Guilherme Gimenez Nahas · Isabella Garcia Luque · João Francisco de Freitas Candelaria Filho',
         'Orientador: Prof. Fernando Pereira de Souza Silva · Coorientador: Cristiano de Paula', 'INTEGRA SENAI 2026 · categoria Inovação Aberta'], img=[], fonte='', nota='Abertura gravada no vídeo (Leonardo).'),
 dict(t='1. Problema', b=['A irrigação respondeu por 50,3% da água retirada no Brasil em 2024 (1.056,3 m³/s).', 'Em propriedades com poço próprio, decidir quando irrigar e perceber falhas de vazão a tempo pode depender de rotina e inspeção (hipótese a confirmar em entrevistas).', 'Vazamento, entupimento e bomba sem água passam despercebidos sem medição contínua.'],
      img=[], fonte='Fonte: ANA (2026), série especial água e desenvolvimento.', nota='O dado é nacional e mede relevância, não desperdício em uma propriedade.'),
 dict(t='2. Público e pesquisa', b=['Cana irrigada: 749 mil ha de 11,2 milhões de ha (6,7%), safra 2018/2019 (ANA, 2019).', 'Jaú: valor da produção de cana de R$ 399,4 milhões em 2025 (IBGE).', 'Público: produtor ou gestor, operador de irrigação e técnico, em Jaú e região.', 'Pesquisa até agora: dados públicos (ANA, IBGE, Embrapa). Entrevistas com produtores: próxima etapa. Os números são contexto, não validação.'],
      img=[], fonte='Fontes: ANA (2019); IBGE (2025); Embrapa Cerrados (Bufon, [s.d.]).', nota='Declarar com clareza que não houve entrevistas.'),
 dict(t='3. Solução', b=['Aplicativo, gateway e dispositivos: sensor de umidade, medidor de vazão, estação de clima e controlador da bomba.', 'F1 recomenda quando irrigar; F2 alerta desvio de vazão; F3 continua lendo, registrando e alertando sem internet.', 'Com internet, as regras rodam na nuvem; sem internet, o gateway local assume. O operador decide sempre.'],
      img=[], fonte='Arquitetura: repositório do projeto (Equipe Atlas, 2026).', nota=''),
 dict(t='4. MVP — demonstração (dados simulados)', b=['MVP digital de média fidelidade: aplicativo, fazenda digital simulada e gateway.', 'Esquerda: fazenda digital. Direita: aplicativo recebendo o alerta de umidade baixa.', 'Todos os números são simulados; não há resultados de campo.'],
      img=['fazenda_umidade.png', 'app_alerta_umidade.png'], pos=[(6.6, 2.0, 3.9, None), (10.8, 1.55, None, 4.9)], fonte='Capturas da fazenda digital e do app.', nota='Vídeo de pitch mostra a demonstração completa.'),
 dict(t='4. MVP — falha de vazão e queda de internet', b=['Vazamento simulado: o app alerta vazão acima do esperado após leituras consecutivas.', 'Internet fora do ar: o app indica operação na rede local e sincroniza ao voltar.'],
      img=['fazenda_vazamento.png', 'app_vazamento.png', 'app_sem_internet.png'], pos=[(6.2, 2.0, 3.1, None), (9.4, 1.7, None, 4.1), (11.35, 1.7, None, 4.1)], fonte='Capturas da fazenda digital e do app (dados simulados).', nota=''),
 dict(t='5. Validação', b=['Testes em simulação, registrados em vídeo; sem resultado de campo.', 'Pesquisa com produtores: ainda não realizada. Não prometemos economia sem dados comparáveis.', 'Próximo registro: ensaios T1 a T4 com repetições e entrevistas.', 'Uso de IA registrado e revisado pela equipe (Entrega 7).'],
      img=[], fonte='Entregas 3, 6 e 7.', nota=''),
 dict(t='6. Diferencial', b=['Comparar vazão com o esperado já existe (controladores comerciais e patentes). Não reivindicamos novidade nisso.', 'O diferencial é a combinação: solo e clima, alerta de vazão e operação local sem internet, em módulos e com possibilidade de retrofit.', 'Valor percebido do diferencial: hipótese a validar com usuários.'],
      img=[], fonte='Fontes: Rain Bird; Lindsay; CropX; Agrosmart; patentes US 10,166,565 e US 10,039,240 (Entrega 4).', nota=''),
 dict(t='7. Impacto', b=['Operador: de acionar por calendário e percorrer a linha às cegas para supervisionar alertas e ajustar regras (requalificação, não substituição).', 'ODS 2, 6, 12 e 13 como direção de impacto; resultados quantitativos dependem do piloto.'], img=[], fonte='Fonte: Guia de Tecnologias INTEGRA SENAI 2026.', nota=''),
 dict(t='8. Próximos passos', b=['1. Bancada: simulação e testes (agora); bancada física com ESP32, sensor e medidor.', '2. Piloto de cerca de 10 ha em Jaú, com autorização do produtor, poço regularizado e instalação por profissional habilitado.', '3. Qualidade da água: apenas triagem (planejado, ainda não implementado).', '4. Decisão de escala, com dados reais.'], img=[], fonte='Fonte: relatório da semifinal e Entrega 6.', nota=''),
 dict(t='Pedido e contato', b=['Buscamos: uma propriedade-piloto em Jaú e mentoria técnica em irrigação.', 'Código, documentos e protocolo: github.com/leoonavas/raiz-integra-senai-2026', 'Narração do vídeo gerada por inteligência artificial. Dados do simulador são fictícios.'], img=['qr.png'], pos=[(8.4, 1.9, None, 3.6)], fonte='', nota=''),
]

def _rgb(c=(0, 0, 0)): return RGBColor(*c)

def pptx(path):
    prs = Presentation(); prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    blank = prs.slide_layouts[6]
    for n, s in enumerate(SLIDES, 1):
        sl = prs.slides.add_slide(blank)
        def tx(x, y, w, h, text, size, bold=False, color=(0, 0, 0)):
            tb = sl.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf = tb.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]; r = p.add_run(); r.text = text; r.font.size = Pt(size); r.font.bold = bold; r.font.name = 'Arial'; r.font.color.rgb = _rgb(color); return tb
        tx(0.6, 0.4, 12, 0.9, s['t'], 38 if n == 1 else 30, True)
        ln = sl.shapes.add_connector(1, Inches(0.6), Inches(1.3), Inches(12.7), Inches(1.3)); ln.line.color.rgb = _rgb(); ln.line.width = Pt(1.5)
        y = 1.55
        if s.get('sub'):
            tx(0.6, y, 12, 1.0, s['sub'], 18); y += 1.1
        w = 12.0 if not s['img'] else 5.8
        tb = sl.shapes.add_textbox(Inches(0.6), Inches(y), Inches(w), Inches(5.2 - (y - 1.55))); tf = tb.text_frame; tf.word_wrap = True
        for i, b in enumerate(s['b']):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph(); r = p.add_run(); r.text = ('• ' if n not in (1,) else '') + b
            r.font.size = Pt(18 if s['img'] else 20); r.font.name = 'Arial'; r.font.color.rgb = _rgb(); p.space_after = Pt(10)
        for j, im in enumerate(s['img']):
            x, yy, ww, hh = s['pos'][j]
            kw = {}
            if ww: kw['width'] = Inches(ww)
            if hh: kw['height'] = Inches(hh)
            pic = sl.shapes.add_picture(os.path.join(IMG, im), Inches(x), Inches(yy), **kw)
            pic.line.color.rgb = _rgb(); pic.line.width = Pt(0.75)
        if s['fonte']: tx(0.6, 6.85, 12, 0.4, s['fonte'], 11)
        tx(12.2, 6.85, 0.8, 0.4, str(n), 11)
        if s['nota']: sl.notes_slide.notes_text_frame.text = s['nota']
    prs.save(path); return path

def slides_pdf(out):
    css = '@page{size:13.333in 7.5in;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}.s{width:13.333in;height:7.5in;padding:0.4in 0.6in;position:relative;page-break-after:always;overflow:hidden}h1{font-size:30pt;margin:0 0 0.15in;padding-bottom:0.08in;border-bottom:1.5pt solid #000}.sub{font-size:17pt;margin-bottom:0.2in}.c{display:flex;gap:0.3in}.l{flex:1;font-size:18pt;line-height:1.3}.l p{margin:0 0 0.12in}.r{width:6in;display:flex;gap:0.15in;align-items:flex-start;justify-content:center}.s img{border:.75pt solid #000}.f{position:absolute;left:0.6in;bottom:0.3in;font-size:11pt}.n{position:absolute;right:0.6in;bottom:0.3in;font-size:11pt}'
    out_h = []
    for n, s in enumerate(SLIDES, 1):
        imgs = ''
        for i, (x, yy, ww, hh) in zip(s['img'], s.get('pos', [])):
            st = f"position:absolute;left:{x}in;top:{yy}in;" + (f"width:{ww}in;" if ww else '') + (f"height:{hh}in;" if hh else '')
            imgs += f'<img src="file://{IMG}/{i}" style="{st}">'
        pts = ''.join(f'<p>{"" if n == 1 else "• "}{html.escape(b)}</p>' for b in s['b'])
        out_h.append(f'<div class="s"><h1>{html.escape(s["t"])}</h1>' + (f'<div class="sub">{html.escape(s["sub"])}</div>' if s.get('sub') else '') + f'<div class="c"><div class="l" style="{"max-width:5.3in" if imgs else ""}">{pts}</div></div>{imgs}<div class="f">{html.escape(s["fonte"])}</div><div class="n">{n}</div></div>')
    h = f'<!doctype html><meta charset="utf-8"><style>{css}</style><body>{"".join(out_h)}</body>'
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f: f.write(h); p = f.name
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out}', 'file://' + p], capture_output=True, timeout=180); os.unlink(p)
    return out

def build():
    d = Doc('Entrega 8 — MVP, pitch e portfólio', 'Entrega 8 — MVP, pitch e portfólio essencial de evidências', 'RAIZ_ATLAS_E8_Portfolio_Evidencias')
    abertura(d, 'Entrega 8 — MVP, pitch e portfólio essencial de evidências')
    d.note('**Composição desta entrega (Art. 69).** (I) MVP digital de média fidelidade, publicado e com código aberto; (II) pitch em vídeo de até 5 minutos e apresentação de slides (arquivos RAIZ_ATLAS_E8_Pitch.pptx e .pdf); (III) este portfólio de evidências, que lista arquivos, links e o que ainda não existe. Todos os dados do MVP são simulados; não há resultado de campo.')

    d.h1('1. Resumo do projeto')
    d.p('Em propriedades de cana-de-açúcar com captação própria, decidir quando irrigar e perceber falhas de vazão pode depender de rotina e inspeção, e soluções só em nuvem deixam de funcionar sem internet (hipóteses do diagnóstico). O Raiz recomenda quando irrigar a partir de umidade do solo e previsão de chuva, alerta desvios de vazão e continua lendo, registrando e alertando sem internet, sempre com a decisão final do operador. A versão atual é um MVP digital com dispositivos simulados; bancada física e piloto de campo são etapas futuras.')

    d.h1('2. MVP')
    d.tb(['Campo', 'Preenchimento'], [
        ['MVP ou protótipo (fidelidade)', 'Média fidelidade, digital. Aplicativo Raiz (interface), fazenda digital simulada em SVG que emite sinais de sensores e recebe comandos, e gateway com núcleo de regras que roda no navegador (local) ou em Edge Function (nuvem). Banco PostgreSQL com acesso por linha (RLS) e autenticação por link mágico.'],
        ['Funcionalidades demonstradas', 'F1 recomendação de irrigação (operador revisa e confirma); F2 alerta de vazão acima do esperado após 3 leituras consecutivas, com cenários de entupimento e vazamento; F3 operação local sem internet com sincronização posterior.'],
        ['Validações realizadas', 'Demonstração das três funções no vídeo de pitch; ensaios exploratórios durante o desenvolvimento, com correção de defeitos achados pela equipe. Não há ensaios formais com repetições nem entrevistas (ver Entregas 3 e 6).'],
        ['Resultados obtidos', 'As funções F1, F2 e F3 funcionam no ambiente simulado. Nenhum resultado de economia, de desempenho em campo ou de aceitação por usuários foi obtido; não será afirmado.'],
        ['Limites declarados', 'Dados simulados; limiares iniciais sem calibração em campo; sem hardware; sem pesquisa de campo.'],
    ], (28, 72))

    d.h1('3. Roteiro do pitch (vídeo de até 5 minutos)')
    d.tb(['Nº', 'Bloco', 'Conteúdo'], [
        ['1', 'Problema', 'Relevância da irrigação na água do Brasil (50,3% em 2024) e falhas de vazão percebidas tarde (hipótese).'],
        ['2', 'Público', 'Produtor, operador e técnico da cana em Jaú; dados da ANA e do IBGE; declaração de que as entrevistas são a próxima etapa.'],
        ['3', 'Solução', 'Aplicativo, gateway e dispositivos; recomendação, alerta e operação local; operador decide.'],
        ['4', 'MVP', 'Demonstração: umidade baixa, alerta, irrigação confirmada pelo operador; vazamento; queda de internet; limiares.'],
        ['5', 'Validação', 'Testes em simulação, sem resultado de campo; uso de IA registrado.'],
        ['6', 'Diferencial', 'Combinação de solo e clima, vazão e operação local, sem reivindicar novidade na comparação de vazão.'],
        ['7', 'Impacto', 'Requalificação do operador; ODS 2, 6, 12 e 13 como direção.'],
        ['8', 'Próximos passos', 'Bancada física, piloto de cerca de 10 ha em Jaú, triagem da água, decisão de escala; pedido de propriedade-piloto e mentoria.'],
    ], [6, 18, 76])
    d.p('Duração do vídeo na versão 4: 4 minutos e 57 segundos. A cena de abertura do problema está provisória, aguardando regravação.')

    d.h1('4. Portfólio de evidências')
    d.p('Pasta única de evidências com nomes padronizados (projeto, equipe e entrega). A coluna "Situação" diz se o arquivo existe ou ainda será produzido.')
    d.tb(['Arquivo ou link', 'Conteúdo', 'Situação'], [
        ['RAIZ_ATLAS_E1_PlanoEnsino (.docx e .pdf)', 'Plano de Ensino e planos de aula; campos de assinatura', 'Existe; falta preencher dados da unidade e assinar'],
        ['RAIZ_ATLAS_E2_Diagnostico (.docx e .pdf)', 'Diagnóstico do problema com dados e fontes', 'Existe'],
        ['RAIZ_ATLAS_E3_Pesquisa (.docx e .pdf) e RAIZ_ATLAS_E3_Registro_Entrevistas.xlsx', 'Pesquisa documental, roteiro, termo e registro em branco', 'Existe; entrevistas a realizar'],
        ['RAIZ_ATLAS_E4_Anterioridade_Benchmarking (.docx e .pdf) e RAIZ_ATLAS_E4_Matriz_Benchmarking.xlsx', 'Benchmarking, patentes e parecer técnico', 'Existe; falta busca no INPI'],
        ['RAIZ_ATLAS_E5_PropostaValor_LeanCanvas (.docx e .pdf)', 'Proposta de valor, Lean Canvas e premissas econômicas', 'Existe'],
        ['RAIZ_ATLAS_E6_PlanejamentoMVP (.docx e .pdf) e RAIZ_ATLAS_E6_Planejamento.xlsx', 'Planejamento, riscos, recursos e protocolo de testes', 'Existe; ensaios a registrar'],
        ['RAIZ_ATLAS_E7_RegistroIA (.docx e .pdf) e RAIZ_ATLAS_E7_RegistroIA.xlsx', 'Registro de IA e validação humana', 'Existe; validação humana pendente'],
        ['RAIZ_ATLAS_E8_Pitch (.pptx e .pdf)', 'Apresentação de slides do pitch', 'Existe'],
        ['raiz_pitch_v4.mp4', 'Vídeo de pitch de 4:57 com demonstração do MVP', 'Existe; cena de abertura provisória; falta hospedar em link acessível'],
        ['https://github.com/leoonavas/raiz-integra-senai-2026', 'Código-fonte, protocolo (docs/PROTOCOLO.md), migrações do banco e documentos', 'Existe (repositório público)'],
        ['https://raiz-app-five.vercel.app/', 'Aplicativo Raiz publicado', 'Existe (endereço configurado no projeto; conferir se está no ar antes de enviar)'],
        ['Fotos e registros da bancada física', 'Evidências de hardware', 'A produzir'],
        ['Planilha de ensaios T1 a T4 com repetições', 'Resultados de teste', 'A produzir (aba Testes da planilha da Entrega 6)'],
    ], [40, 36, 24])

    d.h1('5. Próximos passos')
    d.tb(['Fase', 'O que', 'Condição'], [
        ['1 — Bancada (agora)', 'Simulação e testes; depois bancada física com ESP32, sensor e medidor de vazão', 'Cotação e compra de materiais'],
        ['2 — Piloto', 'Talhão de cerca de 10 ha em Jaú, com linha de base e teste local e conectado', 'Autorização do produtor, poço regularizado (DAEE), instalação por profissional habilitado'],
        ['3 — Qualidade da água (planejado, não implementado)', 'pH, condutividade e turbidez como triagem, nunca como prova de potabilidade', 'Calibração, procedimento de encaminhamento a laboratório'],
        ['4 — Decisão de escala', 'Ajustar, manter ou ampliar com base em dados', 'Custo real, compreensão do operador e capacidade de manutenção'],
    ], [26, 44, 30])

    d.h1('6. Segurança, ética e conformidade')
    d.tb(['Tema', 'Cuidado adotado'], [
        ['Segurança elétrica e de máquinas', 'Bancada em baixa tensão; comando manual e proteção contra funcionamento a seco desde o MVP; instalação real só por profissional habilitado (NR-10).'],
        ['Uso do poço', 'Piloto só com licença de execução e outorga conforme o DAEE (DAEE, 2017).'],
        ['Qualidade da água', 'pH, condutividade e turbidez serão apenas triagem; avaliação de consumo humano ou animal exige análise laboratorial.'],
        ['Dados e privacidade', 'Dados mínimos, anonimização nos anexos, acesso por propriedade com controle por linha, termo de ciência nas entrevistas (LGPD).'],
        ['IA e autoria', 'Registro completo (Entrega 7), validação humana e equipe capaz de explicar o conteúdo.'],
        ['Imagens e marcas', 'Sem marcas de terceiros nem fotos sem autorização; nomes de produtos aparecem só como referência de pesquisa (Art. 104).'],
    ], [28, 72])

    d.h1('7. Checklist geral de submissão (situação em ' + DATA + ')')
    d.tb(['Item do Caderno', 'Situação'], [
        ['Arquivos nomeados com projeto, equipe e entrega', 'Sim'],
        ['PDFs legíveis, com texto selecionável', 'Sim (gerados a partir de texto)'],
        ['Links de vídeo, protótipo e pasta acessíveis', 'Parcial: repositório e app publicados; vídeo precisa de link; pasta de evidências a organizar'],
        ['Evidências organizadas em pasta única', 'A fazer pela equipe (reunir os arquivos acima)'],
        ['Uso de IA registrado e validado pela equipe', 'Registrado; validação humana pendente'],
        ['Plano de Ensino com validação pedagógica', 'Pendente de dados da unidade e assinaturas'],
        ['Lean Canvas coerente com diagnóstico, pesquisa e proposta de valor', 'Sim; pesquisa de campo ainda não realizada'],
        ['MVP demonstra funcionalidades compatíveis com o escopo', 'Sim, no escopo digital declarado'],
        ['Pitch com problema, solução, validação, diferencial e próximos passos', 'Sim'],
        ['Sem dados sensíveis, sigilosos ou materiais de terceiros sem referência', 'Sim, conforme verificação da equipe de redação; a equipe deve confirmar'],
    ], [58, 42])

    d.h1('Referências')
    d.refs(refs_de('Repo', 'ANA2026', 'ANAcana', 'IBGE', 'Bufon', 'DAEE', 'Guia', 'Caderno', 'Regul'))
    return d
