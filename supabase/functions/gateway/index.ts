// Gateway Raiz na nuvem — Supabase Edge Function. A lógica está em handler.mjs (testável fora do Deno).
import { createClient } from "npm:@supabase/supabase-js@2";
import { makeHandler } from "./handler.mjs";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",                     // o navegador guarda a pré-verificação (CORS) por 24 h: metade das chamadas a menos
};

// O JWT já foi verificado pela plataforma (verify_jwt). Aqui só lemos o papel e o usuário.
function jwtUser(authorization: string | null) {
  try {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.role === "authenticated" && p.sub ? { id: p.sub as string } : null;   // a chave anon (role=anon) não passa
  } catch { return null; }
}

const handle = makeHandler({
  now: () => Date.now(),
  user: async (authorization: string | null) => jwtUser(authorization),
  async member(userId: string, farmId: string) {
    const { data } = await db.from("farm_members").select("role, farms(id, slug, name, city)").eq("user_id", userId).eq("farm_id", farmId).maybeSingle();
    return data ? { role: data.role, farm: data.farms } : null;
  },
  async load(farmId: string) {
    const { data } = await db.from("gateway_state").select("state, version, t, internet, last_ingest_at").eq("farm_id", farmId).maybeSingle();
    return data;
  },
  async save(farmId: string, expected: number | null, row: Record<string, unknown>) {
    if (expected == null) {
      const { error } = await db.from("gateway_state").insert({ farm_id: farmId, version: 1, ...row });
      return !error;
    }
    const { data } = await db.from("gateway_state").update({ ...row, version: expected + 1, updated_at: new Date().toISOString() }).eq("farm_id", farmId).eq("version", expected).select("farm_id");
    return !!(data && data.length);
  },
  async remove(farmId: string) { await db.from("gateway_state").delete().eq("farm_id", farmId); },
  async log(rows: Record<string, unknown>[]) { await db.from("farm_events").insert(rows); },
  async broadcast(farmId: string, messages: Record<string, unknown>[]) {
    for (let i = 0; i < messages.length; i += 90) {
      const res = await fetch(`${URL}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.slice(i, i + 90).map((payload) => ({ topic: `farm:${farmId}`, event: "msg", payload, private: true })) }),
      });
      if (!res.ok) console.error("broadcast", res.status, await res.text());
    }
  },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const r = await handle({ authorization: req.headers.get("Authorization"), body });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: "erro interno" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
