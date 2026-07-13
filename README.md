# 🍋 Lemon House 
Cuánto tengo, cuánto tenés, cuánto tenemos.

Lemon House es un dashboard de inversiones que se consulta desde el celular y responde esa pregunta de un vistazo cuánto tiene cada uno, cuánto sumamos juntos, en pesos y en dólares, entre todos nuestros fondos, bonos, acciones y cripto. Una sola fuente de verdad para las finanzas de la pareja.

> **v1**: solo consulta (read-only), datos importados una vez desde el Excel, sin
> precios en vivo. Editar y traer valores automáticos (CAFCI, Google Finance) es v2+.

## Cómo se construyó: Spec-Driven Development (SDD)

Este proyecto se desarrolla con SDD — se define **qué** construir antes de escribir
código, y se verifica contra eso. El proceso vive en `docs/` y se ejecuta con skills
de Claude Code:

| Paso | Skill | Artefacto |
|------|-------|-----------|
| 1. Especificar (el QUÉ) | `design-spec` | `docs/specs/` |
| 2. Planear (el CÓMO) | `design-plan` | `docs/plans/` |
| 3. Implementar | — | código (1 tarea = 1 commit) |
| 4. Verificar | `verify-after-changes` | pruebas en navegador |

## Estructura

    .claude/skills/   Las 3 skills del flujo SDD
    docs/specs/       Especificaciones (el QUÉ)
    docs/plans/       Planes técnicos (el CÓMO)
    data/real/        Datos reales (NO se committean — ver .gitignore)
    data/sample/      Datos de ejemplo, falsos (sí se committean)

## Privacidad

Los datos reales (patrimonio familiar) **nunca** se suben al repo: `data/real/` y
cualquier `.xlsx` están en `.gitignore`. El repo usa datos de ejemplo falsos en
`data/sample/`. Mantené el repositorio **privado**.
