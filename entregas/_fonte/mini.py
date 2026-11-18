"""Modelo mínimo de documento -> DOCX (python-docx) e PDF (HTML + Chrome headless).
Estilo sóbrio: texto preto, fundo branco, tabelas com filetes pretos, sem cores nem caixas coloridas."""
import re, html, subprocess, os, tempfile
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

PROJ = 'Raiz'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

class Doc:
    def __init__(s, no, titulo, arquivo, paisagem=False):
        s.no, s.titulo, s.arquivo, s.el, s.paisagem = no, titulo, arquivo, [], paisagem
    def h1(s, t): s.el.append(('h1', t))
    def h2(s, t): s.el.append(('h2', t))
    def p(s, t): s.el.append(('p', t))
    def small(s, t): s.el.append(('small', t))
    def bl(s, items): s.el.append(('bl', items))
    def nl(s, items): s.el.append(('nl', items))
    def tb(s, head, rows, widths=None, legenda=None): s.el.append(('tb', head, rows, widths, legenda))
    def kv(s, rows, widths=(30, 70)): s.el.append(('tb', ['Campo', 'Preenchimento'], rows, list(widths), None))
    def note(s, t): s.el.append(('note', t))
    def sig(s, labels): s.el.append(('sig', labels))
    def refs(s, items): s.el.append(('refs', items))
    def pb(s): s.el.append(('pb',))
    def title(s, t, sub=None): s.el.append(('title', t, sub))

# ------------------------------------------------------------------ HTML / PDF
def _inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'__(.+?)__', r'<i>\1</i>', t)
    return t.replace('\n', '<br>')

CSS = """
@page{size:__SIZE__;margin:23mm 19mm 21mm 19mm;
 @top-left{content:"Raiz — Equipe Atlas · INTEGRA SENAI 2026";font:8.5pt Arial,Helvetica,sans-serif;color:#000;border-bottom:.5pt solid #000;padding-bottom:2mm;vertical-align:bottom}
 @top-right{content:"__TOPO__";font:8.5pt Arial,Helvetica,sans-serif;color:#000;border-bottom:.5pt solid #000;padding-bottom:2mm;vertical-align:bottom}
 @bottom-left{content:"Escola SENAI Edward Savio · Jaú-SP";font:8.5pt Arial,Helvetica,sans-serif;color:#000}
 @bottom-right{content:"Página " counter(page) " de " counter(pages);font:8.5pt Arial,Helvetica,sans-serif;color:#000}}
*{box-sizing:border-box}
html{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:10.5pt;line-height:1.38}
body{margin:0}
h1{font-size:13pt;margin:18pt 0 6pt;padding-bottom:2pt;border-bottom:.75pt solid #000;page-break-after:avoid}
h2{font-size:11pt;margin:13pt 0 4pt;page-break-after:avoid}
p{margin:0 0 6pt;text-align:justify}
.small{font-size:8.8pt}
ul,ol{margin:0 0 6pt 0;padding-left:18pt}li{margin-bottom:2pt;text-align:justify}
table{border-collapse:collapse;width:100%;margin:4pt 0 9pt;font-size:9.4pt;page-break-inside:auto}
tr{page-break-inside:avoid}
th,td{border:.6pt solid #000;padding:3pt 5pt;vertical-align:top;text-align:left}
th{font-weight:bold;border-bottom:1.4pt double #000}
caption{caption-side:top;text-align:left;font-weight:bold;font-size:9.4pt;margin-bottom:2pt}
.note{border:.75pt solid #000;padding:5pt 8pt;margin:6pt 0 9pt;font-size:9.6pt}
.sig{display:flex;gap:20pt;margin:34pt 0 8pt}.sig div{flex:1;border-top:.75pt solid #000;padding-top:3pt;font-size:9pt;text-align:center}
.title{margin:0 0 14pt;padding-bottom:8pt;border-bottom:1.5pt solid #000}.title .t1{font-size:19pt;font-weight:bold;line-height:1.15}.title .t2{font-size:11pt;margin-top:4pt}
.refs p{text-align:left;padding-left:16pt;text-indent:-16pt;font-size:9.4pt;margin-bottom:5pt}
.pb{page-break-after:always}
"""

