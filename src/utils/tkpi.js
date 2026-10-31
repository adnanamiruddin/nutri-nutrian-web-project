/**
 * utils/tkpi.js
 * Memuat database TKPI (src/data/tkpi.json, hasil scripts/excel_to_json.py)
 * dan mengurai format baris ringkas menjadi objek.
 */
import raw from "@/data/tkpi.json";

export const NUTRIENT_META = {
  energi: { label: "Energi", unit: "kkal", d: 0 },
  protein: { label: "Protein", unit: "g", d: 1 },
  lemak: { label: "Lemak", unit: "g", d: 1 },
  karbohidrat: { label: "Karbohidrat", unit: "g", d: 1 },
  serat: { label: "Serat", unit: "g", d: 1 },
  air: { label: "Air", unit: "g", d: 1 },
  abu: { label: "Abu", unit: "g", d: 1 },
  kalsium: { label: "Kalsium", unit: "mg", d: 0 },
  fosfor: { label: "Fosfor", unit: "mg", d: 0 },
  besi: { label: "Besi", unit: "mg", d: 1 },
  natrium: { label: "Natrium", unit: "mg", d: 0 },
  kalium: { label: "Kalium", unit: "mg", d: 0 },
  tembaga: { label: "Tembaga", unit: "mg", d: 2 },
  seng: { label: "Seng", unit: "mg", d: 1 },
  retinol: { label: "Retinol", unit: "mcg", d: 0 },
  bKaroten: { label: "β-karoten", unit: "mcg", d: 0 },
  karotenTotal: { label: "Karoten total", unit: "mcg", d: 0 },
  thiamin: { label: "Thiamin", unit: "mg", d: 2 },
  riboflavin: { label: "Riboflavin", unit: "mg", d: 2 },
  niasin: { label: "Niasin", unit: "mg", d: 1 },
  vitC: { label: "Vitamin C", unit: "mg", d: 0 },
};

/** Kolom nama di Excel sumber → kunci nutrien (untuk menerjemahkan KOLOM_DITANDAI) */
const EXCEL_TO_KEY = {
  AIR: "air", ENERGI: "energi", PROTEIN: "protein", LEMAK: "lemak", KH: "karbohidrat", SERAT: "serat", ABU: "abu",
  KALSIUM: "kalsium", FOSFOR: "fosfor", BESI: "besi", NATRIUM: "natrium", KALIUM: "kalium", TEMBAGA: "tembaga",
  SENG: "seng", RETINOL: "retinol", B_KAR: "bKaroten", KAR_TOTAL: "karotenTotal", THIAMIN: "thiamin",
  RIBOFLAVIN: "riboflavin", NIASIN: "niasin", VIT_C: "vitC",
};

export const TKPI_SOURCE = raw._sumber;
export const KELOMPOK = raw.kelompok;
export const SUB_KELOMPOK = raw.sub;
export const NUTRIENT_KEYS = raw.nutrients;

export const FOODS = raw.rows.map(([kode, nama, kel, sub, sumber, bdd, values, ditandai]) => ({
  kode,
  nama,
  kelompok: raw.kelompok[kel],
  sub: raw.sub[sub],
  sumber,
  bdd,
  gizi: Object.fromEntries(raw.nutrients.map((k, i) => [k, values[i]])),
  ditandai: ditandai ? ditandai.split(",").map((c) => EXCEL_TO_KEY[c]).filter(Boolean) : [],
}));

export const FOOD_BY_CODE = Object.fromEntries(FOODS.map((f) => [f.kode, f]));

/** Pencarian sederhana: semua kata kunci harus ada di nama atau kode */
export function matchFood(food, query) {
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
export function normalizeCustomFood(f) {
  return {
    kode: String(f.kode || "").trim().toUpperCase(),
    nama: String(f.nama || "").trim(),
    kelompok: String(f.kelompok || "Lainnya").trim(),
    sub: f.sub || "Tunggal/Single",
    sumber: String(f.sumber || CUSTOM_SOURCE).trim(),
    bdd: f.bdd === null || f.bdd === undefined || f.bdd === "" ? 100 : Number(f.bdd),
    gizi: Object.fromEntries(
      NUTRIENT_KEYS.map((k) => {
        const v = f.gizi?.[k];
        return [k, v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v)];
      }),
    ),
    ditandai: [],
    custom: true,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

/** Kode otomatis berikutnya: USR001, USR002, … */
export function nextCustomCode(customFoods) {
  const nums = customFoods.map((f) => Number((f.kode.match(/^USR(\d+)$/) || [])[1] || 0));
  return `USR${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
}

export function mergeFoods(customFoods = []) {
  const custom = customFoods.map(normalizeCustomFood).filter((f) => f.kode && f.nama);
  const all = [...FOODS, ...custom];
  return { all, byCode: Object.fromEntries(all.map((f) => [f.kode, f])), custom };
}
