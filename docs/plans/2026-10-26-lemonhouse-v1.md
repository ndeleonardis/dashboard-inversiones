# Plan de LemonHouse v1

> Producto nuevo. Fecha 2026-10-26. Implementa la spec aprobada `docs/specs/2026-10-26-lemonhouse-v1.md`. La spec dice qué se construye. Este plan dice cómo, con qué herramientas y en qué orden.
>
> Aprobado el 2026-10-26, con la app instalable en el celular (C32) y la vista para notebook (C33).

## 1. Objetivo

Construir la v1 de LemonHouse. Es una app web pensada para el celular, donde las personas invitadas entran con Google. Ahí registran personas, cuentas, instrumentos, compras y ventas, gastos e ingresos. También ven cuánto les quedó del mes y cuánto tienen invertido a costo de compra, siempre separado en pesos y en dólares.

## 2. Contexto del problema

Hoy los gastos están en una planilla o en la cabeza y las inversiones en un Excel. Lo que queda para invertir se calcula a ojo. El Excel mezcla monedas con facilidad y no dice desde qué cuenta se hizo cada compra. Entre dos personas, además, no queda claro qué es de quién. La v1 tiene que reemplazar ese Excel y responder a fin de mes cuánto quedó para invertir, sin cuentas a mano.

## 3. Spec de referencia

`docs/specs/2026-10-26-lemonhouse-v1.md`, aprobada el 2026-10-26. Incluye el costo con precio promedio, con la comisión de compra sumada al costo, y los criterios C32 y C33 que se sumaron al aprobar este plan.

## 4. Código existente

No aplica. El repo tiene solo documentación. Del código de julio (tag `backup-2026-10-23`) se retoma la idea de formatear montos con `Intl.NumberFormat('es-AR')`. El resto no se trae, porque era un visor sin base ni login.

## 5. Stack y arquitectura

### Forma general

- La app es un sitio estático que habla directo con Supabase desde el navegador. En la v1 no hay servidor propio.
- Supabase da tres cosas: el login con Google, la base Postgres y la API de la base.
- **Las reglas viven en la base.** Las hacen cumplir restricciones, triggers, vistas y políticas de acceso (RLS). La app valida para avisar antes, pero la que impide es la base. Así la regla se cumple aunque alguien llame a la API sin pasar por la app.
- **Las cuentas de plata se hacen en SQL**, siempre agrupadas por moneda. Son el costo promedio, los totales del mes y el total invertido. La app solo muestra los números.

### Decisiones

| Decisión | Alternativa descartada y por qué |
|---|---|
| **Vite 8 + React 19 + TypeScript 7**, como sitio estático que sirve Nginx | Next.js u otro framework con servidor. El PRD decidió servir estático desde Nginx y la v1 no necesita servidor |
| **supabase-js desde el navegador**, con RLS en todas las tablas | Una API propia entre la app y la base. Duplica lo que la API de Supabase y RLS ya hacen, y suma un servidor que mantener |
| **Reglas y cálculos de plata en Postgres** | Validar y sumar en la app. La constitución pide que la base lo impida, y la key pública permite llamar a la API sin pasar por la app |
| **Posición y costo calculados en una vista**, con un agregado SQL de costo promedio. El método vive en una sola función, así que cambiarlo después es un cambio acotado | Guardar la posición en una tabla. El modelo de datos ya lo descartó, porque podría dejar de coincidir con las operaciones |
| **Login con Google en Supabase Auth**, cerrado con el hook "Before User Created". El hook deja pasar solo los emails cargados en `persona.email` y está disponible en el plan Free | Desactivar los registros y crear cada usuario a mano en el panel. Supabase rechaza en inglés y sin decir el email, y esa regla no se puede testear desde el repo |
| **Migraciones SQL versionadas** en `supabase/migrations/`, aplicadas con la CLI de Supabase (se instala con npm) | Crear las tablas a mano en el panel. No queda historial y no se puede repetir igual en la copia de otro grupo |
| **Vitest 5** como runner de tests, en cuatro grupos (ver abajo) | Jest. Vitest usa la misma configuración que Vite y no hay que duplicarla |
| **PGlite** para testear la base. Es Postgres compilado para correr dentro de Node, y usa las mismas migraciones. Se probó el 2026-10-26 y anduvieron roles, RLS, vistas `security_invoker`, agregados propios y códigos de error propios | Supabase local con Docker y pgTAP. La máquina no tiene Docker y en Windows Home pide instalar WSL2. PGlite se instala con npm |
| **TanStack Query** para leer y guardar, invalidando todo después de cada cambio | `useEffect` con fetch a mano. Ahí es donde aparecen pantallas con datos viejos después de editar (C13, C19) |
| **React Router** en modo declarativo | Rutas con `#`. No hace falta, porque Nginx puede devolver `index.html` para cualquier ruta |
| **CSS propio con los tokens de `DESIGN.md`**, con la fuente Plus Jakarta Sans servida desde el mismo sitio | Tailwind o una librería de componentes. El diseño es propio y chico, y una librería pelea con la paleta |
| **Números en formato es-AR** (coma decimal), con un parser propio que rechaza lo ambiguo | `<input type="number">`. Según el navegador no acepta la coma o la interpreta distinto, y "0.5" podría guardarse como 5 sin aviso |
| **Tipos de la base generados** con la CLI de Supabase y versionados | Escribir los tipos a mano. Se desfasan de la base sin que nadie se entere |
| **App instalable desde el navegador** (manifest e íconos), sin service worker. Chrome permite instalarla desde su menú sin él, y en iPhone se agrega a la pantalla de inicio desde Safari (C32) | App de tienda. Pide cuentas de desarrollador pagas, una revisión en cada actualización y otro proyecto para compilar. Y un service worker que guarde la app puede dejar a alguien con una versión vieja después de publicar |
| **Diseño adaptable desde el principio**, con el corte en 768 px de `DESIGN.md` (C33) | Agregar la vista de notebook al final. Obliga a revisar cada pantalla ya hecha |

