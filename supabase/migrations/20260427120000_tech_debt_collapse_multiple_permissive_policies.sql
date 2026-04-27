-- Performance advisor 0006 (multiple_permissive_policies):
-- Resolver 21 lints colapsando policies redundantes y/o dividiendo
-- las "ALL" en INSERT/UPDATE/DELETE explicitas para no solaparse
-- con la SELECT especifica. Semantica preservada exactamente.
--
-- Patron dominante:
--   "Treasury|Admin manage X" ALL  +  "Members can view X" SELECT
--   ⇒  La ALL cubre SELECT con condicion mas estricta (rol especifico),
--       pero la "Members" SELECT cubre TODOS los miembros del club
--       (incluye al rol especifico, que es member). Por lo tanto la
--       SELECT del ALL es redundante. Fix: dividir ALL en INSERT/UPDATE/
--       DELETE; SELECT queda con la "Members" amplia.

-- =========================================================================
-- club_activities  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage activities in current club" on public.club_activities;

create policy "Treasury insert activities in current club" on public.club_activities
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury update activities in current club" on public.club_activities
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury delete activities in current club" on public.club_activities
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- club_calendar_events  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage calendar events in current club" on public.club_calendar_events;

create policy "Treasury insert calendar events in current club" on public.club_calendar_events
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury update calendar events in current club" on public.club_calendar_events
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury delete calendar events in current club" on public.club_calendar_events
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- cost_centers  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage cost centers in current club" on public.cost_centers;

create policy "Treasury insert cost centers in current club" on public.cost_centers
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury update cost centers in current club" on public.cost_centers
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury delete cost centers in current club" on public.cost_centers
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- treasury_account_currencies  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage account currencies in current club" on public.treasury_account_currencies;

create policy "Treasury insert account currencies in current club" on public.treasury_account_currencies
  as permissive for insert to authenticated
  with check (exists (
    select 1 from public.treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  ));

create policy "Treasury update account currencies in current club" on public.treasury_account_currencies
  as permissive for update to authenticated
  using (exists (
    select 1 from public.treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  ))
  with check (exists (
    select 1 from public.treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  ));

create policy "Treasury delete account currencies in current club" on public.treasury_account_currencies
  as permissive for delete to authenticated
  using (exists (
    select 1 from public.treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  ));

-- =========================================================================
-- treasury_accounts  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage accounts in current club" on public.treasury_accounts;

create policy "Treasury insert accounts in current club" on public.treasury_accounts
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury update accounts in current club" on public.treasury_accounts
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury delete accounts in current club" on public.treasury_accounts
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- treasury_categories  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage categories in current club" on public.treasury_categories;

create policy "Treasury insert categories in current club" on public.treasury_categories
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury update categories in current club" on public.treasury_categories
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Treasury delete categories in current club" on public.treasury_categories
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- treasury_movement_cost_centers  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Treasury manage movement cost center links" on public.treasury_movement_cost_centers;

create policy "Treasury insert movement cost center links" on public.treasury_movement_cost_centers
  as permissive for insert to authenticated
  with check (
    (select current_user_has_role('tesoreria'))
    and exists (select 1 from public.cost_centers cc
                where cc.id = treasury_movement_cost_centers.cost_center_id
                  and cc.club_id = current_club_id())
    and exists (select 1 from public.treasury_movements m
                where m.id = treasury_movement_cost_centers.movement_id
                  and m.club_id = current_club_id())
  );

create policy "Treasury update movement cost center links" on public.treasury_movement_cost_centers
  as permissive for update to authenticated
  using (
    (select current_user_has_role('tesoreria'))
    and exists (select 1 from public.cost_centers cc
                where cc.id = treasury_movement_cost_centers.cost_center_id
                  and cc.club_id = current_club_id())
    and exists (select 1 from public.treasury_movements m
                where m.id = treasury_movement_cost_centers.movement_id
                  and m.club_id = current_club_id())
  )
  with check (
    (select current_user_has_role('tesoreria'))
    and exists (select 1 from public.cost_centers cc
                where cc.id = treasury_movement_cost_centers.cost_center_id
                  and cc.club_id = current_club_id())
    and exists (select 1 from public.treasury_movements m
                where m.id = treasury_movement_cost_centers.movement_id
                  and m.club_id = current_club_id())
  );

create policy "Treasury delete movement cost center links" on public.treasury_movement_cost_centers
  as permissive for delete to authenticated
  using (
    (select current_user_has_role('tesoreria'))
    and exists (select 1 from public.cost_centers cc
                where cc.id = treasury_movement_cost_centers.cost_center_id
                  and cc.club_id = current_club_id())
    and exists (select 1 from public.treasury_movements m
                where m.id = treasury_movement_cost_centers.movement_id
                  and m.club_id = current_club_id())
  );

