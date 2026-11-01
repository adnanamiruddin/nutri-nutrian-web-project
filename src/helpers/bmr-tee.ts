/**
 * helpers/bmr-tee.ts
 * Satu-satunya sumber logika BMR & TEE. Dipakai halaman /calculator/bmr-tee dan tab BMR/TEE
 * di Kalkulator Multi-Tab agar hasil keduanya selalu identik.
 */
import { LIMITS } from "@/const/input-limits";
import {
  BMR_FORMULAS, STRESS_FACTORS, adjustedBW, bmi, burnStressFactor, espenCritical, fmt, ibwBroca, isPos, macroSplit, num,
  recommendFormula, round, tee,
} from "@/helpers/formulas";
import type { BmrFormulaKey, BmrResult, FormulaRecommendation, MacroSplit, StressKey } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import type { CalcResult, ReportRecord, Sex } from "@/types";

export type WeightBasis = "auto" | "actual" | "ibw" | "adjusted";
export type FormulaChoice = "auto" | BmrFormulaKey | "espen";

export interface BmrTeeForm {
  sex: Sex;
  age: string;
  weight: string;
  height: string;
  bodyFat: string;
  critical: boolean;
  formula: FormulaChoice;
  basis: WeightBasis;
  fa: string;
  stress: StressKey;
  tbsa: string;
  customFs: string;
  espenKcal: string;
  proteinPerKg: string;
  fatPct: string;
}

export const BMR_TEE_DEFAULTS: Omit<BmrTeeForm, "sex" | "age" | "weight" | "height"> = {
  bodyFat: "",
  critical: false,
  formula: "auto",
  basis: "auto",
  fa: "1.3",
  stress: "none",
  tbsa: "",
  customFs: "1.0",
  espenKcal: "25",
  proteinPerKg: "1.0",
  fatPct: "25",
};

export interface FormulaComparison {
  key: BmrFormulaKey;
  label: string;
  bmr: number | null;
  tee: number | null;
}

export interface BmrTeeResult {
  b: number;
  ibw: number | null;
  adj: number | null;
  rec: FormulaRecommendation;
  key: BmrFormulaKey | "espen";
  basisW: number;
  basisLabel: string;
  fa: number;
  fs: number;
  bmrRes: BmrResult | null;
  teeRes: CalcResult;
  macro: MacroSplit;
  compare: FormulaComparison[];
  proteinG: number;
  steps: string[];
}

export type BmrTeeOutcome = BmrTeeResult | { error: string } | null;

export const isBmrTeeResult = (r: BmrTeeOutcome): r is BmrTeeResult => !!r && "teeRes" in r;

const BASIS_LABEL: Record<Exclude<WeightBasis, "auto">, string> = {
  actual: "BB aktual",
  ibw: "BB ideal",
  adjusted: "Adjusted BW",
};

/** Validasi rentang input BMR & TEE */
export function validateBmrTee(form: BmrTeeForm): string[] {
  return validateRanges([
    { value: form.age, limit: LIMITS.age },
    { value: form.weight, limit: LIMITS.weight },
    { value: form.height, limit: LIMITS.height },
    { value: form.bodyFat, limit: LIMITS.bodyFat },
    { value: form.stress === "burn" ? form.tbsa : "", limit: LIMITS.tbsa },
    { value: form.stress === "custom" ? form.customFs : "", limit: LIMITS.customFs },
    { value: form.formula === "espen" || (form.formula === "auto" && form.critical) ? form.espenKcal : "", limit: LIMITS.espenKcal },
    { value: form.proteinPerKg, limit: LIMITS.proteinPerKg },
    { value: form.fatPct, limit: LIMITS.fatPct },
  ]);
}

