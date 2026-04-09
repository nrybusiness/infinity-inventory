#!/usr/bin/env python3
"""
Script de migración v2: transforma los CSVs legacy de Inventario_INFINITY
al nuevo schema relacional, preservando TODA la información útil del legacy:

- Productos + Variantes (desde INV_COMPLETO + Precios)
- Producto "Quinto elemento" (solo aparece en Precios + Kardex)
- Combos (desde columna Observaciones de Precios.csv)
- Stock inicial (todo en Lorena — Carolina arranca vacía)
- Movimientos VENTA históricos (Naty desde Kardex por talla, Caro desde INV_COMPLETO.VENDIDO)
- Movimientos ENTREGA históricos (desde columna Entregados de INV_COMPLETO)
- Movimiento ENTREGA de "Quinto elemento" (1 devolución en kardex de Naty)
"""

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "migrated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

VENDEDORAS = [
    {"vendedora_id": "V00", "nombre": "Desarrollador", "email": "superadmin@placeholder.com", "rol": "superadmin", "activo": "TRUE"},
    {"vendedora_id": "V01", "nombre": "Lorena", "email": "lorena@placeholder.com", "rol": "admin", "activo": "TRUE"},
    {"vendedora_id": "V02", "nombre": "Nataly", "email": "nataly@placeholder.com", "rol": "vendedora", "activo": "TRUE"},
    {"vendedora_id": "V03", "nombre": "Carolina", "email": "carolina@placeholder.com", "rol": "vendedora", "activo": "TRUE"},
]

FECHA_MIGRACION = "2026-01-01T00:00:00-05:00"


def parse_money(s):
    if not s or not s.strip():
        return 0
    s = s.replace("$", "").replace(" ", "").strip()
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
        try: return int(float(s))
        except ValueError: return 0
    s = s.replace(".", "")
    try: return int(s)
    except ValueError: return 0


def parse_qty(s):
    if not s or s.strip().lower() == "x":
        return 0
    try: return int(s.strip())
    except ValueError: return 0


def is_unica(unica_col, sm_col, lxl_col):
    return unica_col.strip().lower() != "x" and unica_col.strip() != ""


def slug_categoria(nombre):
    n = nombre.lower()
    if "leggin" in n: return "Leggins"
    if "hoodie" in n or "buso" in n: return "Hoodies"
    if "top" in n: return "Tops"
    if "short" in n: return "Shorts"
    if "biker" in n: return "Bikers"
    if "falda" in n: return "Faldas"
    if "jogger" in n: return "Joggers"
    if "camiseta" in n or "sisa" in n or "holgada" in n: return "Camisetas"
    if "body" in n: return "Bodies"
    return "Otros"


def limpiar_nombre(raw):
    return re.sub(r"^\s*\d+\.\s*", "", raw).strip()


def parse_vendido_inv(vendido_str):
    """INV_COMPLETO.VENDIDO: '2N', '1C', '4C - 3N', '2C 1N' → {V02, V03}"""
    out = {"V02": 0, "V03": 0}
    if not vendido_str:
        return out
    for num, letra in re.findall(r"(\d+)\s*([NC])", vendido_str.strip()):
        if letra == "N": out["V02"] += int(num)
        elif letra == "C": out["V03"] += int(num)
    return out


def parse_vendido_kardex(vendido_str):
    """kardex_Naty.Vendidos: '1S Y 1L', '2L', '3U', '1S-1L', '1 devolución'"""
    out = {"SM": 0, "LXL": 0, "U": 0, "devolucion": 0}
    if not vendido_str:
        return out
    s = vendido_str.strip().lower()
    if "devoluc" in s:
        m = re.search(r"(\d+)\s*devoluc", s)
        out["devolucion"] = int(m.group(1)) if m else 1
        return out
    for num, letra in re.findall(r"(\d+)\s*([sluSLU])", s):
        l = letra.lower()
        if l == "s": out["SM"] += int(num)
        elif l == "l": out["LXL"] += int(num)
        elif l == "u": out["U"] += int(num)
    return out


