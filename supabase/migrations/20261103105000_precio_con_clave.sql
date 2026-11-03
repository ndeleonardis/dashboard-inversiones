-- Revisión de código del cambio valor-actual. Entre que el proceso pide la
-- lista de instrumentos y guarda los precios, alguien puede borrar un
-- instrumento o cambiarle el ticker, el código CAFCI o la moneda. Un precio
-- pedido con la clave vieja es de otro instrumento, y antes se guardaba igual
-- o hacía fallar toda la corrida.

-- La lista suma la clave con que se pide cada precio: el código CAFCI de un
-- FCI y el ticker del resto. Un FCI sin código no tiene clave. El proceso la
-- devuelve con cada precio, así no tiene que conocer la regla. Cambian las
-- columnas que devuelve, así que se borra y se vuelve a crear.
drop function public.instrumentos_a_cotizar();

create function public.instrumentos_a_cotizar()
returns table (id uuid, tipo text, ticker text, moneda public.moneda, codigo_cafci text, clave text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.tipo, i.ticker, i.moneda, f.codigo_cafci,
         case when i.tipo = 'FCI' then f.codigo_cafci else i.ticker end
  from public.instrumento i
  left join public.instrumento_fci f on f.instrumento_id = i.id
  order by i.ticker, i.moneda
$$;

revoke execute on function public.instrumentos_a_cotizar() from public, anon, authenticated;
grant execute on function public.instrumentos_a_cotizar() to carga_precios;

-- guardar_precios ahora:
-- - Rechaza la corrida entera si un precio tiene fecha posterior a hoy. Un
--   año mal escrito taparía todos los precios correctos hasta esa fecha.
-- - Si un instrumento y una fecha vienen dos veces, se queda con el último.
-- - Saltea el precio de un instrumento que ya no existe, o cuya clave o moneda
--   ya no son las que se usaron para pedirlo. Los demás se guardan.
-- - Bloquea los instrumentos que valida hasta terminar, así nadie los cambia
--   entre la validación y el guardado.
-- Un valor inválido sigue rechazando la corrida entera, para que se note.
-- Devuelve cuántos precios cambiaron y cuántos se saltearon.
drop function public.guardar_precios(jsonb);

create function public.guardar_precios(p_precios jsonb)
returns table (guardados integer, salteados integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_futuro record;
begin
  select e ->> 'instrumento_id' as instrumento_id, e ->> 'fecha' as fecha into v_futuro
  from jsonb_array_elements(p_precios) as e
  where (e ->> 'fecha')::date > current_date
  limit 1;
  if found then
    raise exception using
      errcode = 'LH005',
      message = format('El precio del instrumento %s tiene fecha %s, posterior a hoy', v_futuro.instrumento_id, v_futuro.fecha);
  end if;

  return query
  with recibidos as (
    select (e ->> 'instrumento_id')::uuid as instrumento_id,
           (e ->> 'fecha')::date as fecha,
           (e ->> 'valor')::numeric as valor,
           (e ->> 'cada')::integer as cada,
           (e ->> 'moneda')::public.moneda as moneda,
           e ->> 'fuente' as fuente,
           e ->> 'clave' as clave,
           orden
    from jsonb_array_elements(p_precios) with ordinality as x (e, orden)
  ),
  unicos as (
    select distinct on (r.instrumento_id, r.fecha) r.*
    from recibidos r
    order by r.instrumento_id, r.fecha, r.orden desc
  ),
  vigentes as (
    select u.instrumento_id, u.fecha, u.valor, u.cada, u.moneda, u.fuente
    from unicos u
    join public.instrumento i on i.id = u.instrumento_id and i.moneda = u.moneda
    left join public.instrumento_fci f on f.instrumento_id = i.id
    where u.clave = case when i.tipo = 'FCI' then f.codigo_cafci else i.ticker end
    for share of i
  ),
  cambiados as (
    insert into public.precio as p (instrumento_id, fecha, valor, cada, moneda, fuente)
    select v.instrumento_id, v.fecha, v.valor, v.cada, v.moneda, v.fuente from vigentes v
    on conflict (instrumento_id, fecha) do update
      set valor = excluded.valor, cada = excluded.cada, moneda = excluded.moneda,
          fuente = excluded.fuente, capturado_en = now()
      where (p.valor, p.cada, p.moneda, p.fuente)
        is distinct from (excluded.valor, excluded.cada, excluded.moneda, excluded.fuente)
    returning 1
  )
  select (select count(*) from cambiados)::integer,
         ((select count(*) from unicos) - (select count(*) from vigentes))::integer;
end;
$$;

revoke execute on function public.guardar_precios(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_precios(jsonb) to carga_precios;
