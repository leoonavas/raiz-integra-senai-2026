#!/usr/bin/env bash
# Gera os PDFs a partir dos HTML desta pasta usando o Chrome em modo headless (macOS).
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/.."
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT/Raiz_INTEGRA_SENAI_2026_Dossie.pdf" "file://$DIR/dossie.html"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT/Raiz_Analise_Aderencia_ATLAS_x_INTEGRA.pdf" "file://$DIR/analise.html"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT/Raiz_Roteiro_Pitch_INTEGRA.pdf" "file://$DIR/roteiro_pitch.html"
echo "PDFs gerados em $OUT"
