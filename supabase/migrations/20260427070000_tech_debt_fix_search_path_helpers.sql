-- Security advisor 0011 (function_search_path_mutable):
-- Fijar search_path en helpers SQL stable para evitar attack surface
-- por search_path manipulation.

create or replace function public.current_club_id()
  returns uuid
  language sql
  stable
  set search_path = public
as $$
  select nullif(current_setting('app.current_club_id', true), '')::uuid;
$$;

create or replace function public.current_user_email()
  returns text
  language sql
  stable
  set search_path = public
as $$
  select auth.jwt() ->> 'email';
$$;

create or replace function public.current_user_id()
  returns uuid
  language sql
  stable
  set search_path = public
as $$
  select auth.uid();
$$;
