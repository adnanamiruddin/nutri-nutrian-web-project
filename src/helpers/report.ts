/**
 * helpers/report.ts
 * Ekspor laporan hasil kalkulasi ke PDF (jsPDF + autotable) dan Excel (write-excel-file).
 * Library dimuat dinamis saat tombol ditekan agar halaman tetap ringan.
 */
import { APP_NAME } from "@/const/app";
import { DECIMALS } from "@/helpers/formulas";
import { TYPE_LABEL } from "@/helpers/storage";
import type { ReportRecord, ReportValue } from "@/types";

const stamp = (d = new Date()) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(d);

const fileSafe = (s: string) => String(s || "laporan").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").slice(0, 60);

export const valueText = (v: ReportValue): string => {
  if (v === null || v === undefined || v === "") return "–";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "number") return new Intl.NumberFormat("id-ID", { maximumFractionDigits: DECIMALS }).format(v);
  return String(v);
};

/** Font standar PDF (WinAnsi) tidak punya beberapa simbol; ganti dengan padanan ASCII */
const PDF_MAP: Record<string, string> = {
  "−": "-", "–": "-", "—": "-", "≥": ">=", "≤": "<=", "→": "->", "←": "<-", "≈": "~", "κ": "kappa", "α": "alpha",
  "β": "beta", "√": "akar", "³": "^3", "\u00a0": " ", "\u2009": " ", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...",
};
const pdfText = (s: ReportValue) =>
  valueText(s)
    .replace(/[−–—≥≤→←≈καβ√³\u00a0\u2009‘’“”…]/g, (c) => PDF_MAP[c] ?? c)
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");

const entries = (obj?: Record<string, ReportValue>) =>
  Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== "");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */
