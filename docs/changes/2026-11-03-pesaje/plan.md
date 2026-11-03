# Plan del cambio: Pesaje

> Cambio sobre la v1. Fecha 2026-11-03. Implementa la spec `docs/changes/2026-11-03-pesaje/spec.md`. La spec dice qué se construye. Este plan dice cómo, con qué herramientas y en qué orden.
>
> Aprobado el 2026-11-03.

## 1. Objetivo

Sumar Pesaje como un módulo opcional, apagado por defecto, con su propia lista de quiénes se pesan, la carga de todos juntos, la tabla con la variación coloreada según el objetivo de cada uno y un gráfico de evolución. No toca nada de lo financiero.

## 2. Contexto del problema

Hoy el pesaje semanal se anota en papel, y ver cómo viene cada uno obliga a buscar semanas anteriores y hacer la cuenta a mano. Una app aparte no se justifica, y LemonHouse ya está a mano.

## 3. Spec de referencia

`docs/changes/2026-11-03-pesaje/spec.md`, aprobada el 2026-11-03. La decisión del interruptor está en `decision-interruptor.md`, en la misma carpeta.

## 4. Código existente

- **Se reusa.**
  - En la base: `agregar_autoria()`, la política `solo_miembros` y `es_miembro()`.
  - En la app: el repositorio genérico (`listar`, `crear`, `editar`, `borrar`) y sus mensajes en `errores.ts`, más `Formulario`, `Campo`, `Carga`, `Encabezado`, `Autoria` y `Borrar`.
  - En el dominio: `leerNumero`, `hoy`, `esFutura` y `formatearFecha`.
  - En el estilo: los tokens `--color-gain` y `--color-loss`, y el patrón de pantallas de `Categorias.tsx` (lista con alta y edición) y de `movimientos.tsx` (lista por fecha).
  - En los tests: el helper de PGlite y el repositorio falso.
- **Se toca.**
  - Configuración: `config.ts` y `.env.example`.
  - Navegación: `rutas.ts`, `App.tsx`, `Estructura.tsx` y `main.tsx`.
  - Datos: `repositorio.ts`, el repositorio falso, `errores.ts`, `seed.sql` y `tipos-base.ts` (se regenera).
  - Tests que ya existen: `tests/base/acceso.test.ts` (funciones para miembros y datos en cada vista), `semillas.test.ts` y `sin-datos-del-grupo.test.ts`.
  - Documentación: `docs/modelo-de-datos.md`, `docs/levantar-una-copia.md` y `DESIGN.md`.
- **No se toca.** Ninguna tabla, vista ni pantalla financiera. `persona` sigue siendo solo de lo financiero.

## 5. Stack y arquitectura

