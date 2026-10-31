import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import SaveBar from "@/components/ui/SaveBar";
import { useApp } from "@/context/AppContext";
import terms from "@/data/ncptAssessment.json";
import { AD_PRESETS, BD_PRESETS, PD_PRESETS, autoInterpret } from "@/utils/assessmentPresets";
import { KEYS, read, write } from "@/utils/storage";

const SECTIONS = {
  AD: { title: "Pengkajian data antropometri (AD)", presets: AD_PRESETS, withNormal: false, search: "/search/antropometri" },
  BD: { title: "Pengkajian data biokimia (BD)", presets: BD_PRESETS, withNormal: true, search: "/search/biokimia" },
  PD: { title: "Pengkajian fisik/klinis (PD)", presets: PD_PRESETS, withNormal: true, search: "/search/fisik-klinis" },
};
const TONE = { success: "text-success", warning: "text-warning", error: "text-error" };
const BY_CODE = Object.fromEntries(terms.map((t) => [t.code, t]));

let seq = 0;
const newRow = (domain, p = {}) => ({
  id: `${Date.now().toString(36)}${(seq += 1)}`,
  domain,
  code: p.code || "",
  label: p.label || "",
  data: "",
  normal: p.normal || "",
  unit: p.unit || "",
  interpretation: "",
  low: p.low || "",
  high: p.high || "",
  auto: p.auto || "",
});

const effective = (r) => {
  const auto = autoInterpret(r);
  return { text: r.interpretation || auto?.label || "", tone: r.interpretation ? "" : auto?.tone, auto };
};

