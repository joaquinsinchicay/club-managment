do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'category_movement_type'
  ) then
    create type public.category_movement_type as enum ('ingreso', 'egreso', 'saldo');
  end if;
end
$$;

alter table public.treasury_categories
  add column if not exists sub_category_name text,
  add column if not exists description text,
  add column if not exists parent_category text,
  add column if not exists movement_type public.category_movement_type,
  add column if not exists is_system boolean not null default false,
  add column if not exists is_legacy boolean not null default false;

update public.treasury_categories
set
  sub_category_name = coalesce(sub_category_name, name),
  description = coalesce(description, name),
  parent_category = coalesce(parent_category, 'Migradas'),
  movement_type = coalesce(
    movement_type,
    case
      when lower(trim(name)) in ('cuotas', 'fichajes', 'subsidios', 'sponsor') then 'ingreso'::public.category_movement_type
      else 'egreso'::public.category_movement_type
    end
  );

update public.treasury_categories
set
  is_legacy = true,
  is_system = false,
  visible_for_secretaria = false,
  visible_for_tesoreria = false
where lower(trim(name)) in (
  'alquileres',
  'cuotas',
  'eventos',
  'fichajes',
  'impuestos',
  'indumentaria',
  'inversiones',
  'ligas/jornadas',
  'mantenimiento',
  'obra',
  'otros',
  'préstamo',
  'prestamo',
  'servicios',
  'sponsor',
  'subsidios',
  'sueldos',
  'utilería',
  'utileria',
  'ajuste'
);

update public.treasury_categories
set name = sub_category_name
where name is distinct from sub_category_name;

alter table public.treasury_categories
  alter column sub_category_name set not null,
  alter column description set not null,
  alter column parent_category set not null,
  alter column movement_type set not null;

create or replace function public.get_treasury_categories_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  sub_category_name text,
  description text,
  parent_category text,
  movement_type public.category_movement_type,
  status text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean,
  emoji text,
  is_system boolean,
  is_legacy boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    tc.id,
    tc.club_id,
    tc.name,
    tc.sub_category_name,
    tc.description,
    tc.parent_category,
    tc.movement_type,
    tc.status,
    tc.visible_for_secretaria,
    tc.visible_for_tesoreria,
    tc.emoji,
    tc.is_system,
    tc.is_legacy
  from public.treasury_categories tc
  where tc.club_id = p_club_id
  order by tc.is_legacy asc, tc.sub_category_name asc;
end;
$$;
