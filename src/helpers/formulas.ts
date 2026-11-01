/**
 * helpers/formulas.ts
 * Fungsi matematika & logika gizi murni (tanpa React, tanpa I/O).
 * Setiap fungsi kalkulasi utama mengembalikan { value, steps } agar
 * langkah perhitungan bisa ditampilkan ke pengguna (transparansi klinis).
 *
 * Satuan: BB (kg), TB (cm), umur (tahun), Scr (mg/dL), energi (kkal).
 */
import type { CalcResult, Category, Sex } from "@/types";

/* ------------------------------------------------------------------ */
/* Helper umum                                                         */
/* ------------------------------------------------------------------ */

/** Jumlah digit desimal standar untuk semua hasil kalkulasi */
export const DECIMALS = 2;

export const round = (n: number | null | undefined, d: number = DECIMALS): number | null => {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** Format angka id-ID, maksimal 2 desimal; nol di belakang koma tidak ditampilkan (3,00 → 3) */
export const fmt = (n: number | null | undefined, d: number = DECIMALS): string => {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return "–";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  }).format(n);
};

/** Ubah input form (string/angka) menjadi number; kosong → NaN */
export const num = (v: string | number | null | undefined): number => {
  if (v === "" || v === null || v === undefined) return NaN;
  return typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
};

export const isPos = (...vals: number[]): boolean => vals.every((v) => Number.isFinite(v) && v > 0);

/* ------------------------------------------------------------------ */
/* IMT / BMI                                                           */
/* ------------------------------------------------------------------ */

export function bmi(weight: number, heightCm: number): number | null {
  if (!isPos(weight, heightCm)) return null;
  const m = heightCm / 100;
  return weight / (m * m);
}

interface BmiCut extends Category {
  max: number;
}

export type BmiStandardKey = "who" | "asia" | "kemenkes";

export const BMI_STANDARDS: Record<BmiStandardKey, { label: string; cuts: BmiCut[] }> = {
  who: {
    label: "WHO (global)",
    cuts: [
      { max: 18.5, label: "Berat badan kurang", tone: "warning" },
      { max: 25, label: "Normal", tone: "success" },
      { max: 30, label: "Berat badan lebih (pre-obesitas)", tone: "warning" },
      { max: 35, label: "Obesitas kelas I", tone: "error" },
      { max: 40, label: "Obesitas kelas II", tone: "error" },
      { max: Infinity, label: "Obesitas kelas III", tone: "error" },
    ],
  },
  asia: {
    label: "Asia-Pasifik (WHO WPRO 2000)",
    cuts: [
      { max: 18.5, label: "Berat badan kurang", tone: "warning" },
      { max: 23, label: "Normal", tone: "success" },
      { max: 25, label: "Berisiko (overweight)", tone: "warning" },
      { max: 30, label: "Obesitas I", tone: "error" },
      { max: Infinity, label: "Obesitas II", tone: "error" },
    ],
  },
  kemenkes: {
    label: "Kemenkes RI",
    cuts: [
      { max: 17, label: "Kurus (kekurangan BB tingkat berat)", tone: "error" },
      { max: 18.5, label: "Kurus (kekurangan BB tingkat ringan)", tone: "warning" },
      { max: 25.1, label: "Normal", tone: "success" },
      { max: 27.1, label: "Gemuk (kelebihan BB tingkat ringan)", tone: "warning" },
      { max: Infinity, label: "Obesitas (kelebihan BB tingkat berat)", tone: "error" },
    ],
  },
};

export function bmiCategory(value: number, standard: BmiStandardKey = "asia"): Category | null {
  if (!Number.isFinite(value)) return null;
  const s = BMI_STANDARDS[standard] || BMI_STANDARDS.asia;
  return s.cuts.find((c) => value < c.max) ?? null;
}

/* ------------------------------------------------------------------ */
/* Berat badan ideal / BBI                                             */
/* ------------------------------------------------------------------ */

