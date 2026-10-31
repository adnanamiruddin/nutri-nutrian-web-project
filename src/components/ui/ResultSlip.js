import { fmt } from "@/utils/formulas";

const TONE = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};

/**
 * Lembar hasil: angka utama + kategori + langkah perhitungan.
 * Garis tepi kiri menandai ini sebagai "slip" hasil klinis.
 */
export default function ResultSlip({ title, value, unit, digits = 0, category, steps = [], children, empty }) {
  return (
    <section className="result-slip rounded-box border border-base-300 bg-base-100">
      <div className="border-b border-base-300 px-5 py-4">
        <h2 className="text-sm font-semibold text-base-content/70">{title}</h2>
        {empty ? (
          <p className="mt-2 text-sm text-base-content/60">{empty}</p>
        ) : (
          <>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums tracking-tight text-primary">{fmt(value, digits)}</span>
              {unit && <span className="text-sm text-base-content/60">{unit}</span>}
            </p>
            {category && (
              <span className={`badge badge-soft mt-2 ${TONE[category.tone] || "badge-neutral"}`}>{category.label}</span>
            )}
          </>
        )}
      </div>
      {children && <div className="px-5 py-4">{children}</div>}
      {!empty && steps.length > 0 && (
        <details className="group border-t border-base-300 px-5 py-3" open>
          <summary className="cursor-pointer select-none text-sm font-semibold text-base-content/70">
            Langkah perhitungan
          </summary>
          <ol className="mt-2 space-y-1.5 text-[0.82rem] leading-relaxed text-base-content/80">
            {steps.map((s, i) => (
              <li key={i} className="calc-step tabular-nums">
                {s}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/** Baris nilai kecil (label – nilai) di dalam slip */
export function ResultRow({ label, value, unit, digits = 1, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-base-300 py-1.5 last:border-0">
      <span className="text-sm text-base-content/70">{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-base-content" : "font-medium"}`}>
        {typeof value === "number" ? fmt(value, digits) : value} {unit && <span className="text-xs text-base-content/55">{unit}</span>}
      </span>
    </div>
  );
}
