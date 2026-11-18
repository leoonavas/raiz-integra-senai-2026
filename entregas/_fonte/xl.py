"""Planilhas sóbrias (openpyxl): bordas finas, cabeçalho em negrito, sem cores."""
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

THIN = Side(style='thin', color='000000')
BORD = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

def planilha(path, abas, titulo_arquivo=''):
    """abas: lista de dict(nome, titulo, head, rows, widths, nota)"""
    wb = Workbook(); wb.remove(wb.active)
    for a in abas:
        ws = wb.create_sheet(a['nome'][:31])
        r = 1
        ws.cell(r, 1, a.get('titulo', a['nome'])).font = Font(name='Arial', size=12, bold=True); r += 1
        if a.get('nota'):
            c = ws.cell(r, 1, a['nota']); c.font = Font(name='Arial', size=9); c.alignment = Alignment(wrap_text=True, vertical='top')
            ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=len(a['head'])); ws.row_dimensions[r].height = a.get('nota_h', 42); r += 2
        else: r += 1
        for j, h in enumerate(a['head'], 1):
            c = ws.cell(r, j, h); c.font = Font(name='Arial', size=10, bold=True); c.border = BORD; c.alignment = Alignment(wrap_text=True, vertical='center')
        head_row = r
        for row in a['rows']:
            r += 1
            for j, v in enumerate(row, 1):
                c = ws.cell(r, j, v); c.font = Font(name='Arial', size=9.5); c.border = BORD; c.alignment = Alignment(wrap_text=True, vertical='top')
        for j, w in enumerate(a.get('widths') or [20] * len(a['head']), 1): ws.column_dimensions[get_column_letter(j)].width = w
        ws.freeze_panes = ws.cell(head_row + 1, 1)
        ws.page_setup.orientation = 'landscape'; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.sheet_view.showGridLines = False
    wb.save(path)
    return path