Si alguna herramienta todavía no soporta TypeScript 7, se usa TypeScript 6 sin cambiar el resto.

### Tests

| Grupo | Qué prueba | Cómo corre |
|---|---|---|
| `unidad` | Funciones puras: formato de montos, parser de números, fechas y mapeo de errores | Node |
| `base` | Migraciones, restricciones, triggers, vistas, RLS y el hook | PGlite. Antes de las migraciones se carga un archivo que imita lo que Supabase trae de fábrica: los roles `anon`, `authenticated` y `supabase_auth_admin`, y la función `auth.jwt()` |
| `interfaz` | Pantallas y flujos, con un repositorio falso en memoria en lugar de Supabase | jsdom + Testing Library |
| `repo` | Guardas del repositorio: sin secretos, sin emails reales, sin datos de un grupo en el código | Node, sobre los archivos de `git ls-files` |

`npm test` corre los cuatro grupos. `npm run verificar` suma el chequeo de tipos y el build. Lo que necesita Google de verdad, o mirar el diseño, queda marcado **solo navegador** y lo prueba `verify-after-changes`. Ahí cada pantalla se revisa en dos anchos, 390 px (celular) y 1.280 px (notebook).

### Esquema de la base

| Tabla o vista | Qué guarda | Qué impone la base |
|---|---|---|
| `persona` | Nombre y email (opcional) | Nombre no vacío. Email único y en minúsculas. El email es la invitación: lo carga quien administra la copia, y la app no lo puede escribir |
| `tipo_cuenta` | Nombre | Viene cargada con Banco, Comitente nacional, Comitente del exterior y Billetera |
| `cuenta` | Persona, tipo, entidad y nombre (opcional) | Dueño, tipo y entidad obligatorios. No se borra si tiene operaciones o ingresos |
| `tipo_instrumento` | Código, nombre y cada cuánto cotiza | Viene cargada con los seis tipos. La ON cotiza cada 100 de valor nominal y el resto por unidad |
| `instrumento` | Tipo, ticker, nombre, moneda y vencimiento | Ticker y moneda son únicos de a dos, así AAPL y AAPLD son dos instrumentos. El vencimiento es obligatorio si es ON y queda vacío si no lo es |
| `tipo_operacion` | Código y nombre | COMPRA y VENTA. Las rentas y los dividendos se suman en otra versión (C30) |
| `operacion` | Cuenta, instrumento, tipo, fecha, cantidad, precio unitario, moneda y comisión | Cuenta e instrumento obligatorios. Cantidad y precio mayores que cero, comisión cero o más. La moneda es la del instrumento. Ninguna venta puede dejar la posición en negativo |
| `posicion` (vista) | Cuenta, persona, instrumento, moneda, cantidad y costo | Se calcula de las operaciones con precio promedio |
| `tipo_gasto` y `gasto` | Categoría, persona (opcional), fecha, monto, moneda y descripción | Un gasto sin persona es comunitario. El monto es mayor que cero, con hasta 2 decimales |
| `tipo_ingreso` e `ingreso` | Categoría, persona, cuenta (opcional), fecha, monto, moneda y descripción | La persona es obligatoria |
| `resumen_mes` (función), `invertido_por_persona` e `invertido_grupo` (vistas) | Los dos bloques del resumen | Siempre una fila por moneda, nunca un total mezclado |

- **Moneda.** Un tipo de dato propio, `moneda`, que solo admite ARS y USD.
- **Autoría.** Todas las tablas llevan `creado_por`, `creado_en`, `modificado_por` y `modificado_en`. Las completa un trigger con el email de quien está conectado, y la app no las puede escribir.
- **Sin redondeo escondido.** Los montos admiten hasta 2 decimales, y las cantidades y los precios hasta 8. Si llega un decimal de más, la base lo rechaza en lugar de redondearlo.
- **Restricciones con nombre en español.** Cada restricción tiene su mensaje para la interfaz.
- **P1.** En P1 se suman `instrumento_fci`, `instrumento_on` e `instrumento_cedear` (C10), y la vista `ultimos_movimientos` (C26).

### Decisiones de dominio que cierra este plan

1. **La moneda de la operación es la del instrumento.** Se guarda en la operación, pero la base exige que coincida con la del instrumento, con una clave foránea doble (instrumento y moneda). Esa misma clave impide cambiarle la moneda a un instrumento que ya tiene operaciones. El formulario muestra la moneda fija apenas se elige el instrumento. Así el error de especie (AAPL contra AAPLD) no se puede guardar, en lugar de solo avisarse. Esto responde la pregunta abierta de la spec y cambia una fila de sus errores (ver sección 9).
2. **El costo de una compra es la cantidad por el precio, dividido cada cuánto cotiza, más la comisión.** Para una ON, 1.000 de valor nominal a 102,50 cuestan 1.025 más la comisión. Es la trampa de dominio anotada en `docs/modelo-de-datos.md`.
3. **Las operaciones de un mismo día se aplican en el orden en que se cargaron.** Sin hora no hay otra forma de saber cuál fue primero, y el orden cambia el costo cuando el mismo día hay una compra y una venta.
4. **La invitación es el email de la persona.** Quien administra la copia lo carga en el panel de Supabase. Desde la app no se puede borrar una persona que tiene email, para que nadie se quede afuera por error. Si la invitación se hace fuera de la app, sacarla también.
5. **La persona tiene email en lugar de apuntar al usuario de Supabase.** La invitación tiene que existir antes de que la persona entre por primera vez, y en ese momento su usuario todavía no existe.
6. **El vencimiento de la ON va en `instrumento`** y no en una tabla aparte. Así "una ON sin vencimiento no existe" es una restricción de una sola tabla, imposible de saltear. Los demás datos propios de cada tipo (C10) van en tablas de detalle, como dice el modelo de datos.

