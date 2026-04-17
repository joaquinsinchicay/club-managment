alter table receipt_formats
  add column if not exists visible_for_secretaria boolean default true,
  add column if not exists visible_for_tesoreria boolean default false;
