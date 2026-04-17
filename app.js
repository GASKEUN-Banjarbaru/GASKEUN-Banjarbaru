/**
 * GASKEUN - Gerakan Skrining Kesehatan Keluarga Ulun
 * Main Application JS
 */

'use strict';

// ─── App State ───────────────────────────────────────────
const state = {
  map: null,
  userMarker: null,
  userLatLng: null,
  posyanduMarkers: [],
  routingControl: null,
  nearestPosyandu: null,
  activeMarker: null,
  sidebarCollapsed: false,
  currentTab: 'posyandu',
  filteredData: [...POSYANDU_DATA],
  activeFilter: 'Semua',
  searchQuery: '',
  routeActive: false
};

// ─── Map Tile Layer - CARTO Voyager (Light, colorful, modern) ──
// Pilihan tile yang tersedia (uncomment salah satu):
// 'voyager'         = warna-warni, modern, paling enak dilihat (AKTIF)
// 'light_all'       = putih bersih, minimalis
// 'rastertiles/voyager_nolabels' = voyager tanpa label teks
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Default center: Banjarbaru Selatan — Wilayah Kerja Puskesmas Banjarbaru Selatan
const DEFAULT_CENTER = [-3.4780, 114.8360];
const DEFAULT_ZOOM = 14;

// ─── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const overlay = document.getElementById('loading-overlay');
  initMap();
  addPuskesmasMarker();
  loadDadakanMarkersOnStart(); // Load posyandu dadakan dari storage
  renderPosyanduList();
  renderPTMInfo();
  renderAbout();
  setupEvents();
  updateDadakanBadge();     // Tampilkan badge jika ada data dadakan
  renderDadakanList();      // Render daftar dadakan di sidebar

  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      // Tampilkan geo permission prompt jika geolocation tersedia
      if (navigator.geolocation) showGeoPrompt();
    }, 500);
  }, 1800);
}

// ─── Map Initialization ───────────────────────────────────
function initMap() {
  state.map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
    attributionControl: true
  });

  // Dark tile layer
  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTR,
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(state.map);

  // Move zoom control to top-right
  L.control.zoom({ position: 'topright' }).addTo(state.map);

  // Add posyandu markers
  addPosyanduMarkers();

}

// ─── Posyandu Markers ─────────────────────────────────────
function createPosyanduIcon(isNearest = false) {
  const color = isNearest ? '#10b981' : '#1a7a5e';
  const size = isNearest ? 44 : 36;
  const glowStyle = isNearest
    ? 'animation:nearest-pin-glow 1.8s ease-in-out infinite;'
    : '';
  const shadow = isNearest
    ? '0 4px 20px rgba(16,185,129,.6), 0 0 0 6px rgba(16,185,129,.18)'
    : '0 4px 16px rgba(16,185,129,.3)';

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadow};
      border: 2px solid rgba(255,255,255,0.3);
      transition: all 0.3s ease;
      cursor: pointer;
      ${glowStyle}
    ">
      <span style="transform: rotate(45deg); color: white; font-size: ${isNearest ? '18px' : '14px'};">
        <i class="fa-solid fa-house-medical"></i>
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)]
  });
}

