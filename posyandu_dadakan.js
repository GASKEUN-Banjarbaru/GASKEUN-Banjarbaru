/**
 * GASKEUN - Tempat Skrining Mobile
 * Fitur tambah posyandu sementara tanpa edit kode.
 * Data tersimpan di localStorage, muncul di peta & daftar.
 */

'use strict';

// ─── Storage Key (cache lokal) ───────────────────────────
const DADAKAN_STORAGE_KEY = 'gaskeun_posyandu_dadakan';

// ─── In-Memory Cache + State ─────────────────────────────
// Pre-populate dari localStorage agar tersedia sebelum fetch selesai
let _dadakanCache = (() => {
  try {
    const raw = localStorage.getItem(DADAKAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
})();
let _pollingTimer    = null;   // handle interval polling
let _lastFetchHash   = '';     // deteksi perubahan agar tidak re-render sia-sia
let _initialLoadDone = false;  // cegah toast saat load pertama
let _deletingIds     = new Set(); // ID yang sedang dihapus (tunggu server konfirmasi)

// ─── Helpers Internal ────────────────────────────────────
function _getScriptUrl() {
  return (typeof GASKEUN_CONFIG !== 'undefined' &&
          GASKEUN_CONFIG.MOBILE_SYNC_ENABLED !== false &&
          GASKEUN_CONFIG.SCRIPT_URL)
    ? GASKEUN_CONFIG.SCRIPT_URL : null;
}

function _saveToLocalStorage(data) {
  try { localStorage.setItem(DADAKAN_STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { /* ignore */ }
}

// ─── loadDadakanData: sinkron, dari cache ────────────────
function loadDadakanData() {
  return _dadakanCache;
}

// ─── Cek Status Buka/Tutup Skrining Mobile ───────────────
/**
 * Mengembalikan { buka: bool } untuk tempat skrining mobile.
 * Field `hari` bisa berupa teks bebas: "Sabtu, 12 April", "Setiap Sabtu", dll.
 * Field `jam_buka` format: "09.00 - 12.00" atau "09:00 - 12:00"
 */
function getMobileStatus(p) {
  // Jika tidak ada jam_buka yang valid, anggap tidak bisa dicek
  if (!p.jam_buka || p.jam_buka === '-' || p.jam_buka === '') {
    return { buka: false, adaJadwal: false };
  }

  const now = new Date();
  const hariMap = {
    'minggu': 0, 'sunday': 0,
    'senin': 1, 'monday': 1,
    'selasa': 2, 'tuesday': 2,
    'rabu': 3, 'wednesday': 3,
    'kamis': 4, 'thursday': 4,
    'jumat': 5, 'friday': 5,
    'sabtu': 6, 'saturday': 6
  };

  const hariStr = (p.hari || '').toLowerCase();
  const todayDay = now.getDay(); // 0=Minggu

  // Cek apakah ada tanggal spesifik (misal: "12 April" atau "12/04") dalam field hari
  const bulanMap = {
    'jan': 0, 'januari': 0,
    'feb': 1, 'februari': 1,
    'mar': 2, 'maret': 2,
    'apr': 3, 'april': 3,
    'mei': 4, 'may': 4,
    'jun': 5, 'juni': 5,
    'jul': 6, 'juli': 6,
    'agu': 7, 'agustus': 7,
    'sep': 8, 'september': 8,
    'okt': 9, 'oktober': 9,
    'nov': 10, 'november': 10,
    'des': 11, 'desember': 11
  };

  // Coba parse tanggal spesifik seperti "12 April" atau tanggal "2026-04-17"
  let hariCocok = false;

  // Format ISO: 2026-04-17
  const isoMatch = hariStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const tgl = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    hariCocok = (tgl.getFullYear() === now.getFullYear() &&
                 tgl.getMonth()    === now.getMonth() &&
                 tgl.getDate()     === now.getDate());
  } else {
    // Format "12 April" atau "Sabtu, 12 April"
    let dayMatch = null;
    for (const [nama, idx] of Object.entries(bulanMap)) {
      const re = new RegExp(`(\\d{1,2})\\s+${nama}`);
      const m  = hariStr.match(re);
      if (m) {
        const tglNum = parseInt(m[1]);
        if (now.getMonth() === idx && now.getDate() === tglNum) {
          hariCocok = true;
        }
        dayMatch = true;
        break;
      }
    }

    if (dayMatch === null) {
      // Tidak ada tanggal spesifik, cek nama hari ("Setiap Sabtu", "Sabtu")
      let namaHariCocok = false;
      for (const [nama, val] of Object.entries(hariMap)) {
        if (hariStr.includes(nama)) {
          namaHariCocok = todayDay === val;
          break;
        }
      }
      hariCocok = namaHariCocok;
    }
  }

  if (!hariCocok) return { buka: false, adaJadwal: true };

  // Cek jam buka: format "09.00 - 12.00" atau "09:00 - 12:00"
  const jamMatch = p.jam_buka.match(/(\d+)[.:]?(\d*)\s*-\s*(\d+)[.:]?(\d*)/);
  if (!jamMatch) return { buka: true, adaJadwal: true }; // hari cocok, jam tidak terparsing → anggap buka

  const menit1 = parseInt(jamMatch[1]) * 60 + parseInt(jamMatch[2] || '0');
  const menit2 = parseInt(jamMatch[3]) * 60 + parseInt(jamMatch[4] || '0');
  const menitSekarang = now.getHours() * 60 + now.getMinutes();

  return {
    buka: menitSekarang >= menit1 && menitSekarang <= menit2,
    adaJadwal: true
  };
}

// ─── Fetch dari Google Sheets (async) ────────────────────
async function fetchSkriningMobileFromServer() {
  const url = _getScriptUrl();
  if (!url) return;
  try {
    const res  = await fetch(`${url}?action=get_skrining_mobile&t=${Date.now()}`);
    const json = await res.json();
    if (json.status === 'ok' && Array.isArray(json.data)) {
      // Filter item yang sedang dalam proses hapus lokal
      const serverData = json.data.filter(r => !_deletingIds.has(Number(r.id)));
      const newHash    = JSON.stringify(serverData);
      if (newHash === _lastFetchHash) return; // tidak ada perubahan
      _lastFetchHash = newHash;
      _dadakanCache  = serverData;
      _saveToLocalStorage(serverData);
      // Sinkronkan marker peta & UI
      _syncMarkersWithCache();
      renderDadakanList();
      refreshPosyanduDropdown();
      updateDadakanBadge();
      if (typeof renderPosyanduList === 'function') renderPosyanduList();
      // Tampilkan notifikasi hanya saat polling (bukan load pertama)
      if (_initialLoadDone) {
        showToast('📍 Tempat skrining mobile diperbarui', 'info');
      }
    }
  } catch (e) {
    console.warn('[Skrining Mobile] Gagal fetch dari server:', e);
  }
}

// ─── Sinkronkan Marker Peta dengan Cache ─────────────────
function _syncMarkersWithCache() {
  if (!state || !state.map || !state.posyanduMarkers) return;
  const cacheIds = new Set(_dadakanCache.map(p => p.id));
  // Hapus marker yang tidak ada di cache
  const toRemove = state.posyanduMarkers.filter(
    m => m.data && m.data.status === 'dadakan' && !cacheIds.has(m.id)
  );
  toRemove.forEach(m => {
    state.map.removeLayer(m.marker);
    state.posyanduMarkers = state.posyanduMarkers.filter(x => x.id !== m.id);
  });
  // Tambah marker untuk entri baru dari server
  const existingIds = new Set(state.posyanduMarkers.map(m => m.id));
  _dadakanCache.forEach(p => {
    if (!existingIds.has(p.id)) addDadakanMarkerToMap(p);
  });
}

// ─── POST: Tambah ke Google Sheets ───────────────────────
async function _postAddToServer(p) {
  const url = _getScriptUrl();
  if (!url) return;
  try {
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'add_skrining_mobile', payload: p })
    });
    const json = await res.json();
    if (json.status !== 'ok' && json.status !== 'success') {
      console.warn('[Skrining Mobile] Gagal simpan ke server:', json);
    }
  } catch (e) {
    console.warn('[Skrining Mobile] POST add gagal (data tetap lokal):', e);
  }
}

