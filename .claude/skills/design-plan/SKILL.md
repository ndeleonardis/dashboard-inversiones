---
name: design-plan
description: Traduce una spec aprobada en un plan de implementación con tareas técnicas detalladas (el CÓMO). Usar DESPUÉS de que el usuario apruebe la spec (skill design-spec) y ANTES de escribir código. Genera docs/plans/YYYY-MM-DD-title.md derivado de la spec.
---

# design-plan

Convertís una **spec aprobada** en un **plan de ejecución**. Acá sí entran stack,
arquitectura y el desglose de tareas técnicas.

## Cuándo se usa
- Después de que el usuario apruebe la spec en `design-spec`.
- Antes de escribir código.

## Prerrequisito
- Debe existir una spec aprobada en `docs/specs/`. Si no la encontrás o no fue
  aprobada, pará y pedila. No inventes el plan sin spec.

## Pasos
1. Leé la spec de referencia en `docs/specs/YYYY-MM-DD-title.md`.
2. Guardá el plan en `docs/plans/YYYY-MM-DD-title.md` (misma fecha y title que la
   spec, para que queden apareados).
3. El plan DEBE contener:
   1. **Objetivo** — 1-2 líneas, alineado con la spec.
   2. **Contexto del problema** — resumen breve tomado de la spec.
   3. **Spec de referencia** — ruta: `docs/specs/YYYY-MM-DD-title.md`.
   4. **Lista de tareas a implementar** — pasos técnicos ordenados. Cada tarea con:
      - id corto (T1, T2, …),
      - qué archivo/módulo toca,
      - qué hace y cómo se verifica (test o criterio de aceptación de la spec),
      - dependencias con otras tareas si las hay.
4. Cada criterio de aceptación de la spec debe estar cubierto por >=1 tarea. Si algo
   no se puede cubrir, decilo explícito.
5. Tareas **atómicas**: cada una se implementa y verifica por separado.

## Al terminar
Mostrá el plan y confirmá que sigue implementar tarea por tarea (1 tarea = 1 commit)
y luego verificar con `verify-after-changes`.