function createUserIcon() {
  const html = `<div class="user-marker"></div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -15]
  });
}

function addPosyanduMarkers() {
  POSYANDU_DATA.forEach(p => {
    const marker = L.marker([p.lat, p.lng], {
      icon: createPosyanduIcon(false),
      title: p.nama
    }).addTo(state.map);

    marker.bindPopup(createPopupContent(p), {
      maxWidth: 300,
      className: 'gaskeun-popup'
    });

    marker.on('click', () => {
      setActiveItem(p.id);
      state.activeMarker = p.id;
    });

    state.posyanduMarkers.push({ id: p.id, marker, data: p });
  });
  // Catatan: marker posyandu dadakan di-load terpisah via loadDadakanMarkersOnStart()
}

// ─── Puskesmas Induk Marker ───────────────────────────────
function addPuskesmasMarker() {
  const { lat, lng, nama, alamat, kecamatan } = PUSKESMAS;
  const html = `
    <div style="
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(14,165,233,0.5);
      border: 2px solid rgba(255,255,255,0.4);
      cursor: pointer;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 18px;">
        <i class="fa-solid fa-hospital"></i>
      </span>
    </div>
  `;
  const icon = L.divIcon({ html, className: '', iconSize: [44, 44], iconAnchor: [22, 44], popupAnchor: [0, -48] });
  L.marker([lat, lng], { icon, title: nama, zIndexOffset: 900 })
    .addTo(state.map)
    .bindPopup(`
      <div class="popup-wrapper">
        <div class="popup-header" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
          <div class="popup-header-icon"><i class="fa-solid fa-hospital"></i></div>
          <div class="popup-title">${nama}</div>
          <div class="popup-subtitle"><i class="fa-solid fa-location-dot"></i> ${kecamatan}</div>
        </div>
        <div class="popup-body">
          <div class="popup-info-row"><i class="fa-solid fa-map-pin"></i><span>${alamat}, Kota Banjarbaru</span></div>
          <div class="popup-info-row"><i class="fa-solid fa-clock"></i><span>Senin - Sabtu | 07:30 - 16:00</span></div>
          <div class="popup-layanan-title">Fasilitas Induk</div>
          <div class="popup-layanan-tags">
            <span class="popup-tag" style="background:rgba(14,165,233,.15);border-color:rgba(14,165,233,.3);color:#38bdf8;">Pemeriksaan Umum</span>
            <span class="popup-tag" style="background:rgba(14,165,233,.15);border-color:rgba(14,165,233,.3);color:#38bdf8;">Skrining PTM</span>
            <span class="popup-tag" style="background:rgba(14,165,233,.15);border-color:rgba(14,165,233,.3);color:#38bdf8;">Rujukan</span>
          </div>
        </div>
      </div>
    `, { maxWidth: 300, className: 'gaskeun-popup' });
}

function createPopupContent(p) {
  const layananTags = p.layanan_ptm.map(l =>
    `<span class="popup-tag">${l}</span>`
  ).join('');

  const hariFormat = p.hari;
  const hasLocation = state.userLatLng !== null;
  const dist = hasLocation ? calculateDistance(state.userLatLng, [p.lat, p.lng]) : null;
  const distText = dist ? `${dist.toFixed(1)} km dari lokasi Anda` : p.kelurahan;

  return `
    <div class="popup-wrapper">
      <div class="popup-header">
        <div class="popup-header-icon"><i class="fa-solid fa-house-medical"></i></div>
        <div class="popup-title">${p.nama}</div>
        <div class="popup-subtitle"><i class="fa-solid fa-location-dot"></i> ${distText}</div>
      </div>
      <div class="popup-body">
        <div class="popup-info-row">
          <i class="fa-solid fa-map-pin"></i>
          <span>${p.alamat}</span>
        </div>
        <div class="popup-info-row">
          <i class="fa-solid fa-clock"></i>
          <span>${hariFormat} | ${p.jam_buka}</span>
        </div>
        ${p.telp ? `<div class="popup-info-row"><i class="fa-solid fa-phone"></i><span>${p.telp}</span></div>` : ''}
        <div class="popup-layanan-title">Layanan PTM</div>
        <div class="popup-layanan-tags">${layananTags}</div>
      </div>
      <div class="popup-footer">
        <button class="popup-btn popup-btn-primary" onclick="navigateTo(${p.id})">
          <i class="fa-solid fa-diamond-turn-right"></i> Navigasi
        </button>
        ${p.maps_url ? `<button class="popup-btn popup-btn-secondary" onclick="window.open('${p.maps_url}','_blank')"><i class="fa-brands fa-google"></i> Maps</button>` : ''}
      </div>
    </div>
  `;
}

// ─── Geolocation ──────────────────────────────────────────
function locateUser() {
  const btn = document.getElementById('btn-locate');
  btn.classList.add('loading');
  btn.querySelector('i').className = 'fa-solid fa-spinner';

  if (!navigator.geolocation) {
    showToast('Browser Anda tidak mendukung geolocation.', 'error');
    resetLocateBtn();
    return;
  }

  // Tampilkan skeleton saat menunggu GPS
  showSkeletonList();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      state.userLatLng = [lat, lng];

      // Add/update user marker
      if (state.userMarker) {
        state.userMarker.setLatLng([lat, lng]);
      } else {
        state.userMarker = L.marker([lat, lng], {
          icon: createUserIcon(),
          zIndexOffset: 1000,
          title: 'Lokasi Anda'
        }).addTo(state.map);

        state.userMarker.bindPopup(
          '<div style="color:#0f172a;font-size:13px;font-weight:600;padding:4px 8px;">📍 Anda berada di sini</div>'
        );
      }

      // Fly to user location
      state.map.flyTo([lat, lng], 14, { duration: 1.5 });

      // Find nearest posyandu
      findNearestPosyandu();
      resetLocateBtn();
      showToast('Lokasi ditemukan! Menampilkan posyandu terdekat...', 'success');

      // Update popup content (now includes distance)
      updateAllPopups();

      // Re-render list with distances
      renderPosyanduList();
    },
    (err) => {
      console.error(err);
      let msg = 'Gagal mendapatkan lokasi.';
      if (err.code === 1) msg = 'Izin lokasi ditolak. Aktifkan lokasi di browser Anda.';
      else if (err.code === 2) msg = 'Lokasi tidak tersedia. Pastikan GPS aktif.';
      else if (err.code === 3) msg = 'Timeout mendapatkan lokasi. Coba lagi.';
      showToast(msg, 'error');
      resetLocateBtn();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

function resetLocateBtn() {
  const btn = document.getElementById('btn-locate');
  btn.classList.remove('loading');
  btn.querySelector('i').className = 'fa-solid fa-location-crosshairs';
}

// ─── Distance Calculation (Haversine) ─────────────────────
function calculateDistance(from, to) {
  const R = 6371; // Earth radius km
  const dLat = toRad(to[0] - from[0]);
  const dLon = toRad(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from[0])) * Math.cos(toRad(to[0])) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

// ─── Posyandu Open/Closed Status ────────────────────────
/**
 * Cek apakah posyandu sedang buka hari ini.
 * Jadwal contoh: "Senin, Minggu Ke-2"  jam_buka: "10.30 - 12.00"
 * Logika: cocokkan hari & minggu-ke berapa bulan ini, lalu cek jam.
 */
function isPosyanduOpenNow(p) {
  const hariMap = {
    'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
    'kamis': 4, 'jumat': 5, 'sabtu': 6
  };

  const now = new Date();
  const todayDay = now.getDay(); // 0=Minggu, 1=Senin, ...

  // Parse hari & minggu dari field "hari"
  // Format: "Senin, Minggu Ke-2" atau "Rabu, Minggu Ke-3"
  const hariStr = p.hari.toLowerCase();
  const mingguMatch = hariStr.match(/minggu ke-(\d)/);
  if (!mingguMatch) return false;
  const targetMingguKe = parseInt(mingguMatch[1]);

  // Cari nama hari
  let targetDay = -1;
  for (const [nama, val] of Object.entries(hariMap)) {
    if (hariStr.includes(nama)) { targetDay = val; break; }
  }
  if (targetDay < 0) return false;

  // Cek apakah hari ini cocok
  if (todayDay !== targetDay) return false;

  // Cek minggu ke berapa hari ini dalam bulan ini
  const tanggal = now.getDate();
  const mingguKe = Math.ceil(tanggal / 7);
  if (mingguKe !== targetMingguKe) return false;

  // Cek jam buka
  // Format jam_buka: "10.30 - 12.00"
  const jamMatch = p.jam_buka.match(/(\d+)[.:]?(\d+)\s*-\s*(\d+)[.:]?(\d+)/);
  if (!jamMatch) return true; // tidak ada info jam, anggap buka
  const jamBuka = parseInt(jamMatch[1]) * 60 + parseInt(jamMatch[2]);
  const jamTutup = parseInt(jamMatch[3]) * 60 + parseInt(jamMatch[4]);
  const nowMenit = now.getHours() * 60 + now.getMinutes();

  return nowMenit >= jamBuka && nowMenit <= jamTutup;
}

/**
 * Kembalikan objek { buka: bool, jadwalHariIni: bool }
 * jadwalHariIni = true jika memang jadwal hari ini (tapi mungkin belum/sudah waktunya)
 */
function getPosyanduStatus(p) {
  const hariMap = {
    'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
    'kamis': 4, 'jumat': 5, 'sabtu': 6
  };
  const now = new Date();
  const todayDay = now.getDay();
  const hariStr = p.hari.toLowerCase();
  const mingguMatch = hariStr.match(/minggu ke-(\d)/);
  if (!mingguMatch) return { buka: false, jadwalHariIni: false };
  const targetMingguKe = parseInt(mingguMatch[1]);
  let targetDay = -1;
  for (const [nama, val] of Object.entries(hariMap)) {
    if (hariStr.includes(nama)) { targetDay = val; break; }
  }
  const tanggal = now.getDate();
  const mingguKe = Math.ceil(tanggal / 7);
  const jadwalHariIni = (todayDay === targetDay && mingguKe === targetMingguKe);
  const buka = jadwalHariIni && isPosyanduOpenNow(p);
  return { buka, jadwalHariIni };
}

// ─── Find Nearest Posyandu ────────────────────────────────
function findNearestPosyandu() {
  if (!state.userLatLng) return;

  let nearest = null;
  let minDist = Infinity;

  // Gabungkan data statis + dadakan
  const allData = typeof getAllPosyanduData === 'function'
    ? getAllPosyanduData()
    : POSYANDU_DATA;

  allData.forEach(p => {
    const dist = calculateDistance(state.userLatLng, [p.lat, p.lng]);
    p._distance = dist;
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  });

  state.nearestPosyandu = nearest;

  if (nearest) {
    // Update nearest bar
    const bar = document.getElementById('nearest-bar');
    bar.classList.add('visible');
    document.getElementById('nearest-name').textContent = nearest.nama;
    document.getElementById('nearest-detail').textContent = `${nearest.kecamatan} · ${nearest.jam_buka}`;
    document.getElementById('nearest-dist').textContent = `${minDist.toFixed(1)} km`;

    // Update marker icon for nearest
    state.posyanduMarkers.forEach(({ id, marker }) => {
      marker.setIcon(createPosyanduIcon(id === nearest.id));
      if (id === nearest.id) {
        marker.setZIndexOffset(500);
      }
    });

    // Auto-navigate to nearest
    navigateTo(nearest.id);
  }
}

// ─── Routing ─────────────────────────────────────────────
function navigateTo(posyanduId) {
  if (!state.userLatLng) {
    showToast('Aktifkan lokasi Anda terlebih dahulu.', 'warning');
    showGeoPrompt();
    return;
  }

  const allData = typeof getAllPosyanduData === 'function'
    ? getAllPosyanduData()
    : POSYANDU_DATA;
  const posyandu = allData.find(p => p.id === posyanduId);
  if (!posyandu) return;

  clearRoute();

  state.routingControl = L.Routing.control({
    waypoints: [
      L.latLng(state.userLatLng[0], state.userLatLng[1]),
      L.latLng(posyandu.lat, posyandu.lng)
    ],
    routeWhileDragging: false,
    show: false,
    createMarker: () => null,
    lineOptions: {
      styles: [
        { color: '#10b981', weight: 5, opacity: 0.9 },
        { color: '#34d399', weight: 3, opacity: 0.6 }
      ]
    },
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    })
  }).addTo(state.map);

  // Tampilkan jarak & waktu setelah rute ditemukan
  state.routingControl.on('routesfound', function(e) {
    const route = e.routes[0];
    const distKm = (route.summary.totalDistance / 1000).toFixed(1);
    const rawSec = route.summary.totalTime;
    const driveMin = Math.ceil(rawSec / 60);
    const driveTime = driveMin >= 60
      ? `${Math.floor(driveMin / 60)}j ${driveMin % 60}m`
      : `${driveMin} mnt`;
    const walkMin = Math.ceil((route.summary.totalDistance / 1000) / 5 * 60);
    const walkTime = walkMin >= 60
      ? `${Math.floor(walkMin / 60)}j ${walkMin % 60}m`
      : `${walkMin} mnt`;
    showRouteInfoCard(posyandu, distKm, driveTime, walkTime);
  });

  state.routeActive = true;
  document.getElementById('btn-reset-route').style.display = 'flex';
  state.map.closePopup();
  setActiveItem(posyanduId);
  showToast(`Rute ke ${posyandu.nama} sedang dimuat...`, 'info');
}

function clearRoute() {
  if (state.routingControl) {
    state.map.removeControl(state.routingControl);
    state.routingControl = null;
  }
  state.routeActive = false;
  document.getElementById('btn-reset-route').style.display = 'none';
  // Sembunyikan route info card
  const card = document.getElementById('route-info-card');
  if (card) {
    card.classList.remove('visible');
    setTimeout(() => { card.style.display = 'none'; }, 300);
  }
}

function callPosyandu(telp) {
  if (!telp) { showToast('Nomor telepon tidak tersedia.', 'warning'); return; }
  window.open(`tel:${telp}`);
}

// ─── Update All Popups ────────────────────────────────────
function updateAllPopups() {
  state.posyanduMarkers.forEach(({ marker, data }) => {
    marker.setPopupContent(createPopupContent(data));
  });
}

// ─── Sidebar: Active Item ─────────────────────────────────
function setActiveItem(id) {
  document.querySelectorAll('.posyandu-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });

  // Scroll to active item in sidebar
  const activeEl = document.querySelector(`.posyandu-item[data-id="${id}"]`);
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Switch to posyandu tab
  switchTab('posyandu');
}

// ─── Sidebar: Posyandu List ───────────────────────────────
function renderPosyanduList() {
  const list = document.getElementById('posyandu-list');
  const countEl = document.getElementById('posyandu-count');

  // Hanya tampilkan posyandu statis (bukan dadakan) di daftar utama
  let data = [...state.filteredData];
  if (state.userLatLng) {
    data.sort((a, b) => (a._distance || 999) - (b._distance || 999));
  }

  countEl.textContent = data.length;

  if (data.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>Tidak ada posyandu ditemukan untuk pencarian "${state.searchQuery}"</p>
      </div>
    `;
    return;
  }

  const noLocPanel = !state.userLatLng ? `
    <div class="no-location-panel">
      <i class="fa-solid fa-location-dot"></i>
      <p>Aktifkan lokasi untuk melihat posyandu terdekat dan jarak dari Anda</p>
    </div>
  ` : '';

  list.innerHTML = noLocPanel + data.map((p, idx) => {
    const isNearest = state.nearestPosyandu && p.id === state.nearestPosyandu.id;
    const dist = p._distance;
    const distText = dist !== undefined ? `${dist.toFixed(1)} km` : '— km';
    const distClass = dist !== undefined ? '' : 'unknown';

    const tags = p.layanan_ptm.slice(0, 3).map(l =>
      `<span class="item-tag">${l}</span>`
    ).join('') + (p.layanan_ptm.length > 3 ? `<span class="item-tag">+${p.layanan_ptm.length - 3}</span>` : '');

    const { buka, jadwalHariIni } = getPosyanduStatus(p);
    const statusDot = buka
      ? `<span class="status-dot status-open" title="Sedang Buka"></span>`
      : jadwalHariIni
        ? `<span class="status-dot status-soon" title="Jadwal hari ini (di luar jam)"></span>`
        : `<span class="status-dot status-closed" title="Tutup hari ini"></span>`;
    const statusLabel = buka
      ? `<span class="status-label open">Aktif</span>`
      : jadwalHariIni
        ? `<span class="status-label soon">Buka Hari Ini</span>`
        : `<span class="status-label closed">Tutup</span>`;

    return `
      <li class="posyandu-item ${isNearest ? 'nearest' : ''}" data-id="${p.id}" onclick="onPosyanduClick(${p.id})">
        ${isNearest ? '<span class="nearest-badge">Terdekat</span>' : ''}
        <div class="item-header">
          <div class="item-rank">${idx + 1}</div>
          <div class="item-name">${statusDot} ${p.nama}</div>
          <div class="item-distance ${distClass}">${distText}</div>
        </div>
        <div class="item-address">
          <i class="fa-solid fa-map-pin"></i>
          <span>${p.kelurahan}, ${p.kecamatan}</span>
        </div>
        <div class="item-footer-row">
          <div class="item-tags">${tags}</div>
          ${statusLabel}
        </div>
      </li>
    `;
  }).join('');
}