### Cómo se cierra el acceso

1. La persona toca "Entrar con Google". La app le pide a Google que muestre siempre el selector de cuentas, para que pueda elegir la correcta. En un iPhone con la app instalada, el login se abre en una ventana dentro de la app (T28).
2. Si es la primera vez que entra, Supabase llama al hook `antes_de_crear_usuario`. Si el email no está en `persona`, el hook rechaza con el texto de C3 y el email que se intentó usar, y el usuario no se crea.
3. Supabase vuelve a la app con el error en la URL (`error_description`). Si ese error es el del hook, la app muestra el texto de C3 y debajo "Probaste con …". Si es cualquier otro texto, la app no lo muestra y pone "No se pudo entrar con Google. Probá de nuevo." Así nadie puede armar un link que muestre un mensaje inventado dentro de la app.
4. Si la persona entra, la app le pregunta a la base `es_miembro()`. Si le sacaron la invitación después de su primer ingreso, la app cierra la sesión y muestra el texto de C3.
5. Todas las tablas exigen `es_miembro()` por RLS. Sin sesión, o con la sesión de alguien no invitado, la API no devuelve nada.

## 6. Guardas de la constitución

| Regla | Guarda | Tareas |
|---|---|---|
| 1. Español | `index.html` declara `lang="es-AR"`. Todo error de la base pasa por un mapeo a español, y un test falla si alguna restricción no tiene su mensaje. Un error desconocido muestra un texto genérico en español, nunca el de Postgres. El resto de los textos se revisa en el navegador | T1, T16, verify |
| 2. Nunca sumar pesos con dólares | El tipo `moneda` en la base. La moneda de la operación tiene que ser la del instrumento. Toda suma se hace en SQL agrupada por moneda, con tests que cargan las dos monedas con los mismos números para detectar una mezcla. El componente que muestra montos exige la moneda | T4, T5, T6, T7, T12, T14, T18 |
| 3. Datos reales solo en la base | Un test recorre los archivos versionados y falla si encuentra un email fuera de `example.com`, un Excel fuera de `data/sample/` o un archivo en `data/real/`. Las semillas usan solo nombres y emails ficticios | T2, T13 |
| 4. Toda operación tiene cuenta y cada cuenta un dueño | `not null` y claves foráneas en `operacion.cuenta_id` y `cuenta.persona_id`, con tests que intentan guardar sin ellas | T4, T6 |
| 5. Sin precio no es cero | En la v1 no hay precios. La posición muestra cantidad y costo, que siempre existen. Un test fija las columnas de la vista `posicion`, para que nadie agregue un valor actual que pueda salir en cero sin pasar por el plan de la v2. Ese plan define la guarda de verdad | T7 |
| 6. Nada específico de un grupo en el código | Personas, bancos, brokers y categorías son filas de la base. Un test falla si el código de `src/` tiene como texto literal un nombre de las semillas (categorías, tipos de cuenta, personas o entidades de ejemplo). La configuración de cada copia va en `.env`, y un test exige que `.env.example` liste cada variable que usa el código | T13, T15, T29 |
| 7. Secretos solo en `.env` | `.env` y `.env.*` no se versionan, salvo `.env.example` sin valores. Un test falla si un archivo versionado tiene algo con forma de secreto: tokens JWT, claves `sb_secret_`, secretos de Google `GOCSPX-` o contraseñas dentro de una URL de Postgres. Las variables `VITE_` llegan al navegador, así que ninguna puede tener SECRET, TOKEN o PASSWORD en el nombre. El secreto de Google vive solo en el panel de Supabase | T1, T2, T15 |

## 7. Lista de tareas

Las tareas van en cinco fases: proyecto, base de datos, app, P1 y publicación. Las de P1 quedan al final, así la v1 se puede cerrar sin ellas si hace falta. Cada tarea sigue el ciclo de `CLAUDE.md`: test que falla, código, suite completa en verde y un commit con el id de la tarea.

### Fase 0. Proyecto

**T1. Esqueleto del proyecto.** `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.env.example` y `.gitignore`.
- Vite, React y TypeScript, con Vitest en los cuatro grupos y los scripts `dev`, `build`, `test`, `typecheck` y `verificar`.
- `index.html` con `lang="es-AR"` y viewport de celular. El `.gitignore` deja pasar `.env.example`.
- **Test.** `tests/repo/esqueleto.test.ts` verifica que `index.html` declare `lang="es-AR"` (regla 1) y que `.env.example` esté versionado y sin valores (regla 7). `src/App.test.tsx` verifica que la app monte sin errores.
- **Depende de** nada.

