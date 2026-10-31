# Nutri-Nutrian Web Project

Aplikasi frontend standalone untuk asuhan gizi terstandar (PAGT/NCP): pengkajian AD/BD/PD, kalkulator gizi klinis,
z-score anak, diagnosis PES, analisis asupan, database TKPI, serta ekspor laporan PDF/Excel.
Tanpa backend dan login; riwayat disimpan di `localStorage` browser.

## Menjalankan

Prasyarat: Node.js 18.18+ (disarankan 20 LTS).

```bash
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # mode produksi
```

## Struktur folder

```
nutri-nutrian/
├── data-source/                    ← TARUH FILE EXCEL DI SINI
│   ├── Database_TKPI.xlsx
│   └── Database_NCPT_AD_BD_PD.xlsx
├── scripts/excel_to_json.py        ← konversi Excel → src/data/*.json
├── public/
└── src/
    ├── components/
    │   ├── Layout.js, Navbar.js, Sidebar.js, PatientModal.js
    │   ├── assessment/AssessmentWorksheet.js
    │   ├── calculators/  Anthropometry, Bmr, Ckd, Diabetes, Enteral, Maternal, ZScore, PesGenerator
    │   ├── intake/IntakeAnalyzer.js
    │   ├── search/       TkpiSearch, AssessmentSearch, NcpDomainSearch, FoodPicker
    │   └── ui/           Field, ResultSlip, AssessmentTable, SaveBar, Modal, PageHeader, usePatientForm
    ├── context/AppContext.js
    ├── data/             tkpi.json, tkpiMeta.json, ncptAssessment.json, ncpDomains.json, akg2019.json, growth/
    ├── pages/            (lihat daftar halaman)
    ├── styles/globals.css
    └── utils/            formulas, growth, tkpi, report, storage, assessmentPresets
```

Semua import memakai alias `@/` yang mengarah ke `src/` (lihat `jsconfig.json`), contoh:
`import { fmt } from "@/utils/formulas";`

## Memperbarui database Excel

1. Ganti file di `data-source/` (nama file tetap sama).
2. Jalankan:
   ```bash
   pip install pandas openpyxl
   npm run data:import          # = python scripts/excel_to_json.py
   ```
3. Script menulis ulang `src/data/tkpi.json` dan `src/data/ncptAssessment.json`, lalu jalankan ulang `npm run dev`.

Script juga membersihkan sisa ekstraksi PDF: label "OLAHAN/PRODUK/KOMPOSIT" pada nama pangan,
sub-kelompok ditentukan dari kode (huruf ke-2 R = tunggal/mentah, P = olahan), dan judul sub-bagian
yang ikut terbaca pada istilah PD (mis. "Normal stool Edema (6)" → "Normal stool").

## Halaman

| Menu                                          | Halaman                  | Isi                                                              |
| --------------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Ringkasan                                     | `/`                      | Alur PAGT dan akses cepat                                        |
| Bahan pangan (TKPI)                           | `/search/tkpi`           | 1.145 pangan + tambah data sendiri, hitung per porsi, ekspor     |
| Antropometri (AD)                             | `/search/antropometri`   | 88 istilah NCPT                                                  |
| Biokimia (BD)                                 | `/search/biokimia`       | 246 istilah NCPT                                                 |
| Fisik/klinis (PD)                             | `/search/fisik-klinis`   | 368 istilah NCPT                                                 |
| Diagnosis gizi                                | `/search/ncp`            | Domain NI/NC/NB (data contoh)                                    |
| Pengkajian gizi                               | `/asesmen`               | Tabel AD/BD/PD: Domain, Data, Nilai normal, Satuan, Interpretasi |
| Kalkulator multi-tab                          | `/calculator`            | Status gizi dewasa, z-score, BMR/TEE, eGFR                       |
| Z-score anak                                  | `/calculator/pediatrics` | Permenkes 2/2020: status gizi, tren pertumbuhan, tindak lanjut   |
| BMR & TEE, Ginjal, Diabetes, EN/PN, Ibu hamil | `/calculator/*`          | Kalkulator klinis                                                |
| Kalimat PES                                   | `/pes-generator`         | Problem–Etiology–Signs/Symptoms                                  |
| Analisis asupan                               | `/intake`                | Recall 24 jam & SQ-FFQ memakai TKPI                              |
| Riwayat & laporan                             | `/history`               | Catatan tersimpan, unduh PDF/Excel                               |

## Z-score anak (Permenkes RI No. 2 Tahun 2020)

