# Spec de LemonHouse v1

> Producto nuevo. Fecha 2026-10-26. Contexto permanente en `PRD.md`, modelo de datos propuesto en `docs/modelo-de-datos.md`. Esta spec dice qué hace la v1, no cómo se construye.
>
> Actualizada el 2026-10-26, al aprobar el plan. Suma C32 (instalable en el celular) y C33 (notebook), y resuelve la moneda de la operación.
>
> Actualizada el 2026-10-29, durante la implementación. Detalla los datos propios del CEDEAR y de la ON (C10), los filtros de operaciones (C15) y la cuenta del mes de una persona (C25). Suma el límite de la lista de operaciones y deja el iPhone fuera de la v1, porque el primer grupo usa celulares Samsung y una Mac.
>
> Actualizada el 2026-10-29, al verificar la v1. La página de privacidad se ve sin entrar (C1), y la app instalada abre en su propia ventana, sin la barra del navegador (C32).
>
> Cerrada el 2026-10-30 con el tag `v1.0`. La copia real se levantó siguiendo `docs/levantar-una-copia.md`, que se corrigió en cada paso que no coincidía con los paneles (C28). En el sitio publicado, Noelia y Sergio entraron y llegaron al resumen (C2), y una cuenta no invitada vio el rechazo sin que se creara su usuario (C3). La app se instaló en un Samsung con Chrome, y desde ella se entró con Google sin pasar a una pestaña de Chrome (C32). Samsung Internet no la instala, probablemente porque la app no tiene service worker, que el plan descartó a propósito.
>
> Actualizada el 2026-11-03 al cerrar el cambio `docs/changes/2026-11-03-valor-actual/`, el primero de la v2: valor actual de las posiciones y de lo invertido (C34 a C42). C40 reemplaza a C23 y C29 sale de "Futuro". Se suman las aclaraciones de la verificación (C39, C40, C41, C42 y la tabla de errores).
>
> Actualizada el 2026-11-03 al cerrar el cambio `docs/changes/2026-11-03-pesaje/`: Pesaje, un módulo opcional fuera de lo financiero (C43 a C62). Se suman las decisiones de la verificación (C50, C54 y C56).

## 1. Overview

La v1 de LemonHouse permite entrar con usuario y registrar en un solo lugar las personas del grupo, sus cuentas, los instrumentos, las compras y ventas, los gastos y los ingresos, en pesos y en dólares. Una pantalla de resumen muestra cuánto quedó del mes para invertir y cuánto hay invertido a costo de compra, por persona y del grupo. Desde el 2026-11-03 muestra también cuánto vale hoy cada posición y lo invertido, con el último precio conocido y su fecha. Los precios los trae un proceso externo.

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
- Instalar la app en el celular desde el navegador, y usarla también desde la notebook.
- Una página de privacidad pública, que Google pide para publicar el login.
- Pesaje, un módulo opcional y apagado por defecto: la lista de quiénes se pesan con su objetivo, la carga semanal de todos juntos, la tabla con la variación y el gráfico de cada uno (cambio del 2026-11-03).
- Valor actual de cada posición, en la moneda del instrumento y con la fecha del valor, con la conversión de los FCI (cada mil cuotapartes) y de las ON (cada 100 de valor nominal). "Sin precio" cuando no hay valor conocido. Valor actual de lo invertido, por persona y del grupo, y el rendimiento (cambio del 2026-11-03).

### Queda fuera