export async function exportPDF(record: ReportRecord, { patientCode }: { patientCode?: string } = {}): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const teal: [number, number, number] = [15, 118, 110];
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...teal);
  doc.text(pdfText(TYPE_LABEL[record.type] || "Laporan kalkulasi gizi"), M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const titleLines: string[] = doc.splitTextToSize(pdfText(record.title), W - 2 * M);
  doc.text(titleLines, M, y);
  y += titleLines.length * 4.5 + 1;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const code = record.patientCode || patientCode;
  doc.text(pdfText(`${APP_NAME} | dibuat ${stamp(record.createdAt ? new Date(record.createdAt) : new Date())}${code ? ` | pasien ${code}` : ""}`), M, y);
  y += 3;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 5;

  const table = (title: string, head: string[] | null, body: ReportValue[][]) => {
    if (!body.length) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    doc.text(pdfText(title), M, y);
    autoTable(doc, {
      startY: y + 2,
      head: head ? [head.map(pdfText)] : undefined,
      body: body.map((r) => r.map(pdfText)),
      margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 229, 226], lineWidth: 0.2 },
      headStyles: { fillColor: teal, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [242, 246, 245] },
      columnStyles: head ? {} : { 0: { cellWidth: 70, textColor: [71, 85, 105] } },
      theme: "grid",
    });
    // jspdf-autotable menambahkan properti lastAutoTable ke instance jsPDF
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  };

  table("Hasil", null, entries(record.output).map(([k, v]) => [k, v]));
  (record.tables || []).forEach((t) => table(t.title, t.columns, t.rows));
  table("Data input", null, entries(record.input).map(([k, v]) => [k, v]));

  if (record.steps?.length) {
    if (y > 260) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Langkah perhitungan", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    record.steps.forEach((s, i) => {
      const lines: string[] = doc.splitTextToSize(pdfText(`${i + 1}. ${s}`), W - 2 * M);
      if (y + lines.length * 4 > 285) {
        doc.addPage();
        y = 16;
      }
      doc.text(lines, M, y);
      y += lines.length * 4 + 1;
    });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 140);
    doc.text(pdfText("Hasil kalkulasi adalah alat bantu; verifikasi oleh tenaga gizi sebelum dipakai untuk keputusan klinis."), M, 290);
    doc.text(`${p}/${pages}`, W - M, 290, { align: "right" });
  }
  doc.save(`${fileSafe(`${APP_NAME}_${record.type}_${new Date().toISOString().slice(0, 10)}`)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Excel                                                               */
/* ------------------------------------------------------------------ */
interface XlsxCell {
  value: string | number;
  fontWeight?: "bold";
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  wrap?: boolean;
}
type XlsxRow = (XlsxCell | null)[];
interface XlsxSheet {
  data: XlsxRow[];
  sheet: string;
  columns?: { width: number }[];
  stickyRowsCount?: number;
}

const head = (v: string): XlsxCell => ({ value: v, fontWeight: "bold", backgroundColor: "#0F766E", textColor: "#FFFFFF" });
const cell = (v: ReportValue): XlsxCell | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return { value: v };
  return { value: valueText(v), wrap: true };
};

function kvRows(title: string, obj?: Record<string, ReportValue>): XlsxRow[] {
  const rows = entries(obj);
  if (!rows.length) return [];
  return [[{ value: title, fontWeight: "bold" }, null], [head("Keterangan"), head("Nilai")], ...rows.map(([k, v]) => [cell(k), cell(v)]), [null, null]];
}

function recordSheet(record: ReportRecord, patientCode?: string): XlsxRow[] {
  const code = record.patientCode || patientCode;
  const data: XlsxRow[] = [
    [{ value: TYPE_LABEL[record.type] || "Laporan kalkulasi gizi", fontWeight: "bold", fontSize: 14 }],
    [{ value: valueText(record.title) }],
    [{ value: `${APP_NAME}, dibuat ${stamp(record.createdAt ? new Date(record.createdAt) : new Date())}${code ? `, pasien ${code}` : ""}` }],
    [null],
    ...kvRows("Hasil", record.output),
  ];
  (record.tables || []).forEach((t) => {
    data.push([{ value: t.title, fontWeight: "bold" }]);
    data.push(t.columns.map(head));
    t.rows.forEach((r) => data.push(r.map(cell)));
    data.push([null]);
  });
  data.push(...kvRows("Data input", record.input));
  if (record.steps?.length) {
    data.push([{ value: "Langkah perhitungan", fontWeight: "bold" }]);
    record.steps.forEach((s, i) => data.push([{ value: i + 1 }, { value: s, wrap: true }]));
  }
  // samakan panjang baris
  const width = Math.max(...data.map((r) => r.length));
  return data.map((r) => [...r, ...Array<null>(width - r.length).fill(null)]);
}

async function writeXlsx(sheets: XlsxSheet[], filename: string) {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  // Tipe bawaan write-excel-file sangat ketat per-overload; bentuk data di sini sudah sesuai dokumentasinya
  const blob = await (writeExcelFile as unknown as (s: XlsxSheet[]) => { toBlob: () => Promise<Blob> })(sheets).toBlob();
  download(blob, filename);
}

const REPORT_COLUMNS = [{ width: 34 }, { width: 46 }, { width: 18 }, { width: 18 }, { width: 28 }];

export async function exportExcel(record: ReportRecord, { patientCode }: { patientCode?: string } = {}): Promise<void> {
  await writeXlsx(
    [{ data: recordSheet(record, patientCode), sheet: "Laporan", columns: REPORT_COLUMNS }],
    `${fileSafe(`${APP_NAME}_${record.type}_${new Date().toISOString().slice(0, 10)}`)}.xlsx`,
  );
}

/** Ekspor banyak catatan riwayat: sheet ringkasan + satu sheet per catatan */
export async function exportRecordsExcel(records: ReportRecord[]): Promise<void> {
  const summary: XlsxRow[] = [
    ["Waktu", "Jenis", "Judul", "Pasien", "Hasil"].map(head),
    ...records.map((r) => [
      cell(stamp(new Date(r.createdAt ?? Date.now()))),
      cell(TYPE_LABEL[r.type] || r.type),
      cell(r.title),
      cell(r.patientCode || ""),
      cell(entries(r.output).map(([k, v]) => `${k}: ${valueText(v)}`).join("; ")),
    ]),
  ];
  const sheets: XlsxSheet[] = [
    { data: summary, sheet: "Ringkasan", columns: [{ width: 22 }, { width: 22 }, { width: 40 }, { width: 12 }, { width: 70 }], stickyRowsCount: 1 },
  ];
  records.slice(0, 100).forEach((r, i) => {
    sheets.push({
      data: recordSheet(r),
      sheet: `${i + 1}. ${(TYPE_LABEL[r.type] || r.type).slice(0, 24)}`.replace(/[\\/?*[\]:]/g, ""),
      columns: REPORT_COLUMNS,
    });
  });
  await writeXlsx(sheets, `${APP_NAME}_riwayat_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Ekspor tabel bebas (mis. hasil pencarian database) */
export async function exportTableExcel({
  sheet,
  columns,
  rows,
  filename,
}: {
  sheet: string;
  columns: string[];
  rows: ReportValue[][];
  filename: string;
}): Promise<void> {
  await writeXlsx(
    [
      {
        data: [columns.map(head), ...rows.map((r) => r.map(cell))],
        sheet,
        columns: columns.map((c) => ({ width: Math.max(10, Math.min(40, String(c).length + 6)) })),
        stickyRowsCount: 1,
      },
    ],
    filename,
  );
}