/** Hitung BMR, TEE, makronutrien, dan perbandingan rumus */
export function calculateBmrTee(form: BmrTeeForm): BmrTeeOutcome {
  const w = num(form.weight);
  const h = num(form.height);
  const age = num(form.age);
  const bf = num(form.bodyFat);
  if (!isPos(w, h) || !(age >= 0) || Number.isNaN(age)) return null;

  const b = bmi(w, h) as number;
  const ibwResult = ibwBroca(h, form.sex);
  const ibw = ibwResult?.value ?? null;
  const adjResult = adjustedBW(w, ibw);
  const adj = adjResult?.value ?? null;
  const rec = recommendFormula({ age, bmiValue: b, bodyFat: bf, critical: form.critical });
  const key = form.formula === "auto" ? rec.key : form.formula;

  let basisKey = form.basis;
  if (basisKey === "auto") basisKey = form.formula === "auto" && rec.useAdjusted ? "adjusted" : "actual";
  const basisW = { actual: w, ibw, adjusted: adj }[basisKey];
  if (basisW === null || !Number.isFinite(basisW) || basisW <= 0) {
    return { error: "Dasar berat badan tidak valid. Periksa kembali BB dan TB." };
  }
  const basisLabel = BASIS_LABEL[basisKey];

  // Faktor stres
  let fs = STRESS_FACTORS.find((s) => s.key === form.stress)?.value ?? 1;
  if (form.stress === "burn") fs = burnStressFactor(num(form.tbsa)) ?? 1;
  if (form.stress === "custom") fs = num(form.customFs) || 1;
  const fa = num(form.fa);

  let bmrRes: BmrResult | null;
  let teeRes: CalcResult | null;
  if (key === "espen") {
    teeRes = espenCritical(basisW, num(form.espenKcal) || 25);
    bmrRes = null;
  } else {
    bmrRes = BMR_FORMULAS[key].fn({ weight: basisW, height: h, age, sex: form.sex, bodyFat: bf });
    if (!bmrRes) {
      return { error: key === "katch" ? "Katch-McArdle membutuhkan % lemak tubuh." : "Data belum lengkap." };
    }
    teeRes = tee(bmrRes.value, fa, fs);
  }
  if (!teeRes) return null;

  const proteinG = (num(form.proteinPerKg) || 0) * basisW;
  const macro = macroSplit(teeRes.value, { proteinGram: proteinG, fatPct: num(form.fatPct) || 25 }) as MacroSplit;

  // Perbandingan semua rumus (BB yang sama)
  const compare = (Object.entries(BMR_FORMULAS) as [BmrFormulaKey, (typeof BMR_FORMULAS)[BmrFormulaKey]][]).map(([k, f]) => {
    const res = f.fn({ weight: basisW, height: h, age, sex: form.sex, bodyFat: bf });
    return { key: k, label: f.label, bmr: res?.value ?? null, tee: res ? res.value * fa * fs : null };
  });

  return {
    b,
    ibw,
    adj,
    rec,
    key,
    basisW,
    basisLabel,
    fa,
    fs,
    bmrRes,
    teeRes,
    macro,
    compare,
    proteinG,
    steps: [
      `Dasar berat badan: ${basisLabel} = ${fmt(basisW)} kg`,
      ...(bmrRes ? bmrRes.steps : []),
      ...(form.stress === "burn" ? [`Faktor stres luka bakar TBSA ${fmt(num(form.tbsa))}% = ${fs}`] : []),
      ...teeRes.steps,
    ],
  };
}

export const formulaLabel = (key: BmrFormulaKey | "espen"): string => (key === "espen" ? "ESPEN" : BMR_FORMULAS[key].label);

/** Bentuk laporan (riwayat / PDF / Excel) untuk hasil BMR & TEE */
export function bmrTeeRecord(form: BmrTeeForm, r: BmrTeeResult): ReportRecord {
  return {
    type: "bmr-tee",
    title: `TEE ${fmt(r.teeRes.value)} kkal/hari (${formulaLabel(r.key)})`,
    input: {
      "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
      "Umur (th)": num(form.age),
      "Berat badan (kg)": num(form.weight),
      "Tinggi badan (cm)": num(form.height),
      "% lemak tubuh": num(form.bodyFat) || null,
      "Pasien kritis/ICU": form.critical,
      "Rumus dipilih": form.formula === "auto" ? `Otomatis: ${r.rec.reason}` : form.formula,
      "Faktor aktivitas": r.fa,
      "Faktor stres": r.fs,
      "Protein (g/kg)": num(form.proteinPerKg),
      "Lemak (% energi)": num(form.fatPct),
    },
    output: {
      Rumus: r.key === "espen" ? "ESPEN kkal/kg" : BMR_FORMULAS[r.key].label,
      "Dasar berat badan": `${r.basisLabel} ${fmt(r.basisW)} kg`,
      "IMT (kg/m²)": round(r.b),
      "BMR (kkal)": r.bmrRes ? round(r.bmrRes.value) : null,
      "TEE (kkal/hari)": round(r.teeRes.value),
      "Protein (g)": round(r.macro.protein.gram),
      "Lemak (g)": round(r.macro.fat.gram),
      "Karbohidrat (g)": round(r.macro.carb.gram),
    },
    tables: [
      {
        title: `Perbandingan rumus (dasar ${r.basisLabel})`,
        columns: ["Rumus", "BMR (kkal)", "TEE (kkal)"],
        rows: r.compare.map((c) => [c.label, c.bmr ? round(c.bmr) : "–", c.tee ? round(c.tee) : "–"]),
      },
    ],
    steps: r.steps,
  };
}
