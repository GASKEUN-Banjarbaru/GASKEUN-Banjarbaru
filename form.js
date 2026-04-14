/**
 * GASKEUN - Form Skrining PTM
 * Manajemen data pasien, localStorage, export CSV, dan print
 */

'use strict';

// ─── Storage Key ─────────────────────────────────────────
const STORAGE_KEY = 'gaskeun_skrining_data';

// ─── Load Data dari localStorage ─────────────────────────
function loadSkriningData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Gagal membaca data:', e);
    return [];
  }
}

// ─── Simpan Data ke localStorage ─────────────────────────
function saveSkriningData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Gagal menyimpan data:', e);
    showToast('Gagal menyimpan data. Storage penuh?', 'error');
  }
}

// ─── Tambah Entri Baru ────────────────────────────────────
function addSkriningEntry(entry) {
  const data = loadSkriningData();
  entry.id = Date.now();
  entry.tanggal = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  entry.waktu = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  });
  data.unshift(entry); // tambah di awal (terbaru di atas)
  saveSkriningData(data);
  return entry;
}

// ─── Hapus Entri ─────────────────────────────────────────
function deleteSkriningEntry(id) {
  const data = loadSkriningData().filter(e => e.id !== id);
  saveSkriningData(data);
  renderDataTable();
  updateDataCount();
  showToast('Data berhasil dihapus.', 'info');
}