| Qué | Motivo |
|---|---|
| Traer los valores automáticamente | Va en otro cambio, empezando por los FCI. El valor actual funciona con valores de cualquier origen |
| Valores de acciones, CEDEAR, ON, ETF y cripto desde sus fuentes | Va en otros cambios, de a una fuente por vez |
| Cargar o corregir un valor a mano desde la app | Poco impacto y riesgoso. Un valor escrito a mano puede quedar viejo o inventado sin que se note. Los valores vienen solo de las fuentes |
| Comprar un FCI por monto y que la app calcule las cuotapartes | Descartado el 2026-11-03. La compra se carga con los datos del comprobante del banco, que es el dato real |
| Historia del valor y gráficos | Va en otra versión (v3) |
| Rentas, dividendos y amortizaciones en el rendimiento | Va en otra versión. Siguen sin poder cargarse (C30) |
| Importar el Excel o resúmenes bancarios | Poco impacto. La carga inicial es de una vez y a mano alcanza |
| Anular con contra-asientos | Muy complejo para la v1. Editar y borrar cubre la corrección |
| Rentas, dividendos y amortizaciones | Va en otra versión. El modelo los admite como tipo de operación |
| Entrar con email y contraseña | Poco impacto. Con Google no hay contraseñas que guardar ni resetear |
| Invitar personas desde la app | Prematuro. En un grupo chico se invita una vez, a mano |
| Permisos por persona | Prematuro. En una copia por grupo todos ven y editan todo |
| Cuentas compartidas, dividir gastos, efectivo sin invertir, impuestos, operar desde la app, varios grupos por copia | Fuera del producto según el PRD |
| Equivalencias entre pesos y dólares, y un total que sume las dos monedas | Prematuro. Exige elegir un dólar y una fecha. La regla de nunca mezclar monedas sigue igual |
| App en las tiendas (App Store y Play Store) | Muy complejo. Pide cuentas de desarrollador pagas y una revisión en cada actualización, y la app instalable desde el navegador resuelve lo mismo |
| Usar la app sin conexión | Poco impacto. Los datos viven en la base, así que sin conexión no hay nada actualizado que mostrar |
| Pesaje: pasar el historial del papel | No hace falta. Se empieza a cargar desde ahora |
| Pesaje: prenderlo o apagarlo desde una pantalla de la app | Muy complejo. La app no tiene pantalla de configuración y habría que crearla solo para esto (ver `docs/changes/2026-11-03-pesaje/decision-interruptor.md`) |
| Pesaje: un peso meta ("llegar a 55 kg") y cuánto falta | Va en otra versión. Con la dirección del objetivo alcanza para saber si se va bien |
| Pesaje: objetivo "mantener" | Prematuro. Exige definir un margen de tolerancia, y "bajar" ya cubre no querer subir |
| Pesaje: alertas o avisos | Poco impacto. Lo que se usa hoy es solo el registro |
| Pesaje: IMC, altura u otras medidas del cuerpo | Poco impacto, y suma datos de salud que hoy no se anotan |
| Pesaje: recordatorio semanal para pesarse | Poco impacto. El pesaje ya es una rutina |
| Pesaje: libras u otras unidades | Poco impacto. Todo se anota en kilogramos |
| Pesaje: relacionarlo con lo financiero (personas, cuentas, gastos) | Fuera del producto. Son cosas separadas a propósito |
| Instalar la app en un iPhone y entrar con Google desde ahí | Poco impacto. El primer grupo usa celulares Samsung (Android) y una Mac, donde LemonHouse se usa desde Safari como página. Si otro grupo lo necesita, se suma como cambio |

## 6. Comportamiento esperado

### Acceso

- **C1 (P0).** DADO alguien sin sesión, CUANDO abre cualquier pantalla, ENTONCES ve el login y no ve ningún dato.
  - La página de privacidad se puede leer sin sesión, y el login la enlaza. No nombra a ningún grupo.
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
  - Los datos propios son opcionales, y solo se guardan los del tipo del instrumento. Si se le cambia el tipo, los del tipo anterior se borran.
  - El ratio del CEDEAR es cuántos CEDEAR equivalen a una acción del subyacente. Por ejemplo, 20 si 20 CEDEAR son una acción. Tiene que ser mayor que cero, con hasta 8 decimales.
  - El valor nominal de la ON es el residual: el porcentaje del valor nominal original que queda después de las amortizaciones. Vale 100 si todavía no amortizó, y tiene que ser mayor que 0 y no pasar de 100.

