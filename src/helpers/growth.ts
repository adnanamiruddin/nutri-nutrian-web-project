/**
 * helpers/growth.ts
 * Penilaian status gizi & tren pertumbuhan anak menurut
 * Peraturan Menteri Kesehatan RI No. 2 Tahun 2020 tentang Standar Antropometri Anak.
 *
 * Ketentuan Permenkes yang diterapkan (Bab II–IV):
 * - Standar: WHO Child Growth Standards (0–60 bulan) dan WHO Reference 2007 (5–18 tahun).
 * - Umur dihitung dalam BULAN PENUH (2 bulan 29 hari = 2 bulan).
 * - PB dipakai untuk umur 0–24 bulan (terlentang); bila diukur berdiri, hasil + 0,7 cm.
 *   TB dipakai untuk umur > 24 bulan (berdiri); bila diukur terlentang, hasil − 0,7 cm.
 * - Indeks 0–60 bulan: BB/U, PB/U atau TB/U, BB/PB atau BB/TB, IMT/U.
 *   Indeks 5–18 tahun: IMT/U.
 * - Kategori & ambang batas Z-score sesuai Bab II huruf B.
 * - Nilai −3 SD … +3 SD diambil langsung dari Lampiran Tabel 1–16.
 * - Tren pertumbuhan 0–24 bulan: Tabel 17–19 (kenaikan BB) dan Tabel 20–23 (pertambahan PB).
 * - Rekomendasi tindak lanjut: Bab IV (deteksi dini & tata laksana).
 *
 * Metode perhitungan Z-score:
 * - "permenkes": posisi nilai anak pada garis SD tabel Permenkes (interpolasi linear di antara
 *   dua garis SD yang mengapit nilai).
 * - "rumus": rumus buku ajar Z = (Nilai − Median) ÷ simpang baku rujukan (jarak median ke ±1 SD).
 * - "lms": metode LMS WHO Anthro (0–60 bulan, interpolasi umur harian).
 */
import PMK_RAW from "@/data/growth/permenkes2020.json";
import INC_RAW from "@/data/growth/increment.json";
import WHO_RAW from "@/data/growth/who2006.json";
import { fmt } from "@/helpers/formulas";
import type { Sex, Tone } from "@/types";

/* ---------------- Tipe data rujukan ---------------- */
type SexTables<T> = Record<Sex, T>;
interface PmkTable {
  title: string;
  unit: string;
  /** [x, −3SD, −2SD, −1SD, median, +1SD, +2SD, +3SD] */
  rows: number[][];
}
type PmkKey = "bbu" | "pbu" | "tbu" | "bbpb" | "bbtb" | "imtu_0_24" | "imtu_24_60" | "imtu_5_18";
/** Baris LMS: [x, L, M, S, ...] */
type LmsTable = number[][];
type WhoKey = "wfa" | "lfa" | "hfa" | "wfl" | "wfh" | "bmifa_l" | "bmifa_h";

const PMK = PMK_RAW as unknown as { tables: Record<PmkKey, SexTables<PmkTable>> };
const INC = INC_RAW as unknown as Record<"weight" | "length", Record<string, number[][]>>;
const WHO = WHO_RAW as unknown as Record<WhoKey, SexTables<LmsTable>>;

const DAYS_PER_MONTH = 30.4375;
const SD_LABELS = ["−3 SD", "−2 SD", "−1 SD", "Median", "+1 SD", "+2 SD", "+3 SD"];
const SD_Z = [-3, -2, -1, 0, 1, 2, 3];

export type GrowthMethod = "permenkes" | "rumus" | "lms";

export const METHODS: Record<GrowthMethod, { label: string; short: string }> = {
  permenkes: { label: "Permenkes 2/2020 (posisi pada tabel SD)", short: "Tabel Permenkes" },
  rumus: { label: "Rumus median ± 1 SD (buku ajar)", short: "Rumus median ± 1 SD" },
  lms: { label: "LMS WHO Anthro (0–60 bulan)", short: "LMS WHO" },
};

export type IndicatorKey = "wfa" | "lfa" | "hfa" | "wfl" | "wfh" | "bmi";

