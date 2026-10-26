# Spec de LemonHouse v1

> Producto nuevo. Fecha 2026-10-26. Contexto permanente en `PRD.md`, modelo de datos propuesto en `docs/modelo-de-datos.md`. Esta spec dice qué hace la v1, no cómo se construye.

## 1. Overview

La v1 de LemonHouse permite entrar con usuario y registrar en un solo lugar las personas del grupo, sus cuentas, los instrumentos, las compras y ventas, los gastos y los ingresos, en pesos y en dólares. Una pantalla de resumen muestra cuánto quedó del mes para invertir y cuánto hay invertido a costo de compra, por persona y del grupo. No hay precios actuales, eso llega en la v2.

## 2. Usuarios objetivo

- **Sergio y Noelia**, el primer grupo. Cada uno tiene cuentas a su nombre y comparten gastos. Necesitan dejar el Excel de inversiones y saber a fin de mes cuánto les quedó para invertir.
- **Cualquier persona sola o grupo chico** que levante su propia copia. Necesita poder cargar sus propias personas, cuentas y categorías sin tocar el código.

## 3. Contexto del problema

Hoy los gastos están en una planilla o en la cabeza, las inversiones repartidas entre bancos y brokers y anotadas en un Excel, y lo que queda para invertir se calcula a ojo. Entre dos personas se suma no saber qué es de quién. El Excel mezcla monedas con facilidad y no dice desde qué cuenta se hizo cada compra.

## 4. Señales de éxito

- Sergio y Noelia cargan sus compras y ventas en LemonHouse y dejan de actualizar el Excel de inversiones.
- A fin de mes miran el resumen y saben cuánto les quedó para invertir, en pesos y en dólares, sin hacer cuentas a mano.

## 5. Alcance

### Entra

- Entrar con la cuenta de Google, solo para los emails invitados. Salir.
- Invitar un email lo hace quien administra la copia, fuera de la app.
- Alta, edición y baja de personas, cuentas, instrumentos, operaciones (compra y venta), gastos e ingresos.
- Categorías de gastos e ingresos precargadas.
- Posición actual por cuenta e instrumento, calculada de las operaciones.
- Resumen con dos bloques: el mes (ingresos, gastos, lo que queda) y lo invertido a costo de compra, por persona y del grupo.
- Registro de quién cargó cada cosa y cuándo.
- Carga inicial de las tenencias actuales a mano, como una compra por tenencia.

### Queda fuera

| Qué | Motivo |
|---|---|
| Precios actuales y rendimiento | Va en otra versión (v2). Depende de fuentes externas |
| Gráficos | Va en otra versión (v3) |
| Importar el Excel o resúmenes bancarios | Poco impacto. La carga inicial es de una vez y a mano alcanza |
| Anular con contra-asientos | Muy complejo para la v1. Editar y borrar cubre la corrección |
| Rentas, dividendos y amortizaciones | Va en otra versión. El modelo los admite como tipo de operación |
| Entrar con email y contraseña | Poco impacto. Con Google no hay contraseñas que guardar ni resetear |
| Invitar personas desde la app | Prematuro. En un grupo chico se invita una vez, a mano |
| Permisos por persona | Prematuro. En una copia por grupo todos ven y editan todo |
| Cuentas compartidas, dividir gastos, efectivo sin invertir, impuestos, operar desde la app, varios grupos por copia | Fuera del producto según el PRD |
| Equivalencias entre pesos y dólares | Prematuro. Exige elegir un dólar y una fecha, y la v1 no tiene cotizaciones |

## 6. Comportamiento esperado

### Acceso

- **C1 (P0).** DADO alguien sin sesión, CUANDO abre cualquier pantalla, ENTONCES ve el login y no ve ningún dato.
- **C2 (P0).** DADO una persona cuyo email fue invitado, CUANDO entra con su cuenta de Google, ENTONCES llega al resumen.
- **C3 (P0).** DADO una cuenta de Google cuyo email no fue invitado, CUANDO intenta entrar, ENTONCES no entra, ve "Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app".
- **C4 (P0).** DADO un usuario con sesión, CUANDO sale, ENTONCES vuelve al login y no puede ver datos con el botón de atrás.

