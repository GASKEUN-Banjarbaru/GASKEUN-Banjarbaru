/**
 * GASKEUN - Google Apps Script
 * Tempel kode ini di Google Apps Script (script.google.com)
 *
 * CARA SETUP:
 * 1. Buka Google Sheets baru → Extensions → Apps Script
 * 2. Hapus semua kode yang ada, paste kode ini
 * 3. Klik Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy URL deployment → paste ke SCRIPT_URL di config.js
 */

// ─── Nama Sheet ─────────────────────────────────────────
const SHEET_NAME        = 'Data Skrining';
const MOBILE_SHEET_NAME = 'Skrining Mobile';

// ─── Header Row (Data Skrining) ──────────────────────────
const HEADERS = [
  'No', 'Tanggal', 'Waktu', 'Nama Lengkap', 'NIK',
  'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'No HP',
  'Posyandu Tujuan', 'Keluhan PTM', 'ID'
];

// ─── Header Row (Skrining Mobile) ───────────────────────
const MOBILE_HEADERS = [
  'id', 'nama', 'alamat', 'kelurahan', 'kecamatan',
  'lat', 'lng', 'hari', 'jam_buka', 'layanan_ptm',
  'keterangan', 'ditambahkan', 'deleted'
];

// ─── doGet ───────────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter) ? e.parameter.action : null;

  if (action === 'get_skrining_mobile') {
    return getSkriningMobile();
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'GASKEUN API aktif',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── GET: Ambil semua Skrining Mobile aktif ──────────────
function getSkriningMobile() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MOBILE_SHEET_NAME);

    if (!sheet || sheet.getLastRow() <= 1) {
      return _jsonOk({ data: [] });
    }

    const allValues = sheet.getDataRange().getValues();
    const headers   = allValues[0];
    const rows      = allValues.slice(1);

    const data = rows
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      })
      .filter(r => r.deleted !== true && r.deleted !== 'TRUE')
      .map(r => {
        // Parse layanan_ptm kembali ke array
        if (typeof r.layanan_ptm === 'string' && r.layanan_ptm) {
          try { r.layanan_ptm = JSON.parse(r.layanan_ptm); }
          catch (_) { r.layanan_ptm = r.layanan_ptm.split(',').map(s => s.trim()); }
        } else if (!Array.isArray(r.layanan_ptm)) {
          r.layanan_ptm = [];
        }
        r.id     = Number(r.id);
        r.lat    = Number(r.lat);
        r.lng    = Number(r.lng);
        r.status = 'dadakan';
        return r;
      });

    return _jsonOk({ data });

  } catch (err) {
    return _jsonError(err.toString());
  }
}

// ─── doPost ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'add_skrining_mobile') {
      return addSkriningMobile(data.payload);
    }
    if (data.action === 'delete_skrining_mobile') {
      return deleteSkriningMobile(data.id);
    }

    // Default: simpan data skrining form
    return saveDataSkrining(data);

  } catch (err) {
    return _jsonError(err.toString());
  }
}

// ─── POST: Tambah Tempat Skrining Mobile ─────────────────
function addSkriningMobile(p) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(MOBILE_SHEET_NAME);

    // Buat sheet baru jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(MOBILE_SHEET_NAME);
      sheet.appendRow(MOBILE_HEADERS);
      const hRange = sheet.getRange(1, 1, 1, MOBILE_HEADERS.length);
      hRange.setBackground('#c2410c');
      hRange.setFontColor('#ffffff');
      hRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      // Lebar kolom
      sheet.setColumnWidth(1, 130);  // id
      sheet.setColumnWidth(2, 180);  // nama
      sheet.setColumnWidth(3, 200);  // alamat
      sheet.setColumnWidth(4, 130);  // kelurahan
      sheet.setColumnWidth(5, 130);  // kecamatan
      sheet.setColumnWidth(6, 90);   // lat
      sheet.setColumnWidth(7, 90);   // lng
      sheet.setColumnWidth(8, 130);  // hari
      sheet.setColumnWidth(9, 110);  // jam_buka
      sheet.setColumnWidth(10, 220); // layanan_ptm
      sheet.setColumnWidth(11, 200); // keterangan
      sheet.setColumnWidth(12, 150); // ditambahkan
      sheet.setColumnWidth(13, 60);  // deleted
    }

    sheet.appendRow([
      p.id,
      p.nama        || '',
      p.alamat      || '',
      p.kelurahan   || '',
      p.kecamatan   || 'Banjarbaru Selatan',
      p.lat,
      p.lng,
      p.hari        || 'Tidak Terjadwal',
      p.jam_buka    || '-',
      JSON.stringify(p.layanan_ptm || []),
      p.keterangan  || '',
      p.ditambahkan || new Date().toLocaleString(),
      false
    ]);

    return _jsonOk({ status: 'success', id: p.id });

  } catch (err) {
    return _jsonError(err.toString());
  }
}

// ─── POST: Hapus Tempat Skrining Mobile (soft delete) ────
function deleteSkriningMobile(id) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(MOBILE_SHEET_NAME);

    if (!sheet) return _jsonOk({ status: 'ok', message: 'Sheet tidak ditemukan' });

    const allValues      = sheet.getDataRange().getValues();
    const headers        = allValues[0];
    const idColIndex     = headers.indexOf('id');
    const deletedColIdx  = headers.indexOf('deleted');

    for (let i = 1; i < allValues.length; i++) {
      if (Number(allValues[i][idColIndex]) === Number(id)) {
        sheet.getRange(i + 1, deletedColIdx + 1).setValue(true);
        break;
      }
    }

    return _jsonOk({ status: 'success' });

  } catch (err) {
    return _jsonError(err.toString());
  }
}

// ─── POST: Simpan Data Skrining Form ─────────────────────
function saveDataSkrining(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      const headerRow = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRow.setBackground('#0a5c36');
      headerRow.setFontColor('#ffffff');
      headerRow.setFontWeight('bold');
      headerRow.setFontSize(11);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 40);
      sheet.setColumnWidth(2, 90);
      sheet.setColumnWidth(3, 60);
      sheet.setColumnWidth(4, 160);
      sheet.setColumnWidth(5, 140);
      sheet.setColumnWidth(6, 100);
      sheet.setColumnWidth(7, 100);
      sheet.setColumnWidth(8, 200);
      sheet.setColumnWidth(9, 110);
      sheet.setColumnWidth(10, 160);
      sheet.setColumnWidth(11, 220);
      sheet.setColumnWidth(12, 120);
    }

    const lastRow = sheet.getLastRow();
    const no      = lastRow;
    const jkLabel = data.jk === 'L' ? 'Laki-laki' : data.jk === 'P' ? 'Perempuan' : (data.jk || '');

    sheet.appendRow([
      no,
      data.tanggal   || '',
      data.waktu     || '',
      data.nama      || '',
      data.nik       || '',
      data.tgl_lahir || '',
      jkLabel,
      data.alamat    || '',
      data.no_hp     || '',
      data.posyandu  || '',
      data.keluhan   || '',
      String(data.id || '')
    ]);

    const newRow = sheet.getLastRow();
    if (newRow % 2 === 0) {
      sheet.getRange(newRow, 1, 1, HEADERS.length).setBackground('#f0faf5');
    }

    return _jsonOk({ status: 'success', message: 'Data berhasil disimpan', row: newRow });

  } catch (err) {
    return _jsonError(err.toString());
  }
}

// ─── Helpers ─────────────────────────────────────────────
function _jsonOk(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ status: 'ok' }, obj)))
    .setMimeType(ContentService.MimeType.JSON);
}

function _jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
