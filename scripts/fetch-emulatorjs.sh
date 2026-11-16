#!/usr/bin/env bash
# Totv Retro Web - GPL-3.0-or-later
# Reproduz vendor/emulatorjs a partir do release oficial (verifica o SHA256 antes de extrair).
# Uso: scripts/fetch-emulatorjs.sh <diretório-de-trabalho-vazio>
set -euo pipefail
VER=4.2.3
SHA256=07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b
CORES="fceumm gambatte mgba smsplus mednafen_pce"
W=${1:?informe um diretório vazio de trabalho}
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$W" && [ -z "$(ls -A "$W")" ] || { echo "diretório não está vazio" >&2; exit 1; }
curl -fL -o "$W/$VER.7z" "https://github.com/EmulatorJS/EmulatorJS/releases/download/v$VER/$VER.7z"
echo "$SHA256  $W/$VER.7z" | sha256sum -c -
mkdir "$W/x" && 7z x -y -o"$W/x" "$W/$VER.7z" >/dev/null
D="$W/x/data"; V="$here/vendor/emulatorjs"
rm -rf "$V"; mkdir -p "$V/cores/reports" "$V/localization"
cp -r "$D/src" "$D/compression" "$V/"
cp "$D/loader.js" "$D/emulator.min.js" "$D/emulator.min.css" "$D/emulator.css" "$D/version.json" "$V/"
cp "$D/localization/pt-BR.json" "$D/localization/en-US.json" "$V/localization/"
cp "$W/x/LICENSE" "$V/LICENSE"
for c in $CORES; do cp "$D/cores/$c-wasm.data" "$D/cores/$c-legacy-wasm.data" "$V/cores/"; cp "$D/cores/reports/$c.json" "$V/cores/reports/"; done
echo ok
