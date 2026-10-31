import { useMemo, useState } from "react";
import Link from "next/link";
import { LuFileSpreadsheet, LuPlus, LuSearch } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { useApp } from "@/context/AppContext";
import terms from "@/data/ncptAssessment.json";
import { exportTableExcel } from "@/utils/report";

export const DOMAIN_INFO = {
  AD: { title: "Antropometri", desc: "Ukuran tubuh: tinggi, berat, perubahan berat, IMT, indeks pertumbuhan, dan komposisi tubuh." },
  BD: { title: "Biokimia", desc: "Data laboratorium, tes medis, dan prosedur: elektrolit, glukosa, lipid, protein, anemia, vitamin, urin." },
  PD: { title: "Fisik/klinis", desc: "Temuan fisik terfokus gizi: penampilan umum, kulit, rambut, mata, mulut, otot, lemak subkutan, dan lainnya." },
};
const PAGE = 60;

/** Pencarian istilah asesmen NCPT untuk satu domain (AD / BD / PD) */
export default function AssessmentSearch({ domain }) {
  const { notify } = useApp();
  const all = useMemo(() => terms.filter((t) => t.domain === domain), [domain]);
  const byCode = useMemo(() => Object.fromEntries(terms.map((t) => [t.code, t])), []);
  const sections = useMemo(() => [...new Set(all.map((t) => t.section).filter(Boolean))], [all]);
  const [q, setQ] = useState("");
  const [section, setSection] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (t) => (section === "all" || t.section === section) && (!s || `${t.code} ${t.term} ${t.anduid ?? ""} ${t.section ?? ""}`.toLowerCase().includes(s)),
    );
  }, [all, q, section]);

  const children = detail ? all.filter((t) => t.parent === detail.code) : [];

  const exportRows = async () => {
    try {
      await exportTableExcel({
        sheet: domain,
        filename: `NCPT_${domain}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        columns: ["Kode NCPT", "Istilah", "ANDUID", "Level", "Kode induk", "Section"],
        rows: rows.map((t) => [t.code, t.term, t.anduid, t.level, t.parent, t.section]),
      });
      notify(`${rows.length} istilah diekspor ke Excel`);
    } catch {
      notify("Gagal mengekspor Excel", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto]">
        <label className="input w-full">
          <LuSearch className="opacity-50" aria-hidden />
          <input
            type="search"
            placeholder="Cari istilah, kode, atau ANDUID"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
        <select
          className="select w-full"
          value={section}
          onChange={(e) => {
            setSection(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Section"
        >
          <option value="all">Semua section ({all.length})</option>
          {sections.map((s) => (
            <option key={s} value={s}>{`${s} (${all.filter((t) => t.section === s).length})`}</option>
          ))}
        </select>
        <button type="button" className="btn btn-outline btn-primary" onClick={exportRows} disabled={!rows.length}>
          <LuFileSpreadsheet aria-hidden /> Ekspor Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Kode NCPT</th>
              <th>Istilah</th>
              <th className="hidden md:table-cell">Section</th>
              <th className="text-right">ANDUID</th>
              <th className="w-10" aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((t) => (
              <tr key={t.code} className="cursor-pointer hover:bg-base-200" onClick={() => setDetail(t)}>
                <td className="whitespace-nowrap font-mono text-xs text-primary">{t.code}</td>
                <td style={{ paddingLeft: `${0.75 + Math.max(0, (t.level || 3) - 3) * 1}rem` }} className={t.level <= 3 ? "font-semibold" : ""}>
                  {t.term}
                </td>
                <td className="hidden text-xs text-base-content/65 md:table-cell">{t.section}</td>
                <td className="text-right font-mono text-xs">{t.anduid}</td>
                <td>
                  <Link
                    href={{ pathname: "/asesmen", query: { add: t.code } }}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={`Tambahkan ${t.term} ke pengkajian`}
                    title="Tambahkan ke pengkajian"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LuPlus />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-base-content/60">Tidak ada istilah yang cocok.</p>}
      </div>
      <div className="flex items-center justify-between text-xs text-base-content/60">
        <span>
          Menampilkan {Math.min(limit, rows.length)} dari {rows.length} istilah
        </span>
        {rows.length > limit && (
          <button type="button" className="btn btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
            Tampilkan lebih banyak
          </button>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.term}>
        {detail && (
          <div className="mt-3 space-y-3 text-sm">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5">
              <dt className="text-base-content/60">Kode NCPT</dt>
              <dd className="font-mono">{detail.code}</dd>
              <dt className="text-base-content/60">ANDUID</dt>
              <dd className="font-mono">{detail.anduid ?? "–"}</dd>
              <dt className="text-base-content/60">Section</dt>
              <dd>{detail.section ?? "–"}</dd>
              <dt className="text-base-content/60">Induk</dt>
              <dd>{detail.parent ? `${detail.parent} ${byCode[detail.parent]?.term ?? ""}` : "–"}</dd>
            </dl>
            {children.length > 0 && (
              <div>
                <p className="font-semibold">Turunan ({children.length})</p>
                <ul className="mt-1 max-h-48 overflow-y-auto">
                  {children.map((c) => (
                    <li key={c.code}>
                      <button type="button" className="link link-hover text-left" onClick={() => setDetail(c)}>
                        <span className="font-mono text-xs">{c.code}</span> {c.term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={{ pathname: "/asesmen", query: { add: detail.code } }} className="btn btn-primary btn-sm">
              <LuPlus aria-hidden /> Tambahkan ke pengkajian
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
