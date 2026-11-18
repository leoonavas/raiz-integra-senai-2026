-- Qualquer usuário autenticado pode criar a própria fazenda (vira gestor dela). Limite de 3 fazendas por conta.
create function public.create_farm(p_name text, p_city text default null) returns public.farms
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); n int; base text; f public.farms;
begin
  if uid is null then raise exception 'não autenticado' using errcode = '28000'; end if;
  p_name := btrim(coalesce(p_name, '')); p_city := nullif(btrim(coalesce(p_city, '')), '');
  if char_length(p_name) < 2 or char_length(p_name) > 60 then raise exception 'O nome da fazenda deve ter de 2 a 60 caracteres.' using errcode = '22023'; end if;
  if p_city is not null and char_length(p_city) > 60 then raise exception 'O nome da cidade é muito longo.' using errcode = '22023'; end if;
  select count(*) into n from public.farm_members where user_id = uid and role = 'gestor';
  if n >= 3 then raise exception 'Limite de 3 fazendas por conta.' using errcode = '54000'; end if;
  base := trim(both '-' from regexp_replace(translate(lower(p_name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'fazenda'; end if;
  insert into public.farms (slug, name, city) values (left(base, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6), p_name, p_city) returning * into f;
  insert into public.farm_members (farm_id, user_id, role) values (f.id, uid, 'gestor');
  return f;
end $$;
revoke execute on function public.create_farm(text, text) from public, anon;
grant execute on function public.create_farm(text, text) to authenticated;
