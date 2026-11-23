/**
 * Backend del formulario RSVP de la boda.
 *  - Guarda cada respuesta tal cual en la pestaña "Respuestas" (registro bruto).
 *  - Regenera la pestaña "Asistencia": una fila por persona, primero las que vienen
 *    (cada invitado seguido de su acompañante) y al final las que no vienen.
 *  - Opcionalmente avisa por email.
 *
 * Instalación:
 *  1. Crear una Google Sheet → Extensiones → Apps Script → pegar este fichero → Guardar.
 *  2. Implementar → Nueva implementación → Tipo: Aplicación web
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *  3. Autorizar los permisos que pide Google.
 *  4. Copiar la URL (…/exec) en CONFIG.rsvpEndpoint de site/index.html.
 *  Al modificar este script: Implementar → Gestionar implementaciones → editar (lápiz)
 *  → Versión: Nueva versión → Implementar (así la URL no cambia).
 */
const HOJA = 'Respuestas';
const COLUMNAS = ['enviado', 'nombre', 'asistencia', 'acompanante', 'alergias', 'mensaje', 'alergias_acompanante', 'cancion'];

// Emails que reciben un aviso por cada respuesta. Vacío = sin avisos.
const AVISAR_A = [];   // p. ej. ['novio@gmail.com', 'novia@gmail.com']

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.web) return respuesta({ ok: true });            // honeypot: bot
    if (!p.nombre || !p.asistencia) return respuesta({ ok: false, error: 'faltan campos' });
    const fila = COLUMNAS.map(c => limpiar(p[c]));
    fila[0] = new Date();                                  // marca de tiempo del servidor
    obtenerHoja().appendRow(fila);
    try { actualizarAsistencia(); } catch (err) { console.error(err); }
    avisar(p);
    return respuesta({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return respuesta({ ok: true, servicio: 'rsvp boda' });
}

// Regenera la pestaña "Asistencia". Se ejecuta con cada respuesta o a mano.
// Si una persona responde varias veces, vale su ÚLTIMA respuesta.
function actualizarAsistencia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const datos = obtenerHoja().getDataRange().getValues().slice(1)
    .filter(r => String(r[1]).trim());
  const ultima = new Map();
  datos.forEach(r => ultima.set(clave(r[1]), r));
  const vienen = [], noVienen = [];
  ultima.forEach(r => {
    const nombre = String(r[1]).trim();
    const acomp = String(r[3]).trim();
    const alergias = String(r[4]).trim();
    const mensaje = String(r[5]).trim();
    const alergiasAcomp = String(r[6] || '').trim();
    const cancion = String(r[7] || '').trim();
    if (r[2] === 'si') {
      vienen.push([nombre, 'Sí', 'Invitado', alergias, cancion, mensaje]);
      if (acompValido(acomp)) vienen.push([acomp, 'Sí', 'Acompañante de ' + nombre, alergiasAcomp, '', '']);
    } else {
      noVienen.push([nombre, 'No', 'Invitado', '', '', mensaje]);
    }
  });
  let h = ss.getSheetByName('Asistencia');
  if (!h) h = ss.insertSheet('Asistencia', 0);
  h.clear();
  h.clearConditionalFormatRules();
  const viejo = ss.getSheetByName('Resumen');
  if (viejo) ss.deleteSheet(viejo);
  h.getRange('A1').setValue('Personas que vienen: ' + vienen.length).setFontSize(14).setFontWeight('bold');
  const cab = [['Persona', 'Viene', 'Tipo', 'Alergias o restricciones', 'Canción', 'Comentario']];
  h.getRange(3, 1, 1, 6).setValues(cab).setFontWeight('bold').setBackground('#2c2c2c').setFontColor('#ffffff');
  h.setFrozenRows(3);
  const filas = vienen.concat(noVienen);
  if (filas.length) {
    h.getRange(4, 1, filas.length, 6).setValues(filas).setVerticalAlignment('top').setWrap(true);
    if (vienen.length) h.getRange(4, 1, vienen.length, 6).setBackground('#e6f4ea');
    if (noVienen.length) h.getRange(4 + vienen.length, 1, noVienen.length, 6).setBackground('#fce8e6').setFontColor('#777777');
  }
  h.setColumnWidth(1, 220); h.setColumnWidth(2, 60); h.setColumnWidth(3, 230);
  h.setColumnWidth(4, 240); h.setColumnWidth(5, 240); h.setColumnWidth(6, 320);
  h.getCharts().forEach(c => h.removeChart(c));
  h.getRange('I3:J4').setValues([['Vienen', vienen.length], ['No vienen', noVienen.length]]).setFontColor('#ffffff');
  h.insertChart(h.newChart().asPieChart()
    .addRange(h.getRange('I3:J4'))
    .setOption('title', 'Asistencia (personas)')
    .setOption('colors', ['#2e7d32', '#8b1a1a'])
    .setOption('pieSliceText', 'value')
    .setOption('pieSliceTextStyle', { color: '#ffffff', fontSize: 16, bold: true })
    .setOption('legend', { position: 'right', textStyle: { fontSize: 13 } })
    .setPosition(3, 8, 0, 0)
    .build());
  colorearRespuestas();
  ss.setActiveSheet(h);
}

// Respuestas: fila verde si asiste, roja si no (todas las columnas)
function colorearRespuestas() {
  const resp = obtenerHoja();
  const rango = resp.getRange(2, 1, 1000, COLUMNAS.length);
  resp.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$C2="si"').setBackground('#e6f4ea').setRanges([rango]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$C2="no"').setBackground('#fce8e6').setRanges([rango]).build()
  ]);
}

function clave(nombre) {
  return String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function avisar(p) {
  if (!AVISAR_A.length) return;
  const viene = p.asistencia === 'si';
  const asunto = (viene ? '✅ Confirma: ' : '❌ No asiste: ') + limpiar(p.nombre);
  const cuerpo = [
    'Nombre: ' + limpiar(p.nombre),
    'Asistencia: ' + (viene ? 'Sí' : 'No'),
    viene ? 'Acompañante: ' + (limpiar(p.acompanante) || '—') : '',
    viene ? 'Alergias: ' + (limpiar(p.alergias) || '—') : '',
    viene && p.acompanante ? 'Alergias acompañante: ' + (limpiar(p.alergias_acompanante) || '—') : '',
    viene ? 'Canción: ' + (limpiar(p.cancion) || '—') : '',
    'Mensaje: ' + (limpiar(p.mensaje) || '—'),
    '',
    'Asistencia completa: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].filter(l => l !== '').join('\n');
  try { MailApp.sendEmail(AVISAR_A.join(','), asunto, cuerpo); } catch (err) { console.error(err); }
}

function obtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA);
    hoja.setFrozenRows(1);
  }
  hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
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

// Ignora respuestas del tipo "No", "Ninguno", "-" escritas en el nombre del acompañante
function acompValido(v) {
  const s = clave(v).replace(/[.!¡]/g, '').trim();
  return s !== '' && !/^(no|n|-|—|ninguno|ninguna|nadie|solo|sola|n\/a|no vengo acompanad[oa])$/.test(s);
}
