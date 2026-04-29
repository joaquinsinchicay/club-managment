-- =============================================================
-- Fix: alinear RLS de masters de Settings al rol que efectivamente
-- los muta desde la UI (admin), no `tesoreria` que es legacy.
-- =============================================================
-- Contexto: el audit PDDs vs código (2026-04-29) detectó que las
-- policies de mutación de `treasury_categories` y `club_activities`
-- requerían rol `tesoreria`, pero en la UI estos masters se
-- gestionan desde `/settings/categorias-y-actividades` por rol
-- `admin`. El service (`treasury-settings-service.ts`) gateia con
-- `canMutateTreasurySettings` = `admin`, y al ejecutar el INSERT
-- la RLS rechazaba la operación. Resultado: el feature no
-- funcionaba para Admin.
--
-- `treasury_accounts` queda intencionalmente en `tesoreria`: las
-- cuentas se gestionan desde `/treasury` por el rol `tesoreria`,
-- no desde `/settings`. Por eso esa policy NO se toca en esta
-- migración.
-- =============================================================

-- 1) treasury_categories: mutación admin
drop policy if exists "Treasury manage categories in current club" on treasury_categories;

create policy "Admins manage categories in current club"
on treasury_categories
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- 2) club_activities: mutación admin
drop policy if exists "Treasury manage activities in current club" on club_activities;

create policy "Admins manage activities in current club"
on club_activities
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- 3) club_activities: unique constraint sobre nombre activo por club
-- PDD US-20 §8 exige unicidad de (club_id, name) entre actividades activas.
-- Si la migración falla por duplicados existentes, deduplicar manualmente
-- antes de re-aplicar.
create unique index if not exists club_activities_active_name_unique
  on club_activities (club_id, lower(trim(name)))
  where status = 'activa';