/** Broca modifikasi (Indonesia): (TB−100) − 10%; pria TB<160 / wanita TB<150 → TB−100 */
export function ibwBroca(heightCm: number, sex: Sex): CalcResult | null {
  if (!isPos(heightCm)) return null;
  const base = heightCm - 100;
  const noCut = (sex === "male" && heightCm < 160) || (sex === "female" && heightCm < 150);
  const value = noCut ? base : base * 0.9;
  return {
    value,
    steps: noCut
      ? [`TB ${fmt(heightCm)} cm di bawah batas (${sex === "male" ? "pria < 160" : "wanita < 150"} cm) → BBI = TB − 100 = ${fmt(value)} kg`]
      : [`BBI = (TB − 100) − 10% × (TB − 100) = ${fmt(base)} − ${fmt(base * 0.1)} = ${fmt(value)} kg`],
  };
}

/** Hamwi: pria 48 kg + 2,7 kg/inci di atas 5 kaki; wanita 45,5 kg + 2,2 kg/inci */
export function ibwHamwi(heightCm: number, sex: Sex): CalcResult | null {
  if (!isPos(heightCm)) return null;
  const inches = (heightCm - 152.4) / 2.54;
  const base = sex === "male" ? 48 : 45.5;
  const per = sex === "male" ? 2.7 : 2.2;
  const value = base + per * inches;
  return {
    value,
    steps: [
      `Selisih tinggi dari 152,4 cm (5 kaki) = ${fmt(inches)} inci`,
      `BBI = ${fmt(base)} + ${fmt(per)} × ${fmt(inches)} = ${fmt(value)} kg`,
    ],
  };
}

/** Adjusted Body Weight: IBW + 0,25 × (BB aktual − IBW) */
export function adjustedBW(actual: number, ibw: number | null | undefined, factor = 0.25): CalcResult | null {
  if (ibw === null || ibw === undefined || !isPos(actual, ibw)) return null;
  const value = ibw + factor * (actual - ibw);
  return {
    value,
    steps: [`AjBW = ${fmt(ibw)} + ${factor} × (${fmt(actual)} − ${fmt(ibw)}) = ${fmt(value)} kg`],
  };
}

/* ------------------------------------------------------------------ */
/* BMR                                                                 */
/* ------------------------------------------------------------------ */

export interface BmrInput {
  weight: number;
  height: number;
  age: number;
  sex: Sex;
  bodyFat?: number;
}

export interface BmrResult extends CalcResult {
  formula: string;
}

export function bmrMifflin({ weight, height, age, sex }: BmrInput): BmrResult | null {
  if (!isPos(weight, height, age)) return null;
  const c = sex === "male" ? 5 : -161;
  const value = 10 * weight + 6.25 * height - 5 * age + c;
  return {
    value,
    formula: "Mifflin-St Jeor",
    steps: [
      `BMR = (10 × ${fmt(weight)}) + (6,25 × ${fmt(height)}) − (5 × ${fmt(age)}) ${c > 0 ? "+ 5" : "− 161"}`,
      `BMR = ${fmt(10 * weight)} + ${fmt(6.25 * height)} − ${fmt(5 * age)} ${c > 0 ? "+ 5" : "− 161"} = ${fmt(value)} kkal`,
    ],
  };
}

/** Harris-Benedict revisi Roza & Shizgal (1984) */
export function bmrHarris({ weight, height, age, sex }: BmrInput): BmrResult | null {
  if (!isPos(weight, height, age)) return null;
  const k =
    sex === "male"
      ? { a: 88.362, w: 13.397, h: 4.799, g: 5.677 }
      : { a: 447.593, w: 9.247, h: 3.098, g: 4.33 };
  const value = k.a + k.w * weight + k.h * height - k.g * age;
  return {
    value,
    formula: "Harris-Benedict (Roza & Shizgal 1984)",
    steps: [
      `BMR = ${k.a} + (${k.w} × ${fmt(weight)}) + (${k.h} × ${fmt(height)}) − (${k.g} × ${fmt(age)})`,
      `BMR = ${fmt(value)} kkal`,
    ],
  };
}

/**
 * Schofield (1985). Anak < 18 th memakai persamaan BB & TB (TB dalam meter)
 * bila TB tersedia; dewasa memakai persamaan BB saja.
 * Baris: [umur awal, umur akhir, koef. BB, (koef. TB), konstanta]
 */
