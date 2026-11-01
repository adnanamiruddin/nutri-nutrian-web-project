import { useMemo } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { TONE_COLOR, barConfig } from "@/components/utils/generals/charts/chart-configs";
import { NumberField, SelectField, SexField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import { ckdProtein, ckdStage, egfrCkdEpi2021, fmt, ibwBroca, isPos, num, round } from "@/helpers/formulas";
import type { CkdMode, CkdStage } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import usePatientForm from "@/hooks/usePatientForm";
import type { ReportRecord } from "@/types";

const MODES: { value: CkdMode; label: string }[] = [
  { value: "nd", label: "Non-dialisis" },
  { value: "hd", label: "Hemodialisis (HD)" },
  { value: "pd", label: "Dialisis peritoneal (CAPD/PD)" },
];

/** Batas bawah eGFR tiap stadium KDIGO, untuk chart pembanding */
const STAGE_LIMITS = [
  { label: "G1 (≥ 90)", value: 90 },
  { label: "G2 (≥ 60)", value: 60 },
  { label: "G3a (≥ 45)", value: 45 },
  { label: "G3b (≥ 30)", value: 30 },
  { label: "G4 (≥ 15)", value: 15 },
];

/** Penyakit ginjal kronis — eGFR CKD-EPI 2021 & preskripsi protein KDOQI 2020 */
export default function CkdCalculator() {
  const [form, set] = usePatientForm({ scr: "", mode: "nd" as CkdMode, peritonealLoss: "10", kcalPerKg: "30" });

  const errors = useMemo(
    () =>
      validateRanges([
        { value: form.age, limit: LIMITS.age },
        { value: form.scr, limit: LIMITS.creatinine },
        { value: form.height, limit: LIMITS.height },
        { value: form.kcalPerKg, limit: LIMITS.kcalPerKg },
        { value: form.mode === "pd" ? form.peritonealLoss : "", limit: LIMITS.peritonealLoss },
      ]),
    [form],
  );

  const r = useMemo(() => {
    if (errors.length) return null;
    const scr = num(form.scr);
    const age = num(form.age);
    const egfr = egfrCkdEpi2021({ scr, age, sex: form.sex });
    if (!egfr) return null;
    const stage = ckdStage(egfr.value) as CkdStage;
    const h = num(form.height);
    const ibwRaw = isPos(h) ? ibwBroca(h, form.sex) : null;
    // Penjagaan: BBI Broca ≤ 0 (TB ≤ 100 cm) tidak bisa dipakai sebagai dasar protein & energi
    const ibw = ibwRaw && ibwRaw.value > 0 ? ibwRaw : null;
    const heightError = ibwRaw && !ibw ? "Tinggi badan harus lebih dari 100 cm untuk menghitung BBI (Broca)." : null;
    const protein = ibw ? ckdProtein({ ibw: ibw.value, mode: form.mode, stage: stage.stage, peritonealLoss: num(form.peritonealLoss) || 0 }) : null;
    const energy = ibw ? ibw.value * (num(form.kcalPerKg) || 30) : null;
    const steps = [...egfr.steps];
    if (ibw) steps.push(...ibw.steps);
    if (protein) steps.push(`Protein: ${protein.note} → ${fmt(protein.min)}–${fmt(protein.max)} g/hari`);
    if (ibw && energy) steps.push(`Energi = ${form.kcalPerKg} kkal × ${fmt(ibw.value)} kg BBI = ${fmt(energy)} kkal/hari`);
    return { egfr, stage, ibw, protein, energy, steps, heightError };
  }, [form, errors]);

  const egfrChart = useMemo(
    () =>
      r &&
      barConfig({
        labels: ["eGFR pasien", ...STAGE_LIMITS.map((s) => s.label)],
        unit: "mL/menit/1,73 m²",
        horizontal: true,
        min: 0,
        series: [
          {
            label: "eGFR",
            data: [r.egfr.value, ...STAGE_LIMITS.map((s) => s.value)],
            color: [TONE_COLOR[r.stage.tone], ...STAGE_LIMITS.map(() => THEME_COLORS.base300)],
          },
        ],
      }),
    [r],
  );

  const record = (): ReportRecord => {
    if (!r) throw new Error("Hasil belum tersedia");
    return {
      type: "ckd",
      title: `eGFR ${fmt(r.egfr.value)} mL/menit/1,73 m² (${r.stage.stage}, ${r.stage.label})`,
      input: {
        "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
        "Umur (th)": num(form.age),
        "Kreatinin serum (mg/dL)": num(form.scr),
        "Tinggi badan (cm)": num(form.height) || null,
        "Status terapi": MODES.find((m) => m.value === form.mode)?.label,
        "Energi (kkal/kg)": num(form.kcalPerKg),
        "Kehilangan peritoneal (g/hari)": form.mode === "pd" ? num(form.peritonealLoss) : null,
      },
      output: {
        "eGFR (mL/menit/1,73 m²)": round(r.egfr.value),
        Stadium: `${r.stage.stage} (${r.stage.label})`,
        "BBI (kg)": r.ibw ? round(r.ibw.value) : null,
        "Protein (g/hari)": r.protein ? `${fmt(r.protein.min)}–${fmt(r.protein.max)}` : null,
        "Energi (kkal/hari)": r.energy ? round(r.energy) : null,
      },
      tables: [
        {
          title: "Pengkajian data biokimia (BD)",
          columns: ["Domain", "Data", "Nilai normal", "Satuan", "Interpretasi"],
          rows: [
            ["BD-1.2.2 Kreatinin", form.scr, form.sex === "male" ? "0,7–1,3" : "0,6–1,1", "mg/dL", num(form.scr) > (form.sex === "male" ? 1.3 : 1.1) ? "Tinggi" : "Normal"],
            ["BD-1.2 eGFR (CKD-EPI 2021)", round(r.egfr.value), "≥ 90", "mL/menit/1,73 m²", `${r.stage.stage} ${r.stage.label}`],
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
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Umur" unit="th" value={form.age} onChange={set("age")} />
            <NumberField label="Kreatinin serum" unit="mg/dL" value={form.scr} onChange={set("scr")} step="0.01" />
            <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} hint="Untuk BBI (dasar protein)" />
            <NumberField label="Energi" unit="kkal/kg" value={form.kcalPerKg} onChange={set("kcalPerKg")} hint="KDOQI 2020: 25–35 kkal/kg" />
          </div>
          <SelectField label="Status terapi" value={form.mode} onChange={set("mode")} options={MODES} />
          {form.mode === "pd" && (
            <NumberField
              label="Kehilangan protein peritoneal"
              unit="g/hari"
              value={form.peritonealLoss}
              onChange={set("peritonealLoss")}
              hint="Umumnya 5–15 g/hari"
            />
          )}
        </div>
      </div>
      <div className="space-y-4">
        <InputAlert errors={r?.heightError ? [...errors, r.heightError] : errors} />
        <ResultSlip
          title="eGFR (CKD-EPI 2021)"
          value={r?.egfr.value}
          unit="mL/menit/1,73 m²"
          category={r && { label: `${r.stage.stage} — ${r.stage.label}`, tone: r.stage.tone }}
          steps={r?.steps}
          empty={!r && "Isi jenis kelamin, umur, dan kreatinin serum."}
        >
          {r && (
            <div>
              {r.ibw && r.protein ? (
                <>
                  <ResultRow label="BB ideal (Broca)" value={r.ibw.value} unit="kg" />
                  <ResultRow label="Protein" value={`${fmt(r.protein.min)}–${fmt(r.protein.max)}`} unit="g/hari" strong />
                  <ResultRow label="Energi" value={r.energy} unit="kkal/hari" strong />
                  <p className="mt-2 text-xs text-base-content/65">{r.protein.note}</p>
                </>
              ) : (
                <p className="text-sm text-base-content/65">Isi tinggi badan untuk menghitung preskripsi protein dan energi.</p>
              )}
              <p className="mt-2 text-xs text-base-content/65">
                Natrium &lt; 2,3 g/hari; kalium dan fosfor disesuaikan dengan hasil laboratorium (KDOQI 2020).
              </p>
            </div>
          )}
        </ResultSlip>
        <SaveBar record={record} disabled={!r} />
        {egfrChart && (
          <ChartCard title="Posisi eGFR terhadap stadium" description="Batas bawah eGFR tiap stadium (KDIGO) sebagai pembanding." config={egfrChart} height={230} />
        )}
      </div>
    </div>
  );
}