// ─── POST: Hapus dari Google Sheets ──────────────────────
async function _postDeleteToServer(id) {
  const url = _getScriptUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete_skrining_mobile', id })
    });
  } catch (e) {
    console.warn('[Skrining Mobile] POST delete gagal:', e);
  }
}

// ─── Polling Otomatis ────────────────────────────────────
function startDadakanPolling() {
  const interval = (typeof GASKEUN_CONFIG !== 'undefined' &&
                    GASKEUN_CONFIG.MOBILE_POLLING_INTERVAL)
    ? GASKEUN_CONFIG.MOBILE_POLLING_INTERVAL : 30000;
  if (_pollingTimer) clearInterval(_pollingTimer);
  _pollingTimer = setInterval(() => {
    if (!document.hidden) fetchSkriningMobileFromServer();
  }, interval);
}

// ─── Get All Data (statis + dadakan/skrining mobile) ─────
function getAllPosyanduData() {
  return [...POSYANDU_DATA, ..._dadakanCache];
}

// ─── Open / Close Modal Dadakan ──────────────────────────
function openDadakanModal(lat = null, lng = null) {
  const modal = document.getElementById('dadakan-modal');
  if (!modal) return;

  // Reset form
  document.getElementById('dadakan-form').reset();
  document.getElementById('dadakan-lat').value = lat ? lat.toFixed(7) : '';
  document.getElementById('dadakan-lng').value = lng ? lng.toFixed(7) : '';
  updateDadakanCoordDisplay();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('dadakan-nama')?.focus(), 300);
}