const SCHOFIELD_W: Record<Sex, [number, number, number, number][]> = {
  male: [
    [0, 3, 59.512, -30.4],
    [3, 10, 22.706, 504.3],
    [10, 18, 17.686, 658.2],
    [18, 30, 15.057, 692.2],
    [30, 60, 11.472, 873.1],
    [60, 200, 11.711, 587.7],
  ],
  female: [
    [0, 3, 58.317, -31.1],
    [3, 10, 20.315, 485.9],
    [10, 18, 13.384, 692.6],
    [18, 30, 14.818, 486.6],
    [30, 60, 8.126, 845.6],
    [60, 200, 9.082, 658.5],
  ],
};
const SCHOFIELD_WH: Record<Sex, [number, number, number, number, number][]> = {
  male: [
    [0, 3, 0.167, 1517.4, -617.6],
    [3, 10, 19.59, 130.3, 414.9],
    [10, 18, 16.25, 137.2, 515.5],
  ],
  female: [
    [0, 3, 16.252, 1023.2, -413.5],
    [3, 10, 16.969, 161.8, 371.2],
    [10, 18, 8.365, 465, 200],
  ],
};

export function bmrSchofield({ weight, height, age, sex }: BmrInput): BmrResult | null {
  if (!isPos(weight) || !(age >= 0)) return null;
  const s: Sex = sex === "male" ? "male" : "female";
  if (age < 18 && isPos(height)) {
    const row = SCHOFIELD_WH[s].find(([a, b]) => age >= a && age < b);
    if (!row) return null;
    const [a, b, kw, kh, c] = row;
    const hm = height / 100;
    const value = kw * weight + kh * hm + c;
    return {
      value,
      formula: `Schofield BB & TB (${a}–${b} th)`,
      steps: [
        `BMR = (${kw} × ${fmt(weight)}) + (${kh} × ${fmt(hm)} m) ${c < 0 ? "−" : "+"} ${Math.abs(c)}`,
        `BMR = ${fmt(value)} kkal`,
      ],
    };
  }
  const row = SCHOFIELD_W[s].find(([a, b]) => age >= a && age < b);
  if (!row) return null;
  const [a, b, kw, c] = row;
  const value = kw * weight + c;
  return {
    value,
    formula: `Schofield BB (${a}–${b > 100 ? "…" : b} th)`,
    steps: [`BMR = (${kw} × ${fmt(weight)}) ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${fmt(value)} kkal`],
  };
}

/** Katch-McArdle: 370 + 21,6 × LBM ; LBM = BB × (1 − %lemak) */
export function bmrKatch({ weight, bodyFat }: BmrInput): BmrResult | null {
  if (bodyFat === undefined || !isPos(weight) || !(bodyFat >= 0 && bodyFat < 80)) return null;
  const lbm = weight * (1 - bodyFat / 100);
  const value = 370 + 21.6 * lbm;
  return {
    value,
    formula: "Katch-McArdle",
    steps: [
      `LBM = ${fmt(weight)} × (1 − ${fmt(bodyFat)}%) = ${fmt(lbm)} kg`,
      `BMR = 370 + (21,6 × ${fmt(lbm)}) = ${fmt(value)} kkal`,
    ],
  };
}

export type BmrFormulaKey = "mifflin" | "harris" | "schofield" | "katch";

export const BMR_FORMULAS: Record<BmrFormulaKey, { label: string; fn: (p: BmrInput) => BmrResult | null }> = {
  mifflin: { label: "Mifflin-St Jeor", fn: bmrMifflin },
  harris: { label: "Harris-Benedict (revisi 1984)", fn: bmrHarris },
  schofield: { label: "Schofield", fn: bmrSchofield },
  katch: { label: "Katch-McArdle (butuh % lemak)", fn: bmrKatch },
};

export interface FormulaRecommendation {
  key: BmrFormulaKey | "espen";
  reason: string;
  useAdjusted?: boolean;
}

