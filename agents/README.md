# Sistema de agentes — totv-retro-web

Definição de agentes para trabalhar neste repositório. **Não há código de runtime**: o sistema é um conjunto de
arquivos de escopo, critério de pronto, escalonamento e roteamento de modelo. Cada agente é lido pelo modelo ou
pela pessoa que executa a tarefa.

## Contexto do projeto (o que o código mostra)

- Player web de jogos retrô, **JavaScript ES puro sem bundler** (`src/*.js`), Node para scripts de build e testes
  (`package.json`, `"type": "module"`).
- Emulação via **EmulatorJS 4.2.3 vendorizado** em `vendor/emulatorjs/` (núcleos `.data`/`.wasm`, licenças).
- Único ponto de integração com o servidor Totv: a "Games API" (HTTP + `postMessage`), descrita em
  `README.md` ("Contrato") e no `docs/games-api.md` do servidor, que **não está neste repositório**.
- Testes: `npm test` = `test/e2e.mjs` com Chrome headless (`test/README.md`); ROMs não versionadas.
- **Não existem**: CI (`.github/`), `AGENTS.md`, `CLAUDE.md`, backend, banco de dados, lint configurado.
  Por isso não há agentes para essas áreas.

## Áreas e agentes

| Coordenação (ponto de entrada das tarefas) | `orquestrador` | [orquestrador.md](orquestrador.md) | Sonnet |
| Frontend do player (UI, menu, i18n, seleção de núcleo) | `frontend-player` | [frontend-player.md](frontend-player.md) | Sonnet |
| Integração com a Games API e fronteira de segurança | `api-seguranca` | [api-seguranca.md](api-seguranca.md) | Sonnet (revisão: Opus) |
| Build, vendor do EmulatorJS e supply chain | `build-vendor` | [build-vendor.md](build-vendor.md) | Sonnet (mudança de versão: Opus) |
| Testes end-to-end | `testes-e2e` | [testes-e2e.md](testes-e2e.md) | Sonnet |
| Documentação e licenças | `docs-licencas` | [docs-licencas.md](docs-licencas.md) | Haiku (texto novo: Sonnet) |

**Ponto de entrada:** toda tarefa começa pelo `orquestrador`, que escolhe os agentes acima, despacha cada um e
consolida o resultado. Ele não edita arquivos.

Tabela de modelos, justificativas e regra de roteamento: [models.md](models.md).

## Como usar: `claude --agent orquestrador`

Na raiz do repositório:

```sh
claude --agent orquestrador
```

O Claude Code lê os sub-agentes de `.claude/agents/<agente>.md` (um por área, mesmo nome deste diretório). Cada um
aponta para o arquivo de `agents/` e declara o modelo (`sonnet`, `haiku`; revisão `opus` pelo orquestrador). O
orquestrador chama cada área pela ferramenta Agent. Os arquivos de `agents/` continuam sendo a fonte da verdade:
`.claude/agents/` não duplica escopo nem regras.

## Mapa de propriedade dos arquivos

Cada arquivo tem **um** dono de escrita. Os outros agentes podem ler, mas devem escalar para editar.

| Caminho | Dono |
|---|---|
| `src/index.html` (exceto a meta CSP) | `frontend-player` |
| `src/menu.js`, `src/i18n.js`, `src/player.css` | `frontend-player` |
| `src/player.js` | `frontend-player` (mudanças de protocolo: `api-seguranca`) |
| `src/cores.js` | `frontend-player` (lista `SHIPPED_CORES`: também `build-vendor` e `docs-licencas`) |
| `src/api.js`, `src/guard.js`, meta CSP em `src/index.html` | `api-seguranca` |
| `scripts/build.mjs`, `scripts/fetch-emulatorjs.sh`, `vendor/emulatorjs/**`, `package.json`, `.gitignore` | `build-vendor` |
| `test/**` | `testes-e2e` |
| `README.md`, `THIRD_PARTY.md`, `LICENSE`, `licenses/**`, `test/README.md` (ver nota) | `docs-licencas` |

Nota: `test/README.md` é documentação, mas descreve o harness; `testes-e2e` é o dono, e `docs-licencas` só
altera o texto de licença/ROM dele mediante aprovação de `testes-e2e`.
Nota: a seção "Contrato" do `README.md` é autoria de `api-seguranca`; `docs-licencas` a mantém em sincronia,
mas não a altera sem essa aprovação.

## Regras gerais (valem para todos os agentes)

1. **Escopo**: editar apenas os caminhos do próprio agente. Fora do escopo, abrir escalonamento.
2. **Não alterar código de produção sem prova**: toda mudança em `src/` ou `scripts/` termina com `npm run build`
   e, quando afeta comportamento, `npm test` (que exige ROMs e Chrome; ver "Limites" abaixo).
3. **Sem push, sem PR** por padrão; quem pede é o coordenador ou a pessoa.
4. **Sem CDN e sem rede em runtime**: o player não pode carregar nada de fora da origem (`src/guard.js`, `THIRD_PARTY.md`).
5. **Token nunca em URL**: `X-Totv-Token` apenas (`README.md`, "Segurança").
6. **Licenças**: só GPL/MPL/LGPL/MIT/BSD no bundle; núcleos não comerciais ficam de fora (`README.md`, `THIRD_PARTY.md`).
7. **Commits**: mensagem em português, no formato já usado pelo histórico (`git log --oneline`).

## Como escalar

Escalonar = registrar no relatório do agente: o motivo, o caminho que está fora de escopo, e o agente destino.
Ordem de mudança típica para um recurso novo: `api-seguranca` (contrato/segurança) → `frontend-player` → `build-vendor`
(se mexe no bundle) → `testes-e2e` → `docs-licencas`.

## Limites e lacunas

- **Sem CI**: nenhum agente roda `npm test` automaticamente; a prova é local.
- **`npm test` não é reproduzível sem preparo**: exige `test/roms/` (ROMs baixadas, não versionadas), Chrome em
  `/usr/bin/google-chrome-stable` (ou `CHROME`) e `puppeteer-core` (`PUPPETEER_CORE`).
- **Sem lint/format**: não há ferramenta configurada; a prova de sintaxe é `node --check` e o build.
- **`docs/games-api.md` externo**: o contrato canônico está no servidor Totv; o agente `api-seguranca` só
  consegue validar contra o `README.md` e o `test/mock-server.mjs`.
- **Sem agente de servidor/banco/infra**: não há código desses domínios no repositório.
