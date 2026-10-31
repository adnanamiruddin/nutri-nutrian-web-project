import { useMemo, useState } from "react";
import { NumberField, SelectField, SexField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import SaveBar from "@/components/ui/SaveBar";
import usePatientForm from "@/components/ui/usePatientForm";
import {
  ACTIVITY_FACTORS,
  BMR_FORMULAS,
  STRESS_FACTORS,
  adjustedBW,
  bmi,
  burnStressFactor,
  espenCritical,
  fmt,
  ibwBroca,
  isPos,
  macroSplit,
  num,
  recommendFormula,
  tee,
} from "@/utils/formulas";

const WEIGHT_BASIS = [
  { value: "auto", label: "Otomatis (sesuai rekomendasi)" },
  { value: "actual", label: "BB aktual" },
  { value: "ibw", label: "BB ideal (Broca)" },
  { value: "adjusted", label: "Adjusted BW" },
];

export default function BmrCalculator() {
  const [form, set] = usePatientForm({
    bodyFat: "",
    critical: false,
    formula: "auto",
    basis: "auto",
    fa: "1.3",
    stress: "none",
    tbsa: "",
    customFs: "1.0",
    espenKcal: "25",
    proteinPerKg: "1.0",
    fatPct: "25",
  });

  const r = useMemo(() => {
    const w = num(form.weight);
    const h = num(form.height);
    const age = num(form.age);
    const bf = num(form.bodyFat);
    if (!isPos(w, h) || !(age >= 0) || Number.isNaN(age)) return null;

    const b = bmi(w, h);
    const ibwResult = ibwBroca(h, form.sex);
    const ibw = ibwResult?.value ?? null;
    const adjResult = adjustedBW(w, ibw);
    const adj = adjResult?.value ?? null;
    const rec = recommendFormula({
      age,
      bmiValue: b,
      bodyFat: bf,
      critical: form.critical,
    });
    const key = form.formula === "auto" ? rec.key : form.formula;

    let basisKey = form.basis;
    if (basisKey === "auto")
      basisKey =
        form.formula === "auto" && rec.useAdjusted ? "adjusted" : "actual";
    const basisW = { actual: w, ibw, adjusted: adj }[basisKey];
    if (!Number.isFinite(basisW) || basisW <= 0) {
      return {
        error: "Dasar berat badan tidak valid. Periksa kembali BB dan TB.",
      };
    }
    const basisLabel = {
      actual: "BB aktual",
      ibw: "BB ideal",
      adjusted: "Adjusted BW",
    }[basisKey];

    // Faktor stres
    let fs = STRESS_FACTORS.find((s) => s.key === form.stress)?.value ?? 1;
    if (form.stress === "burn") fs = burnStressFactor(num(form.tbsa)) ?? 1;
    if (form.stress === "custom") fs = num(form.customFs) || 1;
    const fa = num(form.fa);

    let bmrRes;
    let teeRes;
    if (key === "espen") {
      teeRes = espenCritical(basisW, num(form.espenKcal) || 25);
      bmrRes = null;
    } else {
      const f = BMR_FORMULAS[key];
      bmrRes = f.fn({
        weight: basisW,
        height: h,
        age,
        sex: form.sex,
        bodyFat: bf,
      });
      if (!bmrRes)
        return {
          error:
            key === "katch"
              ? "Katch-McArdle membutuhkan % lemak tubuh."
              : "Data belum lengkap.",
        };
      teeRes = tee(bmrRes.value, fa, fs);
    }
    if (!teeRes) return null;

    const proteinG = (num(form.proteinPerKg) || 0) * basisW;
    const macro = macroSplit(teeRes.value, {
      proteinGram: proteinG,
      fatPct: num(form.fatPct) || 25,
    });

    // Perbandingan semua rumus (BB yang sama)
    const compare = Object.entries(BMR_FORMULAS).map(([k, f]) => {
      const res = f.fn({
        weight: basisW,
        height: h,
        age,
        sex: form.sex,
        bodyFat: bf,
      });
      return {
        key: k,
        label: f.label,
        bmr: res?.value ?? null,
        tee: res ? res.value * fa * fs : null,
      };
    });

    return {
      b,
      ibw,
      adj,
      rec,
      key,
      basisW,
      basisLabel,
      fa,
      fs,
      bmrRes,
      teeRes,
      macro,
      compare,
      proteinG,
      steps: [
        `Dasar berat badan: ${basisLabel} = ${fmt(basisW)} kg`,
        ...(bmrRes ? bmrRes.steps : []),
        ...(form.stress === "burn"
          ? [`Faktor stres luka bakar TBSA ${fmt(num(form.tbsa))}% = ${fs}`]
          : []),
        ...teeRes.steps,
      ],
    };
  }, [form]);

  const record = () => ({
    type: "bmr-tee",
    title: `TEE ${fmt(r.teeRes.value, 0)} kkal/hari (${r.key === "espen" ? "ESPEN" : BMR_FORMULAS[r.key].label})`,
    input: {
      "Jenis kelamin": form.sex === "male" ? "Laki-laki" : "Perempuan",
      "Umur (th)": num(form.age),
      "Berat badan (kg)": num(form.weight),
      "Tinggi badan (cm)": num(form.height),
      "% lemak tubuh": num(form.bodyFat) || null,
      "Pasien kritis/ICU": form.critical,
      "Rumus dipilih":
        form.formula === "auto" ? `Otomatis: ${r.rec.reason}` : form.formula,
      "Faktor aktivitas": r.fa,
      "Faktor stres": r.fs,
      "Protein (g/kg)": num(form.proteinPerKg),
      "Lemak (% energi)": num(form.fatPct),
    },
    output: {
      Rumus: r.key === "espen" ? "ESPEN kkal/kg" : BMR_FORMULAS[r.key].label,
      "Dasar berat badan": `${r.basisLabel} ${fmt(r.basisW)} kg`,
      "IMT (kg/m²)": Number(r.b.toFixed(1)),
      "BMR (kkal)": r.bmrRes ? Math.round(r.bmrRes.value) : null,
      "TEE (kkal/hari)": Math.round(r.teeRes.value),
      "Protein (g)": Math.round(r.macro.protein.gram),
      "Lemak (g)": Math.round(r.macro.fat.gram),
      "Karbohidrat (g)": Math.round(r.macro.carb.gram),
    },
    tables: [
      {
        title: `Perbandingan rumus (dasar ${r.basisLabel})`,
        columns: ["Rumus", "BMR (kkal)", "TEE (kkal)"],
        rows: r.compare.map((c) => [
          c.label,
          c.bmr ? Math.round(c.bmr) : "–",
          c.tee ? Math.round(c.tee) : "–",
        ]),
      },
    ],
    steps: r.steps,
  });

  const formulaOptions = [
    { value: "auto", label: "Otomatis (decision tree)" },
    ...Object.entries(BMR_FORMULAS).map(([k, v]) => ({
      value: k,
      label: v.label,
    })),
    { value: "espen", label: "ESPEN kkal/kg (pasien kritis)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <h2 className="font-semibold">Data pasien</h2>
          <SexField value={form.sex} onChange={set("sex")} />
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            <NumberField
              label="Umur"
              unit="th"
              value={form.age}
              onChange={set("age")}
            />
            <NumberField
              label="Berat badan"
              unit="kg"
              value={form.weight}
              onChange={set("weight")}
            />
            <NumberField
              label="Tinggi badan"
              unit="cm"
              value={form.height}
              onChange={set("height")}
            />
            <NumberField
              label="% lemak (BIA)"
              unit="%"
              value={form.bodyFat}
              onChange={set("bodyFat")}
              hint="Opsional"
            />
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
            <SelectField
              label="Rumus BMR"
              value={form.formula}
              onChange={set("formula")}
              options={formulaOptions}
            />
            <SelectField
              label="Dasar berat badan"
              value={form.basis}
              onChange={set("basis")}
              options={WEIGHT_BASIS}
            />
          </div>
          {(form.formula === "espen" ||
            (form.formula === "auto" && form.critical)) && (
            <NumberField
              label="ESPEN"
              unit="kkal/kg"
              value={form.espenKcal}
              onChange={set("espenKcal")}
              hint="Rentang 20–25 kkal/kg BB"
            />
          )}
          <SelectField
            label="Faktor aktivitas (FA)"
            value={form.fa}
            onChange={set("fa")}
            options={ACTIVITY_FACTORS.map((a) => ({
              value: String(a.value),
              label: `${a.value} — ${a.label}`,
            }))}
          />
          <SelectField
            label="Faktor stres (FS)"
            value={form.stress}
            onChange={set("stress")}
            options={STRESS_FACTORS.map((s) => ({
              value: s.key,
              label: s.value ? `${s.value} — ${s.label}` : s.label,
            }))}
          />
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
            <NumberField
              label="Faktor stres manual"
              value={form.customFs}
              onChange={set("customFs")}
              step="0.05"
            />
          )}

          <div className="divider my-3" />
          <h2 className="font-semibold">Distribusi makronutrien</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField
              label="Protein"
              unit="g/kg"
              value={form.proteinPerKg}
              onChange={set("proteinPerKg")}
              step="0.1"
            />
            <NumberField
              label="Lemak"
              unit="% energi"
              value={form.fatPct}
              onChange={set("fatPct")}
            />
          </div>
          <p className="text-xs text-base-content/60">
            Karbohidrat = sisa energi setelah protein dan lemak.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {r?.rec && (
          <div role="status" className="alert alert-info alert-soft text-sm">
            <span>
              <strong>Rekomendasi rumus:</strong> {r.rec.reason}
              {form.formula !== "auto" && " (Anda memilih rumus manual.)"}
            </span>
          </div>
        )}
        {r?.error && (
          <div className="alert alert-warning alert-soft text-sm">
            {r.error}
          </div>
        )}
        <ResultSlip
          title="Total energy expenditure (TEE)"
          value={r?.teeRes?.value}
          unit="kkal/hari"
          steps={r?.steps}
          empty={
            (!r || r.error) &&
            "Isi umur, berat, dan tinggi badan untuk melihat hasil."
          }
        >
          {r?.teeRes && (
            <div>
              {r.bmrRes && (
                <ResultRow
                  label={`BMR (${r.bmrRes.formula})`}
                  value={r.bmrRes.value}
                  digits={0}
                  unit="kkal"
                />
              )}
              <ResultRow label="IMT" value={r.b} unit="kg/m²" />
              <ResultRow label="FA × FS" value={`${r.fa} × ${r.fs}`} />
              <ResultRow
                label={`Protein (${form.proteinPerKg} g/kg)`}
                value={r.macro.protein.gram}
                digits={0}
                unit={`g (${fmt(r.macro.protein.pct, 0)}%)`}
              />
              <ResultRow
                label="Lemak"
                value={r.macro.fat.gram}
                digits={0}
                unit={`g (${fmt(r.macro.fat.pct, 0)}%)`}
              />
              <ResultRow
                label="Karbohidrat"
                value={r.macro.carb.gram}
                digits={0}
                unit={`g (${fmt(r.macro.carb.pct, 0)}%)`}
              />
            </div>
          )}
        </ResultSlip>
        <SaveBar record={record} disabled={!r?.teeRes} />

        {r?.compare && (
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
                  <tr
                    key={c.key}
                    className={
                      c.key === r.key ? "bg-primary/5 font-semibold" : ""
                    }
                  >
                    <td>{c.label}</td>
                    <td className="text-right tabular-nums">
                      {c.bmr ? fmt(c.bmr, 0) : "–"}
                    </td>
                    <td className="text-right tabular-nums">
                      {c.tee ? fmt(c.tee, 0) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
