# Dashboard de inversiones familiar — Contexto para Claude

## Qué es
App web (v1) que replica el Excel de inversiones de Sergio y Noelia para consultarlo
desde el celular. Read-only, datos importados del Excel, sin precios en vivo.

## Reglas no negociables (constitución)
1. **Español** en todo el contenido de usuario (UI, textos, docs).
2. **NUNCA committear datos reales.** El Excel real y cualquier dato real van en
   `data/real/` (ignorado por git). Para desarrollo y demo se usan datos FALSOS en
   `data/sample/`.
3. **v1 es read-only**: no implementar edición ni carga desde la app.
4. **Datos sensibles (patrimonio familiar)**: la app no se publica sin barrera de acceso.
5. **No mezclar monedas**: nunca sumar $ (pesos) con USD; totales separados por moneda.

## Metodología de trabajo (Spec-Driven Development)
El desarrollo sigue el flujo SDD con las skills locales de `.claude/skills/`:
1. `design-spec` → `docs/specs/` (el QUÉ) — con approval gate.
2. `design-plan` → `docs/plans/` (el CÓMO).
3. Implementar tarea por tarea (**1 tarea = 1 commit**).
4. `verify-after-changes` → probar en el navegador contra spec y plan.

No elegir stack ni escribir código antes de tener el plan aprobado.

## Archivos clave
- `docs/specs/2026-07-12-dashboard-inversiones-familiar.md` — spec v1 (fuente de verdad del QUÉ).
- `docs/plans/` — planes técnicos (se llenan con design-plan).
- `.claude/skills/` — las 3 skills del flujo SDD.
