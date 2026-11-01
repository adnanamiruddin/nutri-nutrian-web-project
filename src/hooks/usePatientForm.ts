import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Sex } from "@/types";

export interface PatientFields {
  sex: Sex;
  age: string;
  weight: string;
  height: string;
}

/**
 * State form yang otomatis terisi dari profil pasien sementara
 * (jenis kelamin, umur, BB, TB) setelah localStorage dimuat.
 */
export default function usePatientForm<T extends object>(extra: T) {
  const { patient, ready } = useApp();
  const [form, setForm] = useState<PatientFields & T>({ sex: "female", age: "", weight: "", height: "", ...extra });

  useEffect(() => {
    if (!ready) return;
    setForm((f) => ({
      ...f,
      sex: patient.sex || f.sex,
      age: patient.age || f.age,
      weight: patient.weight || f.weight,
      height: patient.height || f.height,
    }));
  }, [ready, patient]);

  const set =
    <K extends keyof (PatientFields & T)>(key: K) =>
    (v: (PatientFields & T)[K]) =>
      setForm((f) => ({ ...f, [key]: v }));

  return [form, set, setForm] as const;
}
