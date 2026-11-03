# Decisión: cómo se prende Pesaje en cada copia

> Parte del cambio `docs/changes/2026-11-03-pesaje/`. Decidido el 2026-11-03.

## Qué es un grupo en LemonHouse

Un grupo es la gente que comparte una copia de la app. El PRD lo dice así: "Cada grupo levanta su propia copia de la app con su propia base. No hay una instalación compartida entre grupos."

El código está en un repositorio público. Si otra persona o familia lo baja y levanta su propia copia, ese es otro grupo, con su propia base y sus propios datos. Un grupo nunca ve los datos de otro.

## Por qué hay que decidir algo

Pesaje va a estar en el código, así que cualquier copia nueva lo trae. Si siempre se viera, quien instala LemonHouse para sus finanzas se encontraría una pantalla para pesar personas y mascotas que no tiene nada que ver con lo que busca. Por eso hay que decidir si Pesaje aparece siempre o solo en las copias que lo quieren.

## Opciones

| Opción | Cómo se ve | Costo |
|---|---|---|
| **A. Interruptor en `.env`** | Una línea en el `.env` de cada copia. Si está, Pesaje aparece en el menú. Si no está, no aparece y el resto de la app sigue igual. Viene apagado. | Hay que agregar esa línea una vez en `.env.production`, en la máquina desde donde se publica, y volver a publicar. |
| B. Siempre visible | Pesaje aparece en todas las copias. | Ninguno para el grupo que lo usa, pero cualquier otro grupo ve algo ajeno al producto. |
| C. Interruptor dentro de la app | Una opción en una pantalla de configuración que lo prende o lo apaga. | La app no tiene pantalla de configuración, y habría que construirla solo para esto. |

## Decisión

**Opción A.** Es lo mínimo que mantiene el producto limpio para los demás grupos y no cambia nada del uso semanal.

No rompe la regla 6 ("Nada específico de un grupo en el código"). El `.env` es la configuración de cada copia y no código, y Pesaje sirve igual para cualquier grupo que lo prenda.

La línea es `VITE_MODULO_PESAJE=si`. Va en `.env.production` de la máquina desde donde se corre `npm run publicar`, y no en el servidor: la app se arma en esa máquina con ese archivo, y al servidor solo sube el resultado. Para probar en desarrollo, va en `.env.development`. Apagar Pesaje no borra los datos que ya estaban cargados: si se vuelve a prender, reaparecen.
