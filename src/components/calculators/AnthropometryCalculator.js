import { useMemo, useState } from "react";
import { NumberField, SelectField, SexField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import AssessmentTable, { toReportTable } from "@/components/ui/AssessmentTable";
import SaveBar from "@/components/ui/SaveBar";
import usePatientForm from "@/components/ui/usePatientForm";
import {
  BMI_STANDARDS, WEIGHT_CHANGE_PERIODS, adjustedBW, bmi, bmiCategory, fmt, ibwBroca, ibwHamwi, num, weightChange,
} from "@/utils/formulas";

/** Status gizi dewasa: IMT, BBI (Broca, Hamwi), Adjusted BW, perubahan BB — disajikan sebagai tabel AD */
export default function AnthropometryCalculator() {
  const [form, set] = usePatientForm({ usual: "", period: "1m" });
  const [standard, setStandard] = useState("asia");

  const r = useMemo(() => {
    const w = num(form.weight);
    const h = num(form.height);
    const b = bmi(w, h);
    if (!b) return null;
    const cat = bmiCategory(b, standard);
    const broca = ibwBroca(h, form.sex);
    const hamwi = ibwHamwi(h, form.sex);
    const adj = adjustedBW(w, broca.value);
    const pctIbw = (w / broca.value) * 100;
    const wc = weightChange({ usual: num(form.usual), current: w, period: form.period });
    const pctCat = pctIbw < 90 ? "Di bawah BBI" : pctIbw > 110 ? "Di atas BBI" : "Sesuai BBI (90–110%)";

    const rows = [
      { code: "AD-1.1.1", label: "Tinggi badan", data: `${fmt(h)} cm`, interpretation: "–" },
      { code: "AD-1.1.2", label: "Berat badan", data: `${fmt(w)} kg`, interpretation: `${fmt(pctIbw, 0)}% BBI (${pctCat})`, tone: pctIbw < 90 || pctIbw > 110 ? "warning" : "success" },
      { code: "AD-1.1.2", label: "Berat badan ideal (Broca)", data: `${fmt(broca.value)} kg`, interpretation: "–" },
      { code: "AD-1.1.4", label: "Perubahan berat badan", data: wc ? `${fmt(wc.pct, 1)}%` : "–", interpretation: wc ? wc.interp.label : "–", tone: wc?.interp.tone },
      { code: "AD-1.1.5.1", label: "Indeks massa tubuh", data: `${fmt(b, 1)} kg/m²`, interpretation: `${cat.label} (${BMI_STANDARDS[standard].label})`, tone: cat.tone },
    ];
    return {
      bmi: b, cat, broca, hamwi, adj, pctIbw, wc, rows,
      steps: [
        `IMT = BB ÷ TB² = ${fmt(w)} ÷ (${fmt(h / 100, 2)})² = ${fmt(b, 1)} kg/m²`,
        ...broca.steps,
        `% BBI = ${fmt(w)} ÷ ${fmt(broca.value)} × 100% = ${fmt(pctIbw, 0)}%`,
        ...hamwi.steps,
        ...adj.steps,
        ...(wc ? wc.steps : []),
      ],
    };
  }, [form, standard]);

  const record = () => ({
    type: "antropometri",
    title: `IMT ${fmt(r.bmi, 1)} kg/m² (${r.cat.label})`,
    input: {
      "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
      "Berat badan (kg)": num(form.weight),
      "Tinggi badan (cm)": num(form.height),
      "BB biasa/sebelumnya (kg)": num(form.usual) || null,
      "Periode perubahan BB": WEIGHT_CHANGE_PERIODS.find((p) => p.value === form.period)?.label,
      "Standar IMT": BMI_STANDARDS[standard].label,
    },
    output: {
      "IMT (kg/m²)": Number(r.bmi.toFixed(1)),
      "Kategori IMT": r.cat.label,
      "BBI Broca (kg)": Number(r.broca.value.toFixed(1)),
      "BBI Hamwi (kg)": Number(r.hamwi.value.toFixed(1)),
      "Adjusted BW (kg)": Number(r.adj.value.toFixed(1)),
      "Perubahan BB": r.wc ? `${fmt(r.wc.pct, 1)}% (${r.wc.interp.label})` : null,
    },
    tables: [toReportTable("Pengkajian data antropometri (AD)", r.rows)],
    steps: r.steps,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <SexField value={form.sex} onChange={set("sex")} />
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Berat badan" unit="kg" value={form.weight} onChange={set("weight")} />
            <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} />
            <NumberField label="BB biasa / sebelumnya" unit="kg" value={form.usual} onChange={set("usual")} hint="Opsional, untuk AD-1.1.4" />
            <SelectField
              label="Dalam periode"
              value={form.period}
              onChange={set("period")}
              options={WEIGHT_CHANGE_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>
          <SelectField
            label="Standar klasifikasi IMT"
            value={standard}
            onChange={setStandard}
            options={Object.entries(BMI_STANDARDS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
      </div>
      <div className="space-y-4">
        <ResultSlip
          title="Indeks massa tubuh"
          value={r?.bmi}
          digits={1}
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
      </div>
    </div>
  );
}
