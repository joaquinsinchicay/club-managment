insert into receipt_formats (
  id,
  club_id,
  name,
  validation_type,
  pattern,
  min_numeric_value,
  example,
  status,
  visible_for_secretaria,
  visible_for_tesoreria
)
select
  uuid_generate_v4(),
  clubs.id,
  'Sistema de socios',
  'pattern',
  '^PAY-SOC-[0-9]{5}$',
  10556,
  'PAY-SOC-26205',
  'active',
  false,
  false
from clubs
where not exists (
  select 1
  from receipt_formats
  where receipt_formats.club_id = clubs.id
);
