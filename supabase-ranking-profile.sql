-- Ejecutar completo en Supabase > SQL Editor > New query > Run.
-- Conserva los nombres y puntajes existentes; no modifica los registros antiguos.
begin;
alter table public.warehouse_ranking
  add column if not exists department text not null default ''
    check (char_length(department) <= 60),
  add column if not exists area text not null default ''
    check (char_length(area) <= 60);

create or replace function public.warehouse_top5_profile()
returns table (name text, department text, area text, score bigint)
language sql security definer set search_path = ''
as $$
  select r.name, r.department, r.area, r.score from public.warehouse_ranking r
  order by r.score desc, r.id asc limit 5;
$$;

create or replace function public.warehouse_submit_score_profile(
  p_run_id uuid, p_name text, p_score bigint, p_department text, p_area text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_position integer;
  v_id bigint;
begin
  if p_run_id is null or p_name is null or
     char_length(btrim(p_name)) not between 1 and 30 or
     p_department is null or char_length(btrim(p_department)) not between 1 and 60 or
     p_area is null or char_length(btrim(p_area)) not between 1 and 60 or
     p_score is null or p_score not between -9007199254740991 and 9007199254740991 then
    raise exception 'Nombre o puntaje inválido';
  end if;

  -- Serializar las inscripciones para mantener exactamente cinco puestos.
  lock table public.warehouse_ranking in exclusive mode;
  select r.id into v_id from public.warehouse_ranking r where r.run_id = p_run_id;
  if v_id is not null then
    select count(*) + 1 into v_position from public.warehouse_ranking r
    where r.score > p_score or (r.score = p_score and r.id < v_id);
    return jsonb_build_object('accepted', true, 'position', v_position);
  end if;

  select count(*) + 1 into v_position from public.warehouse_ranking r where r.score >= p_score;
  if v_position > 5 then
    return jsonb_build_object('accepted', false, 'position', null);
  end if;
  insert into public.warehouse_ranking (run_id, name, score, department, area)
  values (p_run_id, btrim(p_name), p_score, btrim(p_department), btrim(p_area));
  delete from public.warehouse_ranking where id in (
    select r.id from public.warehouse_ranking r order by r.score desc, r.id asc offset 5
  );
  return jsonb_build_object('accepted', true, 'position', v_position);
end;
$$;


revoke all on function public.warehouse_top5_profile() from public;
revoke all on function public.warehouse_submit_score_profile(uuid, text, bigint, text, text) from public;
grant execute on function public.warehouse_top5_profile() to anon, authenticated;
grant execute on function public.warehouse_submit_score_profile(uuid, text, bigint, text, text) to anon, authenticated;
commit;
