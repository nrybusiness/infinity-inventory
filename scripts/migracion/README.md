# Script de Migración v2

Transforma los CSVs legacy del inventario INFINITY al nuevo schema relacional, **preservando toda la información útil** del sistema antiguo.

## Uso

```bash
python3 scripts/migracion/migrar_csv.py
```

**Input:** `data/raw/`
- `INV_COMPLETO.csv`
- `Precios.csv`
- `kardex_Naty.csv`

**Output:** `data/migrated/`
- `productos.csv` · `variantes.csv` · `vendedoras.csv`
- `stock.csv` · `movimientos.csv` · `config.csv`
- `combos.csv` · `combo_items.csv` ← **nuevos en v2**

## Rescate de información (v2)

Esta versión rescata información que la v1 perdía:

### 1. Producto "Quinto elemento"
Solo aparecía en `Precios.csv` y `kardex_Naty.csv`, no en `INV_COMPLETO.csv`. La v1 lo ignoró; la v2 lo agrega con costo y precio_dueña en `0` (editable por admin).

### 2. Combos / Conjuntos
La columna *Observaciones* de `Precios.csv` tenía combos como *"Conjunto jogger / Leggings $113.000"*. La v2 los parsea y los guarda en 2 hojas nuevas:
- **`Combos`** — nombre y precio del combo.
- **`ComboItems`** — qué SKUs componen cada combo (relación many-to-many).

Por ahora son solo datos. La UI para vender combos se puede agregar en una iteración posterior.

### 3. Ventas históricas granulares de Naty
La v1 usaba solo `INV_COMPLETO.VENDIDO` (columna tipo *"4C - 3N"*) y asignaba todas las ventas a la primera talla del producto. La v2 usa `kardex_Naty.Vendidos` (campos como *"1S Y 1L"*, *"2L"*, *"3U"*), que es **más preciso** porque discrimina por talla. Las ventas de Carolina (`C`) se siguen sacando de `INV_COMPLETO` porque no hay kardex de ella.

### 4. Entregas históricas
La columna `Entregados` de `INV_COMPLETO.csv` (ej. *"-1 S/M"*, *"-1 L/XL"*) ahora se parsea y genera movimientos `ENTREGA` históricos (V02 → V01). Si la talla es ambigua, se asigna a la primera variante del producto.

### 5. Devolución del "Quinto elemento"
El kardex de Naty decía *"1 devolución"* para ese producto. La v2 lo registra como un movimiento `ENTREGA` real.

## Reglas de stock inicial

- **Lorena (`V01`):** todo el stock de `INV_COMPLETO` **menos** lo que está en el kardex de Naty.
- **Nataly (`V02`):** lo que aparece en `kardex_Naty.csv`, con movimientos `INGRESO` generados para cada asignación.
- **Carolina (`V03`):** **vacío**. Lorena le asignará stock desde el ADS cuando corresponda (usando la vista de vendedoras + formulario de ingreso).

## Limitaciones conocidas

- Todas las fechas históricas se marcan como `2026-01-01T00:00:00-05:00` (no existe fecha real en el legacy).
- Las ventas de Carolina se asignan a la primera talla del producto (no hay info granular en `INV_COMPLETO.VENDIDO`).
- Los combos vienen sin combinación de tallas específicas: se agrega **un item por cada variante** del producto involucrado. El admin puede refinar esto manualmente después.
- El producto "Quinto elemento" queda con costo y precio_dueña en `0`; Lorena debe completarlos desde el ADS.

## Stats esperadas

```
  Productos:    49     (+1 por Quinto elemento)
  Variantes:    86
  Stock rows:   258
  Movimientos:  99     (más entregas históricas y ventas granulares)
  Combos:       10
  Combo items:  36
```

## Cómo cargar los CSVs al Sheet

1. Ejecuta `instalarSistema()` en Apps Script para crear las 8 hojas con headers.
2. Para cada CSV en `data/migrated/`: `Archivo → Importar → Subir → Reemplazar la hoja actual`.
3. Edita los emails reales en la hoja `Vendedoras`.