**T2. Guardas del repositorio.** `scripts/guardas.ts` y `tests/repo/guardas.test.ts`.
- Detectores de secretos, de emails fuera de `example.com`, de Excel fuera de `data/sample/` y de archivos en `data/real/`.
- **Test.** Primero cada detector contra un texto falso armado en memoria, para comprobar que detecta. Después, la pasada sobre todos los archivos de `git ls-files` (reglas 3 y 7).
- **Depende de** T1.

### Fase 1. Base de datos

Cada tarea de esta fase agrega un archivo de migración en `supabase/migrations/` y sus tests en `tests/base/`. Ninguna toca un proyecto real de Supabase hasta T15.

**T3. Base de prueba.** `supabase/config.toml`, `tests/base/supabase-de-fabrica.sql` y `tests/base/crear-base.ts`.
- Un helper levanta PGlite, aplica el archivo que imita a Supabase y después cada migración en orden. Permite consultar como miembro (con un email), como anónimo y como administrador.
- **Test.** `tests/base/crear-base.test.ts` verifica que la base arranque, que `auth.jwt()` devuelva el email simulado y que el anónimo no tenga email.
- **Depende de** T1.

**T4. Personas y cuentas.** Migración `personas_cuentas`.
- Crea el tipo `moneda` y las tablas `persona`, `tipo_cuenta` (con sus cuatro filas) y `cuenta`.
- **Test.** `tests/base/personas-cuentas.test.ts`:
  - C5. Una persona con nombre se guarda y se le puede asignar una cuenta. Sin email es una persona que no entra a la app.
  - C6. Una cuenta sin dueño, sin tipo o sin entidad se rechaza.
  - C7. Una persona con cuentas no se borra, y el error nombra la restricción de cuentas.
  - Regla 4.
- **Depende de** T3.

**T5. Instrumentos.** Migración `instrumentos`.
- Crea `tipo_instrumento` (seis tipos, con la ON cotizando cada 100) e `instrumento`.
- **Test.** `tests/base/instrumentos.test.ts`:
  - C8. AAPL en pesos y AAPLD en dólares conviven, y un segundo AAPL en pesos se rechaza. Una moneda que no sea ARS ni USD se rechaza (regla 2).
  - C9. Una ON sin vencimiento se rechaza, y una acción con vencimiento también.
- **Depende de** T4.

**T6. Operaciones.** Migración `operaciones`.
- Crea `tipo_operacion` y `operacion`.
- Agrega un trigger que, cada vez que se agrega, edita o borra una operación, recalcula la cantidad en orden (por fecha y orden de carga). Si alguna venta queda sin respaldo, rechaza el cambio con el error `LH001`, que lleva la fecha, la venta y lo que había. Mientras valida, bloquea esa cuenta e instrumento, para que dos ventas a la vez no pasen las dos.
- **Test.** `tests/base/operaciones.test.ts`:
  - C11. Sin cuenta, sin instrumento, sin fecha, sin precio o con cantidad 0 o negativa, se rechaza. La comisión vacía queda en 0.
  - C14. Con 10 en cartera, una venta de 15 se rechaza con `LH001` y dice que hay 10.
  - Error "editar una compra vieja". Mover una compra para que quede después de su venta se rechaza y nombra la venta. Borrar esa compra también se rechaza.
  - Decisión 1. Una operación en otra moneda que la del instrumento se rechaza, y cambiar la moneda de un instrumento con operaciones también.
  - C7. Una cuenta con operaciones no se borra.
- **Depende de** T5.

**T7. Posición con costo promedio.** Migración `posicion`.
- Crea la función de paso, el agregado `costo_promedio` y la vista `posicion`, con `security_invoker` y solo con las posiciones de cantidad mayor que cero.
- **Test.** `tests/base/posicion.test.ts`:
  - C12. El ejemplo de la spec (10 a $ 100, 10 a $ 200 y una venta de 5) da 15 con un costo de $ 2.250. La comisión de la compra se suma al costo y la de la venta no lo cambia. Una ON de 1.000 a 102,50 cuesta 1.025.
  - C13. Editar o borrar una operación cambia la vista sin hacer nada más.
  - Decisión 3. Una compra y una venta del mismo día se aplican en el orden de carga.
  - Regla 5. Las columnas de la vista son exactamente las del esquema.
- **Depende de** T6.

**T8. Gastos e ingresos.** Migración `gastos_ingresos`.
- Crea `tipo_gasto` y `tipo_ingreso` con sus categorías, y las tablas `gasto` e `ingreso`.
- **Test.** `tests/base/gastos-ingresos.test.ts`:
  - C16. Un gasto sin persona se guarda y es comunitario. Con persona, también se guarda.
  - C17. Un ingreso sin persona se rechaza. Sin cuenta, se guarda.
  - C18. En una base nueva están las 8 categorías de gastos y las 2 de ingresos.
  - Error de montos. Un monto 0, negativo o con 3 decimales se rechaza, y no se redondea.
  - C7. Una persona con gastos o ingresos no se borra.
- **Depende de** T4.

**T9. Autoría.** Migración `autoria`.
- Agrega las columnas y el trigger de autoría en todas las tablas.
- **Test.** `tests/base/autoria.test.ts`:
  - C27. Lo que carga un miembro queda con su email y la hora. Si la app manda otro `creado_por`, se ignora.
  - Error "dos personas editan a la vez". Gana la última edición, y `modificado_por` es quien la hizo.
  - Toda tabla de `public` tiene las cuatro columnas y el trigger. Esto vale también para las tablas que vengan después.
- **Depende de** T6 y T8.