/**
 * Pemilihan rumus otomatis (decision tree BRD 3.1):
 * - Kritis/ICU → ESPEN 20–25 kkal/kg
 * - Anak < 18 th → Schofield
 * - IMT ≥ 27 → Katch-McArdle bila % lemak ada, selain itu Mifflin dengan AjBW
 * - Lainnya → Mifflin-St Jeor
 */
export function recommendFormula({
  age,
  bmiValue,
  bodyFat,
  critical,
}: {
  age: number;
  bmiValue: number;
  bodyFat: number;
  critical: boolean;
}): FormulaRecommendation {
  if (critical) return { key: "espen", reason: "Pasien kritis/ICU → ESPEN 20–25 kkal/kg BB" };
  if (age < 18) return { key: "schofield", reason: "Usia < 18 tahun → persamaan Schofield" };
  if (bmiValue >= 27) {
    if (bodyFat > 0) return { key: "katch", reason: "IMT ≥ 27 dan % lemak tersedia → Katch-McArdle" };
    return { key: "mifflin", useAdjusted: true, reason: "IMT ≥ 27 → Mifflin-St Jeor dengan Adjusted BW" };
  }
  return { key: "mifflin", reason: "Dewasa non-obesitas → Mifflin-St Jeor (default)" };
}

/* ------------------------------------------------------------------ */
/* TEE, faktor aktivitas & stres                                       */
/* ------------------------------------------------------------------ */

export const ACTIVITY_FACTORS = [
  { value: 1.2, label: "Bed rest / tirah baring" },
  { value: 1.3, label: "Aktivitas terbatas / ringan" },
  { value: 1.4, label: "Aktivitas sedang" },
  { value: 1.5, label: "Aktivitas berat / sangat aktif" },
];

export type StressKey = "none" | "minor" | "sepsis" | "major" | "trauma" | "burn" | "custom";

export const STRESS_FACTORS: { key: StressKey; value: number | null; label: string }[] = [
  { key: "none", value: 1.0, label: "Tanpa stres metabolik" },
  { key: "minor", value: 1.1, label: "Operasi minor / infeksi ringan" },
  { key: "sepsis", value: 1.1, label: "Sepsis (BRD: 1,1; sesuaikan protokol)" },
  { key: "major", value: 1.2, label: "Operasi mayor" },
  { key: "trauma", value: 1.35, label: "Trauma / multiple fracture (1,2–1,5)" },
  { key: "burn", value: null, label: "Luka bakar (berdasarkan % TBSA)" },
  { key: "custom", value: null, label: "Isi manual" },
];

/** Faktor stres luka bakar berdasarkan % TBSA (acuan Long et al.; batas atas dapat disesuaikan) */
export function burnStressFactor(tbsa: number): number | null {
  if (!(tbsa >= 0)) return null;
  if (tbsa < 10) return 1.2;
  if (tbsa < 20) return 1.35;
  if (tbsa < 30) return 1.5;
  if (tbsa < 50) return 1.75;
  return 2.0;
}

export function tee(bmrValue: number, fa: number, fs = 1): CalcResult | null {
  if (!isPos(bmrValue, fa, fs)) return null;
  const value = bmrValue * fa * fs;
  return {
    value,
    steps: [`TEE = BMR × FA × FS = ${fmt(bmrValue)} × ${fa} × ${fs} = ${fmt(value)} kkal`],
  };
}

/** ESPEN critical care: 20–25 kkal/kg BB */
export function espenCritical(weight: number, kcalPerKg = 25): CalcResult | null {
  if (!isPos(weight)) return null;
  const value = weight * kcalPerKg;
  return {
    value,
    steps: [`Energi = ${kcalPerKg} kkal × ${fmt(weight)} kg = ${fmt(value)} kkal (ESPEN 20–25 kkal/kg)`],
  };
}

export interface MacroPart {
  gram: number;
  kcal: number;
  pct: number;
}

export interface MacroSplit {
  protein: MacroPart;
  fat: MacroPart;
  carb: MacroPart;
}

