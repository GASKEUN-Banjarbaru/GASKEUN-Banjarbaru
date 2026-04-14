/**
 * GASKEUN - Konfigurasi
 * 
 * PENTING: Isi SCRIPT_URL dengan URL dari Google Apps Script Anda!
 * Ikuti panduan di: panduan-google-sheets.md
 */

const GASKEUN_CONFIG = {
  // ── Paste URL Google Apps Script Anda di sini ──
  // Contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwLA793rv22gcOK81CelrdQJ7LJBQYLC3A0IajB88G_YPnVl33r2wwv8batmOUxpfrH/exec',   // <-- GANTI INI

  // ── Pengaturan Sinkronisasi Data Skrining ──
  SYNC_ENABLED: true,    // set false untuk nonaktifkan sync ke Sheets
  SYNC_RETRY: true,      // coba ulang jika gagal
  SHOW_SYNC_STATUS: true, // tampilkan status sync di toast

  // ── Pengaturan Skrining Mobile (Shared Cloud) ──
  MOBILE_SYNC_ENABLED: true,      // aktifkan sinkronisasi tempat skrining mobile
  MOBILE_POLLING_INTERVAL: 30000  // cek data baru setiap 30 detik (ms)
};
