create or replace function public.get_club_calendar_events_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  title text,
  starts_at timestamp,
  ends_at timestamp,
  is_enabled_for_treasury boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    cce.id,
    cce.club_id,
    cce.title,
    cce.starts_at,
    cce.ends_at,
    cce.is_enabled_for_treasury
  from public.club_calendar_events cce
  where cce.club_id = p_club_id
  order by cce.starts_at nulls last, cce.title nulls last, cce.id;
end;
$$;
