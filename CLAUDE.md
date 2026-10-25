# LemonHouse. Contexto para Claude

## Qué es
App para llevar en un solo lugar los ingresos, los gastos y las inversiones de una persona o de un grupo, en pesos y en dólares. Por qué existe y qué reglas tiene el producto está en `PRD.md`. El diseño visual está en `DESIGN.md`.

## Reglas no negociables (constitución)
1. **Español** en toda la interfaz y en los documentos del proyecto. `DESIGN.md` es la única excepción.
2. **Nunca sumar pesos con dólares.** Todo monto lleva su moneda y los totales van separados por moneda.
3. **Datos reales solo en la base de cada grupo.** El repo es público y lleva solo semillas con datos ficticios.
4. **Toda operación tiene cuenta**, y cada cuenta tiene un dueño.
5. **Sin precio no es cero.** Un precio que falta se muestra como "sin precio" con la fecha del último conocido.
6. **Nada específico de un grupo en el código.** Personas, bancos, brokers y categorías son datos.
7. **Secretos solo en `.env`**, que no se versiona.

Cada regla necesita una guarda en código (restricción de la base, test o tipo). La define cada `design-plan`. Una regla que solo está escrita acá no cuenta como guarda.

## Metodología (Spec-Driven Development)
Flujo con las skills de `.claude/skills/`.
1. `design-spec` escribe la spec en `docs/specs/` si es producto nuevo, o en `docs/changes/AAAA-MM-DD-nombre/` si es un cambio. Tiene approval gate.
2. `design-plan` escribe el plan, con un test por cada criterio de la spec. Tiene approval gate.
3. Se implementa tarea por tarea. Test que falla, código, test que pasa, y 1 commit por tarea.
4. `verify-after-changes` corre los tests, prueba en el navegador y chequea la deriva entre código y spec.
5. `/code-review` antes de dar algo por terminado.
6. Cierre. Un cambio se fusiona en la spec principal, y una versión cerrada lleva tag.

No se escribe código sin spec y plan aprobados.

## Archivos clave
- `PRD.md`. Contexto permanente del producto.
- `DESIGN.md`. Guía visual, con los ajustes para LemonHouse al final.
- `docs/modelo-de-datos.md`. Modelo de datos propuesto.
- `docs/specs/`, `docs/plans/` y `docs/changes/`. El ciclo SDD.
- `docs/archivo/`. Versiones superadas, solo como historial.
- `.claude/skills/`. Las skills del flujo.
