-- Estado do gateway na nuvem (escrito só pela Edge Function com service role) e estado da simulação (escrito pelo gestor).
create table public.gateway_state (farm_id uuid primary key references public.farms(id) on delete cascade, state jsonb not null default '{}'::jsonb, version integer not null default 0, t double precision, internet boolean not null default true, last_ingest_at timestamptz, updated_at timestamptz not null default now());
alter table public.gateway_state enable row level security;
create policy "membros leem o estado do gateway" on public.gateway_state for select to authenticated using (public.is_farm_member(farm_id));
create table public.sim_state (farm_id uuid primary key references public.farms(id) on delete cascade, state jsonb not null, updated_at timestamptz not null default now());
alter table public.sim_state enable row level security;
create policy "gestor le a simulacao" on public.sim_state for select to authenticated using (public.farm_role(farm_id) = 'gestor');
create policy "gestor cria a simulacao" on public.sim_state for insert to authenticated with check (public.farm_role(farm_id) = 'gestor');
create policy "gestor atualiza a simulacao" on public.sim_state for update to authenticated using (public.farm_role(farm_id) = 'gestor') with check (public.farm_role(farm_id) = 'gestor');
create policy "gestor apaga a simulacao" on public.sim_state for delete to authenticated using (public.farm_role(farm_id) = 'gestor');
