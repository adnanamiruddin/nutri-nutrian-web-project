import { useEffect, useMemo, useState } from "react";
import Field, { NumberField, SexField } from "@/components/ui/Field";
import AssessmentTable, {
  toReportTable,
} from "@/components/ui/AssessmentTable";
import SaveBar from "@/components/ui/SaveBar";
import { useApp } from "@/context/AppContext";
import { ageFromDates, fmt, num } from "@/utils/formulas";
import { METHODS, SD_HEADERS, assessGrowth } from "@/utils/growth";

const TONE = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};
const TEXT_TONE = {
  ok: "text-success",
  risk: "text-warning",
  na: "text-base-content/60",
};
const signed = (z) => `${z > 0 ? "+" : ""}${fmt(z, 2)}`;

/** Pita Z-score −4…+4 */
function ZBand({ z }) {
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
function Fraction({ num: n, den }) {
  return (
    <span className="mx-1 inline-flex flex-col items-center align-middle text-[0.8rem] leading-tight tabular-nums">
      <span className="border-b border-base-content/60 px-1">{n}</span>
      <span className="px-1">{den}</span>
    </span>
  );
}

/** Baris nilai −3 SD … +3 SD dari tabel Permenkes */
function SdRow({ sd, z, unit }) {
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
              <td
                key={i}
                className={`px-2 ${
                  i === idx || i === idx + 1
                    ? "bg-primary/10 font-semibold"
                    : ""
                }`}
              >
                {fmt(v, 1)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="mt-0.5 text-[0.7rem] text-base-content/50">
        Nilai tabel dalam {unit}; kolom bersorot mengapit nilai anak.
      </p>
    </div>
  );
}

/** Status gizi & tren pertumbuhan anak */
export default function ZScoreCalculator() {
  const { patient } = useApp();

  const [f, setF] = useState({
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

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    setF((s) =>
      s.visit ? s : { ...s, visit: new Date().toISOString().slice(0, 10) },
    );
  }, []);

  /**
   * PERHITUNGAN STATUS GIZI
   *
   * Seluruh indeks antropometri menggunakan metode:
   * Z = (Nilai Individu - Median) / Simpang Baku
   *
   * Jika nilai individu < median:
   * Z = (X - M) / (M - SD(-1))
   *
   * Jika nilai individu > median:
   * Z = (X - M) / (SD(+1) - M)
   *
   * Jika nilai individu = median:
   * Z = 0
   *
   * Metode dipilih otomatis melalui method: "rumus".
   */

  const r = useMemo(() => {
    let ageDays;

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

    const previous =
      pm >= 0
        ? {
            month: Math.floor(pm),
            weight: num(f.prevWeight),
            height: num(f.prevHeight),
          }
        : null;

    // PENTING:
    // Semua indeks menggunakan rumus median ± 1 SD.
    // Tidak menggunakan interpolasi Permenkes atau LMS.

    const g = assessGrowth({
      ageDays,
      sex: f.sex,
      weight: w,
      height: h,
      measured: f.measured,
      method: "rumus",
      previous,
    });

    const usePB = g.monthsUsed <= 24;

    const tw = g.trend.weight;
    const tl = g.trend.length;

    const rows = [
      {
        code: "AD-1.1.1",
        label: usePB ? "Panjang badan" : "Tinggi badan",
        data: `${fmt(g.heightUsed ?? h, 1)} cm`,
        interpretation:
          g.heightUsed !== h ? `Terkoreksi dari ${fmt(h, 1)} cm` : "–",
      },
      {
        code: "AD-1.1.2",
        label: "Berat badan",
        data: `${fmt(w, 2)} kg`,
        interpretation: "–",
      },
      {
        code: "AD-1.1.2",
        label: "Berat badan ideal",
        data: g.ibw ? `${fmt(g.ibw, 1)} kg` : "–",
        interpretation: g.ibw ? `${fmt((w / g.ibw) * 100, 0)}% BBI` : "–",
      },
      {
        code: "AD-1.1.4",
        label: "Perubahan berat badan",
        data: tw
          ? `${tw.gain > 0 ? "+" : ""}${fmt(tw.gain, 0)} g (${tw.fromMonth}–${tw.toMonth} bln)`
          : "–",
        interpretation: tw ? tw.message : "–",
        tone: tw
          ? tw.status === "ok"
            ? "success"
            : tw.status === "risk"
              ? "warning"
              : undefined
          : undefined,
      },
      ...g.indicators.map((i) => ({
        code: i.code,
        label: `${i.label} z-score`,
        data: i.z !== null ? `${signed(i.z)} SD` : "–",
        interpretation: i.z !== null ? i.category.label : i.note,
        tone: i.category?.tone,
      })),
    ];

    if (tl) {
      rows.splice(4, 0, {
        code: "AD-1.1.1",
        label: "Pertambahan panjang badan",
        data: `${tl.gain > 0 ? "+" : ""}${fmt(tl.gain, 1)} cm (${tl.fromMonth}–${tl.toMonth} bln)`,
        interpretation: tl.message,
        tone:
          tl.status === "ok"
            ? "success"
            : tl.status === "risk"
              ? "warning"
              : undefined,
      });
    }

    return {
      ...g,
      w,
      h,
      rows,
    };
  }, [f]);

  const ageText = r
    ? `${Math.floor(r.months / 12)} tahun ${Math.floor(r.months % 12)} bulan (${r.monthsUsed} bulan penuh)`
    : "";

  const methodLabel = METHODS.rumus.label;

  /** Data penyimpanan hasil perhitungan */
  const record = () => ({
    type: "z-score",

    title: `Status gizi anak: ${r.indicators
      .map((i) => `${i.label} ${i.z !== null ? signed(i.z) : "–"}`)
      .join(", ")}`,

    input: {
      "Jenis kelamin": f.sex === "male" ? "Laki-laki" : "Perempuan",

      Umur: ageText,

      "Berat badan (kg)": r.w,

      "Panjang/tinggi badan diukur (cm)": r.h,

      "Panjang/tinggi badan dipakai (cm)": r.heightUsed,

      "Posisi ukur": f.measured === "recumbent" ? "Terlentang" : "Berdiri",

      "Pengukuran sebelumnya":
        num(f.prevMonth) >= 0
          ? `${f.prevMonth} bln, BB ${f.prevWeight || "–"} kg, PB/TB ${f.prevHeight || "–"} cm`
          : null,

      Metode: methodLabel,

      Acuan: "Permenkes RI No. 2 Tahun 2020",
    },

    output: Object.fromEntries([
      ...r.indicators.map((i) => [
        `${i.label} (SD)`,
        i.z !== null ? `${signed(i.z)} (${i.category.label})` : i.note,
      ]),

      ["BBI anak (kg)", r.ibw ? Number(r.ibw.toFixed(1)) : null],

      [
        "Kenaikan BB",
        r.trend.weight
          ? `${fmt(r.trend.weight.gain, 0)} g: ${r.trend.weight.message}`
          : null,
      ],

      [
        "Pertambahan PB",
        r.trend.length
          ? `${fmt(r.trend.length.gain, 1)} cm: ${r.trend.length.message}`
          : null,
      ],
    ]),

    tables: [
      toReportTable("Pengkajian data antropometri (AD)", r.rows),

      {
        title: "Nilai rujukan Permenkes 2/2020",

        columns: [
          "Indeks",
          "Tabel",
          "Baris",
          "Nilai anak",
          ...SD_HEADERS,
          "Z-score",
          "Kategori",
        ],

        rows: r.indicators
          .filter((i) => i.sd)
          .map((i) => [
            i.label,
            i.table,
            fmt(i.rowX, 1),
            `${fmt(i.measure, 2)} ${i.unit}`,
            ...i.sd.map((v) => fmt(v, 1)),
            signed(i.z),
            i.category.label,
          ]),
      },

      ...(r.recommendations.length
        ? [
            {
              title: "Tindak lanjut (Permenkes Bab IV)",
              columns: ["No", "Rekomendasi"],
              rows: r.recommendations.map((t, k) => [k + 1, t]),
            },
          ]
        : []),
    ],

    steps: [...r.steps, ...r.notes],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)]">
      {/* INPUT DATA ANAK */}
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-0">
          <SexField value={f.sex} onChange={set("sex")} />

          <Field label="Umur">
            <div className="tabs tabs-box tabs-sm">
              {[
                ["months", "Umur (bulan)"],
                ["dob", "Tanggal lahir"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={`tab ${f.ageMode === v ? "tab-active" : ""}`}
                  onClick={() => set("ageMode")(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          {f.ageMode === "dob" ? (
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Tanggal lahir">
                <input
                  type="date"
                  className="input w-full"
                  value={f.dob}
                  max={f.visit}
                  onChange={(e) => set("dob")(e.target.value)}
                />
              </Field>

              <Field label="Tanggal ukur">
                <input
                  type="date"
                  className="input w-full"
                  value={f.visit}
                  onChange={(e) => set("visit")(e.target.value)}
                />
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
            <NumberField
              label="Berat badan"
              unit="kg"
              value={f.weight}
              onChange={set("weight")}
              step="0.1"
            />

            <NumberField
              label="Panjang / tinggi"
              unit="cm"
              value={f.height}
              onChange={set("height")}
              step="0.1"
            />

            <Field label="Posisi pengukuran">
              <select
                className="select w-full"
                value={f.measured}
                onChange={(e) => set("measured")(e.target.value)}
              >
                <option value="recumbent">Terlentang (PB)</option>

                <option value="standing">Berdiri (TB)</option>
              </select>
            </Field>
          </div>

          <div className="divider my-3" />

          <h2 className="font-semibold">
            Tren pertumbuhan (opsional, 0–24 bulan)
          </h2>

          <p className="text-xs text-base-content/60">
            Isi pengukuran sebelumnya untuk membandingkan kenaikan BB (Tabel
            17–19, interval 3/4/6 bulan) dan pertambahan PB (Tabel 20–23,
            interval 2/3/4/6 bulan).
          </p>

          <div className="grid grid-cols-3 gap-x-3">
            <NumberField
              label="Umur dulu"
              unit="bln"
              value={f.prevMonth}
              onChange={set("prevMonth")}
              step="1"
            />

            <NumberField
              label="BB dulu"
              unit="kg"
              value={f.prevWeight}
              onChange={set("prevWeight")}
              step="0.1"
            />

            <NumberField
              label="PB dulu"
              unit="cm"
              value={f.prevHeight}
              onChange={set("prevHeight")}
              step="0.1"
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-base-content/60">
            Acuan: Permenkes RI No. 2 Tahun 2020. Umur dihitung bulan penuh; PB
            untuk 0–24 bulan (berdiri + 0,7 cm), TB untuk &gt; 24 bulan
            (terlentang − 0,7 cm). Umur 5–18 tahun hanya memakai IMT/U. Tanggal
            lahir tidak ikut disimpan.
          </p>
        </div>
      </div>

      {/* HASIL PERHITUNGAN */}
      <div className="space-y-4">
        <section className="result-slip rounded-box border border-base-300 bg-base-100">
          <div className="border-b border-base-300 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">
              Perhitungan z-score
            </h2>

            {r?.standard ? (
              <p className="mt-1 text-sm">
                {r.standard}; umur {ageText}
                <span className="block text-xs text-base-content/60">
                  Rumus: median ± 1 SD (sesuai referensi)
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-base-content/60">
                {r
                  ? r.notes.join(" ")
                  : "Isi umur, berat, dan panjang/tinggi badan anak."}
              </p>
            )}
          </div>

          {r?.standard && (
            <ul className="divide-y divide-base-300">
              {r.indicators.map((i) => (
                <li key={i.key} className="px-5 py-3">
                  {i.z !== null ? (
                    <>
                      <p className="text-[0.7rem] text-base-content/55">
                        {i.table}, baris {fmt(i.rowX, 1)}
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
                          <span className="text-xs text-base-content/60">
                            LMS
                          </span>
                        )}

                        <span>=</span>

                        <span className="text-xl font-bold tabular-nums text-primary">
                          {signed(i.z)} SD
                        </span>

                        <span
                          className={`badge badge-soft badge-sm ml-1 ${TONE[i.category.tone]}`}
                        >
                          {i.category.label}
                        </span>
                      </p>

                      <p className="mt-1 text-xs tabular-nums text-base-content/65">
                        {i.position}. Ambang batas: {i.category.band}.
                        {i.category.note ? ` ${i.category.note}` : ""}
                      </p>

                      <SdRow sd={i.sd} z={i.z} unit={i.unit} />

                      <ZBand z={i.z} />
                    </>
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold">{i.label}</span>{" "}
                      <span className="text-base-content/60">{i.note}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {r?.standard && (
            <details className="border-t border-base-300 px-5 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-base-content/70">
                Langkah perhitungan
              </summary>

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

        {/* TREN PERTUMBUHAN */}
        {(r?.trend.weight || r?.trend.length) && (
          <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">
              Tren pertumbuhan (Permenkes Bab III)
            </h2>

            <ul className="mt-2 space-y-2 text-sm">
              {[r.trend.weight, r.trend.length].filter(Boolean).map((t) => (
                <li key={t.kind}>
                  <span className="font-medium">
                    {t.kind === "weight" ? "Kenaikan BB" : "Pertambahan PB"}:
                  </span>{" "}
                  <span className="tabular-nums">
                    {t.gain > 0 ? "+" : ""}
                    {fmt(t.gain, t.kind === "weight" ? 0 : 1)} {t.unit}
                  </span>
                  {t.standard !== undefined && (
                    <span className="tabular-nums text-base-content/65">
                      {" "}
                      (standar {t.table}:{" "}
                      {fmt(t.standard, t.kind === "weight" ? 0 : 1)} {t.unit})
                    </span>
                  )}
                  <span className={`block text-xs ${TEXT_TONE[t.status]}`}>
                    {t.message}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* REKOMENDASI */}
        {r?.recommendations?.length > 0 && (
          <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-base-content/70">
              Tindak lanjut (Permenkes Bab IV)
            </h2>

            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
              {r.recommendations.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </section>
        )}

        {r?.standard && (
          <AssessmentTable
            title="Pengkajian data antropometri (AD)"
            rows={r.rows}
          />
        )}

        <SaveBar record={record} disabled={!r?.standard} />
      </div>
    </div>
  );
}