function onPosyanduClick(id) {
  // Cari di semua data (statis + dadakan)
  const allData = typeof getAllPosyanduData === 'function'
    ? getAllPosyanduData()
    : POSYANDU_DATA;
  const posyandu = allData.find(p => p.id === id);
  if (!posyandu) return;

  // Fly to marker and open popup
  state.map.flyTo([posyandu.lat, posyandu.lng], 16, { duration: 1 });
  const found = state.posyanduMarkers.find(m => m.id === id);
  if (found) {
    setTimeout(() => found.marker.openPopup(), 1100);
  }

  setActiveItem(id);

  // On mobile, close sidebar
  if (window.innerWidth <= 768) {
    toggleSidebar(true);
  }
}

// ─── Sidebar: PTM Info ────────────────────────────────────
function renderPTMInfo() {
  const grid = document.getElementById('ptm-grid');
  grid.innerHTML = Object.entries(PTM_LAYANAN).map(([name, info]) => `
    <div class="ptm-card">
      <div class="ptm-card-icon" style="background: ${info.color}22; color: ${info.color};">
        <i class="fa-solid ${info.icon}"></i>
      </div>
      <div class="ptm-card-name" style="color: ${info.color};">${name}</div>
      <div class="ptm-card-desc">${info.desc}</div>
    </div>
  `).join('');
}

