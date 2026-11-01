import dynamic from "next/dynamic";
import type { ChartConfiguration } from "chart.js";

// Chart.js hanya berjalan di browser; dimuat terpisah agar tidak membebani render awal
const ChartCanvas = dynamic(() => import("@/components/utils/generals/charts/ChartCanvas"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

interface ChartCardProps {
  title: string;
  description?: string;
  config: ChartConfiguration;
  height?: number;
}

/** Kartu chart dengan gaya yang sama seperti panel hasil lain */
export default function ChartCard({ title, description, config, height = 240 }: ChartCardProps) {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4 print:break-inside-avoid">
      <h2 className="text-sm font-semibold text-base-content/70">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-base-content/60">{description}</p>}
      <div className="mt-3" style={{ height }}>
        <ChartCanvas config={config} height={height} label={title} />
      </div>
    </section>
  );
}