**T10. Acceso a los datos.** Migración `acceso`.
- Crea `es_miembro()` y activa RLS con políticas en todas las tablas. Da permisos explícitos por rol. Deja `persona.email` sin permiso de escritura para la app y agrega un trigger que impide borrar desde la app una persona con email (`LH003`).
- **Test.** `tests/base/acceso.test.ts`:
  - C1. El anónimo no ve ninguna fila de ninguna tabla ni vista, y un usuario conectado que no está invitado tampoco.
  - Un miembro ve y edita todo, porque todos ven todo. Pero no puede escribir el email de una persona ni borrar una persona con email.
  - Toda tabla de `public` tiene RLS activo. Esto vale también para las que vengan después.
- **Depende de** T9.

**T11. Hook de invitación.** Migración `invitacion`.
- Crea la función `antes_de_crear_usuario(event jsonb)`. Solo la puede ejecutar `supabase_auth_admin`.
- **Test.** `tests/base/invitacion.test.ts`:
  - C3. Un email no invitado recibe un error 403 con el texto exacto de C3 y el email que se intentó usar. Uno invitado pasa, sin importar las mayúsculas.
  - Ni un usuario conectado ni el anónimo pueden ejecutar la función. Así nadie puede averiguar qué emails están invitados.
- **Depende de** T10.

**T12. Resumen.** Migración `resumen`.
- Crea la función `resumen_mes(mes)` y las vistas `invertido_por_persona` e `invertido_grupo`.
- **Test.** `tests/base/resumen.test.ts`:
  - C21. Con ingresos y gastos en las dos monedas, cada moneda tiene sus ingresos, sus gastos y lo que queda, y no hay ninguna fila sin moneda (regla 2).
  - C22. Pedir otro mes devuelve solo lo de ese mes.
  - Error "mes sin movimientos". Vuelven las dos monedas en cero.
  - C23. Cada persona y el grupo tienen su total a costo por moneda. Una persona sin operaciones aparece marcada como sin inversiones.
  - C19. Editar o borrar un gasto cambia el resumen.
- **Depende de** T7 y T10.

**T13. Semillas de ejemplo.** `supabase/seed.sql`.
- Datos ficticios para el proyecto de desarrollo: dos personas, cuentas en entidades de ejemplo, instrumentos, operaciones, gastos e ingresos, en las dos monedas. No se cargan en la copia real.
- **Test.**
  - `tests/base/semillas.test.ts` verifica que las semillas carguen sobre las migraciones sin errores y que sus emails sean de `example.com` (regla 3, C28).
  - `tests/repo/sin-datos-del-grupo.test.ts` verifica que ningún texto literal de `src/` coincida con un nombre de las semillas o de las categorías (regla 6).
- **Depende de** T12.

### Fase 2. App

T15 y T17 necesitan los pasos de tu lado de la sección 9. Si esos pasos demoran, T14, T16 y T18 pueden adelantarse, porque no tocan Supabase.

**T14. Formato y números.** `src/dominio/formato.ts`, `numeros.ts` y `fechas.ts`.
- **Test.** `src/dominio/*.test.ts`:
  - C24. Los montos salen como `$ 25.291,50` y `US$ 25.291,50`, y no existe una función que formatee sin moneda.
  - El parser acepta `1.234,56` y `1234,56`, y rechaza `0.5` con "Usá coma para los decimales". También rechaza el cero, los negativos y los decimales de más.
  - El mes actual y la fecha futura se calculan bien con un reloj fijo.
- **Depende de** T1.

**T15. Conexión con Supabase.** `src/config.ts`, `src/datos/cliente.ts`, `src/datos/tipos-base.ts` (generado), `src/datos/repositorio.ts` y `tests/interfaz/repositorio-falso.ts`.
- Lee la configuración de `.env` y falla con un mensaje en español si falta algo. Sube las migraciones al proyecto de desarrollo y genera los tipos.
- Define la interfaz del repositorio, con una versión real con Supabase y otra falsa en memoria para los tests. Si una edición o un borrado no toca ninguna fila, da error en lugar de pasar por bueno.
- **Test.**
  - `src/config.test.ts`. Sin variables, falla con un mensaje en español. `.env.example` lista todas las variables `VITE_` que usa el código, y ninguna tiene SECRET, TOKEN o PASSWORD en el nombre (reglas 6 y 7).
  - `src/datos/repositorio.test.ts`. Una edición que no encuentra la fila da "No se encontró. Puede que alguien lo haya borrado".
- **Depende de** T13 y T14.

**T16. Mensajes de error en español.** `src/datos/errores.ts`.
- Traduce cada error de la base y de la red a un mensaje en español, y si corresponde lo asocia a un campo.
- **Test.**
  - `src/datos/errores.test.ts`. C7 nombra qué tiene en uso lo que se quiere borrar. C14 arma "La cuenta solo tiene 10 …" con los datos de `LH001`. Sin conexión da su propio mensaje. Un error desconocido da el texto genérico y nunca muestra texto de Postgres.
  - `tests/base/mensajes.test.ts`. Toda restricción de la base tiene su mensaje en español (regla 1).
- **Depende de** T13.

