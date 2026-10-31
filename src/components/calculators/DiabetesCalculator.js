import { useMemo } from "react";
import { NumberField, SelectField, SexField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import SaveBar from "@/components/ui/SaveBar";
import usePatientForm from "@/components/ui/usePatientForm";
import { DM_ACTIVITY, bmi, dmEnergy, fmt, ibwBroca, isPos, macroSplit, num } from "@/utils/formulas";

const STRESS = [
  { value: "0", label: "Tidak ada (0%)" },
  { value: "10", label: "Ringan, mis. infeksi ringan (+10%)" },
  { value: "20", label: "Sedang, mis. operasi (+20%)" },
  { value: "30", label: "Berat, mis. sepsis/trauma (+30%)" },
];

/** Kebutuhan energi DM — PERKENI: basal + koreksi umur, aktivitas, BB, stres */
export default function DiabetesCalculator() {
  
  const [form, set] = usePatientForm({ activity: "20", stress: "0", weightAdj: "20", carbPct: "55", fatPct: "25", proteinPct: "20" });

  const r = useMemo(() => {
    const w = num(form.weight);
    const h = num(form.height);
    const age = num(form.age);
    if (!isPos(w, h, age)) return null;
    const ibw = ibwBroca(h, form.sex);
    const b = bmi(w, h);
    const e = dmEnergy({
      ibw: ibw.value, sex: form.sex, age, bmiValue: b,
      activityPct: num(form.activity), stressPct: num(form.stress), weightAdjPct: num(form.weightAdj),
    });
    const macro = macroSplit(e.value, { proteinPct: num(form.proteinPct), fatPct: num(form.fatPct), carbPct: num(form.carbPct) });
    const pctSum = num(form.carbPct) + num(form.fatPct) + num(form.proteinPct);
    return { ibw, b, e, macro, pctSum, steps: [...ibw.steps, `IMT = ${fmt(b)} kg/m²`, ...e.steps] };
  }, [form]);

  const record = () => ({
    type: "diabetes",
    title: `Kebutuhan energi DM ${fmt(r.e.value, 0)} kkal/hari`,
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
      "BBI (kg)": Number(r.ibw.value.toFixed(1)),
      "IMT (kg/m²)": Number(r.b.toFixed(1)),
      "Kebutuhan basal (kkal)": Math.round(r.e.basal),
      "Total energi (kkal/hari)": Math.round(r.e.value),
      "Karbohidrat (g)": Math.round(r.macro.carb.gram),
      "Protein (g)": Math.round(r.macro.protein.gram),
      "Lemak (g)": Math.round(r.macro.fat.gram),
    },
    tables: [{
      title: "Koreksi kebutuhan energi (PERKENI)",
      columns: ["Komponen", "Persen", "Kkal"],
      rows: [["Kebutuhan basal", "", Math.round(r.e.basal)], ...r.e.items.map((it) => [it.label, `${it.pct}%`, Math.round((r.e.basal * it.pct) / 100)]), ["Total", "", Math.round(r.e.value)]],
    }],
    steps: r.steps,
  });

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
          <SelectField
            label="Aktivitas fisik"
            value={form.activity}
            onChange={set("activity")}
            options={DM_ACTIVITY.map((a) => ({ value: String(a.value), label: a.label }))}
          />
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
      <div>
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
              <ResultRow label="Kebutuhan basal" value={r.e.basal} digits={0} unit="kkal" />
              <ResultRow label="Karbohidrat" value={r.macro.carb.gram} digits={0} unit="g" />
              <ResultRow label="Protein" value={r.macro.protein.gram} digits={0} unit="g" />
              <ResultRow label="Lemak" value={r.macro.fat.gram} digits={0} unit="g" />
              {r.pctSum !== 100 && (
                <p className="mt-2 text-xs text-warning">Total persentase makronutrien {fmt(r.pctSum)}% (seharusnya 100%).</p>
              )}
              {r.e.belowMinimum && (
                <p className="mt-2 text-xs text-warning">
                  Hasil di bawah batas minimal PERKENI ({r.e.minimum} kkal/hari). Pertimbangkan penyesuaian.
                </p>
              )}
            </div>
          )}
        </ResultSlip>
        <SaveBar record={record} disabled={!r} />
      </div>
    </div>
  );
}
