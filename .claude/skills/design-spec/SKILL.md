---
name: design-spec
description: Diseña un documento de especificación (spec) desde la perspectiva del usuario para una nueva funcionalidad. Usar DESPUÉS de tener clara la idea y el problema (p.ej. tras brainstorming) y ANTES de planear o codear. Genera docs/specs/YYYY-MM-DD-title.md e incluye un approval gate para iterar o aprobar la spec antes de pasar al plan.
---

# design-spec

Redactás una **especificación** de QUÉ se va a construir y POR QUÉ, desde la
perspectiva del usuario. NO incluís decisiones técnicas (lenguaje, framework,
base de datos): eso va en el plan, no acá.

## Cuándo se usa
- Después de tener claridad del problema (idealmente tras el skill `brainstorming`).
- Antes de `design-plan` y antes de escribir una sola línea de código.

## Pasos
1. Si queda ambigüedad en el objetivo o el alcance, hacé las preguntas mínimas
   necesarias antes de escribir. No asumas.
2. Guardá la spec en: `docs/specs/YYYY-MM-DD-title.md`
   - `YYYY-MM-DD` = fecha de hoy.
   - `title` = título corto en kebab-case.
3. La spec DEBE tener exactamente estas secciones, en orden:
   1. **Overview** — 2-3 líneas: qué es y para qué sirve.
   2. **Usuarios objetivo** — quién lo usa y qué necesita.
   3. **Contexto del problema** — qué duele hoy / por qué hace falta.
   4. **Alcance v1** — qué entra en la v1 y, explícito, qué queda FUERA.
   5. **Comportamiento esperado** — criterios DADO / CUANDO / ENTONCES, testeables.
   6. **Posibles errores y mitigaciones** — casos borde, validaciones, sin fallos silenciosos.
4. Mantenela corta y concreta. Prohibido mencionar stack o arquitectura.

## Approval gate (obligatorio)
Al terminar de redactar la spec:
1. Mostrá al usuario un resumen de las secciones y el archivo generado.
2. Preguntá explícitamente: **"¿Aprobás esta spec para pasar al plan, o querés iterarla?"**
3. Según la respuesta:
   - Pide cambios → editás el mismo archivo y volvés a pedir aprobación. Repetís hasta que apruebe.
   - Aprueba → confirmás que el siguiente paso es `design-plan` con esta spec como referencia.

NUNCA avances a plan o implementación sin aprobación explícita de la spec.
