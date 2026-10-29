-- T24. Datos propios de cada tipo de instrumento (C10): el código CAFCI del
-- FCI, el ratio y el subyacente del CEDEAR, y el emisor y el valor nominal
-- residual de la ON. Son opcionales. Cada tipo tiene su tabla de detalle, 1 a 1
-- con instrumento, y su clave foránea lleva el tipo: un detalle de otro tipo
-- no se puede guardar.

-- Permite que cada detalle exija el tipo de su instrumento.
alter table public.instrumento add constraint instrumento_id_tipo_unico unique (id, tipo);

create table public.instrumento_fci (
  instrumento_id uuid primary key,
  tipo text not null default 'FCI',
  -- La clave para pedirle el valor de la cuotaparte a la CAFCI en la v2.
  codigo_cafci text not null,
  -- Borrar el instrumento borra su detalle. Cambiarle el tipo sin sacar el
  -- detalle se rechaza.
  constraint instrumento_fci_instrumento_fk foreign key (instrumento_id, tipo)
    references public.instrumento (id, tipo) on update no action on delete cascade,
  constraint instrumento_fci_tipo_fci check (tipo = 'FCI'),
  constraint instrumento_fci_codigo_cafci_no_vacio check (length(trim(codigo_cafci)) > 0)
);

create table public.instrumento_cedear (
  instrumento_id uuid primary key,
  tipo text not null default 'CEDEAR',
  -- Cuántos CEDEAR equivalen a una acción del subyacente.
  ratio numeric,
  subyacente text,
  constraint instrumento_cedear_instrumento_fk foreign key (instrumento_id, tipo)
    references public.instrumento (id, tipo) on update no action on delete cascade,
  constraint instrumento_cedear_tipo_cedear check (tipo = 'CEDEAR'),
  constraint instrumento_cedear_con_datos check (ratio is not null or subyacente is not null),
  constraint instrumento_cedear_ratio_positivo check (ratio > 0),
  constraint instrumento_cedear_ratio_decimales check (scale(ratio) <= 8),
  constraint instrumento_cedear_subyacente_no_vacio check (length(trim(subyacente)) > 0)
);

create table public.instrumento_on (
  instrumento_id uuid primary key,
  tipo text not null default 'ON',
  emisor text,
  -- Lo que queda del valor nominal después de las amortizaciones, en
  -- porcentaje: 100 si todavía no amortizó.
  valor_nominal_residual numeric,
  constraint instrumento_on_instrumento_fk foreign key (instrumento_id, tipo)
    references public.instrumento (id, tipo) on update no action on delete cascade,
  constraint instrumento_on_tipo_on check (tipo = 'ON'),
  constraint instrumento_on_con_datos check (emisor is not null or valor_nominal_residual is not null),
  constraint instrumento_on_emisor_no_vacio check (length(trim(emisor)) > 0),
  constraint instrumento_on_valor_residual_valido check (valor_nominal_residual > 0 and valor_nominal_residual <= 100),
  constraint instrumento_on_valor_residual_decimales check (scale(valor_nominal_residual) <= 8)
);

select public.agregar_autoria(tabla)
from unnest(array['public.instrumento_fci', 'public.instrumento_cedear', 'public.instrumento_on']::regclass[]) as tabla;

-- Guarda un instrumento y su detalle en una sola transacción: si el detalle
-- falla, el instrumento no queda a medias. Sin p_id es uno nuevo. Corre con
-- los permisos y el RLS de quien la llama.
create function public.guardar_instrumento(
  p_tipo text,
  p_ticker text,
  p_nombre text,
  p_moneda public.moneda,
  p_id uuid default null,
  p_vencimiento date default null,
  p_codigo_cafci text default null,
  p_ratio numeric default null,
  p_subyacente text default null,
  p_emisor text default null,
  p_valor_nominal_residual numeric default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.instrumento (tipo, ticker, nombre, moneda, vencimiento)
    values (p_tipo, p_ticker, p_nombre, p_moneda, p_vencimiento)
    returning id into v_id;
  else
    -- Primero sale el detalle que se quedó sin datos. Si el tipo cambió, el
    -- detalle viejo ya no corresponde y frenaría el cambio.
    delete from public.instrumento_fci where instrumento_id = p_id and p_codigo_cafci is null;
    delete from public.instrumento_cedear where instrumento_id = p_id and p_ratio is null and p_subyacente is null;
    delete from public.instrumento_on
    where instrumento_id = p_id and p_emisor is null and p_valor_nominal_residual is null;

    update public.instrumento
    set tipo = p_tipo, ticker = p_ticker, nombre = p_nombre, moneda = p_moneda, vencimiento = p_vencimiento
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception using errcode = 'LH004', message = 'No se encontró. Puede que alguien lo haya borrado';
    end if;
  end if;

  -- El detalle con datos se guarda. Si no es del tipo del instrumento, su
  -- clave foránea lo rechaza y no se guarda nada. Sin cambios, la autoría no
  -- se toca.
  if p_codigo_cafci is not null then
    insert into public.instrumento_fci as d (instrumento_id, codigo_cafci)
    values (v_id, p_codigo_cafci)
    on conflict (instrumento_id) do update set codigo_cafci = excluded.codigo_cafci
    where d.codigo_cafci is distinct from excluded.codigo_cafci;
  end if;

  if p_ratio is not null or p_subyacente is not null then
    insert into public.instrumento_cedear as d (instrumento_id, ratio, subyacente)
    values (v_id, p_ratio, p_subyacente)
    on conflict (instrumento_id) do update set ratio = excluded.ratio, subyacente = excluded.subyacente
    where (d.ratio, d.subyacente) is distinct from (excluded.ratio, excluded.subyacente);
  end if;

  if p_emisor is not null or p_valor_nominal_residual is not null then
    insert into public.instrumento_on as d (instrumento_id, emisor, valor_nominal_residual)
    values (v_id, p_emisor, p_valor_nominal_residual)
    on conflict (instrumento_id) do update
      set emisor = excluded.emisor, valor_nominal_residual = excluded.valor_nominal_residual
    where (d.emisor, d.valor_nominal_residual) is distinct from (excluded.emisor, excluded.valor_nominal_residual);
  end if;

  return v_id;
end;
$$;

grant execute on function public.guardar_instrumento(text, text, text, public.moneda, uuid, date, text, numeric, text, text, numeric)
  to authenticated;

grant select, insert, update, delete
  on public.instrumento_fci, public.instrumento_cedear, public.instrumento_on
  to authenticated;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array['instrumento_fci', 'instrumento_cedear', 'instrumento_on'] loop
    execute format('alter table public.%I enable row level security', v_tabla);
    execute format(
      'create policy solo_miembros on public.%I for all to authenticated
         using ((select public.es_miembro())) with check ((select public.es_miembro()))',
      v_tabla
    );
  end loop;
end;
$$;