### Operaciones y posición

- **C11 (P0).** DADO una cuenta y un instrumento, CUANDO se carga una compra o venta, ENTONCES se exige cuenta, instrumento, fecha, cantidad mayor que cero, precio unitario y moneda. La comisión es opcional. Sin cuenta no se guarda.
- **C12 (P0).** DADO operaciones cargadas, CUANDO se mira la posición, ENTONCES cada cuenta muestra por instrumento la cantidad (compras menos ventas) y el costo de compra en la moneda de las operaciones. El costo se calcula con precio promedio: cada compra suma su monto más su comisión, y cada venta descuenta la cantidad vendida al promedio vigente, sin cambiarlo. Ejemplo: 10 a $ 100 y 10 a $ 200 dan un promedio de $ 150, y si después se venden 5 quedan 15 con un costo de $ 2.250. El método es provisorio y se revisa después de usarlo.
- **C13 (P0).** DADO una operación cargada, CUANDO se edita o se borra, ENTONCES la posición y el resumen reflejan el cambio sin ningún paso extra.
- **C14 (P0).** DADO una posición de 10 unidades, CUANDO se carga una venta de 15, ENTONCES la app no la guarda y avisa que la cuenta solo tiene 10.
- **C15 (P1).** DADO una lista de operaciones, CUANDO se filtra por persona, cuenta o instrumento, ENTONCES se ven solo esas.
  - Los tres filtros se combinan. Con una persona elegida, solo se ofrecen sus cuentas.
  - Desde la posición de una cuenta, cada instrumento lleva a sus operaciones en esa cuenta.

### Valor actual (cambio del 2026-11-03)

- **C34 (P0).** DADO una posición con un valor conocido de su instrumento, CUANDO se mira la posición de la cuenta, ENTONCES cada instrumento muestra, además de la cantidad y el costo, el valor actual (cantidad por el último valor conocido), en la moneda del instrumento, con la fecha de ese valor ("Valor al 02/11"). Si el valor es de otro año, la fecha lleva el año ("Valor al 02/11/2025"), así un fondo que dejó de publicar no parece de ayer. Decidido el 2026-11-03, en la revisión de código.
- **C35 (P0).** DADO un FCI, CUANDO se calcula su valor, ENTONCES se usa el valor de una cuotaparte, que es el publicado dividido 1.000. Ejemplo: 1.500 cuotapartes con un valor publicado de $ 2.345.678,90 valen $ 3.518.518,35.
- **C36 (P0).** DADO una ON, CUANDO se calcula su valor, ENTONCES el precio se toma cada 100 de valor nominal. Ejemplo: 1.000 de valor nominal a US$ 102,50 valen US$ 1.025.
- **C37 (P0).** DADO un instrumento sin ningún valor conocido, CUANDO se mira su posición, ENTONCES el valor dice "Sin precio", nunca $ 0, y el costo se sigue viendo.
- **C38 (P1).** DADO un valor con más de 7 días de antigüedad, CUANDO se muestra, ENTONCES se marca como desactualizado, junto a su fecha.
- **C39 (P1).** DADO un FCI sin código CAFCI, CUANDO se mira su posición, ENTONCES dice "Sin precio" y debajo "Falta el código CAFCI", que lleva al instrumento para cargarlo. Van en dos renglones para que el enlace se toque fácil en el celular. Decidido el 2026-11-03, al verificar.
- **C42 (P1).** DADO una posición o un total con valor actual, CUANDO se muestra, ENTONCES también se ve el rendimiento (valor actual menos costo, en monto y en porcentaje), en verde si gana y en rojo si pierde. Si el valor es parcial o no hay precio, no se muestra rendimiento.
  - Siempre lleva su signo, así no depende solo del color. Lo que redondea a $ 0,00 se muestra sin signo y sin color. Decidido el 2026-11-03, al verificar.

