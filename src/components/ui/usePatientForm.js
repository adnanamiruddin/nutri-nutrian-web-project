import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

/**
 * State form yang otomatis terisi dari profil pasien sementara
 * (jenis kelamin, umur, BB, TB) setelah localStorage dimuat.
 */
export default function usePatientForm(extra = {}) {
  const { patient, ready } = useApp();
  const [form, setForm] = useState({ sex: "female", age: "", weight: "", height: "", ...extra });

  useEffect(() => {
    if (!ready) return;
    setForm((f) => ({
      ...f,
      sex: patient.sex || f.sex,
      age: patient.age || f.age,
      weight: patient.weight || f.weight,
      height: patient.height || f.height,
    }));
    // hanya saat profil berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patient]);

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  return [form, set, setForm];
}
