-- T4. La posición suma su valor actual (C34): la cantidad por el último precio
-- conocido, dividido cada cuántas unidades lo publica la fuente (C35, C36).
-- Sin precio, el valor, su fecha y el rendimiento son null y nunca 0 (C37,
-- regla 5). Las columnas nuevas van al final, así la vista se reemplaza sin
-- tocar las que dependen de ella.
create or replace view public.posicion
with (security_invoker = true)
as
select
  p.cuenta_id,
  c.persona_id,
  p.instrumento_id,
  p.moneda,
  (p.estado).cantidad as cantidad,
  (p.estado).costo as costo,
  u.fecha as fecha_valor,
  (p.estado).cantidad * u.valor / u.cada as valor,
  (p.estado).cantidad * u.valor / u.cada - (p.estado).costo as rendimiento,
  -- Como fracción del costo: 0,125 es 12,5 %.
  ((p.estado).cantidad * u.valor / u.cada - (p.estado).costo) / nullif((p.estado).costo, 0) as rendimiento_pct,
  -- Un FCI sin código CAFCI no puede tener precio (C39).
  (i.tipo = 'FCI' and not exists (select 1 from public.instrumento_fci f where f.instrumento_id = i.id))
    as sin_codigo_cafci
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
join public.instrumento i on i.id = p.instrumento_id
left join lateral (
  select pr.fecha, pr.valor, pr.cada
  from public.precio pr
  where pr.instrumento_id = p.instrumento_id
  order by pr.fecha desc
  limit 1
) u on true
where (p.estado).cantidad > 0;
