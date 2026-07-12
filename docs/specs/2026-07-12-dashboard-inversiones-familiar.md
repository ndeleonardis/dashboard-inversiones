# Spec: Dashboard de inversiones familiar — v1

> Estado: **aprobada** (2026-07-12). Generada con el flujo Spec-Driven Development.

## 1. Overview
App web que replica el Excel *"Investments Lemon House"* para que **Sergio y Noelia**
vean, desde el celular y cada uno donde esté, cuánto tiene invertido cada uno, cuánto
entre los dos, y el detalle por cuenta/broker y por tipo de activo. La v1 muestra
datos **importados una vez** desde el Excel; sin precios en vivo y sin edición.

## 2. Usuarios objetivo
- **Sergio y Noelia** (pareja). Los dos consultan; en la v1 nadie edita.
- Cada uno tiene cuentas/brokers que el otro no; necesitan ver **lo de cada uno y el
  consolidado**.
- Uso desde el **celular**, en momentos y lugares distintos.
- No buscan una planilla: buscan claridad ("¿cuánto tengo? ¿cuánto tenemos?").

## 3. Contexto del problema
- Hoy usan un Excel que funciona bien, pero vive en un archivo y no es cómodo de
  consultar juntos desde el celular.
- Cuesta ver el **consolidado familiar** porque cada uno tiene brokers propios.
- El Excel ya modela: **cuentas por titular, FCI, ON, Acciones y Criptomonedas**.
- Aclaración: la dificultad de traer valores de FCI (cuotaparte CAFCI) y ON **no se
  resuelve acá** — es un problema aparte, futuro.

## 4. Alcance v1

**Entra:**
- Importación **única** del Excel actual como semilla de datos.
- Vista **read-only** (solo consulta).
- Accesible por **web desde el celular** de cada uno, con los mismos datos para ambos.
- **Resumen de saldos**: total de Sergio, total de Noelia y total combinado,
  desglosado por cuenta/broker, en **$ y USD**.
- **Detalle de tenencias** por tipo de activo (FCI, ON, Acciones, Cripto) con los
  valores tal como están en el Excel.
- Siempre queda claro **de quién es** cada cosa (Sergio / Noelia / conjunto).

**Queda FUERA (v2+):**
- Editar o cargar datos desde la app.
- Precios/valores automáticos (Google Finance, cuotaparte CAFCI, valuación de ON).
- Gráficos e insights (posible v1.1, no en el mínimo).
- Conversión automática entre $ y USD (se muestran tal como vienen).
- Alertas, histórico y rendimiento en el tiempo.

## 5. Comportamiento esperado

- **DADO** que abro la app en el celu, **CUANDO** entro, **ENTONCES** veo el total de
  Sergio, el de Noelia y el combinado.
- **DADO** el resumen, **CUANDO** miro por cuenta/broker, **ENTONCES** veo cada cuenta
  con su titular y su monto en $ y en USD.
- **DADO** que quiero el detalle, **CUANDO** entro a un tipo de activo, **ENTONCES**
  veo la lista de tenencias con los campos del Excel (ticker, cantidad, valor compra,
  valor actual, rendimiento…).
- **DADO** cualquier dato, **ENTONCES** siempre se ve de quién es (Sergio / Noelia /
  conjunto).
- **DADO** que los valores no son en vivo, **ENTONCES** la app muestra visible la
  **fecha de última actualización** de los datos.
- **DADO** que ambos entran desde su celu, **CUANDO** cualquiera consulta,
  **ENTONCES** ve exactamente los mismos datos (una sola fuente compartida).

## 6. Posibles errores y mitigaciones

- **Celdas vacías o formato raro en el Excel** → la importación no falla en silencio;
  si una fila no se entiende, reporta cuál y por qué.
- **Monedas mezcladas** → nunca sumar $ con USD; los totales van **separados por moneda**.
- **Datos sensibles (patrimonio familiar)** → el acceso **no puede quedar público en
  internet**; debe haber al menos una barrera de acceso. Sin eso, la v1 no se publica.
  *(El mecanismo concreto se define en el plan.)*
- **Dato viejo confundido con dato en vivo** → dejar MUY claro que es una foto a una
  fecha, para no decidir creyendo que es tiempo real.
- **Alguien espera editar** → como es read-only, la app comunica que la carga sigue en
  el Excel por ahora.
