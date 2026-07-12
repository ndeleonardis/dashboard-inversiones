# Plan: Dashboard de inversiones familiar — v1

> Estado: **propuesto** (2026-07-12). Derivado de la spec aprobada del mismo nombre.

## 1. Objetivo
Construir una web read-only, mobile-first y en español que muestre los saldos de Sergio
y Noelia (individuales y combinados) y el detalle de tenencias por tipo de activo, a
partir de una foto de datos importada del Excel — sin precios en vivo ni edición.

## 2. Contexto del problema (resumen de la spec)
Sergio y Noelia consultan hoy un Excel ("Investments Lemon House") que es incómodo desde
el celular y no deja ver claro el **consolidado familiar** (cada uno tiene brokers y
bancos propios). La v1 replica ese Excel como **foto a una fecha**: total por titular,
total combinado, desglose por cuenta/broker y detalle por tipo de activo (FCI, ON,
Acciones, Cripto), siempre dejando claro **de quién es** cada cosa y **nunca mezclando
$ con USD**.

## 3. Spec de referencia
`docs/specs/2026-07-12-dashboard-inversiones-familiar.md` (aprobada 2026-07-12).

## 4. Decisiones de stack y arquitectura

**Recomendación: sitio estático, sin backend.**

- **Framework:** Vite + React + TypeScript. Justificación: la app tiene navegación
  (resumen → detalle por activo) y varias vistas que comparten datos; React lo resuelve
  con componentes simples y TypeScript nos da tipos para el esquema de datos (ayuda a no
  mezclar monedas por accidente). Vite da build estático y dev server rápido.
- **Datos:** un único archivo **JSON** que la app carga al iniciar. No hay base de datos
  ni API — encaja con "importado una vez" y "read-only". Una sola fuente de datos ⇒
  todos ven lo mismo (criterio de la spec).
- **Estilos:** CSS plano mobile-first (sin librería de UI pesada). Simple y liviano en
  el celular.
- **Sin gráficos** en v1 (fuera de alcance).
- **Privacidad / publicación (regla 4 de la constitución):** el JSON real vive en
  `data/real/` (ignorado por git); el repo solo lleva el JSON **falso** de
  `data/sample/`. La v1 **no se publica en una URL pública abierta**: se corre local o
  detrás de una barrera de acceso simple. El login formal es v2 (fuera de alcance).

> Si preferís evitar React (p.ej. HTML + JS vanilla), avisá antes de aprobar: cambia T1
> y la forma de T5/T6, no el resto.

## 5. Modelo de datos (contrato JSON)
Definido en T2; forma tentativa (los montos vienen **tal cual el Excel**, sin convertir):

```
{
  "fechaActualizacion": "2026-07-10",
  "titulares": ["Sergio", "Noelia"],
  "cuentas": [
    { "id": "...", "nombre": "Broker X", "titular": "Sergio",
      "saldos": [ { "moneda": "ARS", "monto": 0 }, { "moneda": "USD", "monto": 0 } ] }
  ],
  "tenencias": [
    { "tipo": "FCI|ON|Accion|Cripto", "titular": "Sergio", "cuentaId": "...",
      "ticker": "...", "cantidad": 0, "moneda": "ARS|USD",
      "valorCompra": 0, "valorActual": 0, "rendimiento": 0 }
  ]
}
```
Regla dura: `moneda` nunca se agrega entre distintos valores; los totales se calculan
**por moneda**.

## 6. Lista de tareas (atómicas — 1 tarea = 1 commit)

| id | Archivo/módulo | Qué hace | Cómo se verifica | Dep. |
|----|----------------|----------|------------------|------|
| **T1** | raíz del proyecto (`package.json`, `vite`, `src/`, `index.html`) | Scaffold Vite + React + TS, viewport mobile, página en blanco que levanta. | `npm run dev` levanta; la página carga en viewport de celular sin errores de consola. | — |
| **T2** | `src/types.ts`, `data/sample/data.json` | Define los tipos TS del contrato JSON (§5) y crea datos de ejemplo **falsos** con ambos titulares, cuentas en $ y USD, y tenencias de los 4 tipos. | El JSON tipa sin error contra `types.ts`; incluye ≥1 cuenta por titular y ≥1 tenencia por tipo de activo. | T1 |
| **T3** | `scripts/importar-excel.ts` | Script Node que lee `data/real/*.xlsx` y genera `data/real/data.json` según §5. Si una fila no se entiende, **reporta cuál y por qué** (no falla en silencio). | Corriéndolo contra un `.xlsx` de prueba con una fila rota: genera JSON de las filas válidas y lista la fila rota con motivo. (Mitiga §6 "celdas vacías/formato raro".) | T2 |
| **T4** | `src/data.ts` | Capa de datos: carga el JSON, expone helpers `totalPorTitular(moneda)`, `totalCombinado(moneda)`, `porCuenta()`, `tenenciasPorTipo(tipo)`. **Nunca** suma monedas distintas. | Prueba con el sample: los totales por moneda cuadran y no existe ningún total que mezcle ARS+USD. | T2 |
| **T5** | `src/vistas/Resumen.tsx` + layout | Vista home: total Sergio, total Noelia y combinado (separados $ y USD); desglose por cuenta/broker con su **titular** y monto en $ y USD. | Cumple criterios spec §5.1, §5.2, §5.4. Se ve en el celular: 3 totales por moneda + lista de cuentas con titular. | T4 |
| **T6** | `src/vistas/DetalleActivo.tsx` + navegación | Entrar a un tipo de activo (FCI/ON/Acciones/Cripto) y ver la lista de tenencias con los campos del Excel (ticker, cantidad, valor compra, valor actual, rendimiento) y el **titular** de cada una. | Cumple criterio spec §5.3 y §5.4. Navegación resumen ↔ detalle funciona en el celular. | T4, T5 |
| **T7** | layout global (`src/App.tsx`) | Elementos transversales: **fecha de última actualización** siempre visible; nota fija de que es una **foto a una fecha (no en vivo)** y que la carga sigue en el Excel (read-only). | Cumple criterio spec §5.5 y mitigaciones §6 (dato viejo / expectativa de editar). La fecha y la nota se ven en toda vista. | T1 |
| **T8** | `README`/`docs` + config de acceso | Documenta cómo correr la v1 **detrás de barrera** (local o gate simple) y confirma que ningún dato real ni `.xlsx` entra al repo. | Cumple regla 4 de la constitución: no hay publicación pública abierta; `.gitignore` cubre `data/real/` y `*.xlsx`. | T1 |

## 7. Cobertura de criterios de aceptación
- §5.1 (totales Sergio/Noelia/combinado) → **T4, T5**
- §5.2 (por cuenta/broker con titular, $ y USD) → **T4, T5**
- §5.3 (detalle por tipo de activo con campos del Excel) → **T4, T6**
- §5.4 (siempre "de quién es") → **T5, T6**
- §5.5 (fecha de última actualización visible) → **T7**
- §5.6 (una sola fuente compartida) → **T2, T4** (JSON único)
- §6 import no falla en silencio → **T3**
- §6 no mezclar monedas → **T4** (y tipos en T2)
- §6 foto a una fecha / read-only → **T7**

> Ningún criterio queda sin cubrir. **Nota sobre T3:** el mapeo exacto de columnas
> depende de ver la estructura real del Excel; si al implementar no la tenemos a mano,
> T3 se ajusta con esa info (el resto del plan no depende de T3, que alimenta
> `data/real/`, no el sample).

## 8. Próximo paso
Implementar **tarea por tarea (1 tarea = 1 commit)**, empezando por T1, y al terminar
verificar con `verify-after-changes`.
