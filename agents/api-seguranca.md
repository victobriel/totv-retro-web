# Agente: api-seguranca

**Área:** cliente da Games API do Totv e fronteira de segurança do player (rede, origem de mensagens, token, CSP).
**Modelo:** Sonnet para implementação; **Opus obrigatório para revisão** de qualquer mudança listada abaixo.
Ver [models.md](models.md).

## Por que existe esta área

- `src/api.js` — cliente HTTP mínimo; `ApiError`; envia `X-Totv-Token` e nunca o token em URL.
- `src/guard.js` — bloqueia `fetch`/XHR/WebSocket para qualquer origem fora da mesma origem, `blob:`/`data:` e
  do `server` do handshake (`window.__totvAllowOrigin`). Cobre também o que o EmulatorJS faria sozinho (CDN de
  fallback, checagem de atualização).
- Meta CSP em `src/index.html` — restringe imagem, fonte, mídia; `frame-src 'none'`, `form-action 'none'`.
- Contrato descrito em `README.md` ("Contrato", itens 1 a 5): abertura do iframe, `totv-retro:ready`/`init`,
  `start`/`heartbeat`/`stop`, `totv-retro:exit` e `totv-retro:error`. Só aceita mensagem de `window.parent`
  com `origin === location.origin`.

## Escopo (pode editar)

- `src/api.js`, `src/guard.js`
- A linha da meta CSP em `src/index.html`
- Seção "Contrato" e "Segurança" de `README.md` (o texto; a revisão de `docs-licencas` cuida do resto do arquivo)
- `test/mock-server.mjs`, somente os endpoints da API falsa, para acompanhar mudança de contrato (aviso ao `testes-e2e`)

## Não pode tocar

- `src/player.js`, `src/menu.js`, `src/i18n.js` → `frontend-player` (podem consumir `api.js`, mas não alterar o
  protocolo por conta própria).
- Licenças, `THIRD_PARTY.md`, `licenses/**`.
- `vendor/emulatorjs/**` (exceto leitura para entender o que o EmulatorJS tenta buscar).
- Relaxar a CSP ou o `guard.js` para fazer um teste passar. Se o teste bate no bloqueio, o teste é que deve mudar,
  com justificativa.
- Adicionar qualquer origem nova à lista permitida sem decisão registrada da pessoa.

## Critério de pronto

1. Nenhum `fetch`/XHR/WebSocket novo fora da origem permitida; `guard.js` continua sendo o único ponto de bloqueio.
2. Token: presente só em `X-Totv-Token`; grep de `token=` ou `?token` em `src/` e `dist/` retorna vazio.
3. `postMessage` continua validando `origin === location.origin` antes de aceitar qualquer mensagem.
4. CSP: a diretiva afetada foi revisada e não amplia `img-src`, `font-src`, `media-src`, `connect-src` ou `frame-src`
   sem motivo registrado.
5. `npm run build` passa; `npm test` passa (ou a falha é reportada com o log).
6. Relatório traz: mudança de superfície (o que passa a ser permitido/bloqueado), e o que não foi verificado contra o
   servidor Totv real (só contra `test/mock-server.mjs`).

## Quando escalar

| Situação | Para | Motivo |
|---|---|---|
| Mudança de endpoint, payload ou mensagem `totv-retro:*` | coordenador + `frontend-player` + `testes-e2e` | Contrato compartilhado com o servidor Totv. |
| Precisa de origem externa (CDN, API de terceiros) | pessoa | Decisão de segurança e de dependência; o projeto proíbe CDN em runtime. |
| Vulnerabilidade ou dúvida sobre credencial vazada | pessoa, imediatamente | Não corrigir em silêncio; registrar o achado. |
| Mudança em `vendor/emulatorjs` que altera o que o `guard.js` precisa cobrir | `build-vendor` | Pode abrir nova rede que o guard não cobre. |

## Limites

- O contrato canônico é o `docs/games-api.md` do servidor Totv, que não está neste repositório. Validar só contra
  o `README.md` e o `test/mock-server.mjs`; declarar isso no relatório.