/** Kode NCPT untuk tabel pengkajian antropometri */
export const AD_CODES: Record<IndicatorKey, string> = {
  wfa: "AD-1.1.6.14",
  lfa: "AD-1.1.6.8",
  hfa: "AD-1.1.6.10",
  wfl: "AD-1.1.6.12",
  wfh: "AD-1.1.6.16",
  bmi: "AD-1.1.6.2",
};

export interface ZCategory {
  label: string;
  tone: Tone;
  band: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Kategori & ambang batas (Permenkes 2/2020 Bab II huruf B)           */
/* ------------------------------------------------------------------ */
export function classifyBBU(z: number): ZCategory {
  if (z < -3) return { label: "Berat badan sangat kurang (severely underweight)", tone: "error", band: "< −3 SD" };
  if (z < -2) return { label: "Berat badan kurang (underweight)", tone: "warning", band: "−3 SD s.d. < −2 SD" };
  if (z <= 1) return { label: "Berat badan normal", tone: "success", band: "−2 SD s.d. +1 SD" };
  return { label: "Risiko berat badan lebih", tone: "warning", band: "> +1 SD", note: "Perlu dikonfirmasi dengan BB/PB atau BB/TB atau IMT/U." };
}
export function classifyPBU(z: number): ZCategory {
  if (z < -3) return { label: "Sangat pendek (severely stunted)", tone: "error", band: "< −3 SD" };
  if (z < -2) return { label: "Pendek (stunted)", tone: "warning", band: "−3 SD s.d. < −2 SD" };
  if (z <= 3) return { label: "Normal", tone: "success", band: "−2 SD s.d. +3 SD" };
  return { label: "Tinggi", tone: "info", band: "> +3 SD", note: "Rujuk bila diduga gangguan endokrin." };
}
export function classifyBBPB(z: number): ZCategory {
  if (z < -3) return { label: "Gizi buruk (severely wasted)", tone: "error", band: "< −3 SD" };
  if (z < -2) return { label: "Gizi kurang (wasted)", tone: "warning", band: "−3 SD s.d. < −2 SD" };
  if (z <= 1) return { label: "Gizi baik (normal)", tone: "success", band: "−2 SD s.d. +1 SD" };
  if (z <= 2) return { label: "Berisiko gizi lebih (possible risk of overweight)", tone: "warning", band: "> +1 SD s.d. +2 SD" };
  if (z <= 3) return { label: "Gizi lebih (overweight)", tone: "error", band: "> +2 SD s.d. +3 SD" };
  return { label: "Obesitas (obese)", tone: "error", band: "> +3 SD" };
}
/** IMT/U 0–60 bulan memakai kategori yang sama dengan BB/PB */
export const classifyIMTUBalita = classifyBBPB;
export function classifyIMTU518(z: number): ZCategory {
  if (z < -3) return { label: "Gizi buruk (severely thinness)", tone: "error", band: "< −3 SD" };
  if (z < -2) return { label: "Gizi kurang (thinness)", tone: "warning", band: "−3 SD s.d. < −2 SD" };
  if (z <= 1) return { label: "Gizi baik (normal)", tone: "success", band: "−2 SD s.d. +1 SD" };
  if (z <= 2) return { label: "Gizi lebih (overweight)", tone: "warning", band: "+1 SD s.d. +2 SD" };
  return { label: "Obesitas (obese)", tone: "error", band: "> +2 SD" };
}

/* ------------------------------------------------------------------ */
/* Pembacaan tabel                                                     */
/* ------------------------------------------------------------------ */
function tableOf(key: PmkKey, sex: Sex): PmkTable | null {
  return PMK.tables[key]?.[sex === "male" ? "male" : "female"] || null;
}

/** Baris tabel dengan x tepat (umur) atau terdekat (PB/TB, kelipatan 0,5 cm) */
function rowAt(tbl: PmkTable | null, x: number, exact = true): number[] | null {
  if (!tbl) return null;
  const rows = tbl.rows;
  if (exact) return rows.find((r) => r[0] === x) || null;
  if (x < rows[0][0] - 0.25 || x > rows[rows.length - 1][0] + 0.25) return null;
  return rows.reduce((best, r) => (Math.abs(r[0] - x) < Math.abs(best[0] - x) ? r : best), rows[0]);
}

const signed = (z: number) => `${z > 0 ? "+" : ""}${fmt(z)}`;

/** Letak nilai pada garis SD tabel, mis. "antara −2 SD (7,9) dan −1 SD (8,8)" */
function bandText(X: number, sd: number[], unit: string): string {
  const v = (i: number) => `${SD_LABELS[i]} (${fmt(sd[i])} ${unit})`;
  if (X < sd[0]) return `${fmt(X)} ${unit} < ${v(0)}`;
  if (X > sd[6]) return `${fmt(X)} ${unit} > ${v(6)}`;
  for (let i = 0; i < 7; i += 1) if (X === sd[i]) return `${fmt(X)} ${unit} tepat pada ${v(i)}`;
  for (let i = 0; i < 6; i += 1) if (X > sd[i] && X < sd[i + 1]) return `${fmt(X)} ${unit} di antara ${v(i)} dan ${v(i + 1)}`;
  return "";
}

interface ZResult {
  z: number;
  step: string;
  num?: string;
  den?: string;
  base?: number;
}

/** Z-score metode Permenkes: interpolasi linear di antara garis SD yang mengapit nilai */
function zPermenkes(X: number, sd: number[], label: string): ZResult {
  let lo: number;
  if (X <= sd[0]) lo = 0;
  else if (X >= sd[6]) lo = 5;
  else lo = sd.findIndex((v, i) => i < 6 && X >= v && X <= sd[i + 1]);
  const hi = lo + 1;
  const z = SD_Z[lo] + (X - sd[lo]) / (sd[hi] - sd[lo]);
  if (lo === 2 || lo === 3) {
    // di antara −1 SD dan +1 SD: sama dengan (Nilai − Median) ÷ jarak median ke ±1 SD
    const num = `${fmt(X)} − ${fmt(sd[3])}`;
    const den = lo === 2 ? `${fmt(sd[3])} − ${fmt(sd[2])}` : `${fmt(sd[4])} − ${fmt(sd[3])}`;
    return { z, num, den, base: 0, step: `${label} = (${num}) ÷ (${den}) = ${signed(z)} SD` };
  }
  const num = `${fmt(X)} − ${fmt(sd[lo])}`;
  const den = `${fmt(sd[hi])} − ${fmt(sd[lo])}`;
  const base = SD_Z[lo];
  return { z, num, den, base, step: `${label} = (${base > 0 ? "+" : "−"}${Math.abs(base)}) + (${num}) ÷ (${den}) = ${signed(z)} SD` };
}

/** Z-score rumus buku: (Nilai − Median) ÷ (Median − (−1 SD)) atau ÷ ((+1 SD) − Median) */
function zRumus(X: number, sd: number[], label: string): ZResult {
  const below = X < sd[3];
  const den = below ? sd[3] - sd[2] : sd[4] - sd[3];
  const z = (X - sd[3]) / den;
  const numT = `${fmt(X)} − ${fmt(sd[3])}`;
  const denT = below ? `${fmt(sd[3])} − ${fmt(sd[2])}` : `${fmt(sd[4])} − ${fmt(sd[3])}`;
  return { z, step: `${label} = (${numT}) ÷ (${denT}) = ${signed(z)} SD`, num: numT, den: denT, base: 0 };
}

/* ---------------- LMS (opsional, 0–60 bulan) ---------------- */
interface Lms {
  L: number;
  M: number;
  S: number;
}
const valueAtZ = ({ L, M, S }: Lms, z: number) => (L === 0 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L));
function lmsAt(table: LmsTable | undefined, x: number): Lms | null {
  if (!table?.length || x < table[0][0] - 1e-9 || x > table[table.length - 1][0] + 1e-9) return null;
  for (let i = 0; i < table.length - 1; i += 1) {
    const lo = table[i];
    const hi = table[i + 1];
    if (x >= lo[0] && x <= hi[0]) {
      const t = hi[0] === lo[0] ? 0 : (x - lo[0]) / (hi[0] - lo[0]);
      const lerp = (a: number, b: number) => a + (b - a) * t;
      return { L: lerp(lo[1], hi[1]), M: lerp(lo[2], hi[2]), S: lerp(lo[3], hi[3]) };
    }
  }
  const r = table[table.length - 1];
  return { L: r[1], M: r[2], S: r[3] };
}
function zLms(X: number, lms: Lms, restricted: boolean | undefined, label: string): ZResult {
  const { L, M, S } = lms;
  let z = L === 0 ? Math.log(X / M) / S : ((X / M) ** L - 1) / (L * S);
  if (restricted && z > 3) {
    const sd3 = valueAtZ(lms, 3);
    z = 3 + (X - sd3) / (sd3 - valueAtZ(lms, 2));
  } else if (restricted && z < -3) {
    const sd3n = valueAtZ(lms, -3);
    z = -3 + (X - sd3n) / (valueAtZ(lms, -2) - sd3n);
  }
  // Koefisien LMS sengaja ditampilkan lebih presisi (parameter model, bukan hasil hitung)
  return { z, step: `${label} = ((${fmt(X)} ÷ ${fmt(M, 3)})^${fmt(L, 4)} − 1) ÷ (${fmt(L, 4)} × ${fmt(S, 5)}) = ${signed(z)} SD` };
}

