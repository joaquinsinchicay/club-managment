-- E05 Identidad del Club · US-46
-- Adds contact fields to clubs so admins can complete the full institutional identity
-- (domicilio, email, telefono). Columns are nullable to keep legacy clubs readable;
-- the application layer enforces obligatoriedad at submit time.

alter table public.clubs
  add column if not exists domicilio text,
  add column if not exists email text,
  add column if not exists telefono text;
