/**
 * Pembuat konfigurasi Chart.js yang konsisten (warna tema, format angka id-ID maks. 2 desimal).
 */
import type { ChartConfiguration, ChartDataset, TooltipItem } from "chart.js";
import { CHART_PALETTE, THEME_COLORS } from "@/const/theme";
import { fmt } from "@/helpers/formulas";
import type { Tone } from "@/types";

export const TONE_COLOR: Record<Tone, string> = {
  success: THEME_COLORS.success,
  warning: THEME_COLORS.warning,
  error: THEME_COLORS.error,
  info: THEME_COLORS.info,
};

/** Warna transparan dari hex, mis. alpha("#0f766e", 0.2) */
export const alpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const withUnit = (v: number | null | undefined, unit?: string) => `${fmt(v)}${unit ? ` ${unit}` : ""}`;

export interface BarSeries {
  label: string;
  data: (number | null)[];
  color?: string | string[];
}

/** Bar chart (vertikal/horizontal) untuk satu atau beberapa seri */
export function barConfig({
  labels,
  series,
  unit,
  horizontal = false,
  min,
  max,
  stacked = false,
}: {
  labels: string[];
  series: BarSeries[];
  unit?: string;
  horizontal?: boolean;
  min?: number;
  max?: number;
  stacked?: boolean;
}): ChartConfiguration<"bar"> {
  const valueAxis = horizontal ? "x" : "y";
  const datasets: ChartDataset<"bar", (number | null)[]>[] = series.map((s, i) => ({
    label: s.label,
    data: s.data,
    backgroundColor: s.color ?? CHART_PALETTE[i % CHART_PALETTE.length],
    borderRadius: 6,
    maxBarThickness: 44,
  }));
  return {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: { display: series.length > 1, position: "bottom" },
        tooltip: { callbacks: { label: (ctx: TooltipItem<"bar">) => `${ctx.dataset.label}: ${withUnit(ctx.parsed[valueAxis], unit)}` } },
      },
      scales: {
        [valueAxis]: {
          min,
          max,
          stacked,
          ticks: { callback: (v: string | number) => fmt(Number(v)) },
          title: unit ? { display: true, text: unit } : undefined,
        },
        [horizontal ? "y" : "x"]: { stacked, grid: { display: false } },
      },
    },
  };
}

/** Doughnut chart untuk komposisi (mis. distribusi energi makronutrien) */
export function doughnutConfig({
  labels,
  values,
  unit,
  colors = CHART_PALETTE,
}: {
  labels: string[];
  values: number[];
  unit?: string;
  colors?: string[];
}): ChartConfiguration<"doughnut"> {
  const total = values.reduce((s, v) => s + (v > 0 ? v : 0), 0);
  return {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, values.length), borderWidth: 2, borderColor: "#ffffff" }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<"doughnut">) => {
              const v = ctx.parsed;
              return `${ctx.label}: ${withUnit(v, unit)} (${fmt(total ? (v / total) * 100 : 0)}%)`;
            },
          },
        },
      },
    },
  };
}

export interface LineSeries {
  label: string;
  data: (number | null)[];
  color: string;
  fill?: boolean | string | number;
  dashed?: boolean;
  pointRadius?: number;
}

/** Line chart (mis. rentang anjuran kenaikan BB vs pengukuran) */
export function lineConfig({
  labels,
  series,
  unit,
  xTitle,
}: {
  labels: string[];
  series: LineSeries[];
  unit?: string;
  xTitle?: string;
}): ChartConfiguration<"line"> {
  return {
    type: "line",
    data: {
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: alpha(s.color, 0.12),
        pointBackgroundColor: s.color,
        fill: s.fill ?? false,
        borderDash: s.dashed ? [6, 4] : undefined,
        pointRadius: s.pointRadius ?? 0,
        pointHoverRadius: (s.pointRadius ?? 0) + 3,
        tension: 0.25,
        spanGaps: true,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (ctx: TooltipItem<"line">) => `${ctx.dataset.label}: ${withUnit(ctx.parsed.y, unit)}` } },
      },
      scales: {
        y: { ticks: { callback: (v: string | number) => fmt(Number(v)) }, title: unit ? { display: true, text: unit } : undefined },
        x: { title: xTitle ? { display: true, text: xTitle } : undefined, grid: { display: false } },
      },
    },
  };
}