// ─── Sidebar: About ───────────────────────────────────────
function renderAbout() {
  const el = document.getElementById('about-content');
  el.innerHTML = `
    <div class="about-hero">
      <img src="images/logo.png" alt="Logo GASKEUN" class="about-logo-img" />
    </div>

    <div class="about-section">
      <div class="about-section-title"><i class="fa-solid fa-hospital"></i> Puskesmas Induk</div>
      <div style="padding:12px; background:rgba(14,165,233,.08); border:1px solid rgba(14,165,233,.2); border-radius:var(--radius-md);">
        <div style="font-size:13px; font-weight:600; color:#38bdf8; margin-bottom:4px;">Puskesmas Banjarbaru Selatan</div>
        <div style="font-size:11px; color:var(--text-muted); line-height:1.6;">Jl. Lanan, Kel. Kemuning<br>Kec. Banjarbaru Selatan, Kota Banjarbaru</div>
      </div>
    </div>

    <div class="about-section">
      <div class="about-section-title"><i class="fa-solid fa-circle-info"></i> Tentang Aplikasi</div>
      <p style="font-size:12px; color: var(--text-secondary); line-height:1.7;">
        GASKEUN adalah inovasi digital dari dokter Puskesmas Banjarbaru Selatan untuk membantu masyarakat di wilayah <strong style="color:var(--primary-light);">Kelurahan Kemuning, Guntung Paikat, dan Loktabat Selatan</strong> menemukan posyandu terdekat yang menyediakan layanan skrining PTM.
      </p>
    </div>

    <div class="about-section">
      <div class="about-section-title"><i class="fa-solid fa-map-location-dot"></i> Wilayah Kerja</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary);">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></div>
          Kelurahan Kemuning (4 Posyandu)
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary);">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></div>
          Kelurahan Guntung Paikat (9 Posyandu)
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary);">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></div>
          Kelurahan Loktabat Selatan (6 Posyandu)
        </div>
      </div>
    </div>

    <div class="about-section">
      <div class="about-section-title"><i class="fa-solid fa-star"></i> Fitur Utama</div>
      <ul class="about-feature-list">
        <li><i class="fa-solid fa-map"></i> Peta interaktif posyandu</li>
        <li><i class="fa-solid fa-location-crosshairs"></i> Deteksi lokasi otomatis</li>
        <li><i class="fa-solid fa-route"></i> Navigasi ke posyandu terdekat</li>
        <li><i class="fa-solid fa-heart-pulse"></i> Info layanan PTM lengkap</li>
        <li><i class="fa-solid fa-magnifying-glass"></i> Pencarian & filter posyandu</li>
      </ul>
    </div>

    <div class="about-section">
      <div class="about-section-title"><i class="fa-solid fa-phone"></i> Layanan Darurat</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="tel:119" style="flex:1; min-width:100px; padding:10px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2); border-radius:var(--radius-md); text-align:center; color:#ef4444; font-weight:700; font-size:13px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i class="fa-solid fa-truck-medical"></i> 119 Emergency
        </a>
        <a href="tel:112" style="flex:1; min-width:100px; padding:10px; background:rgba(6,182,212,.1); border:1px solid rgba(6,182,212,.2); border-radius:var(--radius-md); text-align:center; color:var(--accent); font-weight:700; font-size:13px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
          <i class="fa-solid fa-shield"></i> 112 Darurat
        </a>
      </div>
    </div>
  `;
}