/* ------------------------------------------------------------------ */
/* Tren pertumbuhan 0–24 bulan (Bab III, Tabel 17–23)                  */
/* ------------------------------------------------------------------ */
type IncrementKind = "weight" | "length";

const INC_TABLES: Record<IncrementKind, Record<number, string>> = {
  weight: { 3: "Tabel 17", 4: "Tabel 18", 6: "Tabel 19" },
  length: { 2: "Tabel 20", 3: "Tabel 21", 4: "Tabel 22", 6: "Tabel 23" },
};

export type TrendStatus = "ok" | "risk" | "na";

export interface IncrementResult {
  kind: IncrementKind;
  interval: number;
  gain: number;
  unit: string;
  fromMonth: number;
  toMonth: number;
  status: TrendStatus;
  message: string;
  standard?: number;
  table?: string;
  step?: string;
}

export function assessIncrement({
  kind,
  sex,
  fromMonth,
  toMonth,
  before,
  after,
}: {
  kind: IncrementKind;
  sex: Sex;
  fromMonth: number;
  toMonth: number;
  before: number;
  after: number;
}): IncrementResult {
  const interval = toMonth - fromMonth;
  const isW = kind === "weight";
  const allowed = Object.keys(INC_TABLES[kind]).map(Number);
  const gain = isW ? Math.round((after - before) * 1000) : Math.round((after - before) * 10) / 10;
  const unit = isW ? "g" : "cm";
  const base = { kind, interval, gain, unit, fromMonth, toMonth };
  if (toMonth > 24) return { ...base, status: "na", message: "Tabel kenaikan hanya untuk umur 0–24 bulan." };
  if (!allowed.includes(interval)) {
    return { ...base, status: "na", message: `Interval ${interval} bulan tidak ada di tabel. Gunakan interval ${allowed.join(", ")} bulan.` };
  }
  const row = INC[kind][String(interval)].find((r) => r[0] === fromMonth);
  if (!row) return { ...base, status: "na", message: "Interval umur tidak tersedia di tabel." };
  const standard = sex === "male" ? row[2] : row[3];
  const ok = gain >= standard;
  return {
    ...base,
    standard,
    table: INC_TABLES[kind][interval],
    status: ok ? "ok" : "risk",
    message: ok
      ? `${isW ? "Kenaikan berat badan" : "Pertambahan panjang badan"} memenuhi standar`
      : isW
        ? "Kenaikan BB kurang dari standar: berisiko gagal tumbuh (at risk failure to thrive)"
        : "Pertambahan PB kurang dari standar: berisiko perlambatan pertumbuhan linear",
    step: `${isW ? "Kenaikan BB" : "Pertambahan PB"} ${fromMonth}–${toMonth} bulan = ${fmt(after)} − ${fmt(before)} = ${fmt(gain)} ${unit}; standar ${INC_TABLES[kind][interval]} = ${fmt(standard)} ${unit} → ${ok ? "memenuhi" : "di bawah"} standar`,
  };
}

