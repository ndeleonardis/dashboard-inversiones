-- T7. Posición con costo promedio. La posición no se guarda: se calcula de
-- las operaciones cada vez, así nunca deja de coincidir con ellas.

-- Lo que se lleva mientras se recorren las operaciones en orden.
create type public.estado_costo as (cantidad numeric, costo numeric);

-- Un paso del costo promedio (C12). La compra suma su monto más su comisión.
-- La venta descuenta la cantidad vendida al promedio vigente, sin cambiarlo.
-- El método vive solo en esta función: cambiarlo es cambiar esta función.
create function public.paso_costo_promedio(
  p_estado public.estado_costo,
  p_tipo text,
  p_cantidad numeric,
  p_precio_unitario numeric,
  p_comision numeric,
  p_precio_cada integer
) returns public.estado_costo
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_cantidad numeric;
  v_costo numeric;
begin
  if p_tipo = 'COMPRA' then
    v_cantidad := p_estado.cantidad + p_cantidad;
    v_costo := p_estado.costo + p_cantidad * p_precio_unitario / p_precio_cada + p_comision;
  elsif p_tipo = 'VENTA' then
    v_cantidad := p_estado.cantidad - p_cantidad;
    v_costo := p_estado.costo - p_cantidad * (p_estado.costo / p_estado.cantidad);
  else
    raise exception using
      errcode = 'LH002',
      message = format('El tipo de operación %s todavía no tiene regla para calcular la posición', p_tipo);
  end if;

  -- Si se vendió todo, el costo es cero exacto: sin restos de redondeo que
  -- pasen a la próxima compra.
  if v_cantidad = 0 then
    v_costo := 0;
  end if;

  return row(v_cantidad, v_costo)::public.estado_costo;
end;
$$;

create aggregate public.costo_promedio(text, numeric, numeric, numeric, integer) (
  sfunc = public.paso_costo_promedio,
  stype = public.estado_costo,
  initcond = '(0,0)'
);

-- Lo que se tiene hoy de cada instrumento en cada cuenta, a costo de compra.
-- security_invoker: la vista respeta los permisos y el RLS de quien consulta.
create view public.posicion
with (security_invoker = true)
as
select
  p.cuenta_id,
  c.persona_id,
  p.instrumento_id,
  p.moneda,
  (p.estado).cantidad as cantidad,
  (p.estado).costo as costo
from (
  select
    o.cuenta_id,
    o.instrumento_id,
    o.moneda,
    public.costo_promedio(o.tipo, o.cantidad, o.precio_unitario, o.comision, ti.precio_cada order by o.fecha, o.orden)
      as estado
  from public.operacion o
  join public.instrumento i on i.id = o.instrumento_id
  join public.tipo_instrumento ti on ti.codigo = i.tipo
  group by o.cuenta_id, o.instrumento_id, o.moneda
) p
join public.cuenta c on c.id = p.cuenta_id
where (p.estado).cantidad > 0;
