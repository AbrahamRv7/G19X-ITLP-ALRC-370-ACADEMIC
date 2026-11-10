// Utilidades compartidas por varias pantallas.

/**
 * Convierte un error de axios en un texto legible.
 * FastAPI devuelve `detail` como texto en errores normales (400, 403...) y como
 * lista de objetos {loc, msg} en errores de validación (422); pasar esa lista
 * directamente a un toast no muestra nada útil.
 */
export function mensajeDeError(error, porDefecto) {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === 'string' && detalle.trim()) return detalle;

  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle
      .map((d) => {
        const campo = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : '';
        return campo ? `${campo}: ${d.msg}` : d.msg;
      })
      .join(' · ');
  }

  return porDefecto;
}

/**
 * Prepara un valor para una celda de CSV:
 * - duplica las comillas internas,
 * - antepone un apóstrofo a los textos que empiezan con = + - @ (Excel los ejecutaría como fórmula).
 */
export function celdaCSV(valor) {
  let texto = valor === null || valor === undefined ? '' : String(valor);

  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}
