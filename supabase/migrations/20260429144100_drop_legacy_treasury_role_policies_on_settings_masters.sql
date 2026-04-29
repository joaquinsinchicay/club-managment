-- Las migraciones previas (tech-debt 20260427120000) habían split las
-- policies "Treasury manage X" en INSERT/UPDATE/DELETE separadas para
-- evitar warnings del Supabase advisor sobre "multiple permissive
-- policies". El audit 2026-04-29 + migración 20260429143400 alinearon
-- la mutación a `admin`, pero las policies split de tesoreria seguían
-- vigentes y siendo aditivas (OR), permitiendo que tesoreria también
-- mutara categorías y actividades desde /settings.
--
-- Esta migración borra las policies legacy. Resultado:
--   treasury_categories / club_activities → mutación SOLO admin.
-- (treasury_accounts no se toca: tesoreria sí debe mutarlas.)

drop policy if exists "Treasury insert categories in current club" on treasury_categories;
drop policy if exists "Treasury update categories in current club" on treasury_categories;
drop policy if exists "Treasury delete categories in current club" on treasury_categories;

drop policy if exists "Treasury insert activities in current club" on club_activities;
drop policy if exists "Treasury update activities in current club" on club_activities;
drop policy if exists "Treasury delete activities in current club" on club_activities;
