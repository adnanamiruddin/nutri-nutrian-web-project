import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KEYS, addRecord, clearRecords, deleteRecord, getRecords, read, write } from "@/utils/storage";

const AppContext = createContext(null);

export const EMPTY_PATIENT = { code: "", sex: "female", age: "", weight: "", height: "" };

export function AppProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [patient, setPatientState] = useState(EMPTY_PATIENT);
  const [toasts, setToasts] = useState([]);
  const [ready, setReady] = useState(false);
  const [customFoods, setCustomFoods] = useState([]);

  useEffect(() => {
    setRecords(getRecords());
    setCustomFoods(read(KEYS.customFoods, []));
    setPatientState({ ...EMPTY_PATIENT, ...read(KEYS.patient, {}) });
    setReady(true);
  }, []);

  const notify = useCallback((message, tone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const setPatient = useCallback((p) => {
    setPatientState(p);
    write(KEYS.patient, p);
  }, []);

  const saveRecord = useCallback(
    (record) => {
      const item = addRecord({ patientCode: patient.code || "", ...record });
      if (item) {
        setRecords(getRecords());
        notify("Hasil disimpan ke riwayat");
      } else {
        notify("Gagal menyimpan: penyimpanan browser tidak tersedia atau penuh", "error");
      }
      return item;
    },
    [notify, patient.code],
  );

  const removeRecord = useCallback(
    (id) => {
      setRecords(deleteRecord(id));
      notify("Catatan dihapus", "info");
    },
    [notify],
  );

  const clearAll = useCallback(() => {
    setRecords(clearRecords());
    notify("Semua riwayat dihapus", "info");
  }, [notify]);

  /* ---------- Bahan pangan tambahan pengguna (disimpan di browser) ---------- */
  const persistFoods = useCallback((list) => {
    setCustomFoods(list);
    return write(KEYS.customFoods, list);
  }, []);

  const saveFood = useCallback(
    (food, originalKode) => {
      const list = read(KEYS.customFoods, []);
      const now = new Date().toISOString();
      const exists = originalKode ? list.findIndex((f) => f.kode === originalKode) : -1;
      const item = { ...food, custom: true, updatedAt: now, createdAt: exists >= 0 ? list[exists].createdAt : now };
      const next = exists >= 0 ? list.map((f, i) => (i === exists ? item : f)) : [...list, item];
      const ok = persistFoods(next);
      notify(ok ? (exists >= 0 ? "Bahan pangan diperbarui" : "Bahan pangan ditambahkan") : "Gagal menyimpan: penyimpanan browser penuh", ok ? "success" : "error");
      return ok;
    },
    [notify, persistFoods],
  );

  const deleteFood = useCallback(
    (kode) => {
      persistFoods(read(KEYS.customFoods, []).filter((f) => f.kode !== kode));
      notify("Bahan pangan dihapus", "info");
    },
    [notify, persistFoods],
  );

  const replaceFoods = useCallback((list) => persistFoods(list), [persistFoods]);

  const value = useMemo(
    () => ({ ready, records, patient, setPatient, saveRecord, removeRecord, clearAll, notify, customFoods, saveFood, deleteFood, replaceFoods }),
    [ready, records, patient, setPatient, saveRecord, removeRecord, clearAll, notify, customFoods, saveFood, deleteFood, replaceFoods],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast toast-end toast-bottom z-[60] print:hidden" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${t.tone === "error" ? "alert-error" : t.tone === "info" ? "alert-info" : "alert-success"} shadow-md text-sm`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam <AppProvider>");
  return ctx;
}
