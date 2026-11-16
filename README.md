# totv-retro-web

Player web de jogos retrô para o [Totv](https://github.com/), construído sobre o [EmulatorJS](https://emulatorjs.org) 4.2.3.
Projeto **separado e GPL-3.0-or-later** (veja `LICENSE`): não contém nem importa código do Totv. A única interface com o servidor
é a "Games API" (HTTP + `postMessage`), descrita no `docs/games-api.md` do Totv.

## Plataformas e núcleos

| Plataforma | Núcleo | Licença |
|---|---|---|
| NES | fceumm | GPL-2.0 |
| Game Boy / Game Boy Color | gambatte | GPL-2.0 |
| Game Boy Advance | mgba | MPL-2.0 |
| Master System / Game Gear | smsplus (SMS Plus GX) | GPL-2.0+ |
| PC Engine | mednafen_pce | GPL-2.0 |
| **SNES** | não suportado no web | o EmulatorJS só traz `snes9x` (não comercial) |
| **Mega Drive** | não suportado no web | só `genesis_plus_gx`/`picodrive` (não comerciais) |

Como há planos de distribuição comercial, núcleos de licença não comercial foram excluídos de propósito.
Detalhes, versões, SHA256 e links do código-fonte correspondente: [`THIRD_PARTY.md`](THIRD_PARTY.md).

## Build

Sem bundler: módulos ES puros em `src/` + EmulatorJS fixado em `vendor/emulatorjs/`.

```sh
npm run build        # gera dist/ (inclui dist/version.txt)
```

Para refazer `vendor/emulatorjs/` a partir do release oficial (confere o SHA256): `scripts/fetch-emulatorjs.sh <pasta-vazia>`.

## Instalação no Totv

Copie o conteúdo de `dist/` para uma pasta do servidor e aponte a configuração `retroWebPath` do Totv para ela; o servidor
passa a servir o player em `/retro/` (`GET /api/games/retro-web` informa `installed` e `version`, lida de `version.txt`).

## Contrato

1. O Totv abre `<iframe src="/retro/index.html#item=<itemId>&media=<mediaId>&state=<stateId>">` (sem token na URL).
2. O iframe envia `{ type: 'totv-retro:ready' }` ao pai; o pai responde
   `{ type: 'totv-retro:init', server, token, itemId, mediaId, stateId, title, platform, lang }`.
   O player só aceita mensagens de `window.parent` com `origin === location.origin`.
3. O player busca `platforms` e o item, baixa a ROM (`X-Totv-Token`) e a BIOS listada, restaura SRAM e (se `stateId`) o estado
   (se o núcleo do estado for outro, ignora e avisa), e inicia a sessão (`start`, `heartbeat` a cada 60 s, `stop`).
4. Salvamentos: SRAM a cada 60 s (só se mudou) e na saída; estado automático (`auto=1`) com miniatura PNG a cada 5 min e na saída.
5. Saída: `{ type: 'totv-retro:exit', playedMs }`; falhas: `{ type: 'totv-retro:error', message }`.

## Uso

- **Esc** (ou Select+Start no controle, ou o botão no canto) abre o menu: continuar, salvar/carregar estado (slots 1 a 9 com
  miniaturas, mais os estados automáticos), reiniciar, avanço rápido, sair. Navegação por teclado, mouse e controle.
- Teclado e controle seguem os padrões do EmulatorJS (remapeáveis em "Controles", no ícone de engrenagem/gamepad da barra).
- Segurar **PageDown** = avanço rápido; **PageUp** = rebobinar (quando o núcleo suporta; fora do GBA).
- Textos em pt-BR ou inglês conforme `lang`.

## Segurança

- Token somente no cabeçalho `X-Totv-Token`; nunca em URL.
- `guard.js` bloqueia qualquer `fetch`/XHR/WebSocket para fora da mesma origem e do `server` informado (inclusive os do EmulatorJS,
  como o CDN de fallback); a CSP da página restringe imagens, fontes e mídia.
- Nada é carregado de CDN em tempo de execução.

## Testes

`npm test` (veja `test/README.md`): servidor falso da API + Chrome headless; usa apenas ROMs de teste/homebrew livres.

## Licença

GPL-3.0-or-later. Componentes de terceiros e suas licenças: `THIRD_PARTY.md` e `licenses/`.
