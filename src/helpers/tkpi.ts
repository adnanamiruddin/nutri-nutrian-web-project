/**
 * helpers/tkpi.ts
 * Memuat database TKPI (src/data/tkpi.json, hasil scripts/excel_to_json.py)
 * dan mengurai format baris ringkas menjadi objek.
 */
import raw from "@/data/tkpi.json";
import type { Food, NutrientKey, NutrientValues, RawCustomFood } from "@/types";

interface TkpiRaw {
  _sumber: string;
  kelompok: string[];
  sub: string[];
  nutrients: NutrientKey[];
  /** [kode, nama, idx kelompok, idx sub, sumber, bdd, nilai gizi[], kolom ditandai] */
  rows: [string, string, number, number, string, number | null, (number | null)[], string | null][];
}

const TKPI = raw as unknown as TkpiRaw;

export const NUTRIENT_META: Record<NutrientKey, { label: string; unit: string }> = {
  energi: { label: "Energi", unit: "kkal" },
  protein: { label: "Protein", unit: "g" },
  lemak: { label: "Lemak", unit: "g" },
  karbohidrat: { label: "Karbohidrat", unit: "g" },
  serat: { label: "Serat", unit: "g" },
  air: { label: "Air", unit: "g" },
  abu: { label: "Abu", unit: "g" },
  kalsium: { label: "Kalsium", unit: "mg" },
  fosfor: { label: "Fosfor", unit: "mg" },
  besi: { label: "Besi", unit: "mg" },
  natrium: { label: "Natrium", unit: "mg" },
  kalium: { label: "Kalium", unit: "mg" },
  tembaga: { label: "Tembaga", unit: "mg" },
  seng: { label: "Seng", unit: "mg" },
  retinol: { label: "Retinol", unit: "mcg" },
  bKaroten: { label: "β-karoten", unit: "mcg" },
  karotenTotal: { label: "Karoten total", unit: "mcg" },
  thiamin: { label: "Thiamin", unit: "mg" },
  riboflavin: { label: "Riboflavin", unit: "mg" },
  niasin: { label: "Niasin", unit: "mg" },
  vitC: { label: "Vitamin C", unit: "mg" },
};

/** Kolom nama di Excel sumber → kunci nutrien (untuk menerjemahkan KOLOM_DITANDAI) */
const EXCEL_TO_KEY: Record<string, NutrientKey> = {
  AIR: "air", ENERGI: "energi", PROTEIN: "protein", LEMAK: "lemak", KH: "karbohidrat", SERAT: "serat", ABU: "abu",
  KALSIUM: "kalsium", FOSFOR: "fosfor", BESI: "besi", NATRIUM: "natrium", KALIUM: "kalium", TEMBAGA: "tembaga",
  SENG: "seng", RETINOL: "retinol", B_KAR: "bKaroten", KAR_TOTAL: "karotenTotal", THIAMIN: "thiamin",
  RIBOFLAVIN: "riboflavin", NIASIN: "niasin", VIT_C: "vitC",
};

export const TKPI_SOURCE = TKPI._sumber;
export const KELOMPOK = TKPI.kelompok;
export const SUB_KELOMPOK = TKPI.sub;
export const NUTRIENT_KEYS = TKPI.nutrients;

const toNutrients = (values: (number | null)[]): NutrientValues =>
  Object.fromEntries(TKPI.nutrients.map((k, i) => [k, values[i]])) as NutrientValues;

export const FOODS: Food[] = TKPI.rows.map(([kode, nama, kel, sub, sumber, bdd, values, ditandai]) => ({
  kode,
  nama,
  kelompok: TKPI.kelompok[kel],
  sub: TKPI.sub[sub],
  sumber,
  bdd,
  gizi: toNutrients(values),
  ditandai: ditandai ? ditandai.split(",").map((c) => EXCEL_TO_KEY[c]).filter(Boolean) : [],
}));

/** Pencarian sederhana: semua kata kunci harus ada di nama atau kode */
export function matchFood(food: Food, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${food.kode} ${food.nama}`.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

/* ------------------------------------------------------------------ */
/* Gabungan TKPI + bahan pangan tambahan pengguna                      */
/* ------------------------------------------------------------------ */
export const CUSTOM_SOURCE = "Data pengguna";

/** Normalisasi satu bahan pangan buatan pengguna agar bentuknya sama dengan data TKPI */
export function normalizeCustomFood(f: RawCustomFood): Food {
  const toNumber = (v: unknown): number | null =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  return {
    kode: String(f.kode || "").trim().toUpperCase(),
    nama: String(f.nama || "").trim(),
    kelompok: String(f.kelompok || "Lainnya").trim(),
    sub: typeof f.sub === "string" && f.sub ? f.sub : "Tunggal/Single",
    sumber: String(f.sumber || CUSTOM_SOURCE).trim(),
    bdd: f.bdd === null || f.bdd === undefined || f.bdd === "" ? 100 : Number(f.bdd),
    gizi: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, toNumber(f.gizi?.[k])])) as NutrientValues,
    ditandai: [],
    custom: true,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

/** Kode otomatis berikutnya: USR001, USR002, … */
export function nextCustomCode(customFoods: { kode: string }[]): string {
  const nums = customFoods.map((f) => Number((f.kode.match(/^USR(\d+)$/) || [])[1] || 0));
  return `USR${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
}

export function mergeFoods(customFoods: RawCustomFood[] = []): { all: Food[]; byCode: Record<string, Food>; custom: Food[] } {
  const custom = customFoods.map(normalizeCustomFood).filter((f) => f.kode && f.nama);
  const all = [...FOODS, ...custom];
  return { all, byCode: Object.fromEntries(all.map((f) => [f.kode, f])), custom };
}
