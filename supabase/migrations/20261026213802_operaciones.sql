-- T6. Tipos de operación y operaciones.

-- Cada tipo tiene un código fijo, porque la posición usa una regla por tipo:
-- la compra suma y la venta resta. Un tipo nuevo (renta, dividendo) se puede
-- cargar, pero sus operaciones se rechazan hasta que tenga su regla (C30).
create table public.tipo_operacion (
  codigo text primary key,
  nombre text not null,
  constraint tipo_operacion_codigo_valido check (codigo ~ '^[A-Z]+$'),
  constraint tipo_operacion_nombre_no_vacio check (length(trim(nombre)) > 0)
);

insert into public.tipo_operacion (codigo, nombre) values
  ('COMPRA', 'Compra'),
  ('VENTA', 'Venta');

-- Cada compra o venta. Siempre sale de una cuenta (regla 4).
create table public.operacion (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null,
  instrumento_id uuid not null,
  tipo text not null,
  fecha date not null,
  cantidad numeric not null,
  precio_unitario numeric not null,
  -- Es la del instrumento. Se guarda acá para que la operación no cambie de
  -- moneda si alguien edita el instrumento, y la base exige que coincidan.
  moneda public.moneda not null,
  comision numeric not null default 0,
  -- Orden de carga. Desempata las operaciones de un mismo día.
  orden bigint generated always as identity,
  constraint operacion_cuenta_fk foreign key (cuenta_id) references public.cuenta (id) on delete no action,
  constraint operacion_instrumento_fk foreign key (instrumento_id) references public.instrumento (id) on delete no action,
  constraint operacion_moneda_instrumento_fk foreign key (instrumento_id, moneda)
    references public.instrumento (id, moneda) on update no action on delete no action,
  constraint operacion_tipo_fk foreign key (tipo) references public.tipo_operacion (codigo) on delete no action,
  constraint operacion_cantidad_positiva check (cantidad > 0),
  constraint operacion_precio_positivo check (precio_unitario > 0),
  constraint operacion_comision_no_negativa check (comision >= 0),
  -- Sin redondeo escondido: un decimal de más se rechaza.
  constraint operacion_cantidad_decimales check (scale(cantidad) <= 8),
  constraint operacion_precio_decimales check (scale(precio_unitario) <= 8),
  constraint operacion_comision_decimales check (scale(comision) <= 2)
);

create index operacion_cuenta_instrumento_idx on public.operacion (cuenta_id, instrumento_id, fecha, orden);
create index operacion_instrumento_idx on public.operacion (instrumento_id);

-- Recorre las operaciones de una cuenta e instrumento en orden (fecha y orden
-- de carga) y rechaza si en algún momento se vende más de lo que hay.
create function public.validar_posicion(p_cuenta_id uuid, p_instrumento_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_tipo text;
  v_venta record;
begin
  -- Una validación a la vez por cuenta e instrumento, para que dos ventas
  -- cargadas al mismo tiempo no pasen las dos.
  perform pg_advisory_xact_lock(hashtextextended(p_cuenta_id::text || '/' || p_instrumento_id::text, 0));

  select o.tipo into v_tipo
  from public.operacion o
  where o.cuenta_id = p_cuenta_id
    and o.instrumento_id = p_instrumento_id
    and o.tipo not in ('COMPRA', 'VENTA')
  limit 1;

  if found then
    raise exception using
      errcode = 'LH002',
      message = format('El tipo de operación %s todavía no tiene regla para calcular la posición', v_tipo);
  end if;

  select s.id, s.fecha, s.cantidad, s.saldo + s.cantidad as disponible, i.ticker
  into v_venta
  from (
    select o.id, o.fecha, o.orden, o.cantidad, o.instrumento_id,
           sum(case o.tipo when 'COMPRA' then o.cantidad else -o.cantidad end)
             over (order by o.fecha, o.orden) as saldo
    from public.operacion o
    where o.cuenta_id = p_cuenta_id
      and o.instrumento_id = p_instrumento_id
  ) s
  join public.instrumento i on i.id = s.instrumento_id
  where s.saldo < 0
  order by s.fecha, s.orden
  limit 1;

  if found then
    raise exception using
      errcode = 'LH001',
      message = format(
        'La cuenta solo tiene %s %s al %s y la venta es de %s',
        trim_scale(v_venta.disponible), v_venta.ticker, to_char(v_venta.fecha, 'DD/MM/YYYY'), trim_scale(v_venta.cantidad)
      ),
      detail = json_build_object(
        'operacion_id', v_venta.id,
        'fecha', v_venta.fecha,
        'cantidad', v_venta.cantidad,
        'disponible', v_venta.disponible,
        'ticker', v_venta.ticker
      )::text;
  end if;
end;
$$;

create function public.operacion_validar_posicion() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.validar_posicion(new.cuenta_id, new.instrumento_id);
  end if;
  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and (old.cuenta_id, old.instrumento_id) is distinct from (new.cuenta_id, new.instrumento_id)) then
    perform public.validar_posicion(old.cuenta_id, old.instrumento_id);
  end if;
  return null;
end;
$$;

create trigger operacion_validar_posicion
  after insert or update or delete on public.operacion
  for each row execute function public.operacion_validar_posicion();
