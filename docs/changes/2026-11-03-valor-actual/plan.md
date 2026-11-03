# Plan del cambio: valor actual de las posiciones

> Cambio sobre la v1. Fecha 2026-11-03. Implementa la spec `docs/changes/2026-11-03-valor-actual/spec.md`. La spec dice qué se construye. Este plan dice cómo, con qué herramientas y en qué orden.
>
> Aprobado el 2026-11-03.

## 1. Objetivo

Mostrar el valor actual y el rendimiento de cada posición y de lo invertido por persona y del grupo, con la fecha del valor y "Sin precio" cuando falta. Los valores los escribe un proceso externo, que llega en el cambio siguiente.

## 2. Contexto del problema

La v1 muestra solo el costo de compra. Los FCI se publican cada mil cuotapartes y las ON cotizan cada 100 de valor nominal, así que la cuenta a mano es fácil de errar.

## 3. Spec de referencia

`docs/changes/2026-11-03-valor-actual/spec.md`, aprobada el 2026-11-03.

## 4. Código existente

- **Se reusa.** El tipo `moneda`, `agregar_autoria()`, la política `solo_miembros`, `es_miembro()`, la clave foránea doble instrumento y moneda (la misma de `operacion`), el componente `Monto`, `fechas.ts` con reloj fijo y el helper de PGlite.
- **Se toca.** La vista `posicion` (se le suman columnas al final), las vistas `invertido_por_persona` e `invertido_grupo`, `PosicionDeCuenta.tsx`, `Resumen.tsx`, `errores.ts`, `seed.sql`, `tipos-base.ts` (se regenera), `tests/base/crear-base.ts` (se suma el rol nuevo), el test de columnas de `posicion`, `docs/levantar-una-copia.md` y `docs/modelo-de-datos.md`.
- **No se toca.** `operacion`, el costo promedio y la CSP de Nginx. La app sigue hablando solo con Supabase.

## 5. Stack y arquitectura

| Decisión | Alternativa descartada y por qué |
|---|---|
| **Tabla `precio`** con una fila por instrumento y fecha: valor, `cada`, moneda, fuente y hora de captura. La fuente reemplaza la fila si corrige un valor | Una fila por captura (historial de revisiones). Para valuar alcanza con el último, y el historial ya está en la base de mercado |
| **`precio.cada` lo declara quien escribe el valor**: 1.000 para la CAFCI, 100 para una ON y 1 para el resto. El valor actual es cantidad × valor ÷ `cada` | Usar `tipo_instrumento.precio_cada`, que en el FCI vale 1 porque las operaciones van por cuotaparte. También queda descartado que el proceso externo convierta antes de escribir: la conversión quedaría fuera del repo y sin tests |
| **Rol de Postgres `carga_precios`**, creado en la migración sin login. Quien administra la copia le da login y contraseña desde el panel. No tiene permisos sobre ninguna tabla: solo ejecuta `guardar_precios(jsonb)` e `instrumentos_a_cotizar()`, las dos `security definer` | Usar la key secreta de Supabase. Saltea RLS y puede leer todo, incluidos los datos personales |
| **`guardar_precios(jsonb)` recibe todos los precios de una corrida**, guarda todos o ninguno y reemplaza por instrumento y fecha. Cambiado en T1: el trigger de autoría llama a `auth.jwt()`, y escribir directo en la tabla obligaba a darle a `carga_precios` permisos sobre el esquema `auth` de Supabase | Dar permisos sobre la tabla a `carga_precios`. Abre el esquema `auth`, y la regla del reemplazo quedaría en n8n, sin tests |
| **`instrumentos_a_cotizar()` como función `security definer`** que devuelve id, tipo, ticker, moneda y código CAFCI, ejecutable solo por `carga_precios` | Una vista. El test "toda vista le muestra datos a un miembro" la obligaría a abrirse a los miembros, y con `security_invoker` el RLS no la dejaría leer a `carga_precios` |
| **Si cambia el código CAFCI o el ticker, se borran los precios del instrumento** (trigger). El proceso externo los vuelve a traer en su próxima corrida | Guardar en `precio` el código con el que se trajo y filtrar por él. Suma una columna y una condición en cada consulta, para un caso raro |
| **Se suman columnas al final de `posicion`**: `fecha_valor`, `valor`, `rendimiento`, `rendimiento_pct` y `sin_codigo_cafci`. Sin precio, `valor` y el rendimiento son `null`, nunca 0 | Una vista aparte para el valor. La app tendría que pedir dos vistas y cruzarlas en el navegador |
| **Valor y rendimiento se calculan en SQL**, como el costo (regla de la v1: las cuentas de plata se hacen en la base) | Calcular en la app |
| **Los totales del resumen cuentan los instrumentos sin precio** (`instrumentos_sin_precio`, sin repetir instrumento). El valor es la suma de lo conocido, y el rendimiento es `null` si falta alguno | Excluir del costo las posiciones sin precio para que el rendimiento "cierre". Escondería costo real |
| **"Desactualizado" se decide en la app** (`fechas.ts`, más de 7 días contra hoy) | En SQL con `current_date`. La base corre en UTC y la regla no se podría probar con el reloj fijo que ya usan los tests de la app |
| **El rendimiento va debajo del valor, en la misma celda**, en el celular y en la notebook. Cambiado en T11: tener una columna solo en la notebook obligaba a repetir el rendimiento en la página y esconder una copia con CSS | Cinco columnas en 390 px, que no entran. Y una columna solo para la notebook, que duplica el contenido |

