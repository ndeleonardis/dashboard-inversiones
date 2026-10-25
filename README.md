# 🍋 Lemon House
Cuánto tengo, cuánto tenés, cuánto tenemos.

Lemon House es una app para llevar en un solo lugar las finanzas de una persona, una pareja o un grupo. Registra los ingresos, los gastos comunitarios o de cada uno y las inversiones de cada persona, en pesos y en dólares, para saber cuánto queda para invertir y cómo va lo invertido.

> **Estado.** En diseño. El producto está definido en [PRD.md](PRD.md) y el desarrollo arranca con la spec de la v1.

## Cómo se construye

Con Spec-Driven Development. Primero se define qué construir, después cómo, y recién ahí se escribe código, verificándolo contra lo que se definió. El proceso corre con skills de Claude Code.

| Paso | Skill | Resultado |
|---|---|---|
| 1. Especificar el qué | `design-spec` | `docs/specs/` o `docs/changes/` |
| 2. Planear el cómo | `design-plan` | `docs/plans/`, con un test por criterio |
| 3. Implementar | | Test antes del código, 1 commit por tarea |
| 4. Verificar | `verify-after-changes` | Tests, prueba en el navegador y chequeo contra la spec |
| 5. Revisar | `/code-review` | Revisión del código antes de cerrar |

## Estructura

    PRD.md                   Por qué existe y reglas del producto
    DESIGN.md                Guía visual
    docs/modelo-de-datos.md  Modelo de datos
    docs/specs/              Specs (el qué)
    docs/plans/              Planes (el cómo)
    docs/changes/            Cambios sobre una versión existente
    docs/archivo/            Versiones superadas
    .claude/skills/          Skills del flujo SDD

## Datos y privacidad

El repositorio es público y no tiene datos reales. Cada grupo levanta su propia copia con su propia base, y sus datos quedan ahí. Las claves van en `.env`, que no se versiona.
