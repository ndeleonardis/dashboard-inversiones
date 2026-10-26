-- T9. Autoría: quién cargó y quién modificó cada fila, y cuándo (C27).

-- El email de quien está conectado. Vacío para lo que se carga desde el
-- panel de Supabase o desde una migración.
create function public.email_de_la_sesion() returns text
language sql
stable
set search_path = ''
as $$
  select nullif(lower(auth.jwt() ->> 'email'), '')
$$;

-- Completa la autoría. Pisa lo que mande la app, así nadie puede cargar algo
-- a nombre de otro ni cambiar quién lo cargó.
create function public.marcar_autoria() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := public.email_de_la_sesion();
    new.creado_en := now();
    new.modificado_por := null;
    new.modificado_en := null;
  else
    new.creado_por := old.creado_por;
    new.creado_en := old.creado_en;
    new.modificado_por := public.email_de_la_sesion();
    new.modificado_en := now();
  end if;
  return new;
end;
$$;

-- Agrega las columnas y el trigger de autoría a una tabla. Las migraciones que
-- creen tablas nuevas la llaman; un test exige que ninguna quede sin autoría.
create function public.agregar_autoria(p_tabla regclass) returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'alter table %s
       add column creado_por text,
       add column creado_en timestamptz not null default now(),
       add column modificado_por text,
       add column modificado_en timestamptz',
    p_tabla
  );
  execute format(
    'create trigger %I before insert or update on %s for each row execute function public.marcar_autoria()',
    (select relname from pg_catalog.pg_class where oid = p_tabla) || '_autoria',
    p_tabla
  );
end;
$$;

-- Cambia la estructura de la base: solo la pueden usar las migraciones.
revoke execute on function public.agregar_autoria(regclass) from public, anon, authenticated, service_role;

select public.agregar_autoria(tabla)
from unnest(array[
  'public.persona',
  'public.tipo_cuenta',
  'public.cuenta',
  'public.tipo_instrumento',
  'public.instrumento',
  'public.tipo_operacion',
  'public.operacion',
  'public.tipo_gasto',
  'public.gasto',
  'public.tipo_ingreso',
  'public.ingreso'
]::regclass[]) as tabla;
