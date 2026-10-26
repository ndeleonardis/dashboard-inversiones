# PRD de LemonHouse

> Contexto permanente del producto. Dice por qué existe LemonHouse y qué reglas no cambian entre versiones. Lo que se construye en cada versión, con sus criterios de aceptación, vive en `docs/specs/`. Las decisiones técnicas viven en `docs/plans/`. Última actualización 2026-10-25.

## 1. Qué es y por qué existe

LemonHouse es una app para llevar en un solo lugar las finanzas de una persona o de un grupo. Registra lo que entra, lo que se gasta, cuánto se invierte, dónde y cómo va cada inversión, en pesos y en dólares.

El problema es que hoy esas cuatro cosas viven separadas. Los gastos están en una planilla o en la cabeza, las inversiones repartidas entre bancos y brokers, y cuánto queda para invertir este mes se calcula a ojo. Cuando las finanzas se llevan entre dos o más personas se suma otra capa, saber qué es de quién y qué es de todos.

## 2. Para quién

Pensada primero para Sergio y Noelia, una pareja con cuentas a nombre de cada uno y gastos que comparten. Sirve igual para una persona sola o para un grupo que lleva finanzas en conjunto.

Cada grupo levanta su propia copia de la app con su propia base. No hay una instalación compartida entre grupos.

Nada de lo que es propio de un grupo está en el código. Los nombres de las personas, los bancos, los brokers y las categorías son datos que carga cada grupo.

## 3. Reglas del dominio

Valen para todas las versiones. Cambiar una de estas reglas es cambiar el producto, no agregar una funcionalidad.

1. **Pesos y dólares nunca se suman.** Todo monto lleva su moneda y los totales se muestran por moneda. Si algún día se muestra un equivalente, se dice con qué dólar y de qué fecha.
2. **Cada cuenta pertenece a una persona.** Una cuenta bancaria o comitente, nacional o del exterior, tiene un solo dueño.
3. **Toda inversión sale de una cuenta.** Así siempre se sabe de quién es y desde dónde se hizo, por ejemplo desde el Santander de Noelia.
4. **Se ve por persona y para todo el grupo.** Lo de cada uno y lo de todos juntos, siempre separado por moneda.
5. **Los gastos son comunitarios salvo que se diga otra cosa.** Cargar un gasto común no pide elegir persona. Asignarlo a una persona es opcional.
6. **Ingresos menos gastos es lo que queda para invertir**, por moneda y por período.
7. **Sin precio no es cero.** Si no hay precio actual para un instrumento, la app dice "sin precio" y muestra la fecha del último conocido.
8. **Los datos reales viven solo en la base de cada grupo.** El repositorio es público y nunca tiene datos reales.

## 4. Glosario

| Término        | Qué es                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Persona        | Integrante del grupo. Puede tener usuario para entrar a la app o no                                                        |
| Usuario        | El acceso a la app con una cuenta de Google cuyo email invitó quien administra la copia                                    |
| Cuenta         | Cuenta bancaria o comitente, nacional o del exterior, a nombre de una persona                                              |
| Tipo de cuenta | Banco, comitente nacional, comitente del exterior, billetera, y los que agregue cada grupo                                 |
| Instrumento    | Lo que se compra para invertir. Acción, CEDEAR, ON, ETF, FCI o cripto                                                      |
| Especie        | La versión exacta de un instrumento según la moneda en que cotiza. AAPL en pesos, AAPLD en dólar MEP, AAPLC en dólar cable |
| Operación      | Una compra o una venta de un instrumento desde una cuenta                                                                  |
| Posición       | Lo que se tiene hoy de un instrumento en una cuenta. Se calcula a partir de las operaciones                                |
| Gasto          | Una salida de plata, comunitaria o de una persona                                                                          |
| Ingreso        | Una entrada de plata de una persona, como un sueldo o un cobro                                                             |
| Categoría      | Clasificación de gastos e ingresos que arma cada grupo                                                                     |
| Precio         | Valor de un instrumento en un momento, con su fuente                                                                       |

## 5. Fuentes externas de precios

Los precios actuales llegan en la v2, con una sola fuente por tipo de instrumento.

| Tipo de instrumento | Fuente |
|---|---|
| Acciones argentinas, CEDEARs y ONs | Open BYMA Data |
| Acciones y ETFs que cotizan en EE.UU. | Alpaca, plan gratis |
| Cripto | CoinGecko, plan Demo |
| FCI y dólar | FastAPI de datos-financieros-ar, solo en la copia de Sergio y Noelia |

Cada copia usa sus propias keys. Los ETFs comprados como CEDEAR toman el precio de BYMA. En una copia sin la FastAPI los FCI quedan sin precio, porque la CAFCI no permite redistribuir sus datos sin consentimiento.

## 6. Señales de éxito

- Sergio y Noelia dejan de usar el Excel de inversiones.
- A fin de mes saben cuánto les quedó para invertir sin hacer cuentas a mano.

## 7. Fuera de alcance

| Qué | Por qué queda afuera |
|---|---|
| Cuentas compartidas entre personas | Hoy todas las cuentas del grupo son unipersonales. El camino para sumarlas ya está identificado en `docs/modelo-de-datos.md` |
| Permisos por persona | En una copia por grupo todos ven todo |
| Efectivo sin invertir de cada cuenta | Decidido dejarlo para después. Exige cargar saldos a mano o registrar cada movimiento |
| Dividir gastos entre personas | Los gastos comunes se comparten sin saldar cuentas entre quienes los pagan |
| Importar resúmenes bancarios | Cada banco tiene su formato, y mantener esos importadores no se justifica para la carga de un grupo chico |
| Comprar o vender desde la app | LemonHouse registra lo que ya se hizo en el broker. Operar exigiría guardar credenciales del broker |
| Varios grupos en una misma copia | Cada grupo levanta la suya, y así nadie tiene que aislar datos ajenos |
| Cálculo de impuestos | Ganancias y Bienes Personales tienen reglas propias que exceden el seguimiento |

## 8. Hoja de ruta

| Versión | Qué suma |
|---|---|
| v1 | Login. Registro de personas, cuentas, instrumentos, operaciones, gastos e ingresos. Resumen por persona y del grupo, a costo de compra |
| v2 | Precios actuales y rendimiento de cada posición |
| v3 | Gráficos |

Los precios van en una versión aparte porque dependen de fuentes externas, y el registro tiene que funcionar aunque esas fuentes fallen.

## 9. Contexto técnico ya decidido

- Base PostgreSQL en Supabase, con el login de Supabase.
- En la copia de Sergio y Noelia, backup diario cifrado de la base desde un servidor propio.
- Precios de FCI y dólar desde la FastAPI de datos-financieros-ar, que es privada.
- En la copia de Sergio y Noelia, la app se sirve como sitio estático desde Nginx en el servidor propio de Oracle, en un subdominio de `rumbosagrado.com` con HTTPS.
- La app llega a la FastAPI por una ruta `/api` que publica el mismo Nginx. La FastAPI valida el token de Supabase de quien consulta, así que no queda abierta a cualquiera.
- El framework de la app se elige en el primer `design-plan`.
- Diseño visual en `DESIGN.md`. Modelo de datos en `docs/modelo-de-datos.md`.

## 10. Preguntas abiertas

| Pregunta | Qué bloquea |
|---|---|
| ¿Cómo se calcula el costo de una posición con varias compras, con precio promedio o primero que entra primero que sale? | El `design-plan` de la v2 |
