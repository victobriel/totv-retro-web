# Componentes de terceiros

O totv-retro-web é distribuído sob **GPL-3.0-or-later** (veja `LICENSE`). Todo o código-fonte
correspondente está neste repositório ou nos links abaixo. Nada é carregado de CDN em tempo de execução.

## EmulatorJS

| Item | Valor |
|---|---|
| Versão fixada | **4.2.3** (tag `v4.2.3`, commit `e150dc0491ae747028919fb82d6598954976ede6`, 2025-07-05) |
| Arquivo | `4.2.3.7z` do release oficial |
| URL | https://github.com/EmulatorJS/EmulatorJS/releases/download/v4.2.3/4.2.3.7z |
| SHA256 do arquivo | `07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b` |
| Licença | GPL-3.0 (`vendor/emulatorjs/LICENSE`) |
| Código-fonte | https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3 (os fontes não minificados também estão em `vendor/emulatorjs/src/`) |

Em `vendor/emulatorjs/` ficam apenas: `loader.js`, `emulator.min.js/.css`, `emulator.css`, `src/`, `compression/`,
as traduções `pt-BR` e `en-US` e **somente os núcleos usados** (variantes `wasm` e `legacy-wasm`, sem threads).
`scripts/fetch-emulatorjs.sh` refaz essa pasta a partir do release, conferindo o SHA256.
As variantes "thread" (exigem SharedArrayBuffer/COOP+COEP) não são incluídas.

## Núcleos (cores)

Compilados pelo projeto EmulatorJS (https://github.com/EmulatorJS/build) em 2025-06-14, a partir dos forks abaixo.
Os commits listados são o último de cada fork anterior ao horário de compilação (o pacote de núcleo não grava o commit
exato; o repositório `EmulatorJS/build` contém as receitas de compilação).

Critério: **só licenças que permitem distribuição comercial** (GPL/MPL/LGPL/MIT). Excluídos de propósito:
`snes9x`, `genesis_plus_gx` e `picodrive` (licenças não comerciais) — não estão no bundle.

| Plataforma | Núcleo | Licença | SHA256 do `-wasm.data` / `-legacy-wasm.data` | Fonte (fork usado pelo EmulatorJS) |
|---|---|---|---|---|
| nes | `fceumm` | GPL-2.0 | `8c449fd5c36646fb0769423ed6ffa9efbdfc21fbfdc9bac7952b559d34d5b493`<br>`f1054b094e7149fd6278485bc1b2e51ff75c5259048ddb1134171e53d651f239` | https://github.com/EmulatorJS/libretro-fceumm/tree/d9d7e141274d07186b6a871ca2919b6f13cfb2f9 (upstream: https://github.com/libretro/libretro-fceumm) |
| gb, gbc | `gambatte` | GPL-2.0 | `ad67c7bf57f8f8b62606048e6ea498afac5b5abc76ad8de5f9dfc2a6719374bb`<br>`940a7381d51223c0be0c0f98d1a988d42cc98d03c27b392cbd29cb9f357b5f62` | https://github.com/EmulatorJS/gambatte-libretro/tree/811b1f7a56c16f8588caada36d7a3f9a56cb16d4 (upstream: https://github.com/libretro/gambatte-libretro) |
| gba | `mgba` | MPL-2.0 | `01fcaf6d4296ef1db6676e0c69400c4474e24572d0b2b99cc097e4ae885e02d7`<br>`e300d2f368c82bf61d77c972c36e367cf16408ec3d50beede080337519a3d696` | https://github.com/EmulatorJS/mgba/tree/57678d6180e7020798809703283e02d2bba18b63 (upstream: https://github.com/mgba-emu/mgba) |
| sms, gg | `smsplus` (SMS Plus GX) | GPL-2.0-or-later | `0f197c5e0000f17b2d072122a72b3f8fc1693514c4014fcd9694eec78584aa08`<br>`9fcc16b3e4ad662c395542bc96a0142cded1d17cbd8e43f0d5b3205cf4f7d340` | https://github.com/EmulatorJS/smsplus-gx/tree/c642bbd0680b5959180a420036108893d0aec961 (upstream: https://github.com/libretro/smsplus-gx) |
| pce | `mednafen_pce` (Beetle PCE) | GPL-2.0 | `29cebda0c7a93bbcb5e67e97fe28a1886bd030715d5a25224e7d9175d1d985c3`<br>`c3d6e52680175b5528964b2c506a462bfd330d856661f28c5a54f7114b9b9a4c` | https://github.com/EmulatorJS/beetle-pce-libretro/tree/e1ac90d5a97ad328c51b8b01e68da8af5faa1579 (upstream: https://github.com/libretro/beetle-pce-libretro) |

Textos de licença: `licenses/` (também copiados para `dist/licenses/`). O mGBA inclui componentes de terceiros
sob licenças permissivas (BSD/MIT/zlib), descritas no repositório dele. O `smsplus-gx` inclui núcleo de FM de
CrabEmu (GPLv2) e Z80 sob BSD, conforme o README do fork.

Observação sobre o `smsplus`: o fork do EmulatorJS não tem arquivo `LICENSE` na raiz; a licença (GPLv2 ou posterior) está no
README e nos cabeçalhos de `source/` e no texto em `docs/license` (copiado para `licenses/smsplus-GPL-2.0.txt`).

## Plataformas sem núcleo utilizável no web

O EmulatorJS 4.2.3 não traz `bsnes`, `mednafen_supafaust` nem `sameboy`; para as plataformas abaixo só há
núcleos com licença não comercial, então ficam **fora**:

| Plataforma | Situação |
|---|---|
| snes | **não suportado no web** (só `snes9x`, não comercial). Use o Totv Retro (Android TV, `mednafen_supafaust`). |
| md (Mega Drive/Genesis) | **não suportado no web** (só `genesis_plus_gx` e `picodrive`, não comerciais; `smsplus` não emula o Mega Drive). |

O player responde a essas plataformas com `totv-retro:error` ("Plataforma não suportada no web") e o Totv pode ocultar o botão.

## ROMs de teste

`test/` não inclui ROMs. Os testes baixam, para uma pasta temporária, ROMs homebrew/de teste redistribuíveis
(ver `test/README.md`); nenhuma ROM comercial é usada.
