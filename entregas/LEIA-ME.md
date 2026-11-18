# Entregas obrigatórias — Raiz (Equipe Atlas) — INTEGRA SENAI 2026

Versão de 18/11/2026. Formato sóbrio (preto e branco), com fonte e classificação (dado, inferência ou hipótese) em cada afirmação.

| Entrega | Arquivos |
|---|---|
| 1 Plano de Ensino | RAIZ_ATLAS_E1_PlanoEnsino (.docx, .pdf) |
| 2 Diagnóstico | RAIZ_ATLAS_E2_Diagnostico (.docx, .pdf) |
| 3 Pesquisa com usuários e contexto | RAIZ_ATLAS_E3_Pesquisa (.docx, .pdf) · RAIZ_ATLAS_E3_Registro_Entrevistas.xlsx |
| 4 Anterioridade e benchmarking | RAIZ_ATLAS_E4_Anterioridade_Benchmarking (.docx, .pdf) · RAIZ_ATLAS_E4_Matriz_Benchmarking.xlsx |
| 5 Proposta de valor e Lean Canvas | RAIZ_ATLAS_E5_PropostaValor_LeanCanvas (.docx, .pdf) |
| 6 Planejamento e MVP | RAIZ_ATLAS_E6_PlanejamentoMVP (.docx, .pdf) · RAIZ_ATLAS_E6_Planejamento.xlsx |
| 7 Registro de IA | RAIZ_ATLAS_E7_RegistroIA (.docx, .pdf) · RAIZ_ATLAS_E7_RegistroIA.xlsx |
| 8 MVP, pitch e portfólio | RAIZ_ATLAS_E8_Portfolio_Evidencias (.docx, .pdf) · RAIZ_ATLAS_E8_Pitch (.pptx, .pdf) |

## O que a equipe ainda precisa fazer
- Entrega 1: curso/turma, unidade curricular, carga horária, nº de aulas, nome da coordenação e **assinaturas**.
- Entrega 3: **realizar entrevistas** (0 participantes hoje) e preencher o registro. Não há respostas inventadas.
- Entrega 4: consultar a base do **INPI**.
- Entrega 6: cotar materiais; executar e registrar os ensaios T1 a T4.
- Entrega 7: cada integrante completar usos de IA não listados; leitura e validação humana.
- Entrega 8: hospedar o vídeo em link acessível e reunir tudo em uma pasta única; conferir se o app publicado está no ar.

## Regerar
```bash
cd entregas/_fonte
python3 -m venv .venv && .venv/bin/pip install python-docx openpyxl python-pptx
.venv/bin/python build_all.py     # requer Google Chrome (macOS) para os PDFs
```
Dados comuns (equipe, orientador, datas, referências) ficam em `_fonte/dados.py`.