Los tests siguen en Vitest, con los mismos cuatro grupos.

## 6. Guardas de la constitución

| Regla | Guarda | Tareas |
|---|---|---|
| 1. Español | `mensajes.test.ts` exige un mensaje en español para cada restricción nueva de `precio` | T1 |
| 2. Pesos y dólares | El precio va en la moneda de su instrumento (clave foránea doble). Los totales siguen siendo una fila por moneda, con tests que cargan las dos monedas con los mismos números | T1, T5 |
| 3. Datos reales solo en la base | Los precios de las semillas son ficticios. `semillas.test.ts` sigue corriendo | T6 |
| 4. Operación con cuenta | No cambia | — |
| 5. Sin precio no es cero | Tres guardas. Test de base: sin precio, `valor` es `null`. Test de componente: `ValorActual` con `null` muestra "Sin precio" y nunca "$ 0". Tipos: `valor` es `number \| null` y `Monto` no acepta `null` | T4, T10 |
| 6. Nada del grupo en el código | Fuentes y códigos son datos. `sin-datos-del-grupo.test.ts` sigue corriendo | T6 |
| 7. Secretos en `.env` | La contraseña de `carga_precios` no está en el repo: la pone quien administra la copia. Siguen corriendo las guardas de secretos | T1, T13 |

## 7. Lista de tareas

Cada tarea sigue el ciclo de `CLAUDE.md`: test que falla, código, suite completa en verde y un commit con el id de la tarea.

### Fase 1. Base

**T1. Tabla `precio` y rol `carga_precios`.** Migración `precio` y `tests/base/crear-base.ts`.
- Restricciones: valor mayor que 0 con hasta 8 decimales, `cada` mayor que 0, fuente no vacía, moneda del instrumento y una fila por instrumento y fecha. Borrar el instrumento borra sus precios.
- Autoría y RLS (miembros solo leen). `carga_precios` escribe solo con `guardar_precios(jsonb)`. Mensajes en `errores.ts`.
- **Test.** `tests/base/precio.test.ts`:
  - `carga_precios` guarda y reemplaza el valor de una fecha (error "la fuente corrige el valor"). Si un precio de la corrida es inválido, no se guarda ninguno.
  - `carga_precios` no puede leer ninguna tabla ni vista, ni escribir en `precio` sin la función.
  - Un miembro no puede escribir en `precio`, y el anónimo no ve nada.
  - Un precio en otra moneda que la del instrumento se rechaza (regla 2).
  - Siguen pasando los tests de toda tabla con autoría y RLS.
- **Depende de** nada.

**T2. `instrumentos_a_cotizar()`.** Migración `instrumentos_a_cotizar`.
- **Test.** Devuelve exactamente id, tipo, ticker, moneda y código CAFCI, sin cantidades ni personas. Solo la ejecuta `carga_precios`, y la lista de funciones para miembros no cambia.
- **Depende de** T1.