**T17. Entrar y salir.** `src/acceso/` y `src/pantallas/Entrar.tsx`.
- Sesión, rutas protegidas, botón "Entrar con Google", lectura del error que vuelve en la URL, chequeo de `es_miembro()` y un "Salir" que borra los datos en memoria.
- Primero se prueba a mano, en el proyecto de desarrollo, qué llega en la URL cuando el hook rechaza. Si no llega el texto del hook, se para y se decide con vos.
- **Test.** `src/acceso/*.test.tsx`:
  - C1. Sin sesión, cualquier ruta muestra la pantalla de entrar y ningún dato.
  - C2. Con una sesión de miembro se llega al resumen.
  - C3. El error del hook muestra el texto exacto de C3 y "Probaste con …". Una persona que dejó de estar invitada sale de la app y ve el mismo texto.
  - C4. Salir lleva a la pantalla de entrar, y el botón de atrás no muestra datos.
  - Errores de login. Si Google se cancela o se cae, sale "No se pudo entrar con Google. Probá de nuevo.". Un texto inventado en la URL no se muestra.
- **Depende de** T15 y T16.

**T18. Estructura visual y piezas comunes.** `src/estilos/` y `src/componentes/`.
- Tokens de `DESIGN.md` con los ajustes de LemonHouse. Diseño para celular que se adapta a la notebook desde 768 px, con las piezas de layout que usan todas las pantallas: contenedor, grilla de tarjetas y columna de formulario (C33). Barra flotante con cargar gasto, ingreso y operación, y menú de secciones.
- Componentes `Monto` y `Autoria`, campo con error, confirmación dentro de la pantalla (sin ventanas del navegador) y formulario que no pierde lo escrito.
- **Test.** `src/componentes/*.test.tsx`:
  - C24. `Monto` siempre muestra la moneda.
  - C27. `Autoria` muestra "Cargado por Ana el …" con el nombre de la persona.
  - Error al guardar. El formulario muestra el error, conserva lo escrito y no dice "guardado". Si la sesión venció, lo escrito queda en el navegador y vuelve al entrar.
  - El diseño visual y su adaptación a la notebook (C33) se revisan solo en el navegador, en 390 px y 1.280 px.
- **Depende de** T14.

**T19. Personas y cuentas.** `src/pantallas/personas/` y `src/pantallas/cuentas/`.
- Listas, altas, ediciones y bajas. La lista de personas marca cuáles entran a la app, y cada cuenta muestra su dueño.
- **Test.**
  - C5. Una persona recién creada aparece para elegir al crear una cuenta.
  - C6. El formulario de cuenta pide dueño, tipo y entidad antes de enviar.
  - C7. Al borrar una cuenta en uso, la pantalla muestra qué la usa y la cuenta sigue en la lista.
- **Depende de** T17 y T18.

**T20. Instrumentos.** `src/pantallas/instrumentos/`.
- **Test.**
  - C8. Se cargan tipo, ticker (pasado a mayúsculas), nombre y moneda.
  - C9. Al elegir ON aparece el vencimiento, y sin él el formulario no se envía.
- **Depende de** T17 y T18.

**T21. Operaciones y posición.** `src/pantallas/operaciones/` y el detalle de cuenta con su posición.
- Al elegir el instrumento, la moneda queda fija y se ve el total calculado antes de guardar.
- **Test.**
  - C11. El formulario pide cuenta, instrumento, fecha, cantidad y precio. La comisión es opcional.
  - C12. El detalle de la cuenta muestra la cantidad y el costo de cada instrumento.
  - C13. Después de editar una operación, la posición se vuelve a pedir y cambia.
  - C14. Una venta rechazada muestra "La cuenta solo tiene 10 …" y el formulario no se cierra.
  - Error de fecha futura. Pide confirmar dentro de la pantalla.
- **Depende de** T19 y T20.

**T22. Gastos e ingresos.** `src/pantallas/gastos/` y `src/pantallas/ingresos/`.
- **Test.**
  - C16. Un gasto se guarda sin elegir persona.
  - C17. El ingreso pide persona y no pide cuenta.
  - C19. Después de editar o borrar, el resumen se vuelve a pedir.
  - Error de monto 0 o negativo. El campo queda marcado.
  - Error de fecha futura. Pide confirmar.
- **Depende de** T19.

**T23. Resumen.** `src/pantallas/Resumen.tsx`.
- Bloque del mes con selector de mes, y bloque de inversiones por persona y del grupo.
- **Test.**
  - C21. Muestra ingresos, gastos y lo que queda, en pesos y en dólares por separado.
  - C22. Arranca en el mes actual y cambia al elegir otro.
  - C23. Cada persona y el grupo tienen su total en cada moneda. Una persona sin operaciones dice "Sin inversiones".
  - C24. No hay ningún monto sin moneda en la pantalla.
  - Error "mes vacío". Muestra "Sin movimientos este mes" con ceros.
- **Depende de** T21 y T22.

### Fase 3. P1

**T24. Datos propios de cada instrumento (C10).** Migración `detalle_instrumentos` y formulario de instrumentos.
- Crea las tablas de detalle de FCI, ON y CEDEAR, y la función `guardar_instrumento`, que guarda el instrumento y su detalle en una sola transacción.
- **Test.**
  - `tests/base/detalle-instrumentos.test.ts`. C10: un FCI guarda su código CAFCI y un CEDEAR su ratio y subyacente. Un detalle de otro tipo se rechaza. Si falla el detalle, el instrumento no queda a medias.
  - Test de interfaz. Los campos aparecen según el tipo.
  - Los tests de T9 y T10 ya obligan a que las tablas nuevas tengan autoría y RLS.
- **Depende de** T20.

**T25. Filtros de operaciones (C15).** Lista de operaciones.
- **Test.** C15: filtrar por persona, por cuenta o por instrumento deja solo esas operaciones.
- **Depende de** T21.