| Decisión | Alternativa descartada y por qué |
|---|---|
| **Dos tablas nuevas.** `pesaje_integrante` (nombre, objetivo, activo) y `pesaje` (integrante, fecha, peso, observaciones) | Reusar `persona`. Las mascotas aparecerían en cuentas, gastos e ingresos, y la spec lo prohíbe (C45) |
| **`objetivo` es un texto con check** en `bajar`, `subir` o `ninguno`, con `ninguno` por defecto | Un `enum` de Postgres. Sumar un valor después (por ejemplo "mantener", que quedó para otra versión) es más incómodo que cambiar un check |
| **El peso es `numeric` mayor que 0, hasta 300 y con hasta 2 decimales**, igual que los montos (`scale(peso) <= 2`) | `real` o `double`. Un 57,30 podría volver como 57,2999 |
| **Una fila por integrante y fecha** (índice único) | Validarlo solo en la app. Dos cargas a la vez podrían duplicar |
| **La fecha futura se frena en la app, y la base solo frena lo que pasa de mañana** (trigger `LH006`). La base corre en UTC, así que a las 22 h de Argentina ya es "mañana" para ella | Un check con `current_date`. Un check tiene que ser inmutable, y en UTC rechazaría pesajes válidos de la noche |
| **La carga de todos juntos pasa por `guardar_pesajes(fecha, jsonb)`**, que guarda todos o ninguno (`security invoker`, así sigue pasando por RLS y autoría) | Varios `insert` desde la app. Si falla el tercero, quedarían guardados los dos primeros sin que se note |
| **La app valida cada renglón antes de enviar** (rango, decimales y duplicado contra lo ya cargado) y marca el renglón con el error (C51, C52). La base es la red de seguridad | Dejar todo a la base. Un error de un lote no dice en qué renglón está |
| **Vista `pesaje_con_variacion`** (`security_invoker`) con el nombre y el objetivo actuales del integrante y la variación contra su pesaje anterior (`lag` por integrante y fecha) | Calcular la variación en la app. Con el filtro, la app tendría que conservar los pesajes de los demás para no romper la cuenta (C57) |
| **El color de la variación se decide en la app** (`sentidoDeVariacion`, en `dominio/`), con el objetivo actual que trae la vista | En SQL. Es presentación, y en la app se prueba con un test de unidad |
| **El peso con punto se acepta como decimal** (`leerPeso`): sin coma, un único punto pasa a ser coma y después va por `leerNumero` con 2 decimales. "57.3" es 57,30, y "4.350" da "Usá hasta 2 decimales" | Usar `leerNumero` tal cual. Rechaza "57.3" con "Usá coma para los decimales", y la spec pide tomarlo |
| **El interruptor es `VITE_MODULO_PESAJE`**, leído por `leerConfiguracion()`. Solo `si` lo prende. Cualquier otro valor, o ninguno, lo deja apagado | Prenderlo con cualquier valor no vacío. Un `no` lo prendería |
| **Apagado, las rutas de Pesaje no se registran** y la dirección cae en el `*` que ya lleva al resumen (C43). `App` recibe `pesajeActivo` como prop para poder probarlo | Esconder solo la entrada del menú. La pantalla se abriría escribiendo la dirección |
| **Las tablas existen en todas las copias**, aunque Pesaje esté apagado. Las crean las migraciones | Migraciones condicionales. Complican subir la base, y una tabla vacía no molesta |
| **El gráfico es un SVG propio**, una línea con puntos, con la escala vertical entre el mínimo y el máximo de ese integrante más un margen. Cada punto es un pesaje real, así que una semana sin pesaje no se dibuja. Se arma con la skill `dataviz` | Sumar una librería de gráficos. Es una dependencia para un solo gráfico chico |
| **El gráfico aparece al filtrar por alguien**, arriba de la tabla | Una grilla con un gráfico por integrante sin filtro. Es más trabajo, y en el celular serían varios gráficos chicos |
| **Las pantallas viven en `src/pantallas/pesaje/`**: lista, carga, edición de un peso e integrantes | Mezclarlas con las financieras |

Los tests siguen en Vitest, con los mismos cuatro grupos.

## 6. Guardas de la constitución

| Regla | Guarda | Tareas |
|---|---|---|
| 1. Español | `mensajes.test.ts` pide un mensaje para cada restricción, clave foránea y columna obligatoria nueva. El error `LH006` viene en español | T1, T2 |
| 2. Pesos y dólares | No aplica: Pesaje no tiene montos. El peso no tiene moneda y no entra en ningún total | — |
| 3. Datos reales solo en la base | Las semillas de Pesaje son ficticias, y `semillas.test.ts` exige que existan. Siguen corriendo las guardas del repo | T4 |
| 4. Operación con cuenta | No aplica: no hay operaciones | — |
| 5. Sin precio no es cero | La misma idea aplicada al peso. Un renglón vacío no se guarda (`peso > 0` en la base y test de la carga). El gráfico no dibuja ceros (test del componente) | T1, T10, T13 |
| 6. Nada del grupo en el código | Los nombres de quienes se pesan son datos. `sin-datos-del-grupo.test.ts` suma `pesaje_integrante` a los nombres que no pueden estar en `src/` | T4 |
| 7. Secretos en `.env` | `VITE_MODULO_PESAJE` no es un secreto. `config.test.ts` ya exige que esté en `.env.example` y que no tenga SECRET, TOKEN ni PASSWORD en el nombre | T6 |

## 7. Lista de tareas

Cada tarea sigue el ciclo de `CLAUDE.md`: test que falla, código, suite completa en verde y un commit con el id de la tarea. Se empieza cuando esté cerrado el cambio de valor actual, para no mezclar migraciones ni commits.

### Fase 1. Base