### Gastos e ingresos

- **C16 (P0).** DADO un usuario, CUANDO carga un gasto con fecha, monto, moneda y categoría, ENTONCES se guarda como comunitario sin pedir persona. Asignarle una persona es opcional.
- **C17 (P0).** DADO un usuario, CUANDO carga un ingreso, ENTONCES exige persona, fecha, monto, moneda y categoría. La cuenta donde se cobró es opcional.
- **C18 (P0).** DADO una copia nueva, CUANDO se carga el primer gasto o ingreso, ENTONCES ya existen las categorías de gastos (agua, luz, gas, expensas del barrio, colegio, súper, nafta, otros) y de ingresos (sueldo, otros).
- **C19 (P0).** DADO un gasto o ingreso cargado, CUANDO se edita o se borra, ENTONCES el resumen del mes refleja el cambio.
- **C20 (P1).** DADO un usuario, CUANDO agrega o renombra una categoría de gastos o ingresos, ENTONCES queda disponible para las cargas siguientes y las cargas anteriores muestran el nombre nuevo.

### Resumen

- **C21 (P0).** DADO ingresos y gastos de un mes, CUANDO se abre el resumen, ENTONCES el bloque del mes muestra para el grupo ingresos, gastos y lo que queda para invertir (ingresos menos gastos), por separado en pesos y en dólares.
- **C22 (P0).** DADO el resumen, CUANDO se elige otro mes, ENTONCES el bloque del mes muestra los números de ese mes. Por defecto se muestra el mes en curso.
- **C40 (P0).** DADO operaciones cargadas, CUANDO se abre el resumen, ENTONCES el bloque de inversiones muestra para cada persona y para el grupo el costo de compra y el valor actual, por separado en pesos y en dólares. Reemplaza a C23 desde el 2026-11-03.
  - Si una persona no tiene nada invertido en una moneda, en esa moneda el costo y el valor son $ 0,00, no "Sin precio": no hay nada que valuar. Decidido el 2026-11-03, al verificar.
- **C41 (P0).** DADO un total con algún instrumento sin precio, CUANDO se muestra, ENTONCES el valor actual se marca como parcial y dice cuántos instrumentos no tienen precio. Nunca se muestra como si fuera completo.
  - Un instrumento que está en dos cuentas cuenta una vez. Si ninguno tiene precio, el total dice "Sin precio" y debajo cuántos faltan. Decidido el 2026-11-03, al verificar.
- **C24 (P0).** DADO cualquier pantalla con montos, CUANDO se muestran, ENTONCES llevan su moneda visible (`$ 25.291,50` o `US$ 25.291,50`) y ningún total suma pesos con dólares.
- **C25 (P1).** DADO el bloque del mes, CUANDO se elige una persona, ENTONCES se ven sus ingresos y los gastos asignados a ella, además de los comunitarios del grupo.
  - Los gastos de la persona y los comunitarios se muestran por separado, como "Gastos propios" y "Gastos comunitarios", en cada moneda.
  - Lo que queda para invertir son sus ingresos, menos sus gastos propios, menos todos los gastos comunitarios del grupo. La app no divide los gastos comunitarios entre personas (dividir gastos queda fuera del producto), así que cada persona los ve enteros.
  - Ejemplo: Ana cobra $ 1.000 y gasta $ 100, y el grupo tiene $ 300 de gastos comunitarios. A Ana le quedan $ 600.
- **C26 (P1).** DADO el resumen, CUANDO se miran los últimos movimientos, ENTONCES se ven los últimos gastos e ingresos cargados.
  - Van en el orden en que se cargaron, del último al primero, aunque sean de otro mes. Así se puede revisar lo que cargó la otra persona. Decidido el 2026-10-29, en la revisión de código.

### Trazabilidad y datos