**T26. Categorías (C20).** `src/pantallas/categorias/`.
- **Test.** C20, en la base y en la interfaz: una categoría nueva aparece al cargar un gasto, y al renombrarla los gastos anteriores muestran el nombre nuevo. Un nombre repetido se rechaza.
- **Depende de** T22.

**T27. Resumen por persona y últimos movimientos (C25, C26).** Migración `resumen_persona` y pantalla de resumen.
- `resumen_mes` acepta una persona, se crea la vista `ultimos_movimientos` y el resumen suma el carrusel de personas.
- **Test.**
  - C25, en la base y en la interfaz. Con una persona elegida se ven sus ingresos, sus gastos y los comunitarios.
  - C26. Se ven los últimos gastos e ingresos, del más nuevo al más viejo.
- **Depende de** T23.

**T28. Instalable como app (C32).** `public/manifest.webmanifest`, `public/iconos/`, `index.html` y `src/acceso/`.
- Manifest con nombre, colores e íconos de `DESIGN.md`, más las etiquetas que pide el iPhone para abrir a pantalla completa.
- En un iPhone con la app instalada, "Entrar con Google" abre el login en una ventana que iOS mantiene dentro de la app. Cuando la ventana termina, avisa a la app y la app toma la sesión. Si iOS bloquea la ventana, la app lo dice y no se queda esperando. En Android, en la notebook y en Safari sin instalar, el login sigue igual que en T17.
- **Test.**
  - `tests/repo/manifest.test.ts`. El manifest tiene nombre, inicio, modo pantalla completa, los colores de `DESIGN.md` y los íconos de 192 y 512 px, con uno adaptable. `index.html` lo enlaza junto con el ícono para iPhone.
  - `src/acceso/ventana-ios.test.tsx`. Con la app instalada en iPhone, el login abre la ventana en el mismo toque, la sesión llega cuando la ventana avisa, y si la ventana se bloquea sale el aviso.
  - **Solo navegador.** Instalar en un celular de verdad y entrar con Google.
- **Depende de** T17 y T18.

### Fase 4. Publicación

**T29. Guía para levantar una copia y publicar.** `docs/levantar-una-copia.md`, `docs/nginx-ejemplo.conf` y `scripts/publicar.mjs`.
- Paso a paso para un grupo nuevo: proyecto de Supabase, migraciones, cliente de Google, hook, invitaciones, `.env`, build y Nginx. Incluye cómo sacarle el acceso a alguien: borrar el email de su persona y su usuario en Supabase.
- El script sube `dist/` al destino que indica `.env`.
- **Test.** `tests/repo/publicacion.test.ts`. El script toma el destino de `.env` y falla con un mensaje en español si falta. Toda variable que leen `src/` y `scripts/` está en `.env.example` (regla 6). La publicación real y C2 en el sitio publicado se prueban solo en el navegador.
- **Depende de** T23, y de T24 a T28 si entran.

## 8. Cobertura

| Criterio | Tareas | Cómo se verifica |
|---|---|---|
| C1 (P0) | T10, T17 | `acceso.test.ts` en la base y test de rutas en la interfaz |
| C2 (P0) | T17 | Test de rutas con sesión falsa. **Solo navegador** con Google de verdad |
| C3 (P0) | T11, T17 | `invitacion.test.ts` y test del error en la URL. **Solo navegador** con una cuenta de Google no invitada, revisando después en Supabase que no se creó ningún usuario |
| C4 (P0) | T17 | Test de salir y volver atrás. **Solo navegador** con el botón de atrás real |
| C5 (P0) | T4, T19 | `personas-cuentas.test.ts` y test de pantalla |
| C6 (P0) | T4, T19 | `personas-cuentas.test.ts` y test de pantalla |
| C7 (P0) | T4, T6, T8, T16, T19 | Tests de base de cada borrado, test del mensaje y test de pantalla |
| C8 (P0) | T5, T20 | `instrumentos.test.ts` y test de pantalla |
| C9 (P0) | T5, T20 | `instrumentos.test.ts` y test de pantalla |
| C10 (P1) | T24 | `detalle-instrumentos.test.ts` y test de pantalla |
| C11 (P0) | T6, T21 | `operaciones.test.ts` y test de pantalla |
| C12 (P0) | T7, T21 | `posicion.test.ts`, con el ejemplo de la spec, y test de pantalla |
| C13 (P0) | T7, T21 | `posicion.test.ts` y test de pantalla |
| C14 (P0) | T6, T16, T21 | `operaciones.test.ts`, test del mensaje y test de pantalla |
| C15 (P1) | T25 | Test de pantalla |
| C16 (P0) | T8, T22 | `gastos-ingresos.test.ts` y test de pantalla |
| C17 (P0) | T8, T22 | `gastos-ingresos.test.ts` y test de pantalla |
| C18 (P0) | T8 | `gastos-ingresos.test.ts` sobre una base nueva |
| C19 (P0) | T12, T22 | `resumen.test.ts` y test de pantalla |
| C20 (P1) | T26 | Test de base y test de pantalla |
| C21 (P0) | T12, T23 | `resumen.test.ts` y test de pantalla |
| C22 (P0) | T12, T23 | `resumen.test.ts` y test de pantalla |
| C23 (P0) | T12, T23 | `resumen.test.ts` y test de pantalla |
| C24 (P0) | T14, T18, T23 | Tests de formato, de `Monto` y del resumen. **Solo navegador** para recorrer todas las pantallas |
| C25 (P1) | T27 | Test de base y test de pantalla |
| C26 (P1) | T27 | Test de base y test de pantalla |
| C27 (P0) | T9, T18 | `autoria.test.ts` y test de `Autoria` |
| C28 (P0) | T2, T13, T29 | Guardas del repo y `semillas.test.ts`. **Solo navegador**: seguir la guía en un proyecto nuevo |
| C32 (P1) | T28 | `manifest.test.ts` y `ventana-ios.test.tsx`. **Solo navegador**: instalar en un celular de verdad y entrar con Google |
| C33 (P1) | T18, T19 a T23 | **Solo navegador**. Cada pantalla en 390 px y 1.280 px, con el resumen en dos bloques lado a lado y las listas en grilla |
| C29 (P2) | Ninguna | No se construye. Los precios van a ser una tabla aparte con fecha y fuente, y la vista `posicion` no tiene ningún valor actual (test de la regla 5 en T7) |
| C30 (P2) | Ninguna | No se construye. `tipo_operacion` es una tabla, y el trigger y el costo rechazan con error un tipo sin regla. Sumar uno obliga a escribir su regla |
| C31 (P2) | Ninguna | No se construye. La operación apunta a la cuenta y no a la persona, que es lo que permite el cambio descrito en `docs/modelo-de-datos.md` |

