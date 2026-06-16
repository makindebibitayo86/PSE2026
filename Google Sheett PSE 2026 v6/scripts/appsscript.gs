// ── PSE Registration System — Google Apps Script Web App ─────
// Oyo State Government | Office of the Head of Service | 2026
//
// SETUP INSTRUCTIONS:
// 1. Paste this entire file into your Apps Script editor
// 2. Click Save
// 3. Click Deploy → New Deployment
// 4. Type: Web App
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Click Deploy → copy the Web App URL
// 8. Paste that URL into register.js as APPS_SCRIPT_URL

const SHEET_ID   = '10uVUqHzLCz8x_2ZthWYfOeEJaEm_uk13nEwo-FMn26U';
const SHEET_NAME = 'Candidates';
const FOLDER_NAME = 'PSE_Passports_2026';

// Column order — append only, never reorder
const COLS = [
  'exam_number',       // A
  'full_name',         // B
  'phone_number',      // C
  'lga',               // D
  'disability',        // E
  'staff_category',    // F
  'zone_code',         // G
  'ministry',          // H
  'department',        // I
  'grade_level',       // J
  'tran_ref',          // K
  'amount_paid',       // L
  'exam_centre',       // M
  'papers',            // N  (comma-separated string)
  'passport_url',      // O  (Google Drive public link)
  'payment_status',    // P  pending / approved / rejected
  'rejection_reason',  // Q
  'registered_at',     // R
  'reviewed_at',       // S
];

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    switch (action) {
      case 'CHECK_PHONE':   return respond(checkPhone(payload.phone));
      case 'CHECK_TRAN':    return respond(checkTranRef(payload.tran_ref));
      case 'GET_SEQUENCE':  return respond(getSequence(payload.zone_code, payload.staff_category));
      case 'UPLOAD_PHOTO':  return respond({ url: payload.photo_base64 }); // no-op, data URL stored directly
      case 'INSERT':        return respond(insertCandidate(payload.data));
      case 'GET_CANDIDATE': return respond(getCandidate(payload.phone, payload.tran_ref));
      case 'DEBUG_CANDIDATE': return respond(debugCandidate(payload.phone, payload.tran_ref));
      default:              return respond({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return respond({ error: err.message });
  }
}

function doGet(e) {
  return respond({ status: 'PSE Apps Script is running' });
}

// ─────────────────────────────────────────────────────────────
// SYNC MIRRORS — called after every insert and on manual delete
// ─────────────────────────────────────────────────────────────

// onChange trigger — fires reliably when rows are deleted
// Run installTrigger() once to set this up
function onSheetChange(e) {
  try {
    syncMirrorSheets();
  } catch (err) {
    console.error('onSheetChange error:', err.message);
  }
}

// Core sync — reads main sheet, removes any mirror rows whose exam number is gone
function syncMirrorSheets() {
  const ss        = SpreadsheetApp.openById(SHEET_ID);
  const main      = ss.getSheetByName(SHEET_NAME);
  if (!main) return;

  const mainData   = main.getDataRange().getValues();
  const examNumCol = COLS.indexOf('exam_number'); // col A = 0

  // Build set of exam numbers still in main sheet
  const remaining = new Set();
  for (let i = 1; i < mainData.length; i++) {
    const val = String(mainData[i][examNumCol]).trim();
    if (val) remaining.add(val);
  }

  // Loop all mirror sheets and delete rows not in remaining set
  ss.getSheets().forEach(sheet => {
    if (sheet.getName() === SHEET_NAME) return; // skip main sheet
    const data = sheet.getDataRange().getValues();
    // Walk backwards to avoid index shifting
    for (let r = data.length - 1; r >= 1; r--) {
      const examNo = String(data[r][0]).trim(); // exam_number always col A in mirror sheets
      if (examNo && !remaining.has(examNo)) {
        sheet.deleteRow(r + 1);
      }
    }
  });
}

// Run this once from the editor to install the onChange trigger
function installTrigger() {
  // Remove duplicates first
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSheetChange') ScriptApp.deleteTrigger(t);
  });
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();
  console.log('onChange trigger installed successfully.');
}

// Run this once to manually force a full sync (useful after bulk deletes)
function forceSyncNow() {
  syncMirrorSheets();
  console.log('Mirror sheets synced.');
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  // Remove all non-digits then strip leading zero for consistent comparison
  return String(phone).replace(/\D/g, '').replace(/^0+/, '');
}

function checkPhone(phone) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const col   = COLS.indexOf('phone_number');
  const normalized = normalizePhone(phone);
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(data[i][col]) === normalized) {
      return { exists: true };
    }
  }
  return { exists: false };
}

function checkTranRef(tranRef) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const col   = COLS.indexOf('tran_ref'); // K = 10
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col]).trim().toUpperCase() === String(tranRef).trim().toUpperCase()) {
      return { exists: true };
    }
  }
  return { exists: false };
}