/** Distribusi makronutrien */
export function macroSplit(
  energy: number,
  { proteinPct, fatPct, carbPct, proteinGram }: { proteinPct?: number; fatPct: number; carbPct?: number; proteinGram?: number },
): MacroSplit | null {
  if (!isPos(energy)) return null;
  const pG = proteinGram !== undefined && proteinGram > 0 ? proteinGram : (energy * (proteinPct ?? NaN)) / 100 / 4;
  const pKcal = pG * 4;
  const fG = (energy * fatPct) / 100 / 9;
  const cKcal = carbPct !== undefined && carbPct > 0 ? (energy * carbPct) / 100 : energy - pKcal - fG * 9;
  return {
    protein: { gram: pG, kcal: pKcal, pct: (pKcal / energy) * 100 },
    fat: { gram: fG, kcal: fG * 9, pct: fatPct },
    carb: { gram: cKcal / 4, kcal: cKcal, pct: (cKcal / energy) * 100 },
  };
}

/* ------------------------------------------------------------------ */
/* Ginjal (CKD) – KDOQI 2020                                           */
/* ------------------------------------------------------------------ */

/** eGFR CKD-EPI 2021 (tanpa koefisien ras) */
export function egfrCkdEpi2021({ scr, age, sex }: { scr: number; age: number; sex: Sex }): CalcResult | null {
  if (!isPos(scr, age)) return null;
  const female = sex === "female";
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const r = scr / k;
  const value = 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
  return {
    value,
    steps: [
      `κ = ${k}, α = ${a} (${female ? "perempuan" : "laki-laki"}); Scr/κ = ${fmt(r)}`,
      `eGFR = 142 × min(${fmt(r)}, 1)^${a} × max(${fmt(r)}, 1)^−1,200 × 0,9938^${fmt(age)}${female ? " × 1,012" : ""}`,
      `eGFR = ${fmt(value)} mL/menit/1,73 m²`,
    ],
  };
}

export interface CkdStage extends Category {
  stage: "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";
}

export function ckdStage(egfr: number): CkdStage | null {
  if (!Number.isFinite(egfr)) return null;
  if (egfr >= 90) return { stage: "G1", label: "Normal atau tinggi", tone: "success" };
  if (egfr >= 60) return { stage: "G2", label: "Penurunan ringan", tone: "success" };
  if (egfr >= 45) return { stage: "G3a", label: "Penurunan ringan–sedang", tone: "warning" };
  if (egfr >= 30) return { stage: "G3b", label: "Penurunan sedang–berat", tone: "warning" };
  if (egfr >= 15) return { stage: "G4", label: "Penurunan berat", tone: "error" };
  return { stage: "G5", label: "Gagal ginjal", tone: "error" };
}

export type CkdMode = "nd" | "hd" | "pd";

/**
 * Preskripsi protein (BRD / KDOQI 2020):
 * - Non-dialisis stadium 3–5: 0,55–0,60 g/kg BBI
 * - Hemodialisis: 1,0–1,2 g/kg BBI
 * - CAPD/PD: 1,0–1,2 g/kg BBI + kehilangan peritoneal 5–15 g/hari
 * - Stadium 1–2: 0,8 g/kg (anjuran umum)
 */
export function ckdProtein({
  ibw,
  mode,
  stage,
  peritonealLoss = 10,
}: {
  ibw: number;
  mode: CkdMode;
  stage: string;
  peritonealLoss?: number;
}): { min: number; max: number; note: string } | null {
  if (!isPos(ibw)) return null;
  if (mode === "hd") {
    return { min: ibw * 1.0, max: ibw * 1.2, note: "Hemodialisis: 1,0–1,2 g/kg BBI/hari" };
  }
  if (mode === "pd") {
    return {
      min: ibw * 1.0 + peritonealLoss,
      max: ibw * 1.2 + peritonealLoss,
      note: `CAPD/PD: 1,0–1,2 g/kg BBI/hari + kehilangan peritoneal ${peritonealLoss} g/hari`,
    };
  }
  if (["G1", "G2"].includes(stage)) {
    return { min: ibw * 0.8, max: ibw * 0.8, note: "Stadium 1–2: ±0,8 g/kg BBI/hari (anjuran umum)" };
  }
  return { min: ibw * 0.55, max: ibw * 0.6, note: "Non-dialisis stadium 3–5: 0,55–0,60 g/kg BBI/hari" };
}

