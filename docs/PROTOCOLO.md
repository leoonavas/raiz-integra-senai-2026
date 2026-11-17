# Protocolo Raiz — fazenda ⇄ app

Contrato das mensagens entre a **fazenda** (dispositivos + gateway) e o **app**. Hoje quem fala é a Fazenda Digital (`fazenda-digital/`); na próxima etapa, o mesmo contrato passa pelo Supabase e o gateway real assume o lugar da simulação. O app (`app-oficial/js/live.js`) e as telas não mudam: troca-se só o **transporte**.

## Envelope

```json
{ "v": 1, "id": "k3j9x0a2l81", "src": "farm", "farm": "f1", "type": "telemetry", "ts": 1794999060000, "payload": { } }
```

| Campo | Significado |
|---|---|
| `v` | versão do protocolo (1) |
| `id` | identificador único da mensagem |
| `src` | `farm` (gateway/dispositivos) ou `app` |
| `farm` | id da fazenda — separa os dados de cada propriedade |
| `ts` | horário do emissor, em ms desde 1970. Na fazenda é o **relógio da fazenda** (na Fazenda Digital é simulado e pode andar mais rápido que o real); no app é `Date.now()` |

Textos exibidos ao usuário (títulos de alerta, motivos de recomendação) já vêm em português do gateway.

## Fazenda → app

| `type` | Quando | `payload` |
|---|---|---|
| `hello` | ao conectar (resposta a `hello.request`) e ao iniciar | `farm`, `net`, `settings`, `modules`, `plots[]`, `devices[]`, `snapshot` (última telemetria, alertas, recomendações, execuções, séries, previsão) |
| `telemetry` | a cada leitura de um dispositivo | `{ device, kind, plot, values, batt, rssi }` — valores abaixo |
| `heartbeat` | a cada 2 s reais | `{ internet, pending, lastSync, running, speed }` |
| `device.status` | dispositivo ficou sem comunicação / voltou | `{ device, status: 'online'\|'offline', seen, reason? }` |
| `alert.new` | gateway abriu um alerta | objeto de alerta (abaixo) |
| `alert.update` | alerta mudou (resolvido, nota de manutenção) | `{ id, patch }` |
| `recommendation` | recomendação de um talhão mudou | `{ plot, rec: { type:'go', duration, reason } \| { type:'wait', reason } \| null }` |
| `forecast` | previsão atualizada (precisa de internet) | `{ rainProb, hourly:[{ h, t, p }] }` |
| `series` | a cada hora: histórico de umidade (24 pontos) | `{ plot, values[] }` |
| `run.log` | irrigação terminou | `{ plot, run: { when, dur, vol, origin } }` |
| `command.ack` | resposta a um comando | `{ cid, cmd, ok, text }` |

### Telemetria (`values` por tipo de dispositivo)

| `kind` | Dispositivo | Período | `values` |
|---|---|---|---|
| `soil` | sensor de umidade (por talhão) | 10 min | `{ moisture }` (% vol.) |
| `flow` | medidor de vazão e pressão (por talhão) | 1 min irrigando, 15 min parado | `{ flow, pressure, total }` (m³/h, bar, m³ acumulados) |
| `weather` | estação meteorológica | 10 min | `{ temp, humidity, rain, wind, light }` |
| `controller` | controlador do poço | 1 min com bomba ligada, 10 min parado | `{ state: 'ok'\|'locked'\|'nopower', reason, well: 'ok'\|'dry', zones: { t1: { state:'on'\|'off', left, total } … } }` (`left`/`total` em segundos) |

Períodos em minutos **simulados**. `batt` (%) e `rssi` (dBm) acompanham quando o dispositivo os tem.

### Alerta

```json
{ "id": "a1", "sev": "warn|bad|info", "plot": "t1|null", "state": "aberto|resolvido", "title": "…", "time": "Hoje · 09:34",
  "msg": "…", "q": 15.5, "ref": 25.0, "p": 3.1, "series": [25.1, 24.8, 15.8] }
```
`q`, `ref`, `p` e `series` só existem em alertas de vazão (alimentam o gráfico).

## App → fazenda

| `type` | `payload` |
|---|---|
| `hello.request` | `{ app }` — pede o `hello` com o estado atual |
| `app.ping` | `{ app }` — a cada 4 s, só para a fazenda saber que o app está conectado |
| `command` | `{ cid, cmd, args }` |

Comandos (`cmd` → `args`) — são os mesmos eventos da ponte nativa do app (`RaizBridge.emit`):

