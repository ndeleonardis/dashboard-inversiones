-- T3. Los precios se piden con el ticker, o con el código CAFCI de un FCI. Si
-- esa clave cambia, los precios guardados son de otro instrumento y se borran.
-- El proceso externo trae los del instrumento corregido en su próxima corrida.
-- security definer: quien edita el instrumento es un miembro, que no puede
-- borrar precios por su cuenta.

create function public.borrar_precios_del_instrumento() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.precio where instrumento_id = old.id;
  return new;
end;
$$;

-- before: borrar antes de que la clave foránea de precio frene el cambio de
-- moneda.
create trigger instrumento_borrar_precios
  before update of ticker, moneda on public.instrumento
  for each row
  when (old.ticker is distinct from new.ticker or old.moneda is distinct from new.moneda)
  execute function public.borrar_precios_del_instrumento();

create function public.borrar_precios_del_fci() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.precio where instrumento_id = old.instrumento_id;
  return null;
end;
$$;

create trigger instrumento_fci_borrar_precios_al_cambiar
  after update of codigo_cafci on public.instrumento_fci
  for each row
  when (old.codigo_cafci is distinct from new.codigo_cafci)
  execute function public.borrar_precios_del_fci();

create trigger instrumento_fci_borrar_precios_al_sacar
  after delete on public.instrumento_fci
  for each row
  execute function public.borrar_precios_del_fci();

revoke execute on function public.borrar_precios_del_instrumento(), public.borrar_precios_del_fci()
  from public, anon, authenticated;