function closeDadakanModal() {
  const modal = document.getElementById('dadakan-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  // Disable map picker mode if active
  disableMapPicker();
}

// ─── Map Picker ───────────────────────────────────────────
let _pickerActive = false;
let _pickerClickHandler = null;

function enableMapPicker() {
  if (!state || !state.map) return;
  _pickerActive = true;

  // Sembunyikan modal sepenuhnya
  const modal = document.getElementById('dadakan-modal');
  if (modal) {
    modal.style.transition = 'opacity 0.2s ease';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
  }

  // Ubah cursor peta menjadi crosshair
  state.map.getContainer().style.cursor = 'crosshair';

  // Tampilkan banner instruksi di atas peta
  showPickerBanner();

  // Daftarkan handler klik pada peta
  _pickerClickHandler = function(e) {
    const { lat, lng } = e.latlng;
    document.getElementById('dadakan-lat').value = lat.toFixed(7);
    document.getElementById('dadakan-lng').value = lng.toFixed(7);
    updateDadakanCoordDisplay();

    // Tambahkan pin sementara di lokasi yang diklik
    showTempPickerPin(lat, lng);

    disableMapPicker();

    // Tampilkan kembali modal
    if (modal) {
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'all';
    }

    showToast(`\ud83d\udccd Lokasi dipilih: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
  };

  state.map.once('click', _pickerClickHandler);
}

function disableMapPicker() {
  if (!_pickerActive) return;
  _pickerActive = false;

  if (state && state.map) {
    state.map.getContainer().style.cursor = '';
    if (_pickerClickHandler) {
      state.map.off('click', _pickerClickHandler);
      _pickerClickHandler = null;
    }
  }

  // Hapus banner instruksi
  hidePickerBanner();
}

// ─── Banner Instruksi saat Pilih Peta ─────────────────────
function showPickerBanner() {
  let banner = document.getElementById('map-picker-banner');
  if (banner) { banner.style.display = 'flex'; return; }

  banner = document.createElement('div');
  banner.id = 'map-picker-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;width:100%;">
      <i class="fa-solid fa-map-pin" style="font-size:20px;color:#fed7aa;flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;color:#fff;">Pilih Lokasi di Peta</div>
        <div style="font-size:11px;color:#fcd4b0;margin-top:2px;">Ketuk atau klik tepat di lokasi posyandu akan digelar</div>
      </div>
      <button id="btn-cancel-picker" onclick="cancelMapPicker()" style="
        background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
        border-radius:8px;color:#fff;padding:7px 12px;font-size:11px;font-weight:600;
        cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;">
        <i class="fa-solid fa-xmark"></i> Batal
      </button>
    </div>
  `;
  banner.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%; transform: translateX(-50%);
    z-index: 3000;
    background: linear-gradient(135deg, #c2410c, #ea580c);
    border: 1px solid rgba(249,115,22,.5);
    border-radius: 14px;
    padding: 14px 18px;
    box-shadow: 0 8px 30px rgba(0,0,0,.5), 0 0 0 1px rgba(249,115,22,.3);
    width: calc(100% - 32px);
    max-width: 460px;
    display: flex;
    animation: pickerBannerIn 0.3s cubic-bezier(.34,1.56,.64,1);
  `;
  document.body.appendChild(banner);

  if (!document.getElementById('banner-anim-style')) {
    const s = document.createElement('style');
    s.id = 'banner-anim-style';
    s.textContent = `
      @keyframes pickerBannerIn {
        from { opacity:0; transform: translateX(-50%) translateY(-14px); }
        to   { opacity:1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }
}

function hidePickerBanner() {
  const banner = document.getElementById('map-picker-banner');
  if (banner) banner.remove();
}

// ─── Pin Sementara Saat Pilih Lokasi ─────────────────────
let _tempPickerMarker = null;

function showTempPickerPin(lat, lng) {
  if (_tempPickerMarker) state.map.removeLayer(_tempPickerMarker);
  const html = `
    <div style="
      width:30px;height:30px;
      background:linear-gradient(135deg,#f97316,#ea580c);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(249,115,22,.7);
      border:2px solid white;
    ">
      <span style="transform:rotate(45deg);color:white;font-size:12px;">
        <i class="fa-solid fa-plus"></i>
      </span>
    </div>`;
  _tempPickerMarker = L.marker([lat, lng], {
    icon: L.divIcon({ html, className:'', iconSize:[30,30], iconAnchor:[15,30] }),
    zIndexOffset: 2000
  }).addTo(state.map);
  setTimeout(() => {
    if (_tempPickerMarker) {
      state.map.removeLayer(_tempPickerMarker);
      _tempPickerMarker = null;
    }
  }, 5000);
}

// ─── Batal Pilih Peta ─────────────────────────────────────
function cancelMapPicker() {
  disableMapPicker();
  const modal = document.getElementById('dadakan-modal');
  if (modal) {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';
  }
}
window.cancelMapPicker = cancelMapPicker;


function updateDadakanCoordDisplay() {
  const lat = document.getElementById('dadakan-lat').value;
  const lng = document.getElementById('dadakan-lng').value;
  const display = document.getElementById('dadakan-coord-display');
  if (!display) return;
  if (lat && lng) {
    display.textContent = `📍 ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
    display.style.color = 'var(--primary)';
  } else {
    display.textContent = 'Belum dipilih';
    display.style.color = 'var(--text-muted)';
  }
}

// ─── Submit Form Dadakan ──────────────────────────────────
function submitDadakanForm(e) {
  e.preventDefault();

  const nama = document.getElementById('dadakan-nama').value.trim();
  const alamat = document.getElementById('dadakan-alamat').value.trim();
  const kelurahan = document.getElementById('dadakan-kelurahan').value.trim();
  const lat = parseFloat(document.getElementById('dadakan-lat').value);
  const lng = parseFloat(document.getElementById('dadakan-lng').value);
  const hari = document.getElementById('dadakan-hari').value.trim();
  const jam_buka = document.getElementById('dadakan-jam').value.trim();
  const keterangan = document.getElementById('dadakan-ket').value.trim();

  // Kumpulkan layanan PTM
  const layanan_ptm = [...document.querySelectorAll('.dadakan-ptm-check:checked')].map(c => c.value);

  // Validasi
  if (!nama || !alamat || !kelurahan) {
    showToast('Nama, alamat, dan kelurahan wajib diisi.', 'warning');
    return;
  }
  if (isNaN(lat) || isNaN(lng)) {
    showToast('Pilih lokasi di peta atau isi koordinat dengan benar.', 'warning');
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showToast('Koordinat tidak valid. Cek kembali lat/lng.', 'warning');
    return;
  }

  // ID unik berbasis timestamp — aman multi-pengguna
  const newId = Date.now();

  const newPosyandu = {
    id: newId,
    nama: nama || 'Tempat Skrining Mobile',
    alamat,
    kelurahan,
    kecamatan: 'Banjarbaru Selatan',
    lat,
    lng,
    hari: hari || 'Tidak Terjadwal',
    jam_buka: jam_buka || '-',
    layanan_ptm: layanan_ptm.length > 0 ? layanan_ptm : ['Hipertensi'],
    maps_url: '',
    telp: '',
    status: 'dadakan',
    keterangan,
    ditambahkan: new Date().toLocaleString('id-ID')
  };

  // Update cache lokal & tampilkan segera (optimistic UI)
  _dadakanCache    = [..._dadakanCache, newPosyandu];
  _lastFetchHash   = JSON.stringify(_dadakanCache); // cegah overwrite saat polling
  _saveToLocalStorage(_dadakanCache);

  // Tambahkan marker ke peta
  addDadakanMarkerToMap(newPosyandu);

  // Re-render daftar & dropdown
  renderPosyanduList();
  renderDadakanList();
  refreshPosyanduDropdown();
  updateDadakanBadge();

  closeDadakanModal();
  showToast(`✅ ${newPosyandu.nama} berhasil ditambahkan!`, 'success');

  // Kirim ke Google Sheets di background (agar semua pengguna bisa lihat)
  _postAddToServer(newPosyandu);

  // Fly ke lokasi baru
  if (state && state.map) {
    state.map.flyTo([lat, lng], 16, { duration: 1.2 });
  }
}

// ─── Marker Posyandu Dadakan ──────────────────────────────
function createDadakanIcon() {
  const html = `
    <div style="
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(249,115,22,.5), 0 0 0 4px rgba(249,115,22,.15);
      border: 2px solid rgba(255,255,255,0.35);
      cursor: pointer;
      animation: dadakan-pulse 2s ease-in-out infinite;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 14px;">
        <i class="fa-solid fa-location-pin"></i>
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -42]
  });
}

function addDadakanMarkerToMap(p) {
  const marker = L.marker([p.lat, p.lng], {
    icon: createDadakanIcon(),
    title: `📍 ${p.nama} (Skrining Mobile)`
  }).addTo(state.map);

  marker.bindPopup(createDadakanPopup(p), {
    maxWidth: 300,
    className: 'gaskeun-popup'
  });

  marker.on('click', () => {
    setActiveItem(p.id);
  });

  state.posyanduMarkers.push({ id: p.id, marker, data: p });
}

function createDadakanPopup(p) {
  const layananTags = p.layanan_ptm.map(l =>
    `<span class="popup-tag" style="background:rgba(249,115,22,.15);border-color:rgba(249,115,22,.3);color:#fb923c;">${l}</span>`
  ).join('');

  const { buka, adaJadwal } = getMobileStatus(p);
  const statusHTML = adaJadwal
    ? buka
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.35);color:#34d399;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;"><span style="width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block;"></span>Aktif</span>`
      : `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;"><span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block;"></span>Tutup</span>`
    : `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(100,116,139,.15);border:1px solid rgba(100,116,139,.25);color:#94a3b8;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600;">—</span>`;

  return `
    <div class="popup-wrapper">
      <div class="popup-header" style="background: linear-gradient(135deg,#ea580c,#c2410c);">
        <div class="popup-header-icon"><i class="fa-solid fa-bolt"></i></div>
        <div style="flex:1;">
          <div class="popup-title">${p.nama}</div>
          <div class="popup-subtitle" style="color:#fed7aa;">📍 Tempat Skrining Mobile</div>
        </div>
        <div style="margin-left:auto;">${statusHTML}</div>
      </div>
      <div class="popup-body">
        <div class="popup-info-row"><i class="fa-solid fa-map-pin"></i><span>${p.alamat}, ${p.kelurahan}</span></div>
        <div class="popup-info-row"><i class="fa-solid fa-clock"></i><span>${p.hari} | ${p.jam_buka}</span></div>
        ${p.keterangan ? `<div class="popup-info-row"><i class="fa-solid fa-circle-info"></i><span>${p.keterangan}</span></div>` : ''}
        <div class="popup-info-row" style="font-size:10px;color:var(--text-muted);"><i class="fa-solid fa-calendar-plus"></i><span>Ditambahkan: ${p.ditambahkan}</span></div>
        <div class="popup-layanan-title">Layanan PTM</div>
        <div class="popup-layanan-tags">${layananTags}</div>
      </div>
      <div class="popup-footer">
        <button class="popup-btn popup-btn-primary" onclick="navigateTo(${p.id})">
          <i class="fa-solid fa-diamond-turn-right"></i> Navigasi
        </button>
        <button class="popup-btn popup-btn-secondary" style="background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.25);color:#f87171;"
          onclick="confirmDeleteDadakan(${p.id})">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </div>
    </div>
  `;
}

// ─── Load Marker di Startup (cache dulu, lalu server) ────
async function loadDadakanMarkersOnStart() {
  // 1. Render dari cache lokal (cepat, offline-friendly)
  if (_dadakanCache.length > 0) {
    _dadakanCache.forEach(p => addDadakanMarkerToMap(p));
    renderDadakanList();
    refreshPosyanduDropdown();
    updateDadakanBadge();
  }

  // 2. Ambil data terbaru dari server (akan update jika ada perbedaan)
  await fetchSkriningMobileFromServer();

  // 3. Tandai initial load selesai, lalu mulai polling
  _initialLoadDone = true;
  startDadakanPolling();
}

// ─── Modal Konfirmasi Hapus (menggantikan window.confirm) ─
let _pendingDeleteId = null; // ID yang menunggu konfirmasi hapus

function confirmDeleteDadakan(id) {
  const numId = Number(id);
  const p = _dadakanCache.find(x => Number(x.id) === numId);
  if (!p) {
    console.warn('[Skrining Mobile] Item tidak ditemukan, id:', id, '| Cache ids:', _dadakanCache.map(x => x.id));
    return;
  }
  // Simpan ID dan buka modal konfirmasi kustom
  _pendingDeleteId = numId;
  const modal     = document.getElementById('delete-confirm-modal');
  const nameEl    = document.getElementById('delete-confirm-name');
  const okBtn     = document.getElementById('delete-confirm-ok');
  if (!modal) {
    // Fallback ke confirm() jika modal belum ada
    if (window.confirm(`Hapus "${p.nama}"?`)) deleteDadakan(numId);
    return;
  }
  nameEl.textContent = `"${p.nama}"`;
  modal.style.display = 'flex';
  // Tombol Hapus: tangkap ID ke variabel lokal SEBELUM close modal mereset _pendingDeleteId
  okBtn.onclick = () => {
    const idToDelete = _pendingDeleteId; // simpan dulu sebelum direset
    closeDeleteConfirmModal();           // ini mereset _pendingDeleteId = null
    if (idToDelete) deleteDadakan(idToDelete);
  };
}

function closeDeleteConfirmModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.style.display = 'none';
  _pendingDeleteId = null;
}

function deleteDadakan(id) {
  const numId = Number(id);

  // Tandai sebagai "sedang dihapus" agar polling tidak mengembalikannya
  _deletingIds.add(numId);

  // Update cache lokal (optimistic) — gunakan Number() agar type-safe
  _dadakanCache  = _dadakanCache.filter(p => Number(p.id) !== numId);
  _saveToLocalStorage(_dadakanCache);

  // Hapus marker dari peta
  try {
    const found = state.posyanduMarkers.find(m => Number(m.id) === numId);
    if (found) {
      state.map.removeLayer(found.marker);
      state.posyanduMarkers = state.posyanduMarkers.filter(m => Number(m.id) !== numId);
    }
    state.map.closePopup();
  } catch (e) {
    console.warn('[Skrining Mobile] Gagal hapus marker dari peta:', e);
  }

  // Update UI — renderDadakanList HARUS terpanggil
  renderDadakanList();
  try { refreshPosyanduDropdown(); } catch (e) {}
  try { updateDadakanBadge(); } catch (e) {}
  try { if (typeof renderPosyanduList === 'function') renderPosyanduList(); } catch (e) {}

  // Kirim hapus ke server, bersihkan _deletingIds setelah konfirmasi
  _postDeleteToServer(numId).finally(() => {
    // Hapus dari set setelah server selesai (berhasil atau gagal)
    // Set timer untuk bersihkan agar polling punya waktu sinkronisasi
    setTimeout(() => { _deletingIds.delete(numId); }, 60000); // bersihkan setelah 60 detik
  });

  showToast('Tempat skrining mobile dihapus.', 'info');
}

// ─── Refresh Dropdown Posyandu di Form Skrining ──────────
function refreshPosyanduDropdown() {
  const posSelect = document.getElementById('form-posyandu');
  if (!posSelect) return;

  const allData = getAllPosyanduData();
  const currentVal = posSelect.value;

  posSelect.innerHTML = '<option value="">-- Pilih Posyandu --</option>' +
    allData.map(p => {
      const label = p.status === 'dadakan'
        ? `📍 ${p.nama} (Skrining Mobile - ${p.kelurahan})`
        : `${p.nama} (${p.kelurahan})`;
      return `<option value="${p.nama}" ${currentVal === p.nama ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

// ─── Badge jumlah posyandu dadakan ───────────────────────
function updateDadakanBadge() {
  const count = loadDadakanData().length;
  const badge = document.getElementById('dadakan-count-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

// ─── Render Daftar Dadakan di Sidebar ─────────────────────
function renderDadakanList() {
  const container = document.getElementById('dadakan-list-container');
  if (!container) return;

  const data = loadDadakanData();

  if (data.length === 0) {
    container.innerHTML = `
      <div class="dadakan-empty">
        <i class="fa-solid fa-bolt" style="font-size:24px;color:var(--text-muted);opacity:.5;"></i>
        <p>Belum ada tempat skrining mobile.<br>Klik <strong>"+ Tambah Skrining Mobile"</strong> untuk menambahkan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(p => {
    const { buka, adaJadwal } = getMobileStatus(p);
    const statusBadge = adaJadwal
      ? buka
        ? `<span class="mobile-status-badge mobile-status-aktif"><span class="mobile-status-dot"></span>Aktif</span>`
        : `<span class="mobile-status-badge mobile-status-tutup"><span class="mobile-status-dot"></span>Tutup</span>`
      : '';
    return `
    <div class="dadakan-item ${buka ? 'dadakan-item-aktif' : ''}" data-id="${p.id}">
      <div class="dadakan-item-header">
        <span class="dadakan-badge-tag">📍 Skrining Mobile</span>
        <div style="display:flex;align-items:center;gap:6px;">
          ${statusBadge}
          <button class="dadakan-delete-btn" onclick="confirmDeleteDadakan(${p.id})" title="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="dadakan-item-name" onclick="onPosyanduClick(${p.id})">${p.nama}</div>
      <div class="dadakan-item-addr">
        <i class="fa-solid fa-map-pin"></i> ${p.alamat}, ${p.kelurahan}
      </div>
      <div class="dadakan-item-time">
        <i class="fa-solid fa-clock"></i> ${p.hari} | ${p.jam_buka}
      </div>
      ${p.keterangan ? `<div class="dadakan-item-ket"><i class="fa-solid fa-circle-info"></i> ${p.keterangan}</div>` : ''}
      <div class="dadakan-item-added">Ditambahkan: ${p.ditambahkan}</div>
    </div>
  `;
  }).join('');
}

// ─── Inject CSS Animasi Dadakan ──────────────────────────
(function injectDadakanStyles() {
  const style = document.createElement('style');
  style.id = 'dadakan-styles';
  style.textContent = `
    @keyframes dadakan-pulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(249,115,22,.5), 0 0 0 0 rgba(249,115,22,.4); }
      50% { box-shadow: 0 4px 20px rgba(249,115,22,.7), 0 0 0 8px rgba(249,115,22,0); }
    }

    /* ── Dadakan Modal ── */
    #dadakan-modal {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s ease;
      padding: 16px;
    }
    #dadakan-modal.open {
      opacity: 1; pointer-events: all;
    }
    .dadakan-modal-box {
      background: var(--surface, #1e2d2a);
      border: 1px solid rgba(249,115,22,.25);
      border-radius: 20px;
      width: 100%; max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(249,115,22,.1);
      transform: translateY(20px);
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    #dadakan-modal.open .dadakan-modal-box {
      transform: translateY(0);
    }
    /* Form harus ikut flex agar body bisa scroll & footer tetap terlihat */
    #dadakan-form {
      display: flex; flex-direction: column;
      flex: 1; overflow: hidden; min-height: 0;
    }
    .dadakan-modal-header {
      background: linear-gradient(135deg, rgba(249,115,22,.18), rgba(234,88,12,.08));
      border-bottom: 1px solid rgba(249,115,22,.2);
      padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      flex-shrink: 0;
    }
    .dadakan-modal-icon {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px;
      box-shadow: 0 4px 14px rgba(249,115,22,.4);
      flex-shrink: 0;
    }
    .dadakan-modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary, #e2e8f0); }
    .dadakan-modal-sub { font-size: 11px; color: #fb923c; margin-top: 2px; }
    .dadakan-modal-close {
      margin-left: auto;
      background: rgba(249,115,22,.12);
      border: 1px solid rgba(249,115,22,.25);
      border-radius: 8px;
      color: #fb923c;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px;
      transition: all 0.2s;
    }
    .dadakan-modal-close:hover { background: rgba(249,115,22,.25); }
    .dadakan-modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex; flex-direction: column; gap: 14px;
    }
    .dadakan-section-title {
      font-size: 11px; font-weight: 600;
      color: #fb923c;
      text-transform: uppercase; letter-spacing: 0.8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(249,115,22,.15);
      display: flex; align-items: center; gap: 6px;
    }
    .dadakan-form-group { display: flex; flex-direction: column; gap: 6px; }
    .dadakan-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #94a3b8); }
    .dadakan-input {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text-primary, #e2e8f0);
      font-size: 13px;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .dadakan-input:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249,115,22,.15);
    }
    .dadakan-input::placeholder { color: var(--text-muted, #64748b); }
    .dadakan-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .dadakan-coord-box {
      background: rgba(249,115,22,.06);
      border: 1px dashed rgba(249,115,22,.3);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px;
    }
    #dadakan-coord-display {
      font-size: 12px; font-weight: 500;
      color: var(--text-muted, #64748b);
      flex: 1;
    }
    #dadakan-btn-pick {
      background: rgba(249,115,22,.15);
      border: 1px solid rgba(249,115,22,.35);
      border-radius: 8px;
      color: #fb923c;
      padding: 6px 12px;
      font-size: 11px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; gap: 5px;
      white-space: nowrap;
      transition: all 0.2s;
    }
    #dadakan-btn-pick:hover, #dadakan-btn-pick.picking {
      background: rgba(249,115,22,.3);
    }
    .dadakan-ptm-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .dadakan-ptm-item {
      display: flex; align-items: center; gap: 7px;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,.07);
      background: rgba(255,255,255,.03);
      cursor: pointer;
      transition: all 0.15s;
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }
    .dadakan-ptm-item:has(input:checked) {
      background: rgba(249,115,22,.12);
      border-color: rgba(249,115,22,.35);
      color: #fb923c;
    }
    .dadakan-ptm-item input { accent-color: #f97316; }
    .dadakan-modal-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,.07);
      display: flex; gap: 10px;
      flex-shrink: 0;
      background: rgba(0,0,0,.15);
    }
    .dadakan-btn-cancel {
      flex: 1;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.05);
      color: var(--text-secondary, #94a3b8);
      cursor: pointer; font-size: 13px; font-weight: 600;
      transition: all 0.2s;
    }
    .dadakan-btn-cancel:hover { background: rgba(255,255,255,.1); }
    .dadakan-btn-submit {
      flex: 2;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
      cursor: pointer; font-size: 13px; font-weight: 700;
      box-shadow: 0 4px 14px rgba(249,115,22,.4);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s;
    }
    .dadakan-btn-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(249,115,22,.5); }
    .dadakan-btn-submit:active { transform: translateY(0); }

    /* ── Sidebar Dadakan Button ── */
    .btn-add-dadakan {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin: 10px 14px 4px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(249,115,22,.15), rgba(234,88,12,.08));
      border: 1px solid rgba(249,115,22,.3);
      border-radius: 10px;
      color: #fb923c;
      font-size: 12px; font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      width: calc(100% - 28px);
    }
    .btn-add-dadakan:hover {
      background: linear-gradient(135deg, rgba(249,115,22,.25), rgba(234,88,12,.15));
      box-shadow: 0 4px 12px rgba(249,115,22,.2);
      transform: translateY(-1px);
    }
    #dadakan-count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      background: #f97316; color: white;
      font-size: 9px; font-weight: 700;
      border-radius: 20px;
      min-width: 16px; height: 16px;
      padding: 0 4px;
      margin-left: 4px;
      vertical-align: middle;
    }

    /* ── Daftar Dadakan di Sidebar ── */
    .dadakan-section-header {
      padding: 10px 14px 4px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.7px;
      color: #fb923c;
      display: flex; align-items: center; gap: 6px;
      border-top: 1px solid rgba(249,115,22,.15);
      margin-top: 8px;
    }
    .dadakan-empty {
      padding: 20px;
      text-align: center;
      color: var(--text-muted, #64748b);
      font-size: 12px;
      line-height: 1.7;
    }
    .dadakan-empty i { display: block; margin-bottom: 8px; }
    .dadakan-item {
      margin: 6px 10px;
      padding: 12px 14px;
      background: rgba(249,115,22,.06);
      border: 1px solid rgba(249,115,22,.2);
      border-radius: 12px;
      cursor: default;
    }
    .dadakan-item-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 6px;
    }
    .dadakan-badge-tag {
      font-size: 9px; font-weight: 700;
      background: rgba(249,115,22,.2);
      color: #fb923c;
      padding: 2px 7px; border-radius: 20px;
      letter-spacing: 0.5px;
    }
    .dadakan-delete-btn {
      background: rgba(239,68,68,.1);
      border: 1px solid rgba(239,68,68,.2);
      border-radius: 6px;
      color: #f87171;
      padding: 4px 7px;
      cursor: pointer; font-size: 10px;
      transition: all 0.15s;
    }
    .dadakan-delete-btn:hover { background: rgba(239,68,68,.25); }
    .dadakan-item-name {
      font-size: 13px; font-weight: 700;
      color: #fb923c;
      cursor: pointer; margin-bottom: 4px;
    }
    .dadakan-item-name:hover { text-decoration: underline; }
    .dadakan-item-addr,
    .dadakan-item-time,
    .dadakan-item-ket {
      font-size: 11px; color: var(--text-muted, #64748b);
      display: flex; align-items: flex-start; gap: 5px;
      margin-bottom: 2px;
    }
    .dadakan-item-added {
      font-size: 9px; color: var(--text-muted, #64748b);
      margin-top: 6px; opacity: .7;
    }

    /* ── Status Badge Skrining Mobile ── */
    .mobile-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .mobile-status-aktif {
      background: rgba(16,185,129,.18);
      border: 1px solid rgba(16,185,129,.35);
      color: #34d399;
    }
    .mobile-status-tutup {
      background: rgba(239,68,68,.15);
      border: 1px solid rgba(239,68,68,.3);
      color: #f87171;
    }
    .mobile-status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .mobile-status-aktif .mobile-status-dot {
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16,185,129,.3);
      animation: pulse-green 1.8s ease-in-out infinite;
    }
    .mobile-status-tutup .mobile-status-dot {
      background: #ef4444;
    }
    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,.5); }
      50%       { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
    }
    .dadakan-item-aktif {
      border-color: rgba(16,185,129,.35) !important;
      background: rgba(16,185,129,.05) !important;
    }
  `;
  document.head.appendChild(style);
})();

// ─── Expose Globals ──────────────────────────────────────
window.openDadakanModal              = openDadakanModal;
window.closeDadakanModal             = closeDadakanModal;
window.submitDadakanForm             = submitDadakanForm;
window.confirmDeleteDadakan          = confirmDeleteDadakan;
window.closeDeleteConfirmModal       = closeDeleteConfirmModal;
window.deleteDadakan                 = deleteDadakan;
window.enableMapPicker               = enableMapPicker;
window.updateDadakanCoordDisplay     = updateDadakanCoordDisplay;
window.getAllPosyanduData             = getAllPosyanduData;
window.refreshPosyanduDropdown       = refreshPosyanduDropdown;
window.renderDadakanList             = renderDadakanList;
window.updateDadakanBadge            = updateDadakanBadge;
window.loadDadakanMarkersOnStart     = loadDadakanMarkersOnStart;
window.fetchSkriningMobileFromServer = fetchSkriningMobileFromServer;
window.startDadakanPolling           = startDadakanPolling;

// Tutup modal konfirmasi hapus saat klik backdrop
document.addEventListener('DOMContentLoaded', () => {
  const delModal = document.getElementById('delete-confirm-modal');
  if (delModal) {
    delModal.addEventListener('click', (e) => {
      if (e.target === delModal) closeDeleteConfirmModal();
    });
  }
});
