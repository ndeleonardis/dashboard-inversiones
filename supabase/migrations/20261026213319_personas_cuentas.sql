-- T4. Personas, tipos de cuenta y cuentas.
-- Las restricciones llevan nombre en español porque la app traduce cada
-- una a un mensaje para la pantalla. Las claves foráneas usan "no action" y
-- no "restrict", porque Postgres 18 (la base de prueba) da otro código de
-- error para "restrict" (23001), y "no action" da 23503 en todas las
-- versiones. Para nosotros las dos impiden borrar igual.

-- Pesos y dólares. Nunca se suman entre sí (regla 2).
create type public.moneda as enum ('ARS', 'USD');

-- Integrante del grupo. Si tiene email, puede entrar a la app: el email es su
-- invitación y lo carga quien administra la copia.
create table public.persona (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text,
  constraint persona_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint persona_email_en_minusculas check (email = lower(trim(email))),
  constraint persona_email_unico unique (email)
);

-- El email se compara siempre en minúsculas, así que se guarda así.
create function public.normalizar_email() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;

create trigger persona_normalizar_email
  before insert or update of email on public.persona
  for each row execute function public.normalizar_email();

create table public.tipo_cuenta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  constraint tipo_cuenta_nombre_no_vacio check (length(trim(nombre)) > 0)
);

create unique index tipo_cuenta_nombre_unico on public.tipo_cuenta (lower(nombre));

insert into public.tipo_cuenta (nombre) values
  ('Banco'),
  ('Comitente nacional'),
  ('Comitente del exterior'),
  ('Billetera');

-- Cuenta bancaria o comitente. Tiene un solo dueño (regla 4).
create table public.cuenta (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null,
  tipo_cuenta_id uuid not null,
  entidad text not null,
  nombre text,
  constraint cuenta_persona_fk foreign key (persona_id) references public.persona (id) on delete no action,
  constraint cuenta_tipo_cuenta_fk foreign key (tipo_cuenta_id) references public.tipo_cuenta (id) on delete no action,
  constraint cuenta_entidad_no_vacia check (length(trim(entidad)) > 0),
  constraint cuenta_nombre_no_vacio check (nombre is null or length(trim(nombre)) > 0)
);

create index cuenta_persona_idx on public.cuenta (persona_id);
