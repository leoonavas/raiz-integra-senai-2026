-- Raiz: fazendas, membros, convites e log de eventos. Acesso sempre por pertencimento à fazenda (RLS).
-- (Já aplicado no projeto "raiz" pelo Supabase MCP; guardado aqui para reprodução.)
create table public.farms (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, city text, created_at timestamptz not null default now());
create table public.farm_members (farm_id uuid not null references public.farms(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('gestor','operador')), created_at timestamptz not null default now(), primary key (farm_id, user_id));
create index farm_members_user_idx on public.farm_members (user_id);
create table public.farm_invites (email text not null, farm_id uuid not null references public.farms(id) on delete cascade, role text not null check (role in ('gestor','operador')), created_at timestamptz not null default now(), primary key (email, farm_id));
create table public.farm_events (id bigint generated always as identity primary key, farm_id uuid not null references public.farms(id) on delete cascade, user_id uuid default auth.uid() references auth.users(id) on delete set null, src text not null check (src in ('farm','app')), type text not null, ts timestamptz not null default now(), payload jsonb);
create index farm_events_farm_ts_idx on public.farm_events (farm_id, ts desc);
alter table public.farms enable row level security; alter table public.farm_members enable row level security; alter table public.farm_invites enable row level security; alter table public.farm_events enable row level security;
create function public.is_farm_member(f uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.farm_members m where m.farm_id = f and m.user_id = (select auth.uid())) $$;
create function public.farm_role(f uuid) returns text language sql stable security definer set search_path = '' as $$ select m.role from public.farm_members m where m.farm_id = f and m.user_id = (select auth.uid()) $$;
revoke execute on function public.is_farm_member(uuid) from public, anon; revoke execute on function public.farm_role(uuid) from public, anon;
grant execute on function public.is_farm_member(uuid) to authenticated; grant execute on function public.farm_role(uuid) to authenticated;
create policy "membros veem a fazenda" on public.farms for select to authenticated using (public.is_farm_member(id));
create policy "ve o proprio vinculo; gestor ve todos" on public.farm_members for select to authenticated using (user_id = (select auth.uid()) or public.farm_role(farm_id) = 'gestor');
create policy "membros leem eventos" on public.farm_events for select to authenticated using (public.is_farm_member(farm_id));
create policy "membros gravam eventos" on public.farm_events for insert to authenticated with check (public.is_farm_member(farm_id) and user_id = (select auth.uid()));
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.farm_members (farm_id, user_id, role) select i.farm_id, new.id, i.role from public.farm_invites i where lower(i.email) = lower(new.email) on conflict do nothing; return new; end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create policy "membros recebem broadcast da fazenda" on realtime.messages for select to authenticated using (realtime.messages.extension = 'broadcast' and exists (select 1 from public.farm_members m where m.user_id = (select auth.uid()) and ('farm:' || m.farm_id::text) = (select realtime.topic())));
create policy "membros enviam broadcast da fazenda" on realtime.messages for insert to authenticated with check (realtime.messages.extension = 'broadcast' and exists (select 1 from public.farm_members m where m.user_id = (select auth.uid()) and ('farm:' || m.farm_id::text) = (select realtime.topic())));
alter table public.farm_events alter column user_id drop not null;
