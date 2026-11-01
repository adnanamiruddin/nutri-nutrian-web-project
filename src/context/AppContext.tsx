import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { notify } from "@/components/utils/alerts/notify";
import { KEYS, addRecord, clearRecords, deleteRecord, getRecords, read, write } from "@/helpers/storage";
import type { FoodInput, Patient, RawCustomFood, ReportRecord, SavedRecord, StoredFood } from "@/types";

export const EMPTY_PATIENT: Patient = { code: "", sex: "female", age: "", weight: "", height: "" };

interface AppContextValue {
  /** true setelah data localStorage dimuat (hindari mismatch SSR) */
  ready: boolean;
  records: SavedRecord[];
  patient: Patient;
  setPatient: (p: Patient) => void;
  saveRecord: (record: ReportRecord) => SavedRecord | null;
  removeRecord: (id: string) => void;
  clearAll: () => void;
  customFoods: RawCustomFood[];
  saveFood: (food: FoodInput, originalKode?: string) => boolean;
  deleteFood: (kode: string) => void;
  replaceFoods: (list: RawCustomFood[]) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [patient, setPatientState] = useState<Patient>(EMPTY_PATIENT);
  const [ready, setReady] = useState(false);
  const [customFoods, setCustomFoods] = useState<RawCustomFood[]>([]);

  useEffect(() => {
    setRecords(getRecords());
    setCustomFoods(read<RawCustomFood[]>(KEYS.customFoods, []));
    setPatientState({ ...EMPTY_PATIENT, ...read<Partial<Patient>>(KEYS.patient, {}) });
    setReady(true);
  }, []);

  const setPatient = useCallback((p: Patient) => {
    setPatientState(p);
    write(KEYS.patient, p);
  }, []);

  const saveRecord = useCallback(
    (record: ReportRecord) => {
      const item = addRecord({ patientCode: patient.code || "", ...record });
      if (item) {
        setRecords(getRecords());
        notify("Hasil disimpan ke riwayat");
      } else {
        notify("Gagal menyimpan: penyimpanan browser tidak tersedia atau penuh", "error");
      }
      return item;
    },
    [patient.code],
  );

  const removeRecord = useCallback((id: string) => {
    setRecords(deleteRecord(id));
    notify("Catatan dihapus", "info");
  }, []);

  const clearAll = useCallback(() => {
    setRecords(clearRecords());
    notify("Semua riwayat dihapus", "info");
  }, []);

  /* ---------- Bahan pangan tambahan pengguna (disimpan di browser) ---------- */
  const persistFoods = useCallback((list: RawCustomFood[]) => {
    setCustomFoods(list);
    return write(KEYS.customFoods, list);
  }, []);

  const saveFood = useCallback(
    (food: FoodInput, originalKode?: string) => {
      const list = read<StoredFood[]>(KEYS.customFoods, []);
      const now = new Date().toISOString();
      const exists = originalKode ? list.findIndex((f) => f.kode === originalKode) : -1;
      const item: StoredFood = { ...food, custom: true, updatedAt: now, createdAt: exists >= 0 ? list[exists].createdAt : now };
      const next = exists >= 0 ? list.map((f, i) => (i === exists ? item : f)) : [...list, item];
      const ok = persistFoods(next);
      notify(
        ok ? (exists >= 0 ? "Bahan pangan diperbarui" : "Bahan pangan ditambahkan") : "Gagal menyimpan: penyimpanan browser penuh",
        ok ? "success" : "error",
      );
      return ok;
    },
    [persistFoods],
  );

  const deleteFood = useCallback(
    (kode: string) => {
      persistFoods(read<StoredFood[]>(KEYS.customFoods, []).filter((f) => f.kode !== kode));
      notify("Bahan pangan dihapus", "info");
    },
    [persistFoods],
  );

  const replaceFoods = useCallback((list: RawCustomFood[]) => persistFoods(list), [persistFoods]);

  const value = useMemo<AppContextValue>(
    () => ({ ready, records, patient, setPatient, saveRecord, removeRecord, clearAll, customFoods, saveFood, deleteFood, replaceFoods }),
    [ready, records, patient, setPatient, saveRecord, removeRecord, clearAll, customFoods, saveFood, deleteFood, replaceFoods],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam <AppProvider>");
  return ctx;
}