**T3. Precios que se borran al cambiar el código.** Trigger en `instrumento_fci` y en `instrumento`.
- **Test.** Si se cambia el código CAFCI o el ticker, los precios del instrumento desaparecen (error "se corrige el código CAFCI"). Si se edita otro dato, como el nombre, se quedan.
- **Depende de** T1.

**T4. Valor en `posicion`.** Migración `posicion_valor`.
- **Test.** `tests/base/posicion-valor.test.ts`:
  - C34. Toma el último valor y su fecha.
  - C35. 1.500 cuotapartes a 2.345.678,90 cada 1.000 dan 3.518.518,35.
  - C36. 1.000 VN a 102,50 cada 100 dan 1.025.
  - C37. Sin precio, `valor` es `null` y el costo sigue.
  - C39. Un FCI sin código tiene `sin_codigo_cafci` en verdadero.
  - C42. El rendimiento en monto y en porcentaje, y `null` sin precio.
- El test de columnas de `posicion` se actualiza con la lista nueva.
- **Depende de** T1.

**T5. Valor en el resumen.** Migración `resumen_valor`.
- **Test.** `tests/base/resumen-valor.test.ts`:
  - C40. Costo y valor por persona y del grupo, en las dos monedas.
  - C41. Con un instrumento sin precio, el total marca 1 sin precio. Si ese instrumento está en dos cuentas, cuenta una vez.
  - C42. El rendimiento es `null` si el total es parcial.
  - Regla 2. Las dos monedas con los mismos números no se mezclan.
- **Depende de** T4.

**T6. Semillas.** `supabase/seed.sql` suma precios de ejemplo: un FCI cada mil, una ON, un instrumento sin precio y un valor viejo.
- **Test.** `semillas.test.ts` sigue pasando.
- **Depende de** T5.

### Fase 2. App

**T7. Subir a dev y regenerar tipos.** `src/datos/tipos-base.ts`. Necesita a Noelia para subir las migraciones al proyecto de dev.
- **Test.** `npm run verificar` (tipos y build).
- **Depende de** T6.

**T8. `estaDesactualizado` y formato de porcentaje.** `src/dominio/fechas.ts` y `formato.ts`.
- **Test.** C38 con reloj fijo: 7 días no está desactualizado, 8 sí. El porcentaje sale en es-AR con signo (`+12,5 %`).
- **Depende de** nada.

**T9. Consultas.** `src/datos/consultas.ts` y el repositorio falso, con las columnas nuevas.
- **Test.** Se suma al test existente de consultas.
- **Adelantado en T7.** Al regenerar los tipos, `verificar` pidió las columnas nuevas en los datos falsos de los tests de pantalla, y se sumaron ahí. También apareció que `SinNulos` les quitaba el `null` a todas las columnas de las vistas, así que el valor habría quedado tipado como `number`. Ahora deja el `null` en `fecha_valor`, `valor`, `rendimiento` y `rendimiento_pct`, y un test de tipos en `repositorio.test.ts` lo exige (regla 5). Lo que queda de T9 es revisar `consultas.ts` cuando las pantallas pidan las columnas. **Cerrado en T12:** el repositorio pide `select('*')`, así que las columnas nuevas llegan sin cambiar nada.
- **Depende de** T7.

**T10. Componentes `ValorActual` y `Rendimiento`.** `src/componentes/`.
- **Test.**
  - C37 y regla 5. Con `null` dice "Sin precio", nunca "$ 0".
  - C38. Muestra "Valor al 02/11" y la marca de desactualizado.
  - C41. Muestra la marca de parcial con la cantidad sin precio.
  - C42. Usa verde o rojo según el signo y no aparece si el valor es parcial.
- **Depende de** T8.

**T11. Posición de la cuenta.** `src/pantallas/cuentas/PosicionDeCuenta.tsx`.
- **Test.**
  - C34. Muestra la columna de valor con su fecha.
  - C37. "Sin precio" en el instrumento sin valor.
  - C39. "Falta el código CAFCI" lleva al instrumento.
  - C42. Muestra el rendimiento.