/* ------------------------------------------------------------------ */
/* Diabetes Melitus – PERKENI                                          */
/* ------------------------------------------------------------------ */

export const DM_ACTIVITY = [
  { value: 10, label: "Istirahat (+10%)" },
  { value: 20, label: "Ringan (+20%)" },
  { value: 30, label: "Sedang (+30%)" },
  { value: 40, label: "Berat (+40%)" },
  { value: 50, label: "Sangat berat (+50%)" },
];

export interface DmEnergyResult extends CalcResult {
  basal: number;
  items: { label: string; pct: number }[];
  belowMinimum: boolean;
  minimum: number;
}

export function dmEnergy({
  ibw,
  sex,
  age,
  activityPct,
  bmiValue,
  stressPct = 0,
  weightAdjPct = 20,
}: {
  ibw: number;
  sex: Sex;
  age: number;
  activityPct: number;
  bmiValue: number | null;
  stressPct?: number;
  weightAdjPct?: number;
}): DmEnergyResult | null {
  if (!isPos(ibw, age)) return null;
  const perKg = sex === "male" ? 30 : 25;
  const basal = perKg * ibw;
  const steps = [`Kebutuhan basal = ${perKg} kkal × ${fmt(ibw)} kg BBI = ${fmt(basal)} kkal`];
  let agePct = 0;
  if (age >= 70) agePct = -20;
  else if (age >= 60) agePct = -10;
  else if (age >= 40) agePct = -5;
  let wtPct = 0;
  let wtLabel = "Normal (tanpa koreksi)";
  if (bmiValue !== null && Number.isFinite(bmiValue)) {
    if (bmiValue >= 23) {
      wtPct = -Math.abs(weightAdjPct);
      wtLabel = `Gemuk (IMT ≥ 23) −${Math.abs(weightAdjPct)}%`;
    } else if (bmiValue < 18.5) {
      wtPct = Math.abs(weightAdjPct);
      wtLabel = `Kurus (IMT < 18,5) +${Math.abs(weightAdjPct)}%`;
    }
  }
  const items = [
    { label: `Koreksi umur (${age >= 40 ? "≥ 40 th" : "< 40 th"})`, pct: agePct },
    { label: "Aktivitas fisik", pct: activityPct },
    { label: `Berat badan: ${wtLabel}`, pct: wtPct },
    { label: "Stres metabolik/infeksi", pct: stressPct },
  ];
  let total = basal;
  items.forEach((it) => {
    const delta = (basal * it.pct) / 100;
    total += delta;
    if (it.pct !== 0) steps.push(`${it.label}: ${it.pct > 0 ? "+" : ""}${it.pct}% × ${fmt(basal)} = ${delta > 0 ? "+" : ""}${fmt(delta)} kkal`);
  });
  steps.push(`Total = ${fmt(total)} kkal`);
  const minimum = sex === "male" ? 1200 : 1000;
  return { basal, items, value: total, steps, belowMinimum: total < minimum, minimum };
}

/* ------------------------------------------------------------------ */
/* Enteral / Parenteral                                                */
/* ------------------------------------------------------------------ */

export interface NpcResult extends CalcResult {
  npc: number;
  nitrogen: number;
}

/** NPC:N = Kalori non-protein / (gram protein / 6,25) */
export function npcNitrogen({ totalKcal, proteinG }: { totalKcal: number; proteinG: number }): NpcResult | null {
  if (!isPos(totalKcal, proteinG)) return null;
  const npc = totalKcal - proteinG * 4;
  const n = proteinG / 6.25;
  const ratio = npc / n;
  return {
    npc,
    nitrogen: n,
    value: ratio,
    steps: [
      `Kalori non-protein = ${fmt(totalKcal)} − (${fmt(proteinG)} g × 4) = ${fmt(npc)} kkal`,
      `Nitrogen = ${fmt(proteinG)} g ÷ 6,25 = ${fmt(n)} g`,
      `NPC:N = ${fmt(npc)} ÷ ${fmt(n)} = ${fmt(ratio)} : 1`,
    ],
  };
}

