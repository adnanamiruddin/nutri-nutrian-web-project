/**
 * Warna tema untuk komponen yang butuh nilai warna langsung (Chart.js).
 * Harus sama dengan tema "nutrinutrian" di styles/globals.css.
 */
export const THEME_COLORS = {
  primary: "#0f766e",
  secondary: "#047857",
  accent: "#0e7490",
  neutral: "#334155",
  info: "#0369a1",
  success: "#15803d",
  warning: "#b45309",
  error: "#b91c1c",
  base300: "#dce5e2",
  baseContent: "#1e293b",
  muted: "#94a3b8",
} as const;

/** Palet berurutan untuk seri data chart */
export const CHART_PALETTE: string[] = [
  THEME_COLORS.primary,
  THEME_COLORS.accent,
  THEME_COLORS.warning,
  THEME_COLORS.secondary,
  THEME_COLORS.info,
  THEME_COLORS.error,
];