- **Depende de** T9 y T10.

**T12. Resumen.** `src/pantallas/Resumen.tsx`.
- **Test.**
  - C40. Costo y valor por persona y del grupo, en cada moneda.
  - C41. La marca de parcial.
  - C42. El rendimiento del total.
- **Depende de** T9 y T10.

### Fase 3. Documentación

**T13. Guía y modelo.** `docs/levantar-una-copia.md` suma cómo darle login y contraseña a `carga_precios` y cómo conectarse por el pooler. `docs/modelo-de-datos.md` actualiza `precio` (una fila por fecha, sin hora, y la columna `cada`).
- **Test.** `publicacion.test.ts` sigue pasando. El paso del login se prueba a mano en dev.
- **Depende de** T1.

Al terminar siguen `verify-after-changes` y `/code-review`, y la spec del cambio se fusiona en la spec principal.

## 8. Cobertura

| Criterio | Tareas | Cómo se verifica |
|---|---|---|
| C34 (P0) | T4, T11 | `posicion-valor.test.ts` y test de pantalla |
| C35 (P0) | T4 | `posicion-valor.test.ts` con el ejemplo de la spec |
| C36 (P0) | T4 | `posicion-valor.test.ts` con el ejemplo de la spec |
| C37 (P0) | T4, T10, T11 | Test de base, de componente y de pantalla |
| C38 (P1) | T8, T10 | Test con reloj fijo y de componente |
| C39 (P1) | T4, T11 | Test de base y de pantalla |
| C40 (P0) | T5, T12 | `resumen-valor.test.ts` y test de pantalla |
| C41 (P0) | T5, T10, T12 | Test de base, de componente y de pantalla |
| C42 (P1) | T4, T5, T10, T11, T12 | Tests de base y de pantalla. **Solo navegador:** los colores verde y rojo en 390 px y 1.280 px |
| C29 (ELIMINA) | T4 | Pasa a cubrirse con C34, C37 y C38 |

| Error de la spec | Tareas | Cómo se verifica |
|---|---|---|
| Un instrumento nunca tuvo valor | T4, T5, T10 | Igual que C37 y C41 |
| El último valor es viejo | T8, T10 | Igual que C38 |
| La fuente corrige el valor de un día | T1 | `precio.test.ts` |
| Se corrige el código CAFCI | T3 | `precio.test.ts` |
| Confundir el valor cada mil con el de una cuotaparte | T4 | Igual que C35 |
| Posición vendida por completo | T4 | `posicion-valor.test.ts`: sigue sin aparecer |
| Mezclar monedas en un total | T1, T5 | Regla 2 en `precio.test.ts` y `resumen-valor.test.ts` |

## 9. Lo que hace falta de tu lado

- **En T7.** Estar para subir las migraciones al proyecto de dev.
- **En T13.** Darle login y contraseña a `carga_precios` en dev desde el panel de Supabase. La contraseña queda solo en la credencial de n8n, nunca en el repo. En el real se hace junto con el cambio 2.

## 10. Riesgos y notas

- **El pooler y los roles propios.** Supavisor acepta roles propios con el formato `carga_precios.<id-del-proyecto>`. Se confirma en T13 conectando desde la VM.
- **El valor de una ON amortizada** (pregunta abierta de la spec). Si cotiza sobre el residual, cambia la cuenta de C36 para esas ON. Se resuelve en el cambio de Open BYMA.
- **PGlite usa Postgres 18 y Supabase la 17.** Valen las mismas precauciones que en la v1.
- **Pendiente de la revisión de código (2026-11-03).** Quedan para un cambio aparte dos cosas de poco impacto en un grupo chico:
  - La regla del total parcial (valor, faltantes y rendimiento) está repetida en `invertido_por_persona` y en `invertido_grupo`. Si cambia C41 o C42, hay que cambiarla en las dos vistas, y los tests de `resumen-valor.test.ts` lo cubren.
  - El resumen recalcula `posicion` varias veces por persona y moneda, y la posición suma ahora un precio y un chequeo de código CAFCI por fila. Con pocas operaciones no se nota. Se suma al pendiente de la v1 sobre el detalle de cuenta, que pide todas las posiciones.
