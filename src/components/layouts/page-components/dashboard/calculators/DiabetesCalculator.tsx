import { useMemo } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { barConfig, doughnutConfig } from "@/components/utils/generals/charts/chart-configs";
import { NumberField, SelectField, SexField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import { DM_ACTIVITY, bmi, dmEnergy, fmt, ibwBroca, isPos, macroSplit, num, round } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import usePatientForm from "@/hooks/usePatientForm";
import type { ReportRecord } from "@/types";

const STRESS = [
  { value: "0", label: "Tidak ada (0%)" },
  { value: "10", label: "Ringan, mis. infeksi ringan (+10%)" },
  { value: "20", label: "Sedang, mis. operasi (+20%)" },
  { value: "30", label: "Berat, mis. sepsis/trauma (+30%)" },
];
const ACTIVITY_OPTIONS = DM_ACTIVITY.map((a) => ({ value: String(a.value), label: a.label }));

/** Kebutuhan energi DM — PERKENI: basal + koreksi umur, aktivitas, BB, stres */
export default function DiabetesCalculator() {
  const [form, set] = usePatientForm({ activity: "20", stress: "0", weightAdj: "20", carbPct: "55", fatPct: "25", proteinPct: "20" });

  const errors = useMemo(
    () =>
      validateRanges([
        { value: form.age, limit: LIMITS.age },
        { value: form.weight, limit: LIMITS.weight },
        { value: form.height, limit: LIMITS.height },
        { value: form.weightAdj, limit: LIMITS.weightAdj },
        { value: form.carbPct, limit: LIMITS.carbPct },
        { value: form.proteinPct, limit: LIMITS.proteinPct },
        { value: form.fatPct, limit: LIMITS.fatPct, label: "Lemak" },
      ]),
    [form],
  );

  const outcome = useMemo(() => {
    if (errors.length) return null;
    const w = num(form.weight);
    const h = num(form.height);
    const age = num(form.age);
    if (!isPos(w, h, age)) return null;
    const ibw = ibwBroca(h, form.sex);
    // Penjagaan: BBI Broca ≤ 0 (TB ≤ 100 cm) membuat kebutuhan basal tidak bisa dihitung
    if (!ibw || ibw.value <= 0) return { error: "Tinggi badan harus lebih dari 100 cm untuk menghitung BBI (Broca)." };
    const b = bmi(w, h);
    const e = dmEnergy({
      ibw: ibw.value,
      sex: form.sex,
      age,
      bmiValue: b,
      activityPct: num(form.activity),
      stressPct: num(form.stress),
      weightAdjPct: num(form.weightAdj),
    });
    if (!e) return null;
    const macro = macroSplit(e.value, { proteinPct: num(form.proteinPct), fatPct: num(form.fatPct), carbPct: num(form.carbPct) });
    if (!macro) return null;
    const pctSum = num(form.carbPct) + num(form.fatPct) + num(form.proteinPct);
    return { ibw, b: b as number, e, macro, pctSum, steps: [...ibw.steps, `IMT = ${fmt(b)} kg/m²`, ...e.steps] };
  }, [form, errors]);

  const r = outcome && !("error" in outcome) ? outcome : null;
  const error = outcome && "error" in outcome ? outcome.error : null;

  const correctionChart = useMemo(() => {
    if (!r) return null;
    const deltas = r.e.items.map((it) => (r.e.basal * it.pct) / 100);
    return barConfig({
      labels: ["Basal", ...r.e.items.map((it) => it.label.split(":")[0].replace(/ \(.*\)$/, "")), "Total"],
      unit: "kkal",
      series: [
        {
          label: "Energi",
          data: [r.e.basal, ...deltas, r.e.value],
          color: [THEME_COLORS.accent, ...deltas.map((d) => (d < 0 ? THEME_COLORS.warning : THEME_COLORS.secondary)), THEME_COLORS.primary],
        },
      ],
    });
  }, [r]);

  const macroChart = useMemo(
    () =>
      r &&
      doughnutConfig({
        labels: ["Karbohidrat", "Protein", "Lemak"],
        values: [r.macro.carb.kcal, r.macro.protein.kcal, r.macro.fat.kcal],
        unit: "kkal",
      }),
    [r],
  );

  const record = (): ReportRecord => {
    if (!r) throw new Error("Hasil belum tersedia");
    return {
      type: "diabetes",
      title: `Kebutuhan energi DM ${fmt(r.e.value)} kkal/hari`,
      input: {
        "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
        "Umur (th)": num(form.age),
        "Berat badan (kg)": num(form.weight),
        "Tinggi badan (cm)": num(form.height),
        "Aktivitas (%)": num(form.activity),
        "Stres (%)": num(form.stress),
        "Koreksi BB (%)": num(form.weightAdj),
        "Karbohidrat/protein/lemak (%)": `${form.carbPct}/${form.proteinPct}/${form.fatPct}`,
      },
      output: {
        "BBI (kg)": round(r.ibw.value),
        "IMT (kg/m²)": round(r.b),
        "Kebutuhan basal (kkal)": round(r.e.basal),
        "Total energi (kkal/hari)": round(r.e.value),
        "Karbohidrat (g)": round(r.macro.carb.gram),
        "Protein (g)": round(r.macro.protein.gram),
        "Lemak (g)": round(r.macro.fat.gram),
      },
      tables: [
        {
          title: "Koreksi kebutuhan energi (PERKENI)",
          columns: ["Komponen", "Persen", "Kkal"],
          rows: [
            ["Kebutuhan basal", "", round(r.e.basal)],
            ...r.e.items.map((it) => [it.label, `${it.pct}%`, round((r.e.basal * it.pct) / 100)]),
            ["Total", "", round(r.e.value)],
          ],
        },
      ],
      steps: r.steps,
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <SexField value={form.sex} onChange={set("sex")} />
          <div className="grid grid-cols-3 gap-x-4">
            <NumberField label="Umur" unit="th" value={form.age} onChange={set("age")} />
            <NumberField label="BB" unit="kg" value={form.weight} onChange={set("weight")} />
            <NumberField label="TB" unit="cm" value={form.height} onChange={set("height")} />
          </div>
          <SelectField label="Aktivitas fisik" value={form.activity} onChange={set("activity")} options={ACTIVITY_OPTIONS} />
          <SelectField label="Stres metabolik" value={form.stress} onChange={set("stress")} options={STRESS} />
          <NumberField
            label="Koreksi status berat badan"
            unit="%"
            value={form.weightAdj}
            onChange={set("weightAdj")}
            hint="PERKENI: gemuk dikurangi 20–30%, kurus ditambah 20–30% (berdasarkan IMT Asia-Pasifik)"
          />
          <div className="divider my-3" />
          <h2 className="font-semibold">Komposisi makronutrien</h2>
          <div className="grid grid-cols-3 gap-x-4">
            <NumberField label="Karbohidrat" unit="%" value={form.carbPct} onChange={set("carbPct")} hint="45–65%" />
            <NumberField label="Protein" unit="%" value={form.proteinPct} onChange={set("proteinPct")} hint="10–20%" />
            <NumberField label="Lemak" unit="%" value={form.fatPct} onChange={set("fatPct")} hint="20–25%" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <InputAlert errors={error ? [...errors, error] : errors} />
        <ResultSlip
          title="Kebutuhan energi diabetes melitus"
          value={r?.e.value}
          unit="kkal/hari"
          steps={r?.steps}
          empty={!r && "Isi umur, berat, dan tinggi badan."}
        >
          {r && (
            <div>
              <ResultRow label="BB ideal (Broca)" value={r.ibw.value} unit="kg" />
              <ResultRow label="Kebutuhan basal" value={r.e.basal} unit="kkal" />
              <ResultRow label="Karbohidrat" value={r.macro.carb.gram} unit="g" />
              <ResultRow label="Protein" value={r.macro.protein.gram} unit="g" />
              <ResultRow label="Lemak" value={r.macro.fat.gram} unit="g" />
              {r.pctSum !== 100 && (
                <p className="mt-2 text-xs text-warning">Total persentase makronutrien {fmt(r.pctSum)}% (seharusnya 100%).</p>
              )}
              {r.e.belowMinimum && (
                <p className="mt-2 text-xs text-warning">
                  Hasil di bawah batas minimal PERKENI ({fmt(r.e.minimum)} kkal/hari). Pertimbangkan penyesuaian.
                </p>
              )}
            </div>
          )}
        </ResultSlip>
        <SaveBar record={record} disabled={!r} />
        {correctionChart && (
          <ChartCard title="Komponen kebutuhan energi" description="Kebutuhan basal, koreksi (+/−), dan total energi." config={correctionChart} />
        )}
        {macroChart && <ChartCard title="Distribusi energi makronutrien" config={macroChart} />}
      </div>
    </div>
  );
}
