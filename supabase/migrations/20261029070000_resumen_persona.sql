-- T27. El mes de una persona (C25) y los últimos movimientos (C26).

-- resumen_mes suma una persona opcional y separa los gastos en asignados a
-- alguien y comunitarios. Cambian las columnas que devuelve, así que se borra
-- y se vuelve a crear.
-- - Sin persona es el mes del grupo: todos los ingresos y todos los gastos.
-- - Con una persona: sus ingresos, los gastos asignados a ella y los
--   comunitarios del grupo. La app no divide los gastos comunitarios, así que
--   cuentan enteros en lo que le queda a cada persona.
-- Siempre una fila por moneda: pesos y dólares nunca se suman (regla 2).
drop function public.resumen_mes(date);

create function public.resumen_mes(p_mes date, p_persona uuid default null)
returns table (
  moneda public.moneda,
  ingresos numeric,
  gastos_asignados numeric,
  gastos_comunitarios numeric,
  gastos numeric,
  queda numeric
)
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
      and (p_persona is null or i.persona_id = p_persona)
    group by i.moneda
  ),
  gastos as (
    select g.moneda,
           coalesce(sum(g.monto) filter (where g.persona_id is not null), 0) as asignados,
           coalesce(sum(g.monto) filter (where g.persona_id is null), 0) as comunitarios
    from public.gasto g, limites l
    where g.fecha >= l.desde and g.fecha < l.hasta
      and (p_persona is null or g.persona_id = p_persona or g.persona_id is null)
    group by g.moneda
  )
  select m.moneda,
         coalesce(i.total, 0),
         coalesce(g.asignados, 0),
         coalesce(g.comunitarios, 0),
         coalesce(g.asignados, 0) + coalesce(g.comunitarios, 0),
         coalesce(i.total, 0) - coalesce(g.asignados, 0) - coalesce(g.comunitarios, 0)
  from unnest(enum_range(null::public.moneda)) as m(moneda)
  left join ingresos i on i.moneda = m.moneda
  left join gastos g on g.moneda = m.moneda
  where (select public.es_miembro())
  order by m.moneda
$$;

revoke execute on function public.resumen_mes(date, uuid) from public, anon;
grant execute on function public.resumen_mes(date, uuid) to authenticated;

-- Los últimos 10 gastos e ingresos, del más nuevo al más viejo (C26). Sin
-- nulos, como las demás vistas: la persona y la descripción vienen vacías
-- cuando no hay. Un gasto sin persona es comunitario.
create view public.ultimos_movimientos
with (security_invoker = true)
as
select *
from (
  select g.id, 'gasto' as clase, g.fecha, g.monto, g.moneda, t.nombre as categoria,
         coalesce(p.nombre, '') as persona, coalesce(g.descripcion, '') as descripcion, g.creado_en
  from public.gasto g
  join public.tipo_gasto t on t.id = g.tipo_gasto_id
  left join public.persona p on p.id = g.persona_id
  union all
  select i.id, 'ingreso', i.fecha, i.monto, i.moneda, t.nombre,
         p.nombre, coalesce(i.descripcion, ''), i.creado_en
  from public.ingreso i
  join public.tipo_ingreso t on t.id = i.tipo_ingreso_id
  join public.persona p on p.id = i.persona_id
) movimientos
order by fecha desc, creado_en desc
limit 10;

grant select on public.ultimos_movimientos to authenticated;