def parse_entregados(entregados_str):
    """INV_COMPLETO.Entregados: '-1 L/XL', '-1 S/M   -1L/XL', '-1'"""
    out = {"SM": 0, "LXL": 0, "U": 0, "ambiguo": 0}
    if not entregados_str or not entregados_str.strip():
        return out
    s = entregados_str.strip().replace("L/XL", "LXL").replace("l/xl", "LXL").replace("S/M", "SM").replace("s/m", "SM")
    for num, talla in re.findall(r"-?(\d+)\s*(LXL|SM|U)?", s):
        c = int(num)
        if talla == "SM": out["SM"] += c
        elif talla == "LXL": out["LXL"] += c
        elif talla == "U": out["U"] += c
        else: out["ambiguo"] += c
    return out


def parse_conjunto(obs_str):
    """'Conjunto jogger / Leggings $113.000' → ('Conjunto jogger / Leggings', 113000)"""
    if not obs_str or not obs_str.strip():
        return None
    s = obs_str.strip()
    if "conjunto" not in s.lower():
        return None
    m = re.search(r"\$?\s*([\d.]+)", s)
    if not m:
        return None
    precio_str = m.group(1).replace(".", "").replace("$", "")
    try:
        precio = int(precio_str)
        if precio < 1000:
            precio *= 1000
    except ValueError:
        return None
    nombre = re.sub(r"\$?\s*[\d.]+\s*$", "", s).strip(" /-")
    return (nombre, precio)


