/**
 * Core/Utils.gs
 * -----------------------------------------------------------------------------
 * Utilidades puras: fechas, formato, hashing, tokens, validaciones genéricas.
 * Ninguna función de este archivo debe depender de hojas, DAOs o servicios.
 * -----------------------------------------------------------------------------
 */

/**
 * Devuelve la fecha/hora actual como ISO string en la zona horaria configurada.
 *
 * @returns {string} e.g. '2026-04-09T14:30:00-05:00'
 */
function fechaISOAhora() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Convierte un Date a ISO string en la zona horaria configurada.
 *
 * @param {Date} date
 * @returns {string}
 */
function fechaISO(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('fechaISO: argumento no es un Date válido.');
  }
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Parsea un ISO string a objeto Date. Retorna null si es inválido.
 *
 * @param {string} iso
 * @returns {Date|null}
 */
function parsearFechaISO(iso) {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Suma segundos a una fecha y retorna el resultado como ISO string.
 *
 * @param {Date} date
 * @param {number} segundos
 * @returns {string}
 */
function sumarSegundosISO(date, segundos) {
  const nueva = new Date(date.getTime() + segundos * 1000);
  return fechaISO(nueva);
}

/**
 * Formatea un número como moneda COP sin decimales.
 *
 * @param {number} n
 * @returns {string} e.g. '$ 109.900'
 */
function formatearMoneda(n) {
  if (typeof n !== 'number' || isNaN(n)) return '$ 0';
  const entero = Math.round(n);
  const conSeparador = entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '$ ' + conSeparador;
}

/**
 * Convierte un string tipo '$ 47.389,00' o '109.900' a número entero.
 * Útil para la migración desde los CSV legacy.
 *
 * @param {string|number} valor
 * @returns {number}
 */
function parsearMoneda(valor) {
  if (typeof valor === 'number') return Math.round(valor);
  if (typeof valor !== 'string') return 0;
  const limpio = valor.replace(/[^0-9,.-]/g, '');
  // Formato colombiano: miles con '.', decimales con ','
  const sinMiles = limpio.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(sinMiles);
  return isNaN(n) ? 0 : Math.round(n);
}

/**
 * Genera un UUID v4 usando Utilities.getUuid() de Apps Script.
 *
 * @returns {string}
 */
function generarUUID() {
  return Utilities.getUuid();
}

/**
 * Genera un ID secuencial con prefijo y padding de ceros.
 * El conteo actual se calcula a partir de los IDs existentes pasados como argumento.
 *
 * @param {string} prefijo - e.g. 'P', 'V', 'M'
 * @param {string[]} idsExistentes - lista de IDs ya usados con el mismo prefijo
 * @param {number} padding - cantidad total de dígitos (default 3)
 * @returns {string} e.g. 'P001'
 */
function generarIdSecuencial(prefijo, idsExistentes, padding) {
  const pad = padding || 3;
  let max = 0;
  for (let i = 0; i < idsExistentes.length; i++) {
    const id = idsExistentes[i];
    if (typeof id !== 'string' || !id.startsWith(prefijo)) continue;
    const num = parseInt(id.substring(prefijo.length), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const siguiente = (max + 1).toString();
  return prefijo + '0'.repeat(Math.max(0, pad - siguiente.length)) + siguiente;
}

/**
 * Construye un SKU a partir de producto_id y talla.
 *
 * @param {string} productoId - e.g. 'P001'
 * @param {string} talla - valor de TALLAS_VALIDAS
 * @returns {string} e.g. 'P001-SM'
 */
function construirSku(productoId, talla) {
  const sufijo = TALLA_SUFIJO_SKU[talla];
  if (!sufijo) throw new Error('Talla inválida para SKU: ' + talla);
  return productoId + '-' + sufijo;
}

/**
 * Construye un stock_id compuesto.
 *
 * @param {string} sku
 * @param {string} vendedoraId
 * @returns {string}
 */
function construirStockId(sku, vendedoraId) {
  return sku + ':' + vendedoraId;
}

/**
 * Genera un salt aleatorio de 16 bytes en hexadecimal.
 *
 * @returns {string} 32 caracteres hex
 */
function generarSalt() {
  const bytes = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytes.map(function(b) {
    return ('0' + b.toString(16)).slice(-2);
  }).join('');
}

/**
 * Calcula SHA-256 de (salt + password) y devuelve el hash en hex.
 *
 * @param {string} password
 * @param {string} salt
 * @returns {string} hash en hex
 */
function hashPassword(password, salt) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('hashPassword: password vacío.');
  }
  if (typeof salt !== 'string' || salt.length === 0) {
    throw new Error('hashPassword: salt vacío.');
  }
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    const v = (b < 0) ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

/**
 * Verifica una contraseña contra un hash almacenado.
 *
 * @param {string} password
 * @param {string} hashGuardado
 * @param {string} salt
 * @returns {boolean}
 */
function verificarPassword(password, hashGuardado, salt) {
  try {
    const hashCalculado = hashPassword(password, salt);
    return tiempoConstanteIguales(hashCalculado, hashGuardado);
  } catch (e) {
    return false;
  }
}

/**
 * Comparación de strings en tiempo constante para evitar timing attacks.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function tiempoConstanteIguales(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Valida que un valor sea string no vacío tras trim.
 *
 * @param {*} v
 * @returns {boolean}
 */
function esStringNoVacio(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Valida que un valor sea entero no negativo.
 *
 * @param {*} v
 * @returns {boolean}
 */
function esEnteroNoNegativo(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/**
 * Valida que un valor sea entero positivo (>= 1).
 *
 * @param {*} v
 * @returns {boolean}
 */
function esEnteroPositivo(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1;
}

/**
 * Convierte valores de celda a boolean robustamente.
 * Acepta TRUE/FALSE, 'true'/'false', 1/0, 'sí'/'no'.
 *
 * @param {*} v
 * @returns {boolean}
 */
function aBoolean(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'sí' || s === 'si' || s === 'yes';
  }
  return false;
}

/**
 * Crea un objeto de error estructurado para retornar al frontend.
 *
 * @param {string} codigo - uno de ERROR_CODE
 * @param {string} mensaje - mensaje humano
 * @param {Object} [detalles] - info adicional opcional
 * @returns {{ok: false, error: {codigo: string, mensaje: string, detalles?: Object}}}
 */
function errorRespuesta(codigo, mensaje, detalles) {
  const err = { codigo: codigo, mensaje: mensaje };
  if (detalles !== undefined) err.detalles = detalles;
  return { ok: false, error: err };
}

/**
 * Crea un objeto de respuesta exitosa estructurado.
 *
 * @param {*} data - payload a retornar
 * @returns {{ok: true, data: *}}
 */
function okRespuesta(data) {
  return { ok: true, data: data };
}

/**
 * Envuelve la ejecución de una función en un try/catch y normaliza la respuesta.
 * Usado por ApiController para nunca propagar excepciones al frontend.
 *
 * @param {Function} fn
 * @returns {Object}
 */
function ejecutarSeguro(fn) {
  try {
    const resultado = fn();
    return okRespuesta(resultado);
  } catch (e) {
    // Si el error ya es un objeto errorRespuesta, devolverlo tal cual.
    if (e && e.codigo && e.mensaje) {
      return errorRespuesta(e.codigo, e.mensaje, e.detalles);
    }
    const mensaje = (e && e.message) ? e.message : String(e);
    return errorRespuesta(ERROR_CODE.INTERNO, mensaje);
  }
}
