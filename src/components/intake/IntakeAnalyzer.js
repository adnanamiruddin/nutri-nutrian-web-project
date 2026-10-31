import { useMemo, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import Field, { NumberField, SelectField } from "@/components/ui/Field";
import SaveBar from "@/components/ui/SaveBar";
import FoodPicker from "@/components/search/FoodPicker";
import { useApp } from "@/context/AppContext";
import akg from "@/data/akg2019.json";
import { FREQ_FACTORS, adequacyCategory, fmt, num } from "@/utils/formulas";
import useFoods from "@/utils/useFoods";
const COMPARE = [
  { key: "energi", label: "Energi", unit: "kkal", d: 0 },
  { key: "protein", label: "Protein", unit: "g", d: 1 },
  { key: "lemak", label: "Lemak", unit: "g", d: 1 },
  { key: "karbohidrat", label: "Karbohidrat", unit: "g", d: 1 },
  { key: "serat", label: "Serat", unit: "g", d: 1 },
  { key: "kalsium", label: "Kalsium", unit: "mg", d: 0 },
  { key: "besi", label: "Besi", unit: "mg", d: 1 },
  { key: "vitC", label: "Vitamin C", unit: "mg", d: 0 },
];
const TONE = { success: "progress-success", warning: "progress-warning", error: "progress-error" };
const BADGE = { success: "badge-success", warning: "badge-warning", error: "badge-error" };

let rowSeq = 0;
const newRow = () => ({ id: `r${(rowSeq += 1)}`, kode: "", qty: "", freq: "1", period: "day", meal: "Pagi" });

function findAkg(sex, age) {
  if (!(age >= 1)) return null;
  return akg.items.find((a) => (a.sex === "all" || a.sex === sex) && age >= a.minAge && age <= a.maxAge) || null;
}

export default function IntakeAnalyzer() {
  const { patient } = useApp();
  const { byCode: FOOD_BY_CODE } = useFoods();
  const [mode, setMode] = useState("recall");
  const [rows, setRows] = useState([newRow()]);
  const [targetSrc, setTargetSrc] = useState("akg");
  const [akgIdx, setAkgIdx] = useState("auto");
  const [rx, setRx] = useState({ energi: "", proteinPct: "15", fatPct: "25" });

  const setRow = (id, key, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: v } : r)));

  /* ---------- Hitung asupan ---------- */
  const calc = useMemo(() => {
    const items = rows
      .map((r) => {
        const food = FOOD_BY_CODE[r.kode];
        if (!food) return null;
        let grams = num(r.qty) || 0;
        if (mode === "ffq") grams *= (num(r.freq) || 0) * FREQ_FACTORS[r.period].factor;
        // null = tidak ada data di TKPI → dihitung 0 dan dicatat
        const g = Object.fromEntries(Object.entries(food.gizi).map(([k, v]) => [k, v === null ? null : (v * grams) / 100]));
        return { ...r, food, grams, g };
      })
      .filter(Boolean);
    const total = Object.fromEntries(COMPARE.map((c) => [c.key, items.reduce((s, i) => s + (i.g[c.key] || 0), 0)]));
    const missing = Object.fromEntries(COMPARE.map((c) => [c.key, items.filter((i) => i.g[c.key] === null).length]));
    return { items, total: { ...total, natrium: items.reduce((s, i) => s + (i.g.natrium || 0), 0) }, missing };

  }, [rows, mode, FOOD_BY_CODE]);

  /* ---------- Target ---------- */
  const autoAkg = findAkg(patient.sex, num(patient.age));
  const akgRow = akgIdx === "auto" ? autoAkg : akg.items[Number(akgIdx)];
  const target = useMemo(() => {
    if (targetSrc === "akg") return akgRow ? { ...akgRow, sourceLabel: `AKG 2019: ${akgRow.label}` } : null;
    const e = num(rx.energi);
    if (!(e > 0)) return null;
    const p = (e * (num(rx.proteinPct) || 0)) / 100 / 4;
    const l = (e * (num(rx.fatPct) || 0)) / 100 / 9;
    const k = (e - p * 4 - l * 9) / 4;
    const base = akgRow || {};
    return {
      energi: e, protein: p, lemak: l, karbohidrat: k,
      serat: base.serat, kalsium: base.kalsium, besi: base.besi, vitC: base.vitC,
      sourceLabel: `Preskripsi ${fmt(e, 0)} kkal (mikro: ${akgRow ? `AKG ${akgRow.label}` : "–"})`,
    };
  }, [targetSrc, rx, akgRow]);

  const compare = COMPARE.map((c) => {
    const t = target?.[c.key];
    const pct = t > 0 ? (calc.total[c.key] / t) * 100 : null;
    return { ...c, intake: calc.total[c.key], target: t, pct, cat: adequacyCategory(pct) };
  });

  const hasData = calc.items.length > 0;

  const record = () => ({
    type: "asupan",
    title: `${mode === "ffq" ? "SQ-FFQ" : "Recall 24 jam"}: ${fmt(calc.total.energi, 0)} kkal (${calc.items.length} item)`,
    input: {
      Metode: mode === "ffq" ? "SQ-FFQ" : "Recall 24 jam",
      Target: target?.sourceLabel || "Belum ditentukan",
    },
    output: Object.fromEntries(
      compare.map((c) => [`${c.label} (${c.unit})`, `${fmt(c.intake, c.d)}${c.pct !== null ? ` (${fmt(c.pct, 0)}%, ${c.cat.label})` : ""}`]),
    ),
    tables: [
      {
        title: "Daftar asupan",
        columns: mode === "ffq" ? ["Kode", "Bahan makanan", "Porsi (g)", "Frekuensi", "g/hari", "Energi (kkal)", "Protein (g)", "Lemak (g)", "KH (g)"] : ["Waktu", "Kode", "Bahan makanan", "Berat (g)", "Energi (kkal)", "Protein (g)", "Lemak (g)", "KH (g)"],
        rows: calc.items.map((i) => [
          ...(mode === "ffq" ? [] : [i.meal]),
          i.food.kode, i.food.nama,
          ...(mode === "ffq" ? [num(i.qty), `${i.freq} ${FREQ_FACTORS[i.period].label}`] : []),
          Math.round(i.grams), Math.round(i.g.energi || 0), Number((i.g.protein || 0).toFixed(1)), Number((i.g.lemak || 0).toFixed(1)), Number((i.g.karbohidrat || 0).toFixed(1)),
        ]),
      },
      {
        title: "Tingkat kecukupan",
        columns: ["Zat gizi", "Asupan", "Target", "% kecukupan", "Kategori"],
        rows: compare.map((c) => [`${c.label} (${c.unit})`, fmt(c.intake, c.d), c.target ? fmt(c.target, c.d) : "–", c.pct !== null ? `${fmt(c.pct, 0)}%` : "–", c.cat?.label || "–"]),
      },
    ],
    steps: ["Asupan zat gizi = berat (g) ÷ 100 × kandungan per 100 g BDD (TKPI)", "% kecukupan = asupan ÷ target × 100%", "Kategori: <70% defisit berat, 70–79% sedang, 80–89% ringan, 90–119% normal, ≥120% lebih (Depkes 1996)"],
  });

  return (
    <div className="space-y-6">
      {/* Target / preskripsi */}
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body gap-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Preskripsi / target kebutuhan</h2>
            <div className="tabs tabs-box tabs-sm" role="tablist">
              {[
                ["akg", "AKG 2019"],
                ["rx", "Preskripsi sendiri"],
              ].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={targetSrc === k} className={`tab ${targetSrc === k ? "tab-active" : ""}`} onClick={() => setTargetSrc(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-x-4 md:grid-cols-4">
            <SelectField
              className="md:col-span-2"
              label="Kelompok AKG"
              value={akgIdx}
              onChange={setAkgIdx}
              hint={akgIdx === "auto" && !autoAkg ? "Isi umur & jenis kelamin di profil pasien, atau pilih kelompok manual." : undefined}
              options={[
                { value: "auto", label: `Otomatis dari profil${autoAkg ? ` (${autoAkg.label})` : ""}` },
                ...akg.items.map((a, i) => ({ value: String(i), label: a.label })),
              ]}
            />
            {targetSrc === "rx" && (
              <>
                <NumberField label="Energi" unit="kkal" value={rx.energi} onChange={(v) => setRx((s) => ({ ...s, energi: v }))} />
                <div className="grid grid-cols-2 gap-x-3">
                  <NumberField label="Protein" unit="%" value={rx.proteinPct} onChange={(v) => setRx((s) => ({ ...s, proteinPct: v }))} />
                  <NumberField label="Lemak" unit="%" value={rx.fatPct} onChange={(v) => setRx((s) => ({ ...s, fatPct: v }))} />
                </div>
              </>
            )}
          </div>
          {target && targetSrc === "rx" && (
            <p className="text-sm tabular-nums text-base-content/70">
              Protein {fmt(target.protein, 0)} g, lemak {fmt(target.lemak, 0)} g, karbohidrat {fmt(target.karbohidrat, 0)} g
            </p>
          )}
        </div>
      </section>

      {/* Input makanan */}
      <section className="card border border-base-300 bg-base-100">
        <div className="card-body gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Daftar asupan</h2>
            <div className="tabs tabs-box tabs-sm" role="tablist">
              {[
                ["recall", "Recall 24 jam"],
                ["ffq", "SQ-FFQ"],
              ].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} className={`tab ${mode === k ? "tab-active" : ""}`} onClick={() => setMode(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-base-content/60">
            {mode === "ffq"
              ? "SQ-FFQ: porsi (g) × frekuensi (per hari/minggu/bulan) dikonversi menjadi rata-rata gram per hari. Data pangan dari TKPI."
              : "Recall 24 jam: cari bahan makanan dari TKPI, isi berat dalam gram bagian yang dapat dimakan (BDD)."}
          </p>

          <div className="space-y-3">
            {rows.map((r, idx) => {
              const item = calc.items.find((i) => i.id === r.id);
              return (
                <div key={r.id} className="grid grid-cols-2 items-end gap-x-3 rounded-box border border-base-300 p-3 md:grid-cols-12">
                  {mode === "recall" && (
                    <Field label="Waktu" className="col-span-2 md:col-span-2">
                      <select className="select select-sm w-full" value={r.meal} onChange={(e) => setRow(r.id, "meal", e.target.value)}>
                        {["Pagi", "Selingan pagi", "Siang", "Selingan sore", "Malam"].map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label={`Bahan makanan ${idx + 1}`} className={`col-span-2 ${mode === "recall" ? "md:col-span-4" : "md:col-span-5"}`}>
                    <FoodPicker id={`food-${r.id}`} value={r.kode} onChange={(v) => setRow(r.id, "kode", v)} />
                  </Field>
                  <Field label={mode === "ffq" ? "Porsi (g)" : "Berat (g)"} className="md:col-span-2">
                    <input type="number" min="0" step="any" inputMode="decimal" className="input input-sm w-full tabular-nums" value={r.qty} onChange={(e) => setRow(r.id, "qty", e.target.value)} />
                  </Field>
                  {mode === "ffq" && (
                    <>
                      <Field label="Frekuensi" className="md:col-span-1">
                        <input type="number" min="0" step="any" className="input input-sm w-full tabular-nums" value={r.freq} onChange={(e) => setRow(r.id, "freq", e.target.value)} />
                      </Field>
                      <Field label="Per" className="md:col-span-2">
                        <select className="select select-sm w-full" value={r.period} onChange={(e) => setRow(r.id, "period", e.target.value)}>
                          {Object.entries(FREQ_FACTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </Field>
                    </>
                  )}
                  <div className={`col-span-2 flex items-center justify-between gap-2 pb-1 ${mode === "ffq" ? "md:col-span-2" : "md:col-span-4"}`}>
                    <span className="text-xs tabular-nums text-base-content/70">
                      {item ? `${fmt(item.grams, 0)} g/hari; ${fmt(item.g.energi, 0)} kkal` : ""}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square"
                      aria-label="Hapus baris"
                      onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [newRow()]))}
                    >
                      <LuTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <LuPlus aria-hidden /> Tambah bahan makanan
          </button>
        </div>
      </section>

      {/* Hasil */}
      <section className="result-slip rounded-box border border-base-300 bg-base-100">
        <div className="flex flex-col gap-1 border-b border-base-300 px-5 py-4 md:flex-row md:items-baseline md:justify-between">
          <h2 className="text-sm font-semibold text-base-content/70">Tingkat kecukupan asupan</h2>
          <span className="text-xs text-base-content/60">{target ? target.sourceLabel : "Target belum ditentukan"}</span>
        </div>
        {!hasData ? (
          <p className="px-5 py-4 text-sm text-base-content/60">Pilih bahan makanan dan isi jumlahnya untuk melihat analisis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Zat gizi</th>
                  <th className="text-right">Asupan</th>
                  <th className="text-right">Target</th>
                  <th className="min-w-40">% kecukupan</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => (
                  <tr key={c.key}>
                    <td className="font-medium">{c.label}</td>
                    <td className="text-right tabular-nums">
                      {fmt(c.intake, c.d)} <span className="text-xs text-base-content/55">{c.unit}</span>
                    </td>
                    <td className="text-right tabular-nums">{c.target ? fmt(c.target, c.d) : "–"}</td>
                    <td>
                      {c.pct !== null ? (
                        <div className="flex items-center gap-2">
                          <progress className={`progress w-24 ${TONE[c.cat.tone]}`} value={Math.min(c.pct, 150)} max="150" />
                          <span className="w-12 text-right text-sm tabular-nums">{fmt(c.pct, 0)}%</span>
                          <span className={`badge badge-soft badge-sm ${BADGE[c.cat.tone]}`}>{c.cat.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-base-content/50">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-base-300 px-5 py-3 text-xs text-base-content/60">
              Natrium total {fmt(calc.total.natrium, 0)} mg.
              {Object.entries(calc.missing).some(([, n]) => n > 0) &&
                ` Sebagian bahan tidak punya data di TKPI dan dihitung 0 (${COMPARE.filter((c) => calc.missing[c.key] > 0).map((c) => `${c.label}: ${calc.missing[c.key]} bahan`).join(", ")}).`} Kategori: &lt;70% defisit berat, 70–79% sedang, 80–89% ringan, 90–119% normal,
              ≥120% lebih (Depkes 1996).
            </p>
          </div>
        )}
      </section>
      <SaveBar record={record} disabled={!hasData} />
    </div>
  );
}
