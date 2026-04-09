# Sistema de Inventario INFINITY

Sistema de gestión de inventario multi-vendedora construido sobre Google Sheets
(backend), Google Apps Script (lógica) y un ADS (Admin Display System) en HTML
servido por el mismo Apps Script.

## Características

- **Inventario centralizado** con tallas como filas independientes (SKU por variante).
- **Multi-vendedora** con stock asignado individualmente por persona.
- **Kardex automático** por vendedora, derivado en tiempo real del stock global.
- **Bitácora inmutable** de movimientos (ventas, entregas, ingresos, ajustes).
- **ADS web** con autenticación por usuario/contraseña.
- **Listado de precios** con disponibilidad en tiempo real para consulta rápida.

## Arquitectura

Ver [`docs/02-arquitectura.md`](docs/02-arquitectura.md).

## Stack

- **Backend / BD:** Google Sheets
- **Lógica:** Google Apps Script (.gs)
- **Frontend:** HTML + CSS + JavaScript servido vía `HtmlService`
- **Auth:** SHA-256 + salt por usuario, tokens de sesión persistentes

## Estructura del repositorio

\`\`\`
Trabajo-tia-denis/
├── docs/           Documentación funcional y técnica
├── data/           Datos crudos y migrados
├── sheets/         Schema de las hojas del Sheet
├── apps-script/    Código del backend y frontend
├── scripts/        Utilidades de migración
└── dev/            Notas de desarrollo
\`\`\`

## Despliegue

Ver [`docs/06-despliegue.md`](docs/06-despliegue.md) (disponible en el Lote 6).

## Estado del proyecto

En desarrollo. Ver plan de entrega en los commits.
