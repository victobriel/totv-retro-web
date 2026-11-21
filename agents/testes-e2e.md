# Agente: testes-e2e

**Área:** testes end-to-end do player: servidor falso da Games API, harness em iframe e Chrome headless.
**Modelo:** Sonnet (`claude-sonnet-5-5`). Haiku para resumir logs; Opus para falha intermitente. Ver [models.md](models.md).

## Por que existe esta área

- `test/e2e.mjs` — único teste do projeto (`npm test`): boot de NES e GBA (canvas não vazio), SRAM, estado,
  miniatura, sessão, mensagem de saída, SNES sem suporte, nenhuma requisição externa, nenhum token em URL.
- `test/mock-server.mjs` — serve `dist/` em `/retro/`, `harness.html` e uma API Totv falsa (só o que o player usa).
- `test/harness.html` — página que embute o player em iframe e faz o handshake `totv-retro:*`.
- `test/README.md` — instruções, variáveis (`ROM_DIR`, `CHROME`, `PUPPETEER_CORE`) e fontes das ROMs de teste.

## Escopo (pode editar)

- `test/e2e.mjs`, `test/mock-server.mjs`, `test/harness.html`
- `test/README.md` (apenas a parte de execução; o texto de licença das ROMs é de `docs-licencas`)
- `.gitignore`, somente a linha `test/roms/` e `test/shot-*.png` se a convenção mudar (coordenar com `build-vendor`)

## Não pode tocar

- `src/**` → `frontend-player` / `api-seguranca`. Se o teste falha por bug, reportar; não corrigir `src/` aqui.
- `scripts/**`, `vendor/**` → `build-vendor`.
- Versionar ROM em `test/roms/` (é ignorada de propósito; ROMs só homebrew/teste livremente redistribuíveis).
- Afrouxar uma asserção para passar (ex.: aceitar canvas vazio, remover checagem de requisição externa, remover
  checagem de token em URL) sem justificativa aprovada.
- Trocar o Chrome/puppeteer por outra ferramenta sem decisão da pessoa.

## Critério de pronto

1. `npm run build` antes de `npm test` (o mock serve `dist/`).
2. `npm test` passa com as ROMs e o Chrome disponíveis; o log final é colado no relatório.
3. Se o ambiente não tem ROM ou Chrome: o agente roda o que for possível (`node --check test/*.mjs`), e declara
   **explicitamente** que `npm test` não foi executado e por quê. Não reportar como "passou".
4. Toda asserção nova tem um comentário ou nome que diz o que prova (o arquivo é em português).
5. Nenhuma requisição externa e nenhum token em URL continuam sendo verificados.

## Quando escalar

| Situação | Para | Motivo |
|---|---|---|
| Teste falha e a causa é `src/` | `frontend-player` (UI/fluxo) ou `api-seguranca` (rede/token/contrato) | Quem é dono do código corrige. |
| Teste falha só em CI/ambiente (Chrome, ROM ausente) | pessoa | O ambiente é da pessoa; não há CI no repo. |
| Mudança no formato da API falsa | `api-seguranca` | O mock precisa refletir o contrato real. |
| Falha intermitente (timing de emulador) | Opus, com log de 3 execuções | Diagnóstico difícil; evitar `sleep` fixo como correção. |

## Limites

- Não há teste de unidade nem lint. A cobertura é só o fluxo descrito acima.
- `npm test` depende de Chrome real e de ROMs baixadas manualmente. Sem isso, nenhuma prova de runtime é possível.
