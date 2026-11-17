# Supabase (projeto `raiz`)

- `migrations/` — esquema (fazendas, membros, convites, eventos, estado do gateway/simulação) com RLS. Já aplicado no projeto; guardado para reprodução.
- `functions/gateway/` — **Edge Function `gateway`**: o gateway Raiz na nuvem. `handler.mjs` (lógica, testável no Node) · `index.ts` (liga ao Supabase) · `core.js` (cópia de `shared/gateway-core.js`: as mesmas regras do gateway local).

## Publicar a função

```bash
bash scripts/sync-shared.sh     # garante que core.js está igual a shared/gateway-core.js
npx supabase@latest login       # uma vez
npx supabase@latest functions deploy gateway --project-ref jodgchdwpnwuirhsrtvh --use-api
```

A função exige JWT de usuário (`verify_jwt`) e confere em `farm_members` se o usuário é da fazenda e o perfil (`gestor` alimenta o gateway e altera regras; `operador` comanda a bomba).