def main():
    print("=" * 60)
    print("MIGRACIÓN INFINITY INVENTORY v2")
    print("=" * 60)

    productos = []
    variantes = []
    movimientos = []
    combos = []
    combo_items = []

    producto_counter = 0
    mov_counter = 0
    combo_counter = 0
    nombres_vistos = {}
    inv_rows = []

    # FASE 1: INV_COMPLETO
    with open(RAW_DIR / "INV_COMPLETO.csv", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        for row in reader:
            if len(row) < 9 or not row[1].strip():
                continue
            nombre = limpiar_nombre(row[1])
            nombre_key = nombre.lower().strip()

            if nombre_key in nombres_vistos:
                producto_id = nombres_vistos[nombre_key]
            else:
                producto_counter += 1
                producto_id = f"P{producto_counter:03d}"
                nombres_vistos[nombre_key] = producto_id
                productos.append({
                    "producto_id": producto_id,
                    "nombre": nombre,
                    "categoria": slug_categoria(nombre),
                    "activo": "TRUE"
                })

            unica_col, sm_col, lxl_col = row[2], row[3], row[4]
            costo = parse_money(row[5])
            precio_duena = parse_money(row[6])
            vendido_str = row[7] if len(row) > 7 else ""
            entregados_str = row[8] if len(row) > 8 else ""

            if is_unica(unica_col, sm_col, lxl_col):
                tallas = [("U", parse_qty(unica_col))]
            else:
                tallas = [("SM", parse_qty(sm_col)), ("LXL", parse_qty(lxl_col))]

            for talla, cantidad in tallas:
                variantes.append({
                    "sku": f"{producto_id}-{talla}",
                    "producto_id": producto_id,
                    "talla": talla,
                    "costo": costo,
                    "precio_duena": precio_duena,
                    "precio_oferta": precio_duena,
                    "activo": "TRUE"
                })

            inv_rows.append({
                "producto_id": producto_id,
                "nombre": nombre,
                "tallas": tallas,
                "vendido_str": vendido_str,
                "entregados_str": entregados_str,
            })

    # FASE 2: Precios.csv — precio_oferta + combos + Quinto elemento
    precios_oferta = {}
    combos_raw = {}

    with open(RAW_DIR / "Precios.csv", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader); next(reader); next(reader)
        for row in reader:
            if len(row) < 7 or not row[1].strip():
                continue
            nombre_lower = row[1].strip().lower()
            precio_of = parse_money(row[6])
            if precio_of > 0:
                precios_oferta[nombre_lower] = precio_of

            # Quinto elemento — único que falta en INV_COMPLETO
            if "quinto elemento" in nombre_lower and nombre_lower not in nombres_vistos:
                producto_counter += 1
                producto_id = f"P{producto_counter:03d}"
                nombres_vistos[nombre_lower] = producto_id
                productos.append({
                    "producto_id": producto_id,
                    "nombre": "Quinto elemento",
                    "categoria": "Otros",
                    "activo": "TRUE"
                })
                variantes.append({
                    "sku": f"{producto_id}-U",
                    "producto_id": producto_id,
                    "talla": "U",
                    "costo": 0,
                    "precio_duena": 0,
                    "precio_oferta": precio_of,
                    "activo": "TRUE"
                })

            # Combos en columnas 7, 8, 9
            for col_idx in (7, 8, 9):
                if col_idx < len(row):
                    combo = parse_conjunto(row[col_idx])
                    if combo:
                        combos_raw.setdefault(nombre_lower, []).append(combo)

    # Aplicar precio_oferta real
    for v in variantes:
        prod = next((p for p in productos if p["producto_id"] == v["producto_id"]), None)
        if prod:
            key = prod["nombre"].lower().strip()
            if key in precios_oferta:
                v["precio_oferta"] = precios_oferta[key]

    # FASE 3: Construir Combos + ComboItems
    combos_unicos = {}
    combo_a_productos = {}

    for nombre_prod_lower, lista in combos_raw.items():
        prod_id_involucrado = nombres_vistos.get(nombre_prod_lower)
        if not prod_id_involucrado:
            continue
        for nombre_combo, precio in lista:
            key = (nombre_combo.lower().strip(), precio)
            if key not in combos_unicos:
                combo_counter += 1
                cid = f"C{combo_counter:03d}"
                combos_unicos[key] = cid
                combos.append({
                    "combo_id": cid,
                    "nombre": nombre_combo,
                    "precio": precio,
                    "activo": "TRUE"
                })
                combo_a_productos[cid] = set()
            combo_a_productos[combos_unicos[key]].add(prod_id_involucrado)

    for cid, prod_ids in combo_a_productos.items():
        for pid in prod_ids:
            for v in variantes:
                if v["producto_id"] == pid:
                    combo_items.append({"combo_id": cid, "sku": v["sku"]})

    # FASE 4: kardex_Naty
    kardex_naty = {}
    ventas_naty_kardex = {}

    with open(RAW_DIR / "kardex_Naty.csv", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader); next(reader); next(reader)
        for row in reader:
            if len(row) < 7 or not row[1].strip():
                continue
            nombre_lower = row[1].strip().lower()
            unica_col, sm_col, lxl_col = row[2], row[3], row[4]
            vendidos_str = row[7] if len(row) > 7 else ""

            if is_unica(unica_col, sm_col, lxl_col):
                kardex_naty[(nombre_lower, "U")] = parse_qty(unica_col)
            else:
                kardex_naty[(nombre_lower, "SM")] = parse_qty(sm_col)
                kardex_naty[(nombre_lower, "LXL")] = parse_qty(lxl_col)

            if vendidos_str:
                ventas_naty_kardex[nombre_lower] = parse_vendido_kardex(vendidos_str)

    # FASE 5: Stock inicial (Lorena=todo, Naty=kardex, Caro=0)
    productos_por_id = {p["producto_id"]: p for p in productos}
    stock_dict = {}

    for v in variantes:
        sku = v["sku"]
        stock_dict[(sku, "V01")] = 0
        stock_dict[(sku, "V02")] = 0
        stock_dict[(sku, "V03")] = 0

    for row_inv in inv_rows:
        for talla, cantidad in row_inv["tallas"]:
            sku = f"{row_inv['producto_id']}-{talla}"
            stock_dict[(sku, "V01")] = cantidad

    # Transferir a Naty
    for v in variantes:
        sku = v["sku"]
        prod = productos_por_id.get(v["producto_id"])
        if not prod:
            continue
        nombre_key = prod["nombre"].lower().strip()
        talla = v["talla"]
        cant_naty = kardex_naty.get((nombre_key, talla), 0)
        if cant_naty > 0:
            disponible_lorena = stock_dict[(sku, "V01")]
            if disponible_lorena >= cant_naty:
                stock_dict[(sku, "V01")] -= cant_naty
                stock_dict[(sku, "V02")] = cant_naty
            else:
                # Caso especial Quinto elemento (Lorena no tenía, Naty sí)
                stock_dict[(sku, "V01")] = 0
                stock_dict[(sku, "V02")] = cant_naty

            mov_counter += 1
            movimientos.append({
                "mov_id": f"M{mov_counter:04d}",
                "fecha": FECHA_MIGRACION,
                "tipo": "INGRESO",
                "sku": sku,
                "cantidad": cant_naty,
                "vendedora_id": "V01",
                "destino_id": "V02",
                "notas": "Migración: stock asignado a Nataly según kardex",
                "usuario_email": "superadmin@placeholder.com"
            })

    # FASE 6: Ventas históricas
    # Caro: desde INV_COMPLETO
    for row_inv in inv_rows:
        ventas_inv = parse_vendido_inv(row_inv["vendido_str"])
        if ventas_inv["V03"] > 0:
            primera_talla = row_inv["tallas"][0][0]
            sku = f"{row_inv['producto_id']}-{primera_talla}"
            mov_counter += 1
            movimientos.append({
                "mov_id": f"M{mov_counter:04d}",
                "fecha": FECHA_MIGRACION,
                "tipo": "VENTA",
                "sku": sku,
                "cantidad": ventas_inv["V03"],
                "vendedora_id": "V03",
                "destino_id": "",
                "notas": "Migración: venta histórica Carolina",
                "usuario_email": "superadmin@placeholder.com"
            })

    # Naty: desde kardex (más preciso, por talla)
    for nombre_lower, ventas_kx in ventas_naty_kardex.items():
        prod_id = nombres_vistos.get(nombre_lower)
        if not prod_id:
            continue

        for talla_key, cantidad in ventas_kx.items():
            if cantidad <= 0:
                continue
            if talla_key == "devolucion":
                primera = next((v for v in variantes if v["producto_id"] == prod_id), None)
                if primera:
                    mov_counter += 1
                    movimientos.append({
                        "mov_id": f"M{mov_counter:04d}",
                        "fecha": FECHA_MIGRACION,
                        "tipo": "ENTREGA",
                        "sku": primera["sku"],
                        "cantidad": cantidad,
                        "vendedora_id": "V02",
                        "destino_id": "V01",
                        "notas": "Migración: devolución histórica registrada en kardex",
                        "usuario_email": "superadmin@placeholder.com"
                    })
            else:
                sku = f"{prod_id}-{talla_key}"
                if not any(v["sku"] == sku for v in variantes):
                    primera = next((v for v in variantes if v["producto_id"] == prod_id), None)
                    if not primera:
                        continue
                    sku = primera["sku"]
                mov_counter += 1
                movimientos.append({
                    "mov_id": f"M{mov_counter:04d}",
                    "fecha": FECHA_MIGRACION,
                    "tipo": "VENTA",
                    "sku": sku,
                    "cantidad": cantidad,
                    "vendedora_id": "V02",
                    "destino_id": "",
                    "notas": "Migración: venta histórica Nataly (desde kardex por talla)",
                    "usuario_email": "superadmin@placeholder.com"
                })

    # FASE 7: ENTREGAS históricas desde INV_COMPLETO.Entregados
    for row_inv in inv_rows:
        entregas = parse_entregados(row_inv["entregados_str"])
        tallas_disponibles = [t[0] for t in row_inv["tallas"]]

        for talla_key in ("SM", "LXL", "U"):
            if entregas[talla_key] > 0 and talla_key in tallas_disponibles:
                sku = f"{row_inv['producto_id']}-{talla_key}"
                mov_counter += 1
                movimientos.append({
                    "mov_id": f"M{mov_counter:04d}",
                    "fecha": FECHA_MIGRACION,
                    "tipo": "ENTREGA",
                    "sku": sku,
                    "cantidad": entregas[talla_key],
                    "vendedora_id": "V02",
                    "destino_id": "V01",
                    "notas": "Migración: entrega histórica desde INV_COMPLETO",
                    "usuario_email": "superadmin@placeholder.com"
                })

        if entregas["ambiguo"] > 0 and tallas_disponibles:
            sku = f"{row_inv['producto_id']}-{tallas_disponibles[0]}"
            mov_counter += 1
            movimientos.append({
                "mov_id": f"M{mov_counter:04d}",
                "fecha": FECHA_MIGRACION,
                "tipo": "ENTREGA",
                "sku": sku,
                "cantidad": entregas["ambiguo"],
                "vendedora_id": "V02",
                "destino_id": "V01",
                "notas": "Migración: entrega histórica sin talla específica",
                "usuario_email": "superadmin@placeholder.com"
            })

    # FASE 8: Escribir
    stock_final = [{"sku": k[0], "vendedora_id": k[1], "cantidad": v} for k, v in stock_dict.items()]
    stock_final.sort(key=lambda s: (s["sku"], s["vendedora_id"]))

    def escribir(nombre, fields, filas):
        path = OUT_DIR / nombre
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(filas)
        print(f"  ✓ {nombre}: {len(filas)} filas")

    print("\nGenerando CSVs migrados:")
    escribir("productos.csv", ["producto_id", "nombre", "categoria", "activo"], productos)
    escribir("variantes.csv", ["sku", "producto_id", "talla", "costo", "precio_duena", "precio_oferta", "activo"], variantes)
    escribir("vendedoras.csv", ["vendedora_id", "nombre", "email", "rol", "activo"], VENDEDORAS)
    escribir("stock.csv", ["sku", "vendedora_id", "cantidad"], stock_final)
    escribir("movimientos.csv", ["mov_id", "fecha", "tipo", "sku", "cantidad", "vendedora_id", "destino_id", "notas", "usuario_email"], movimientos)
    escribir("combos.csv", ["combo_id", "nombre", "precio", "activo"], combos)
    escribir("combo_items.csv", ["combo_id", "sku"], combo_items)

    config = [
        {"clave": "moneda", "valor": "COP", "descripcion": "Moneda del sistema"},
        {"clave": "timezone", "valor": "America/Bogota", "descripcion": "Zona horaria"},
        {"clave": "version_schema", "valor": "2.0", "descripcion": "Versión del schema"},
        {"clave": "stock_bajo_umbral", "valor": "2", "descripcion": "Unidades para alerta de stock bajo"},
        {"clave": "permitir_stock_negativo", "valor": "false", "descripcion": "Si true, permite ventas sin stock"},
    ]
    escribir("config.csv", ["clave", "valor", "descripcion"], config)

    print(f"\n{'=' * 60}")
    print(f"Migración v2 completada")
    print(f"{'=' * 60}")
    print(f"  Productos:    {len(productos)}")
    print(f"  Variantes:    {len(variantes)}")
    print(f"  Stock rows:   {len(stock_final)}")
    print(f"  Movimientos:  {len(movimientos)}")
    print(f"  Combos:       {len(combos)}")
    print(f"  Combo items:  {len(combo_items)}")


if __name__ == "__main__":
    main()
