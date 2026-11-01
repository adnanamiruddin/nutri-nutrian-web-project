/**
 * helpers/storage.ts
 * Helper aman untuk localStorage (tidak error saat SSR / storage penuh / mode privat).
 */
import type { ReportRecord, SavedRecord } from "@/types";

const PREFIX = "nutri-nutrian:";
export const KEYS = {
  records: `${PREFIX}records`,
  patient: `${PREFIX}patient`,
  prefs: `${PREFIX}prefs`,
  assessment: `${PREFIX}asesmen-draft`,
  customFoods: `${PREFIX}tkpi-custom`,
} as const;

const hasStorage = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

export function read<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

export const uid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- Riwayat perhitungan ---------------- */

export const getRecords = (): SavedRecord[] => read<SavedRecord[]>(KEYS.records, []);

export function addRecord(record: ReportRecord): SavedRecord | null {
  const list = getRecords();
  const item: SavedRecord = { ...record, id: uid(), createdAt: new Date().toISOString() };
  const ok = write(KEYS.records, [item, ...list]);
  return ok ? item : null;
}

export function deleteRecord(id: string): SavedRecord[] {
  const list = getRecords().filter((r) => r.id !== id);
  write(KEYS.records, list);
  return list;
}

export function clearRecords(): SavedRecord[] {
  write(KEYS.records, []);
  return [];
}

/* ---------------- Ekspor ---------------- */

export function downloadJSON(data: unknown, filename = "nutri-nutrian.json"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Label jenis catatan riwayat */
export const TYPE_LABEL: Record<string, string> = {
  antropometri: "Status gizi dewasa",
  "bmr-tee": "BMR & TEE",
  ckd: "Ginjal (CKD)",
  diabetes: "Diabetes melitus",
  "enteral-parenteral": "Enteral & parenteral",
  "z-score": "Z-score anak",
  maternal: "Ibu hamil & menyusui",
  asupan: "Analisis asupan",
  pes: "Diagnosis PES",
  asesmen: "Pengkajian gizi (AD/BD/PD)",
};
