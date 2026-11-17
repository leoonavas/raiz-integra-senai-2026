# Raiz — INTEGRA SENAI 2026

Projeto **Raiz** (Equipe Atlas, Jaú-SP), categoria INTEGRA Inovação Aberta: sistema modular para decidir quando irrigar e detectar anomalias de vazão, com operação local mesmo sem internet.

## Conteúdo

| Pasta | O que há |
|---|---|
| `mvp-digital/` | MVP digital em HTML + CSS + JS (simulador com modos Demonstração e Operação, PWA offline). Abra `mvp-digital/index.html`. Detalhes em `mvp-digital/README.md`. |
| `fazenda-digital/` | Fazenda simulada em HTML/SVG (dia/noite, clima, lavoura, falhas) que emite os mesmos sinais dos dispositivos e recebe comandos. Ambiente de testes do app. |
| `app-oficial/` | Interface do app oficial (HTML para WebView); com `?live` recebe dados e envia comandos à fazenda. |
| `docs/PROTOCOLO.md` | Contrato das mensagens fazenda ⇄ app (base para a integração com o Supabase). |
| `documentos/` | Dossiê adaptado às 8 entregas do INTEGRA e análise de aderência entre o ATLAS e o regulamento (PDFs). |
| `documentos/fontes/` | HTML de origem dos PDFs e script para regerá-los. |

## Testar o app com a fazenda digital

```bash
python3 -m http.server 8767     # na raiz do repositório
# abra http://localhost:8767/fazenda-digital/
```

## Estado

- Os campos `[preencher]` do dossiê dependem da equipe: integrantes, orientador, entrevistas, fontes do benchmarking, assinaturas do plano de ensino e dados de teste.
- Todos os dados do MVP digital são **simulados**; não há resultados de campo nem de bancada.

## Regerar os PDFs

Requer Google Chrome no macOS:

```bash
bash documentos/fontes/gerar_pdfs.sh
```
