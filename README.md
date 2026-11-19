# MedLocate (Pencarian & Reservasi Stok Obat Darurat) — Interactive Prototype

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Theme: Medical Green](https://img.shields.io/badge/Theme-Medical%20Green-059669.svg)](#2-tech-stack--ui-guidelines)
[![PRD Compliance](https://img.shields.io/badge/PRD%20Compliance-100%25-green.svg)](#1-product-overview--prd-alignment)

> **MedLocate** adalah prototipe aplikasi agregator stok dan reservasi obat darurat real-time yang dirancang khusus untuk memangkas waktu pencarian obat langka/kritis (ICU, IGD, penyakit kronis cito) dari hitungan jam menjadi **di bawah 15 menit**, dengan jaminan *zero wasted trips* melalui fitur **Smart Stock-Lock (45 Menit)** dan pendekatan **Zero-POS** bagi mitra apotek.

---

## 1. Product Overview & PRD Alignment

| Komponen PRD | Spesifikasi Produk | Implementasi Prototipe |
| :--- | :--- | :--- |
| **Problem Statement** | Keluarga pasien darurat kesulitan mencari obat resep khusus & berkeliling dari apotek ke apotek di tengah situasi kritis. | Pencarian geolocated terpusat dengan estimasi waktu tempuh & filter radius (3km, 5km, 10km). |
| **Target Pengguna** | 1. Keluarga pasien/pasien IGD (Primary)<br>2. Apoteker penanggung jawab apotek (Secondary) | UI Pasien Responsif + Panel Simulator Portal Apoteker (Zero-POS). |
| **Core View 1** | AI Prescription OCR & Manual Search | Ekstraksi otomatis nama obat, dosis, kode KFA Kemenkes, validasi resep dokter, dan rekomendasi substitusi generik. |
| **Core View 2** | Live Broadcast & Pharmacy Results | Radar Doppler interaktif, broadcast serentak ke mitra sekitar, indikator stok terverifikasi, dan harga HET resmi. |
| **Core View 3** | Smart Stock-Lock (Hold 45 Mins) | Hitung mundur dinamis 45:00, Kode Booking, QR Code kasir, Token Kemenkes, rute Google Maps, & tombol WhatsApp. |
| **Zero-POS Mode** | 1-Click Response ("Ada" / "Habis") | Floating drawer simulator yang memungkinkan presenter bertindak sebagai apoteker dan mengubah status stok secara real-time. |

---

## 2. Tech Stack & UI Guidelines

* **Framework & Styling:** Tailwind CSS (utility-first flexbox & grid responsive layout).
* **Color Palette (Medical Green Theme):**
  * `Primary`: `emerald-600` (`#059669`) / `green-600` (`#16A34A`) — Tombol aksi utama, brand accents.
  * `Primary Hover`: `emerald-700` (`#047857`)
  * `Soft Accent / Badges`: `emerald-50` (`#ECFDF5`) dengan teks `emerald-800` — Tag stok tersedia, badge verifikasi KFA.
  * `Background`: `slate-50` (`#F8FAFC`) dengan kartu `white` (`#FFFFFF`) & border `slate-200`.
  * `Status Badges`:
    * 🟢 **Tersedia (Verified):** `emerald-600` / `emerald-50`
    * 🔵 **Opsi Generik Kemenkes:** `teal-600` / `teal-50`
    * 🟡 **Cek Fisik Rak / Pending:** `amber-500` / `amber-50`
    * 🔴 **Stok Habis:** `rose-600` / `rose-50`
* **Audio Synthesizer (Zero-Asset Web Audio API):**
  * Efek suara terintegrasi: Sonar Radar Ping, Laser Scan OCR, Suara Sukses Kunci Stok, dan Alert WhatsApp Apoteker.
* **Stand-Alone & Zero Dependency:**
  * Dapat dibuka langsung via double-click pada `index.html` (protokol `file://`) maupun di-host via HTTP server.

---

## 3. Struktur Berkas Proyek

```text
ExplorAItion2/
├── index.html          # Halaman antarmuka utama (HTML5, Tailwind CDN, View Renderer)
├── app.js              # Controller utama, State Management, Web Audio Synthesizer, Timer
├── mockData.js         # Database lokal katalog obat darurat (KFA), apotek sekitar, & sampel resep
├── styles.css          # Animasi khusus: Laser Scan, Radar Wave, Circular Timer, Glassmorphism
├── README.md           # Dokumentasi teknis & panduan demo prototipe
└── package.json        # Konfigurasi npm script (opsional)
```

---

## 4. Cara Menjalankan Prototipe

### Opsi A: Buka Langsung di Browser (Paling Cepat)
Cukup buka berkas [index.html](file:///c:/Users/qiand/Documents/Programming/ExplorAItion2/index.html) menggunakan peramban web modern (Google Chrome, Microsoft Edge, Firefox, atau Safari).

### Opsi B: Menggunakan Local HTTP Server
Jika ingin menjalankan melalui server lokal:

```bash
# Menggunakan Node.js npx serve
npx serve .

# Atau menggunakan Python 3
python -m http.server 3000
```
Lalu buka alamat `http://localhost:3000` pada peramban Anda.

---

## 5. Panduan Skenario Demo untuk Presentasi / Juri

### Skenario 1: Pencarian Obat Kritis & Pindai Resep AI (View 1)
1. Buka aplikasi. Perhatikan deteksi lokasi GPS otomatis di **IGD RSUD Dr. Soetomo Surabaya**.
2. Klik salah satu tag cepat obat darurat atau tombol **Contoh Resep**, misalnya:
   * **Norepinephrine 4mg / 4ml (Vascon)** (Kasus Syok Septik ICU & Hipotensi Akut) ⭐
   * **Epinephrine (Adrenalin) 1 mg/ml** (Kasus Syok Anafilaksis UGD & Code Blue) ⭐
   * **Human Albumin 20% 100ml** (Kasus ICU / Hipoalbuminemia berat)
   * **Insulin Lantus Solostar** (Kasus Cito Diabetes Ketoasidosis)
   * **Meropenem 1g IV** (Antibiotik Sepsis)
   * **Serum Anti-Bisa Ular (SABU)** (Toksikologi Darurat)
3. Klik pada gambar resep atau tombol **"Perbesar Resep"**:
   * Menampilkan modal pratinjau lembar resep dokter autentik beresolusi tinggi lengkap dengan KOP Rumah Sakit, SIP Dokter, stempel CITO / Code Blue, dan diagnosa klinis.
4. Klik tombol **"Pindai Ulang"** atau **"Scan Kamera"**:
   * Perhatikan animasi sinar laser hijau menyapu lembar resep dokter.
   * AI secara instan mengekstrak: Nama Obat, Kode KFA Kemenkes, Aturan Dosis, dan Status Legalitas Resep Obat Keras (Daftar G).
   * Perhatikan saran **Substitusi Generik** resmi yang dapat menghemat biaya hingga 35%.
5. Pilih radius: **3 KM**, **5 KM**, atau **10 KM**.

### Skenario 2: Siaran Darurat & Radar Apotek Terdekat (View 2)
1. Klik tombol hijau besar: **"KIRIM SINYAL DARURAT & CARI STOK (BROADCAST)"**.
2. Animasi radar Doppler akan menyala, mensimulasikan transmisi sinyal darurat ke apotek-apotek mitra terdekat secara serentak.
3. Layar berpindah ke hasil pencarian:
   * Menampilkan apotek terdekat (misal: *Apotek Sehat Sentosa* - 1.2 km, *Instalasi Farmasi RS Siloam* - 1.8 km, *Apotek Kimia Farma* - 2.1 km).
   * Switch ke **"Peta Radar"** untuk melihat visualisasi radar dengan titik koordinat pengguna vs apotek-apotek sekitar.
   * Nyalakan centang *"Tampilkan hanya apotek yang stoknya sudah terkonfirmasi ada"*.

### Skenario 3: Kunci Stok 45 Menit (Hold) & Tiket Reservasi (View 3)
1. Pada kartu **Apotek Sehat Sentosa 24 Jam**, klik tombol **"KUNCI STOK (45 MENIT)"**.
2. Tiket digital resmi akan diterbitkan:
   * **Timer Hitung Mundur** (`44:59` berjalan detik demi detik dengan lingkaran progres SVG).
   * **Kode Booking Unik** (misal: `ML-8842-RES`) dilengkapi tombol salin 1-klik.
   * **QR Code** kasir untuk proses verifikasi tanpa kontak di meja apotek.
   * **Token Validasi Resep Kemenkes** & info Apoteker Penanggung Jawab (APJ) beserta nomor SIPA resmi.
   * Tombol interaktif **"Buka Panduan Rute (Google Maps)"** dan **"Chat WhatsApp Apotek"**.
   * Tombol **"Saya Sudah Tiba di Lokasi"** untuk simulasi kedatangan pasien.

### Skenario 4: Simulasi Respon Apoteker Dual-Persona (Zero-POS Mode)
1. Di pojok kanan atas navbar, klik tombol berkedip: **"⚡ Portal Apoteker (Zero-POS)"**.
2. Drawer simulator akan terbuka di sisi kanan layar:
   * Menampilkan alert yang diterima apoteker (foto resep pasien, jarak pasien 1.2 km).
   * Klik tombol **"1. ADA (Stok)"**, **"2. OPSI GENERIK"**, atau **"3. HABIS"**.
   * Amati bahwa status apotek di layar pasien langsung ter-update secara real-time disertai notifikasi toast dan efek suara.
   * Fitur ini membuktikan bahwa apotek tidak perlu mengganti sistem kasir (Zero-POS integration) untuk berpartisipasi menyelamatkan nyawa pasien darurat.

---

## 6. Kepatuhan Regulasi & Kebijakan Kesehatan

* **Regulasi Obat Keras (Daftar G):** Mewajibkan verifikasi foto resep dokter asli yang sah sebelum stok dapat dikunci.
* **Standar Kamus Farmasi (KFA Kemenkes):** Pencocokan nama paten ke zat aktif generik dan standar kodefikasi Kementerian Kesehatan Republik Indonesia.
* **Zero Upfront Fee:** Tidak ada transaksi pembayaran obat di muka secara online; pelunasan dilakukan langsung di apotek fisik sesuai Harga Eceran Tertinggi (HET) yang transparan.
