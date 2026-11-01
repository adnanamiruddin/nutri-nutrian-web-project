/**
 * Batas wajar input angka (penjagaan error). Nilai di luar rentang ditolak sebelum dihitung
 * agar rumus tidak menghasilkan angka janggal atau error. Rumusnya sendiri tidak diubah.
 */
export interface InputLimit {
  label: string;
  min: number;
  max: number;
  unit?: string;
  /** true: nilai harus lebih besar dari min (bukan sama dengan) */
  exclusiveMin?: boolean;
}

export const LIMITS = {
  age: { label: "Umur", min: 0, max: 120, unit: "tahun" },
  weight: { label: "Berat badan", min: 0, max: 500, unit: "kg", exclusiveMin: true },
  height: { label: "Tinggi badan", min: 30, max: 272, unit: "cm" },
  usualWeight: { label: "BB biasa / sebelumnya", min: 0, max: 500, unit: "kg", exclusiveMin: true },
  prePregWeight: { label: "BB pra-hamil", min: 0, max: 500, unit: "kg", exclusiveMin: true },
  bodyFat: { label: "% lemak tubuh", min: 0, max: 79, unit: "%" },
  tbsa: { label: "Luas luka bakar (TBSA)", min: 0, max: 100, unit: "%" },
  customFs: { label: "Faktor stres manual", min: 0, max: 3, exclusiveMin: true },
  espenKcal: { label: "ESPEN", min: 0, max: 60, unit: "kkal/kg", exclusiveMin: true },
  proteinPerKg: { label: "Protein", min: 0, max: 5, unit: "g/kg" },
  fatPct: { label: "Lemak", min: 0, max: 100, unit: "% energi" },
  carbPct: { label: "Karbohidrat", min: 0, max: 100, unit: "%" },
  proteinPct: { label: "Protein", min: 0, max: 100, unit: "%" },
  weightAdj: { label: "Koreksi status berat badan", min: 0, max: 100, unit: "%" },
  creatinine: { label: "Kreatinin serum", min: 0, max: 40, unit: "mg/dL", exclusiveMin: true },
  kcalPerKg: { label: "Energi", min: 0, max: 60, unit: "kkal/kg", exclusiveMin: true },
  peritonealLoss: { label: "Kehilangan protein peritoneal", min: 0, max: 50, unit: "g/hari" },
  totalKcal: { label: "Total energi", min: 0, max: 10000, unit: "kkal", exclusiveMin: true },
  proteinG: { label: "Total protein", min: 0, max: 1000, unit: "g", exclusiveMin: true },
  dextroseG: { label: "Dekstrosa", min: 0, max: 2000, unit: "g/hari" },
  aminoG: { label: "Asam amino", min: 0, max: 1000, unit: "g" },
  lipidG: { label: "Lipid", min: 0, max: 1000, unit: "g" },
  infusionHours: { label: "Lama infus", min: 0, max: 24, unit: "jam", exclusiveMin: true },
  volumeMl: { label: "Volume total", min: 0, max: 10000, unit: "mL", exclusiveMin: true },
  electrolyte: { label: "Na + K", min: 0, max: 2000, unit: "mEq" },
  pregnancyWeek: { label: "Usia kehamilan", min: 1, max: 45, unit: "minggu" },
  babyMonth: { label: "Usia bayi", min: 0, max: 24, unit: "bulan" },
  energyOverride: { label: "Energi dasar manual", min: 0, max: 10000, unit: "kkal" },
  childMonths: { label: "Umur", min: 0, max: 300, unit: "bulan" },
  childWeight: { label: "Berat badan", min: 0, max: 200, unit: "kg", exclusiveMin: true },
  childHeight: { label: "Panjang/tinggi badan", min: 30, max: 230, unit: "cm" },
  prevMonth: { label: "Umur pengukuran sebelumnya", min: 0, max: 300, unit: "bulan" },
  prevWeight: { label: "BB sebelumnya", min: 0, max: 200, unit: "kg", exclusiveMin: true },
  prevHeight: { label: "PB sebelumnya", min: 30, max: 230, unit: "cm" },
  rxEnergy: { label: "Energi preskripsi", min: 0, max: 10000, unit: "kkal", exclusiveMin: true },
  foodGram: { label: "Berat/porsi bahan makanan", min: 0, max: 5000, unit: "g" },
  frequency: { label: "Frekuensi", min: 0, max: 100 },
  portion: { label: "Hitung untuk", min: 0, max: 10000, unit: "g" },
} satisfies Record<string, InputLimit>;
