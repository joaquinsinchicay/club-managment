alter table public.treasury_movements
add column if not exists display_id text;

with ranked_movements as (
  select
    tm.id,
    (
      coalesce(
        nullif(
          upper(
            array_to_string(
              array(
                select left(word, 1)
                from regexp_split_to_table(trim(coalesce(c.name, 'CLUB')), '\s+') as word
                where word <> ''
              ),
              ''
            )
          ),
          ''
        ),
        'CLUB'
      ) ||
      '-MOV-' ||
      to_char(tm.movement_date, 'YYYY') ||
      '-' ||
      row_number() over (
        partition by tm.club_id, to_char(tm.movement_date, 'YYYY')
        order by tm.created_at, tm.id
      )::text
    ) as display_id
  from public.treasury_movements tm
  join public.clubs c on c.id = tm.club_id
)
update public.treasury_movements tm
set display_id = ranked_movements.display_id
from ranked_movements
where ranked_movements.id = tm.id
  and coalesce(tm.display_id, '') = '';

alter table public.treasury_movements
alter column display_id set not null;
