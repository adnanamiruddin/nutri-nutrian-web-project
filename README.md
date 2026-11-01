# Nutri-Nutrian Web Project

Aplikasi frontend untuk asuhan gizi terstandar (PAGT/NCP): pengkajian AD/BD/PD, kalkulator gizi klinis,
z-score anak, diagnosis PES, analisis asupan, database TKPI, serta ekspor laporan PDF/Excel.
Dibangun dengan **Next.js 15 (Pages Router) + TypeScript (strict)**, Tailwind CSS 4, dan DaisyUI 5.
Riwayat, profil pasien, dan data pangan pengguna disimpan di `localStorage` browser.

## Menjalankan

Prasyarat: Node.js 18.18+ (disarankan 20 LTS).

```bash
cp .env.example .env.local   # lalu ganti SECRET_CODE
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # mode produksi
npm run type-check           # tsc --noEmit
npm run lint                 # eslint
```

### Environment

| Variabel      | Keterangan                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `SECRET_CODE` | Kode rahasia untuk aksi ubah data TKPI. Dicek di server (`/api/auth/verify-code`), tidak masuk ke bundle. |

Karena verifikasi memakai API route, aplikasi harus dijalankan dengan server Next.js (`next start` / hosting
yang mendukung API route), bukan `next export` statis.

## Struktur folder

```
src/
├── api/
│   ├── clients/http-client.ts        ← pembungkus fetch JSON
│   └── modules/auth.ts               ← verifySecretCode()
├── components/
│   ├── MainLayout.tsx                ← kerangka: navbar, sidebar (drawer), judul statis
│   ├── layouts/
│   │   ├── generals/
│   │   │   ├── functions/            ← helper layout (closeDrawer)
│   │   │   └── general-layout/       ← Navbar, Sidebar, BrandMark
│   │   └── page-components/
│   │       ├── home/                 ← HomeView (ringkasan)
│   │       └── dashboard/
│   │           ├── assessment/       ← AssessmentWorksheet
│   │           ├── calculators/      ← BmrTee, Anthropometry, Ckd, Diabetes, Enteral, Maternal, ZScore, CalculatorHub
│   │           ├── diagnosis/        ← PesGenerator
│   │           ├── history/          ← HistoryView
│   │           ├── intake/           ← IntakeAnalyzer
│   │           └── search/           ← TkpiSearch, FoodForm, FoodPicker, AssessmentSearch, NcpDomainSearch
│   └── utils/
│       ├── alerts/                   ← notify (SweetAlert2 toast), InputAlert
│       ├── authentications/          ← secret-guard (popup kode rahasia)
│       ├── generals/                 ← Field, ResultSlip, AssessmentTable, PageHeader, SaveBar, charts/
│       └── modals/                   ← Modal, PatientModal
├── const/                            ← app, navigation, theme (warna), input-limits (batas input)
├── context/AppContext.tsx            ← state global (riwayat, pasien, pangan pengguna)
├── data/                             ← JSON rujukan (TKPI, NCPT, AKG, growth) hasil scripts/excel_to_json.py
├── helpers/                          ← formulas, growth, bmr-tee, validation, tkpi, report, storage, …
├── hooks/                            ← usePatientForm, useFoods, useRouteProgress (NProgress)
├── pages/                            ← halaman tipis + api/auth/verify-code.ts
├── styles/globals.css
└── types/                            ← tipe domain
```

Semua import memakai alias `@/` → `src/` (lihat `tsconfig.json`).

## Catatan teknis

- **Logika BMR tunggal.** `helpers/bmr-tee.ts` adalah satu-satunya sumber perhitungan BMR & TEE. Halaman
  `/calculator/bmr-tee` dan tab BMR/TEE di Kalkulator Multi-Tab memakai komponen `BmrTeeCalculator` yang sama.
  Tab lain di Multi-Tab juga memakai komponen yang sama dengan halaman khususnya.
- **Penjagaan input.** TypeScript hanya memeriksa tipe saat kompilasi; input form tetap string bebas saat runtime.
  Karena itu setiap kalkulator memvalidasi rentang lewat `helpers/validation.ts` + `const/input-limits.ts`,
  dan kasus yang dulu membuat halaman crash (mis. TB ≤ 100 cm untuk BBI Broca) kini menampilkan peringatan.
- **Format angka.** Semua hasil memakai `fmt()` (id-ID, maksimal 2 desimal, tanpa nol di belakang: 3,00 → 3).
- **Kode rahasia TKPI.** Tambah, ubah, hapus, dan pulihkan data pangan memunculkan popup kode rahasia.
  Cari, hitung per porsi, ekspor, dan cadangkan tidak dijaga karena tidak mengubah data.
  Data pangan pengguna tetap tersimpan di `localStorage`; penjagaan ini membatasi aksi lewat UI.
- **Chart.** Chart.js (komponen yang dipakai saja) dimuat dinamis di sisi klien lewat `ChartCard`.
- **Notifikasi.** SweetAlert2 + `sweetalert2-react-content`. Paket `react-sweetalert2` tidak dipakai karena
  hanya mendukung React 18.

## Memperbarui database Excel

1. Ganti file di `data-source/` (nama file tetap sama).
2. Jalankan:
   ```bash
   pip install pandas openpyxl
   npm run data:import          # = python scripts/excel_to_json.py
   ```
3. Script menulis ulang `src/data/tkpi.json` dan `src/data/ncptAssessment.json`.

## Halaman

| Menu                                          | Halaman                  | Isi                                                              |
| --------------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Ringkasan                                     | `/`                      | Alur PAGT dan akses cepat                                        |
| Bahan pangan (TKPI)                           | `/search/tkpi`           | 1.145 pangan + data sendiri (dijaga kode rahasia), hitung porsi  |
| Antropometri / Biokimia / Fisik-klinis        | `/search/*`              | Istilah NCPT AD, BD, PD                                          |
| Diagnosis gizi                                | `/search/ncp`            | Domain NI/NC/NB (data contoh)                                    |
| Pengkajian gizi                               | `/asesmen`               | Tabel AD/BD/PD: Domain, Data, Nilai normal, Satuan, Interpretasi |
| Kalkulator multi-tab                          | `/calculator`            | Status gizi dewasa, z-score, BMR/TEE, eGFR                       |
| Z-score anak                                  | `/calculator/pediatrics` | Permenkes 2/2020: status gizi, tren pertumbuhan, tindak lanjut   |
| BMR & TEE, Ginjal, Diabetes, EN/PN, Ibu hamil | `/calculator/*`          | Kalkulator klinis + chart                                        |
| Kalimat PES                                   | `/pes-generator`         | Problem–Etiology–Signs/Symptoms                                  |
| Analisis asupan                               | `/intake`                | Recall 24 jam & SQ-FFQ memakai TKPI + chart kecukupan            |
| Riwayat & laporan                             | `/history`               | Catatan tersimpan, unduh PDF/Excel                               |

## Privasi & penafian

- Profil pasien hanya meminta kode/inisial; tanggal lahir anak tidak disimpan.
- Nilai rujukan lab pada baris cepat adalah rujukan umum dewasa; sesuaikan dengan laboratorium setempat.
- Domain diagnosis NCP (`ncpDomains.json`) masih data contoh.
- Hasil kalkulasi adalah alat bantu; validasi oleh dietisien/ahli gizi sebelum dipakai untuk keputusan klinis.
