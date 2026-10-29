-- Revisión de la v1. El tipo de un instrumento con operaciones no se cambia,
-- igual que su moneda. El costo de cada operación depende de cada cuánto
-- cotiza el tipo, y pasar de o a ON lo dividiría o multiplicaría por 100 sin
-- avisar. Para corregir el tipo hay que borrar las operaciones o crear otro
-- instrumento.

create function public.tipo_sin_operaciones() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo is distinct from old.tipo
     and exists (select 1 from public.operacion where instrumento_id = old.id) then
    raise exception using
      errcode = 'LH005',
      message = 'No se puede cambiar el tipo: el instrumento tiene operaciones cargadas';
  end if;
  return new;
end;
$$;

create trigger instrumento_tipo_sin_operaciones
before update of tipo on public.instrumento
for each row execute function public.tipo_sin_operaciones();
