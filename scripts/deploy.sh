#!/bin/bash
# Publica tudo: Edge Function (Supabase) + fazenda digital e app (Vercel).
# Requisitos (uma vez): `npx supabase@latest login` e `npx vercel@latest login`. Os projetos do Vercel já estão ligados (.vercel/ local).
set -e
cd "$(dirname "$0")/.."
SCOPE=leoonline25zzz-1690s-projects
REF=jodgchdwpnwuirhsrtvh
bash scripts/sync-shared.sh
V="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
echo "$V" > fazenda-digital/version.txt; echo "$V" > app-oficial/version.txt        # abas abertas percebem que há versão nova
echo "== Edge Function";  npx --yes supabase@latest functions deploy gateway --remote=$REF --use-api --yes 2>&1 | grep -i "deployed\|error" || true
for d in app-oficial fazenda-digital; do echo "== $d"; (cd $d && npx --yes vercel@latest deploy --prod --yes --scope $SCOPE 2>&1 | grep -i "aliased\|error" | head -2); done
git checkout -- fazenda-digital/version.txt app-oficial/version.txt                 # o repositório guarda "dev"
echo "versão publicada: $V"
