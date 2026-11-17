# Fazenda Digital

Fazenda simulada em HTML/SVG para **testar o app oficial sem fazenda real**. Ela se comporta como a instalação do Raiz: sensores, medidor de vazão, estação meteorológica e controlador do poço emitem leituras; um **gateway simulado** aplica as regras (recomendação, anomalias, sem comunicação) e conversa com o app pelo mesmo protocolo que a instalação real usará ([docs/PROTOCOLO.md](../docs/PROTOCOLO.md)). Tudo é **simulado**: nada aqui é resultado de campo.

## Rodar

Sirva a **raiz do repositório** (as duas pastas precisam estar na mesma origem para o canal local):

```bash
python3 -m http.server 8767        # na raiz do repositório
# http://localhost:8767/fazenda-digital/
```

A página já traz o app ao lado (iframe). Também dá para abrir o app em outra aba: `http://localhost:8767/app-oficial/?live&role=gestor` (PIN de teste **1234**).

## O que tem

- **Cena:** 3 talhões de cana (umidade muda a cor do solo, crescimento), poço, casa de bomba, tubulação com água animada, aspersores, torre do gateway, estação meteorológica, sede. **Dia e noite** (sol, lua, estrelas, luzes), nuvens, **chuva, tempestade com raios** e onda de calor.
- **Sinais visíveis:** pacotes animados saem dos dispositivos até o gateway e do gateway até o app (azul = telemetria, laranja = evento, verde = comando).
- **Painel:**
  - *Ambiente* — clima (automático ou manual), hora do dia (+1 h, +6 h, ir para amanhecer/noite…), velocidade (1 a 60 min simulados por segundo), previsão forçada.
  - *Falhas e cenários* — entupimento, vazamento, sensor/medidor sem comunicação, bateria baixa, poço seco, falta de energia, gateway e internet fora do ar; cenários prontos.
  - *Dispositivos* — estado no gateway × estado real, última leitura, bateria, sinal.
  - *Sinais* — tudo que trafega (telemetria, eventos, comandos), com o JSON de cada mensagem.
- Clique em um talhão para selecioná-lo; clique em um dispositivo na cena para ligar/desligar a falha dele.

## Arquivos

| Arquivo | Papel |
|---|---|
| `js/sim.js` | mundo físico: relógio, clima (previsão e chuva planejada), solo, bomba, dispositivos, falhas |
| `js/gateway.js` | gateway Raiz simulado: regras, alertas, histórico, comandos, `hello` |
| `js/scene.js` | desenho SVG e animações |
| `js/main.js` | liga tudo, painel de controle, log de sinais, app embutido |
| `js/link.js` | canal de mensagens (igual ao do app) |
| `js/config.js` | fazenda, transporte, endereço do app |

## Parâmetros de URL

`?farm=f1` · `?transport=broadcast` · `?app=<url do app>` (app embutido).

## Como é a simulação

- Começa em 18/11/2026 05:30, depois de 24 h de histórico simulado (o gráfico de umidade já abre preenchido). Semente fixa → a mesma chuva às 15:10 do primeiro dia; os dias seguintes são sorteados com a mesma semente.
- O gateway só enxerga o que os dispositivos enviam. O controlador do poço tem **temporizador próprio**: se o gateway cair, a irrigação em andamento ainda termina sozinha.
- Parâmetros físicos (evapotranspiração, ganho por irrigação de ~0,3 pp/min, chuva, drenagem acima de 46%) são **valores de simulação**, escolhidos para o teste ser visível; não representam medições.
- Simulação headless: `sim.js` e `gateway.js` rodam também em Node (`require`), útil para testes automáticos.

## Próxima etapa (hospedagem + Supabase)

Hospedar as duas pastas, registrar o transporte `supabase` em `js/link.js` (nas duas) e apontar `appUrl` em `js/config.js` para o endereço público do app. Detalhes no fim de [docs/PROTOCOLO.md](../docs/PROTOCOLO.md).
