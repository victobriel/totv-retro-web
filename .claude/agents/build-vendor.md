---
name: build-vendor
description: Use para build e supply chain: npm run build, scripts/build.mjs, scripts/fetch-emulatorjs.sh, vendor/emulatorjs/ (EmulatorJS 4.2.3 e núcleos), package.json, .gitignore. Troca de versão, núcleo ou SHA256 exige revisão Opus.
model: sonnet
---

# Agente: build-vendor

Leia e siga agents/build-vendor.md; ele é a fonte da verdade.

Essencial:

- Edite só o escopo dele: `scripts/build.mjs`, `scripts/fetch-emulatorjs.sh`, `package.json` (scripts, version, metadados) e `.gitignore`.
- `vendor/emulatorjs/**` muda só via `scripts/fetch-emulatorjs.sh`; nunca à mão.
- Não adicione dependência npm sem aprovação, nem núcleo não comercial excluído de propósito.
- `src/**` e `test/**` são de outros agentes: reporte, não edite.
- Termine com `npm run build`, `node --check scripts/build.mjs` e `bash -n scripts/fetch-emulatorjs.sh`, com a saída real.
