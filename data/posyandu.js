// Data Posyandu - Wilayah Kerja Puskesmas Banjarbaru Selatan
// Kota Banjarbaru, Kalimantan Selatan
// Sumber: Jadwal Posyandu GASKEUN Tahun 2026
// Koordinat diekstrak dari Google Maps links resmi

const POSYANDU_DATA = [

  // ── KELURAHAN GUNTUNG PAIKAT ──
  {
    id: 1,
    nama: "Posyandu Kemala",
    alamat: "POLRES Banjarbaru, Jl. Srikaya RT.03 RW.02",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.444186,
    lng: 114.8333121,
    hari: "Rabu, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Stroke", "Jantung"],
    maps_url: "https://maps.app.goo.gl/8EYKkq2RPGCfxZbg8",
    telp: "",
    status: "aktif"
  },
  {
    id: 2,
    nama: "Posyandu Sakura",
    alamat: "Komp. Banjarbaru Asri RT.04 RW.04",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.455609,
    lng: 114.8359081,
    hari: "Sabtu, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Kanker"],
    maps_url: "https://maps.app.goo.gl/pQdyG4T7W4otFwhi8",
    telp: "",
    status: "aktif"
  },
  {
    id: 3,
    nama: "Posyandu Idaman",
    alamat: "Jl. Rambai No.1 RT.01 RW.03",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.445559,
    lng: 114.8306481,
    hari: "Kamis, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "PPOK"],
    maps_url: "https://maps.app.goo.gl/QfGh3AaXK8yuza6j7",
    telp: "",
    status: "aktif"
  },
  {
    id: 4,
    nama: "Posyandu Matahari",
    alamat: "Jl. Bekantan 4, Komp. Banjarbaru Asri",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.452469,
    lng: 114.8345591,
    hari: "Sabtu, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Jantung"],
    maps_url: "https://maps.app.goo.gl/WWhUnCKmwQj3VytWA",
    telp: "",
    status: "aktif"
  },
  {
    id: 5,
    nama: "Posyandu Mawar",
    alamat: "Jl. Rambai Tengah II RT.04 RW.03",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.449197,
    lng: 114.8322131,
    hari: "Sabtu, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Stroke"],
    maps_url: "https://maps.app.goo.gl/NnC7iNhLzTmsceYd9",
    telp: "",
    status: "aktif"
  },
  {
    id: 6,
    nama: "Posyandu Halim",
    alamat: "Jl. Trikora, Komp. Halim Permai RT.05 RW.05",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.46245,
    lng: 114.8303421,
    hari: "Senin, Minggu Ke-1",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Obesitas"],
    maps_url: "https://maps.app.goo.gl/ac1FEbfKuz9xSqKx9",
    telp: "",
    status: "aktif"
  },
  {
    id: 7,
    nama: "Posyandu Kemuning",
    alamat: "TK ABA, Jl. Kemuning Ujung RT.01 RW.02",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.446323,
    lng: 114.8280461,
    hari: "Selasa, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Kolesterol"],
    maps_url: "https://maps.app.goo.gl/qmzL4iU8cqd5kp4p7",
    telp: "",
    status: "aktif"
  },
  {
    id: 8,
    nama: "Posyandu Nirmala",
    alamat: "Jl. Pandawa RT.03 RW.05",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.454177,
    lng: 114.8326781,
    hari: "Senin, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "PPOK"],
    maps_url: "https://maps.app.goo.gl/yVMfRmRDokXVz3Hq8",
    telp: "",
    status: "aktif"
  },
  {
    id: 9,
    nama: "Posyandu Mekarsari",
    alamat: "Jl. Bima RT.06 RW.05",
    kelurahan: "Guntung Paikat",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.45088,
    lng: 114.8308781,
    hari: "Sabtu, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Jantung"],
    maps_url: "https://maps.app.goo.gl/kSQbA2d2E55ZLFuR6",
    telp: "",
    status: "aktif"
  },

  // ── KELURAHAN LOKTABAT SELATAN ──
  {
    id: 10,
    nama: "Posyandu Aster",
    alamat: "Jl. R.O. Ulin, Gg. Saptawarga",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.44907,
    lng: 114.8175511,
    hari: "Selasa, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Kanker Serviks"],
    maps_url: "https://maps.app.goo.gl/z88gPJCBYSyNCs2PA",
    telp: "",
    status: "aktif"
  },
  {
    id: 11,
    nama: "Posyandu Melati Berlina",
    alamat: "Komp. Berlina Jaya RT.02 RW.05",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.447343,
    lng: 114.8078831,
    hari: "Senin, Minggu Ke-1",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Stroke"],
    maps_url: "https://maps.app.goo.gl/Aw384Sewsi9LGNPv5",
    telp: "",
    status: "aktif"
  },
  {
    id: 12,
    nama: "Posyandu Kenanga",
    alamat: "Jl. Gotong Royong RT.02 RW.04",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.455661,
    lng: 114.8148641,
    hari: "Rabu, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "PPOK"],
    maps_url: "https://maps.app.goo.gl/2Qjkr18Pg8GfBYvP6",
    telp: "",
    status: "aktif"
  },
  {
    id: 13,
    nama: "Posyandu Flamboyan",
    alamat: "Jl. Sidodadi 1, Gang Langgar RT.02 RW.06",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.453199,
    lng: 114.8096151,
    hari: "Selasa, Minggu Ke-1",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Jantung"],
    maps_url: "https://maps.app.goo.gl/HvvV1xJ3oR7Z8mCXA",
    telp: "",
    status: "aktif"
  },
  {
    id: 14,
    nama: "Posyandu Seruni",
    alamat: "Jl. Pendidikan Masyarakat RT.01/01 (Rumah Ketua RT)",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.444286,
    lng: 114.8220611,
    hari: "Kamis, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Kanker Payudara", "Kolesterol"],
    maps_url: "https://maps.app.goo.gl/Q5tvMLTxdLYmfbN2A",
    telp: "",
    status: "aktif"
  },
  {
    id: 15,
    nama: "Posyandu Kembang Sepatu",
    alamat: "Jl. Jakarta RT.01 RW.03, Komp. Klause Reppe RO Ulin",
    kelurahan: "Loktabat Selatan",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.44928,
    lng: 114.8137071,
    hari: "Rabu, Minggu Ke-1",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Obesitas"],
    maps_url: "https://maps.app.goo.gl/MQ6KTbzaLvbjtod96",
    telp: "",
    status: "aktif"
  },

  // ── KELURAHAN KEMUNING ──
  {
    id: 16,
    nama: "Posyandu Dahlia",
    alamat: "Jl. Merbabu RT.23 RW.06",
    kelurahan: "Kemuning",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.453441,
    lng: 114.8235911,
    hari: "Senin, Minggu Ke-3",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Stroke"],
    maps_url: "https://maps.app.goo.gl/VFQ967VvVgxYtDBZ9",
    telp: "",
    status: "aktif"
  },
  {
    id: 17,
    nama: "Posyandu Khadijah",
    alamat: "Gg. Galam RT.03 RW.01",
    kelurahan: "Kemuning",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.44578,
    lng: 114.8253231,
    hari: "Rabu, Minggu Ke-1",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Jantung"],
    maps_url: "https://maps.app.goo.gl/SRou4pv6vPZGRtXC6",
    telp: "",
    status: "aktif"
  },
  {
    id: 18,
    nama: "Posyandu Violet",
    alamat: "Kp. Qiramah Alam RT.23 RW.05",
    kelurahan: "Kemuning",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.458413,
    lng: 114.8282131,
    hari: "Selasa, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "PPOK"],
    maps_url: "https://maps.app.goo.gl/tgqNmmpredbTvFEM8",
    telp: "",
    status: "aktif"
  },
  {
    id: 19,
    nama: "Posyandu Nusa Indah",
    alamat: "Gg. Amanah RT.17 RW.04",
    kelurahan: "Kemuning",
    kecamatan: "Banjarbaru Selatan",
    lat: -3.448565,
    lng: 114.8248581,
    hari: "Kamis, Minggu Ke-2",
    jam_buka: "10.30 - 12.00",
    layanan_ptm: ["Hipertensi", "Diabetes Melitus", "Kanker Serviks"],
    maps_url: "https://maps.app.goo.gl/RESf27HQBKED4Y6t6",
    telp: "",
    status: "aktif"
  }

];

