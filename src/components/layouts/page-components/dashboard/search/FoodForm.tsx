import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import Modal from "@/components/utils/modals/Modal";
import { useApp } from "@/context/AppContext";
import { NUTRIENT_KEYS, NUTRIENT_META, SUB_KELOMPOK, nextCustomCode } from "@/helpers/tkpi";
import useFoods from "@/hooks/useFoods";
import type { Food, NutrientKey, NutrientValues } from "@/types";

const NEW_GROUP = "__baru__";
const MAIN: NutrientKey[] = ["energi", "protein", "lemak", "karbohidrat", "serat", "air"];

interface FoodFormState {
  kode: string;
  nama: string;
  kelompok: string;
  kelompokBaru: string;
  sub: string;
  sumber: string;
  bdd: string;
  gizi: Record<NutrientKey, string>;
}

type FormErrors = Partial<Record<"kode" | "nama" | "kelompok" | "bdd" | NutrientKey, string>>;

const emptyForm = (kode: string): FoodFormState => ({
  kode,
  nama: "",
  kelompok: "",
  kelompokBaru: "",
  sub: "Tunggal/Single",
  sumber: "",
  bdd: "100",
  gizi: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, ""])) as Record<NutrientKey, string>,
});

/**
 * Form tambah / ubah bahan pangan buatan pengguna.
 * Form ini hanya dibuka setelah kode rahasia diverifikasi (lihat TkpiSearch).
 */
