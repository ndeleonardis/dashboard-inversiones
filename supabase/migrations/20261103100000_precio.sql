-- T1. Precios de mercado (v2). Los trae un proceso externo, que entra con el
-- rol carga_precios y escribe solo a través de guardar_precios(). Los miembros
-- solo los leen. carga_precios no ve ninguna tabla: no puede leer datos
-- personales aunque se filtre su contraseña.

-- Una fila por instrumento y fecha. Si la fuente corrige el valor de un día,
-- se reemplaza: para valuar alcanza con el último, y el historial de
-- revisiones vive en la fuente.
create table public.precio (
  id uuid primary key default gen_random_uuid(),
  instrumento_id uuid not null,
  fecha date not null,
  valor numeric not null,
  -- Cada cuántas unidades es el valor, tal como lo publica la fuente: 1.000
  -- para un FCI de la CAFCI, 100 para una ON y 1 para el resto. El valor de
  -- una posición es cantidad × valor ÷ cada.
  cada integer not null,
  -- Es la del instrumento, y la base exige que coincidan (regla 2).
  moneda public.moneda not null,
  fuente text not null,
  capturado_en timestamptz not null default now(),
  constraint precio_moneda_instrumento_fk foreign key (instrumento_id, moneda)
    references public.instrumento (id, moneda) on update no action on delete cascade,
  constraint precio_instrumento_fecha_unico unique (instrumento_id, fecha),
  constraint precio_valor_positivo check (valor > 0),
  constraint precio_valor_decimales check (scale(valor) <= 8),
  constraint precio_cada_positivo check (cada > 0),
  constraint precio_fuente_no_vacia check (length(trim(fuente)) > 0)
);

select public.agregar_autoria('public.precio');

alter table public.precio enable row level security;
create policy solo_miembros_leen on public.precio for select to authenticated
  using ((select public.es_miembro()));
grant select on public.precio to authenticated;

-- El rol del proceso externo. Se crea sin login: quien administra la copia le
-- da login y contraseña desde el panel, y la contraseña nunca entra al repo.
create role carga_precios nologin noinherit;
grant usage on schema public to carga_precios;

-- Guarda los precios de una corrida, todos o ninguno. Cada elemento trae
-- instrumento_id, fecha, valor, cada, moneda y fuente. Devuelve cuántos
-- precios cambiaron. security definer: carga_precios no tiene permisos sobre
-- la tabla, y la autoría corre con los del dueño.
create function public.guardar_precios(p_precios jsonb) returns integer
language sql
security definer
set search_path = ''
as $$
  with guardados as (
    insert into public.precio as p (instrumento_id, fecha, valor, cada, moneda, fuente)
    select (e ->> 'instrumento_id')::uuid,
           (e ->> 'fecha')::date,
           (e ->> 'valor')::numeric,
           (e ->> 'cada')::integer,
           (e ->> 'moneda')::public.moneda,
           e ->> 'fuente'
    from jsonb_array_elements(p_precios) as e
    on conflict (instrumento_id, fecha) do update
      set valor = excluded.valor, cada = excluded.cada, moneda = excluded.moneda,
          fuente = excluded.fuente, capturado_en = now()
      where (p.valor, p.cada, p.moneda, p.fuente)
        is distinct from (excluded.valor, excluded.cada, excluded.moneda, excluded.fuente)
    returning 1
  )
  select count(*)::integer from guardados
$$;

revoke execute on function public.guardar_precios(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_precios(jsonb) to carga_precios;
