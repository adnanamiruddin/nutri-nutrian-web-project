/** Tipe domain yang dipakai lintas modul */

export type Sex = "male" | "female";
export type Tone = "success" | "warning" | "error" | "info";

export interface Category {
  label: string;
  tone: Tone;
}

/** Hasil kalkulasi standar: nilai + langkah perhitungan (transparansi klinis) */
export interface CalcResult {
  value: number;
  steps: string[];
}

/** Profil pasien sementara; angka disimpan sebagai string agar cocok dengan input form */
export interface Patient {
  code: string;
  sex: Sex;
  age: string;
  weight: string;
  height: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

/* ---------------- Laporan & riwayat ---------------- */
export type ReportValue = string | number | boolean | null | undefined | string[];

export interface ReportTable {
  title: string;
  columns: string[];
  rows: ReportValue[][];
}

export interface ReportRecord {
  type: string;
  title: string;
  input?: Record<string, ReportValue>;
  output?: Record<string, ReportValue>;
  tables?: ReportTable[];
  steps?: string[];
  patientCode?: string;
  createdAt?: string;
}

export interface SavedRecord extends ReportRecord {
  id: string;
  createdAt: string;
}

/* ---------------- Bahan pangan (TKPI) ---------------- */
export type NutrientKey =
  | "air" | "energi" | "protein" | "lemak" | "karbohidrat" | "serat" | "abu" | "kalsium" | "fosfor" | "besi"
  | "natrium" | "kalium" | "tembaga" | "seng" | "retinol" | "bKaroten" | "karotenTotal" | "thiamin"
  | "riboflavin" | "niasin" | "vitC";

export type NutrientValues = Record<NutrientKey, number | null>;

export interface Food {
  kode: string;
  nama: string;
  kelompok: string;
  sub: string;
  sumber: string;
  bdd: number | null;
  gizi: NutrientValues;
  ditandai: NutrientKey[];
  custom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Bentuk longgar data pangan pengguna (dari localStorage / file JSON) sebelum dinormalisasi */
export interface RawCustomFood {
  kode?: unknown;
  nama?: unknown;
  kelompok?: unknown;
  sub?: unknown;
  sumber?: unknown;
  bdd?: unknown;
  gizi?: Partial<Record<NutrientKey, unknown>>;
  createdAt?: string;
  updatedAt?: string;
}

/** Bahan pangan siap simpan dari form (sebelum diberi cap waktu) */
export interface FoodInput {
  kode: string;
  nama: string;
  kelompok: string;
  sub: string;
  sumber: string;
  bdd: number;
  gizi: NutrientValues;
}

export interface StoredFood extends FoodInput {
  custom: true;
  createdAt: string;
  updatedAt: string;
}
