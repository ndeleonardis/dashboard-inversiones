-- T10. Acceso a los datos. La key de la API es pública, así que la base
-- decide qué puede hacer cada uno:
-- - Sin sesión (anon), nada.
-- - Con sesión pero sin invitación, nada.
-- - Un miembro, que es alguien con su email cargado en una persona, ve y
--   edita todo. En una copia por grupo todos ven todo.

-- ¿Quien está conectado tiene su email en una persona? security definer:
-- lee persona sin pasar por su propio RLS, que depende de esta función.
create function public.es_miembro() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.persona
    where email is not null and email = public.email_de_la_sesion()
  )
$$;

-- Ningún permiso de fábrica: cada uno se da a propósito.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges revoke execute on functions from public;

-- Lo que necesita alguien con sesión. Las políticas usan es_miembro(), los
-- triggers usan email_de_la_sesion() y validar_posicion(), y la vista posicion
-- usa el agregado costo_promedio.
grant execute on function public.es_miembro() to authenticated;
grant execute on function public.email_de_la_sesion() to authenticated;
grant execute on function public.validar_posicion(uuid, uuid) to authenticated;
grant execute on function public.costo_promedio(text, numeric, numeric, numeric, integer) to authenticated;

-- Persona: el email es la invitación, y solo lo carga quien administra la copia.
grant select, delete on public.persona to authenticated;
grant insert (nombre), update (nombre) on public.persona to authenticated;

-- Catálogos fijos: los usan las reglas, así que la app solo los lee.
grant select on public.tipo_cuenta, public.tipo_instrumento, public.tipo_operacion to authenticated;

-- Categorías: cada grupo agrega y renombra las suyas (C20).
grant select, insert, update on public.tipo_gasto, public.tipo_ingreso to authenticated;

grant select, insert, update, delete
  on public.cuenta, public.instrumento, public.operacion, public.gasto, public.ingreso
  to authenticated;

grant select on public.posicion to authenticated;

-- RLS en todas las tablas, con la misma regla: solo miembros.
do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array[
    'persona', 'tipo_cuenta', 'cuenta', 'tipo_instrumento', 'instrumento', 'tipo_operacion',
    'operacion', 'tipo_gasto', 'gasto', 'tipo_ingreso', 'ingreso'
  ] loop
    execute format('alter table public.%I enable row level security', v_tabla);
    execute format(
      'create policy solo_miembros on public.%I for all to authenticated
         using ((select public.es_miembro())) with check ((select public.es_miembro()))',
      v_tabla
    );
  end loop;
end;
$$;

-- Si la invitación se hace fuera de la app, sacarla también: desde la app no
-- se puede borrar una persona que tiene email, para que nadie se quede afuera
-- por error.
create function public.proteger_persona_con_acceso() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.email is not null and current_user in ('authenticated', 'anon') then
    raise exception using
      errcode = 'LH003',
      message = 'Esta persona entra a la app. Para sacarla, pedíselo a quien administra la copia';
  end if;
  return old;
end;
$$;

create trigger persona_proteger_con_acceso
  before delete on public.persona
  for each row execute function public.proteger_persona_con_acceso();
