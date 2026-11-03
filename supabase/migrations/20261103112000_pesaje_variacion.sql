-- Pesaje T3. Cada pesaje con lo que necesita la tabla: el nombre, el objetivo
-- y si está activo, tal como están hoy en la lista (C47, C48, C62), y la
-- variación contra el pesaje anterior del mismo integrante (C56). La variación
-- se calcula por integrante, así que filtrar por alguien no la cambia (C57). El
-- primer pesaje no tiene anterior: su variación es null.
-- security_invoker: la vista respeta los permisos y el RLS de quien consulta.
create view public.pesaje_con_variacion
with (security_invoker = true)
as
select
  p.id,
  p.pesaje_integrante_id,
  i.nombre,
  i.objetivo,
  i.activo,
  p.fecha,
  p.peso,
  p.observaciones,
  -- trim_scale: 58,5 menos 57,5 da 1 y no 1,0.
  trim_scale(p.peso - lag(p.peso) over (partition by p.pesaje_integrante_id order by p.fecha)) as variacion
from public.pesaje p
join public.pesaje_integrante i on i.id = p.pesaje_integrante_id;

grant select on public.pesaje_con_variacion to authenticated;