// ─── Search & Filter ─────────────────────────────────────
function onSearch(query) {
  state.searchQuery = query.toLowerCase();
  applyFilter();
}

function onFilterChip(layanan) {
  state.activeFilter = layanan;

  // Update chip UI
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === layanan);
  });

  applyFilter();
}

function applyFilter() {
  state.filteredData = POSYANDU_DATA.filter(p => {
    const matchSearch = !state.searchQuery ||
      p.nama.toLowerCase().includes(state.searchQuery) ||
      p.alamat.toLowerCase().includes(state.searchQuery) ||
      p.kelurahan.toLowerCase().includes(state.searchQuery) ||
      p.kecamatan.toLowerCase().includes(state.searchQuery);

    const matchFilter = state.activeFilter === 'Semua' ||
      p.layanan_ptm.some(l => l.toLowerCase().includes(state.activeFilter.toLowerCase()));

    return matchSearch && matchFilter;
  });

  renderPosyanduList();

  // Update markers visibility (hanya statis, dadakan selalu tampil)
  state.posyanduMarkers.forEach(({ id, marker, data }) => {
    // Dadakan marker selalu visible
    if (data && data.status === 'dadakan') return;
    const visible = state.filteredData.some(p => p.id === id);
    if (visible) {
      if (!state.map.hasLayer(marker)) marker.addTo(state.map);
    } else {
      if (state.map.hasLayer(marker)) state.map.removeLayer(marker);
    }
  });
}

