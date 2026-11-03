-- T5. Lo invertido por persona y del grupo suma su valor actual (C40). El valor
-- es la suma de lo que tiene precio, y instrumentos_sin_precio dice cuántos
-- faltan, sin repetir un instrumento que está en dos cuentas (C41). Si falta
-- alguno no hay rendimiento, porque compararía el costo de todo contra el
-- valor de una parte (C42). Sin posiciones en una moneda, el valor es 0: no
-- hay nada invertido. Con posiciones y ninguna con precio, es null (regla 5).
-- Las columnas nuevas van al final, así las vistas se reemplazan.

create or replace view public.invertido_por_persona
with (security_invoker = true)
as
select
  p.id as persona_id,
  p.nombre,
  m.moneda,
  coalesce(sum(pos.costo), 0) as costo,
  exists (select 1 from public.posicion x where x.persona_id = p.id) as tiene_inversiones,
  case when count(pos.instrumento_id) = 0 then 0 else sum(pos.valor) end as valor,
  count(distinct pos.instrumento_id) filter (where pos.valor is null) as instrumentos_sin_precio,
  case when count(pos.instrumento_id) > 0 and count(pos.valor) = count(pos.instrumento_id)
    then sum(pos.valor) - sum(pos.costo) end as rendimiento,
  case when count(pos.instrumento_id) > 0 and count(pos.valor) = count(pos.instrumento_id)
    then (sum(pos.valor) - sum(pos.costo)) / nullif(sum(pos.costo), 0) end as rendimiento_pct
from public.persona p
cross join unnest(enum_range(null::public.moneda)) as m(moneda)
left join public.posicion pos on pos.persona_id = p.id and pos.moneda = m.moneda
group by p.id, p.nombre, m.moneda;

create or replace view public.invertido_grupo
with (security_invoker = true)
as
select
  m.moneda,
  coalesce(sum(pos.costo), 0) as costo,
  case when count(pos.instrumento_id) = 0 then 0 else sum(pos.valor) end as valor,
  count(distinct pos.instrumento_id) filter (where pos.valor is null) as instrumentos_sin_precio,
  case when count(pos.instrumento_id) > 0 and count(pos.valor) = count(pos.instrumento_id)
    then sum(pos.valor) - sum(pos.costo) end as rendimiento,
  case when count(pos.instrumento_id) > 0 and count(pos.valor) = count(pos.instrumento_id)
    then (sum(pos.valor) - sum(pos.costo)) / nullif(sum(pos.costo), 0) end as rendimiento_pct
from unnest(enum_range(null::public.moneda)) as m(moneda)
left join public.posicion pos on pos.moneda = m.moneda
where (select public.es_miembro())
group by m.moneda;
