/**
 * Notifikasi toast berbasis SweetAlert2 (menggantikan toast DaisyUI lama).
 */
import Swal from "sweetalert2";

export type NotifyTone = "success" | "error" | "info" | "warning";

/**
 * <dialog> yang dibuka dengan showModal() berada di "top layer" browser, sehingga elemen lain
 * (termasuk SweetAlert) selalu tertutup olehnya. Jika ada dialog terbuka, render SweetAlert di dalamnya.
 */
export const swalTarget = (): HTMLElement | string =>
  (typeof document !== "undefined" &&
    document.querySelector<HTMLElement>("dialog[open]")) ||
  "body";

/** Tunggu sampai semua <dialog> modal tertutup (dipakai sebelum membuka SweetAlert dari tombol di dalam modal) */
export async function waitForDialogsClosed(timeoutMs = 600): Promise<void> {
  if (typeof document === "undefined") return;
  const start = Date.now();
  while (
    document.querySelector("dialog[open]") &&
    Date.now() - start < timeoutMs
  ) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: "nn-swal-toast" },
  didOpen: (el) => {
    el.addEventListener("mouseenter", () => Swal.stopTimer());
    el.addEventListener("mouseleave", () => Swal.resumeTimer());
  },
});

export function notify(message: string, tone: NotifyTone = "success"): void {
  void Toast.fire({ icon: tone, title: message, target: swalTarget() });
}