def to_html(d):
    o = []
    for e in d.el:
        k = e[0]
        if k == 'title': o.append(f'<div class="title"><div class="t1">{_inline(e[1])}</div>' + (f'<div class="t2">{_inline(e[2])}</div>' if e[2] else '') + '</div>')
        elif k == 'h1': o.append(f'<h1>{_inline(e[1])}</h1>')
        elif k == 'h2': o.append(f'<h2>{_inline(e[1])}</h2>')
        elif k == 'p': o.append(f'<p>{_inline(e[1])}</p>')
        elif k == 'small': o.append(f'<p class="small">{_inline(e[1])}</p>')
        elif k in ('bl', 'nl'):
            tag = 'ul' if k == 'bl' else 'ol'; o.append(f'<{tag}>' + ''.join(f'<li>{_inline(i)}</li>' for i in e[1]) + f'</{tag}>')
        elif k == 'tb':
            head, rows, widths, leg = e[1:]
            cg = ''.join(f'<col style="width:{w}%">' for w in widths) if widths else ''
            o.append('<table>' + (f'<caption>{_inline(leg)}</caption>' if leg else '') + f'<colgroup>{cg}</colgroup><thead><tr>' + ''.join(f'<th>{_inline(h)}</th>' for h in head) + '</tr></thead><tbody>' +
                     ''.join('<tr>' + ''.join(f'<td>{_inline(str(c))}</td>' for c in r) + '</tr>' for r in rows) + '</tbody></table>')
        elif k == 'note': o.append(f'<div class="note">{_inline(e[1])}</div>')
        elif k == 'sig': o.append('<div class="sig">' + ''.join(f'<div>{_inline(l)}<br>Data: ____/____/______</div>' for l in e[1]) + '</div>')
        elif k == 'refs': o.append('<div class="refs">' + ''.join(f'<p>{_inline(r)}</p>' for r in e[1]) + '</div>')
        elif k == 'pb': o.append('<div class="pb"></div>')
    size = 'A4 landscape' if d.paisagem else 'A4'
    css = CSS.replace('__SIZE__', size).replace('__TOPO__', html.escape(d.no))
    corpo = ''.join(o)
    return f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>{html.escape(d.titulo)}</title><style>{css}</style><body>{corpo}</body></html>'

def to_pdf(d, out):
    h = to_html(d)
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f: f.write(h); p = f.name
    r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out}', 'file://' + p], capture_output=True, text=True, timeout=180)
    os.unlink(p)
    if not os.path.exists(out): raise RuntimeError(r.stderr[-400:])
    return out

# ------------------------------------------------------------------ DOCX
def _runs(par, t, size=None, bold_all=False):
    parts = re.split(r'(\*\*.+?\*\*|__.+?__)', t.replace('\n', ' '))
    for x in parts:
        if not x: continue
        b = x.startswith('**'); i = x.startswith('__')
        txt = x[2:-2] if (b or i) else x
        txt = txt.replace(' ', '\n')
        r = par.add_run(txt); r.bold = b or bold_all; r.italic = i
        r.font.color.rgb = RGBColor(0, 0, 0)
        if size: r.font.size = Pt(size)

def _borders(tbl):
    t = tbl._tbl; pr = t.tblPr
    b = OxmlElement('w:tblBorders')
    for n in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{n}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:space'), '0'); e.set(qn('w:color'), '000000'); b.append(e)
    pr.append(b)

def _cell_margins(tbl, m=60):
    pr = tbl._tbl.tblPr; mar = OxmlElement('w:tblCellMar')
    for n in ('top', 'left', 'bottom', 'right'):
        e = OxmlElement(f'w:{n}'); e.set(qn('w:w'), str(m if n in ('top', 'bottom') else 90)); e.set(qn('w:type'), 'dxa'); mar.append(e)
    pr.append(mar)

