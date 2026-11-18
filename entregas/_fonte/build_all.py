import sys, os, importlib
from mini import salvar
from xl import planilha
from dados import *
import e3, e4, e6, e7, e8
OUT = '..'; EXTRA = '../PDF_e_outros'
def e3_xlsx():
    return planilha(f'{EXTRA}/RAIZ_ATLAS_E3_Registro_Entrevistas.xlsx', [
        dict(nome='Registro', titulo='Raiz — Entrega 3 — Registro das entrevistas (preencher somente com conversas reais)',
             nota='Participantes até ' + DATA + ': 0. Separe o que o participante disse (coluna "Principais respostas") da interpretação da equipe. Identifique o participante de forma anonimizada. Não registre nome, telefone ou nome da propriedade.',
             head=['Nº', 'Perfil (anonimizado)', 'Data', 'Método', 'Consentimento registrado (sim/não)', 'Principais respostas (o que foi dito)', 'Interpretação da equipe', 'Hipóteses afetadas (H1 a H5)', 'Entrevistador'],
             rows=[[i, '', '', '', '', '', '', '', ''] for i in range(1, 11)], widths=[6, 24, 12, 16, 20, 60, 44, 20, 18]),
        dict(nome='Roteiro', titulo='Roteiro de perguntas', head=['Nº', 'Pergunta', 'Hipótese'], rows=[list(p) for p in e3.PERGUNTAS], widths=[8, 100, 14]),
    ])
if __name__ == '__main__':
    for m in ('e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'):
        d = importlib.import_module(m).build(); print(salvar(d, OUT), flush=True)
    e3_xlsx(); e4.planilhas(EXTRA); e6.planilhas(EXTRA); e7.planilhas(EXTRA)
    e8.pptx(f'{EXTRA}/RAIZ_ATLAS_E8_Pitch.pptx'); e8.slides_pdf(f'{EXTRA}/RAIZ_ATLAS_E8_Pitch.pdf')
    print('ok')
