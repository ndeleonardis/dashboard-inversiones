---
name: design-spec
description: Diseña un documento de especificación (spec) desde la perspectiva del usuario para una nueva funcionalidad o para un cambio sobre un producto que ya tiene spec. Usar DESPUÉS de tener clara la idea y el problema (p.ej. tras brainstorming) y ANTES de planear o codear. Genera docs/specs/YYYY-MM-DD-title.md (producto nuevo) o docs/changes/YYYY-MM-DD-title/spec.md (cambio), e incluye un approval gate para iterar o aprobar la spec antes de pasar al plan.
---

# design-spec

Redactás una **especificación** de QUÉ se va a construir y POR QUÉ, desde la perspectiva del usuario. NO incluís decisiones técnicas (lenguaje, framework, base de datos). Eso va en el plan, no acá.

## Cuándo se usa
- Después de tener claridad del problema (idealmente tras el skill `brainstorming`).
- Antes de `design-plan` y antes de escribir una sola línea de código.

## Producto nuevo o cambio
- **Producto nuevo** (no hay spec aprobada en `docs/specs/`). La spec va en `docs/specs/YYYY-MM-DD-title.md`.
- **Cambio** (ya hay spec aprobada y lo pedido la amplía o modifica). NO se reescribe la spec principal. La spec del cambio va en `docs/changes/YYYY-MM-DD-title/spec.md` y contiene solo lo que cambia. Cada criterio se marca como **AGREGA**, **MODIFICA** (con el id del criterio original) o **ELIMINA**. Al cerrar el cambio, `verify-after-changes` lo fusiona en la spec principal.

En los dos casos `YYYY-MM-DD` es la fecha de hoy y `title` un título corto en kebab-case.

## Pasos
1. Si queda ambigüedad en el objetivo o el alcance, hacé las preguntas mínimas necesarias antes de escribir. No asumas.
2. Si es un cambio, leé la spec principal antes de escribir, para no contradecirla sin decirlo.
3. La spec DEBE tener exactamente estas secciones, en orden.
   1. **Overview.** 2-3 líneas sobre qué es y para qué sirve.
   2. **Usuarios objetivo.** Quién lo usa y qué necesita.
   3. **Contexto del problema.** Qué duele hoy y por qué hace falta.
   4. **Señales de éxito.** Una o dos, concretas y observables (p.ej. "Sergio consulta la app en vez de pedir el Excel"). No métricas de producto B2B.
   5. **Alcance.** Qué entra y, explícito, qué queda FUERA. Cada cosa que queda fuera lleva su **motivo** en una línea (poco impacto, muy complejo, va en otra versión, prematuro). El motivo es lo que frena el "ya que estamos".
   6. **Comportamiento esperado.** Criterios DADO / CUANDO / ENTONCES, testeables. Cada criterio lleva un **id** (C1, C2, …) y una **prioridad**.
      - **P0** imprescindible. Sin esto la versión no resuelve el problema.
      - **P1** deseable. Mejora mucho, pero el caso central funciona sin esto.
      - **P2** futuro. No se construye ahora, pero el diseño no debe impedirlo.

      Si todo es P0, nada es P0. Cuestioná cada P0 con "¿de verdad no saldría sin esto?".
   7. **Posibles errores y mitigaciones.** Casos borde, validaciones, sin fallos silenciosos.
   8. **Preguntas abiertas.** Lo que falta saber, cada una marcada **bloqueante** (hay que responderla antes del plan) o **no bloqueante** (se resuelve al implementar). Si no hay, se escribe "Ninguna". No incluyas preguntas que se pueden contestar con el contexto disponible.
4. Mantenela corta y concreta. Prohibido mencionar stack o arquitectura.

## Approval gate (obligatorio)
Al terminar de redactar la spec.
1. Mostrá al usuario un resumen de las secciones y el archivo generado.
2. Si hay preguntas **bloqueantes** sin responder, decilo. La spec no se puede aprobar hasta resolverlas.
3. Preguntá explícitamente **"¿Aprobás esta spec para pasar al plan, o querés iterarla?"**
4. Según la respuesta.
   - Pide cambios. Editás el mismo archivo y volvés a pedir aprobación. Repetís hasta que apruebe.
   - Aprueba. Confirmás que el siguiente paso es `design-plan` con esta spec como referencia.

NUNCA avances a plan o implementación sin aprobación explícita de la spec.