def _field(par, instr):
    r = par.add_run(); r.font.size = Pt(8.5)
    a = OxmlElement('w:fldChar'); a.set(qn('w:fldCharType'), 'begin')
    i = OxmlElement('w:instrText'); i.set(qn('xml:space'), 'preserve'); i.text = instr
    c = OxmlElement('w:fldChar'); c.set(qn('w:fldCharType'), 'end')
    r._r.append(a); r._r.append(i); r._r.append(c)

def _repeat_header(row):
    pr = row._tr.get_or_add_trPr(); e = OxmlElement('w:tblHeader'); e.set(qn('w:val'), 'true'); pr.append(e)

def _no_split(row):
    pr = row._tr.get_or_add_trPr(); e = OxmlElement('w:cantSplit'); e.set(qn('w:val'), 'true'); pr.append(e)

def to_docx(d, out):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    if d.paisagem: sec.page_width, sec.page_height = Cm(29.7), Cm(21)
    sec.left_margin = sec.right_margin = Cm(1.9); sec.top_margin = Cm(2.3); sec.bottom_margin = Cm(2.1)
    st = doc.styles['Normal']; st.font.name = 'Arial'; st.font.size = Pt(10.5); st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
    st.paragraph_format.space_after = Pt(6); st.paragraph_format.line_spacing = 1.15
    for n in ('Heading 1', 'Heading 2', 'Title'):
        s = doc.styles[n]; s.font.name = 'Arial'; s.font.color.rgb = RGBColor(0, 0, 0); s.font.bold = True
        s.element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial'); s.element.rPr.rFonts.set(qn('w:ascii'), 'Arial'); s.element.rPr.rFonts.set(qn('w:hAnsi'), 'Arial')
    doc.styles['Heading 1'].font.size = Pt(13); doc.styles['Heading 1'].paragraph_format.space_before = Pt(16); doc.styles['Heading 1'].paragraph_format.space_after = Pt(6)
    doc.styles['Heading 2'].font.size = Pt(11); doc.styles['Heading 2'].paragraph_format.space_before = Pt(11); doc.styles['Heading 2'].paragraph_format.space_after = Pt(4)
    # cabeçalho e rodapé
    hp = sec.header.paragraphs[0]; hp.text = ''
    _runs(hp, f'Raiz — Equipe Atlas · INTEGRA SENAI 2026\t\t{d.no}', 8.5)
    pPr = hp._p.get_or_add_pPr(); bd = OxmlElement('w:pBdr'); bt = OxmlElement('w:bottom')
    for k, v in (('val', 'single'), ('sz', '4'), ('space', '1'), ('color', '000000')): bt.set(qn(f'w:{k}'), v)
    bd.append(bt); pPr.append(bd)
    tabs = OxmlElement('w:tabs'); width = int((sec.page_width - sec.left_margin - sec.right_margin) / 635)
    for val, pos in (('center', width // 2), ('right', width)):
        t = OxmlElement('w:tab'); t.set(qn('w:val'), val); t.set(qn('w:pos'), str(pos)); tabs.append(t)
    pPr.append(tabs)
    fp = sec.footer.paragraphs[0]; fp.text = ''
    _runs(fp, 'Escola SENAI Edward Savio · Jaú-SP\t\tPágina ', 8.5); _field(fp, 'PAGE'); _runs(fp, ' de ', 8.5); _field(fp, 'NUMPAGES')
    pPr = fp._p.get_or_add_pPr(); tabs = OxmlElement('w:tabs')
    for val, pos in (('center', width // 2), ('right', width)):
        t = OxmlElement('w:tab'); t.set(qn('w:val'), val); t.set(qn('w:pos'), str(pos)); tabs.append(t)
    pPr.append(tabs)
    total_w = (sec.page_width - sec.left_margin - sec.right_margin)
    for e in d.el:
        k = e[0]
        if k == 'title':
            p = doc.add_paragraph(); _runs(p, e[1], 19, True); p.paragraph_format.space_after = Pt(2)
            if e[2]:
                p2 = doc.add_paragraph(); _runs(p2, e[2], 11)
            pPr = doc.paragraphs[-1]._p.get_or_add_pPr(); bd = OxmlElement('w:pBdr'); bt = OxmlElement('w:bottom')
            for kk, v in (('val', 'single'), ('sz', '10'), ('space', '4'), ('color', '000000')): bt.set(qn(f'w:{kk}'), v)
            bd.append(bt); pPr.append(bd)
        elif k == 'h1': doc.add_heading(e[1], 1)
        elif k == 'h2': doc.add_heading(e[1], 2)
        elif k in ('p', 'small'):
            p = doc.add_paragraph(); _runs(p, e[1], 8.8 if k == 'small' else None); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        elif k in ('bl', 'nl'):
            for i, t in enumerate(e[1], 1):
                p = doc.add_paragraph(style='List Bullet' if k == 'bl' else 'List Number'); _runs(p, t); p.paragraph_format.space_after = Pt(2)
            if k == 'nl':   # reinicia numeração tratada pelo Word por lista; evita continuar a anterior
                pass
        elif k == 'tb':
            head, rows, widths, leg = e[1:]
            if leg:
                p = doc.add_paragraph(); _runs(p, leg, 9.4, True); p.paragraph_format.space_after = Pt(2); p.paragraph_format.keep_with_next = True
            tb = doc.add_table(rows=1, cols=len(head)); tb.alignment = WD_TABLE_ALIGNMENT.CENTER; tb.autofit = False
            _borders(tb); _cell_margins(tb)
            ws = widths or [100 // len(head)] * len(head)
            for j, h in enumerate(head):
                c = tb.rows[0].cells[j]; c.text = ''; _runs(c.paragraphs[0], h, 9.2, True); c.paragraphs[0].paragraph_format.space_after = Pt(0)
            _repeat_header(tb.rows[0]); _no_split(tb.rows[0])
            for r in rows:
                row = tb.add_row(); _no_split(row)
                for j, v in enumerate(r):
                    c = row.cells[j]; c.text = ''; _runs(c.paragraphs[0], str(v), 9.2); c.paragraphs[0].paragraph_format.space_after = Pt(0)
            for row in tb.rows:
                for j, c in enumerate(row.cells): c.width = int(total_w * ws[j] / sum(ws))
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif k == 'note':
            tb = doc.add_table(rows=1, cols=1); _borders(tb); _cell_margins(tb, 80)
            c = tb.rows[0].cells[0]; c.text = ''; _runs(c.paragraphs[0], e[1], 9.6); c.paragraphs[0].paragraph_format.space_after = Pt(0)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif k == 'sig':
            doc.add_paragraph().paragraph_format.space_after = Pt(18)
            n = len(e[1]); tb = doc.add_table(rows=1, cols=n)
            for j, l in enumerate(e[1]):
                c = tb.rows[0].cells[j]; c.text = ''
                p = c.paragraphs[0]; _runs(p, '______________________________\n' + l + '\nData: ____/____/______', 9); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif k == 'refs':
            for r in e[1]:
                p = doc.add_paragraph(); _runs(p, r, 9.4); p.paragraph_format.left_indent = Cm(0.6); p.paragraph_format.first_line_indent = Cm(-0.6); p.paragraph_format.space_after = Pt(4)
        elif k == 'pb': doc.add_page_break()
    doc.core_properties.title = d.titulo; doc.core_properties.author = 'Equipe Atlas'
    doc.save(out)
    return out

def salvar(d, pasta):
    os.makedirs(pasta, exist_ok=True)
    to_docx(d, f'{pasta}/{d.arquivo}.docx'); to_pdf(d, f'{pasta}/{d.arquivo}.pdf')
    return d.arquivo