- **C27 (P0).** DADO cualquier alta, CUANDO se guarda, ENTONCES queda registrado quién la cargó y cuándo, y se puede ver en el detalle.
- **C28 (P0).** DADO el repositorio público, CUANDO se levanta una copia nueva, ENTONCES solo trae datos ficticios de ejemplo y ningún nombre de persona, banco o broker real.

### Celular y notebook

- **C32 (P1).** DADO un celular, CUANDO se abre LemonHouse en el navegador, ENTONCES se puede instalar en la pantalla de inicio, se abre en su propia ventana con su ícono, sin la barra del navegador, y se entra con Google sin salir de la app.
  - La barra del sistema, con la hora y la batería, sigue visible, como en cualquier app.
  - En la v1 vale para celulares Android, que es lo que usa el primer grupo (Samsung). El iPhone queda fuera (sección 5). En la Mac, LemonHouse se usa desde Safari como página, con la vista de notebook (C33).
- **C33 (P1).** DADO una notebook, CUANDO se abre LemonHouse, ENTONCES las pantallas aprovechan el ancho (el resumen muestra sus dos bloques lado a lado y las listas se acomodan en grilla) y está todo lo que hay en el celular.

### Pesaje (cambio del 2026-11-03, módulo opcional)

Pesaje no es parte del propósito financiero. Es un registro semanal del peso de personas y mascotas que cada copia prende si lo quiere, y no toca nada de lo financiero. Cómo se prende está en `docs/changes/2026-11-03-pesaje/decision-interruptor.md`.

#### Activación

- **C43 (P0).** DADO una copia que no activó Pesaje, CUANDO se usa la app, ENTONCES Pesaje no aparece en el menú, su pantalla no se puede abrir ni escribiendo la dirección, y el resto de la app funciona igual que antes.
- **C44 (P0).** DADO una copia que activó Pesaje, CUANDO se abre el menú, ENTONCES Pesaje aparece al final, separado de las entradas financieras.

#### Quiénes se pesan

- **C45 (P0).** DADO Pesaje activo, CUANDO se agrega a alguien a la lista con su nombre, ENTONCES aparece en la carga de pesajes. No es una persona del grupo, así que no aparece en cuentas, gastos, ingresos ni resumen, y no puede entrar a la app.
- **C46 (P0).** DADO alguien en la lista, CUANDO se intenta agregar otro con el mismo nombre, ENTONCES no se guarda y se avisa que ya existe.
- **C47 (P1).** DADO alguien con pesajes, CUANDO se le cambia el nombre, ENTONCES sus pesajes anteriores muestran el nombre nuevo.
- **C48 (P1).** DADO alguien en la lista, CUANDO se lo desactiva, ENTONCES deja de aparecer en la carga, pero sus pesajes se siguen viendo en la tabla, el filtro y el gráfico. Se puede volver a activar.
- **C49 (P0).** DADO alguien con pesajes, CUANDO se intenta borrarlo de la lista, ENTONCES no se borra, se avisa que tiene pesajes cargados y se sugiere desactivarlo.
- **C61 (P1).** DADO alguien en la lista, CUANDO se le elige un objetivo, ENTONCES puede ser "Bajar", "Subir" o "Sin objetivo". Quien se agrega a la lista arranca con "Sin objetivo", y el objetivo se puede cambiar en cualquier momento desde la lista.

#### Carga