-- =========================================================================
-- receipt_formats  (1 lint: SELECT) — admin (no tesoreria)
-- =========================================================================

drop policy if exists "Admins manage receipt formats in current club" on public.receipt_formats;

create policy "Admins insert receipt formats in current club" on public.receipt_formats
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('admin')));

create policy "Admins update receipt formats in current club" on public.receipt_formats
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('admin')))
  with check (club_id = current_club_id() and (select current_user_has_role('admin')));

create policy "Admins delete receipt formats in current club" on public.receipt_formats
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('admin')));

-- =========================================================================
-- daily_cash_sessions  (1 lint: SELECT)
-- "Secretaria manage" ALL secretaria  +  "view" SELECT (admin OR secretaria)
-- ⇒ La "view" cubre el SELECT que daria la "manage"; dividir manage
--    en INSERT/UPDATE/DELETE.
-- =========================================================================

drop policy if exists "Secretaria can manage sessions in current club" on public.daily_cash_sessions;

create policy "Secretaria insert sessions in current club" on public.daily_cash_sessions
  as permissive for insert to authenticated
  with check (club_id = (select current_club_id()) and (select current_user_has_role('secretaria')));

create policy "Secretaria update sessions in current club" on public.daily_cash_sessions
  as permissive for update to authenticated
  using (club_id = (select current_club_id()) and (select current_user_has_role('secretaria')))
  with check (club_id = (select current_club_id()) and (select current_user_has_role('secretaria')));

create policy "Secretaria delete sessions in current club" on public.daily_cash_sessions
  as permissive for delete to authenticated
  using (club_id = (select current_club_id()) and (select current_user_has_role('secretaria')));

-- =========================================================================
-- daily_consolidation_batches  (1 lint: SELECT)
-- =========================================================================

drop policy if exists "Tesoreria can manage consolidation batches in current club" on public.daily_consolidation_batches;

create policy "Tesoreria insert consolidation batches in current club" on public.daily_consolidation_batches
  as permissive for insert to authenticated
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Tesoreria update consolidation batches in current club" on public.daily_consolidation_batches
  as permissive for update to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')))
  with check (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

create policy "Tesoreria delete consolidation batches in current club" on public.daily_consolidation_batches
  as permissive for delete to authenticated
  using (club_id = current_club_id() and (select current_user_has_role('tesoreria')));

-- =========================================================================
-- club_invitations  (2 lints: SELECT + UPDATE)
-- "Admins manage" ALL admin  +  "Users see own" SELECT (email match)
--                            +  "Users consume own" UPDATE (email match)
-- ⇒ Combinar SELECT con OR; combinar UPDATE con OR; "Admins manage" se
--    divide en INSERT/DELETE (SELECT y UPDATE pasan a las combinadas).
-- =========================================================================

drop policy if exists "Admins manage invitations in current club" on public.club_invitations;
drop policy if exists "Users can see own pending invitations" on public.club_invitations;
drop policy if exists "Users can consume own invitations" on public.club_invitations;

create policy "Invitations insert by admin" on public.club_invitations
  as permissive for insert to authenticated
  with check (club_id = (select current_club_id()) and (select current_user_has_role('admin')));

create policy "Invitations delete by admin" on public.club_invitations
  as permissive for delete to authenticated
  using (club_id = (select current_club_id()) and (select current_user_has_role('admin')));

create policy "Invitations select by admin or own email" on public.club_invitations
  as permissive for select to authenticated
  using (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (email = (select current_user_email()))
  );

create policy "Invitations update by admin or own email" on public.club_invitations
  as permissive for update to authenticated
  using (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (email = (select current_user_email()))
  )
  with check (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (email = (select current_user_email()))
  );

-- =========================================================================
-- membership_roles  (2 lints: SELECT + INSERT)
-- =========================================================================

drop policy if exists "Admins manage membership roles in current club" on public.membership_roles;
drop policy if exists "Users can insert own membership roles from invitations" on public.membership_roles;
drop policy if exists "Users can see own membership roles" on public.membership_roles;

create policy "Membership roles update by admin" on public.membership_roles
  as permissive for update to authenticated
  using (exists (
    select 1 from public.memberships
    where memberships.id = membership_roles.membership_id
      and memberships.club_id = (select current_club_id())
      and (select current_user_has_role('admin'))
  ))
  with check (exists (
    select 1 from public.memberships
    where memberships.id = membership_roles.membership_id
      and memberships.club_id = (select current_club_id())
      and (select current_user_has_role('admin'))
  ));

create policy "Membership roles delete by admin" on public.membership_roles
  as permissive for delete to authenticated
  using (exists (
    select 1 from public.memberships
    where memberships.id = membership_roles.membership_id
      and memberships.club_id = (select current_club_id())
      and (select current_user_has_role('admin'))
  ));

create policy "Membership roles insert by admin or own from invitation" on public.membership_roles
  as permissive for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships
      where memberships.id = membership_roles.membership_id
        and memberships.club_id = (select current_club_id())
        and (select current_user_has_role('admin'))
    )
    or
    exists (
      select 1 from public.memberships
      where memberships.id = membership_roles.membership_id
        and memberships.user_id = (select current_user_id())
        and exists (
          select 1 from public.club_invitations
          where club_invitations.club_id = memberships.club_id
            and club_invitations.email = (select current_user_email())
            and club_invitations.role = membership_roles.role
            and club_invitations.status = 'pending'
            and club_invitations.used_at is null
        )
    )
  );