**T1. Tablas `pesaje_integrante` y `pesaje`.** Migración `pesaje`.
- `pesaje_integrante`: nombre no vacío y único sin mayúsculas ni espacios, `objetivo` con su check y `ninguno` por defecto, y `activo` con verdadero por defecto.
- `pesaje`: clave foránea al integrante con `on delete no action`, fecha, peso con sus checks, observaciones opcionales y una fila por integrante y fecha. Lleva el trigger de fecha que no pasa de mañana (`LH006`).
- Autoría, RLS `solo_miembros` y permisos para `authenticated`. Mensajes en `errores.ts`. La clave foránea dice "No se puede borrar: tiene pesajes cargados. Desactivalo para que no aparezca en la carga".
- **Test.** `tests/base/pesaje.test.ts`:
  - C45. Un integrante no es una persona: no aparece en `persona`.
  - C46. Un nombre repetido se rechaza, aunque cambien las mayúsculas o los espacios.
  - C49. No se puede borrar un integrante con pesajes. Sin pesajes, sí.
  - C51. Se rechazan 0, −1, 300,01 y 57,305. Se aceptan 300 y 4,35.
  - C52. Un segundo peso del mismo integrante en la misma fecha se rechaza.
  - C53. Pasado mañana se rechaza con `LH006`.
  - C61. Un integrante nuevo arranca con objetivo `ninguno` y activo, y se rechaza un objetivo inválido.
  - C59. Siguen pasando los tests de toda tabla con autoría y RLS.
- **Depende de** nada.

**T2. `guardar_pesajes(fecha, jsonb)`.** Misma migración o una nueva.
- **Test.** `tests/base/pesaje.test.ts`:
  - C50. Guarda tres pesos con sus observaciones en la fecha dada.
  - C50. Sin ningún peso da "Cargá al menos un peso" (`LH007`).
  - Si un peso es inválido, no se guarda ninguno.
  - En `acceso.test.ts`, `guardar_pesajes` se suma a la lista de funciones para miembros, y el anónimo no puede ejecutarla.
- **Depende de** T1.

**T3. Vista `pesaje_con_variacion`.** Migración `pesaje_variacion`.
- **Test.** `tests/base/pesaje-variacion.test.ts`:
  - C56. La variación es contra el pesaje anterior del mismo integrante, y el primero tiene variación `null`.
  - C47. Trae el nombre actual del integrante después de renombrarlo.
  - C48. Trae los pesajes de un integrante desactivado.
  - C54. Al editar o borrar un peso, la variación del siguiente cambia.
  - C62. Trae el objetivo actual del integrante.
  - C57. La variación de alguien no depende de los pesajes de los demás.
  - En `acceso.test.ts`, el `beforeAll` carga un integrante y un pesaje para que la vista tenga datos.
- **Depende de** T1.

**T4. Semillas.** `supabase/seed.sql` suma tres integrantes ficticios ("Ana Ejemplo", que ya es persona de ejemplo, y dos mascotas de ejemplo), uno con cada objetivo y uno desactivado. También seis semanas de pesajes, con una semana en la que falta alguien.
- **Test.**
  - `semillas.test.ts` suma las dos tablas a "dejan datos en cada tabla" y pide un integrante con cada objetivo.
  - C60. `sin-datos-del-grupo.test.ts` suma los nombres de `pesaje_integrante`.
- **Depende de** T3.

### Fase 2. App

**T5. Subir a dev y regenerar tipos.** `src/datos/tipos-base.ts`. Necesita a Noelia para subir las migraciones al proyecto de dev.
- **Test.** `npm run verificar`.
- **Depende de** T4.

**T6. Interruptor.** `src/config.ts`, `.env.example` y `src/main.tsx`.
- **Test.** `config.test.ts`:
  - C43. Sin la variable o con `no`, `pesaje` es falso. Con `si` (también con espacios o mayúsculas), es verdadero.
  - El test que ya existe exige que la variable esté en `.env.example`.
- **Depende de** nada.

**T7. Dominio del peso.** `src/dominio/pesaje.ts` y `formato.ts`.
- **Test.** `pesaje.test.ts`:
  - C51. `leerPeso`: "57,3" y "57.3" dan 57.3, "4.350" da "Usá hasta 2 decimales", y 0, 300,01 y "4350" se rechazan con su motivo.
  - C55 y C56. `formatearPeso` da "57,30 kg", y `formatearVariacionDePeso` da "+0,30 kg", "−0,15 kg" y "0,00 kg".
  - C62. `sentidoDeVariacion`: con bajar y −0,15 es buena, con bajar y +0,30 es mala, con subir es al revés, y con ninguno, o con 0, es neutra.