/** Cari istilah NCPT dalam satu domain lalu tambahkan sebagai baris */
function TermAdder({ domain, onAdd }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return terms.filter((t) => t.domain === domain && `${t.code} ${t.term}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, domain]);
  return (
    <div className="relative w-full sm:w-80">
      <label className="input input-sm w-full">
        <LuSearch className="opacity-50" aria-hidden />
        <input type="search" placeholder={`Cari istilah ${domain} NCPT`} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {results.length > 0 && (
        <ul className="menu menu-sm absolute z-30 mt-1 w-full flex-nowrap rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
          {results.map((t) => (
            <li key={t.code}>
              <button
                type="button"
                onClick={() => {
                  onAdd({ code: t.code, label: t.term });
                  setQ("");
                }}
              >
                <span className="font-mono text-[0.7rem] opacity-60">{t.code}</span> {t.term}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ domain, rows, setRows }) {
  const cfg = SECTIONS[domain];
  const mine = rows.filter((r) => r.domain === domain);
  const groups = [...new Set(cfg.presets.map((p) => p.group || ""))];
  const update = (id, key, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
  const add = (p) => setRows((rs) => [...rs, newRow(domain, p)]);

  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="font-semibold">{cfg.title}</h2>
          <Link href={cfg.search} className="link link-primary text-sm">
            Telusuri semua istilah {domain}
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <TermAdder domain={domain} onAdd={add} />
          <div className="dropdown">
            <button type="button" tabIndex={0} className="btn btn-sm btn-outline">
              <LuPlus aria-hidden /> Baris cepat
            </button>
            <ul tabIndex={0} className="menu dropdown-content menu-sm z-30 mt-1 max-h-80 w-72 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
              {groups.map((g) => (
                <li key={g || "all"}>
                  {g && <span className="menu-title">{g}</span>}
                  <ul>
                    {cfg.presets.filter((p) => (p.group || "") === g).map((p) => (
                      <li key={p.label}>
                        <button type="button" onClick={() => add(p)}>
                          {p.label} {p.normal && <span className="text-xs opacity-60">({p.normal} {p.unit})</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => add({})}>
            Baris kosong
          </button>
        </div>

        {mine.length === 0 ? (
          <p className="rounded-box border border-dashed border-base-300 p-4 text-sm text-base-content/60">
            Belum ada data {domain}. Cari istilah NCPT atau pilih dari baris cepat.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="min-w-56">Domain</th>
                  <th className="min-w-24">Data</th>
                  {cfg.withNormal && <th className="min-w-28">Nilai normal</th>}
                  {cfg.withNormal && <th className="min-w-20">Satuan</th>}
                  {!cfg.withNormal && <th className="min-w-16">Satuan</th>}
                  <th className="min-w-48">Interpretasi</th>
                  <th aria-label="Hapus" />
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => {
                  const eff = effective(r);
                  return (
                    <tr key={r.id} className="align-top">
                      <td>
                        <div className="flex gap-1">
                          <input className="input input-xs w-24 font-mono" placeholder="Kode" value={r.code} onChange={(e) => update(r.id, "code", e.target.value)} aria-label="Kode NCPT" />
                          <input className="input input-xs w-full" placeholder="Nama" value={r.label} onChange={(e) => update(r.id, "label", e.target.value)} aria-label="Nama domain" />
                        </div>
                        {BY_CODE[r.code] && BY_CODE[r.code].term !== r.label && <p className="mt-0.5 text-[0.7rem] text-base-content/50">NCPT: {BY_CODE[r.code].term}</p>}
                      </td>
                      <td>
                        <input className="input input-xs w-full tabular-nums" placeholder="Hasil" value={r.data} onChange={(e) => update(r.id, "data", e.target.value)} aria-label="Data" />
                      </td>
                      {cfg.withNormal && (
                        <td>
                          <input className="input input-xs w-full tabular-nums" placeholder="mis. 150 - 450" value={r.normal} onChange={(e) => update(r.id, "normal", e.target.value)} aria-label="Nilai normal" />
                        </td>
                      )}
                      <td>
                        <input className="input input-xs w-full" value={r.unit} onChange={(e) => update(r.id, "unit", e.target.value)} aria-label="Satuan" />
                      </td>
                      <td>
                        <input
                          className={`input input-xs w-full ${TONE[eff.tone] || ""}`}
                          placeholder={eff.auto ? eff.auto.label : "Interpretasi"}
                          value={r.interpretation}
                          onChange={(e) => update(r.id, "interpretation", e.target.value)}
                          aria-label="Interpretasi"
                        />
                        {!r.interpretation && eff.auto && <p className={`mt-0.5 text-[0.7rem] ${TONE[eff.auto.tone] || ""}`}>Otomatis: {eff.auto.label}</p>}
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-xs btn-square" aria-label="Hapus baris" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                          <LuTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Lembar pengkajian gizi gaya NCP (Domain | Data | Nilai normal | Satuan | Interpretasi).
 * Draf tersimpan otomatis di browser agar tidak hilang saat berpindah ke halaman pencarian istilah.
 */
export default function AssessmentWorksheet() {
  const router = useRouter();
  const { notify, ready } = useApp();
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const d = read(KEYS.assessment, null);
    if (d) {
      setRows(d.rows || []);
      setSource(d.source || "");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) write(KEYS.assessment, { rows, source });
  }, [rows, source, loaded]);

  // ?add=KODE dari halaman pencarian AD/BD/PD
  useEffect(() => {
    if (!loaded || !router.isReady || !router.query.add) return;
    const t = BY_CODE[router.query.add];
    if (t) {
      const preset = [...BD_PRESETS, ...PD_PRESETS, ...AD_PRESETS].find((p) => p.code === t.code);
      setRows((rs) => [...rs, newRow(t.domain, { ...(preset || {}), code: t.code, label: t.term })]);
      notify(`${t.code} ${t.term} ditambahkan ke ${t.domain}`);
    }
    router.replace("/asesmen", undefined, { shallow: true });
  }, [loaded, router, notify]);

  const asTable = (domain) => {
    const cfg = SECTIONS[domain];
    const mine = rows.filter((r) => r.domain === domain);
    return {
      title: cfg.title,
      columns: cfg.withNormal ? ["Domain", "Data", "Nilai normal", "Satuan", "Interpretasi"] : ["Domain", "Data", "Interpretasi"],
      rows: mine.map((r) => {
        const data = `${r.data}${!cfg.withNormal && r.unit && r.data ? ` ${r.unit}` : ""}`;
        const interp = effective(r).text || "–";
        return cfg.withNormal ? [`${r.code} ${r.label}`.trim(), r.data || "–", r.normal || "–", r.unit || "–", interp] : [`${r.code} ${r.label}`.trim(), data || "–", interp];
      }),
    };
  };

  const filled = rows.filter((r) => r.data !== "").length;
  const record = () => ({
    type: "asesmen",
    title: `Pengkajian gizi: ${["AD", "BD", "PD"].map((d) => `${d} ${rows.filter((r) => r.domain === d).length}`).join(", ")} data`,
    input: { "Sumber data": source || null },
    output: Object.fromEntries(
      rows.filter((r) => effective(r).text && effective(r).text !== "Normal").map((r) => [`${r.code} ${r.label}`.trim(), `${r.data} ${r.unit}: ${effective(r).text}`.trim()]),
    ),
    tables: ["AD", "BD", "PD"].map(asTable).filter((t) => t.rows.length),
  });

  if (!ready || !loaded) return null;

  return (
    <div className="space-y-5">
      {["AD", "BD", "PD"].map((d) => (
        <Section key={d} domain={d} rows={rows} setRows={setRows} />
      ))}
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-2">
          <label className="text-sm font-semibold" htmlFor="asesmen-source">Sumber data (opsional)</label>
          <input id="asesmen-source" className="input w-full" placeholder="mis. rekam medis, hasil lab tanggal …" value={source} onChange={(e) => setSource(e.target.value)} />
          <p className="text-xs text-base-content/60">
            Nilai normal pada baris cepat adalah rujukan umum dewasa. Sesuaikan dengan rujukan laboratorium setempat dan umur pasien.
            Interpretasi otomatis bisa ditimpa dengan mengetik di kolom interpretasi.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SaveBar record={record} disabled={filled === 0} />
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              disabled={!rows.length}
              onClick={() => {
                setRows([]);
                setSource("");
                notify("Lembar pengkajian dikosongkan", "info");
              }}
            >
              Kosongkan lembar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
