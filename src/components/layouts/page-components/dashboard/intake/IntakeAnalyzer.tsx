import { useMemo, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import FoodPicker from "@/components/layouts/page-components/dashboard/search/FoodPicker";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { TONE_COLOR, barConfig } from "@/components/utils/generals/charts/chart-configs";
import Field, { NumberField, SelectField } from "@/components/utils/generals/Field";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import { useApp } from "@/context/AppContext";
import { FREQ_FACTORS, adequacyCategory, fmt, num, round } from "@/helpers/formulas";
import type { FreqPeriod } from "@/helpers/formulas";
import { AKG } from "@/helpers/reference-data";
import type { AkgItem } from "@/helpers/reference-data";
import { validateRanges } from "@/helpers/validation";
import useFoods from "@/hooks/useFoods";
import type { Food, NutrientKey, ReportRecord, Sex, Tone } from "@/types";

type CompareKey = "energi" | "protein" | "lemak" | "karbohidrat" | "serat" | "kalsium" | "besi" | "vitC";

const COMPARE: { key: CompareKey; label: string; unit: string }[] = [
  { key: "energi", label: "Energi", unit: "kkal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "lemak", label: "Lemak", unit: "g" },
  { key: "karbohidrat", label: "Karbohidrat", unit: "g" },
  { key: "serat", label: "Serat", unit: "g" },
  { key: "kalsium", label: "Kalsium", unit: "mg" },
  { key: "besi", label: "Besi", unit: "mg" },
  { key: "vitC", label: "Vitamin C", unit: "mg" },
];
const TONE: Partial<Record<Tone, string>> = { success: "progress-success", warning: "progress-warning", error: "progress-error" };
const BADGE: Partial<Record<Tone, string>> = { success: "badge-success", warning: "badge-warning", error: "badge-error" };
const MEALS = ["Pagi", "Selingan pagi", "Siang", "Selingan sore", "Malam"];

type Mode = "recall" | "ffq";
type TargetSource = "akg" | "rx";

interface IntakeRow {
  id: string;
  kode: string;
  qty: string;
  freq: string;
  period: FreqPeriod;
  meal: string;
}

interface IntakeItem extends IntakeRow {
  food: Food;
  grams: number;
  g: Record<NutrientKey, number | null>;
}

type Target = Partial<Record<CompareKey, number>> & { sourceLabel: string };

let rowSeq = 0;
const newRow = (): IntakeRow => ({ id: `r${(rowSeq += 1)}`, kode: "", qty: "", freq: "1", period: "day", meal: "Pagi" });

function findAkg(sex: Sex, age: number): AkgItem | null {
  if (!(age >= 1)) return null;
  return AKG.items.find((a) => (a.sex === "all" || a.sex === sex) && age >= a.minAge && age <= a.maxAge) || null;
}

export default function IntakeAnalyzer() {
  const { patient } = useApp();
  const { byCode: FOOD_BY_CODE } = useFoods();
  const [mode, setMode] = useState<Mode>("recall");
  const [rows, setRows] = useState<IntakeRow[]>([newRow()]);
  const [targetSrc, setTargetSrc] = useState<TargetSource>("akg");
  const [akgIdx, setAkgIdx] = useState("auto");
  const [rx, setRx] = useState({ energi: "", proteinPct: "15", fatPct: "25" });

  const setRow = <K extends keyof IntakeRow>(id: string, key: K, v: IntakeRow[K]) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: v } : r)));

  /* ---------- Penjagaan input ---------- */
  const errors = useMemo(() => {
    const list = validateRanges([
      ...(targetSrc === "rx"
        ? [
            { value: rx.energi, limit: LIMITS.rxEnergy },
            { value: rx.proteinPct, limit: LIMITS.proteinPct },
            { value: rx.fatPct, limit: LIMITS.fatPct, label: "Lemak" },
          ]
        : []),
      ...rows.flatMap((r, i) => [
        { value: r.qty, limit: LIMITS.foodGram, label: `${mode === "ffq" ? "Porsi" : "Berat"} bahan makanan ${i + 1}` },
        ...(mode === "ffq" ? [{ value: r.freq, limit: LIMITS.frequency, label: `Frekuensi bahan makanan ${i + 1}` }] : []),
      ]),
    ]);
    return list;
  }, [rows, mode, rx, targetSrc]);

  /* ---------- Hitung asupan ---------- */
  const calc = useMemo(() => {
    const items: IntakeItem[] = errors.length
      ? []
      : rows
          .map((r) => {
            const food = FOOD_BY_CODE[r.kode];
            if (!food) return null;
            let grams = num(r.qty) || 0;
            if (mode === "ffq") grams *= (num(r.freq) || 0) * FREQ_FACTORS[r.period].factor;
            // null = tidak ada data di TKPI → dihitung 0 dan dicatat
            const g = Object.fromEntries(Object.entries(food.gizi).map(([k, v]) => [k, v === null ? null : (v * grams) / 100])) as IntakeItem["g"];
            return { ...r, food, grams, g };
          })
          .filter((x): x is IntakeItem => x !== null);
    const total = Object.fromEntries(COMPARE.map((c) => [c.key, items.reduce((s, i) => s + (i.g[c.key] || 0), 0)])) as Record<CompareKey, number>;
    const missing = Object.fromEntries(COMPARE.map((c) => [c.key, items.filter((i) => i.g[c.key] === null).length])) as Record<CompareKey, number>;
    return { items, total, natrium: items.reduce((s, i) => s + (i.g.natrium || 0), 0), missing };
  }, [rows, mode, FOOD_BY_CODE, errors]);

  /* ---------- Target ---------- */
  const autoAkg = findAkg(patient.sex, num(patient.age));
  const akgRow = akgIdx === "auto" ? autoAkg : AKG.items[Number(akgIdx)];
  const target = useMemo((): Target | null => {
    if (targetSrc === "akg") return akgRow ? { ...akgRow, sourceLabel: `AKG 2019: ${akgRow.label}` } : null;
    if (errors.length) return null;
    const e = num(rx.energi);
    if (!(e > 0)) return null;
    const p = (e * (num(rx.proteinPct) || 0)) / 100 / 4;
    const l = (e * (num(rx.fatPct) || 0)) / 100 / 9;
    const k = (e - p * 4 - l * 9) / 4;
    return {
      energi: e,
      protein: p,
      lemak: l,
      karbohidrat: k,
      serat: akgRow?.serat,
      kalsium: akgRow?.kalsium,
      besi: akgRow?.besi,
      vitC: akgRow?.vitC,
      sourceLabel: `Preskripsi ${fmt(e)} kkal (mikro: ${akgRow ? `AKG ${akgRow.label}` : "–"})`,
    };
  }, [targetSrc, rx, akgRow, errors]);

  const compare = useMemo(
    () =>
      COMPARE.map((c) => {
        const t = target?.[c.key];
        const pct = t !== undefined && t > 0 ? (calc.total[c.key] / t) * 100 : null;
        return { ...c, intake: calc.total[c.key], target: t, pct, cat: adequacyCategory(pct) };
      }),
    [calc, target],
  );

  const hasData = calc.items.length > 0;

  const adequacyChart = useMemo(() => {
    const withPct = compare.filter((c) => c.pct !== null);
    if (!hasData || !withPct.length) return null;
    return barConfig({
      labels: withPct.map((c) => c.label),
      unit: "% kecukupan",
      min: 0,
      series: [
        {
          label: "Tingkat kecukupan",
          data: withPct.map((c) => c.pct),
          color: withPct.map((c) => (c.cat ? TONE_COLOR[c.cat.tone] : THEME_COLORS.primary)),
        },
      ],
    });
  }, [compare, hasData]);

  const record = (): ReportRecord => ({
    type: "asupan",
    title: `${mode === "ffq" ? "SQ-FFQ" : "Recall 24 jam"}: ${fmt(calc.total.energi)} kkal (${calc.items.length} item)`,
    input: {
      Metode: mode === "ffq" ? "SQ-FFQ" : "Recall 24 jam",
      Target: target?.sourceLabel || "Belum ditentukan",
    },
    output: Object.fromEntries(
      compare.map((c) => [`${c.label} (${c.unit})`, `${fmt(c.intake)}${c.pct !== null ? ` (${fmt(c.pct)}%, ${c.cat?.label})` : ""}`]),
    ),
    tables: [
      {
        title: "Daftar asupan",
        columns:
          mode === "ffq"
            ? ["Kode", "Bahan makanan", "Porsi (g)", "Frekuensi", "g/hari", "Energi (kkal)", "Protein (g)", "Lemak (g)", "KH (g)"]
            : ["Waktu", "Kode", "Bahan makanan", "Berat (g)", "Energi (kkal)", "Protein (g)", "Lemak (g)", "KH (g)"],
        rows: calc.items.map((i) => [
          ...(mode === "ffq" ? [] : [i.meal]),
          i.food.kode,
          i.food.nama,
          ...(mode === "ffq" ? [num(i.qty), `${i.freq} ${FREQ_FACTORS[i.period].label}`] : []),
          round(i.grams),
          round(i.g.energi || 0),
          round(i.g.protein || 0),
          round(i.g.lemak || 0),
          round(i.g.karbohidrat || 0),
        ]),
      },
      {
        title: "Tingkat kecukupan",
        columns: ["Zat gizi", "Asupan", "Target", "% kecukupan", "Kategori"],
        rows: compare.map((c) => [`${c.label} (${c.unit})`, fmt(c.intake), c.target ? fmt(c.target) : "–", c.pct !== null ? `${fmt(c.pct)}%` : "–", c.cat?.label || "–"]),
      },
    ],
    steps: [
      "Asupan zat gizi = berat (g) ÷ 100 × kandungan per 100 g BDD (TKPI)",
      "% kecukupan = asupan ÷ target × 100%",
      "Kategori: <70% defisit berat, 70–79% sedang, 80–89% ringan, 90–119% normal, ≥120% lebih (Depkes 1996)",
    ],
  });

  return (
    <div className="space-y-6">
      {/* Target / preskripsi */}
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body gap-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Preskripsi / target kebutuhan</h2>
            <div className="tabs tabs-box tabs-sm" role="tablist">
              {(
                [
                  ["akg", "AKG 2019"],
                  ["rx", "Preskripsi sendiri"],
                ] as [TargetSource, string][]
              ).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={targetSrc === k} className={`tab ${targetSrc === k ? "tab-active" : ""}`} onClick={() => setTargetSrc(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-x-4 md:grid-cols-4">
            <SelectField
              className="md:col-span-2"
              label="Kelompok AKG"
              value={akgIdx}
              onChange={setAkgIdx}
              hint={akgIdx === "auto" && !autoAkg ? "Isi umur & jenis kelamin di profil pasien, atau pilih kelompok manual." : undefined}
              options={[
                { value: "auto", label: `Otomatis dari profil${autoAkg ? ` (${autoAkg.label})` : ""}` },
                ...AKG.items.map((a, i) => ({ value: String(i), label: a.label })),
              ]}
            />
            {targetSrc === "rx" && (
              <>
                <NumberField label="Energi" unit="kkal" value={rx.energi} onChange={(v) => setRx((s) => ({ ...s, energi: v }))} />
                <div className="grid grid-cols-2 gap-x-3">
                  <NumberField label="Protein" unit="%" value={rx.proteinPct} onChange={(v) => setRx((s) => ({ ...s, proteinPct: v }))} />
                  <NumberField label="Lemak" unit="%" value={rx.fatPct} onChange={(v) => setRx((s) => ({ ...s, fatPct: v }))} />
                </div>
              </>
            )}
          </div>
          {target && targetSrc === "rx" && (
            <p className="text-sm tabular-nums text-base-content/70">
              Protein {fmt(target.protein)} g, lemak {fmt(target.lemak)} g, karbohidrat {fmt(target.karbohidrat)} g
            </p>
          )}
        </div>
      </section>

      {/* Input makanan */}
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Daftar asupan</h2>
            <div className="tabs tabs-box tabs-sm" role="tablist">
              {(
                [
                  ["recall", "Recall 24 jam"],
                  ["ffq", "SQ-FFQ"],
                ] as [Mode, string][]
              ).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} className={`tab ${mode === k ? "tab-active" : ""}`} onClick={() => setMode(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-base-content/60">
            {mode === "ffq"
              ? "SQ-FFQ: porsi (g) × frekuensi (per hari/minggu/bulan) dikonversi menjadi rata-rata gram per hari. Data pangan dari TKPI."
              : "Recall 24 jam: cari bahan makanan dari TKPI, isi berat dalam gram bagian yang dapat dimakan (BDD)."}
          </p>

          <div className="space-y-3">
            {rows.map((r, idx) => {
              const item = calc.items.find((i) => i.id === r.id);
              return (
                <div key={r.id} className="grid grid-cols-2 items-end gap-x-3 rounded-box border border-base-300 p-3 md:grid-cols-12">
                  {mode === "recall" && (
                    <Field label="Waktu" className="col-span-2 md:col-span-2">
                      <select className="select select-sm w-full" value={r.meal} onChange={(e) => setRow(r.id, "meal", e.target.value)}>
                        {MEALS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label={`Bahan makanan ${idx + 1}`} className={`col-span-2 ${mode === "recall" ? "md:col-span-4" : "md:col-span-5"}`}>
                    <FoodPicker id={`food-${r.id}`} value={r.kode} onChange={(v) => setRow(r.id, "kode", v)} />
                  </Field>
                  <Field label={mode === "ffq" ? "Porsi (g)" : "Berat (g)"} className="md:col-span-2">
                    <input type="number" min="0" step="any" inputMode="decimal" className="input input-sm w-full tabular-nums" value={r.qty} onChange={(e) => setRow(r.id, "qty", e.target.value)} />
                  </Field>
                  {mode === "ffq" && (
                    <>
                      <Field label="Frekuensi" className="md:col-span-1">
                        <input type="number" min="0" step="any" className="input input-sm w-full tabular-nums" value={r.freq} onChange={(e) => setRow(r.id, "freq", e.target.value)} />
                      </Field>
                      <Field label="Per" className="md:col-span-2">
                        <select className="select select-sm w-full" value={r.period} onChange={(e) => setRow(r.id, "period", e.target.value as FreqPeriod)}>
                          {(Object.entries(FREQ_FACTORS) as [FreqPeriod, { label: string }][]).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}
                  <div className={`col-span-2 flex items-center justify-between gap-2 pb-1 ${mode === "ffq" ? "md:col-span-2" : "md:col-span-4"}`}>
                    <span className="text-xs tabular-nums text-base-content/70">{item ? `${fmt(item.grams)} g/hari; ${fmt(item.g.energi)} kkal` : ""}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square"
                      aria-label="Hapus baris"
                      onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [newRow()]))}
                    >
                      <LuTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <LuPlus aria-hidden /> Tambah bahan makanan
          </button>
        </div>
      </section>

      <InputAlert errors={errors} />

      {/* Hasil */}
      <section className="result-slip rounded-box border border-base-300 bg-base-100">
        <div className="flex flex-col gap-1 border-b border-base-300 px-5 py-4 md:flex-row md:items-baseline md:justify-between">
          <h2 className="text-sm font-semibold text-base-content/70">Tingkat kecukupan asupan</h2>
          <span className="text-xs text-base-content/60">{target ? target.sourceLabel : "Target belum ditentukan"}</span>
        </div>
        {!hasData ? (
          <p className="px-5 py-4 text-sm text-base-content/60">Pilih bahan makanan dan isi jumlahnya untuk melihat analisis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Zat gizi</th>
                  <th className="text-right">Asupan</th>
                  <th className="text-right">Target</th>
                  <th className="min-w-40">% kecukupan</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => (
                  <tr key={c.key}>
                    <td className="font-medium">{c.label}</td>
                    <td className="text-right tabular-nums">
                      {fmt(c.intake)} <span className="text-xs text-base-content/55">{c.unit}</span>
                    </td>
                    <td className="text-right tabular-nums">{c.target ? fmt(c.target) : "–"}</td>
                    <td>
                      {c.pct !== null && c.cat ? (
                        <div className="flex items-center gap-2">
                          <progress className={`progress w-24 ${TONE[c.cat.tone] ?? ""}`} value={Math.min(c.pct, 150)} max="150" />
                          <span className="w-14 text-right text-sm tabular-nums">{fmt(c.pct)}%</span>
                          <span className={`badge badge-soft badge-sm ${BADGE[c.cat.tone] ?? ""}`}>{c.cat.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-base-content/50">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-base-300 px-5 py-3 text-xs text-base-content/60">
              Natrium total {fmt(calc.natrium)} mg.
              {Object.values(calc.missing).some((n) => n > 0) &&
                ` Sebagian bahan tidak punya data di TKPI dan dihitung 0 (${COMPARE.filter((c) => calc.missing[c.key] > 0)
                  .map((c) => `${c.label}: ${calc.missing[c.key]} bahan`)
                  .join(", ")}).`}{" "}
              Kategori: &lt;70% defisit berat, 70–79% sedang, 80–89% ringan, 90–119% normal, ≥120% lebih (Depkes 1996).
            </p>
          </div>
        )}
      </section>
      {adequacyChart && (
        <ChartCard title="Grafik tingkat kecukupan" description="Persentase asupan terhadap target; warna sesuai kategori Depkes 1996." config={adequacyChart} height={260} />
      )}
      <SaveBar record={record} disabled={!hasData} />
    </div>
  );
}
