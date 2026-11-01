import { useMemo } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { barConfig, lineConfig } from "@/components/utils/generals/charts/chart-configs";
import Field, { NumberField, SelectField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import {
  ACTIVITY_FACTORS, PREGNANCY_ADDITION, bmi, bmiCategory, bmrMifflin, fmt, gwgExpectedAtWeek, gwgTarget, isPos, num, round,
  trimesterFromWeek,
} from "@/helpers/formulas";
import type { GwgTarget, PregnancyStandard } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import usePatientForm from "@/hooks/usePatientForm";
import type { Category, ReportRecord, Tone } from "@/types";

type MaternalStatus = "pregnant" | "lactating";

interface GwgInfo {
  preBmi: number;
  preCat: Category | null;
  target: GwgTarget | null;
  expected: { min: number; max: number } | null;
  gain: number | null;
  status: Category | null;
}

interface MaternalResult {
  base: number;
  steps: string[];
  addition?: number;
  phase?: string;
  total?: number;
  gwg?: GwgInfo | null;
  needWeek?: boolean;
  needMonth?: boolean;
}

const STATUS_OPTIONS: [MaternalStatus, string][] = [
  ["pregnant", "Hamil"],
  ["lactating", "Menyusui"],
];
const STANDARD_OPTIONS = (Object.entries(PREGNANCY_ADDITION) as [PregnancyStandard, (typeof PREGNANCY_ADDITION)[PregnancyStandard]][]).map(([k, v]) => ({
  value: k,
  label: `${v.label} — T1 +${v.t1}, T2 +${v.t2}, T3 +${v.t3}; menyusui +${v.lact1}/+${v.lact2}`,
}));
const ACTIVITY_OPTIONS = ACTIVITY_FACTORS.map((a) => ({ value: String(a.value), label: `${a.value} — ${a.label}` }));
const GWG_WEEKS = Array.from({ length: 41 }, (_, i) => i);

/** Kebutuhan ibu hamil & menyusui + pemantauan kenaikan BB kehamilan */
export default function MaternalCalculator() {
  const [form, set] = usePatientForm({
    status: "pregnant" as MaternalStatus,
    standard: "iom" as PregnancyStandard,
    week: "",
    prePregWeight: "",
    lactMonth: "",
    fa: "1.3",
    baseOverride: "",
  });

  const errors = useMemo(
    () =>
      validateRanges([
        { value: form.age, limit: LIMITS.age },
        { value: form.height, limit: LIMITS.height },
        { value: form.weight, limit: LIMITS.weight, label: "BB saat ini" },
        { value: form.status === "pregnant" ? form.prePregWeight : "", limit: LIMITS.prePregWeight },
        { value: form.status === "pregnant" ? form.week : "", limit: LIMITS.pregnancyWeek },
        { value: form.status === "lactating" ? form.lactMonth : "", limit: LIMITS.babyMonth },
        { value: form.baseOverride, limit: LIMITS.energyOverride },
      ]),
    [form],
  );

  const r = useMemo((): MaternalResult | null => {
    if (errors.length) return null;
    const age = num(form.age);
    const h = num(form.height);
    const wNow = num(form.weight);
    const wPre = num(form.prePregWeight);
    const baseW = form.status === "pregnant" && isPos(wPre) ? wPre : wNow;
    const add = PREGNANCY_ADDITION[form.standard];
    let base = num(form.baseOverride);
    const steps: string[] = [];
    if (!isPos(base)) {
      const m = bmrMifflin({ weight: baseW, height: h, age, sex: "female" });
      if (!m) return null;
      base = m.value * num(form.fa);
      steps.push(...m.steps, `Energi dasar = BMR × FA ${form.fa} = ${fmt(base)} kkal (BB ${form.status === "pregnant" && isPos(wPre) ? "pra-hamil" : "saat ini"})`);
    } else {
      steps.push(`Energi dasar (input manual) = ${fmt(base)} kkal`);
    }

    let addition = 0;
    let phase = "";
    let gwg: GwgInfo | null = null;
    if (form.status === "pregnant") {
      const tri = trimesterFromWeek(num(form.week));
      if (!tri) return { base, steps, needWeek: true };
      addition = add[`t${tri}`];
      phase = `Trimester ${tri} (minggu ke-${form.week})`;
      if (isPos(wPre, h)) {
        const preBmi = bmi(wPre, h) as number;
        const target = gwgTarget(preBmi);
        const expected = gwgExpectedAtWeek(preBmi, num(form.week));
        const gain = isPos(wNow) ? wNow - wPre : null;
        let tone: Tone = "success";
        let label = "Sesuai rentang anjuran";
        if (gain !== null && expected) {
          if (gain < expected.min) {
            tone = "warning";
            label = "Di bawah rentang anjuran";
          }
          if (gain > expected.max) {
            tone = "warning";
            label = "Di atas rentang anjuran";
          }
        }
        gwg = { preBmi, preCat: bmiCategory(preBmi, "who"), target, expected, gain, status: gain !== null ? { label, tone } : null };
      }
    } else {
      const m = num(form.lactMonth);
      if (!(m >= 0)) return { base, steps, needMonth: true };
      addition = m < 6 ? add.lact1 : add.lact2;
      phase = m < 6 ? "Menyusui 6 bulan pertama" : "Menyusui 6 bulan kedua";
    }
    steps.push(`Tambahan ${phase} (${add.label}) = +${addition} kkal`, `Total = ${fmt(base)} + ${addition} = ${fmt(base + addition)} kkal`);
    return { base, addition, phase, total: base + addition, gwg, steps };
  }, [form, errors]);

  const energyChart = useMemo(
    () =>
      r?.total !== undefined &&
      barConfig({
        labels: ["Kebutuhan energi"],
        unit: "kkal",
        horizontal: true,
        stacked: true,
        series: [
          { label: "Energi dasar", data: [r.base], color: THEME_COLORS.accent },
          { label: r.phase ? `Tambahan (${r.phase})` : "Tambahan", data: [r.addition ?? 0], color: THEME_COLORS.primary },
        ],
      }),
    [r],
  );

  // Kurva anjuran kenaikan BB (IOM 2009) minggu 0–40 + posisi pasien pada minggu berjalan
  const gwgChart = useMemo(() => {
    const g = r?.gwg;
    if (!g) return null;
    const week = num(form.week);
    const exp = GWG_WEEKS.map((w) => (w === 0 ? { min: 0, max: 0 } : gwgExpectedAtWeek(g.preBmi, w)));
    return lineConfig({
      labels: GWG_WEEKS.map(String),
      unit: "kg",
      xTitle: "Usia kehamilan (minggu)",
      series: [
        { label: "Batas bawah anjuran", data: exp.map((e) => e?.min ?? null), color: THEME_COLORS.muted, dashed: true },
        { label: "Batas atas anjuran", data: exp.map((e) => e?.max ?? null), color: THEME_COLORS.primary, fill: "-1" },
        ...(g.gain !== null
          ? [{ label: "Kenaikan BB pasien", data: GWG_WEEKS.map((w) => (w === Math.round(week) ? g.gain : null)), color: THEME_COLORS.warning, pointRadius: 6 }]
          : []),
      ],
    });
  }, [r, form.week]);

  const record = (): ReportRecord => {
    if (!r?.total) throw new Error("Hasil belum tersedia");
    return {
      type: "maternal",
      title: `${r.phase}: ${fmt(r.total)} kkal/hari`,
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
        "Energi dasar (kkal)": round(r.base),
        "Tambahan (kkal)": r.addition,
        "Total energi (kkal/hari)": round(r.total),
        "IMT pra-hamil": r.gwg ? `${fmt(r.gwg.preBmi)} (${r.gwg.preCat?.label})` : null,
        "Kenaikan BB (kg)": r.gwg?.gain != null ? round(r.gwg.gain) : null,
        "Anjuran kenaikan saat ini (kg)": r.gwg?.expected ? `${fmt(r.gwg.expected.min)}–${fmt(r.gwg.expected.max)}` : null,
        "Anjuran kenaikan total (kg)": r.gwg?.target ? `${fmt(r.gwg.target.min)}–${fmt(r.gwg.target.max)}` : null,
      },
      steps: r.steps,
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <Field label="Status">
            <div className="join w-full">
              {STATUS_OPTIONS.map(([v, l]) => (
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
          <SelectField label="Acuan tambahan energi" value={form.standard} onChange={set("standard")} options={STANDARD_OPTIONS} />
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
          <SelectField label="Faktor aktivitas" value={form.fa} onChange={set("fa")} options={ACTIVITY_OPTIONS} />
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
        <InputAlert errors={errors} />
        <ResultSlip
          title="Kebutuhan energi"
          value={r?.total}
          unit="kkal/hari"
          steps={r?.total ? r.steps : []}
          empty={!r ? "Isi umur, berat, dan tinggi badan." : r.needWeek ? "Isi usia kehamilan (minggu)." : r.needMonth ? "Isi usia bayi (bulan)." : null}
        >
          {r?.total && (
            <div>
              <ResultRow label="Energi dasar" value={r.base} unit="kkal" />
              <ResultRow label={r.phase} value={`+${fmt(r.addition)}`} unit="kkal" />
            </div>
          )}
        </ResultSlip>
        {r?.gwg && (
          <ResultSlip
            title="Kenaikan berat badan kehamilan (IOM 2009)"
            value={r.gwg.gain}
            unit="kg"
            category={r.gwg.status}
            empty={r.gwg.gain === null && "Isi BB saat ini untuk melihat kenaikan BB."}
          >
            <ResultRow label="IMT pra-hamil" value={`${fmt(r.gwg.preBmi)} (${r.gwg.preCat?.label})`} />
            <ResultRow label={`Anjuran pada minggu ke-${form.week}`} value={`${fmt(r.gwg.expected?.min)}–${fmt(r.gwg.expected?.max)}`} unit="kg" />
            <ResultRow label="Anjuran total kehamilan" value={`${fmt(r.gwg.target?.min)}–${fmt(r.gwg.target?.max)}`} unit="kg" />
          </ResultSlip>
        )}
        <SaveBar record={record} disabled={!r?.total} />
        {energyChart && <ChartCard title="Komposisi kebutuhan energi" config={energyChart} height={150} />}
        {gwgChart && (
          <ChartCard
            title="Kurva anjuran kenaikan BB kehamilan"
            description="Area di antara garis adalah rentang anjuran IOM 2009 sesuai IMT pra-hamil."
            config={gwgChart}
            height={260}
          />
        )}
      </div>
    </div>
  );
}