### Personas y cuentas

- **C5 (P0).** DADO un usuario, CUANDO da de alta una persona con su nombre, ENTONCES la persona queda disponible para asignarle cuentas e ingresos. Puede tener usuario para entrar o no.
- **C6 (P0).** DADO una persona, CUANDO se crea una cuenta, ENTONCES la cuenta exige dueño, tipo (banco, comitente nacional, comitente del exterior, billetera) y entidad, y no se puede guardar sin dueño.
- **C7 (P0).** DADO una cuenta con operaciones o una persona con cuentas, CUANDO se intenta borrarla, ENTONCES la app no lo permite y dice qué la tiene en uso.

### Instrumentos

- **C8 (P0).** DADO un usuario, CUANDO da de alta un instrumento, ENTONCES indica tipo (acción, CEDEAR, ON, ETF, FCI, cripto), ticker con su sufijo, nombre y moneda (pesos o dólares). AAPL y AAPLD son dos instrumentos distintos.
- **C9 (P0).** DADO una ON, CUANDO se intenta guardar sin fecha de vencimiento, ENTONCES no se guarda y se pide la fecha.
- **C10 (P1).** DADO un FCI o un CEDEAR, CUANDO se carga, ENTONCES se pueden indicar sus datos propios (código CAFCI del FCI, ratio y subyacente del CEDEAR, emisor y valor nominal de la ON).

### Operaciones y posición

- **C11 (P0).** DADO una cuenta y un instrumento, CUANDO se carga una compra o venta, ENTONCES se exige cuenta, instrumento, fecha, cantidad mayor que cero, precio unitario y moneda. La comisión es opcional. Sin cuenta no se guarda.
- **C12 (P0).** DADO operaciones cargadas, CUANDO se mira la posición, ENTONCES cada cuenta muestra por instrumento la cantidad (compras menos ventas) y el costo de compra en la moneda de las operaciones.
- **C13 (P0).** DADO una operación cargada, CUANDO se edita o se borra, ENTONCES la posición y el resumen reflejan el cambio sin ningún paso extra.
- **C14 (P0).** DADO una posición de 10 unidades, CUANDO se carga una venta de 15, ENTONCES la app no la guarda y avisa que la cuenta solo tiene 10.
- **C15 (P1).** DADO una lista de operaciones, CUANDO se filtra por persona, cuenta o instrumento, ENTONCES se ven solo esas.

### Gastos e ingresos

- **C16 (P0).** DADO un usuario, CUANDO carga un gasto con fecha, monto, moneda y categoría, ENTONCES se guarda como comunitario sin pedir persona. Asignarle una persona es opcional.
- **C17 (P0).** DADO un usuario, CUANDO carga un ingreso, ENTONCES exige persona, fecha, monto, moneda y categoría. La cuenta donde se cobró es opcional.
- **C18 (P0).** DADO una copia nueva, CUANDO se carga el primer gasto o ingreso, ENTONCES ya existen las categorías de gastos (agua, luz, gas, expensas del barrio, colegio, súper, nafta, otros) y de ingresos (sueldo, otros).
- **C19 (P0).** DADO un gasto o ingreso cargado, CUANDO se edita o se borra, ENTONCES el resumen del mes refleja el cambio.
- **C20 (P1).** DADO un usuario, CUANDO agrega o renombra una categoría de gastos o ingresos, ENTONCES queda disponible para las cargas siguientes y las cargas anteriores muestran el nombre nuevo.

### Resumen

