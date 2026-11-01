import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import InputAlert from "@/components/utils/alerts/InputAlert";
import AssessmentTable, { toReportTable } from "@/components/utils/generals/AssessmentTable";
import type { AssessmentRow } from "@/components/utils/generals/AssessmentTable";
import ChartCard from "@/components/utils/generals/charts/ChartCard";
import { TONE_COLOR, barConfig } from "@/components/utils/generals/charts/chart-configs";
import Field, { NumberField, SexField } from "@/components/utils/generals/Field";
import SaveBar from "@/components/utils/generals/SaveBar";
import { LIMITS } from "@/const/input-limits";
import { THEME_COLORS } from "@/const/theme";
import { useApp } from "@/context/AppContext";
import { ageFromDates, fmt, num, round } from "@/helpers/formulas";
import { METHODS, SD_HEADERS, assessGrowth } from "@/helpers/growth";
import type { TrendStatus } from "@/helpers/growth";
import { validateRanges } from "@/helpers/validation";
import type { ReportRecord, Sex, Tone } from "@/types";

const TONE: Record<Tone, string> = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};
const TEXT_TONE: Record<TrendStatus, string> = {
  ok: "text-success",
  risk: "text-warning",
  na: "text-base-content/60",
};
const trendTone = (s: TrendStatus): Tone | undefined => (s === "ok" ? "success" : s === "risk" ? "warning" : undefined);
const signed = (z: number) => `${z > 0 ? "+" : ""}${fmt(z)}`;

/** Pita Z-score −4…+4 */
function ZBand({ z }: { z: number | null }) {
  if (z === null || z === undefined) return null;
  const left = ((Math.max(-4, Math.min(4, z)) + 4) / 8) * 100;
  return (
    <div className="relative mt-2 h-6" aria-hidden>
      <div className="zband absolute inset-x-0 top-2 h-2 rounded-full" />
      {[-3, -2, 0, 2, 3].map((t) => (
        <span
          key={t}
          className="absolute top-4 -translate-x-1/2 text-[0.65rem] text-base-content/50"
          style={{ left: `${((t + 4) / 8) * 100}%` }}
        >
          {t > 0 ? `+${t}` : t}
        </span>
      ))}
      <span
        className="absolute top-0 h-6 w-1.5 -translate-x-1/2 rounded-full bg-base-content ring-2 ring-base-100"
        style={{ left: `${left}%` }}
      />
    </div>
  );
}

/** Pecahan bertumpuk seperti penulisan rumus di buku ajar */
function Fraction({ num: n, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="mx-1 inline-flex flex-col items-center align-middle text-[0.8rem] leading-tight tabular-nums">
      <span className="border-b border-base-content/60 px-1">{n}</span>
      <span className="px-1">{den}</span>
    </span>
  );
}

