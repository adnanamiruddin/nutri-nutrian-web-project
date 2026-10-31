import { useState } from "react";
import { LuFileSpreadsheet, LuFileText, LuPrinter, LuSave } from "react-icons/lu";
import { useApp } from "@/context/AppContext";
import { exportExcel, exportPDF } from "@/utils/report";

/**
 * Aksi hasil kalkulasi: simpan ke riwayat, unduh laporan PDF/Excel, cetak.
 * @param {object|function} record  objek laporan (atau fungsi yang mengembalikannya)
 */
export default function SaveBar({ record, disabled, saveLabel = "Simpan hasil" }) {
  const { saveRecord, patient, notify } = useApp();
  const [busy, setBusy] = useState(null);
  const get = () => (typeof record === "function" ? record() : record);

  const run = async (kind) => {
    setBusy(kind);
    try {
      const r = get();
      if (kind === "pdf") await exportPDF(r, { patientCode: patient.code });
      else await exportExcel(r, { patientCode: patient.code });
      notify(kind === "pdf" ? "Laporan PDF diunduh" : "Laporan Excel diunduh");
    } catch (e) {
      console.error(e);
      notify("Gagal membuat laporan. Coba lagi.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 print:hidden">
      <button type="button" className="btn btn-primary" onClick={() => saveRecord(get())} disabled={disabled}>
        <LuSave aria-hidden /> {saveLabel}
      </button>
      <button type="button" className="btn btn-outline btn-primary" onClick={() => run("pdf")} disabled={disabled || !!busy}>
        {busy === "pdf" ? <span className="loading loading-spinner loading-xs" /> : <LuFileText aria-hidden />} Unduh PDF
      </button>
      <button type="button" className="btn btn-outline btn-primary" onClick={() => run("xlsx")} disabled={disabled || !!busy}>
        {busy === "xlsx" ? <span className="loading loading-spinner loading-xs" /> : <LuFileSpreadsheet aria-hidden />} Unduh Excel
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={disabled}>
        <LuPrinter aria-hidden /> Cetak
      </button>
    </div>
  );
}
