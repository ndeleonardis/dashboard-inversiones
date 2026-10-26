-- T8. Categorías, gastos e ingresos.

-- Las categorías son datos de cada grupo. Vienen estas para arrancar (C18).
create table public.tipo_gasto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  constraint tipo_gasto_nombre_no_vacio check (length(trim(nombre)) > 0)
);

create unique index tipo_gasto_nombre_unico on public.tipo_gasto (lower(trim(nombre)));

insert into public.tipo_gasto (nombre) values
  ('Agua'),
  ('Luz'),
  ('Gas'),
  ('Expensas del barrio'),
  ('Colegio'),
  ('Súper'),
  ('Nafta'),
  ('Otros');

create table public.tipo_ingreso (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  constraint tipo_ingreso_nombre_no_vacio check (length(trim(nombre)) > 0)
);

create unique index tipo_ingreso_nombre_unico on public.tipo_ingreso (lower(trim(nombre)));

insert into public.tipo_ingreso (nombre) values
  ('Sueldo'),
  ('Otros');

-- Una salida de plata. Sin persona es comunitario (C16).
create table public.gasto (
  id uuid primary key default gen_random_uuid(),
  tipo_gasto_id uuid not null,
  persona_id uuid,
  fecha date not null,
  monto numeric not null,
  moneda public.moneda not null,
  descripcion text,
  constraint gasto_tipo_gasto_fk foreign key (tipo_gasto_id) references public.tipo_gasto (id) on delete no action,
  constraint gasto_persona_fk foreign key (persona_id) references public.persona (id) on delete no action,
  constraint gasto_monto_positivo check (monto > 0),
  -- Sin redondeo escondido: un decimal de más se rechaza.
  constraint gasto_monto_decimales check (scale(monto) <= 2)
);

create index gasto_fecha_idx on public.gasto (fecha);
create index gasto_persona_idx on public.gasto (persona_id);

-- Una entrada de plata de una persona. La cuenta donde se cobró es opcional (C17).
create table public.ingreso (
  id uuid primary key default gen_random_uuid(),
  tipo_ingreso_id uuid not null,
  persona_id uuid not null,
  cuenta_id uuid,
  fecha date not null,
  monto numeric not null,
  moneda public.moneda not null,
  descripcion text,
  constraint ingreso_tipo_ingreso_fk foreign key (tipo_ingreso_id) references public.tipo_ingreso (id) on delete no action,
  constraint ingreso_persona_fk foreign key (persona_id) references public.persona (id) on delete no action,
  constraint ingreso_cuenta_fk foreign key (cuenta_id) references public.cuenta (id) on delete no action,
  constraint ingreso_monto_positivo check (monto > 0),
  constraint ingreso_monto_decimales check (scale(monto) <= 2)
);

create index ingreso_fecha_idx on public.ingreso (fecha);
create index ingreso_persona_idx on public.ingreso (persona_id);
create index ingreso_cuenta_idx on public.ingreso (cuenta_id);
