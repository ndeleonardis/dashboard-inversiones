# Cambio: valor actual de las posiciones

> Cambio sobre la spec `docs/specs/2026-10-26-lemonhouse-v1.md`. Fecha 2026-11-03. Primer cambio de la v2. Solo dice qué cambia.
>
> Aprobada el 2026-11-03.
>
> Cerrada el 2026-11-03: verificada en el navegador (dev, 390 px y 1.280 px), revisada con `/code-review` y fusionada en `docs/specs/2026-10-26-lemonhouse-v1.md` con las aclaraciones de la verificación. Esta carpeta queda como historial.

## 1. Overview

LemonHouse muestra cuánto vale hoy cada posición y cuánto vale lo invertido de cada persona y del grupo, junto al costo de compra que ya mostraba. Cada valor dice de qué fecha es. Si un instrumento no tiene valor conocido, se dice "Sin precio" y nunca se muestra $ 0. En este cambio los valores no se cargan desde la app. Los trae un proceso automático, que se suma en el cambio siguiente.

## 2. Usuarios objetivo

- **Sergio y Noelia.** Ya cargaron sus tenencias en la v1, pero para saber cuánto valen tienen que entrar a cada banco y broker.
- **Cualquier grupo con su copia.** Necesita lo mismo, con sus propios instrumentos.

## 3. Contexto del problema

La v1 muestra lo invertido a costo de compra, que dice cuánto se puso pero no cuánto vale hoy. Para saber si una inversión gana o pierde hay que ir a otro lado. Los fondos comunes publican su valor cada mil cuotapartes y las ON cotizan cada 100 de valor nominal, así que hacer la cuenta a mano es fácil de errar.

## 4. Señales de éxito

- Sergio y Noelia miran en LemonHouse cuánto vale hoy su cartera, en vez de entrar a cada banco.
- Ningún instrumento aparece con valor $ 0 por falta de dato. Si falta el valor, la app lo dice.

## 5. Alcance

### Entra

- El valor actual de cada posición, en la moneda del instrumento, con la fecha del valor.
- La conversión de los FCI (valor cada mil cuotapartes) y de las ON (cada 100 de valor nominal).
- "Sin precio" cuando no hay valor conocido.
- El valor actual de lo invertido, por persona y del grupo, en cada moneda.
- El rendimiento (valor actual menos costo) por posición y en el total.

### Queda fuera

| Qué | Motivo |
|---|---|
| Traer los valores automáticamente | Va en otro cambio (el siguiente, empezando por los FCI). Este cambio funciona con valores de cualquier origen |
| Valores de acciones, CEDEAR, ON, ETF y cripto desde sus fuentes | Va en otros cambios, de a una fuente por vez |
| Cargar o corregir un valor a mano desde la app | Poco impacto y riesgoso. Un valor escrito a mano puede quedar viejo o inventado sin que se note. Los valores vienen solo de las fuentes |
| Comprar un FCI por monto y que la app calcule las cuotapartes | Descartado el 2026-11-03. La compra se carga con los datos del comprobante del banco, que es el dato real |
| Un total que sume pesos con dólares | Prematuro. Exige elegir un dólar y una fecha. La regla de nunca mezclar monedas sigue igual |
| Historia del valor y gráficos | Va en otra versión (v3) |
| Rentas, dividendos y amortizaciones en el rendimiento | Va en otra versión. Siguen sin poder cargarse (C30) |

**MODIFICA la sección 5 de la spec principal.** La fila "Precios actuales y rendimiento" de "Queda fuera" pasa a "Entra", limitada a lo que trae este cambio.

## 6. Comportamiento esperado

### Valor de la posición

- **C34 (P0) AGREGA.** DADO una posición con un valor conocido de su instrumento, CUANDO se mira la posición de la cuenta, ENTONCES cada instrumento muestra, además de la cantidad y el costo, el valor actual (cantidad por el último valor conocido), en la moneda del instrumento, con la fecha de ese valor ("Valor al 02/11").
- **C35 (P0) AGREGA.** DADO un FCI, CUANDO se calcula su valor, ENTONCES se usa el valor de una cuotaparte, que es el publicado dividido 1.000. Ejemplo: 1.500 cuotapartes con un valor publicado de $ 2.345.678,90 valen $ 3.518.518,35.
- **C36 (P0) AGREGA.** DADO una ON, CUANDO se calcula su valor, ENTONCES el precio se toma cada 100 de valor nominal. Ejemplo: 1.000 de valor nominal a US$ 102,50 valen US$ 1.025.
- **C37 (P0) AGREGA.** DADO un instrumento sin ningún valor conocido, CUANDO se mira su posición, ENTONCES el valor dice "Sin precio", nunca $ 0, y el costo se sigue viendo.
- **C38 (P1) AGREGA.** DADO un valor con más de 7 días de antigüedad, CUANDO se muestra, ENTONCES se marca como desactualizado, junto a su fecha.
- **C39 (P1) AGREGA.** DADO un FCI sin código CAFCI, CUANDO se mira su posición, ENTONCES dice "Sin precio: falta el código CAFCI" y lleva al instrumento para cargarlo.

### Resumen

- **C40 (P0) MODIFICA C23.** DADO operaciones cargadas, CUANDO se abre el resumen, ENTONCES el bloque de inversiones muestra para cada persona y para el grupo el costo de compra y el valor actual, por separado en pesos y en dólares.
- **C41 (P0) AGREGA.** DADO un total con algún instrumento sin precio, CUANDO se muestra, ENTONCES el valor actual se marca como parcial y dice cuántos instrumentos no tienen precio. Nunca se muestra como si fuera completo.

### Rendimiento

- **C42 (P1) AGREGA.** DADO una posición o un total con valor actual, CUANDO se muestra, ENTONCES también se ve el rendimiento (valor actual menos costo, en monto y en porcentaje), en verde si gana y en rojo si pierde. Si el valor es parcial o no hay precio, no se muestra rendimiento.

### Futuro

- **C29 ELIMINA.** Pasa a construirse con C34, C37 y C38.

## 7. Posibles errores y mitigaciones

| Caso | Mitigación |
|---|---|
| Un instrumento nunca tuvo valor | "Sin precio" (C37). No suma al total, y el total se marca como parcial (C41) |
| El último valor es viejo (por ejemplo, un fondo que dejó de publicar) | Se muestra con su fecha y marcado como desactualizado (C38) |
| La fuente corrige el valor de un día ya publicado | Se muestra el valor corregido, sin ningún paso de la usuaria |
| Se corrige el código CAFCI de un fondo | El valor pasa a ser el del código nuevo. El del código anterior deja de mostrarse |
| Confundir el valor cada mil cuotapartes con el de una cuotaparte | Criterio C35 con su ejemplo. Un error así multiplica el valor por mil y se vería enseguida |
| Posición vendida por completo | No aparece, igual que en la v1 |
| Mezclar monedas en un total | No puede pasar. El valor va en la moneda del instrumento, igual que el costo (C24) |

## 8. Preguntas abiertas

- **No bloqueante.** ¿Las ON que ya amortizaron cotizan cada 100 de valor nominal original o del residual? Cambia la cuenta de C36 para esas ON. Se confirma con un dato real en el cambio de Open BYMA, que es cuando lleguen valores de ON.
- **No bloqueante.** ¿Siete días es el umbral correcto para "desactualizado"? Se ajusta después de usarlo.