/** Baris nilai −3 SD … +3 SD dari tabel Permenkes */
function SdRow({ sd, z, unit }: { sd?: number[]; z: number | null; unit: string }) {
  if (!sd) return null;
  const idx = z === null ? -1 : Math.max(-1, Math.min(6, Math.floor(z + 3)));
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="table table-xs w-auto text-center tabular-nums">
        <thead>
          <tr>
            {SD_HEADERS.map((h) => (
              <th key={h} className="px-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {sd.map((v, i) => (
              <td key={i} className={`px-2 ${i === idx || i === idx + 1 ? "bg-primary/10 font-semibold" : ""}`}>
                {fmt(v)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-0.5 text-[0.7rem] text-base-content/50">Nilai tabel dalam {unit}; kolom bersorot mengapit nilai anak.</p>
    </div>
  );
}

interface ZScoreForm {
  sex: Sex;
  ageMode: "months" | "dob";
  dob: string;
  visit: string;
  ageMonths: string;
  weight: string;
  height: string;
  measured: "recumbent" | "standing";
  prevMonth: string;
  prevWeight: string;
  prevHeight: string;
}

/** Status gizi & tren pertumbuhan anak */
export default function ZScoreCalculator() {
  const { patient } = useApp();

  const [f, setF] = useState<ZScoreForm>({
    sex: patient.sex || "male",
    ageMode: "months",
    dob: "",
    visit: "",
    ageMonths: "",
    weight: "",
    height: "",
    measured: "recumbent",
    prevMonth: "",
    prevWeight: "",
    prevHeight: "",
  });

  const set =
    <K extends keyof ZScoreForm>(k: K) =>
    (v: ZScoreForm[K]) =>
      setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    setF((s) => (s.visit ? s : { ...s, visit: new Date().toISOString().slice(0, 10) }));
  }, []);

  const errors = useMemo(() => {
    const list = validateRanges([
      { value: f.ageMode === "months" ? f.ageMonths : "", limit: LIMITS.childMonths },
      { value: f.weight, limit: LIMITS.childWeight },
      { value: f.height, limit: LIMITS.childHeight },
      { value: f.prevMonth, limit: LIMITS.prevMonth },
      { value: f.prevWeight, limit: LIMITS.prevWeight },
      { value: f.prevHeight, limit: LIMITS.prevHeight },
    ]);
    if (f.ageMode === "dob" && f.dob && f.visit && !ageFromDates(f.dob, f.visit)) {
      list.push("Tanggal lahir tidak boleh setelah tanggal ukur.");
    }
    return list;
  }, [f]);

  /**
   * Seluruh indeks memakai rumus median ± 1 SD (method: "rumus"):
   * Z = (X − M) ÷ (M − SD(−1)) bila X < median; Z = (X − M) ÷ (SD(+1) − M) bila X ≥ median.
   */
  const r = useMemo(() => {
    if (errors.length) return null;
    let ageDays: number;
    if (f.ageMode === "dob") {
      const a = ageFromDates(f.dob, f.visit);
      if (!a) return null;
      ageDays = a.days;
    } else {
      const m = num(f.ageMonths);
      if (!(m >= 0)) return null;
      ageDays = Math.round(m * 30.4375) + 1;
    }

    const w = num(f.weight);
    const h = num(f.height);
    if (!(w > 0) || !(h > 0)) return null;

    const pm = num(f.prevMonth);
    const previous = pm >= 0 ? { month: Math.floor(pm), weight: num(f.prevWeight), height: num(f.prevHeight) } : null;

    const g = assessGrowth({ ageDays, sex: f.sex, weight: w, height: h, measured: f.measured, method: "rumus", previous });

    const usePB = g.monthsUsed <= 24;
    const tw = g.trend.weight;
    const tl = g.trend.length;

    const rows: AssessmentRow[] = [
      {
        code: "AD-1.1.1",
        label: usePB ? "Panjang badan" : "Tinggi badan",
        data: `${fmt(g.heightUsed ?? h)} cm`,
        interpretation: g.heightUsed !== h ? `Terkoreksi dari ${fmt(h)} cm` : "–",
      },
      { code: "AD-1.1.2", label: "Berat badan", data: `${fmt(w)} kg`, interpretation: "–" },
      {
        code: "AD-1.1.2",
        label: "Berat badan ideal",
        data: g.ibw ? `${fmt(g.ibw)} kg` : "–",
        interpretation: g.ibw ? `${fmt((w / g.ibw) * 100)}% BBI` : "–",
      },
      {
        code: "AD-1.1.4",
        label: "Perubahan berat badan",
        data: tw ? `${tw.gain > 0 ? "+" : ""}${fmt(tw.gain)} g (${tw.fromMonth}–${tw.toMonth} bln)` : "–",
        interpretation: tw ? tw.message : "–",
        tone: tw ? trendTone(tw.status) : undefined,
      },
      ...g.indicators.map((i) => ({
        code: i.code,
        label: `${i.label} z-score`,
        data: i.z !== null ? `${signed(i.z)} SD` : "–",
        interpretation: i.z !== null ? i.category?.label : i.note,
        tone: i.category?.tone,
      })),
    ];

    if (tl) {
      rows.splice(4, 0, {
        code: "AD-1.1.1",
        label: "Pertambahan panjang badan",
        data: `${tl.gain > 0 ? "+" : ""}${fmt(tl.gain)} cm (${tl.fromMonth}–${tl.toMonth} bln)`,
        interpretation: tl.message,
        tone: trendTone(tl.status),
      });
    }

    return { ...g, w, h, rows };
  }, [f, errors]);

  const ageText = r ? `${Math.floor(r.months / 12)} tahun ${Math.floor(r.months % 12)} bulan (${r.monthsUsed} bulan penuh)` : "";
  const methodLabel = METHODS.rumus.label;

  const zChart = useMemo(() => {
    const ind = r?.indicators.filter((i) => i.z !== null) ?? [];
    if (!r?.standard || !ind.length) return null;
    return barConfig({
      labels: ind.map((i) => i.label),
      unit: "SD",
      horizontal: true,
      min: -4,
      max: 4,
      series: [
        {
          label: "Z-score",
          data: ind.map((i) => Math.max(-4, Math.min(4, i.z as number))),
          color: ind.map((i) => (i.category ? TONE_COLOR[i.category.tone] : THEME_COLORS.primary)),
        },
      ],
    });
  }, [r]);

  /** Data penyimpanan hasil perhitungan */
  const record = (): ReportRecord => {
    if (!r) throw new Error("Hasil belum tersedia");
    return {
      type: "z-score",
      title: `Status gizi anak: ${r.indicators.map((i) => `${i.label} ${i.z !== null ? signed(i.z) : "–"}`).join(", ")}`,
      input: {
        "Jenis kelamin": f.sex === "male" ? "Laki-laki" : "Perempuan",
        Umur: ageText,
        "Berat badan (kg)": r.w,
        "Panjang/tinggi badan diukur (cm)": r.h,
        "Panjang/tinggi badan dipakai (cm)": r.heightUsed,
        "Posisi ukur": f.measured === "recumbent" ? "Terlentang" : "Berdiri",
        "Pengukuran sebelumnya":
          num(f.prevMonth) >= 0 ? `${f.prevMonth} bln, BB ${f.prevWeight || "–"} kg, PB/TB ${f.prevHeight || "–"} cm` : null,
        Metode: methodLabel,
        Acuan: "Permenkes RI No. 2 Tahun 2020",
      },
      output: Object.fromEntries([
        ...r.indicators.map((i) => [`${i.label} (SD)`, i.z !== null ? `${signed(i.z)} (${i.category?.label})` : i.note]),
        ["BBI anak (kg)", r.ibw ? round(r.ibw) : null],
        ["Kenaikan BB", r.trend.weight ? `${fmt(r.trend.weight.gain)} g: ${r.trend.weight.message}` : null],
        ["Pertambahan PB", r.trend.length ? `${fmt(r.trend.length.gain)} cm: ${r.trend.length.message}` : null],
      ]),
      tables: [
        toReportTable("Pengkajian data antropometri (AD)", r.rows),
        {
          title: "Nilai rujukan Permenkes 2/2020",
          columns: ["Indeks", "Tabel", "Baris", "Nilai anak", ...SD_HEADERS, "Z-score", "Kategori"],
          rows: r.indicators
            .filter((i) => i.sd && i.z !== null)
            .map((i) => [
              i.label,
              i.table,
              fmt(i.rowX),
              `${fmt(i.measure)} ${i.unit}`,
              ...(i.sd ?? []).map((v) => fmt(v)),
              signed(i.z as number),
              i.category?.label,
            ]),
        },
        ...(r.recommendations.length
          ? [{ title: "Tindak lanjut (Permenkes Bab IV)", columns: ["No", "Rekomendasi"], rows: r.recommendations.map((t, k) => [k + 1, t]) }]
          : []),
      ],
      steps: [...r.steps, ...r.notes],
    };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)]">
      {/* INPUT DATA ANAK */}
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <SexField value={f.sex} onChange={set("sex")} />

          <Field label="Umur">
            <div className="tabs tabs-box tabs-sm">
              {(
                [
                  ["months", "Umur (bulan)"],
                  ["dob", "Tanggal lahir"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" className={`tab ${f.ageMode === v ? "tab-active" : ""}`} onClick={() => set("ageMode")(v)}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          {f.ageMode === "dob" ? (
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Tanggal lahir">
                <input type="date" className="input w-full" value={f.dob} max={f.visit} onChange={(e) => set("dob")(e.target.value)} />
              </Field>
              <Field label="Tanggal ukur">
                <input type="date" className="input w-full" value={f.visit} onChange={(e) => set("visit")(e.target.value)} />
              </Field>
            </div>
          ) : (
            <NumberField
              label="Umur"
              unit="bulan"
              value={f.ageMonths}
              onChange={set("ageMonths")}
              hint="0–228 bulan (0–19 tahun). Dibaca bulan penuh."
            />
          )}

          <div className="grid grid-cols-2 gap-x-4">
            <NumberField label="Berat badan" unit="kg" value={f.weight} onChange={set("weight")} step="0.1" />
            <NumberField label="Panjang / tinggi" unit="cm" value={f.height} onChange={set("height")} step="0.1" />
            <Field label="Posisi pengukuran">
              <select
                className="select w-full"
                value={f.measured}
                onChange={(e) => set("measured")(e.target.value as ZScoreForm["measured"])}
              >
                <option value="recumbent">Terlentang (PB)</option>
                <option value="standing">Berdiri (TB)</option>
              </select>
            </Field>
          </div>

          <div className="divider my-3" />

          <h2 className="font-semibold">Tren pertumbuhan (opsional, 0–24 bulan)</h2>
          <p className="text-xs text-base-content/60">
            Isi pengukuran sebelumnya untuk membandingkan kenaikan BB (Tabel 17–19, interval 3/4/6 bulan) dan pertambahan PB (Tabel
            20–23, interval 2/3/4/6 bulan).
          </p>

          <div className="grid grid-cols-3 gap-x-3">
            <NumberField label="Umur dulu" unit="bln" value={f.prevMonth} onChange={set("prevMonth")} step="1" />
            <NumberField label="BB dulu" unit="kg" value={f.prevWeight} onChange={set("prevWeight")} step="0.1" />
            <NumberField label="PB dulu" unit="cm" value={f.prevHeight} onChange={set("prevHeight")} step="0.1" />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-base-content/60">
            Acuan: Permenkes RI No. 2 Tahun 2020. Umur dihitung bulan penuh; PB untuk 0–24 bulan (berdiri + 0,7 cm), TB untuk &gt; 24
            bulan (terlentang − 0,7 cm). Umur 5–18 tahun hanya memakai IMT/U. Tanggal lahir tidak ikut disimpan.
          </p>
        </div>
      </div>

      {/* HASIL PERHITUNGAN */}
      <div className="space-y-4">
        <InputAlert errors={errors} />
        <section className="result-slip rounded-box border border-base-300 bg-base-100">
          <div className="border-b border-base-300 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">Perhitungan z-score</h2>
            {r?.standard ? (
              <p className="mt-1 text-sm">
                {r.standard}; umur {ageText}
                <span className="block text-xs text-base-content/60">Rumus: median ± 1 SD (sesuai referensi)</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-base-content/60">{r ? r.notes.join(" ") : "Isi umur, berat, dan panjang/tinggi badan anak."}</p>
            )}
          </div>

          {r?.standard && (
            <ul className="divide-y divide-base-300">
              {r.indicators.map((i) => (
                <li key={i.key} className="px-5 py-3">
                  {i.z !== null && i.category ? (
                    <>
                      <p className="text-[0.7rem] text-base-content/55">
                        {i.table}, baris {fmt(i.rowX)}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1 gap-y-2">
                        <span className="font-semibold">{i.label} =</span>
                        {i.num ? (
                          <>
                            {i.base ? (
                              <span className="tabular-nums">
                                ({i.base > 0 ? "+" : "−"}
                                {Math.abs(i.base)}) +
                              </span>
                            ) : null}
                            <Fraction num={i.num} den={i.den} />
                          </>
                        ) : (
                          <span className="text-xs text-base-content/60">LMS</span>
                        )}
                        <span>=</span>
                        <span className="text-xl font-bold tabular-nums text-primary">{signed(i.z)} SD</span>
                        <span className={`badge badge-soft badge-sm ml-1 ${TONE[i.category.tone]}`}>{i.category.label}</span>
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-base-content/65">
                        {i.position}. Ambang batas: {i.category.band}.{i.category.note ? ` ${i.category.note}` : ""}
                      </p>
                      <SdRow sd={i.sd} z={i.z} unit={i.unit} />
                      <ZBand z={i.z} />
                    </>
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold">{i.label}</span> <span className="text-base-content/60">{i.note}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {r?.standard && (
            <details className="border-t border-base-300 px-5 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-base-content/70">Langkah perhitungan</summary>
              <ol className="mt-2 space-y-1.5 text-[0.82rem] leading-relaxed text-base-content/80">
                {[...r.steps, ...r.notes].map((s, k) => (
                  <li key={k} className="calc-step tabular-nums">
                    {s}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>

        {zChart && (
          <ChartCard title="Ringkasan z-score" description="Batang diwarnai sesuai kategori; nilai dibatasi −4 s.d. +4 SD." config={zChart} height={200} />
        )}

        {/* TREN PERTUMBUHAN */}
        {(r?.trend.weight || r?.trend.length) && (
          <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">Tren pertumbuhan (Permenkes Bab III)</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {[r.trend.weight, r.trend.length].filter((t) => t !== undefined).map((t) => (
                <li key={t.kind}>
                  <span className="font-medium">{t.kind === "weight" ? "Kenaikan BB" : "Pertambahan PB"}:</span>{" "}
                  <span className="tabular-nums">
                    {t.gain > 0 ? "+" : ""}
                    {fmt(t.gain)} {t.unit}
                  </span>
                  {t.standard !== undefined && (
                    <span className="tabular-nums text-base-content/65">
                      {" "}
                      (standar {t.table}: {fmt(t.standard)} {t.unit})
                    </span>
                  )}
                  <span className={`block text-xs ${TEXT_TONE[t.status]}`}>{t.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* REKOMENDASI */}
        {r && r.recommendations.length > 0 && (
          <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">Tindak lanjut (Permenkes Bab IV)</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
              {r.recommendations.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </section>
        )}

        {r?.standard && <AssessmentTable title="Pengkajian data antropometri (AD)" rows={r.rows} />}

        <SaveBar record={record} disabled={!r?.standard} />
      </div>
    </div>
  );
}
