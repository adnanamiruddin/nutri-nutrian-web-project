import { useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import ResultSlip, { ResultRow } from "@/components/ui/ResultSlip";
import SaveBar from "@/components/ui/SaveBar";
import { useApp } from "@/context/AppContext";
import { fmt, glucoseInfusionRate, npcInterpretation, npcNitrogen, num, pnOsmolarity } from "@/utils/formulas";

/** EN/PN quick calc: NPC:N, glucose infusion rate, estimasi osmolaritas */
export default function EnteralCalculator() {
  const { patient } = useApp();
  const [f, setF] = useState({
    totalKcal: "", proteinG: "", target: "stable",
    weight: patient.weight || "", dextroseG: "", hours: "24",
    volumeMl: "", aminoG: "", lipidG: "", electrolyteMeq: "",
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const r = useMemo(() => {
    const npc = npcNitrogen({ totalKcal: num(f.totalKcal), proteinG: num(f.proteinG) });
    const gir = glucoseInfusionRate({ dextroseG: num(f.dextroseG), weight: num(f.weight), hours: num(f.hours) });
    const osm = num(f.volumeMl) > 0
      ? pnOsmolarity({ volumeMl: num(f.volumeMl), dextroseG: num(f.dextroseG) || 0, aminoG: num(f.aminoG) || 0, lipidG: num(f.lipidG) || 0, electrolyteMeq: num(f.electrolyteMeq) || 0 })
      : null;
    return { npc, gir, osm, interp: npc && npcInterpretation(npc.value, f.target) };
  }, [f]);

  const record = () => ({
    type: "enteral-parenteral",
    title: `NPC:N ${fmt(r.npc.value, 0)}:1 (${r.interp.label})`,
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
      "Kalori non-protein (kkal)": Math.round(r.npc.npc),
      "Nitrogen (g)": Number(r.npc.nitrogen.toFixed(2)),
      "NPC:N": `${Math.round(r.npc.value)}:1`,
      Interpretasi: r.interp.label,
      "GIR (mg/kg/menit)": r.gir ? Number(r.gir.value.toFixed(2)) : null,
      "Osmolaritas (mOsm/L)": r.osm ? Math.round(r.osm.value) : null,
    },
    steps: [...r.npc.steps, ...(r.gir?.steps || []), ...(r.osm?.steps || [])],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <h2 className="font-semibold">Rasio NPC:N</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Total energi" unit="kkal" value={f.totalKcal} onChange={set("totalKcal")} />
            <NumberField label="Total protein" unit="g" value={f.proteinG} onChange={set("proteinG")} />
          </div>
          <SelectField
            label="Kondisi pasien"
            value={f.target}
            onChange={set("target")}
            options={[
              { value: "stable", label: "Stabil (target 120–150:1)" },
              { value: "critical", label: "Kritis (target 80–100:1)" },
            ]}
          />
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
              <ResultRow label="Kalori non-protein" value={r.npc.npc} digits={0} unit="kkal" />
              <ResultRow label="Nitrogen" value={r.npc.nitrogen} digits={2} unit="g" />
            </div>
          )}
        </ResultSlip>
        {(r.gir || r.osm) && (
          <ResultSlip
            title="Glucose infusion rate"
            value={r.gir?.value}
            digits={2}
            unit="mg/kg/menit"
            category={r.gir && (r.gir.value > 5 ? { label: "Melebihi batas dewasa (≤ 4–5 mg/kg/menit)", tone: "warning" } : { label: "Dalam batas dewasa", tone: "success" })}
            steps={[...(r.gir?.steps || []), ...(r.osm?.steps || [])]}
            empty={!r.gir && "Isi BB dan dekstrosa untuk menghitung GIR."}
          >
            {r.osm && (
              <ResultRow
                label="Estimasi osmolaritas"
                value={`${fmt(r.osm.value, 0)} mOsm/L ${r.osm.value > 900 ? "(perlu akses vena sentral)" : "(dapat perifer, < 900)"}`}
              />
            )}
          </ResultSlip>
        )}
        <SaveBar record={record} disabled={!r.npc} />
      </div>
    </div>
  );
}