- **C21 (P0).** DADO ingresos y gastos de un mes, CUANDO se abre el resumen, ENTONCES el bloque del mes muestra para el grupo ingresos, gastos y lo que queda para invertir (ingresos menos gastos), por separado en pesos y en dólares.
- **C22 (P0).** DADO el resumen, CUANDO se elige otro mes, ENTONCES el bloque del mes muestra los números de ese mes. Por defecto se muestra el mes en curso.
- **C23 (P0).** DADO operaciones cargadas, CUANDO se abre el resumen, ENTONCES el bloque de inversiones muestra el total invertido a costo de compra de cada persona y del grupo, por separado en pesos y en dólares.
- **C24 (P0).** DADO cualquier pantalla con montos, CUANDO se muestran, ENTONCES llevan su moneda visible (`$ 25.291,50` o `US$ 25.291,50`) y ningún total suma pesos con dólares.
- **C25 (P1).** DADO el bloque del mes, CUANDO se elige una persona, ENTONCES se ven sus ingresos y los gastos asignados a ella, además de los comunitarios del grupo.
- **C26 (P1).** DADO el resumen, CUANDO se miran los últimos movimientos, ENTONCES se ven los últimos gastos e ingresos cargados.

### Trazabilidad y datos

- **C27 (P0).** DADO cualquier alta, CUANDO se guarda, ENTONCES queda registrado quién la cargó y cuándo, y se puede ver en el detalle.
- **C28 (P0).** DADO el repositorio público, CUANDO se levanta una copia nueva, ENTONCES solo trae datos ficticios de ejemplo y ningún nombre de persona, banco o broker real.

### Futuro (P2, no se construye)

- **C29 (P2).** El diseño permite sumar precios actuales con fecha y fuente, y mostrar "sin precio" con la fecha del último conocido.
- **C30 (P2).** El diseño permite sumar rentas, dividendos y amortizaciones como tipos de operación.
- **C31 (P2).** El diseño permite pasar a cuentas compartidas como describe `docs/modelo-de-datos.md`.

## 7. Posibles errores y mitigaciones

| Caso | Mitigación |
|---|---|
| Moneda distinta de pesos o dólares | No se acepta. Solo hay dos opciones |
| Operación en una moneda distinta a la del instrumento | Se avisa antes de guardar, porque casi siempre es un error de especie (AAPL contra AAPLD) |
| Monto, cantidad o precio en cero o negativo | No se guarda y se marca el campo |
| Fecha futura en una operación, gasto o ingreso | Se avisa y se pide confirmar |
| Venta mayor que la posición | No se guarda (C14) |
| Editar una compra vieja deja una venta posterior sin respaldo | No se guarda la edición y se dice qué venta quedaría sin respaldo |
| Borrar algo en uso | No se borra y se dice qué lo usa (C7) |
| Mes sin movimientos | El bloque muestra cero en cada moneda con el texto "Sin movimientos este mes", no queda vacío |
| Persona sin operaciones | Aparece en el bloque de inversiones con "Sin inversiones", no desaparece |
| Alguien entra con una cuenta de Google distinta a la invitada (por ejemplo la del trabajo) | No entra (C3), y el mensaje dice qué email intentó usar para que elija la otra cuenta |
| Google no responde o la persona cancela el login | Vuelve al login con "No se pudo entrar con Google. Probá de nuevo." |
| Error al guardar (sin conexión, sesión vencida) | Se muestra el error, no se pierde lo escrito y no se da por guardado |
| Dos personas editan lo mismo a la vez | Gana la última edición y queda registrado quién la hizo |

## 8. Preguntas abiertas

| Pregunta | Tipo |
|---|---|
| ¿El costo de una posición con varias compras se calcula con precio promedio o primero que entra primero que sale? En la v1 el total invertido es la suma de lo comprado menos lo vendido a su costo, y el método pesa recién con el rendimiento | No bloqueante (bloquea el plan de la v2) |
| ¿La moneda de la operación se guarda o se toma siempre del instrumento? | No bloqueante (decisión del plan) |