- **C50 (P0).** DADO la lista con sus integrantes activos, CUANDO se carga un pesaje, ENTONCES se elige la fecha (por defecto hoy) y aparece un renglón por cada integrante activo, con su peso y sus observaciones. Los renglones sin peso no se guardan. Se guarda si hay al menos un peso. Un renglón con observaciones y sin peso no se guarda y pide el peso, para que la observación no se pierda sin aviso. Si la lista no tiene a nadie activo, se avisa y se ofrece agregar a alguien.
- **C51 (P0).** DADO un peso, CUANDO se carga, ENTONCES se expresa en kilogramos con hasta dos decimales (57,30 kg o 4,35 kg). Si es cero, negativo o mayor que 300 kg, no se guarda y se dice en qué renglón está el error.
- **C52 (P0).** DADO alguien que ya tiene un peso en una fecha, CUANDO se carga otro peso suyo en la misma fecha, ENTONCES no se guarda, se avisa que ya tiene un pesaje ese día y se ofrece editar el existente.
- **C53 (P0).** DADO una carga, CUANDO se elige una fecha futura, ENTONCES no se guarda y se avisa.
- **C54 (P0).** DADO un peso cargado, CUANDO se edita la fecha, el peso o las observaciones, o se lo borra, ENTONCES la tabla, la variación y el gráfico reflejan el cambio sin ningún paso extra. Quién se pesó no se edita: si el peso quedó en el renglón equivocado, se borra y se carga de nuevo.

#### Tabla, variación y gráfico

- **C55 (P0).** DADO pesajes cargados, CUANDO se abre Pesaje, ENTONCES se ve una tabla con fecha, quién, peso (57,30 kg) y observaciones, con lo más reciente primero.
- **C56 (P1).** DADO un peso con un pesaje anterior de la misma persona o mascota, CUANDO se muestra, ENTONCES se ve la variación contra ese pesaje anterior, con signo (+0,30 kg, -0,15 kg, con el guion común, igual que en el rendimiento financiero). Si es el primero, dice "Primer pesaje".
- **C62 (P1).** DADO una variación, CUANDO se muestra, ENTONCES su color sale del objetivo actual de quien se pesó. Con "Bajar", bajar es verde y subir es rojo. Con "Subir", al revés. Con "Sin objetivo", o si el peso no cambió, va en neutro. El color va siempre junto al signo y a una flecha, para que se entienda sin distinguir colores. Si cambia el objetivo, todas sus variaciones, también las viejas, se muestran según el objetivo nuevo.
- **C57 (P1).** DADO la tabla, CUANDO se filtra por quién se pesó, ENTONCES se ven solo sus pesajes, y la variación sigue siendo contra su pesaje anterior.
- **C58 (P1).** DADO alguien con pesajes, CUANDO se mira su gráfico de evolución, ENTONCES se ve su peso a lo largo del tiempo, con la escala ajustada a su peso, para que la variación de una mascota de 4 kg se note tanto como la de una persona de 60 kg. Las semanas sin pesaje no se dibujan como cero. El gráfico muestra el objetivo como una etiqueta ("Objetivo: bajar"), sin colorear la línea.

#### Trazabilidad y datos

- **C59 (P0).** DADO un peso cargado, CUANDO se guarda, ENTONCES queda registrado quién lo cargó y cuándo, igual que en C27.
- **C60 (P0).** DADO el repositorio público, CUANDO se levanta una copia nueva, ENTONCES los ejemplos de Pesaje usan nombres ficticios y ningún nombre real de una persona o mascota, igual que en C28.

### Futuro (P2, no se construye)

- **C30 (P2).** El diseño permite sumar rentas, dividendos y amortizaciones como tipos de operación.
- **C31 (P2).** El diseño permite pasar a cuentas compartidas como describe `docs/modelo-de-datos.md`.

## 7. Posibles errores y mitigaciones

