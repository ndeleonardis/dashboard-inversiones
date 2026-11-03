-- Pesaje T1. Quiénes se pesan y sus pesajes. Es un módulo opcional, aparte de
-- lo financiero: quienes se pesan no son personas del grupo (C45), así que no
-- aparecen en cuentas, gastos ni ingresos. Las tablas existen en todas las
-- copias, y la app solo las muestra si la copia prende Pesaje.

create table public.pesaje_integrante (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- La dirección en la que conviene que vaya el peso. Define el color de la
  -- variación (C62). Un check y no un enum, para poder sumar valores después.
  objetivo text not null default 'ninguno',
  -- Desactivado no aparece en la carga, pero sus pesajes quedan (C48).
  activo boolean not null default true,
  constraint pesaje_integrante_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint pesaje_integrante_objetivo_valido check (objetivo in ('bajar', 'subir', 'ninguno'))
);

create unique index pesaje_integrante_nombre_unico on public.pesaje_integrante (lower(trim(nombre)));

create table public.pesaje (
  id uuid primary key default gen_random_uuid(),
  pesaje_integrante_id uuid not null,
  fecha date not null,
  -- En kilogramos, con hasta dos decimales (C51). El tope frena un peso
  -- escrito en gramos por error.
  peso numeric not null,
  observaciones text,
  constraint pesaje_pesaje_integrante_fk foreign key (pesaje_integrante_id)
    references public.pesaje_integrante (id) on delete no action,
  constraint pesaje_peso_valido check (peso > 0 and peso <= 300),
  constraint pesaje_peso_decimales check (scale(peso) <= 2)
);

-- Un peso por integrante y fecha (C52).
create unique index pesaje_integrante_fecha_unico on public.pesaje (pesaje_integrante_id, fecha);

-- Sin fechas futuras (C53). La app compara con el hoy de quien carga. La base
-- corre en UTC, donde a la noche de Argentina ya es mañana, así que acá solo se
-- frena lo que pasa de mañana. Un check no sirve: tiene que ser inmutable.
create function public.validar_fecha_de_pesaje() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fecha > current_date + 1 then
    raise exception using
      errcode = 'LH006',
      message = 'La fecha del pesaje no puede ser posterior a hoy';
  end if;
  return new;
end;
$$;

create trigger pesaje_fecha_no_futura
  before insert or update on public.pesaje
  for each row execute function public.validar_fecha_de_pesaje();

select public.agregar_autoria(tabla)
from unnest(array['public.pesaje_integrante', 'public.pesaje']::regclass[]) as tabla;

grant select, insert, update, delete on public.pesaje_integrante, public.pesaje to authenticated;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array['pesaje_integrante', 'pesaje'] loop
    execute format('alter table public.%I enable row level security', v_tabla);
    execute format(
      'create policy solo_miembros on public.%I for all to authenticated
         using ((select public.es_miembro())) with check ((select public.es_miembro()))',
      v_tabla
    );
  end loop;
end;
$$;
