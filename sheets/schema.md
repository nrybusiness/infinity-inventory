# Schema técnico de Google Sheets

Este documento define el layout exacto de cada hoja, incluyendo fila de
encabezado, orden de columnas y tipos. **El orden de columnas es contractual:**
los DAOs leen por índice, así que no cambies el orden sin actualizar `Core/Config.gs`.

---

## Hoja `Productos`

**Fila 1 (encabezados):**

| A | B | C | D | E |
|---|---|---|---|---|
| producto_id | nombre | categoria | activo | creado_en |

**Tipos por columna:** `string | string | string | boolean | ISO datetime`

---

## Hoja `Variantes`

**Fila 1:**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| sku | producto_id | talla | costo | precio_dueña | precio_oferta | activo |

**Tipos:** `string | string | enum | number | number | number | boolean`

**Validación de `talla`:** `UNICA`, `S/M`, `L/XL`.

---

## Hoja `Vendedoras`

**Fila 1:**

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| vendedora_id | nombre | rol | usuario | password_hash | password_salt | activo | creado_en |

**Tipos:** `string | string | enum | string | string | string | boolean | ISO datetime`

**Validación de `rol`:** `dueña`, `vendedora`.
**Unicidad:** `usuario` debe ser único.

---

## Hoja `Stock`

**Fila 1:**

| A | B | C | D | E |
|---|---|---|---|---|
| stock_id | sku | vendedora_id | cantidad | actualizado_en |

**Tipos:** `string | string | string | integer≥0 | ISO datetime`

**Unicidad:** `stock_id` = `sku + ':' + vendedora_id`.

---

## Hoja `Movimientos`

**Fila 1:**

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| mov_id | fecha | tipo | sku | cantidad | vendedora_id | destino_id | precio_unitario | notas | creado_por |

**Tipos:** `string | ISO datetime | enum | string | integer | string | string? | number? | string | string`

**Validación de `tipo`:** `VENTA`, `ENTREGA`, `INGRESO`, `AJUSTE`.

---

## Hoja `Sesiones`

**Fila 1:**

| A | B | C | D |
|---|---|---|---|
| token | vendedora_id | creado_en | expira_en |

**Tipos:** `string | string | ISO datetime | ISO datetime`

---

## Hoja `Config`

**Fila 1:**

| A | B |
|---|---|
| clave | valor |

**Registros iniciales (seed):**

| clave | valor |
|-------|-------|
| version_schema | 1.0 |
| moneda | COP |
| timezone | America/Bogota |
| sesion_ttl_segundos | 28800 |

---

## Orden de creación de las hojas

Al crear el Sheet por primera vez, el helper `inicializarSheet()` (definido
en el Lote 3) crea las hojas en este orden: `Config`, `Productos`, `Variantes`,
`Vendedoras`, `Stock`, `Movimientos`, `Sesiones`.
