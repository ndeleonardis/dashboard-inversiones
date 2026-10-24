---
name: verify-after-changes
description: Verifica una implementación corriendo la suite de tests y probándola de verdad en el navegador, compara contra la spec y el plan, y detecta deriva entre código y spec. Usar cuando Claude Code considere que terminó de implementar el plan, para confirmar que cumple el objetivo antes de darlo por bueno. Corre los tests, levanta el servidor, prueba 5 casos clave, revisa deriva, pasa /code-review y arregla o da luz verde.
---

# verify-after-changes

**Verificás** que la implementación hace lo que la spec y el plan pedían. No confiás en que "debería andar". Se prueba ejecutando, no leyendo el código.

## Cuándo se usa
- Cuando considerás que terminaste de implementar el plan (`docs/plans/…` o `docs/changes/…/plan.md`).

## Pasos
1. **Corré la suite de tests completa.** Si algo falla, se arregla antes de seguir. No tiene sentido probar en el navegador sobre tests en rojo.
2. **Levantá el servidor local** de la app.
3. **Elegí 5 casos de prueba importantes** que cubran lo esencial.
   - Primero los criterios que el plan marcó como **solo navegador**.
   - >=3 casos de éxito (flujo feliz).
   - >=2 casos de error o borde (entradas inválidas, vacíos, permisos), tomados de la sección "Posibles errores" de la spec.
4. **Probá cada caso directamente en el navegador**, interactuando con la UI como un usuario real, y observá el resultado.
5. **Recogé el feedback.** Qué pasó contra qué debía pasar según spec y plan.
6. **Compará contra la spec y el plan.** Por cada criterio (C1, C2, …) marcá si se cumple y con qué evidencia (qué test o qué caso del navegador).
7. **Chequeo de deriva.** Listá dos cosas.
   - Lo que el código hace y la spec no dice.
   - Lo que la spec pide y el código no hace.

   Por cada diferencia, preguntá al usuario cuál manda. Si manda el código, se actualiza la spec y la decisión se anota con fecha. Si manda la spec, se arregla el código. Ninguna diferencia queda sin resolver.
8. **Corré `/code-review`** sobre los cambios de esta implementación y resolvé con el usuario qué hallazgos se arreglan ahora.

## Resultado
- **Si algo falla o no alcanza el objetivo.** Arreglás el código y volvés a correr la suite y los casos afectados. Repetís hasta que pasen.
- **Si todo cumple.** **Luz verde.** Resumís qué probaste y su resultado, y confirmás que cumple spec y plan.

## Cierre
- **Si era un cambio** (`docs/changes/…`), fusioná su spec en la spec principal. Los criterios AGREGA se suman, los MODIFICA reemplazan al original y los ELIMINA se sacan. La carpeta del cambio se conserva como historial.
- **Si se cierra una versión**, proponé un tag (p.ej. `v1.0`) para que quede un punto al que volver. Antes de pushear el tag, pedí confirmación.

No des la tarea por terminada sin haber corrido los tests, verificado en el navegador y comparado contra la spec y el plan.