| `cmd` | `args` | Efeito no gateway |
|---|---|---|
| `pump.start` | `{ plot, minutes }` | valida (limite contínuo, capacidade da bomba, energia, bloqueio) e manda o controlador ligar |
| `pump.stop` | `{ plot }` | desliga o setor |
| `pump.emergency` | `{ plot }` | para tudo e **bloqueia** a bomba |
| `pump.rearm` | `{ plot }` | libera a bomba (recusa se o poço ainda estiver seco) |
| `recommendation.refuse` | `{ plot }` | suprime a recomendação por 30 min |
| `alert.confirm` · `alert.discard` | `{ id }` | fecha o alerta |
| `alert.maintenance` | `{ id }` | aciona manutenção |
| `device.restart` | `{ id }` | reinicia o dispositivo |
| `sync.now` | — | sincroniza com a nuvem (recusa sem internet) |
| `settings.update` | `{ rules: { crit, target, rainLimit, tolPct, persist, maxRun } }` | atualiza as regras do gateway |

Todo comando recebe um `command.ack` com o mesmo `cid`. O app **não** altera o estado por conta própria: a bomba só aparece ligada quando o controlador informa pela telemetria. Sem `ack` em 6 s, o app avisa que o comando pode não ter chegado.

## Regras que o gateway aplica

- **Recomendação:** umidade < limiar → `go` (duração para chegar ao alvo, em múltiplos de 5 min, limitada ao tempo máximo) ou `wait` se a previsão de chuva ≥ limite ou se estiver chovendo. Histerese de 2 pontos para sair.
- **Vazão:** com a bomba ligada (após 2 min de transiente), desvio maior que a tolerância por `persist` leituras seguidas → alerta de entupimento (abaixo) ou vazamento (acima). Vazão < 10% da referência é tratada pelo controlador (parada a seco).
- **Dispositivo sem comunicação:** sem leitura por 35 min (sensor/estação), 50 min (medidor) ou 25 min (controlador) → `device.status` + alerta.
- **Sem internet:** o gateway continua operando e conta registros pendentes; ao voltar, sincroniza e avisa.
- Se o **gateway** cair, o controlador continua obedecendo ao temporizador local; o app percebe pela falta de mensagens (6,5 s) e desativa os comandos.

## Transportes

`RaizLink.open({ farmId, role, transport })` (`js/link.js`, igual nas duas pastas). `link.ready` resolve quando o canal está pronto.

| Transporte | Uso |
|---|---|
| `broadcast` | **BroadcastChannel** (`raiz:<farmId>`) — abas/iframes da **mesma origem**, sem login. Ambiente local: sirva a raiz do repositório e abra `/fazenda-digital/` e `/app-oficial/`. É o padrão em `localhost`. |
| `supabase` | **Realtime Broadcast privado** no canal `farm:<uuid da fazenda>`, evento `msg`, corpo = envelope. Login por **link mágico** (Supabase Auth); só membros da fazenda enviam/recebem (RLS em `realtime.messages`). É o padrão quando hospedado. |

### Supabase (projeto `raiz`)

| Tabela | Papel |
|---|---|
| `farms` | fazendas (`slug`, `name`, `city`) — ex.: `jacutinga` |
| `farm_members` | quem pertence a qual fazenda e com qual perfil (`gestor` \| `operador`) |
| `farm_invites` | convite por e-mail; ao entrar pela primeira vez, o gatilho `on_auth_user_created` cria o vínculo. Sem acesso pela API |
| `farm_events` | registro de `alert.new`, `alert.update`, `command`, `command.ack`, `run.log` (telemetria **não** é gravada) |

- RLS em tudo: acesso sempre por pertencimento à fazenda (`is_farm_member`).
- A chave `anon` em `js/config.js` é pública por desenho. **Nunca** colocar a `service_role` no front-end.
- Convidar alguém: `insert into farm_invites (email, farm_id, role) …` (SQL Editor do Supabase).
- No Supabase, em *Authentication → URL Configuration*, o **Site URL** e as **Redirect URLs** precisam conter os endereços hospedados (fazenda e app), senão o link mágico não volta para o site certo.

### Limites desta etapa

- O gateway simulado ainda roda **no navegador** (aba da fazenda aberta). O próximo passo é movê-lo para uma Edge Function/worker.
- O Realtime Broadcast não valida o conteúdo: qualquer membro pode enviar qualquer mensagem. A validação de perfil (ex.: só `gestor` altera limiares) ainda não é imposta pelo servidor — precisa passar por tabela `commands` + função/gatilho.
- Comandos de bomba **não** podem depender só da interface: validar perfil, limites e energia no servidor/gateway (como já faz `gateway.js`).