export default function FoodForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Food | null }) {
  const { saveFood, customFoods } = useApp();
  const { byCode, kelompok } = useFoods();
  const [f, setF] = useState<FoodFormState>(emptyForm(""));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setF({
        kode: editing.kode,
        nama: editing.nama,
        kelompok: editing.kelompok,
        kelompokBaru: "",
        sub: editing.sub,
        sumber: editing.sumber === "Data pengguna" ? "" : editing.sumber,
        bdd: editing.bdd === null ? "" : String(editing.bdd),
        gizi: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, editing.gizi[k] === null ? "" : String(editing.gizi[k])])) as Record<NutrientKey, string>,
      });
    } else {
      setF(emptyForm(nextCustomCode(customFoods.map((c) => ({ kode: String(c.kode ?? "") })))));
    }
  }, [open, editing, customFoods]);

  const set = (k: Exclude<keyof FoodFormState, "gizi">) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const setG = (k: NutrientKey) => (e: ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, gizi: { ...s.gizi, [k]: e.target.value } }));

  const submit = () => {
    const err: FormErrors = {};
    const kode = f.kode.trim().toUpperCase();
    const kel = f.kelompok === NEW_GROUP ? f.kelompokBaru.trim() : f.kelompok;
    if (!kode) err.kode = "Kode wajib diisi.";
    else if (!/^[A-Z0-9_-]{2,12}$/.test(kode)) err.kode = "2–12 karakter: huruf, angka, - atau _.";
    else if (byCode[kode] && kode !== editing?.kode) err.kode = byCode[kode].custom ? "Kode sudah dipakai data pengguna lain." : "Kode sudah dipakai data TKPI.";
    if (!f.nama.trim()) err.nama = "Nama bahan wajib diisi.";
    if (!kel) err.kelompok = "Pilih kategori atau tulis kategori baru.";
    const bdd = f.bdd === "" ? 100 : Number(String(f.bdd).replace(",", "."));
    if (Number.isNaN(bdd) || bdd < 0 || bdd > 100) err.bdd = "BDD 0–100%.";
    const gizi = {} as NutrientValues;
    NUTRIENT_KEYS.forEach((k) => {
      const raw = String(f.gizi[k]).trim().replace(",", ".");
      if (raw === "") gizi[k] = null;
      else if (Number.isNaN(Number(raw)) || Number(raw) < 0) err[k] = "Angka ≥ 0";
      else gizi[k] = Number(raw);
    });
    if (gizi.energi === null && !err.energi) err.energi = "Energi wajib diisi.";
    setErrors(err);
    if (Object.keys(err).length) return;
    const ok = saveFood({ kode, nama: f.nama.trim(), kelompok: kel, sub: f.sub, sumber: f.sumber.trim() || "Data pengguna", bdd, gizi }, editing?.kode);
    if (ok) onClose();
  };

  const nutrientInput = (k: NutrientKey) => {
    const m = NUTRIENT_META[k];
    return (
      <label key={k} className="block">
        <span className="text-xs font-semibold text-base-content/75">
          {m.label}
          {k === "energi" && " *"}
        </span>
        <span className={`input input-sm mt-1 w-full ${errors[k] ? "input-error" : ""}`}>
          <input type="number" min="0" step="any" inputMode="decimal" value={f.gizi[k]} onChange={setG(k)} className="tabular-nums" aria-label={`${m.label} (${m.unit})`} />
          <span className="text-xs opacity-60">{m.unit}</span>
        </span>
        {errors[k] && <span className="text-xs text-error">{errors[k]}</span>}
      </label>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Ubah ${editing.nama}` : "Tambah bahan pangan"} wide>
      <p className="mt-1 text-sm text-base-content/70">
        Nilai gizi per 100 g bagian dapat dimakan (BDD). Kolom yang dikosongkan dianggap tidak ada data. Data tersimpan di browser ini.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">Kode *</span>
          <input className={`input input-sm mt-1 w-full font-mono uppercase ${errors.kode ? "input-error" : ""}`} value={f.kode} onChange={set("kode")} maxLength={12} />
          {errors.kode && <span className="text-xs text-error">{errors.kode}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">Nama bahan *</span>
          <input className={`input input-sm mt-1 w-full ${errors.nama ? "input-error" : ""}`} value={f.nama} onChange={set("nama")} placeholder="mis. Bubur kacang hijau" maxLength={120} />
          {errors.nama && <span className="text-xs text-error">{errors.nama}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">Kategori (kelompok) *</span>
          <select className={`select select-sm mt-1 w-full ${errors.kelompok ? "select-error" : ""}`} value={f.kelompok} onChange={set("kelompok")}>
            <option value="">Pilih kategori</option>
            {kelompok.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            <option value={NEW_GROUP}>+ Kategori baru…</option>
          </select>
          {f.kelompok === NEW_GROUP && (
            <input className="input input-sm mt-2 w-full" value={f.kelompokBaru} onChange={set("kelompokBaru")} placeholder="Nama kategori baru" maxLength={60} />
          )}
          {errors.kelompok && <span className="text-xs text-error">{errors.kelompok}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">Jenis</span>
          <select className="select select-sm mt-1 w-full" value={f.sub} onChange={set("sub")}>
            {SUB_KELOMPOK.filter((s) => s !== "Lainnya").map((s) => (
              <option key={s} value={s}>
                {s === "Tunggal/Single" ? "Tunggal (mentah/segar)" : "Olahan/produk"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">Sumber data</span>
          <input className="input input-sm mt-1 w-full" value={f.sumber} onChange={set("sumber")} placeholder="mis. label kemasan, USDA, hasil lab" maxLength={60} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-base-content/75">BDD</span>
          <span className={`input input-sm mt-1 w-full ${errors.bdd ? "input-error" : ""}`}>
            <input type="number" min="0" max="100" step="any" value={f.bdd} onChange={set("bdd")} className="tabular-nums" aria-label="BDD (%)" />
            <span className="text-xs opacity-60">%</span>
          </span>
          {errors.bdd && <span className="text-xs text-error">{errors.bdd}</span>}
        </label>
      </div>

      <h4 className="mt-5 text-sm font-semibold">Zat gizi utama (per 100 g)</h4>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{MAIN.map(nutrientInput)}</div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">Mineral & vitamin (opsional)</summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{NUTRIENT_KEYS.filter((k) => !MAIN.includes(k)).map(nutrientInput)}</div>
      </details>

      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          {editing ? "Simpan perubahan" : "Tambah bahan pangan"}
        </button>
      </div>
    </Modal>
  );
}
