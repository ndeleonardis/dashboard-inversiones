# Cambio: Pesaje

> Cambio sobre la spec `docs/specs/2026-10-26-lemonhouse-v1.md`. Fecha 2026-11-03. Solo dice qué cambia.
>
> Pesaje no es parte del propósito financiero de LemonHouse. Es un módulo opcional que cada copia prende si lo quiere, y no toca nada de lo financiero. La decisión de cómo se prende está en `decision-interruptor.md`, en esta misma carpeta.
>
> Aprobada el 2026-11-03.

## 1. Overview

Pesaje es una tabla para registrar cada semana el peso de las personas y las mascotas de la casa, con la fecha, el peso en kilogramos y observaciones. Muestra la variación contra el pesaje anterior, en verde o en rojo según el objetivo de cada uno, y un gráfico de evolución. Vive dentro de LemonHouse solo porque ya está a mano, y solo aparece en las copias que lo activan.

## 2. Usuarios objetivo

- **Sergio y Noelia.** Pesan todas las semanas a personas y mascotas de la casa, y son los únicos que cargan. Los demás que se pesan no entran a la app.
- **Cualquier otra copia.** No necesita Pesaje. Si no lo activa, no lo ve.

## 3. Contexto del problema

Hoy el pesaje se anota en un papel. Ver cómo viene cada uno obliga a buscar las semanas anteriores y hacer la cuenta a mano, y el papel se pierde o se llena. Armar una app aparte para esto no se justifica, y LemonHouse ya es algo que abren seguido.

## 4. Señales de éxito

- El pesaje semanal se carga en LemonHouse y el papel deja de usarse.
- Sergio y Noelia ven, sin hacer cuentas, cuánto subió o bajó cada uno desde la semana anterior.

## 5. Alcance

### Entra

- Prender o apagar Pesaje para cada copia. Viene apagado.
- Una lista propia de quiénes se pesan, aparte de las personas del grupo, que se puede ampliar, renombrar y desactivar.
- Un objetivo para cada uno (bajar, subir o sin objetivo), que define si su variación se ve como buena o mala.
- La carga de un pesaje: una fecha y el peso de todos los de la lista juntos, cada uno con sus observaciones. Quien no se pesó queda vacío.
- Editar y borrar cada peso.
- La tabla de pesajes, con la variación contra el pesaje anterior y un filtro por quién se pesó.
- Un gráfico de evolución de cada uno.

### Queda fuera

| Qué | Motivo |
|---|---|
| Pasar el historial del papel | No hace falta. Se empieza a cargar desde ahora |
| Prender o apagar Pesaje desde una pantalla de la app | Muy complejo. La app no tiene pantalla de configuración y habría que crearla solo para esto (ver `decision-interruptor.md`) |
| Un peso meta ("llegar a 55 kg") y cuánto falta | Va en otra versión. Con la dirección del objetivo alcanza para saber si se va bien |
| Objetivo "mantener" | Prematuro. Exige definir un margen de tolerancia, y "bajar" ya cubre no querer subir |
| Alertas o avisos | Poco impacto. Lo que se usa hoy es solo el registro |
| IMC, altura u otras medidas del cuerpo | Poco impacto, y suma datos de salud que hoy no se anotan |
| Recordatorio semanal para pesarse | Poco impacto. El pesaje ya es una rutina |
| Libras u otras unidades | Poco impacto. Todo se anota en kilogramos |
| Relacionar Pesaje con lo financiero (personas, cuentas, gastos) | Fuera del producto. Son cosas separadas a propósito |

## 6. Comportamiento esperado

### Activación

- **C43 (P0) AGREGA.** DADO una copia que no activó Pesaje, CUANDO se usa la app, ENTONCES Pesaje no aparece en el menú, su pantalla no se puede abrir ni escribiendo la dirección, y el resto de la app funciona igual que antes.
- **C44 (P0) AGREGA.** DADO una copia que activó Pesaje, CUANDO se abre el menú, ENTONCES Pesaje aparece al final, separado de las entradas financieras.

### Quiénes se pesan

- **C45 (P0) AGREGA.** DADO Pesaje activo, CUANDO se agrega a alguien a la lista con su nombre, ENTONCES aparece en la carga de pesajes. No es una persona del grupo, así que no aparece en cuentas, gastos, ingresos ni resumen, y no puede entrar a la app.
- **C46 (P0) AGREGA.** DADO alguien en la lista, CUANDO se intenta agregar otro con el mismo nombre, ENTONCES no se guarda y se avisa que ya existe.
- **C47 (P1) AGREGA.** DADO alguien con pesajes, CUANDO se le cambia el nombre, ENTONCES sus pesajes anteriores muestran el nombre nuevo.
- **C48 (P1) AGREGA.** DADO alguien en la lista, CUANDO se lo desactiva, ENTONCES deja de aparecer en la carga, pero sus pesajes se siguen viendo en la tabla, el filtro y el gráfico. Se puede volver a activar.
- **C49 (P0) AGREGA.** DADO alguien con pesajes, CUANDO se intenta borrarlo de la lista, ENTONCES no se borra, se avisa que tiene pesajes cargados y se sugiere desactivarlo.
- **C61 (P1) AGREGA.** DADO alguien en la lista, CUANDO se le elige un objetivo, ENTONCES puede ser "Bajar", "Subir" o "Sin objetivo". Quien se agrega a la lista arranca con "Sin objetivo", y el objetivo se puede cambiar en cualquier momento desde la lista.

