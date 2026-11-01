import { useMemo } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { barConfig, doughnutConfig } from "@/components/utils/generals/charts/chart-configs";
import { NumberField, SelectField, SexField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { THEME_COLORS } from "@/const/theme";
import {
  BMR_TEE_DEFAULTS, bmrTeeRecord, calculateBmrTee, isBmrTeeResult, validateBmrTee,
} from "@/helpers/bmr-tee";
import type { FormulaChoice, WeightBasis } from "@/helpers/bmr-tee";
import { ACTIVITY_FACTORS, BMR_FORMULAS, STRESS_FACTORS, burnStressFactor, fmt, num } from "@/helpers/formulas";
import type { StressKey } from "@/helpers/formulas";
import usePatientForm from "@/hooks/usePatientForm";

const WEIGHT_BASIS: { value: WeightBasis; label: string }[] = [
  { value: "auto", label: "Otomatis (sesuai rekomendasi)" },
  { value: "actual", label: "BB aktual" },
  { value: "ibw", label: "BB ideal (Broca)" },
  { value: "adjusted", label: "Adjusted BW" },
];

const FORMULA_OPTIONS: { value: FormulaChoice; label: string }[] = [
  { value: "auto", label: "Otomatis (decision tree)" },
  ...(Object.entries(BMR_FORMULAS) as [FormulaChoice, { label: string }][]).map(([k, v]) => ({ value: k, label: v.label })),
  { value: "espen", label: "ESPEN kkal/kg (pasien kritis)" },
];

const ACTIVITY_OPTIONS = ACTIVITY_FACTORS.map((a) => ({ value: String(a.value), label: `${a.value} — ${a.label}` }));
const STRESS_OPTIONS = STRESS_FACTORS.map((s) => ({ value: s.key, label: s.value ? `${s.value} — ${s.label}` : s.label }));

/**
 * Kalkulator BMR & TEE. Komponen ini dipakai bersama oleh halaman BMR & TEE dan tab BMR/TEE
 * di Kalkulator Multi-Tab; seluruh logika ada di helpers/bmr-tee.ts.
 */
export default function BmrTeeCalculator() {
  const [form, set] = usePatientForm({ ...BMR_TEE_DEFAULTS });

  const errors = useMemo(() => validateBmrTee(form), [form]);
  const outcome = useMemo(() => (errors.length ? null : calculateBmrTee(form)), [form, errors]);
  const r = isBmrTeeResult(outcome) ? outcome : null;
  const error = outcome && "error" in outcome ? outcome.error : null;

  const compareChart = useMemo(
    () =>
      r &&
      barConfig({
        labels: r.compare.map((c) => c.label.replace(/ \(.*\)$/, "")),
        unit: "kkal",
        series: [
          { label: "BMR", data: r.compare.map((c) => c.bmr), color: THEME_COLORS.accent },
          { label: "TEE", data: r.compare.map((c) => c.tee), color: THEME_COLORS.primary },
        ],
      }),
    [r],
  );

  const macroChart = useMemo(
    () =>
      r &&
      doughnutConfig({
        labels: ["Protein", "Lemak", "Karbohidrat"],
        values: [r.macro.protein.kcal, r.macro.fat.kcal, r.macro.carb.kcal],
        unit: "kkal",
      }),
    [r],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <h2 className="font-semibold">Data pasien</h2>
          <SexField value={form.sex} onChange={set("sex")} />
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            <NumberField label="Umur" unit="th" value={form.age} onChange={set("age")} />
            <NumberField label="Berat badan" unit="kg" value={form.weight} onChange={set("weight")} />
            <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} />
            <NumberField label="% lemak (BIA)" unit="%" value={form.bodyFat} onChange={set("bodyFat")} hint="Opsional" />
          </div>
          <label className="label mt-2 cursor-pointer gap-3 text-sm text-base-content">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={form.critical}
              onChange={(e) => set("critical")(e.target.checked)}
            />
            Pasien kritis / ICU / ventilator
          </label>

          <div className="divider my-3" />
          <h2 className="font-semibold">Rumus & faktor</h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <SelectField label="Rumus BMR" value={form.formula} onChange={set("formula")} options={FORMULA_OPTIONS} />
            <SelectField label="Dasar berat badan" value={form.basis} onChange={set("basis")} options={WEIGHT_BASIS} />
          </div>
          {(form.formula === "espen" || (form.formula === "auto" && form.critical)) && (
            <NumberField label="ESPEN" unit="kkal/kg" value={form.espenKcal} onChange={set("espenKcal")} hint="Rentang 20–25 kkal/kg BB" />
          )}
          <SelectField label="Faktor aktivitas (FA)" value={form.fa} onChange={set("fa")} options={ACTIVITY_OPTIONS} />
          <SelectField<StressKey> label="Faktor stres (FS)" value={form.stress} onChange={set("stress")} options={STRESS_OPTIONS} />
          {form.stress === "burn" && (
            <NumberField
              label="Luas luka bakar (TBSA)"
              unit="%"
              value={form.tbsa}
              onChange={set("tbsa")}
              hint={`Faktor: ${burnStressFactor(num(form.tbsa)) ?? "–"} (<10%: 1,2; 10–19%: 1,35; 20–29%: 1,5; 30–49%: 1,75; ≥50%: 2,0)`}
            />
          )}
          {form.stress === "custom" && (
            <NumberField label="Faktor stres manual" value={form.customFs} onChange={set("customFs")} step="0.05" />
          )}

          <div className="divider my-3" />
          <h2 className="font-semibold">Distribusi makronutrien</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Protein" unit="g/kg" value={form.proteinPerKg} onChange={set("proteinPerKg")} step="0.1" />
            <NumberField label="Lemak" unit="% energi" value={form.fatPct} onChange={set("fatPct")} />
          </div>
          <p className="text-xs text-base-content/60">Karbohidrat = sisa energi setelah protein dan lemak.</p>
        </div>
      </div>

      <div className="space-y-4">
        <InputAlert errors={errors} />
        {r && (
          <div role="status" className="alert alert-info alert-soft text-sm">
            <span>
              <strong>Rekomendasi rumus:</strong> {r.rec.reason}
              {form.formula !== "auto" && " (Anda memilih rumus manual.)"}
            </span>
          </div>
        )}
        {error && <InputAlert errors={[error]} />}
        <ResultSlip
          title="Total energy expenditure (TEE)"
          value={r?.teeRes.value}
          unit="kkal/hari"
          steps={r?.steps}
          empty={!r && "Isi umur, berat, dan tinggi badan untuk melihat hasil."}
        >
          {r && (
            <div>
              {r.bmrRes && <ResultRow label={`BMR (${r.bmrRes.formula})`} value={r.bmrRes.value} unit="kkal" />}
              <ResultRow label="IMT" value={r.b} unit="kg/m²" />
              <ResultRow label="FA × FS" value={`${r.fa} × ${r.fs}`} />
              <ResultRow label={`Protein (${form.proteinPerKg} g/kg)`} value={r.macro.protein.gram} unit={`g (${fmt(r.macro.protein.pct)}%)`} />
              <ResultRow label="Lemak" value={r.macro.fat.gram} unit={`g (${fmt(r.macro.fat.pct)}%)`} />
              <ResultRow label="Karbohidrat" value={r.macro.carb.gram} unit={`g (${fmt(r.macro.carb.pct)}%)`} />
            </div>
          )}
        </ResultSlip>
        <SaveBar record={() => bmrTeeRecord(form, r!)} disabled={!r} />

        {r && (
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table className="table table-sm">
              <caption className="px-4 pt-3 text-left text-sm font-semibold text-base-content/70">
                Perbandingan rumus (dasar {r.basisLabel})
              </caption>
              <thead>
                <tr>
                  <th>Rumus</th>
                  <th className="text-right">BMR</th>
                  <th className="text-right">TEE</th>
                </tr>
              </thead>
              <tbody>
                {r.compare.map((c) => (
                  <tr key={c.key} className={c.key === r.key ? "bg-primary/5 font-semibold" : ""}>
                    <td>{c.label}</td>
                    <td className="text-right tabular-nums">{c.bmr ? fmt(c.bmr) : "–"}</td>
                    <td className="text-right tabular-nums">{c.tee ? fmt(c.tee) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {macroChart && (
          <ChartCard title="Distribusi energi makronutrien" description="Kontribusi energi protein, lemak, dan karbohidrat terhadap TEE." config={macroChart} />
        )}
        {compareChart && (
          <ChartCard title="Perbandingan BMR & TEE antar rumus" description={`Dasar ${r?.basisLabel}; rumus tanpa data lengkap tidak ditampilkan.`} config={compareChart} />
        )}
      </div>
    </div>
  );
}
