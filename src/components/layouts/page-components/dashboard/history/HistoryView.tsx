import { useMemo, useState } from "react";
import Link from "next/link";
import { LuDownload, LuEye, LuFileSpreadsheet, LuFileText, LuPrinter, LuTrash2 } from "react-icons/lu";
import { notify } from "@/components/utils/alerts/notify";
import PageHeader from "@/components/utils/generals/PageHeader";
import Modal from "@/components/utils/modals/Modal";
import { useApp } from "@/context/AppContext";
import { exportExcel, exportPDF, exportRecordsExcel, valueText } from "@/helpers/report";
import { TYPE_LABEL, downloadJSON } from "@/helpers/storage";
import type { ReportValue, SavedRecord } from "@/types";

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function KeyValues({ data }: { data?: Record<string, ReportValue> }) {
  if (!data) return null;
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-4 text-sm">
      {Object.entries(data)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-b border-dashed border-base-300 py-1.5 text-base-content/65">{k}</dt>
            <dd className="border-b border-dashed border-base-300 py-1.5 tabular-nums">
              {valueText(v)}
            </dd>
          </div>
        ))}
    </dl>
  );
}

export default function HistoryView() {
  const { records, removeRecord, clearAll, ready } = useApp();
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<SavedRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return records.filter(
      (r) => (type === "all" || r.type === type) && (!s || `${r.title} ${r.patientCode || ""}`.toLowerCase().includes(s)),
    );
  }, [records, type, q]);

  const types = [...new Set(records.map((r) => r.type))];
  const run = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      notify(msg);
    } catch (e) {
      console.error(e);
      notify("Gagal membuat file. Coba lagi.", "error");
    }
  };
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Riwayat & Laporan" description="Semua hasil yang Anda simpan. Unduh tiap laporan sebagai PDF atau Excel, atau ekspor semuanya sekaligus. Data hanya ada di browser ini.">
        <button type="button" className="btn btn-sm btn-primary" disabled={!rows.length} onClick={() => run(() => exportRecordsExcel(rows), "Riwayat diekspor ke Excel")}>
          <LuFileSpreadsheet aria-hidden /> Ekspor Excel
        </button>
        <button type="button" className="btn btn-sm" disabled={!rows.length} onClick={() => downloadJSON(rows, `nutri-nutrian-riwayat-${stamp}.json`)}>
          <LuDownload aria-hidden /> Ekspor JSON
        </button>
        <button type="button" className="btn btn-sm" disabled={!rows.length} onClick={() => window.print()}>
          <LuPrinter aria-hidden /> Cetak ringkasan
        </button>
        <button type="button" className="btn btn-sm btn-ghost text-error" disabled={!records.length} onClick={() => setConfirmClear(true)}>
          <LuTrash2 aria-hidden /> Hapus semua
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 md:flex-row print:hidden">
        <select className="select md:w-64" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter jenis">
          <option value="all">Semua jenis ({records.length})</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t] || t} ({records.filter((r) => r.type === t).length})
            </option>
          ))}
        </select>
        <input type="search" className="input w-full md:flex-1" placeholder="Cari judul atau kode pasien" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {ready && records.length === 0 ? (
        <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-8 text-center">
          <p className="font-semibold">Belum ada hasil tersimpan</p>
          <p className="mt-1 text-sm text-base-content/65">Tekan “Simpan hasil” di kalkulator mana pun untuk menyimpannya di sini.</p>
          <Link href="/calculator" className="btn btn-primary btn-sm mt-4">
            Buka kalkulator
          </Link>
        </div>
      ) : (
        <>
          {/* Tampilan layar */}
          <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 print:hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Jenis</th>
                  <th>Hasil</th>
                  <th className="hidden md:table-cell">Pasien</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-sm tabular-nums">{dateFmt(r.createdAt)}</td>
                    <td>
                      <span className="badge badge-primary badge-soft whitespace-nowrap">{TYPE_LABEL[r.type] || r.type}</span>
                    </td>
                    <td className="min-w-48 text-sm">{r.title}</td>
                    <td className="hidden text-sm md:table-cell">{r.patientCode || "–"}</td>
                    <td className="whitespace-nowrap text-right">
                      <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Lihat detail" onClick={() => setDetail(r)}>
                        <LuEye />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Unduh PDF" title="Unduh PDF" onClick={() => run(() => exportPDF(r), "Laporan PDF diunduh")}>
                        <LuFileText />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Unduh Excel" title="Unduh Excel" onClick={() => run(() => exportExcel(r), "Laporan Excel diunduh")}>
                        <LuFileSpreadsheet />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-square text-error" aria-label="Hapus" onClick={() => removeRecord(r.id)}>
                        <LuTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-center text-sm text-base-content/60">Tidak ada catatan yang cocok dengan filter.</p>}
          </div>

          {/* Tampilan cetak (print-friendly) */}
          <div className="hidden space-y-5 print:block">
            {ready && <p className="text-sm">Dicetak {dateFmt(new Date().toISOString())}, {rows.length} catatan.</p>}
            {rows.map((r) => (
              <article key={r.id} className="break-inside-avoid border-b border-base-300 pb-4">
                <h2 className="font-bold">
                  {TYPE_LABEL[r.type] || r.type}: {r.title}
                </h2>
                <p className="mb-2 text-xs">
                  {dateFmt(r.createdAt)}
                  {r.patientCode ? `, pasien ${r.patientCode}` : ""}
                </p>
                <KeyValues data={r.output} />
              </article>
            ))}
          </div>
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail && (TYPE_LABEL[detail.type] || detail.type)} wide>
        {detail && (
          <div className="mt-2 space-y-4">
            <p className="text-sm text-base-content/70">
              {dateFmt(detail.createdAt)}
              {detail.patientCode ? `, pasien ${detail.patientCode}` : ""}
            </p>
            <div>
              <h4 className="mb-1 text-sm font-semibold">Hasil</h4>
              <KeyValues data={detail.output} />
            </div>
            {(detail.tables || []).map((t) => (
              <div key={t.title} className="overflow-x-auto">
                <h4 className="mb-1 text-sm font-semibold">{t.title}</h4>
                <table className="table table-xs">
                  <thead>
                    <tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, i) => (
                      <tr key={i}>{row.map((v, j) => <td key={j}>{v === null || v === undefined ? "–" : String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline btn-primary" onClick={() => run(() => exportPDF(detail), "Laporan PDF diunduh")}>
                <LuFileText aria-hidden /> Unduh PDF
              </button>
              <button type="button" className="btn btn-sm btn-outline btn-primary" onClick={() => run(() => exportExcel(detail), "Laporan Excel diunduh")}>
                <LuFileSpreadsheet aria-hidden /> Unduh Excel
              </button>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Data input</summary>
              <div className="mt-2">
                <KeyValues data={detail.input} />
              </div>
            </details>
          </div>
        )}
      </Modal>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Hapus semua riwayat?">
        <p className="mt-2 text-sm">{records.length} catatan akan dihapus permanen dari browser ini. Ekspor JSON dulu jika masih diperlukan.</p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={() => {
              clearAll();
              setConfirmClear(false);
            }}
          >
            Hapus semua
          </button>
        </div>
      </Modal>
    </>
  );
}
