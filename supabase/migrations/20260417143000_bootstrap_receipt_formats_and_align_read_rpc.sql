alter table public.receipt_formats
add column if not exists visible_for_secretaria boolean default true,
add column if not exists visible_for_tesoreria boolean default false;

update public.receipt_formats
set
  visible_for_secretaria = coalesce(visible_for_secretaria, true),
  visible_for_tesoreria = coalesce(visible_for_tesoreria, false)
where visible_for_secretaria is null or visible_for_tesoreria is null;

alter table public.receipt_formats
alter column visible_for_secretaria set default true,
alter column visible_for_tesoreria set default false;

create or replace function public.get_receipt_formats_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  validation_type public.receipt_validation_type,
  pattern text,
  min_numeric_value numeric,
  example text,
  status text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    rf.id,
    rf.club_id,
    rf.name,
    rf.validation_type,
    rf.pattern,
    rf.min_numeric_value,
    rf.example,
    rf.status,
    coalesce(rf.visible_for_secretaria, true),
    coalesce(rf.visible_for_tesoreria, false)
  from public.receipt_formats rf
  where rf.club_id = p_club_id
  order by rf.name;
end;
$$;
