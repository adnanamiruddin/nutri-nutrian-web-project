/**
 * utils/assessmentPresets.js
 * Baris cepat untuk lembar pengkajian (AD/BD/PD).
 * Nilai rujukan BD adalah rujukan umum dewasa — SESUAIKAN dengan nilai rujukan laboratorium setempat
 * dan kelompok umur pasien (anak memakai rujukan berbeda).
 */
export const AD_PRESETS = [
  { code: "AD-1.1.1", label: "Tinggi badan", unit: "cm" },
  { code: "AD-1.1.1.2", label: "Panjang badan", unit: "cm" },
  { code: "AD-1.1.2", label: "Berat badan", unit: "kg" },
  { code: "AD-1.1.2", label: "Berat badan ideal", unit: "kg" },
  { code: "AD-1.1.4", label: "Perubahan berat badan", unit: "%" },
  { code: "AD-1.1.5.1", label: "IMT", unit: "kg/m²", auto: "bmi" },
  { code: "AD-1.1.7.19", label: "LILA", unit: "cm", auto: "lila" },
  { code: "AD-1.1.7.14", label: "Lingkar perut", unit: "cm" },
];

/** low/high = label interpretasi bila di bawah / di atas rentang normal */
export const BD_PRESETS = [
  { group: "Darah lengkap", code: "BD-1.10.1", label: "Hemoglobin", normal: "12 - 16", unit: "g/dL", low: "Anemia", high: "Hemoglobin tinggi" },
  { group: "Darah lengkap", code: "BD-1.10.2", label: "Hematokrit", normal: "36 - 46", unit: "%", low: "Hematokrit rendah", high: "Hemokonsentrasi" },
  { group: "Darah lengkap", code: "BD-1.10", label: "Trombosit", normal: "150 - 450", unit: "10³/µL", low: "Trombositopenia", high: "Trombositosis" },
  { group: "Darah lengkap", code: "BD-1.6", label: "Leukosit", normal: "4 - 10", unit: "10³/µL", low: "Leukopenia", high: "Leukositosis" },
  { group: "Darah lengkap", code: "BD-1.10", label: "Neutrofil segmen", normal: "50 - 70", unit: "%", low: "Neutropenia", high: "Neutrofilia" },
  { group: "Darah lengkap", code: "BD-1.10", label: "Limfosit", normal: "20 - 40", unit: "%", low: "Limfopenia", high: "Limfositosis" },
  { group: "Darah lengkap", code: "BD-1.10", label: "Monosit", normal: "2 - 8", unit: "%", low: "Monosit rendah", high: "Monositosis" },
  { group: "Protein & besi", code: "BD-1.11.1", label: "Albumin", normal: "3,5 - 5,0", unit: "g/dL", low: "Hipoalbuminemia", high: "Albumin tinggi" },
  { group: "Protein & besi", code: "BD-1.10.10", label: "Ferritin serum", normal: "15 - 150", unit: "ng/mL", low: "Cadangan besi rendah", high: "Ferritin tinggi" },
  { group: "Glukosa", code: "BD-1.5.2", label: "Glukosa darah sewaktu", normal: "70 - 199", unit: "mg/dL", low: "Hipoglikemia", high: "Hiperglikemia" },
  { group: "Glukosa", code: "BD-1.5.1", label: "Glukosa darah puasa", normal: "70 - 99", unit: "mg/dL", low: "Hipoglikemia", high: "Glukosa puasa tinggi" },
  { group: "Glukosa", code: "BD-1.5.3", label: "HbA1c", normal: "< 5,7", unit: "%", low: "", high: "HbA1c tinggi" },
  { group: "Ginjal & elektrolit", code: "BD-1.2.1", label: "BUN", normal: "7 - 20", unit: "mg/dL", low: "BUN rendah", high: "BUN tinggi" },
  { group: "Ginjal & elektrolit", code: "BD-1.2", label: "Ureum", normal: "15 - 40", unit: "mg/dL", low: "Ureum rendah", high: "Ureum tinggi" },
  { group: "Ginjal & elektrolit", code: "BD-1.2.2", label: "Kreatinin", normal: "0,6 - 1,2", unit: "mg/dL", low: "Kreatinin rendah", high: "Kreatinin tinggi" },
  { group: "Ginjal & elektrolit", code: "BD-1.2.5", label: "Natrium", normal: "135 - 145", unit: "mmol/L", low: "Hiponatremia", high: "Hipernatremia" },
  { group: "Ginjal & elektrolit", code: "BD-1.2.7", label: "Kalium", normal: "3,5 - 5,0", unit: "mmol/L", low: "Hipokalemia", high: "Hiperkalemia" },
  { group: "Lipid", code: "BD-1.7.1", label: "Kolesterol total", normal: "< 200", unit: "mg/dL", low: "", high: "Hiperkolesterolemia" },
  { group: "Lipid", code: "BD-1.7.3", label: "Kolesterol LDL", normal: "< 130", unit: "mg/dL", low: "", high: "LDL tinggi" },
  { group: "Lipid", code: "BD-1.7.2", label: "Kolesterol HDL", normal: "> 40", unit: "mg/dL", low: "HDL rendah", high: "" },
  { group: "Lipid", code: "BD-1.7.7", label: "Trigliserida", normal: "< 150", unit: "mg/dL", low: "", high: "Hipertrigliseridemia" },
  { group: "Hati", code: "BD-1.4.3", label: "SGOT (AST)", normal: "< 40", unit: "U/L", low: "", high: "SGOT meningkat" },
  { group: "Hati", code: "BD-1.4.2", label: "SGPT (ALT)", normal: "< 41", unit: "U/L", low: "", high: "SGPT meningkat" },
  { group: "Feses", code: "BD-1.4", label: "Feses: lendir", normal: "-", unit: "N/A", low: "", high: "Positif (abnormal)" },
  { group: "Feses", code: "BD-1.4", label: "Feses: sisa pencernaan", normal: "-", unit: "N/A", low: "", high: "Positif (abnormal)" },
];