- **Depende de** nada.

**T8. Repositorio.** `repositorio.ts` y `tests/interfaz/repositorio-falso.ts` suman `guardarPesajes(fecha, pesos)`. El falso guarda todos o ninguno y calcula la vista igual que la base.
- **Test.** Se suma al test de repositorio: el falso rechaza el lote entero si un peso está repetido.
- **Depende de** T5.

**T9. Componente `VariacionDePeso`.** `src/componentes/`.
- **Test.**
  - C56. Muestra "+0,30 kg" con flecha para arriba y "Primer pesaje" cuando no hay anterior.
  - C62. Usa la clase de bueno o malo según el objetivo, y la neutra con "Sin objetivo" o variación 0.
- **Depende de** T7.

**T10. Componente `GraficoDePeso`.** `src/componentes/`. Se arma con la skill `dataviz`.
- **Test.**
  - C58. Dibuja un punto por pesaje y ninguno en 0. Con un solo pesaje, un punto sin línea. Muestra "Objetivo: bajar".
  - C58. La escala va entre el mínimo y el máximo del integrante: con 4,10 y 4,40 kg, los puntos no quedan pegados.
- **Depende de** T7.

**T11. Rutas y menú.** `rutas.ts`, `App.tsx` y `Estructura.tsx`.
- **Test.** `App.test.tsx` y `Estructura.test.tsx`:
  - C43. Apagado, no está "Pesaje" en el menú, y `/pesaje` lleva al resumen.
  - C44. Prendido, "Pesaje" es la última entrada antes de "Salir", con su separador.
- **Depende de** T6.

**T12. Pantallas de integrantes.** `src/pantallas/pesaje/Integrantes.tsx`.
- **Test.** `pesaje.test.tsx`:
  - C45. Un integrante nuevo aparece en la carga y no en Personas.
  - C46. Un nombre repetido avisa antes de enviar.
  - C47. Al renombrar, la tabla muestra el nombre nuevo.
  - C48. Uno desactivado no está en la carga pero sí en la tabla y en el filtro. Se reactiva.
  - C49. Borrar uno con pesajes muestra el aviso y sugiere desactivarlo.
  - C61. Se elige el objetivo, y uno nuevo arranca en "Sin objetivo".
- **Depende de** T8 y T11.

**T13. Carga de un pesaje.** `src/pantallas/pesaje/CargarPesaje.tsx`.
- **Test.** `pesaje.test.tsx`, con reloj fijo:
  - C50. La fecha viene en hoy, hay un renglón por integrante activo, los vacíos no se guardan y sin ningún peso no se guarda.
  - C51. Un peso fuera de rango marca su renglón.
  - C52. Un integrante que ya tiene peso en esa fecha marca su renglón y ofrece editar el existente.
  - C53. Una fecha futura no se guarda.
- **Depende de** T12.

**T14. Lista de pesajes.** `src/pantallas/pesaje/Pesajes.tsx`.
- **Test.** `pesaje.test.tsx`:
  - C55. Fecha, quién, peso y observaciones, con lo más reciente primero.
  - C56. Muestra la variación.
  - C57. Al filtrar por alguien, se ven solo sus pesajes, la variación no cambia y el filtro queda en la dirección.
  - C58. Con el filtro aparece su gráfico.
- **Depende de** T9, T10 y T13.

**T15. Editar y borrar un peso.** `src/pantallas/pesaje/EditarPesaje.tsx`.
- **Test.** `pesaje.test.tsx`:
  - C54. Editar el peso cambia la variación del siguiente en la tabla. Borrarlo lo saca.
  - C59. Se ve quién lo cargó y cuándo.
- **Depende de** T14.

### Fase 3. Documentación

**T16. Guía, modelo y diseño.**
- `docs/levantar-una-copia.md` suma cómo prender Pesaje.
- `docs/modelo-de-datos.md` suma las dos tablas, aparte de lo financiero.
- `DESIGN.md`, en la sección de verde y rojo, suma que en Pesaje el color sale del objetivo y no del signo.
- **Test.** `publicacion.test.ts` sigue pasando.
- **Depende de** T6.

