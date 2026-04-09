drop policy if exists "Members can view treasury field rules" on public.treasury_field_rules;
drop policy if exists "Treasury manage treasury field rules in current club" on public.treasury_field_rules;
drop policy if exists "Admins manage treasury field rules in current club" on public.treasury_field_rules;

drop table if exists public.treasury_field_rules;
