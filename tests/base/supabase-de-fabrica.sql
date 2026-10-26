-- Lo que un proyecto de Supabase trae de fábrica y las migraciones dan por
-- hecho. Solo se carga en la base de prueba (PGlite), nunca en Supabase.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

create schema auth;

-- Igual que en Supabase: la API pone los datos del token de la sesión en
-- request.jwt.claims y auth.jwt() los devuelve.
create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;

-- Supabase da todos los permisos sobre public a estos roles. Las
-- migraciones los restringen con permisos explícitos y RLS.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
