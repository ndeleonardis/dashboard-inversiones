-- Revisión de la v1. Los últimos movimientos son los últimos que se cargaron
-- (C26), no los de fecha más reciente. Así un gasto de otro mes cargado hoy
-- aparece arriba, y se puede revisar lo que cargó la otra persona. A igual
-- momento de carga, el de fecha más reciente.
create or replace view public.ultimos_movimientos
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
order by creado_en desc, fecha desc
limit 10;