Data rujukan diambil langsung dari Lampiran Permenkes 2/2020 (`src/data/growth/permenkes2020.json`):
Tabel 1–14 (0–60 bulan: BB/U, PB/U, TB/U, BB/PB, BB/TB, IMT/U) dan Tabel 15–16 (IMT/U 5–18 tahun),
serta Tabel 17–23 kenaikan BB dan pertambahan PB 0–24 bulan (`src/data/growth/increment.json`).

Ketentuan yang diterapkan:

- Umur dihitung dalam bulan penuh (2 bulan 29 hari = 2 bulan).
- PB untuk umur 0–24 bulan (berdiri → +0,7 cm); TB untuk umur > 24 bulan (terlentang → −0,7 cm).
- Indeks 0–60 bulan: BB/U, PB/U atau TB/U, BB/PB atau BB/TB, IMT/U. Umur 5–18 tahun: IMT/U saja.
- Kategori & ambang batas sesuai Bab II huruf B; tindak lanjut sesuai Bab IV.

Metode Z-score (bisa dipilih di kalkulator):

| Metode                    | Cara hitung                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabel Permenkes (default) | Letak nilai di antara dua garis SD tabel: Z = Z garis bawah + (Nilai − garis bawah) ÷ (garis atas − garis bawah). Di antara −1 SD dan +1 SD sama dengan rumus median ± 1 SD. Kategori selalu sesuai letak nilai pada tabel. |
| Rumus median ± 1 SD       | Z = (Nilai − Median) ÷ (Median − (−1 SD)) bila di bawah median, ÷ ((+1 SD) − Median) bila di atas (cara buku ajar).                                                                                                         |
| LMS WHO                   | Metode WHO Anthro, 0–60 bulan.                                                                                                                                                                                              |

Contoh laki-laki 13 bulan, BB 6,4 kg, PB 76 cm: BB/U −3,87 SD (tabel Permenkes) atau −3,18 SD (rumus),
keduanya "berat badan sangat kurang" karena 6,4 kg < −3 SD (7,1 kg).

## Bahan pangan tambahan pengguna

Di halaman **Bahan Pangan (TKPI)**, tombol **Tambah bahan pangan** membuka form: kode (otomatis USR001, dst.),
nama, kategori (pilih atau buat baru), jenis, sumber, BDD, dan 21 zat gizi per 100 g BDD (energi wajib).
Data pengguna disimpan di `localStorage` (key `nutri-nutrian:tkpi-custom`), bisa diubah/dihapus, langsung dipakai
di Analisis Asupan, ikut diekspor ke Excel, dan bisa dicadangkan/dipulihkan lewat file JSON.

## Ekspor laporan

Setiap kalkulator, lembar pengkajian, kalimat PES, dan analisis asupan punya tombol **Unduh PDF** dan **Unduh Excel**.
Laporan berisi hasil, tabel pengkajian (kode NCPT), data input, dan langkah perhitungan. Riwayat bisa diekspor
sekaligus ke satu file Excel. Library (`jspdf`, `jspdf-autotable`, `write-excel-file`) dimuat hanya saat tombol ditekan.

## Rumus lain

| Modul        | Acuan                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- |
| IMT          | WHO, Asia-Pasifik, Kemenkes RI                                                               |
| BBI          | Broca modifikasi RI, Hamwi; Adjusted BW = BBI + 0,25 × (BB − BBI)                            |
| BMR          | Mifflin-St Jeor, Harris-Benedict (1984), Schofield, Katch-McArdle; ESPEN untuk pasien kritis |
| Perubahan BB | (BB biasa − BB sekarang) ÷ BB biasa × 100%, batas bermakna per periode                       |
| Ginjal       | eGFR CKD-EPI 2021, protein KDOQI 2020                                                        |
| Diabetes     | PERKENI: 25/30 kkal/kg BBI + koreksi                                                         |
| EN/PN        | NPC:N, GIR, estimasi osmolaritas                                                             |
| Ibu hamil    | Tambahan energi IOM atau AKG 2019, kenaikan BB IOM 2009                                      |
| Asupan       | Tingkat kecukupan Depkes 1996 terhadap AKG 2019                                              |

## Privasi & penafian

- Profil pasien hanya meminta kode/inisial; tanggal lahir anak tidak disimpan.
- Nilai rujukan lab pada baris cepat adalah rujukan umum dewasa; sesuaikan dengan laboratorium setempat dan umur pasien.
- Domain diagnosis NCP (`ncpDomains.json`) masih data contoh.
- Hasil kalkulasi adalah alat bantu; validasi oleh dietisien/ahli gizi sebelum dipakai untuk keputusan klinis.
