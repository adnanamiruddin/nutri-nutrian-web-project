/**
 * Tabel pengkajian gaya NCP: Domain | Data | (Nilai normal | Satuan) | Interpretasi
 * rows: [{ code, label, data, normal?, unit?, interpretation, tone? }]
 */
const TONE = { success: "text-success", warning: "text-warning", error: "text-error", info: "text-info" };

export default function AssessmentTable({ title, rows, withNormal = false }) {
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
              <td className={`font-medium ${TONE[r.tone] || ""}`}>{r.interpretation || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ubah baris pengkajian menjadi tabel laporan (PDF/Excel) */
export function toReportTable(title, rows, withNormal = false) {
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