/* ------------------------------------------------------------------ */
/* Hasil penilaian                                                     */
/* ------------------------------------------------------------------ */
export interface GrowthIndicator {
  key: IndicatorKey;
  code: string;
  label: string;
  measure: number;
  unit: string;
  table?: string;
  z: number | null;
  note?: string;
  sd?: number[];
  rowX?: number;
  position?: string;
  num?: string;
  den?: string;
  base?: number;
  category?: ZCategory;
}

export interface GrowthAssessment {
  months: number;
  monthsUsed: number;
  method: GrowthMethod;
  methodUsed?: GrowthMethod;
  standard: string | null;
  indicators: GrowthIndicator[];
  notes: string[];
  steps: string[];
  trend: { weight?: IncrementResult; length?: IncrementResult };
  recommendations: string[];
  bmi?: number;
  heightUsed?: number;
  ibw?: number;
}

/* ------------------------------------------------------------------ */
/* Rekomendasi tindak lanjut (Bab IV)                                  */
/* ------------------------------------------------------------------ */
function recommendations(ind: GrowthIndicator[], trend: GrowthAssessment["trend"], months: number): string[] {
  const get = (k: IndicatorKey) => ind.find((i): i is GrowthIndicator & { z: number } => i.key === k && i.z !== null);
  const out: string[] = [];
  const bbu = get("wfa");
  const pbu = get("lfa") || get("hfa");
  const bbpb = get("wfl") || get("wfh");
  const imt = get("bmi");
  if (bbu && (bbu.z < -2 || bbu.z > 1)) out.push("BB/U < −2 SD atau > +1 SD: konfirmasi oleh petugas kesehatan dengan menilai seluruh indeks (BB/U, PB/U atau TB/U, BB/PB atau BB/TB, IMT/U).");
  if (bbu && bbu.z > 1 && months > 7) out.push("BB/U > +1 SD pada anak > 7–8 bulan: nilai tren IMT/U.");
  if (bbu && bbu.z >= -2 && bbu.z <= 1) out.push("BB/U −2 s.d. +1 SD (normal): pantau tren pertumbuhan. Bila tidak naik atau tidak ditimbang bulan sebelumnya, nilai kenaikan BB terhadap standar weight increment (0–24 bulan).");
  if (bbpb && bbpb.z < -2) out.push(`${bbpb.label} < −2 SD (${bbpb.z < -3 ? "gizi buruk" : "gizi kurang"}): wajib intervensi pencegahan dan tata laksana gizi buruk pada balita, atau dirujuk.`);
  if (imt && imt.z > 1) out.push("IMT/U > +1 SD: berisiko kenaikan lemak tubuh dini (early adiposity rebound); wajib intervensi pencegahan dan tata laksana gizi lebih, atau dirujuk.");
  if (pbu && pbu.z < -2) out.push(`${pbu.label} < −2 SD: perawakan pendek (short stature); wajib tata laksana stunting dan dirujuk.`);
  if (pbu && pbu.z > 3) out.push(`${pbu.label} > +3 SD: perawakan tinggi; rujuk ke fasyankes yang lebih tinggi untuk deteksi dini penyebab.`);
  if (pbu && pbu.z >= -2 && pbu.z <= 3) out.push(`${pbu.label} normal: pantau tren. Bila tidak naik, nilai pertambahan panjang/tinggi badan terhadap standar (0–24 bulan).`);
  if (trend.weight?.status === "risk") out.push("Kenaikan BB < standar weight increment: berisiko gagal tumbuh; wajib evaluasi lengkap melalui Proses Asuhan Gizi dan pemeriksaan penyakit penyerta, atau dirujuk.");
  if (trend.length?.status === "risk") out.push("Pertambahan PB < standar length increment: berisiko perlambatan pertumbuhan linear; wajib evaluasi lengkap melalui Proses Asuhan Gizi, atau dirujuk.");
  return out;
}

