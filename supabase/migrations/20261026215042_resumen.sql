-- T12. Los dos bloques del resumen. Siempre una fila por moneda: pesos y
-- dólares nunca se suman entre sí (regla 2). Para alguien sin invitación no
-- devuelven nada, ni siquiera ceros.

-- El mes del grupo (C21, C22): ingresos, gastos y lo que queda para invertir.
-- p_mes puede ser cualquier día del mes.
create function public.resumen_mes(p_mes date)
returns table (moneda public.moneda, ingresos numeric, gastos numeric, queda numeric)
language sql
stable
set search_path = ''
as $$
  with limites as (
    select date_trunc('month', p_mes)::date as desde,
           (date_trunc('month', p_mes) + interval '1 month')::date as hasta
  ),
  ingresos as (
    select i.moneda, sum(i.monto) as total
    from public.ingreso i, limites l
    where i.fecha >= l.desde and i.fecha < l.hasta
    group by i.moneda
  ),
  gastos as (
    select g.moneda, sum(g.monto) as total
    from public.gasto g, limites l
    where g.fecha >= l.desde and g.fecha < l.hasta
    group by g.moneda
  )
  select m.moneda,
         coalesce(i.total, 0),
         coalesce(g.total, 0),
         coalesce(i.total, 0) - coalesce(g.total, 0)
  from unnest(enum_range(null::public.moneda)) as m(moneda)
  left join ingresos i on i.moneda = m.moneda
  left join gastos g on g.moneda = m.moneda
  where (select public.es_miembro())
  order by m.moneda
$$;

-- Lo invertido por cada persona a costo de compra (C23). Una persona sin
-- posiciones aparece igual, con tiene_inversiones en falso.
create view public.invertido_por_persona
with (security_invoker = true)
as
select
  p.id as persona_id,
  p.nombre,
  m.moneda,
  coalesce(sum(pos.costo), 0) as costo,
  exists (select 1 from public.posicion x where x.persona_id = p.id) as tiene_inversiones
from public.persona p
cross join unnest(enum_range(null::public.moneda)) as m(moneda)
left join public.posicion pos on pos.persona_id = p.id and pos.moneda = m.moneda
group by p.id, p.nombre, m.moneda;

-- Lo invertido por todo el grupo a costo de compra (C23).
create view public.invertido_grupo
with (security_invoker = true)
as
select m.moneda, coalesce(sum(pos.costo), 0) as costo
from unnest(enum_range(null::public.moneda)) as m(moneda)
left join public.posicion pos on pos.moneda = m.moneda
where (select public.es_miembro())
group by m.moneda;

grant execute on function public.resumen_mes(date) to authenticated;
grant select on public.invertido_por_persona, public.invertido_grupo to authenticated;