Al terminar siguen `verify-after-changes` y `/code-review`. Al cerrar, la spec del cambio se fusiona en la spec principal, y el PRD suma un anexo que explica que Pesaje es un módulo opcional fuera del propósito financiero.

## 8. Cobertura

| Criterio | Tareas | Cómo se verifica |
|---|---|---|
| C43 (P0) | T6, T11 | `config.test.ts` y `App.test.tsx` |
| C44 (P0) | T11 | `Estructura.test.tsx`. **Solo navegador:** que el separador se vea en 390 px y 1.280 px |
| C45 (P0) | T1, T12 | Test de base y de pantalla |
| C46 (P0) | T1, T12 | Test de base y de pantalla |
| C47 (P1) | T3, T12 | Test de base y de pantalla |
| C48 (P1) | T3, T12 | Test de base y de pantalla |
| C49 (P0) | T1, T12 | Test de base y de pantalla |
| C50 (P0) | T2, T13 | Test de base y de pantalla |
| C51 (P0) | T1, T7, T13 | Test de base, de unidad y de pantalla |
| C52 (P0) | T1, T13 | Test de base y de pantalla |
| C53 (P0) | T1, T13 | Test de base (lo que pasa de mañana) y de pantalla con reloj fijo |
| C54 (P0) | T3, T15 | Test de base y de pantalla |
| C55 (P0) | T7, T14 | Test de unidad y de pantalla |
| C56 (P1) | T3, T7, T9, T14 | Tests de base, de unidad, de componente y de pantalla |
| C57 (P1) | T3, T14 | Test de base y de pantalla |
| C58 (P1) | T10, T14 | Test de componente y de pantalla. **Solo navegador:** que el gráfico se lea bien en 390 px |
| C59 (P0) | T1, T15 | Test global de autoría y de pantalla |
| C60 (P0) | T4 | `semillas.test.ts` y `sin-datos-del-grupo.test.ts` |
| C61 (P1) | T1, T12 | Test de base y de pantalla |
| C62 (P1) | T3, T7, T9 | Tests de base, de unidad y de componente. **Solo navegador:** los colores y la flecha |

| Error de la spec | Tareas | Cómo se verifica |
|---|---|---|
| Peso con punto | T7 | `leerPeso` con "57.3" |
| Peso en gramos por error | T1, T7 | 4350 rechazado en la base y en `leerPeso` |
| Alguien no se pesó | T13, T10 | Renglón vacío sin guardar, y el gráfico sin ceros |
| Carga dos veces el mismo día | T1, T13 | Igual que C52 |
| Renglón equivocado | T15 | Igual que C54 |
| Una mascota ya no está | T3, T12 | Igual que C48 |
| Se apaga Pesaje con datos | T11 | Apagado no se borra nada: las tablas no cambian. Se prueba en el navegador prendiendo y apagando en dev |
| Cambia el objetivo | T3, T9 | Igual que C62 |
| Alguien sin objetivo sube o baja | T7, T9 | Igual que C62 |
| Un solo pesaje | T10 | Un punto sin línea |

## 9. Lo que hace falta de tu lado

- **En T5.** Estar para subir las migraciones al proyecto de dev (`npm run db:subir`) y agregar `VITE_MODULO_PESAJE=si` a tu `.env.development` para probarlo.
- **Al publicar.**
  1. Subir las migraciones al real con `npm run db:subir:produccion`.
  2. Agregar `VITE_MODULO_PESAJE=si` a `.env.production`.
  3. Correr `npm run publicar`.
  4. Cargar a mano, desde la app, a quienes se pesan, con sus nombres reales y sus objetivos.

## 10. Riesgos y notas

- **El tope de 1.000 filas de la API.** La lista lee todos los pesajes, como las operaciones. Cinco por semana son unas 260 por año, así que el tope llega en unos cuatro años. Se anota en el mismo pendiente que las operaciones.
- **El tope de 300 kg** es una pregunta abierta de la spec. Cambiarlo es cambiar un check y una constante.
- **El cambio de valor actual está abierto.** Las migraciones de Pesaje van con fecha posterior a las suyas, y no se empieza T1 hasta que ese cambio se cierre.
