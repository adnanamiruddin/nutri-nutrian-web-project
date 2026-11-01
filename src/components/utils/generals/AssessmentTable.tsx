import type { ReportTable, Tone } from "@/types";

/** Baris tabel pengkajian gaya NCP */
export interface AssessmentRow {
  code: string;
  label: string;
  data?: string | number | null;
  normal?: string | null;
  unit?: string | null;
  interpretation?: string;
  tone?: Tone;
}

const TONE: Record<Tone, string> = { success: "text-success", warning: "text-warning", error: "text-error", info: "text-info" };

/** Tabel pengkajian gaya NCP: Domain | Data | (Nilai normal | Satuan) | Interpretasi */
export default function AssessmentTable({ title, rows, withNormal = false }: { title?: string; rows: AssessmentRow[]; withNormal?: boolean }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      {title && <p className="px-4 pt-3 text-sm font-semibold text-base-content/70">{title}</p>}
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Data</th>
            {withNormal && <th>Nilai normal</th>}
            {withNormal && <th>Satuan</th>}
            <th>Interpretasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="min-w-44">
                <span className="font-mono text-xs text-primary">{r.code}</span> {r.label}
              </td>
              <td className="tabular-nums">{r.data ?? "–"}</td>
              {withNormal && <td className="tabular-nums">{r.normal ?? "–"}</td>}
              {withNormal && <td>{r.unit ?? "–"}</td>}
              <td className={`font-medium ${r.tone ? TONE[r.tone] : ""}`}>{r.interpretation || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ubah baris pengkajian menjadi tabel laporan (PDF/Excel) */
export function toReportTable(title: string, rows: AssessmentRow[], withNormal = false): ReportTable {
  return {
    title,
    columns: withNormal ? ["Domain", "Data", "Nilai normal", "Satuan", "Interpretasi"] : ["Domain", "Data", "Interpretasi"],
    rows: rows.map((r) =>
      withNormal
        ? [`${r.code} ${r.label}`, r.data ?? "–", r.normal ?? "–", r.unit ?? "–", r.interpretation || "–"]
        : [`${r.code} ${r.label}`, r.data ?? "–", r.interpretation || "–"],
    ),
  };
}
