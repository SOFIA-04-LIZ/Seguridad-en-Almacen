-- Ejecutar completo en Supabase > SQL Editor > New query > Run.
begin;

create table if not exists public.warehouse_ranking (
  id bigint generated always as identity primary key,
  run_id uuid not null unique,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  score bigint not null check (score between -9007199254740991 and 9007199254740991)
);

alter table public.warehouse_ranking enable row level security;
revoke all on public.warehouse_ranking from anon, authenticated;

create or replace function public.warehouse_top5()
returns table (name text, score bigint)
language sql security definer set search_path = ''
as $$
  select r.name, r.score from public.warehouse_ranking r
  order by r.score desc, r.id asc limit 5;
$$;

create or replace function public.warehouse_submit_score(
  p_run_id uuid, p_name text, p_score bigint
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
  insert into public.warehouse_ranking (run_id, name, score)
  values (p_run_id, btrim(p_name), p_score);
  delete from public.warehouse_ranking where id in (
    select r.id from public.warehouse_ranking r order by r.score desc, r.id asc offset 5
  );
  return jsonb_build_object('accepted', true, 'position', v_position);
end;
$$;

revoke all on function public.warehouse_top5() from public;
revoke all on function public.warehouse_submit_score(uuid, text, bigint) from public;
grant execute on function public.warehouse_top5() to anon, authenticated;
grant execute on function public.warehouse_submit_score(uuid, text, bigint) to anon, authenticated;

commit;