/* ------------------------------------------------------------------ */
/* Penilaian utama                                                     */
/* ------------------------------------------------------------------ */
export interface GrowthInput {
  /** umur (hari) */
  ageDays: number;
  sex: Sex;
  /** kg */
  weight: number;
  /** cm (hasil ukur) */
  height: number;
  measured?: "recumbent" | "standing";
  method?: GrowthMethod;
  /** pengukuran sebelumnya (tren) */
  previous?: { month: number; weight?: number; height?: number } | null;
}

export function assessGrowth({ ageDays, sex, weight, height, measured = "recumbent", method = "permenkes", previous }: GrowthInput): GrowthAssessment {
  const exactMonths = ageDays / DAYS_PER_MONTH;
  const months = Math.floor(exactMonths + 1e-9);
  const s: Sex = sex === "male" ? "male" : "female";
  const out: GrowthAssessment = { months: exactMonths, monthsUsed: months, method, standard: null, indicators: [], notes: [], steps: [], trend: {}, recommendations: [] };
  if (!(ageDays >= 0) || !(weight > 0) || !(height > 0)) return out;

  const usePB = months <= 24; // Permenkes: PB untuk 0–24 bulan, TB untuk > 24 bulan
  let h = height;
  if (months <= 60) {
    if (usePB && measured === "standing") {
      h = height + 0.7;
      out.notes.push("Umur 0–24 bulan diukur berdiri: hasil dikoreksi + 0,7 cm (Permenkes Bab II).");
    } else if (!usePB && measured === "recumbent") {
      h = height - 0.7;
      out.notes.push("Umur > 24 bulan diukur terlentang: hasil dikoreksi − 0,7 cm (Permenkes Bab II).");
    }
  }
  h = Math.round(h * 10) / 10;
  const hRow = Math.round(h * 2) / 2; // baris tabel BB/PB & BB/TB berjarak 0,5 cm
  const bmiVal = weight / (h / 100) ** 2;
  out.bmi = bmiVal;
  out.heightUsed = h;

  const effMethod: GrowthMethod = method === "lms" && months > 60 ? "permenkes" : method;
  if (method === "lms" && months > 60) out.notes.push("Metode LMS hanya tersedia untuk 0–60 bulan; umur ini memakai tabel Permenkes.");
  out.methodUsed = effMethod;
  out.steps.push(`Umur ${Math.floor(exactMonths / 12)} tahun ${Math.floor(exactMonths % 12)} bulan dibaca ${months} bulan penuh (Permenkes Bab II).`);
  if (effMethod === "permenkes") {
    out.steps.push("Z-score = letak nilai di antara dua garis SD tabel Permenkes: Z = Z garis bawah + (Nilai − nilai garis bawah) ÷ (nilai garis atas − nilai garis bawah). Di antara −1 SD dan +1 SD rumus ini sama dengan (Nilai − Median) ÷ (Median − (−1 SD)) atau ÷ ((+1 SD) − Median).");
  } else if (effMethod === "rumus") {
    out.steps.push("Z = (Nilai − Median) ÷ (Median − (−1 SD)) bila nilai < median; Z = (Nilai − Median) ÷ ((+1 SD) − Median) bila nilai ≥ median.");
  }

  const add = ({
    key, label, measure, unit, tblKey, x, exact = true, classify, lmsTable, lmsX = x, restricted,
  }: {
    key: IndicatorKey;
    label: string;
    measure: number;
    unit: string;
    tblKey: PmkKey;
    x: number;
    exact?: boolean;
    classify: (z: number) => ZCategory;
    lmsTable?: LmsTable;
    lmsX?: number;
    restricted?: boolean;
  }): number[] | null => {
    const tbl = tableOf(tblKey, s);
    const row = rowAt(tbl, x, exact);
    const base = { key, code: AD_CODES[key], label, measure, unit, table: tbl?.title };
    if (!row || !tbl) {
      out.indicators.push({
        ...base,
        z: null,
        note: exact ? "Umur di luar rentang tabel" : `${usePB ? "PB" : "TB"} ${fmt(h)} cm di luar rentang tabel (${tbl?.rows[0][0]}–${tbl?.rows[tbl.rows.length - 1][0]} cm)`,
      });
      return null;
    }
    const sd = row.slice(1);
    let res: ZResult;
    if (effMethod === "lms") {
      const lms = lmsAt(lmsTable, lmsX);
      res = lms ? zLms(measure, lms, restricted, label) : zPermenkes(measure, sd, label);
    } else if (effMethod === "rumus") res = zRumus(measure, sd, label);
    else res = zPermenkes(measure, sd, label);
    const cat = classify(res.z);
    out.steps.push(`${tbl.title}, baris ${fmt(row[0])}: ${bandText(measure, sd, unit)}.`);
    out.steps.push(`${res.step} → ${cat.label}`);
    out.indicators.push({ ...base, z: res.z, sd, rowX: row[0], position: bandText(measure, sd, unit), num: res.num, den: res.den, base: res.base, category: cat });
    return sd;
  };

  if (months <= 60) {
    out.standard = "WHO Child Growth Standards (Permenkes 2/2020, 0–60 bulan)";
    add({ key: "wfa", label: "BB/U", measure: weight, unit: "kg", tblKey: "bbu", x: months, classify: classifyBBU, lmsTable: WHO.wfa[s], lmsX: exactMonths, restricted: true });
    add({ key: usePB ? "lfa" : "hfa", label: usePB ? "PB/U" : "TB/U", measure: h, unit: "cm", tblKey: usePB ? "pbu" : "tbu", x: months, classify: classifyPBU, lmsTable: usePB ? WHO.lfa[s] : WHO.hfa[s], lmsX: exactMonths });
    const wh = add({ key: usePB ? "wfl" : "wfh", label: usePB ? "BB/PB" : "BB/TB", measure: weight, unit: "kg", tblKey: usePB ? "bbpb" : "bbtb", x: hRow, exact: false, classify: classifyBBPB, lmsTable: usePB ? WHO.wfl[s] : WHO.wfh[s], lmsX: Math.round(h * 10) / 10, restricted: true });
    add({ key: "bmi", label: "IMT/U", measure: bmiVal, unit: "kg/m²", tblKey: usePB ? "imtu_0_24" : "imtu_24_60", x: months, classify: classifyIMTUBalita, lmsTable: usePB ? WHO.bmifa_l[s] : WHO.bmifa_h[s], lmsX: exactMonths, restricted: true });
    if (wh) {
      out.ibw = wh[3];
      out.steps.push(`BBI anak = median ${usePB ? "BB/PB" : "BB/TB"} pada ${fmt(hRow)} cm = ${fmt(wh[3])} kg`);
    }
  } else if (months <= 228) {
    out.standard = "WHO Reference 2007 (Permenkes 2/2020, 5–18 tahun)";
    const sd = add({ key: "bmi", label: "IMT/U", measure: bmiVal, unit: "kg/m²", tblKey: "imtu_5_18", x: months, classify: classifyIMTU518 });
    out.notes.push("Untuk umur 5–18 tahun, Permenkes 2/2020 hanya menetapkan indeks IMT/U.");
    if (sd) {
      out.ibw = sd[3] * (h / 100) ** 2;
      out.steps.push(`BBI = median IMT/U × TB² = ${fmt(sd[3])} × (${fmt(h / 100)})² = ${fmt(out.ibw)} kg`);
    }
  } else {
    out.notes.push("Umur di atas 18 tahun: gunakan IMT dewasa (menu Status Gizi Dewasa).");
  }
  out.steps.splice(1, 0, `IMT = ${fmt(weight)} ÷ (${fmt(h / 100)})² = ${fmt(bmiVal)} kg/m²`);

  // Tren pertumbuhan (0–24 bulan)
  if (previous && previous.month >= 0 && previous.month < months) {
    if (previous.weight !== undefined && previous.weight > 0) {
      out.trend.weight = assessIncrement({ kind: "weight", sex: s, fromMonth: previous.month, toMonth: months, before: previous.weight, after: weight });
      if (out.trend.weight.step) out.steps.push(out.trend.weight.step);
    }
    if (previous.height !== undefined && previous.height > 0) {
      out.trend.length = assessIncrement({ kind: "length", sex: s, fromMonth: previous.month, toMonth: months, before: previous.height, after: h });
      if (out.trend.length.step) out.steps.push(out.trend.length.step);
    }
  }
  out.recommendations = recommendations(out.indicators, out.trend, months);
  return out;
}

export const SD_HEADERS = SD_LABELS;
