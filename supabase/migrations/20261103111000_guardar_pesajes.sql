-- Pesaje T2. La carga de todos juntos (C50): una fecha y el peso de cada uno.
-- Se guarda entera o no se guarda, así un error en un renglón no deja la
-- carga a medias. security invoker: pasa por el RLS y la autoría de pesaje
-- igual que un insert de la app.
create function public.guardar_pesajes(p_fecha date, p_pesos jsonb) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_guardados integer;
begin
  if p_pesos is null or jsonb_typeof(p_pesos) <> 'array' or jsonb_array_length(p_pesos) = 0 then
    raise exception using errcode = 'LH007', message = 'Cargá al menos un peso';
  end if;

  insert into public.pesaje (pesaje_integrante_id, fecha, peso, observaciones)
  select r.pesaje_integrante_id, p_fecha, r.peso, nullif(trim(r.observaciones), '')
  from jsonb_to_recordset(p_pesos) as r(pesaje_integrante_id uuid, peso numeric, observaciones text);

  get diagnostics v_guardados = row_count;
  return v_guardados;
end;
$$;

grant execute on function public.guardar_pesajes(date, jsonb) to authenticated;
