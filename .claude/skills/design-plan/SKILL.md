---
name: design-plan
description: Traduce una spec aprobada en un plan de implementación con tareas técnicas detalladas (el CÓMO), donde cada criterio de la spec queda atado a un test. Usar DESPUÉS de que el usuario apruebe la spec (skill design-spec) y ANTES de escribir código. Genera docs/plans/YYYY-MM-DD-title.md (producto nuevo) o docs/changes/YYYY-MM-DD-title/plan.md (cambio), con approval gate.
---

# design-plan

Convertís una **spec aprobada** en un **plan de ejecución**. Acá sí entran stack, arquitectura y el desglose de tareas técnicas.

## Cuándo se usa
- Después de que el usuario apruebe la spec en `design-spec`.
- Antes de escribir código.

## Prerrequisito
- Debe existir una spec aprobada, en `docs/specs/` o en `docs/changes/…/spec.md`. Si no la encontrás o no fue aprobada, pará y pedila. No inventes el plan sin spec.
- Si la spec tiene preguntas **bloqueantes** sin responder, pará y pedí la respuesta antes de planear.

## Pasos
1. Leé la spec de referencia.
2. **Si hay código existente que el plan va a tocar, explorálo primero.** Identificá qué archivos, patrones y convenciones ya hay, para reusarlos en vez de duplicarlos.
3. Guardá el plan al lado de su spec, con la misma fecha y title para que queden apareados.
   - Producto nuevo. `docs/plans/YYYY-MM-DD-title.md`
   - Cambio. `docs/changes/YYYY-MM-DD-title/plan.md`
4. El plan DEBE contener estas secciones.
   1. **Objetivo.** 1-2 líneas, alineado con la spec.
   2. **Contexto del problema.** Resumen breve tomado de la spec.
   3. **Spec de referencia.** La ruta del archivo.
   4. **Código existente.** Qué se reusa y qué se toca. Si es producto nuevo, "No aplica".
   5. **Stack y arquitectura.** Las decisiones, incluido el **runner de tests**. Por cada decisión importante, **la alternativa descartada y por qué** en una línea.
   6. **Guardas de la constitución.** Por cada regla no negociable del `CLAUDE.md` del repo, cómo la hace cumplir el código (hook, test o tipo de dato). Una regla que solo está escrita como pedido no cuenta como guarda.
   7. **Lista de tareas.** Pasos técnicos ordenados. Cada tarea con
      - id corto (T1, T2, …),
      - qué archivo o módulo toca,
      - qué hace,
      - **test que lo verifica**, con el id del criterio de la spec que cubre (p.ej. "C3, test de totales por moneda"),
      - dependencias con otras tareas si las hay.
   8. **Cobertura.** Cada criterio de la spec (C1, C2, …) con la tarea y el test que lo cubren. Si un criterio no se puede testear de forma automática (p.ej. algo puramente visual), se marca **solo navegador** y queda para `verify-after-changes`. Si algo no se puede cubrir de ninguna forma, decilo explícito.
5. Tareas **atómicas**. Cada una se implementa y verifica por separado.

## Approval gate
Mostrá el plan y preguntá **"¿Aprobás este plan para empezar a implementar?"**. Si pide cambios, editás el mismo archivo y volvés a preguntar. No se escribe código sin plan aprobado.

## Cómo se implementa después
Tarea por tarea, en este orden.
1. Escribir el test de la tarea y correrlo. **Tiene que fallar.** Si pasa sin código nuevo, el test no está probando nada.
2. Escribir el código mínimo para que pase.
3. Correr la suite completa, no solo el test nuevo.
4. **1 tarea = 1 commit**, con el id de la tarea en el mensaje.

Si al implementar algo se aparta de la spec, se para y se decide con el usuario cuál de los dos manda. Se corrige el otro en el mismo commit. Al terminar todas las tareas, sigue `verify-after-changes`.