| Caso | Mitigación |
|---|---|
| Moneda distinta de pesos o dólares | No se acepta. Solo hay dos opciones |
| Operación en una moneda distinta a la del instrumento | No puede pasar. La moneda de la operación sale del instrumento y se ve apenas se lo elige, así un error de especie (AAPL contra AAPLD) se nota antes de guardar |
| Cambiar el tipo de un instrumento con operaciones | No se guarda, igual que la moneda, porque cambiaría el costo de todas sus operaciones (una ON cotiza cada 100). Para corregirlo se borran las operaciones o se crea otro instrumento. Decidido el 2026-10-29, en la revisión de código |
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
| En un iPhone, el login con Google deja la sesión en Safari y no en la app instalada | Queda fuera de la v1, porque el primer grupo no usa iPhone (sección 5). Si hiciera falta, el login se abriría en una ventana que iOS mantiene dentro de la app |
| La lista de operaciones pasa de 1.000 | La base devuelve hasta 1.000 filas por pedido, y la lista lee todas las operaciones para filtrarlas. Al ritmo de carga de un grupo chico faltan años para llegar. Cuando se acerque, se suma un cambio para leerlas por partes. Las posiciones y el resumen no tienen este límite, porque los calcula la base |
| Un instrumento nunca tuvo valor | "Sin precio" (C37). No suma al total, y el total se marca como parcial (C41) |
| El último valor es viejo (por ejemplo, un fondo que dejó de publicar) | Se muestra con su fecha y marcado como desactualizado (C38) |
| La fuente corrige el valor de un día ya publicado | Se muestra el valor corregido, sin ningún paso de la usuaria |
| Se corrige el código CAFCI, el ticker o la moneda de un instrumento | Sus precios se borran, porque se pidieron con la clave vieja y son de otro instrumento. El proceso trae los nuevos en su próxima corrida. La spec del cambio nombraba solo el código CAFCI; el ticker y la moneda se sumaron al implementar. Decidido el 2026-11-03, al verificar |
| El instrumento cambia mientras el proceso trae precios | El precio pedido con la clave o la moneda vieja se saltea y los demás se guardan. Decidido el 2026-11-03, en la revisión de código |
| Un precio llega con fecha posterior a hoy (por ejemplo, el año mal escrito) | Se rechaza la corrida entera, así el error se nota y no tapa los precios correctos. Decidido el 2026-11-03, en la revisión de código |
| Confundir el valor cada mil cuotapartes con el de una cuotaparte | Criterio C35 con su ejemplo. Un error así multiplica el valor por mil y se vería enseguida |
| Posición vendida por completo | No aparece, aunque su instrumento tenga precio |
| Pesaje: se escribe el peso con punto en vez de coma (57.3) | Se toma igual que con coma. Nunca se guarda un peso distinto del que se quiso escribir |
| Pesaje: se escribe en gramos por error (4350 para un gato) | Supera los 300 kg y no se guarda (C51) |
| Pesaje: alguien no se pesó esa semana | Su renglón queda vacío y no se guarda nada para él (C50). En el gráfico no aparece como cero (C58) |
| Pesaje: se carga dos veces el mismo día | No se guarda el segundo y se ofrece editar el primero (C52) |
| Pesaje: se carga el peso en el renglón equivocado | Se borra ese peso y se carga en el renglón correcto (C54) |
| Pesaje: una mascota ya no está | Se la desactiva y su historial se conserva (C48) |
| Pesaje: cambia el objetivo de alguien (deja de crecer, llega a un peso sano) | Se cambia desde la lista (C61) y sus variaciones se recolorean con el objetivo nuevo (C62) |
| Pesaje: alguien sin objetivo sube o baja | La variación va en neutro. La app no decide por su cuenta qué es bueno (C62) |
| Pesaje: se apaga en una copia que tenía datos | Los datos no se borran. Si se vuelve a prender, reaparecen |
| Pesaje: alguien de la lista tiene un solo pesaje | El gráfico muestra ese único punto, sin línea |

## 8. Preguntas abiertas

La moneda de la operación quedó resuelta en el plan: se guarda en la operación y tiene que ser la del instrumento.

- **No bloqueante.** ¿Las ON que ya amortizaron cotizan cada 100 de valor nominal original o del residual? Cambia la cuenta de C36 para esas ON. Se confirma con un dato real en el cambio de Open BYMA.
- **No bloqueante.** ¿Siete días es el umbral correcto para "desactualizado" (C38)? Se ajusta después de usarlo.
- **No bloqueante.** En Pesaje, ¿300 kg es un buen tope (C51)? Se ajusta si molesta al usarlo.
