# Testes

`npm run build && npm test` sobe `test/mock-server.mjs` (serve `dist/` em `/retro/`, `harness.html` e uma API Totv falsa),
abre o Chrome headless e confere: boot de NES e GBA (canvas não vazio), SRAM/estado/miniatura/sessão, mensagem de saída,
plataforma sem suporte (SNES), nenhuma requisição externa e nenhum token em URL.

ROMs (não versionadas, em `test/roms/`; apenas ROMs de teste/homebrew livremente redistribuíveis):

- `nestest.nes`: https://raw.githubusercontent.com/christopherpow/nes-test-roms/master/other/nestest.nes (nestest, Kevin Horton)
- `arm.gba`: https://raw.githubusercontent.com/jsmolka/gba-tests/master/arm/arm.gba (gba-tests, MIT)

Variáveis: `ROM_DIR` (padrão `test/roms`), `CHROME` (padrão `/usr/bin/google-chrome-stable`), `PUPPETEER_CORE` (caminho do `puppeteer-core`).
