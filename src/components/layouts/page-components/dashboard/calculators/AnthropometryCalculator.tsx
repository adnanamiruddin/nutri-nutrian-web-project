import { useMemo, useState } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import AssessmentTable, { toReportTable } from "@/components/utils/generals/AssessmentTable";
import type { AssessmentRow } from "@/components/utils/generals/AssessmentTable";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { barConfig } from "@/components/utils/generals/charts/chart-configs";
import { NumberField, SelectField, SexField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { CHART_PALETTE } from "@/const/theme";
import {
  BMI_STANDARDS, WEIGHT_CHANGE_PERIODS, adjustedBW, bmi, bmiCategory, fmt, ibwBroca, ibwHamwi, num, round, weightChange,
} from "@/helpers/formulas";
import type { BmiStandardKey, WeightChangePeriod } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import usePatientForm from "@/hooks/usePatientForm";
import type { CalcResult, Category, ReportRecord } from "@/types";

const STANDARD_OPTIONS = (Object.entries(BMI_STANDARDS) as [BmiStandardKey, { label: string }][]).map(([k, v]) => ({ value: k, label: v.label }));
const PERIOD_OPTIONS = WEIGHT_CHANGE_PERIODS.map((p) => ({ value: p.value, label: p.label }));

/** Status gizi dewasa: IMT, BBI (Broca, Hamwi), Adjusted BW, perubahan BB — disajikan sebagai tabel AD */
export default function AnthropometryCalculator() {
  const [form, set] = usePatientForm({ usual: "", period: "1m" as WeightChangePeriod });
  const [standard, setStandard] = useState<BmiStandardKey>("asia");

  const errors = useMemo(
    () =>
      validateRanges([
        { value: form.weight, limit: LIMITS.weight },
        { value: form.height, limit: LIMITS.height },
        { value: form.usual, limit: LIMITS.usualWeight },
      ]),
    [form],
  );

  const outcome = useMemo(() => {
    if (errors.length) return null;
    const w = num(form.weight);
    const h = num(form.height);
    const b = bmi(w, h);
    if (!b) return null;
    const cat = bmiCategory(b, standard) as Category;
    const broca = ibwBroca(h, form.sex) as CalcResult;
    const hamwi = ibwHamwi(h, form.sex) as CalcResult;
    const adj = adjustedBW(w, broca.value);
    // Penjagaan: BBI Broca bernilai ≤ 0 bila TB ≤ 100 cm, sehingga AjBW & %BBI tidak bisa dihitung
    if (!adj) return { error: "Tinggi badan harus lebih dari 100 cm untuk menghitung BBI (Broca) dan Adjusted BW." };
    const pctIbw = (w / broca.value) * 100;
    const wc = weightChange({ usual: num(form.usual), current: w, period: form.period });
    const pctCat = pctIbw < 90 ? "Di bawah BBI" : pctIbw > 110 ? "Di atas BBI" : "Sesuai BBI (90–110%)";

    const rows: AssessmentRow[] = [
      { code: "AD-1.1.1", label: "Tinggi badan", data: `${fmt(h)} cm`, interpretation: "–" },
      { code: "AD-1.1.2", label: "Berat badan", data: `${fmt(w)} kg`, interpretation: `${fmt(pctIbw)}% BBI (${pctCat})`, tone: pctIbw < 90 || pctIbw > 110 ? "warning" : "success" },
      { code: "AD-1.1.2", label: "Berat badan ideal (Broca)", data: `${fmt(broca.value)} kg`, interpretation: "–" },
      { code: "AD-1.1.4", label: "Perubahan berat badan", data: wc ? `${fmt(wc.pct)}%` : "–", interpretation: wc ? wc.interp.label : "–", tone: wc?.interp.tone },
      { code: "AD-1.1.5.1", label: "Indeks massa tubuh", data: `${fmt(b)} kg/m²`, interpretation: `${cat.label} (${BMI_STANDARDS[standard].label})`, tone: cat.tone },
    ];
    return {
      w, bmi: b, cat, broca, hamwi, adj, pctIbw, wc, rows,
      steps: [
        `IMT = BB ÷ TB² = ${fmt(w)} ÷ (${fmt(h / 100)})² = ${fmt(b)} kg/m²`,
        ...broca.steps,
        `% BBI = ${fmt(w)} ÷ ${fmt(broca.value)} × 100% = ${fmt(pctIbw)}%`,
        ...hamwi.steps,
        ...adj.steps,
        ...(wc ? wc.steps : []),
      ],
    };
  }, [form, standard, errors]);

  const r = outcome && !("error" in outcome) ? outcome : null;
  const error = outcome && "error" in outcome ? outcome.error : null;

  const weightChart = useMemo(() => {
    if (!r) return null;
    const usual = num(form.usual);
    const labels = ["BB aktual", "BBI Broca", "BBI Hamwi", "Adjusted BW", ...(usual > 0 ? ["BB biasa"] : [])];
    const data = [r.w, r.broca.value, r.hamwi.value, r.adj.value, ...(usual > 0 ? [usual] : [])];
    return barConfig({ labels, unit: "kg", horizontal: true, series: [{ label: "Berat", data, color: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]) }] });
  }, [r, form.usual]);

  const record = (): ReportRecord => {
    if (!r) throw new Error("Hasil belum tersedia");
    return {
      type: "antropometri",
      title: `IMT ${fmt(r.bmi)} kg/m² (${r.cat.label})`,
      input: {
        "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
        "Berat badan (kg)": num(form.weight),
        "Tinggi badan (cm)": num(form.height),
        "BB biasa/sebelumnya (kg)": num(form.usual) || null,
        "Periode perubahan BB": WEIGHT_CHANGE_PERIODS.find((p) => p.value === form.period)?.label,
        "Standar IMT": BMI_STANDARDS[standard].label,
      },
      output: {
        "IMT (kg/m²)": round(r.bmi),
        "Kategori IMT": r.cat.label,
        "BBI Broca (kg)": round(r.broca.value),
        "BBI Hamwi (kg)": round(r.hamwi.value),
        "Adjusted BW (kg)": round(r.adj.value),
        "Perubahan BB": r.wc ? `${fmt(r.wc.pct)}% (${r.wc.interp.label})` : null,
      },
      tables: [toReportTable("Pengkajian data antropometri (AD)", r.rows)],
      steps: r.steps,
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <SexField value={form.sex} onChange={set("sex")} />
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Berat badan" unit="kg" value={form.weight} onChange={set("weight")} />
            <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} />
            <NumberField label="BB biasa / sebelumnya" unit="kg" value={form.usual} onChange={set("usual")} hint="Opsional, untuk AD-1.1.4" />
            <SelectField label="Dalam periode" value={form.period} onChange={set("period")} options={PERIOD_OPTIONS} />
          </div>
          <SelectField label="Standar klasifikasi IMT" value={standard} onChange={setStandard} options={STANDARD_OPTIONS} />
        </div>
      </div>
      <div className="space-y-4">
        <InputAlert errors={error ? [...errors, error] : errors} />
        <ResultSlip
          title="Indeks massa tubuh"
          value={r?.bmi}
          unit="kg/m²"
          category={r?.cat}
          steps={r?.steps}
          empty={!r && "Isi berat dan tinggi badan untuk melihat hasil."}
        >
          {r && (
            <div>
              <ResultRow label="BBI Broca modifikasi" value={r.broca.value} unit="kg" />
              <ResultRow label="BBI Hamwi" value={r.hamwi.value} unit="kg" />
              <ResultRow label="Adjusted body weight" value={r.adj.value} unit="kg" strong={r.bmi > 25} />
            </div>
          )}
        </ResultSlip>
        {r && <AssessmentTable title="Pengkajian data antropometri (AD)" rows={r.rows} />}
        <SaveBar record={record} disabled={!r} />
        {weightChart && (
          <ChartCard title="Perbandingan berat badan" description="BB aktual dibandingkan dengan BB ideal dan Adjusted BW." config={weightChart} height={220} />
        )}
      </div>
    </div>
  );
}
