-- Datos ficticios para el proyecto de desarrollo (T13). Nunca se cargan en la
-- copia real. Las fechas son relativas al día en que se cargan, así el mes
-- actual siempre tiene movimientos para probar el resumen.

insert into public.persona (nombre, email) values
  ('Ana Ejemplo', 'ana@example.com'),
  ('Beto Ejemplo', 'beto@example.com'),
  ('Caro Ejemplo', null);

insert into public.cuenta (persona_id, tipo_cuenta_id, entidad, nombre)
select p.id, t.id, c.entidad, c.nombre
from (values
  ('Ana Ejemplo', 'Banco', 'Banco Ejemplo', 'Caja de ahorro'),
  ('Ana Ejemplo', 'Comitente nacional', 'Broker Ejemplo', null),
  ('Beto Ejemplo', 'Comitente del exterior', 'Broker del Exterior Ejemplo', null),
  ('Beto Ejemplo', 'Billetera', 'Billetera Ejemplo', null)
) as c (persona, tipo, entidad, nombre)
join public.persona p on p.nombre = c.persona
join public.tipo_cuenta t on t.nombre = c.tipo;

insert into public.instrumento (tipo, ticker, nombre, moneda, vencimiento) values
  ('CEDEAR', 'EJM', 'Empresa Ejemplo', 'ARS', null),
  ('CEDEAR', 'EJMD', 'Empresa Ejemplo', 'USD', null),
  ('ACCION', 'DEMO', 'Demo S.A.', 'ARS', null),
  ('ETF', 'ETFEJ', 'ETF Ejemplo', 'USD', null),
  ('ON', 'ONEJD', 'ON Ejemplo 2028', 'USD', current_date + 900),
  ('FCI', 'FCIEJ', 'FCI Ejemplo Ahorro', 'ARS', null),
  ('CRIPTO', 'CRIPEJ', 'Cripto Ejemplo', 'USD', null);

-- "dias" cuenta desde el primer día del mes actual. Las compras van antes que
-- las ventas, así ninguna venta queda sin respaldo.
insert into public.operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda, comision)
select c.id, i.id, o.tipo, (date_trunc('month', current_date) + o.dias * interval '1 day')::date,
       o.cantidad, o.precio, i.moneda, o.comision
from (values
  ('Broker Ejemplo', 'EJM', 'ARS', 'COMPRA', -80, 10, 15000, 120),
  ('Broker Ejemplo', 'EJM', 'ARS', 'COMPRA', -50, 10, 18000, 150),
  ('Broker Ejemplo', 'EJM', 'ARS', 'VENTA', -20, 5, 21000, 90),
  ('Broker Ejemplo', 'DEMO', 'ARS', 'COMPRA', -40, 100, 1200, 0),
  ('Broker Ejemplo', 'FCIEJ', 'ARS', 'COMPRA', -30, 5000, 12.5, 0),
  ('Broker Ejemplo', 'EJMD', 'USD', 'COMPRA', -60, 20, 15, 1),
  ('Broker del Exterior Ejemplo', 'ETFEJ', 'USD', 'COMPRA', -70, 3, 520, 0),
  ('Broker del Exterior Ejemplo', 'ONEJD', 'USD', 'COMPRA', -45, 1000, 98.5, 2),
  ('Billetera Ejemplo', 'CRIPEJ', 'USD', 'COMPRA', -25, 0.05, 60000, 0)
) as o (entidad, ticker, moneda, tipo, dias, cantidad, precio, comision)
join public.cuenta c on c.entidad = o.entidad
join public.instrumento i on i.ticker = o.ticker and i.moneda = o.moneda::public.moneda;

insert into public.gasto (tipo_gasto_id, persona_id, fecha, monto, moneda, descripcion)
select t.id, p.id, (date_trunc('month', current_date) + g.dia * interval '1 day')::date,
       g.monto, g.moneda::public.moneda, g.descripcion
from (values
  ('Súper', null, 0, 85000.50, 'ARS', 'Compra del mes'),
  ('Luz', null, 1, 32000, 'ARS', null),
  ('Nafta', 'Ana Ejemplo', 2, 45000, 'ARS', null),
  ('Otros', 'Beto Ejemplo', 1, 120, 'USD', 'Suscripción'),
  ('Colegio', null, -20, 250000, 'ARS', null),
  ('Otros', null, -15, 80, 'USD', null)
) as g (categoria, persona, dia, monto, moneda, descripcion)
join public.tipo_gasto t on t.nombre = g.categoria
left join public.persona p on p.nombre = g.persona;

insert into public.ingreso (tipo_ingreso_id, persona_id, cuenta_id, fecha, monto, moneda)
select t.id, p.id, c.id, (date_trunc('month', current_date) + i.dia * interval '1 day')::date,
       i.monto, i.moneda::public.moneda
from (values
  ('Sueldo', 'Ana Ejemplo', 'Banco Ejemplo', 0, 1500000, 'ARS'),
  ('Sueldo', 'Beto Ejemplo', null, 0, 3000, 'USD'),
  ('Otros', 'Beto Ejemplo', null, 3, 200000, 'ARS'),
  ('Sueldo', 'Ana Ejemplo', 'Banco Ejemplo', -30, 1450000, 'ARS')
) as i (categoria, persona, entidad, dia, monto, moneda)
join public.tipo_ingreso t on t.nombre = i.categoria
join public.persona p on p.nombre = i.persona
left join public.cuenta c on c.entidad = i.entidad;
