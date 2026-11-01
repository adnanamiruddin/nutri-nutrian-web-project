import { DRAWER_ID } from "@/const/app";

/** Tutup drawer sidebar (mobile) setelah navigasi */
export function closeDrawer(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
  if (el) el.checked = false;
}
