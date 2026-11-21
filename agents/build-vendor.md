# Agente: build-vendor

**Área:** build do `dist/`, scripts de build e de reprodução do vendor, e o EmulatorJS/núcleos vendorizados (supply chain).
**Modelo:** Sonnet para scripts; **Opus** para troca de versão, de núcleo ou de SHA256; Haiku para rodar o build e
resumir a saída. Ver [models.md](models.md).

## Por que existe esta área

- `scripts/build.mjs` — monta `dist/`: copia `src/`, `vendor/emulatorjs` (→ `dist/data`), `LICENSE`,
  `THIRD_PARTY.md`, `licenses/` e grava `version.txt`. Sem bundler.
- `scripts/fetch-emulatorjs.sh` — refaz `vendor/emulatorjs/` a partir do release oficial 4.2.3, **conferindo o
  SHA256 antes de extrair**; mantém só os núcleos usados (`fceumm gambatte mgba smsplus mednafen_pce`).
- `vendor/emulatorjs/**` — EmulatorJS 4.2.3 (`version.json`), núcleos `*-legacy-wasm.data`, traduções, `LICENSE`.
- `package.json` — scripts `build` e `test`; `"type": "module"`.
- `.gitignore` — exclui `dist/`, `node_modules/`, `test/roms/`.

## Escopo (pode editar)

- `scripts/build.mjs`, `scripts/fetch-emulatorjs.sh`
- `vendor/emulatorjs/**` — **somente via** `scripts/fetch-emulatorjs.sh`; não editar à mão.
- `package.json` (apenas campos `scripts`, `version` e metadados; sem dependências novas sem decisão)
- `.gitignore`

## Não pode tocar

- `src/**` → `frontend-player` / `api-seguranca`.
- `test/**` → `testes-e2e`.
- `THIRD_PARTY.md`, `licenses/**`, `LICENSE` → `docs-licencas`, sempre que o SHA256, a versão ou a licença mudar
  (os dois devem ser atualizados juntos).
- Adicionar dependência npm sem aprovação: o projeto não tem `node_modules` versionado nem lockfile, e o build
  deve continuar sem ferramenta extra.
- Incluir núcleo não comercial (`snes9x`, `genesis_plus_gx`, `picodrive`). Está excluído de propósito (`README.md`).
- Incluir a variante "thread" (exige COOP/COEP) sem decisão registrada.

## Critério de pronto

1. `npm run build` termina sem erro; `dist/version.txt` mostra a versão esperada; `dist/data/` contém os núcleos
   e traduções previstos.
2. `node --check scripts/build.mjs` passa; `bash -n scripts/fetch-emulatorjs.sh` passa.
3. Se o vendor mudou: `sha256sum` do arquivo de release bate com o valor em `scripts/fetch-emulatorjs.sh` e em
   `THIRD_PARTY.md`, e a lista de núcleos em `THIRD_PARTY.md` foi atualizada.
4. Nenhum arquivo de núcleo ou de fonte foi editado à mão.
5. Relatório traz: versão antes/depois, SHA256 novo, e se o `fetch` foi executado de fato (rede necessária) ou se
   a verificação foi só local.

## Quando escalar

| Situação | Para | Motivo |
|---|---|---|
| Troca de versão do EmulatorJS ou de núcleo | Opus + pessoa (aprovação) + `docs-licencas` | Supply chain e licença; afeta o que o usuário executa. |
| Núcleo com licença nova ou não listada | pessoa | Decisão de licença/comercial é da pessoa. |
| Mudança que obriga novo host na rede | `api-seguranca` | `guard.js` precisa cobrir o que for novo. |
| Mudança de `dist/` que altera caminhos servidos (`/retro/`) | `frontend-player` + `api-seguranca` | Quebra o contrato de instalação no Totv. |
| Build falha por causa de código em `src/` | `frontend-player` ou `api-seguranca` | Não corrigir o código de produção aqui. |

## Limites

- `fetch-emulatorjs.sh` baixa do GitHub e precisa de `7z` instalado; sem rede, só a verificação estática do script
  é possível. Declarar no relatório.
- Não há CI: a verificação de SHA256 só acontece quando alguém roda o script.
