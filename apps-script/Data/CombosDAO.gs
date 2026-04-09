/**
 * Data/CombosDAO.gs
 * ----------------------------------------------------------------------------
 * Capa de acceso a datos para la hoja `Combos`. Un combo es un paquete
 * predefinido de varios productos con un precio conjunto especial.
 * ----------------------------------------------------------------------------
 */

const CombosDAO = (function () {

  function _hoja() {
    return obtenerHoja(HOJAS.COMBOS);
  }

  function _parsearFila(fila) {
    const obj = filaAObjeto(fila, COLS.COMBOS);
    obj.precio = toInt(obj.precio);
    obj.activo = toBool(obj.activo);
    return obj;
  }

  function listar(soloActivos) {
    const hoja = _hoja();
    const ultima = hoja.getLastRow();
    if (ultima < 2) return [];
    const ancho = HEADERS.COMBOS.length;
    const datos = hoja.getRange(2, 1, ultima - 1, ancho).getValues();
    const out = [];
    for (let i = 0; i < datos.length; i++) {
      if (!datos[i][COLS.COMBOS.combo_id]) continue;
      const obj = _parsearFila(datos[i]);
      if (soloActivos && !obj.activo) continue;
      out.push(obj);
    }
    return out;
  }

  function obtenerPorId(combo_id) {
    if (!combo_id) return null;
    const todos = listar(false);
    for (let i = 0; i < todos.length; i++) {
      if (todos[i].combo_id === combo_id) return todos[i];
    }
    return null;
  }

  function crear(combo) {
    const hoja = _hoja();
    const numero = siguienteNumeroId(hoja, COLS.COMBOS.combo_id, 'C');
    const id = 'C' + String(numero).padStart(3, '0');
    const nuevo = {
      combo_id: id,
      nombre: combo.nombre,
      precio: toInt(combo.precio),
      activo: combo.activo !== false,
    };
    const fila = objetoAFila(nuevo, COLS.COMBOS, HEADERS.COMBOS.length);
    hoja.appendRow(fila);
    return nuevo;
  }

  function actualizar(combo_id, cambios) {
    const hoja = _hoja();
    const ultima = hoja.getLastRow();
    if (ultima < 2) return null;
    const ancho = HEADERS.COMBOS.length;
    const datos = hoja.getRange(2, 1, ultima - 1, ancho).getValues();
    for (let i = 0; i < datos.length; i++) {
      if (datos[i][COLS.COMBOS.combo_id] === combo_id) {
        const actual = _parsearFila(datos[i]);
        if (cambios.nombre !== undefined) actual.nombre = cambios.nombre;
        if (cambios.precio !== undefined) actual.precio = toInt(cambios.precio);
        if (cambios.activo !== undefined) actual.activo = toBool(cambios.activo);
        const filaNueva = objetoAFila(actual, COLS.COMBOS, ancho);
        hoja.getRange(i + 2, 1, 1, ancho).setValues([filaNueva]);
        return actual;
      }
    }
    return null;
  }

  return {
    listar: listar,
    obtenerPorId: obtenerPorId,
    crear: crear,
    actualizar: actualizar,
  };
})();