export type NpcTarget = "stable" | "critical";

export function npcInterpretation(ratio: number, target: NpcTarget = "stable"): Category | null {
  if (!Number.isFinite(ratio)) return null;
  const [lo, hi] = target === "critical" ? [80, 100] : [120, 150];
  if (ratio < lo) return { label: `Di bawah target (${lo}–${hi}:1) — protein relatif tinggi`, tone: "warning" };
  if (ratio > hi) return { label: `Di atas target (${lo}–${hi}:1) — protein relatif rendah`, tone: "warning" };
  return { label: `Sesuai target ${lo}–${hi}:1`, tone: "success" };
}

/** Glucose Infusion Rate (mg/kg/menit) */
export function glucoseInfusionRate({ dextroseG, weight, hours = 24 }: { dextroseG: number; weight: number; hours?: number }): CalcResult | null {
  if (!isPos(dextroseG, weight, hours)) return null;
  const value = (dextroseG * 1000) / weight / (hours * 60);
  return {
    value,
    steps: [`GIR = (${fmt(dextroseG)} g × 1.000) ÷ ${fmt(weight)} kg ÷ (${hours} × 60) = ${fmt(value)} mg/kg/menit`],
  };
}

/** Estimasi osmolaritas PN (mOsm/L) */
export function pnOsmolarity({
  volumeMl,
  dextroseG,
  aminoG,
  lipidG = 0,
  electrolyteMeq = 0,
}: {
  volumeMl: number;
  dextroseG: number;
  aminoG: number;
  lipidG?: number;
  electrolyteMeq?: number;
}): CalcResult | null {
  if (!isPos(volumeMl)) return null;
  const L = volumeMl / 1000;
  const value = ((dextroseG || 0) * 5 + (aminoG || 0) * 10 + (lipidG || 0) * 0.71) / L + ((electrolyteMeq || 0) * 2) / L;
  return {
    value,
    steps: [
      `Osmolaritas ≈ [(dekstrosa ${fmt(dextroseG || 0)} g × 5) + (asam amino ${fmt(aminoG || 0)} g × 10) + (lipid ${fmt(lipidG || 0)} g × 0,71) + (elektrolit ${fmt(electrolyteMeq || 0)} mEq × 2)] ÷ ${fmt(L)} L`,
      `Osmolaritas ≈ ${fmt(value)} mOsm/L`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Kehamilan & menyusui                                                */
/* ------------------------------------------------------------------ */

export type PregnancyStandard = "iom" | "akg2019";

export const PREGNANCY_ADDITION: Record<
  PregnancyStandard,
  { label: string; t1: number; t2: number; t3: number; lact1: number; lact2: number }
> = {
  iom: { label: "IOM (BRD)", t1: 0, t2: 340, t3: 452, lact1: 500, lact2: 400 },
  akg2019: { label: "AKG 2019 Kemenkes", t1: 180, t2: 300, t3: 300, lact1: 330, lact2: 400 },
};

export function trimesterFromWeek(week: number): 1 | 2 | 3 | null {
  if (!(week > 0)) return null;
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

export interface GwgTarget {
  min: number;
  max: number;
  weeklyT23: [number, number];
  label: string;
}

/** Rentang kenaikan BB total kehamilan (IOM 2009) berdasarkan IMT pra-hamil */
export function gwgTarget(prePregBmi: number): GwgTarget | null {
  if (!Number.isFinite(prePregBmi)) return null;
  if (prePregBmi < 18.5) return { min: 12.5, max: 18, weeklyT23: [0.44, 0.58], label: "Kurang" };
  if (prePregBmi < 25) return { min: 11.5, max: 16, weeklyT23: [0.35, 0.5], label: "Normal" };
  if (prePregBmi < 30) return { min: 7, max: 11.5, weeklyT23: [0.23, 0.33], label: "Lebih" };
  return { min: 5, max: 9, weeklyT23: [0.17, 0.27], label: "Obesitas" };
}

/** Rentang kenaikan BB yang diharapkan pada minggu tertentu (T1 total 0,5–2 kg) */
export function gwgExpectedAtWeek(prePregBmi: number, week: number): { min: number; max: number } | null {
  const t = gwgTarget(prePregBmi);
  if (!t || !(week > 0)) return null;
  if (week <= 13) return { min: (0.5 * week) / 13, max: (2 * week) / 13 };
  const w = week - 13;
  return { min: 0.5 + t.weeklyT23[0] * w, max: 2 + t.weeklyT23[1] * w };
}

/* ------------------------------------------------------------------ */
/* Analisis asupan                                                     */
/* ------------------------------------------------------------------ */

export type FreqPeriod = "day" | "week" | "month";

export const FREQ_FACTORS: Record<FreqPeriod, { label: string; factor: number }> = {
  day: { label: "× per hari", factor: 1 },
  week: { label: "× per minggu", factor: 1 / 7 },
  month: { label: "× per bulan", factor: 1 / 30 },
};

/** Kategori tingkat kecukupan (Depkes 1996) */
export function adequacyCategory(pct: number | null): Category | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  if (pct < 70) return { label: "Defisit berat", tone: "error" };
  if (pct < 80) return { label: "Defisit sedang", tone: "warning" };
  if (pct < 90) return { label: "Defisit ringan", tone: "warning" };
  if (pct < 120) return { label: "Normal", tone: "success" };
  return { label: "Lebih", tone: "error" };
}

export function ageFromDates(dob: string, ref: string | Date = new Date()): { days: number; months: number; years: number } | null {
  const b = new Date(dob);
  const r = new Date(ref);
  if (Number.isNaN(b.getTime()) || Number.isNaN(r.getTime()) || r < b) return null;
  const days = Math.floor((r.getTime() - b.getTime()) / 86400000);
  return { days, months: days / 30.4375, years: days / 365.25 };
}

/* ------------------------------------------------------------------ */
/* Perubahan berat badan (AD-1.1.4)                                    */
/* ------------------------------------------------------------------ */
export type WeightChangePeriod = "1w" | "1m" | "3m" | "6m";

/** Batas penurunan BB bermakna (Blackburn): 1 mgg 1–2%, 1 bln 5%, 3 bln 7,5%, 6 bln 10% */
export const WEIGHT_CHANGE_PERIODS: { value: WeightChangePeriod; label: string; significant: number; severe: number }[] = [
  { value: "1w", label: "1 minggu", significant: 1, severe: 2 },
  { value: "1m", label: "1 bulan", significant: 5, severe: 5 },
  { value: "3m", label: "3 bulan", significant: 7.5, severe: 7.5 },
  { value: "6m", label: "6 bulan", significant: 10, severe: 10 },
];

export interface WeightChangeResult {
  pct: number;
  interp: Category;
  steps: string[];
}

export function weightChange({ usual, current, period = "1m" }: { usual: number; current: number; period?: WeightChangePeriod }): WeightChangeResult | null {
  if (!isPos(usual, current)) return null;
  const pct = ((usual - current) / usual) * 100;
  const p = WEIGHT_CHANGE_PERIODS.find((x) => x.value === period) || WEIGHT_CHANGE_PERIODS[1];
  let interp: Category;
  if (pct <= 0) interp = { label: pct < 0 ? `Kenaikan BB ${fmt(-pct)}%` : "Tidak ada perubahan BB", tone: "success" };
  else if (pct > p.severe) interp = { label: `Penurunan BB berat (> ${fmt(p.severe)}% dalam ${p.label})`, tone: "error" };
  else if (pct >= p.significant) interp = { label: `Penurunan BB bermakna (${fmt(p.significant)}% dalam ${p.label})`, tone: "warning" };
  else interp = { label: "Penurunan BB tidak bermakna", tone: "success" };
  return {
    pct,
    interp,
    steps: [`Perubahan BB = (${fmt(usual)} − ${fmt(current)}) ÷ ${fmt(usual)} × 100% = ${fmt(pct)}% dalam ${p.label}`],
  };
}

