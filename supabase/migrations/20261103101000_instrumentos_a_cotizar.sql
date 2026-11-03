-- T2. Lo que el proceso externo necesita para traer precios: cada instrumento
-- con la clave para pedir su valor (el ticker, o el código CAFCI de un FCI).
-- Sin cantidades, cuentas ni personas: la base de mercado nunca se entera de
-- cuánto tiene nadie. security definer: carga_precios no puede leer
-- instrumento, y así ve solo estas columnas.
create function public.instrumentos_a_cotizar()
returns table (id uuid, tipo text, ticker text, moneda public.moneda, codigo_cafci text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.tipo, i.ticker, i.moneda, f.codigo_cafci
  from public.instrumento i
  left join public.instrumento_fci f on f.instrumento_id = i.id
  order by i.ticker, i.moneda
$$;

revoke execute on function public.instrumentos_a_cotizar() from public, anon, authenticated;
grant execute on function public.instrumentos_a_cotizar() to carga_precios;
