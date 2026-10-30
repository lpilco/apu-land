/**
 * Apu Coach · Puente entre la landing (pestaña Comunidad) y Google Sheets.
 *
 * Instalación (una sola vez):
 *  1. Abre tu hoja de cálculo → Extensiones → Apps Script.
 *  2. Pega este archivo completo en Code.gs y guarda.
 *  3. Implementar → Nueva implementación → Tipo: "Aplicación web".
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  4. Copia la URL que termina en /exec y pégala en app.js,
 *     en la constante FEEDBACK_ENDPOINT.
 *
 * La hoja "Feedback" se crea sola con estas columnas:
 *   Fecha | ID | Nombre | Email | Tipo | Área | Mensaje | Estado | Visible
 *
 *  - Email nunca se publica en la web.
 *  - Estado: escribe "Nuevo", "En revisión", "Resuelto"... y se mostrará en la web.
 *  - Visible: pon FALSE para ocultar un comentario (spam, datos personales, etc.).
 */

const SHEET_NAME = 'Feedback';
const HEADERS = ['Fecha', 'ID', 'Nombre', 'Email', 'Tipo', 'Área', 'Mensaje', 'Estado', 'Visible'];
const TYPES = ['Bug', 'Mejora', 'Idea', 'Felicitación'];
const MAX_ITEMS = 200;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Recorta y evita inyección de fórmulas en la hoja (=, +, -, @).
function clean_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function unclean_(v) {
  return String(v == null ? '' : v).replace(/^'/, '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json_({ ok: true }); // honeypot anti-bots

    const tipo = TYPES.indexOf(d.tipo) > -1 ? d.tipo : 'Idea';
    const mensaje = clean_(d.mensaje, 1000);
    if (mensaje.length < 5) return json_({ ok: false, error: 'Mensaje muy corto' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet_().appendRow([
        new Date(),
        Utilities.getUuid().slice(0, 8),
        clean_(d.nombre, 60) || 'Anónimo',
        clean_(d.email, 120),
        tipo,
        clean_(d.area, 60),
        mensaje,
        'Nuevo',
        true
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  const sh = getSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return json_({ ok: true, items: [] });

  const rows = sh.getRange(2, 1, n, HEADERS.length).getValues();
  const items = rows
    .filter(function (r) { return r[8] !== false && String(r[8]).toUpperCase() !== 'FALSE'; })
    .map(function (r) {
      return {
        fecha: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        id: String(r[1]),
        nombre: unclean_(r[2]) || 'Anónimo',
        tipo: String(r[4]),
        area: unclean_(r[5]),
        mensaje: unclean_(r[6]),
        estado: String(r[7] || '')
      };
    })
    .reverse()
    .slice(0, MAX_ITEMS);

  return json_({ ok: true, items: items });
}

