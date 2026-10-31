import { useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import ncp from "@/data/ncpDomains.json";

export default function NcpDomainSearch() {
  const [domain, setDomain] = useState("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ncp.items.filter(
      (i) =>
        (domain === "all" || i.domain === domain) &&
        (!s || `${i.code} ${i.problem} ${i.problemEn} ${i.definition}`.toLowerCase().includes(s)),
    );
  }, [domain, q]);

  const classes = [...new Set(rows.map((r) => `${r.domain}|${r.class}`))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="tabs tabs-box" role="tablist">
          {[["all", "Semua"], ...Object.entries(ncp.domains)].map(([k, v]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={domain === k}
              className={`tab ${domain === k ? "tab-active" : ""}`}
              onClick={() => setDomain(k)}
            >
              {k === "all" ? v : `${k}`}
              {k !== "all" && <span className="ml-1 hidden text-xs opacity-70 sm:inline">{v.split(" (")[0]}</span>}
            </button>
          ))}
        </div>
        <label className="input w-full md:flex-1">
          <LuSearch className="opacity-50" aria-hidden />
          <input type="search" placeholder="Cari kode, problem, atau definisi" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {classes.map((c) => {
        const [d, cls] = c.split("|");
        const items = rows.filter((r) => r.domain === d && r.class === cls);
        return (
          <section key={c}>
            <h2 className="mb-2 text-sm font-semibold text-base-content/70">
              {d} – {cls}
            </h2>
            <div className="overflow-hidden rounded-box border border-base-300 bg-base-100">
              <ul className="divide-y divide-base-300">
                {items.map((i) => (
                  <li key={i.code}>
                    <button type="button" className="flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-base-200" onClick={() => setDetail(i)}>
                      <span className="w-20 shrink-0 font-mono text-sm text-primary">{i.code}</span>
                      <span>
                        <span className="block font-medium">{i.problem}</span>
                        <span className="block text-xs text-base-content/60">{i.problemEn}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
      {rows.length === 0 && <p className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">Tidak ada diagnosis yang cocok.</p>}
      <p className="text-xs text-base-content/60">{ncp._catatan}</p>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail && `${detail.code} ${detail.problem}`} wide>
        {detail && (
          <div className="mt-2 space-y-4 text-sm">
            <p className="text-base-content/70">
              <em>{detail.problemEn}</em>. {detail.definition}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h4 className="font-semibold">Problem (P)</h4>
                <p className="mt-1">{detail.problem}</p>
              </div>
              <div>
                <h4 className="font-semibold">Etiology (E)</h4>
                <ul className="mt-1 list-disc space-y-1 pl-4">{detail.etiology.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
              <div>
                <h4 className="font-semibold">Signs/symptoms (S)</h4>
                <ul className="mt-1 list-disc space-y-1 pl-4">{detail.signs.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            </div>
            <Link href="/pes-generator" className="btn btn-primary btn-sm">
              Susun kalimat PES
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