// ─── Tab Switching ────────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.sidebar-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.panel === tab);
  });
}

// ─── Sidebar Toggle ───────────────────────────────────────
function toggleSidebar(forceClose = false) {
  const sidebar = document.getElementById('sidebar');
  const floats = document.getElementById('floating-controls');

  if (window.innerWidth <= 768) {
    // Mobile: bottom sheet slide up/down
    if (forceClose) {
      sidebar.classList.remove('mobile-open');
      removeBackdrop();
    } else {
      const isOpen = sidebar.classList.contains('mobile-open');
      if (isOpen) {
        sidebar.classList.remove('mobile-open');
        removeBackdrop();
        // Reset bottom nav to Peta
        document.querySelectorAll('.bnav-item').forEach(b => {
          b.classList.toggle('active', b.dataset.panel === 'map');
        });
      } else {
        sidebar.classList.add('mobile-open');
        addBackdrop();
      }
    }
  } else {
    // Desktop: collapse/expand
    state.sidebarCollapsed = forceClose ? true : !state.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);

    if (state.sidebarCollapsed) {
      floats.style.right = '16px';
    } else {
      floats.style.right = `calc(var(--sidebar-width) + 16px)`;
    }
  }
}

function addBackdrop() {
  if (document.getElementById('sidebar-backdrop')) return;
  const bd = document.createElement('div');
  bd.id = 'sidebar-backdrop';
  bd.style.cssText = `
    position: fixed; inset: 0; z-index: 99;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
    animation: fade-in 0.25s ease;
  `;
  bd.addEventListener('click', () => toggleSidebar(true));
  document.body.appendChild(bd);

  // Inject keyframe if not present
  if (!document.getElementById('backdrop-style')) {
    const s = document.createElement('style');
    s.id = 'backdrop-style';
    s.textContent = '@keyframes fade-in { from { opacity:0; } to { opacity:1; } }';
    document.head.appendChild(s);
  }
}