export const PD_PRESETS = [
  { code: "PD-1.1.1", label: "Kesan umum", unit: "" },
  { code: "PD-1.1.21.1", label: "Tekanan darah sistolik", normal: "90 - 120", unit: "mmHg", low: "Hipotensi", high: "Tekanan sistolik tinggi" },
  { code: "PD-1.1.21.2", label: "Tekanan darah diastolik", normal: "60 - 80", unit: "mmHg", low: "Hipotensi", high: "Tekanan diastolik tinggi" },
  { code: "PD-1.1.21.5", label: "Nadi", normal: "60 - 100", unit: "x/menit", low: "Bradikardia", high: "Takikardia" },
  { code: "PD-1.1.21.9", label: "Respirasi", normal: "12 - 20", unit: "x/menit", low: "Bradipnea", high: "Takipnea" },
  { code: "PD-1.1.21.10", label: "Suhu", normal: "36,5 - 37,5", unit: "°C", low: "Hipotermia", high: "Demam" },
  { code: "PD-1.1.5.11", label: "Diare", unit: "" },
  { code: "PD-1.1.5.27", label: "Muntah", unit: "" },
  { code: "PD-1.1.5.10", label: "Nafsu makan menurun", unit: "" },
];

/* ------------------------------------------------------------------ */
/* Interpretasi otomatis                                               */
/* ------------------------------------------------------------------ */
const toNum = (s) => {
  const t = String(s ?? "").trim().replace(/\s/g, "").replace(",", ".");
  return t === "" || Number.isNaN(Number(t)) ? null : Number(t);
};

/** Urai teks nilai normal: "150 - 450", "< 200", "> 40", "-" (negatif) */
export function parseNormal(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  if (["-", "neg", "negatif", "(-)"].includes(t.toLowerCase())) return { type: "qual", expected: "neg" };
  let m = t.match(/^([<>]=?|≤|≥)\s*([\d.,]+)$/);
  if (m) {
    const v = toNum(m[2]);
    return m[1].startsWith("<") || m[1] === "≤" ? { type: "range", min: null, max: v } : { type: "range", min: v, max: null };
  }
  m = t.match(/^([\d.,]+)\s*[-–]\s*([\d.,]+)$/);
  if (m) return { type: "range", min: toNum(m[1]), max: toNum(m[2]) };
  return null;
}

/** Interpretasi otomatis untuk satu baris; mengembalikan { label, tone } atau null */
export function autoInterpret(row) {
  const data = String(row.data ?? "").trim();
  if (!data) return null;
  const normal = parseNormal(row.normal);
  if (normal?.type === "qual") {
    const pos = ["+", "positif", "pos", "(+)", "ada"].includes(data.toLowerCase());
    const neg = ["-", "negatif", "neg", "(-)", "tidak ada"].includes(data.toLowerCase());
    if (pos) return { label: row.high || "Positif (abnormal)", tone: "warning" };
    if (neg) return { label: "Normal", tone: "success" };
    return null;
  }
  const v = toNum(data);
  if (v === null) return null;
  if (row.auto === "bmi") {
    if (v < 18.5) return { label: "Berat badan kurang", tone: "warning" };
    if (v < 23) return { label: "Normal (Asia-Pasifik)", tone: "success" };
    if (v < 25) return { label: "Berisiko (overweight)", tone: "warning" };
    if (v < 30) return { label: "Obesitas I", tone: "error" };
    return { label: "Obesitas II", tone: "error" };
  }
  if (row.auto === "lila") return v < 23.5 ? { label: "Risiko KEK (LILA < 23,5 cm, WUS)", tone: "warning" } : { label: "Normal (WUS)", tone: "success" };
  if (!normal) return null;
  // "ringan" bila menyimpang < 10% dari batas dan labelnya istilah medis (…ia / …osis)
  const mild = (label, pct) => (label && /(ia|osis)$/i.test(label) && pct < 10 ? `${label} ringan` : label);
  if (normal.min !== null && v < normal.min) {
    const pct = normal.min ? ((normal.min - v) / normal.min) * 100 : 0;
    return { label: mild(row.low, pct) || "Di bawah normal", tone: "warning" };
  }
  if (normal.max !== null && v > normal.max) {
    const pct = normal.max ? ((v - normal.max) / normal.max) * 100 : 0;
    return { label: mild(row.high, pct) || "Di atas normal", tone: "warning" };
  }
  return { label: "Normal", tone: "success" };
}
