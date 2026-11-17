# Raiz — INTEGRA SENAI 2026

Projeto **Raiz** (Equipe Atlas, Jaú-SP), categoria INTEGRA Inovação Aberta: sistema modular para decidir quando irrigar e detectar anomalias de vazão, com operação local mesmo sem internet.

## Conteúdo

| Pasta | O que há |
|---|---|
| `mvp-digital/` | MVP digital em HTML + CSS + JS (simulador com modos Demonstração e Operação, PWA offline). Abra `mvp-digital/index.html`. Detalhes em `mvp-digital/README.md`. |
| `documentos/` | Dossiê adaptado às 8 entregas do INTEGRA e análise de aderência entre o ATLAS e o regulamento (PDFs). |
| `documentos/fontes/` | HTML de origem dos PDFs e script para regerá-los. |

## Estado

- Os campos `[preencher]` do dossiê dependem da equipe: integrantes, orientador, entrevistas, fontes do benchmarking, assinaturas do plano de ensino e dados de teste.
- Todos os dados do MVP digital são **simulados**; não há resultados de campo nem de bancada.

## Regerar os PDFs

Requer Google Chrome no macOS:

```bash
bash documentos/fontes/gerar_pdfs.sh
```
