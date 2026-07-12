---
name: verify-after-changes
description: Verifica una implementación probándola de verdad en el navegador y comparando contra el spec y el plan. Usar cuando Claude Code considere que terminó de implementar el plan, para confirmar que cumple el objetivo antes de darlo por bueno. Levanta el servidor, prueba 5 casos clave, recoge feedback y arregla o da luz verde.
---

# verify-after-changes

**Verificás** que la implementación hace lo que la spec y el plan pedían — no
confiás en que "debería andar". Se prueba ejecutando, no leyendo el código.

## Cuándo se usa
- Cuando considerás que terminaste de implementar el plan (`docs/plans/…`).

## Pasos
1. **Levantá el servidor local** de la app.
2. **Elegí 5 casos de prueba importantes** que cubran lo esencial:
   - >=3 casos de éxito (flujo feliz),
   - >=2 casos de error/borde (entradas inválidas, vacíos, permisos), tomados de la
     sección "Posibles errores" de la spec.
3. **Probá cada caso directamente en el navegador**, interactuando con la UI como
   un usuario real, y observá el resultado.
4. **Recogé el feedback**: qué pasó vs. qué debía pasar según spec y plan.
5. **Compará contra la spec (`docs/specs/…`) y el plan (`docs/plans/…`)**: por cada
   criterio de aceptación, marcá si se cumple.

## Resultado
- **Si algo falla o no alcanza el objetivo** → arreglás el código y volvés a correr
  los casos afectados. Repetís hasta que pasen.
- **Si todo cumple** → **luz verde**: resumís qué probaste y su resultado, confirmás
  que cumple spec y plan, y terminás.

No des la tarea por terminada sin haber verificado en el navegador y comparado
contra la spec y el plan.