function removeBackdrop() {
  const bd = document.getElementById('sidebar-backdrop');
  if (bd) bd.remove();
}

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Event Listeners ─────────────────────────────────────
function setupEvents() {
  // Locate button
  document.getElementById('btn-locate').addEventListener('click', locateUser);

  // Reset route button
  document.getElementById('btn-reset-route').addEventListener('click', () => {
    clearRoute();
    // Reset all markers to normal
    state.posyanduMarkers.forEach(({ id, marker }) => {
      marker.setIcon(createPosyanduIcon(state.nearestPosyandu && id === state.nearestPosyandu.id));
    });
    showToast('Rute dihapus.', 'info');
  });

  // Nearest bar navigate button
  document.getElementById('nearest-bar-nav').addEventListener('click', () => {
    if (state.nearestPosyandu) {
      navigateTo(state.nearestPosyandu.id);
    }
  });

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    onSearch(e.target.value);
  });

  // Filter chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      onFilterChip(chip.dataset.filter);
    });
  });

  // Sidebar tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Mobile sidebar toggle (button in header)
  const btnMobileToggle = document.getElementById('btn-mobile-sidebar');
  if (btnMobileToggle) {
    btnMobileToggle.addEventListener('click', () => toggleSidebar());
  }

  // Desktop sidebar toggle
  const btnToggle = document.getElementById('btn-toggle-sidebar');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => toggleSidebar());
  }

  // Keyboard shortcut: L = locate
  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') locateUser();
    if (e.key === 'Escape') clearRoute();
  });
}

