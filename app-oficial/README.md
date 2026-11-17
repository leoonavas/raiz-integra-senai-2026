# Raiz — app oficial (interface para WebView)

Interface (HTML + CSS + JS puro, sem dependências). Por padrão usa dados de exemplo (`js/mock.js`). Com `?live` ela **recebe dados e envia comandos** a uma fazenda pelo canal `RaizLink` — hoje a [Fazenda Digital](../fazenda-digital/README.md), depois o Supabase (veja *Modo ao vivo* abaixo).

## Abrir e pré-visualizar

```bash
cd app-oficial && python3 -m http.server 8766
# http://localhost:8766/?preview&stage=app
```

Parâmetros de URL (só para desenvolvimento): `?preview` (painel para trocar tela, rede, alertas, bomba, perfil e tema, com o log dos eventos enviados ao nativo) · `stage=splash|connect|login|app` · `tab=home|irrig|alerts|net|more` · `theme=light|dark` · `frame` (moldura de celular no desktop).

## Telas

Splash → **Conectar à fazenda** (gateways na rede local, QR, código) → **Entrar** (PIN, biometria) → app com 5 abas:
**Início** (status, ação recomendada, talhões, alertas, clima, módulos) · **Irrigação** (umidade, vazão, pressão, comando da bomba com *segurar para ligar*, parada de emergência, histórico) · **Alertas** (detalhe com gráfico, confirmar, descartar, chamar manutenção) · **Rede** (topologia, sincronização, dispositivos) · **Mais** (perfil, limiares só para gestor, notificações, tema, sobre).

Pensado para WebView: viewport sem zoom, áreas seguras (`env(safe-area-inset-*)`), alvos de toque ≥ 44 px, sem depender de hover, claro/escuro automático (`prefers-color-scheme`), banners de modo local (sem internet) e de gateway offline.

## Modo ao vivo (recebe dados da fazenda)

```bash
python3 -m http.server 8767        # na raiz do repositório
# fazenda:  http://localhost:8767/fazenda-digital/   (já traz o app ao lado)
# app solto: http://localhost:8767/app-oficial/?live&role=gestor      (PIN de teste: 1234)
```

- `?live` liga o modo (ou `mode: 'live'` em `js/config.js`); `?mock` volta aos dados de exemplo. Outros: `?farm=f1` · `?role=gestor|operador` · `?auto` (entra sem PIN) · `?embed` (dentro de iframe).
- `js/live.js` transforma as mensagens do gateway no estado das telas (`telemetry` → umidade, vazão, pressão, bomba, clima; `alert.*`, `recommendation`, `run.log`, `forecast`, `series`, `device.status`, `heartbeat`) e envia os comandos da ponte (`pump.start`, `alert.confirm`…). Contrato completo em [../docs/PROTOCOLO.md](../docs/PROTOCOLO.md).
- A interface **não** muda o estado por conta própria: a bomba só aparece ligada quando o controlador informa; cada comando volta com um `ack` (ou um aviso após 6 s sem resposta).
- Sem mensagens por ~6,5 s, o app entende que perdeu o gateway e desativa os comandos.
- O transporte atual (`BroadcastChannel`) exige a mesma origem. Na próxima etapa basta registrar `RaizLink.transports.supabase` em `js/link.js` e usar `transport: 'supabase'` em `js/config.js`.
- O PIN `1234` é só do ambiente de teste (vale quando não há ponte nativa); na integração real o PIN é validado no nativo.

## Integração com o app nativo

**Web → nativo** (`RaizBridge.emit(tipo, dados)` envia `{type, payload, ts}` em JSON por `ReactNativeWebView.postMessage`, `webkit.messageHandlers.raiz` ou `RaizAndroid.postMessage`):

| Evento | Dados |
|---|---|
| `gateway.select` · `gateway.code` · `qr.scan` | `{id}` · — · — |
| `auth.pin` · `auth.biometric` · `logout` | `{pin}` (o log de pré-visualização mascara) · — · — |
| `pump.start` · `pump.stop` · `pump.emergency` · `pump.rearm` | `{plot, minutes}` · `{plot}` · `{plot}` · `{plot}` |
| `recommendation.refuse` | `{plot}` |
| `alert.confirm` · `alert.discard` · `alert.maintenance` | `{id}` |
| `device.restart` · `sync.now` · `support.open` | `{id}` · — · — |
| `settings.update` | `{theme}` · `{notif}` · `{biometrics}` · `{rules}` |

**Nativo → web:** `Raiz.setState(parcial)` (mescla objetos, substitui listas e redesenha) ou `Raiz.receive({type, payload})` com `state`, `toast`, `navigate`, `alert.new`, `auth.ok`, `auth.fail`. O formato do estado está em `js/mock.js` (`user`, `farm`, `net`, `weather`, `settings`, `modules`, `plots`, `alerts`, `devices`).

**Ao integrar:** defina `window.RAIZ_MOCK = false` antes de carregar `js/ui.js` (desliga os efeitos locais de demonstração: bomba que liga sozinha, alerta que some, contagem regressiva) e envie o estado real. A interface só emite o **pedido**; quem confirma que a bomba ligou é o controlador, via `setState`.

## Segurança (decisões de interface)

- Ligar a bomba exige *segurar 1 s* na confirmação; a parada de emergência é um toque.
- Comandos ficam desativados sem conexão com o gateway.
- Limiares só editáveis por perfil `gestor`.
- O PIN deve ser validado no nativo; esta interface só o coleta.
- Textos vindos do nativo são escapados antes de ir para o HTML.
