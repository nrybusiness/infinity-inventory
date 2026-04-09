apps-script/
├── Core/
│   ├── Config.gs          → IDs de hojas, nombres de columnas, constantes
│   ├── Constants.gs       → Enums: TIPOS_MOVIMIENTO, ROLES, TALLAS
│   └── Utils.gs           → Helpers: generarId, formatearMoneda, fechaISO
│
├── Data/                  → Capa de acceso a datos (DAO). Solo lee/escribe Sheets.
│   ├── ProductosDAO.gs
│   ├── VariantesDAO.gs
│   ├── StockDAO.gs
│   ├── VendedorasDAO.gs
│   └── MovimientosDAO.gs
│
├── Logic/                 → Reglas de negocio. No tocan Sheets directamente.
│   ├── InventarioService.gs   → Vista global del inventario
│   ├── KardexService.gs       → Kardex por vendedora
│   ├── VentasService.gs       → Procesar ventas + validaciones
│   ├── EntregasService.gs     → Procesar devoluciones a dueña
│   ├── PreciosService.gs      → Listado con disponibilidad
│   └── ReportesService.gs     → Totales, ventas por vendedora, etc.
│
├── Interface/             → Capa HTTP / entrada del WebApp
│   ├── WebApp.gs              → doGet() — sirve el HTML del ADS
│   └── ApiController.gs       → Endpoints llamados desde el HTML vía google.script.run
│
└── Views/                 → Frontend ADS (HTML + CSS + JS cliente)
    ├── index.html             → Shell principal del ADS
    ├── styles.html            → CSS (incluido en index vía <?!= include ?>)
    ├── app.js.html            → JS cliente (router, fetch, render)
    ├── view_inventario.html   → Vista inventario completo
    ├── view_kardex.html       → Vista kardex individual
    ├── view_precios.html      → Vista listado de precios (modo venta rápida)
    └── view_ventas.html       → Formulario registrar venta/entrega
