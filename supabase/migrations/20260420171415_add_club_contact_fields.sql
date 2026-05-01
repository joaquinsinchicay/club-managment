alter table public.clubs
  add column if not exists domicilio text,
  add column if not exists email text,
  add column if not exists telefono text;
