#!/bin/bash
# Copia os arquivos compartilhados (cada pasta é hospedada de forma independente).
set -e
cd "$(dirname "$0")/.."
cp shared/gateway-core.js fazenda-digital/js/gateway-core.js
mkdir -p supabase/functions/gateway && cp shared/gateway-core.js supabase/functions/gateway/core.js
cp fazenda-digital/js/link.js app-oficial/js/link.js
echo "ok: gateway-core.js -> fazenda-digital/js e supabase/functions/gateway; link.js (fazenda) -> app-oficial"
