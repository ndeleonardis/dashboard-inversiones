-- T5. Tipos de instrumento e instrumentos.

-- Cada tipo tiene un código fijo, porque las reglas lo usan: la ON pide
-- vencimiento. precio_cada dice cada cuántas unidades se cotiza. La ON cotiza
-- cada 100 de valor nominal y el resto por unidad.
create table public.tipo_instrumento (
  codigo text primary key,
  nombre text not null,
  precio_cada integer not null default 1,
  constraint tipo_instrumento_codigo_valido check (codigo ~ '^[A-Z]+$'),
  constraint tipo_instrumento_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint tipo_instrumento_precio_cada_positivo check (precio_cada > 0)
);

insert into public.tipo_instrumento (codigo, nombre, precio_cada) values
  ('ACCION', 'Acción', 1),
  ('CEDEAR', 'CEDEAR', 1),
  ('ON', 'ON', 100),
  ('ETF', 'ETF', 1),
  ('FCI', 'FCI', 1),
  ('CRIPTO', 'Cripto', 1);

-- La especie exacta que se opera. El ticker define la moneda: AAPL en pesos y
-- AAPLD en dólares son dos instrumentos.
create table public.instrumento (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  ticker text not null,
  nombre text not null,
  moneda public.moneda not null,
  vencimiento date,
  constraint instrumento_tipo_fk foreign key (tipo) references public.tipo_instrumento (codigo) on delete no action,
  constraint instrumento_ticker_valido check (ticker = upper(trim(ticker)) and length(ticker) > 0),
  constraint instrumento_nombre_no_vacio check (length(trim(nombre)) > 0),
  -- Al vencer, una ON deja de cotizar. Sin la fecha, su último precio quedaría
  -- congelado como si siguiera vigente.
  constraint instrumento_on_con_vencimiento check (tipo <> 'ON' or vencimiento is not null),
  constraint instrumento_vencimiento_solo_on check (tipo = 'ON' or vencimiento is null),
  constraint instrumento_ticker_moneda_unico unique (ticker, moneda),
  -- Permite que la operación exija la moneda de su instrumento (T6).
  constraint instrumento_id_moneda_unico unique (id, moneda)
);

create function public.normalizar_ticker() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ticker := upper(trim(new.ticker));
  return new;
end;
$$;

create trigger instrumento_normalizar_ticker
  before insert or update of ticker on public.instrumento
  for each row execute function public.normalizar_ticker();