// Expose globally for onclick handlers in HTML
window.navigateTo = navigateTo;
window.callPosyandu = callPosyandu;
window.onPosyanduClick = onPosyanduClick;
window.allowLocation = allowLocation;
window.denyLocation = denyLocation;
window.clearRoute = clearRoute;
window.bottomNavClick = bottomNavClick;

// ─── Bottom Navigation ────────────────────────────────────
function bottomNavClick(panel) {
  // Update active state on bottom nav buttons
  document.querySelectorAll('.bnav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === panel);
  });

  if (panel === 'map') {
    // Close sidebar, show map
    toggleSidebar(true);
  } else {
    // Open sidebar and switch to the correct tab
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.contains('mobile-open');

    switchTab(panel);

    if (!isOpen) {
      toggleSidebar(false);
    }
  }
}

// ─── Geo Permission Prompt ────────────────────────────────
function showGeoPrompt() {
  const prompt = document.getElementById('geo-prompt');
  if (prompt) prompt.classList.add('open');
}

function allowLocation() {
  const prompt = document.getElementById('geo-prompt');
  if (prompt) prompt.classList.remove('open');
  locateUser();
}

function denyLocation() {
  const prompt = document.getElementById('geo-prompt');
  if (prompt) prompt.classList.remove('open');
  showToast('💡 Klik "Temukan Posyandu Terdekat" kapan saja untuk aktifkan lokasi.', 'info');
}

// ─── Route Info Card ─────────────────────────────────────
function showRouteInfoCard(posyandu, distKm, driveTime, walkTime) {
  const card = document.getElementById('route-info-card');
  if (!card) return;
  document.getElementById('route-dest-name').textContent = posyandu.nama;
  document.getElementById('route-dist-val').textContent = `${distKm} km`;
  document.getElementById('route-drive-val').textContent = driveTime;
  document.getElementById('route-walk-val').textContent = walkTime;
  card.style.display = 'flex';
  // Trigger animation on next frame
  requestAnimationFrame(() => card.classList.add('visible'));
}

// ─── Skeleton Loading ────────────────────────────────────
function showSkeletonList() {
  const list = document.getElementById('posyandu-list');
  list.innerHTML = Array(5).fill(0).map(() => `
    <li class="posyandu-item skel-item">
      <div class="item-header">
        <div class="skel skel-rank"></div>
        <div style="flex:1"><div class="skel skel-name"></div></div>
        <div class="skel skel-chip"></div>
      </div>
      <div class="skel skel-addr"></div>
      <div class="skel skel-tags"></div>
    </li>
  `).join('');
}
