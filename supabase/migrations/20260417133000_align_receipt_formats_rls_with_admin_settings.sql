drop policy if exists "Treasury manage receipt formats in current club" on public.receipt_formats;
drop policy if exists "Admins manage receipt formats in current club" on public.receipt_formats;

create policy "Admins manage receipt formats in current club"
on public.receipt_formats
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('admin'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('admin'))
);