// Puskesmas induk
const PUSKESMAS = {
  nama: "Puskesmas Banjarbaru Selatan",
  alamat: "Jl. Lanan RT.01/RW.01, Kelurahan Kemuning",
  kecamatan: "Banjarbaru Selatan",
  kota: "Kota Banjarbaru",
  lat: -3.4438472,
  lng: 114.8298026,
  hari: "Selasa dan Kamis",
  jam_buka: "08.30 - 11.00",
  maps_url: "https://maps.app.goo.gl/sMW3pumVANDzBxHv8",
  telp: ""
};

// Links monitoring & edukasi dari Excel
const LINKS_TAMBAHAN = {
  monitoring_hipertensi: "https://forms.gle/841w4F3HAtMZgRhL6",
  monitoring_dm: "https://forms.gle/vF7D3LaPnLQ88yd68",
  survey_kepuasan: "https://forms.gle/LWaSLydrGQ4mhBJE9",
  video_edukasi: [
    "https://youtu.be/JcwdEzMeoOw",
    "https://youtu.be/5VpizHVkj8M",
    "https://youtu.be/DjHPPzOPJ4k",
    "https://youtu.be/W4iSxmc1ews",
    "https://youtu.be/OKxLhaA9RgY",
    "https://youtu.be/2xdVIW9VAL8"
  ]
};

// Kategori layanan PTM dengan warna dan ikon
const PTM_LAYANAN = {
  "Hipertensi": { icon: "fa-heart-pulse", color: "#ef4444", desc: "Tekanan darah tinggi ≥ 140/90 mmHg" },
  "Diabetes Melitus": { icon: "fa-droplet", color: "#f97316", desc: "Kadar gula darah melebihi normal" },
  "Stroke": { icon: "fa-brain", color: "#8b5cf6", desc: "Gangguan aliran darah ke otak" },
  "Jantung": { icon: "fa-heart", color: "#ec4899", desc: "Penyakit pembuluh darah jantung" },
  "Kanker": { icon: "fa-ribbon", color: "#06b6d4", desc: "Deteksi dini kanker serviks & payudara" },
  "Kanker Serviks": { icon: "fa-ribbon", color: "#06b6d4", desc: "Deteksi dini kanker serviks" },
  "Kanker Payudara": { icon: "fa-ribbon", color: "#ec4899", desc: "Deteksi dini kanker payudara" },
  "PPOK": { icon: "fa-lungs", color: "#84cc16", desc: "Penyakit Paru Obstruktif Kronik" },
  "Obesitas": { icon: "fa-scale-balanced", color: "#eab308", desc: "Pemantauan berat badan & IMT" },
  "Kolesterol": { icon: "fa-vial", color: "#fb923c", desc: "Kadar kolesterol dalam darah" }
};