create policy "Membership roles select by admin or own" on public.membership_roles
  as permissive for select to authenticated
  using (
    exists (
      select 1 from public.memberships
      where memberships.id = membership_roles.membership_id
        and memberships.club_id = (select current_club_id())
        and (select current_user_has_role('admin'))
    )
    or
    exists (
      select 1 from public.memberships
      where memberships.id = membership_roles.membership_id
        and memberships.user_id = (select current_user_id())
    )
  );

-- =========================================================================
-- memberships  (3 lints: DELETE + INSERT + SELECT)
-- =========================================================================

drop policy if exists "Admins manage memberships in current club" on public.memberships;
drop policy if exists "Users can remove own memberships" on public.memberships;
drop policy if exists "Users can create own memberships from invitations" on public.memberships;
drop policy if exists "Users can see own memberships" on public.memberships;

create policy "Memberships update by admin" on public.memberships
  as permissive for update to authenticated
  using (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
  with check (club_id = (select current_club_id()) and (select current_user_has_role('admin')));

create policy "Memberships delete by admin or own" on public.memberships
  as permissive for delete to authenticated
  using (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (user_id = (select current_user_id()))
  );

create policy "Memberships insert by admin or own from invitation" on public.memberships
  as permissive for insert to authenticated
  with check (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (
      user_id = (select current_user_id())
      and exists (
        select 1 from public.club_invitations
        where club_invitations.club_id = memberships.club_id
          and club_invitations.email = (select current_user_email())
          and club_invitations.status = 'pending'
          and club_invitations.used_at is null
      )
    )
  );

create policy "Memberships select by admin or own" on public.memberships
  as permissive for select to authenticated
  using (
    (club_id = (select current_club_id()) and (select current_user_has_role('admin')))
    or
    (user_id = (select current_user_id()))
  );

-- =========================================================================
-- treasury_movements  (3 lints: SELECT + INSERT + UPDATE)
-- "Admin full access" ALL  +  "Members can view" SELECT
--                          +  "Sec/Tes insert" INSERT
--                          +  "Sec/Tes update" UPDATE
-- ⇒ SELECT cubierto por "Members" (admin tambien es member). Combinar
--    INSERT y UPDATE con OR. "Admin full access" pasa a DELETE only.
-- =========================================================================

drop policy if exists "Admin full access movements in current club" on public.treasury_movements;
drop policy if exists "Secretaria or tesoreria can insert movements in current club" on public.treasury_movements;
drop policy if exists "Secretaria and tesoreria can update movements in current club" on public.treasury_movements;

create policy "Movements delete by admin" on public.treasury_movements
  as permissive for delete to authenticated
  using (club_id = (select current_club_id()) and (select current_user_has_role('admin')));

create policy "Movements insert by admin secretaria or tesoreria" on public.treasury_movements
  as permissive for insert to authenticated
  with check (
    club_id = current_club_id()
    and (
      (select current_user_has_role('admin'))
      or (select current_user_has_role('secretaria'))
      or (
        (select current_user_has_role('tesoreria'))
        and origin_source = 'transfer'::movement_origin_source
        and origin_role = 'tesoreria'::movement_origin_role
      )
    )
  );

create policy "Movements update by admin secretaria or tesoreria" on public.treasury_movements
  as permissive for update to authenticated
  using (
    club_id = current_club_id()
    and (
      (select current_user_has_role('admin'))
      or (select current_user_has_role('secretaria'))
      or (select current_user_has_role('tesoreria'))
    )
  )
  with check (
    club_id = current_club_id()
    and (
      (select current_user_has_role('admin'))
      or (select current_user_has_role('secretaria'))
      or (select current_user_has_role('tesoreria'))
    )
  );

-- =========================================================================
-- users  (1 lint: SELECT)
-- "Admins can see users of current club" + "Users can see themselves"
-- ⇒ Combinar SELECT con OR.
-- =========================================================================

drop policy if exists "Admins can see users of current club" on public.users;
drop policy if exists "Users can see themselves" on public.users;

create policy "Users select self or admin of shared club" on public.users
  as permissive for select to authenticated
  using (
    id = current_user_id()
    or
    (
      (select current_user_has_role('admin'))
      and exists (
        select 1 from public.memberships
        where memberships.user_id = users.id
          and memberships.club_id = (select current_club_id())
      )
    )
  );