### Carga

- **C50 (P0) AGREGA.** DADO la lista con sus integrantes activos, CUANDO se carga un pesaje, ENTONCES se elige la fecha (por defecto hoy) y aparece un renglón por cada integrante activo, con su peso y sus observaciones. Los renglones sin peso no se guardan. Se guarda si hay al menos un peso.
- **C51 (P0) AGREGA.** DADO un peso, CUANDO se carga, ENTONCES se expresa en kilogramos con hasta dos decimales (57,30 kg o 4,35 kg). Si es cero, negativo o mayor que 300 kg, no se guarda y se dice en qué renglón está el error.
- **C52 (P0) AGREGA.** DADO alguien que ya tiene un peso en una fecha, CUANDO se carga otro peso suyo en la misma fecha, ENTONCES no se guarda, se avisa que ya tiene un pesaje ese día y se ofrece editar el existente.
- **C53 (P0) AGREGA.** DADO una carga, CUANDO se elige una fecha futura, ENTONCES no se guarda y se avisa.
- **C54 (P0) AGREGA.** DADO un peso cargado, CUANDO se edita la fecha, el peso o las observaciones, o se lo borra, ENTONCES la tabla, la variación y el gráfico reflejan el cambio sin ningún paso extra.

### Tabla, variación y gráfico

- **C55 (P0) AGREGA.** DADO pesajes cargados, CUANDO se abre Pesaje, ENTONCES se ve una tabla con fecha, quién, peso (57,30 kg) y observaciones, con lo más reciente primero.
- **C56 (P1) AGREGA.** DADO un peso con un pesaje anterior de la misma persona o mascota, CUANDO se muestra, ENTONCES se ve la variación contra ese pesaje anterior, con signo (+0,30 kg, −0,15 kg). Si es el primero, dice "Primer pesaje".
- **C62 (P1) AGREGA.** DADO una variación, CUANDO se muestra, ENTONCES su color sale del objetivo actual de quien se pesó. Con "Bajar", bajar es verde y subir es rojo. Con "Subir", al revés. Con "Sin objetivo", o si el peso no cambió, va en neutro. El color va siempre junto al signo y a una flecha, para que se entienda sin distinguir colores. Si cambia el objetivo, todas sus variaciones, también las viejas, se muestran según el objetivo nuevo.
- **C57 (P1) AGREGA.** DADO la tabla, CUANDO se filtra por quién se pesó, ENTONCES se ven solo sus pesajes, y la variación sigue siendo contra su pesaje anterior.
- **C58 (P1) AGREGA.** DADO alguien con pesajes, CUANDO se mira su gráfico de evolución, ENTONCES se ve su peso a lo largo del tiempo, con la escala ajustada a su peso, para que la variación de una mascota de 4 kg se note tanto como la de una persona de 60 kg. Las semanas sin pesaje no se dibujan como cero. El gráfico muestra el objetivo como una etiqueta ("Objetivo: bajar"), sin colorear la línea.

### Trazabilidad y datos

- **C59 (P0) AGREGA.** DADO un peso cargado, CUANDO se guarda, ENTONCES queda registrado quién lo cargó y cuándo, igual que en C27.
- **C60 (P0) AGREGA.** DADO el repositorio público, CUANDO se levanta una copia nueva, ENTONCES los ejemplos de Pesaje usan nombres ficticios y ningún nombre real de una persona o mascota, igual que en C28.

## 7. Posibles errores y mitigaciones

| Caso | Mitigación |
|---|---|
| Se escribe el peso con punto en vez de coma (57.3) | Se toma igual que con coma. Nunca se guarda un peso distinto del que se quiso escribir |
| Se escribe en gramos por error (4350 para un gato) | Supera los 300 kg y no se guarda (C51) |
| Alguien no se pesó esa semana | Su renglón queda vacío y no se guarda nada para él (C50). En el gráfico no aparece como cero (C58) |
| Se carga dos veces el mismo día | No se guarda el segundo y se ofrece editar el primero (C52) |
| Se carga el peso en el renglón equivocado | Se edita ese peso (C54) |
| Una mascota ya no está | Se la desactiva y su historial se conserva (C48) |
| Cambia el objetivo de alguien (deja de crecer, llega a un peso sano) | Se cambia desde la lista (C61) y sus variaciones se recolorean con el objetivo nuevo (C62) |
| Alguien sin objetivo sube o baja | La variación va en neutro. La app no decide por su cuenta qué es bueno (C62) |
| Se apaga Pesaje en una copia que tenía datos | Los datos no se borran. Si se vuelve a prender, reaparecen |
| Alguien de la lista tiene un solo pesaje | El gráfico muestra ese único punto, sin línea |

## 8. Preguntas abiertas

- **No bloqueante.** ¿300 kg es un buen tope? Se ajusta si molesta al usarlo.
