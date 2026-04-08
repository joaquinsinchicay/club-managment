-- Database security inventory helpers for Supabase projects.
-- Run these queries in Supabase SQL Editor against the live project when
-- Advisor reports `rls_disabled_in_public` or `sensitive_columns_exposed`.

-- 1. Public tables and RLS status.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
order by c.relname;

-- 2. Public tables with RLS disabled.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = false
order by c.relname;

-- 3. Policies currently applied to each public table.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Tables in public without any policies.
select
  t.table_schema,
  t.table_name
from information_schema.tables t
left join pg_policies p
  on p.schemaname = t.table_schema
 and p.tablename = t.table_name
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
group by t.table_schema, t.table_name
having count(p.policyname) = 0
order by t.table_name;

-- 5. Columns likely to trigger sensitive-data review.
select
  table_schema,
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and (
    column_name ilike '%email%'
    or column_name ilike '%phone%'
    or column_name ilike '%name%'
    or column_name ilike '%document%'
    or column_name ilike '%address%'
    or column_name ilike '%payload%'
    or column_name ilike '%receipt%'
    or column_name ilike '%concept%'
  )
order by table_name, column_name;
