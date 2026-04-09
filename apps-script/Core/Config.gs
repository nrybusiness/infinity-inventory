/**
 * Core/Config.gs
 * -----------------------------------------------------------------------------
 * Configuración central del sistema. Valores constantes de entorno, IDs de
 * recursos, nombres de hojas y mapeo de columnas.
 *
 * REGLA: ningún otro archivo del proyecto debe hardcodear nombres de hojas,
 * índices de columnas o parámetros de entorno. Todo pasa por aquí.
 * -----------------------------------------------------------------------------
 */

/**
 * Configuración global del sistema.
 * SPREADSHEET_ID se deja vacío: debe reemplazarse con el ID del Sheet real
 * tras crearlo (ver docs/06-despliegue.md).
 */
const CONFIG = Object.freeze({
  SPREADSHEET_ID: '',                 // PEGAR AQUÍ EL ID DEL SHEET TRAS CREARLO
  TIMEZONE: 'America/Bogota',
  LOCALE: 'es-CO',
  MONEDA: 'COP',
  SESION_TTL_SEGUNDOS: 28800,         // 8 horas
  APP_NAME: 'Inventario INFINITY',
  VERSION: '1.0.0'
});

/**
 * Nombres de hojas del Spreadsheet. Deben coincidir exactamente con los
 * títulos visibles en la pestaña de Google Sheets.
 */
const HOJAS = Object.freeze({
  PRODUCTOS: 'Productos',
  VARIANTES: 'Variantes',
  VENDEDORAS: 'Vendedoras',
  STOCK: 'Stock',
  MOVIMIENTOS: 'Movimientos',
  SESIONES: 'Sesiones',
  CONFIG: 'Config'
});

/**
 * Índices de columnas (base 0) para cada hoja. Los DAOs leen por índice.
 * Si se reordenan las columnas del Sheet, este objeto debe actualizarse.
 */
const COLS = Object.freeze({
  PRODUCTOS: Object.freeze({
    PRODUCTO_ID: 0,
    NOMBRE: 1,
    CATEGORIA: 2,
    ACTIVO: 3,
    CREADO_EN: 4
  }),
  VARIANTES: Object.freeze({
    SKU: 0,
    PRODUCTO_ID: 1,
    TALLA: 2,
    COSTO: 3,
    PRECIO_DUEÑA: 4,
    PRECIO_OFERTA: 5,
    ACTIVO: 6
  }),
  VENDEDORAS: Object.freeze({
    VENDEDORA_ID: 0,
    NOMBRE: 1,
    ROL: 2,
    USUARIO: 3,
    PASSWORD_HASH: 4,
    PASSWORD_SALT: 5,
    ACTIVO: 6,
    CREADO_EN: 7
  }),
  STOCK: Object.freeze({
    STOCK_ID: 0,
    SKU: 1,
    VENDEDORA_ID: 2,
    CANTIDAD: 3,
    ACTUALIZADO_EN: 4
  }),
  MOVIMIENTOS: Object.freeze({
    MOV_ID: 0,
    FECHA: 1,
    TIPO: 2,
    SKU: 3,
    CANTIDAD: 4,
    VENDEDORA_ID: 5,
    DESTINO_ID: 6,
    PRECIO_UNITARIO: 7,
    NOTAS: 8,
    CREADO_POR: 9
  }),
  SESIONES: Object.freeze({
    TOKEN: 0,
    VENDEDORA_ID: 1,
    CREADO_EN: 2,
    EXPIRA_EN: 3
  }),
  CONFIG: Object.freeze({
    CLAVE: 0,
    VALOR: 1
  })
});

/**
 * Encabezados literales de cada hoja. Usados por el inicializador de Sheet
 * para crear las hojas desde cero con los headers correctos.
 */
const HEADERS = Object.freeze({
  PRODUCTOS:   ['producto_id', 'nombre', 'categoria', 'activo', 'creado_en'],
  VARIANTES:   ['sku', 'producto_id', 'talla', 'costo', 'precio_dueña', 'precio_oferta', 'activo'],
  VENDEDORAS:  ['vendedora_id', 'nombre', 'rol', 'usuario', 'password_hash', 'password_salt', 'activo', 'creado_en'],
  STOCK:       ['stock_id', 'sku', 'vendedora_id', 'cantidad', 'actualizado_en'],
  MOVIMIENTOS: ['mov_id', 'fecha', 'tipo', 'sku', 'cantidad', 'vendedora_id', 'destino_id', 'precio_unitario', 'notas', 'creado_por'],
  SESIONES:    ['token', 'vendedora_id', 'creado_en', 'expira_en'],
  CONFIG:      ['clave', 'valor']
});

/**
 * Devuelve el objeto Spreadsheet activo. Si CONFIG.SPREADSHEET_ID está vacío,
 * usa el spreadsheet contenedor del script (útil durante desarrollo con el
 * script vinculado a un Sheet). En producción debe usarse el ID explícito.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.length > 0) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const activo = SpreadsheetApp.getActiveSpreadsheet();
  if (!activo) {
    throw new Error('CONFIG.SPREADSHEET_ID vacío y no hay Spreadsheet activo. Configura el ID en Core/Config.gs.');
  }
  return activo;
}

/**
 * Devuelve una hoja por su nombre lógico. Lanza error si no existe.
 *
 * @param {string} nombreHoja - uno de los valores de HOJAS.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getHoja(nombreHoja) {
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) {
    throw new Error('Hoja no encontrada: ' + nombreHoja + '. ¿Se inicializó el Spreadsheet?');
  }
  return hoja;
}
