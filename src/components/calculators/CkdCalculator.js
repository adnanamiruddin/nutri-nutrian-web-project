import { useMemo } from "react";
import { NumberField, SelectField, SexField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import SaveBar from "@/components/ui/SaveBar";
import usePatientForm from "@/components/ui/usePatientForm";
import { ckdProtein, ckdStage, egfrCkdEpi2021, fmt, ibwBroca, isPos, num } from "@/utils/formulas";

const MODES = [
  { value: "nd", label: "Non-dialisis" },
  { value: "hd", label: "Hemodialisis (HD)" },
  { value: "pd", label: "Dialisis peritoneal (CAPD/PD)" },
];

/** Penyakit ginjal kronis — eGFR CKD-EPI 2021 & preskripsi protein KDOQI 2020 */
export default function CkdCalculator() {
  
  const [form, set] = usePatientForm({ scr: "", mode: "nd", peritonealLoss: "10", kcalPerKg: "30" });

  const r = useMemo(() => {
    const scr = num(form.scr);
    const age = num(form.age);
    const egfr = egfrCkdEpi2021({ scr, age, sex: form.sex });
    if (!egfr) return null;
    const stage = ckdStage(egfr.value);
    const h = num(form.height);
    const ibw = isPos(h) ? ibwBroca(h, form.sex) : null;
    const protein = ibw ? ckdProtein({ ibw: ibw.value, mode: form.mode, stage: stage.stage, peritonealLoss: num(form.peritonealLoss) || 0 }) : null;
    const energy = ibw ? ibw.value * (num(form.kcalPerKg) || 30) : null;
    const steps = [...egfr.steps];
    if (ibw) steps.push(...ibw.steps);
    if (protein) steps.push(`Protein: ${protein.note} → ${fmt(protein.min, 0)}–${fmt(protein.max, 0)} g/hari`);
    if (energy) steps.push(`Energi = ${form.kcalPerKg} kkal × ${fmt(ibw.value)} kg BBI = ${fmt(energy, 0)} kkal/hari`);
    return { egfr, stage, ibw, protein, energy, steps };
  }, [form]);

  const record = () => ({
    type: "ckd",
    title: `eGFR ${fmt(r.egfr.value, 0)} mL/menit/1,73 m² (${r.stage.stage}, ${r.stage.label})`,
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
      "eGFR (mL/menit/1,73 m²)": Math.round(r.egfr.value),
      Stadium: `${r.stage.stage} (${r.stage.label})`,
      "BBI (kg)": r.ibw ? Number(r.ibw.value.toFixed(1)) : null,
      "Protein (g/hari)": r.protein ? `${Math.round(r.protein.min)}–${Math.round(r.protein.max)}` : null,
      "Energi (kkal/hari)": r.energy ? Math.round(r.energy) : null,
    },
    tables: [{
      title: "Pengkajian data biokimia (BD)",
      columns: ["Domain", "Data", "Nilai normal", "Satuan", "Interpretasi"],
      rows: [
        ["BD-1.2.2 Kreatinin", form.scr, form.sex === "male" ? "0,7–1,3" : "0,6–1,1", "mg/dL", num(form.scr) > (form.sex === "male" ? 1.3 : 1.1) ? "Tinggi" : "Normal"],
        ["BD-1.2 eGFR (CKD-EPI 2021)", Math.round(r.egfr.value), "≥ 90", "mL/menit/1,73 m²", `${r.stage.stage} ${r.stage.label}`],
      ],
    }],
    steps: r.steps,
  });

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
      <div>
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
              {r.ibw ? (
                <>
                  <ResultRow label="BB ideal (Broca)" value={r.ibw.value} unit="kg" />
                  <ResultRow label="Protein" value={`${fmt(r.protein.min, 0)}–${fmt(r.protein.max, 0)}`} unit="g/hari" strong />
                  <ResultRow label="Energi" value={r.energy} digits={0} unit="kkal/hari" strong />
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
      </div>
    </div>
  );
}
