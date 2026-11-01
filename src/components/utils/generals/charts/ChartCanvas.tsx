import { useEffect, useRef } from "react";
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend, LinearScale,
  LineController, LineElement, PointElement, Tooltip,
} from "chart.js";
import type { ChartConfiguration } from "chart.js";
import { THEME_COLORS } from "@/const/theme";

// Daftarkan hanya komponen yang dipakai agar bundle tetap kecil (tree-shaking Chart.js)
Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend, LinearScale, LineController,
  LineElement, PointElement, Tooltip,
);
Chart.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
Chart.defaults.color = THEME_COLORS.neutral;
Chart.defaults.borderColor = THEME_COLORS.base300;

interface ChartCanvasProps {
  config: ChartConfiguration;
  height: number;
  label: string;
}

/** Pembungkus Chart.js: chart dibuat sekali, lalu diperbarui di tempat saat config berubah */
export default function ChartCanvas({ config, height, label }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = chartRef.current;
    if (current && (current.config as ChartConfiguration).type === config.type) {
      current.data = config.data;
      current.options = config.options ?? {};
      current.update();
      return;
    }
    current?.destroy();
    chartRef.current = new Chart(canvas, config);
  }, [config]);

  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
