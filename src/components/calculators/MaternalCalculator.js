import { useMemo } from "react";
import Field, { NumberField, SelectField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import SaveBar from "@/components/ui/SaveBar";
import usePatientForm from "@/components/ui/usePatientForm";
import {
  ACTIVITY_FACTORS, PREGNANCY_ADDITION, bmi, bmiCategory, bmrMifflin, fmt, gwgExpectedAtWeek, gwgTarget,
  isPos, num, trimesterFromWeek,
} from "@/utils/formulas";

/** Kebutuhan ibu hamil & menyusui + pemantauan kenaikan BB kehamilan */
export default function MaternalCalculator() {
  
  const [form, set] = usePatientForm({
    status: "pregnant", standard: "iom", week: "", prePregWeight: "", lactMonth: "", fa: "1.3", baseOverride: "",
  });

  const r = useMemo(() => {
    const age = num(form.age);
    const h = num(form.height);
    const wNow = num(form.weight);
    const wPre = num(form.prePregWeight);
    const baseW = form.status === "pregnant" && isPos(wPre) ? wPre : wNow;
    const add = PREGNANCY_ADDITION[form.standard];
    let base = num(form.baseOverride);
    const steps = [];
    if (!isPos(base)) {
      const m = bmrMifflin({ weight: baseW, height: h, age, sex: "female" });
      if (!m) return null;
      base = m.value * num(form.fa);
      steps.push(...m.steps, `Energi dasar = BMR × FA ${form.fa} = ${fmt(base, 0)} kkal (BB ${form.status === "pregnant" && isPos(wPre) ? "pra-hamil" : "saat ini"})`);
    } else {
      steps.push(`Energi dasar (input manual) = ${fmt(base, 0)} kkal`);
    }

    let addition = 0;
    let phase = "";
    let gwg = null;
    if (form.status === "pregnant") {
      const tri = trimesterFromWeek(num(form.week));
      if (!tri) return { base, steps, needWeek: true };
      addition = add[`t${tri}`];
      phase = `Trimester ${tri} (minggu ke-${form.week})`;
      if (isPos(wPre, h)) {
        const preBmi = bmi(wPre, h);
        const target = gwgTarget(preBmi);
        const expected = gwgExpectedAtWeek(preBmi, num(form.week));
        const gain = isPos(wNow) ? wNow - wPre : null;
        let tone = "success";
        let label = "Sesuai rentang anjuran";
        if (gain !== null && expected) {
          if (gain < expected.min) { tone = "warning"; label = "Di bawah rentang anjuran"; }
          if (gain > expected.max) { tone = "warning"; label = "Di atas rentang anjuran"; }
        }
        gwg = { preBmi, preCat: bmiCategory(preBmi, "who"), target, expected, gain, status: gain !== null ? { label, tone } : null };
      }
    } else {
      const m = num(form.lactMonth);
      if (!(m >= 0)) return { base, steps, needMonth: true };
      addition = m < 6 ? add.lact1 : add.lact2;
      phase = m < 6 ? "Menyusui 6 bulan pertama" : "Menyusui 6 bulan kedua";
    }
    steps.push(`Tambahan ${phase} (${add.label}) = +${addition} kkal`, `Total = ${fmt(base, 0)} + ${addition} = ${fmt(base + addition, 0)} kkal`);
    return { base, addition, phase, total: base + addition, gwg, steps };
  }, [form]);

  const record = () => ({
    type: "maternal",
    title: `${r.phase}: ${fmt(r.total, 0)} kkal/hari`,
    input: {
      Status: form.status === "pregnant" ? "Hamil" : "Menyusui",
      Acuan: PREGNANCY_ADDITION[form.standard].label,
      "Umur (th)": num(form.age),
      "Tinggi badan (cm)": num(form.height),
      "BB saat ini (kg)": num(form.weight),
      "BB pra-hamil (kg)": form.status === "pregnant" ? num(form.prePregWeight) || null : null,
      "Usia kehamilan (minggu)": form.status === "pregnant" ? num(form.week) : null,
      "Usia bayi (bulan)": form.status !== "pregnant" ? num(form.lactMonth) : null,
      "Faktor aktivitas": num(form.fa),
    },
    output: {
      Fase: r.phase,
      "Energi dasar (kkal)": Math.round(r.base),
      "Tambahan (kkal)": r.addition,
      "Total energi (kkal/hari)": Math.round(r.total),
      "IMT pra-hamil": r.gwg ? `${fmt(r.gwg.preBmi)} (${r.gwg.preCat.label})` : null,
      "Kenaikan BB (kg)": r.gwg?.gain != null ? Number(r.gwg.gain.toFixed(1)) : null,
      "Anjuran kenaikan saat ini (kg)": r.gwg ? `${fmt(r.gwg.expected.min)}–${fmt(r.gwg.expected.max)}` : null,
      "Anjuran kenaikan total (kg)": r.gwg ? `${r.gwg.target.min}–${r.gwg.target.max}` : null,
    },
    steps: r.steps,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <Field label="Status">
            <div className="join w-full">
              {[
                ["pregnant", "Hamil"],
                ["lactating", "Menyusui"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={form.status === v}
                  onClick={() => set("status")(v)}
                  className={`btn join-item flex-1 ${form.status === v ? "btn-primary" : "btn-outline border-base-300 font-medium"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <SelectField
            label="Acuan tambahan energi"
            value={form.standard}
            onChange={set("standard")}
            options={Object.entries(PREGNANCY_ADDITION).map(([k, v]) => ({
              value: k,
              label: `${v.label} — T1 +${v.t1}, T2 +${v.t2}, T3 +${v.t3}; menyusui +${v.lact1}/+${v.lact2}`,
            }))}
          />
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Umur" unit="th" value={form.age} onChange={set("age")} />
            <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} />
            <NumberField label="BB saat ini" unit="kg" value={form.weight} onChange={set("weight")} />
            {form.status === "pregnant" ? (
              <>
                <NumberField label="BB pra-hamil" unit="kg" value={form.prePregWeight} onChange={set("prePregWeight")} />
                <NumberField label="Usia kehamilan" unit="minggu" value={form.week} onChange={set("week")} min={1} />
              </>
            ) : (
              <NumberField label="Usia bayi" unit="bulan" value={form.lactMonth} onChange={set("lactMonth")} />
            )}
          </div>
          <SelectField
            label="Faktor aktivitas"
            value={form.fa}
            onChange={set("fa")}
            options={ACTIVITY_FACTORS.map((a) => ({ value: String(a.value), label: `${a.value} — ${a.label}` }))}
          />
          <NumberField
            label="Energi dasar manual (opsional)"
            unit="kkal"
            value={form.baseOverride}
            onChange={set("baseOverride")}
            hint="Kosongkan untuk memakai Mifflin-St Jeor × faktor aktivitas"
          />
        </div>
      </div>
      <div className="space-y-4">
        <ResultSlip
          title="Kebutuhan energi"
          value={r?.total}
          unit="kkal/hari"
          steps={r?.total ? r.steps : []}
          empty={
            !r ? "Isi umur, berat, dan tinggi badan." : r.needWeek ? "Isi usia kehamilan (minggu)." : r.needMonth ? "Isi usia bayi (bulan)." : null
          }
        >
          {r?.total && (
            <div>
              <ResultRow label="Energi dasar" value={r.base} digits={0} unit="kkal" />
              <ResultRow label={r.phase} value={`+${r.addition}`} unit="kkal" />
            </div>
          )}
        </ResultSlip>
        {r?.gwg && (
          <ResultSlip
            title="Kenaikan berat badan kehamilan (IOM 2009)"
            value={r.gwg.gain}
            digits={1}
            unit="kg"
            category={r.gwg.status}
            empty={r.gwg.gain === null && "Isi BB saat ini untuk melihat kenaikan BB."}
          >
            <ResultRow label="IMT pra-hamil" value={`${fmt(r.gwg.preBmi)} (${r.gwg.preCat.label})`} />
            <ResultRow label={`Anjuran pada minggu ke-${form.week}`} value={`${fmt(r.gwg.expected.min)}–${fmt(r.gwg.expected.max)}`} unit="kg" />
            <ResultRow label="Anjuran total kehamilan" value={`${r.gwg.target.min}–${r.gwg.target.max}`} unit="kg" />
          </ResultSlip>
        )}
        <SaveBar record={record} disabled={!r?.total} />
      </div>
    </div>
  );
}