function getSequence(zoneCode, staffCategory) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const zCol  = COLS.indexOf('zone_code');      // G = 6
  const cCol  = COLS.indexOf('staff_category'); // F = 5
  let count   = 0;
  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][zCol]).trim() === zoneCode &&
      String(data[i][cCol]).trim() === staffCategory
    ) count++;
  }
  return { sequence: count + 1 };
}

function uploadPhoto(examNumber, photoBase64, mimeType) {
  const folder   = getOrCreateFolder(FOLDER_NAME);
  const safeName = examNumber.replace(/\//g, '-');
  const ext      = mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = safeName + '.' + ext;

  // Delete existing file with same name if re-uploading
  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(photoBase64),
    mimeType,
    fileName
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId  = file.getId();
  const viewUrl = 'https://lh3.googleusercontent.com/d/' + fileId + '=s800';
  return { url: viewUrl, file_id: fileId };
}

function insertCandidate(data) {
  const sheet  = getSheet();
  const exists = sheet.getLastRow();

  // Write header row if sheet is empty
  if (exists < 1) {
    sheet.appendRow(COLS);
    sheet.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const papersArray = Array.isArray(data.papers) ? data.papers : 
    (typeof data.papers === 'string' ? data.papers.split(',').map(p => p.trim()).filter(Boolean) : []);

  const row = COLS.map(col => {
    const val = data[col];
    if (col === 'papers') return papersArray.join(', ');
    if (val === undefined || val === null) return '';
    return val;
  });

  // 1. Write to main Candidates sheet
  sheet.appendRow(row);

  // 2. Mirror to zone sheet — minimal info only
  const zoneCode  = data.zone_code || '';
  const zoneRow   = [data.exam_number || '', data.full_name || '', data.phone_number || ''];
  if (zoneCode) {
    const zoneSheet = getOrCreateZoneSheet('Zone: ' + zoneCode);
    zoneSheet.appendRow(zoneRow);
  }

  // 3. Mirror to each subject sheet — scoresheet only (name, exam no, phone)
  const ATTEND_COLS  = ['exam_number', 'full_name', 'phone_number'];
  const subjectRow   = ATTEND_COLS.map(col => data[col] || '');

  papersArray.forEach(paper => {
    if (!paper) return;
    const subjectSheet = getOrCreateSubjectSheet('Subject: ' + paper, ATTEND_COLS);
    subjectSheet.appendRow(subjectRow);
  });

  // 4. Mirror to exam centre attendance sheet
  const centre = data.exam_centre || '';
  if (centre) {
    const centreSheet = getOrCreateCentreSheet('Centre: ' + centre);
    centreSheet.appendRow(ATTEND_COLS.map(col => data[col] || ''));
  }

  return { success: true };
}

// ── Create or get an exam centre attendance sheet ────────────
function getOrCreateCentreSheet(name) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = ['exam_number', 'full_name', 'phone_number', 'attended', 'remarks'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#fff2cc'); // yellow for centres
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Create or get a zone sheet (minimal: exam no, name, phone) ─
function getOrCreateZoneSheet(name) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = ['exam_number', 'full_name', 'phone_number'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#cfe2f3'); // blue for zones
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Create or get a subject scoresheet (name, exam no, phone + Score column) ──
function getOrCreateSubjectSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const scoreHeaders = headers.concat(['score', 'remarks']);
    sheet.appendRow(scoreHeaders);
    sheet.getRange(1, 1, 1, scoreHeaders.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, scoreHeaders.length).setBackground('#d9ead3'); // green for subjects
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function debugCandidate(phone, tranRef) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const pCol  = COLS.indexOf('phone_number');
  const tCol  = COLS.indexOf('tran_ref');
  const rows  = [];
  for (let i = 1; i < data.length; i++) {
    rows.push({
      row: i + 1,
      phone_in_sheet: String(data[i][pCol]).trim(),
      tran_in_sheet:  String(data[i][tCol]).trim(),
      phone_received: String(phone).trim(),
      tran_received:  String(tranRef).trim().toUpperCase(),
      phone_match: String(data[i][pCol]).trim() === String(phone).trim(),
      tran_match:  String(data[i][tCol]).trim().toUpperCase() === String(tranRef).trim().toUpperCase(),
    });
  }
  return { total_rows: data.length - 1, rows };
}

function getCandidate(phone, tranRef) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { found: false };

  const headers = data[0]; // first row = COLS headers
  const pCol    = COLS.indexOf('phone_number');
  const tCol    = COLS.indexOf('tran_ref');

  for (let i = 1; i < data.length; i++) {
    const rowPhone = normalizePhone(data[i][pCol]);
    const rowTran  = String(data[i][tCol]).trim().toUpperCase();
    if (
      rowPhone === normalizePhone(phone) &&
      rowTran  === String(tranRef).trim().toUpperCase()
    ) {
      // Build object from row
      const record = {};
      COLS.forEach((col, idx) => {
        record[col] = data[i][idx];
      });
      // Parse papers back to array
      if (typeof record.papers === 'string') {
        record.papers = record.papers.split(',').map(p => p.trim()).filter(Boolean);
      }
      return { found: true, record };
    }
  }
  return { found: false };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getSheet() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLS);
    sheet.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