// ─── Open Form Modal ──────────────────────────────────────
function openSkriningForm(posyanduId = null) {
  const modal = document.getElementById('form-modal');
  const form = document.getElementById('skrining-form');
  form.reset();

  // Pre-fill posyandu if provided - gabungkan data statis + dadakan
  const posSelect = document.getElementById('form-posyandu');
  if (posSelect) {
    const allData = typeof getAllPosyanduData === 'function'
      ? getAllPosyanduData()
      : POSYANDU_DATA;

    posSelect.innerHTML = '<option value="">-- Pilih Posyandu --</option>' +
      allData.map(p => {
        const label = p.status === 'dadakan'
          ? `⚡ ${p.nama} (Dadakan - ${p.kelurahan})`
          : `${p.nama} (${p.kelurahan})`;
        return `<option value="${p.nama}" ${posyanduId === p.id ? 'selected' : ''}>${label}</option>`;
      }).join('');
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus first field
  setTimeout(() => {
    document.getElementById('form-nama')?.focus();
  }, 300);
}

function closeSkriningForm() {
  const modal = document.getElementById('form-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Submit Form ──────────────────────────────────────────
function submitSkriningForm(e) {
  e.preventDefault();

  const nama = document.getElementById('form-nama').value.trim();
  const nik = document.getElementById('form-nik').value.trim();
  const tgl_lahir = document.getElementById('form-tgl-lahir').value;
  const jk = document.getElementById('form-jk').value;
  const alamat = document.getElementById('form-alamat').value.trim();
  const no_hp = document.getElementById('form-no-hp').value.trim();
  const posyandu = document.getElementById('form-posyandu').value;

  // Kumpulkan keluhan (checkboxes)
  const keluhanChecked = [...document.querySelectorAll('.keluhan-check:checked')].map(c => c.value);
  const keluhanLain = document.getElementById('form-keluhan-lain').value.trim();
  const keluhan = [...keluhanChecked, ...(keluhanLain ? [keluhanLain] : [])];

  if (!nama || !nik || !alamat || !posyandu || keluhan.length === 0) {
    showToast('Lengkapi semua field yang wajib diisi (*)', 'warning');
    return;
  }

  if (nik.length < 16) {
    showToast('NIK harus 16 digit.', 'warning');
    return;
  }

  const entry = {
    nama, nik, tgl_lahir, jk, alamat, no_hp, posyandu,
    keluhan: keluhan.join(', ')
  };

  const saved = addSkriningEntry(entry);

  // ─ Kirim ke Google Sheets (jika sudah dikonfigurasi) ─
  sendToGoogleSheets(saved);

  closeSkriningForm();
  renderDataTable();
  updateDataCount();

  showToast(`Data ${nama} berhasil disimpan!`, 'success');

  // Auto-switch to data tab
  switchTab('data');
}

// ─── Google Sheets Sync ──────────────────────────────────
async function sendToGoogleSheets(entry) {
  const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; // Ganti dengan URL script Anda
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    
    updateSyncStatus(entry.id, true);
  } catch (error) {
    console.error('Sync gagal:', error);
    updateSyncStatus(entry.id, false);
  }
}

function updateSyncStatus(id, status) {
  const data = loadSkriningData();
  const index = data.findIndex(e => e.id === id);
  if (index !== -1) {
    data[index].synced = status;
    saveSkriningData(data);
    renderDataTable();
  }
}

function retrySyncEntry(id) {
  const data = loadSkriningData();
  const entry = data.find(e => e.id === id);
  if (entry) {
    showToast('Mencoba sinkronisasi ulang...', 'info');
    sendToGoogleSheets(entry);
  }
}

// ─── Render Data Table ────────────────────────────────────
function renderDataTable() {
  const data = loadSkriningData();
  const tbody = document.getElementById('data-tbody');
  const emptyState = document.getElementById('data-empty');
  const tableWrapper = document.getElementById('data-table-wrapper');

  if (!tbody) return;

  if (data.length === 0) {
    emptyState.style.display = 'block';
    tableWrapper.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = data.map((e, idx) => `
    <tr>
      <td>${data.length - idx}</td>
      <td>${e.tanggal}<br><span style="font-size:10px;color:var(--text-muted);">${e.waktu}</span></td>
      <td><strong>${e.nama}</strong><br><span style="font-size:10px;color:var(--text-muted);">${e.nik}</span></td>
      <td>${e.jk === 'L' ? '♂ Laki-laki' : e.jk === 'P' ? '♀ Perempuan' : '—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.alamat}">${e.alamat}</td>
      <td>${e.no_hp || '—'}</td>
      <td>${e.posyandu}</td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:3px;">
          ${e.keluhan.split(', ').map(k => `<span class="item-tag" style="font-size:9px;">${k}</span>`).join('')}
        </div>
      </td>
      <td>
        <div style="display:flex;gap:4px;align-items:center;">
          ${e.synced === false ? `<button onclick="retrySyncEntry(${e.id})" class="tbl-btn" title="Gagal sync ke Sheets - Klik untuk coba lagi" style="color:#f97316;border-color:rgba(249,115,22,.3);" ><i class="fa-solid fa-rotate-right"></i></button>` : e.synced ? '<i class="fa-solid fa-cloud-arrow-up" title="Tersimpan di Google Sheets" style="color:var(--primary);font-size:11px;"></i>' : '<i class="fa-solid fa-minus" style="color:var(--text-muted);font-size:9px;"></i>'}
          <button onclick="printEntry(${e.id})" class="tbl-btn tbl-btn-print" title="Cetak">
            <i class="fa-solid fa-print"></i>
          </button>
          <button onclick="confirmDelete(${e.id})" class="tbl-btn tbl-btn-delete" title="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Update Counter ───────────────────────────────────────
function updateDataCount() {
  const count = loadSkriningData().length;
  const el = document.getElementById('data-count-badge');
  if (el) {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }
  const total = document.getElementById('data-total');
  if (total) total.textContent = count;
}

// ─── Export CSV ───────────────────────────────────────────
function exportCSV() {
  const data = loadSkriningData();
  if (data.length === 0) {
    showToast('Tidak ada data untuk diekspor.', 'warning');
    return;
  }

  const headers = ['No', 'Tanggal', 'Waktu', 'Nama', 'NIK', 'Tgl Lahir', 'Jenis Kelamin', 'Alamat', 'No HP', 'Posyandu', 'Keluhan'];
  const rows = data.map((e, idx) => [
    data.length - idx,
    e.tanggal,
    e.waktu,
    e.nama,
    e.nik,
    e.tgl_lahir || '',
    e.jk === 'L' ? 'Laki-laki' : e.jk === 'P' ? 'Perempuan' : '',
    e.alamat,
    e.no_hp || '',
    e.posyandu,
    e.keluhan
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF'; // BOM for proper Excel encoding
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
  a.download = `GASKEUN_Data_Skrining_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`${data.length} data berhasil diekspor ke CSV!`, 'success');
}

// ─── Print All ────────────────────────────────────────────
function printAllData() {
  const data = loadSkriningData();
  if (data.length === 0) {
    showToast('Tidak ada data untuk dicetak.', 'warning');
    return;
  }

  const rows = data.map((e, idx) => `
    <tr>
      <td>${data.length - idx}</td>
      <td>${e.tanggal} ${e.waktu}</td>
      <td><strong>${e.nama}</strong><br><small>${e.nik}</small></td>
      <td>${e.jk === 'L' ? 'Laki-laki' : e.jk === 'P' ? 'Perempuan' : '—'}</td>
      <td>${e.tgl_lahir || '—'}</td>
      <td>${e.alamat}</td>
      <td>${e.no_hp || '—'}</td>
      <td>${e.posyandu}</td>
      <td>${e.keluhan}</td>
    </tr>
  `).join('');

  openPrintWindow(`
    <h2 style="text-align:center;color:#0a5c36;margin-bottom:4px;">GASKEUN</h2>
    <p style="text-align:center;font-size:12px;margin-bottom:16px;">
      Gerakan Skrining Kesehatan Keluarga Ulun<br>
      Puskesmas Banjarbaru Selatan<br>
      Dicetak: ${new Date().toLocaleString('id-ID')}
    </p>
    <table>
      <thead>
        <tr>
          <th>No</th><th>Tanggal</th><th>Nama / NIK</th><th>JK</th>
          <th>Tgl Lahir</th><th>Alamat</th><th>No HP</th><th>Posyandu</th><th>Keluhan</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:20px;font-size:10px;text-align:right;">Total: ${data.length} pasien</p>
  `);
}

// ─── Print Single Entry ───────────────────────────────────
function printEntry(id) {
  const data = loadSkriningData();
  const e = data.find(x => x.id === id);
  if (!e) return;

  openPrintWindow(`
    <div style="border:2px solid #0a5c36;border-radius:8px;padding:20px;max-width:500px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:16px;">
        <h2 style="color:#0a5c36;margin:0;">GASKEUN</h2>
        <p style="font-size:11px;margin:4px 0;">Gerakan Skrining Kesehatan Keluarga Ulun</p>
        <p style="font-size:11px;margin:0;">Puskesmas Banjarbaru Selatan</p>
      </div>
      <hr style="border-color:#0a5c36;margin:12px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;">BUKTI PENDAFTARAN SKRINING PTM</h3>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;width:120px;color:#555;">Tanggal</td><td>: <strong>${e.tanggal} ${e.waktu}</strong></td></tr>
        <tr><td style="padding:4px 0;">Nama</td><td>: <strong>${e.nama}</strong></td></tr>
        <tr><td style="padding:4px 0;">NIK</td><td>: ${e.nik}</td></tr>
        <tr><td style="padding:4px 0;">Jenis Kelamin</td><td>: ${e.jk === 'L' ? 'Laki-laki' : e.jk === 'P' ? 'Perempuan' : '—'}</td></tr>
        <tr><td style="padding:4px 0;">Tgl Lahir</td><td>: ${e.tgl_lahir || '—'}</td></tr>
        <tr><td style="padding:4px 0;">Alamat</td><td>: ${e.alamat}</td></tr>
        <tr><td style="padding:4px 0;">No HP</td><td>: ${e.no_hp || '—'}</td></tr>
        <tr><td style="padding:4px 0;">Posyandu</td><td>: ${e.posyandu}</td></tr>
        <tr><td style="padding:4px 0;vertical-align:top;">Keluhan PTM</td><td>: <strong>${e.keluhan}</strong></td></tr>
      </table>
      <hr style="border-color:#0a5c36;margin:12px 0;">
      <p style="font-size:10px;text-align:center;color:#555;">
        Harap tunjukkan bukti ini kepada petugas posyandu.<br>
        GASKEUN &mdash; Puskesmas Banjarbaru Selatan
      </p>
    </div>
  `);
}

// ─── Print Helper ─────────────────────────────────────────
function openPrintWindow(content) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>GASKEUN - Data Skrining PTM</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #0a5c36; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        tr:nth-child(even) td { background: #f5f5f5; }
        @media print {
          body { margin: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      ${content}
      <br>
      <button onclick="window.print()" style="padding:8px 20px;background:#0a5c36;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">
        🖨️ Cetak Sekarang
      </button>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─── Confirm Delete ───────────────────────────────────────
function confirmDelete(id) {
  const data = loadSkriningData();
  const e = data.find(x => x.id === id);
  if (!e) return;

  if (confirm(`Hapus data pasien "${e.nama}"?\nAksi ini tidak dapat dibatalkan.`)) {
    deleteSkriningEntry(id);
  }
}

// ─── Clear All Data ───────────────────────────────────────
function clearAllData() {
  const data = loadSkriningData();
  if (data.length === 0) { showToast('Tidak ada data.', 'info'); return; }
  if (confirm(`Hapus SEMUA ${data.length} data skrining?\nPastikan sudah di-backup/export sebelum menghapus!`)) {
    localStorage.removeItem(STORAGE_KEY);
    renderDataTable();
    updateDataCount();
    showToast('Semua data berhasil dihapus.', 'info');
  }
}

// ─── Google Sheets Integration ──────────────────────────────────
function sendToGoogleSheets(entry) {
  // Cek apakah config tersedia dan SCRIPT_URL sudah diisi
  if (typeof GASKEUN_CONFIG === 'undefined' ||
      !GASKEUN_CONFIG.SYNC_ENABLED ||
      !GASKEUN_CONFIG.SCRIPT_URL) {
    return; // Belum dikonfigurasi, skip
  }

  const url = GASKEUN_CONFIG.SCRIPT_URL;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(entry)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      // Tandai sebagai synced
      markEntrySynced(entry.id, true);
      if (GASKEUN_CONFIG.SHOW_SYNC_STATUS) {
        showToast('\u2601\ufe0f Data tersinkron ke Google Sheets!', 'success');
      }
      renderDataTable();
    } else {
      markEntrySynced(entry.id, false);
      showToast('Gagal sync ke Google Sheets. Klik ikon 🔄 untuk coba lagi.', 'warning');
      renderDataTable();
    }
  })
  .catch(err => {
    console.warn('Google Sheets sync gagal:', err);
    markEntrySynced(entry.id, false);
    showToast('Internet tidak tersedia. Data tetap tersimpan lokal.', 'warning');
    renderDataTable();
  });
}

function markEntrySynced(id, status) {
  const data = loadSkriningData();
  const idx = data.findIndex(e => e.id === id);
  if (idx !== -1) {
    data[idx].synced = status;
    saveSkriningData(data);
  }
}

function retrySyncEntry(id) {
  const data = loadSkriningData();
  const entry = data.find(e => e.id === id);
  if (!entry) return;
  showToast('Mencoba sinkronisasi ulang...', 'info');
  sendToGoogleSheets(entry);
}

// ─── Sinkronisasi Semua Data yang Belum Tersync ────────────
function syncAllPending() {
  if (typeof GASKEUN_CONFIG === 'undefined' || !GASKEUN_CONFIG.SCRIPT_URL) {
    showToast('Script URL belum dikonfigurasi di config.js', 'warning');
    return;
  }
  const data = loadSkriningData();
  const pending = data.filter(e => e.synced === false || e.synced === undefined);
  if (pending.length === 0) {
    showToast('Semua data sudah tersinkronisasi! \u2705', 'success');
    return;
  }
  showToast(`Menyinkronkan ${pending.length} data...`, 'info');
  pending.forEach((entry, i) => {
    setTimeout(() => sendToGoogleSheets(entry), i * 500);
  });
}

// ─── Expose Globals ───────────────────────────────────────
window.openSkriningForm = openSkriningForm;
window.closeSkriningForm = closeSkriningForm;
window.submitSkriningForm = submitSkriningForm;
window.deleteSkriningEntry = deleteSkriningEntry;
window.confirmDelete = confirmDelete;
window.printEntry = printEntry;
window.printAllData = printAllData;
window.exportCSV = exportCSV;
window.clearAllData = clearAllData;
window.renderDataTable = renderDataTable;
window.updateDataCount = updateDataCount;
window.retrySyncEntry = retrySyncEntry;
window.syncAllPending = syncAllPending;
