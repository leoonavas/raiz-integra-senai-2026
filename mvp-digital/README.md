# Raiz — MVP digital (INTEGRA SENAI 2026 · Equipe Atlas)

Simulador funcional em HTML + CSS + JavaScript puro, sem dependências e sem servidor.

**Como abrir:** dê dois cliques em `index.html` (ou rode `python3 -m http.server` nesta pasta).

**Todos os dados são simulados.** Serve para demonstrar a lógica de F1, F2 e F3 e para ensaiar o pitch; não são resultados de campo nem de bancada.

| Função | O que faz | Onde ver |
|---|---|---|
| F1 | Recomenda irrigar (umidade abaixo do limiar e sem chuva prevista); o operador aceita, ajusta ou recusa | Painel > Recomendação |
| F2 | Compara vazão medida × referência; alerta após T leituras fora de ±X%; para a bomba a seco | Painel, Bancada |
| F3 | Registra e alerta sem internet; sincroniza ao voltar o sinal | botão Online/Offline, Registro, Painel remoto |

Roteiro de pitch: botão **Demonstração guiada**. Resultados do protocolo T1–T4: aba **Testes** (inclui resumo para copiar ao portfólio). Registro exportável em CSV.

Estrutura: `index.html` · `css/style.css` · `js/app.js` · `assets/` (logo, favicon, ícones e padrão em SVG).

Limiares iniciais (20% de tolerância, 3 leituras, 30% de umidade crítica) são propostas a calibrar na bancada física.

## Modo Operação (eventos aleatórios) e produção

No topo há dois modos. **Demonstração**: você injeta falhas e cenários. **Operação**: o ambiente gera eventos sozinho, com semente reprodutível (mesma semente, mesma sequência):

- chuva (previsão que varia e ciclo diário de temperatura);
- quedas e retornos de internet;
- quedas de energia (geram lacunas de leitura, tornando mensurável a meta de ≥ 90% de leituras);
- falhas espontâneas: entupimento, vazamento e bomba a seco (ficam latentes até a bomba ligar);
- leituras espúrias de vazão, que a regra de persistência filtra;
- manutenção: ao confirmar um alerta verdadeiro, o reparo ocorre ~8 min simulados depois.

Controles: intensidade (baixa, média, alta), nova semente, velocidade até 60× e **Operador virtual** (aceita recomendações, confirma alertas e rearma sozinho, para rodar sem ninguém na tela). A aba Testes soma os eventos ocorridos e o resumo do portfólio os inclui.

**PWA:** com `http(s)` o app registra um service worker (`sw.js`) e funciona offline depois da primeira visita; pode ser instalado pelo navegador. Para hospedar, publique a pasta inteira como site estático (HTTPS). Para depurar no console use `?debug` na URL (expõe `window.__raiz`).
