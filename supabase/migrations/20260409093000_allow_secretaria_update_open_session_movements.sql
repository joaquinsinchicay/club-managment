drop policy if exists "Tesoreria can update movements in current club" on treasury_movements;
drop policy if exists "Secretaria and tesoreria can update movements in current club" on treasury_movements;

create policy "Secretaria and tesoreria can update movements in current club"
on treasury_movements
for update
to authenticated
using (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (select current_user_has_role('tesoreria'))
  )
)
with check (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (select current_user_has_role('tesoreria'))
  )
);