| Error de la spec | Tareas | Cómo se verifica |
|---|---|---|
| Moneda distinta de pesos o dólares | T5 | `instrumentos.test.ts` |
| Operación en otra moneda que la del instrumento | T6, T21 | `operaciones.test.ts` y moneda fija en el formulario (decisión 1) |
| Monto, cantidad o precio en cero o negativo | T6, T8, T14, T22 | Tests de base, del parser y de pantalla |
| Fecha futura | T14, T21, T22 | Test de la función y de la confirmación en pantalla |
| Venta mayor que la posición | T6, T21 | Igual que C14 |
| Editar una compra vieja | T6 | `operaciones.test.ts` |
| Borrar algo en uso | T4, T6, T8, T16, T19 | Igual que C7 |
| Mes sin movimientos | T12, T23 | `resumen.test.ts` y test de pantalla |
| Persona sin operaciones | T12, T23 | `resumen.test.ts` y test de pantalla |
| Otra cuenta de Google | T11, T17 | Email en el error del hook y "Probaste con …". **Solo navegador** |
| Google no responde o se cancela | T17 | Test del error en la URL. **Solo navegador** cancelando en Google |
| Error al guardar | T16, T18 | Test de mensajes y del formulario que conserva lo escrito |
| Dos personas editan a la vez | T9 | `autoria.test.ts` |
| Login de iPhone que deja la sesión en Safari | T28 | `ventana-ios.test.tsx`. **Solo navegador** en un iPhone con la app instalada |

## 9. Lo que hace falta de tu lado

**Antes de T15.** Cuando lleguemos te acompaño paso a paso.
1. Crear en Supabase un proyecto de desarrollo, aparte del que va a tener los datos reales, así las pruebas no ensucian lo real. El plan Free permite dos proyectos.
2. Crear en Google Cloud un cliente OAuth para web y cargar su ID y su secreto en Supabase, en la sección de proveedores de Authentication. En la misma sección se apaga el login con email.
3. Cargar en `.env` la URL del proyecto, la key publicable, la contraseña de la base y un token personal de Supabase para la CLI.
4. Después de T11, activar el hook en el panel de Supabase y cargar tu email en una persona del proyecto de desarrollo. Tu email queda solo en esa base, nunca en el repo.

**Antes de T28.** Tener a mano los celulares donde se va a instalar. Si nadie usa iPhone, la parte de iPhone de T28 se saltea.

**Antes de T29.** Crear el proyecto real y el subdominio con HTTPS en el servidor, y repetir los pasos de Google y del hook.

**Documentos actualizados al aprobar el plan.**
- **Spec.** La fila "Operación en una moneda distinta a la del instrumento" pasó de "se avisa antes de guardar" a "no puede pasar", y su pregunta abierta quedó cerrada con la decisión 1. Se sumaron C32, C33 y el error del login en iPhone.
- **`docs/modelo-de-datos.md`.** Su sección "A cerrar en el design-plan de la v1" pasó a "Cerrado en el plan de la v1", con las decisiones 1, 5 y 6.
- **`DESIGN.md`.** Se sumaron las secciones "Pantallas grandes" y "App instalable".

## 10. Riesgos y notas

- **PGlite usa Postgres 18, y Supabase puede estar en una versión anterior.** Las migraciones evitan lo que es nuevo de la 18, como `uuidv7()`. En la 18 los `not null` tienen nombre propio y antes no, así que el mapeo de errores los reconoce por la columna. La prueba final es T15, cuando las migraciones se suben al proyecto de desarrollo.
- **El mensaje del hook en la URL** se confirmó leyendo el código de Supabase Auth, no probándolo. T17 lo prueba antes que nada.
- **Backup.** El PRD pide un backup diario cifrado de la base real. Eso no está en la spec de la v1, y no conviene depender de los backups del plan Free. Conviene armarlo como un cambio aparte antes de dejar el Excel.
- **Supabase Free pausa los proyectos** después de una semana sin uso. Si pasa, se reactiva desde el panel.
- **Dos ventas a la vez** se evitan con un bloqueo en la base. PGlite trabaja con una sola conexión, así que este caso no se puede testear y queda revisado en el código.
- **Para la v2.** La CAFCI da el valor de un FCI cada 1.000 cuotapartes, y en la v1 se carga por cuotaparte, así que la v2 tiene que convertirlo. Las rentas y los dividendos necesitan su regla de costo antes de poder cargarse.
