import { useMemo, useState } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { doughnutConfig } from "@/components/utils/generals/charts/chart-configs";
import { NumberField, SelectField } from "@/components/utils/generals/Field";
import ResultSlip, { ResultRow } from "@/components/utils/generals/ResultSlip";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import { useApp } from "@/context/AppContext";
import { fmt, glucoseInfusionRate, npcInterpretation, npcNitrogen, num, pnOsmolarity, round } from "@/helpers/formulas";
import type { NpcTarget } from "@/helpers/formulas";
import { validateRanges } from "@/helpers/validation";
import type { Category, ReportRecord } from "@/types";

interface EnteralForm {
  totalKcal: string;
  proteinG: string;
  target: NpcTarget;
  weight: string;
  dextroseG: string;
  hours: string;
  volumeMl: string;
  aminoG: string;
  lipidG: string;
  electrolyteMeq: string;
}

const TARGET_OPTIONS: { value: NpcTarget; label: string }[] = [
  { value: "stable", label: "Stabil (target 120–150:1)" },
  { value: "critical", label: "Kritis (target 80–100:1)" },
];

/** EN/PN quick calc: NPC:N, glucose infusion rate, estimasi osmolaritas */
export default function EnteralCalculator() {
  const { patient } = useApp();
  const [f, setF] = useState<EnteralForm>({
    totalKcal: "", proteinG: "", target: "stable",
    weight: patient.weight || "", dextroseG: "", hours: "24",
    volumeMl: "", aminoG: "", lipidG: "", electrolyteMeq: "",
  });
  const set =
    <K extends keyof EnteralForm>(k: K) =>
    (v: EnteralForm[K]) =>
      setF((s) => ({ ...s, [k]: v }));

  const errors = useMemo(
    () =>
      validateRanges([
        { value: f.totalKcal, limit: LIMITS.totalKcal },
        { value: f.proteinG, limit: LIMITS.proteinG },
        { value: f.weight, limit: LIMITS.weight },
        { value: f.dextroseG, limit: LIMITS.dextroseG },
        { value: f.hours, limit: LIMITS.infusionHours },
        { value: f.volumeMl, limit: LIMITS.volumeMl },
        { value: f.aminoG, limit: LIMITS.aminoG },
        { value: f.lipidG, limit: LIMITS.lipidG },
        { value: f.electrolyteMeq, limit: LIMITS.electrolyte },
      ]),
    [f],
  );

  const r = useMemo(() => {
    if (errors.length) return { npc: null, gir: null, osm: null, interp: null };
    const npc = npcNitrogen({ totalKcal: num(f.totalKcal), proteinG: num(f.proteinG) });
    const gir = glucoseInfusionRate({ dextroseG: num(f.dextroseG), weight: num(f.weight), hours: num(f.hours) });
    const osm =
      num(f.volumeMl) > 0
        ? pnOsmolarity({
            volumeMl: num(f.volumeMl),
            dextroseG: num(f.dextroseG) || 0,
            aminoG: num(f.aminoG) || 0,
            lipidG: num(f.lipidG) || 0,
            electrolyteMeq: num(f.electrolyteMeq) || 0,
          })
        : null;
    return { npc, gir, osm, interp: npc && npcInterpretation(npc.value, f.target) };
  }, [f, errors]);

  // Penjagaan: protein × 4 melebihi total energi → kalori non-protein negatif
  const npcError = r.npc && r.npc.npc <= 0 ? "Total protein × 4 kkal melebihi total energi; kalori non-protein menjadi negatif." : null;

  const girCategory: Category | null = r.gir
    ? r.gir.value > 5
      ? { label: "Melebihi batas dewasa (≤ 4–5 mg/kg/menit)", tone: "warning" }
      : { label: "Dalam batas dewasa", tone: "success" }
    : null;

  const energyChart = useMemo(
    () =>
      r.npc && r.npc.npc > 0
        ? doughnutConfig({
            labels: ["Kalori protein", "Kalori non-protein"],
            values: [num(f.proteinG) * 4, r.npc.npc],
            unit: "kkal",
            colors: [THEME_COLORS.accent, THEME_COLORS.primary],
          })
        : null,
    [r.npc, f.proteinG],
  );

  const record = (): ReportRecord => {
    if (!r.npc || !r.interp) throw new Error("Hasil belum tersedia");
    return {
      type: "enteral-parenteral",
      title: `NPC:N ${fmt(r.npc.value)}:1 (${r.interp.label})`,
      input: {
        "Total energi (kkal)": num(f.totalKcal),
        "Total protein (g)": num(f.proteinG),
        "Kondisi pasien": f.target === "critical" ? "Kritis (80–100:1)" : "Stabil (120–150:1)",
        "Berat badan (kg)": num(f.weight) || null,
        "Dekstrosa (g/hari)": num(f.dextroseG) || null,
        "Lama infus (jam)": num(f.hours) || null,
        "Volume (mL)": num(f.volumeMl) || null,
        "Asam amino (g)": num(f.aminoG) || null,
        "Lipid (g)": num(f.lipidG) || null,
        "Na + K (mEq)": num(f.electrolyteMeq) || null,
      },
      output: {
        "Kalori non-protein (kkal)": round(r.npc.npc),
        "Nitrogen (g)": round(r.npc.nitrogen),
        "NPC:N": `${fmt(r.npc.value)}:1`,
        Interpretasi: r.interp.label,
        "GIR (mg/kg/menit)": r.gir ? round(r.gir.value) : null,
        "Osmolaritas (mOsm/L)": r.osm ? round(r.osm.value) : null,
      },
      steps: [...r.npc.steps, ...(r.gir?.steps || []), ...(r.osm?.steps || [])],
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <h2 className="font-semibold">Rasio NPC:N</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Total energi" unit="kkal" value={f.totalKcal} onChange={set("totalKcal")} />
            <NumberField label="Total protein" unit="g" value={f.proteinG} onChange={set("proteinG")} />
          </div>
          <SelectField label="Kondisi pasien" value={f.target} onChange={set("target")} options={TARGET_OPTIONS} />
          <div className="divider my-3" />
          <h2 className="font-semibold">Parenteral (opsional)</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Berat badan" unit="kg" value={f.weight} onChange={set("weight")} />
            <NumberField label="Dekstrosa" unit="g/hari" value={f.dextroseG} onChange={set("dextroseG")} />
            <NumberField label="Lama infus" unit="jam" value={f.hours} onChange={set("hours")} />
            <NumberField label="Volume total" unit="mL" value={f.volumeMl} onChange={set("volumeMl")} />
            <NumberField label="Asam amino" unit="g" value={f.aminoG} onChange={set("aminoG")} />
            <NumberField label="Lipid" unit="g" value={f.lipidG} onChange={set("lipidG")} />
            <NumberField label="Na + K" unit="mEq" value={f.electrolyteMeq} onChange={set("electrolyteMeq")} hint="Total dalam kantong" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <InputAlert errors={npcError ? [...errors, npcError] : errors} />
        <ResultSlip
          title="Non-protein calorie : nitrogen"
          value={r.npc?.value}
          unit=": 1"
          category={r.interp}
          steps={r.npc?.steps}
          empty={!r.npc && "Isi total energi dan protein."}
        >
          {r.npc && (
            <div>
              <ResultRow label="Kalori non-protein" value={r.npc.npc} unit="kkal" />
              <ResultRow label="Nitrogen" value={r.npc.nitrogen} unit="g" />
            </div>
          )}
        </ResultSlip>
        {(r.gir || r.osm) && (
          <ResultSlip
            title="Glucose infusion rate"
            value={r.gir?.value}
            unit="mg/kg/menit"
            category={girCategory}
            steps={[...(r.gir?.steps || []), ...(r.osm?.steps || [])]}
            empty={!r.gir && "Isi BB dan dekstrosa untuk menghitung GIR."}
          >
            {r.osm && (
              <ResultRow
                label="Estimasi osmolaritas"
                value={`${fmt(r.osm.value)} mOsm/L ${r.osm.value > 900 ? "(perlu akses vena sentral)" : "(dapat perifer, < 900)"}`}
              />
            )}
          </ResultSlip>
        )}
        <SaveBar record={record} disabled={!r.npc} />
        {energyChart && (
          <ChartCard title="Komposisi energi" description="Kalori dari protein dibandingkan kalori non-protein." config={energyChart} />
        )}
      </div>
    </div>
  );
}
