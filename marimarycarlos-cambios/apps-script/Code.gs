/**
 * Backend del formulario RSVP: guarda cada respuesta como una fila en esta Google Sheet.
 *
 * Instalación:
 *  1. Crear una Google Sheet → Extensiones → Apps Script → pegar este fichero.
 *  2. Implementar → Nueva implementación → Tipo: Aplicación web
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *  3. Copiar la URL (…/exec) en CONFIG.rsvpEndpoint de site/index.html.
 *  Al modificar este script: Implementar → Gestionar implementaciones → editar → Nueva versión
 *  (así la URL no cambia).
 */
const HOJA = 'Respuestas';
const COLUMNAS = ['enviado', 'nombre', 'asistencia', 'acompanante', 'alergias', 'mensaje'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.web) return respuesta({ ok: true });            // honeypot: bot
    if (!p.nombre || !p.asistencia) return respuesta({ ok: false, error: 'faltan campos' });

    const hoja = obtenerHoja();
    const fila = COLUMNAS.map(c => limpiar(p[c]));
    fila[0] = new Date();                                  // marca de tiempo del servidor
    hoja.appendRow(fila);
    return respuesta({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return respuesta({ ok: true, servicio: 'rsvp boda' });
}

function obtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  return hoja;
}

// Evita inyección de fórmulas en la hoja (=, +, -, @) y limita longitud
function limpiar(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).slice(0, 1000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
