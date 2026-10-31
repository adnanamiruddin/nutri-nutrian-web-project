import { useEffect, useRef, useState } from "react";
import { EMPTY_PATIENT, useApp } from "@/context/AppContext";
import Field, { NumberField, SexField } from "@/components/ui/Field";

/** Profil pasien sementara — dipakai untuk mengisi otomatis semua kalkulator */
export default function PatientModal({ open, onClose }) {
  const { patient, setPatient, notify } = useApp();
  const [form, setForm] = useState(patient);
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setForm(patient);
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [open, patient]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setPatient(form);
    notify("Profil pasien diperbarui");
    onClose();
  };
  const reset = () => {
    setPatient(EMPTY_PATIENT);
    setForm(EMPTY_PATIENT);
    notify("Profil pasien dikosongkan", "info");
  };

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-bold">Profil pasien sementara</h3>
        <p className="mt-1 text-sm text-base-content/70">
          Data ini mengisi otomatis kalkulator. Gunakan kode atau inisial, bukan nama lengkap atau nomor identitas.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-4">
          <Field label="Kode / inisial pasien" className="col-span-2">
            <input
              className="input w-full"
              maxLength={20}
              placeholder="mis. P-012 atau AB"
              value={form.code}
              onChange={(e) => set("code")(e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <SexField value={form.sex} onChange={set("sex")} />
          </div>
          <NumberField label="Umur" unit="tahun" value={form.age} onChange={set("age")} />
          <NumberField label="Berat badan" unit="kg" value={form.weight} onChange={set("weight")} />
          <NumberField label="Tinggi badan" unit="cm" value={form.height} onChange={set("height")} />
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Kosongkan
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Simpan profil
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Tutup">tutup</button>
      </form>
    </dialog>
  );
}
