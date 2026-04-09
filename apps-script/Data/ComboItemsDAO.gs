/**
 * Data/ComboItemsDAO.gs
 * ----------------------------------------------------------------------------
 * Capa de acceso a datos para la hoja `ComboItems`. Tabla de unión entre
 * Combos y Variantes (many-to-many). Cada fila indica que un SKU es parte
 * de un combo específico.
 * ----------------------------------------------------------------------------
 */

const ComboItemsDAO = (function () {

  function _hoja() {
    return obtenerHoja(HOJAS.COMBO_ITEMS);
  }

  function listar() {
    const hoja = _hoja();
    const ultima = hoja.getLastRow();
    if (ultima < 2) return [];
    const ancho = HEADERS.COMBO_ITEMS.length;
    const datos = hoja.getRange(2, 1, ultima - 1, ancho).getValues();
    const out = [];
    for (let i = 0; i < datos.length; i++) {
      if (!datos[i][COLS.COMBO_ITEMS.combo_id]) continue;
      out.push(filaAObjeto(datos[i], COLS.COMBO_ITEMS));
    }
    return out;
  }

  /**
   * Lista los SKUs que componen un combo específico.
   */
  function listarPorCombo(combo_id) {
    return listar().filter(function (ci) { return ci.combo_id === combo_id; });
  }

  /**
   * Lista los combos en los que participa un SKU específico.
   */
  function listarPorSku(sku) {
    return listar().filter(function (ci) { return ci.sku === sku; });
  }

  function agregar(combo_id, sku) {
    const hoja = _hoja();
    // Evitar duplicados
    const existentes = listarPorCombo(combo_id);
    for (let i = 0; i < existentes.length; i++) {
      if (existentes[i].sku === sku) return;
    }
    hoja.appendRow([combo_id, sku]);
  }

  /**
   * Elimina un item del combo. Esta es la UNICA operación de delete en todo
   * el sistema (aparte de los ajustes). Los combos son gestión de catálogo,
   * no datos transaccionales, por lo que se permite edición destructiva.
   */
  function eliminar(combo_id, sku) {
    const hoja = _hoja();
    const ultima = hoja.getLastRow();
    if (ultima < 2) return false;
    const ancho = HEADERS.COMBO_ITEMS.length;
    const datos = hoja.getRange(2, 1, ultima - 1, ancho).getValues();
    for (let i = 0; i < datos.length; i++) {
      if (datos[i][COLS.COMBO_ITEMS.combo_id] === combo_id && datos[i][COLS.COMBO_ITEMS.sku] === sku) {
        hoja.deleteRow(i + 2);
        return true;
      }
    }
    return false;
  }

  return {
    listar: listar,
    listarPorCombo: listarPorCombo,
    listarPorSku: listarPorSku,
    agregar: agregar,
    eliminar: eliminar,
  };
})();
