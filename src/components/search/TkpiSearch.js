import { useMemo, useState } from "react";
import { LuDownload, LuFileSpreadsheet, LuPencil, LuPlus, LuSearch, LuTrash2, LuUpload } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import FoodForm from "@/components/search/FoodForm";
import { useApp } from "@/context/AppContext";
import { exportTableExcel } from "@/utils/report";
import { fmt, num } from "@/utils/formulas";
import { NUTRIENT_KEYS, NUTRIENT_META, SUB_KELOMPOK, TKPI_SOURCE, matchFood, normalizeCustomFood } from "@/utils/tkpi";
import { downloadJSON } from "@/utils/storage";
import useFoods from "@/utils/useFoods";

const PAGE = 50;
const SORTS = [{ value: "kode", label: "Kode" }, { value: "nama", label: "Nama (A–Z)" }, ...NUTRIENT_KEYS.map((k) => ({ value: k, label: `${NUTRIENT_META[k].label} tertinggi` }))];

const show = (v, d) => (v === null || v === undefined ? "–" : fmt(v, d));

/** Pencarian Tabel Komposisi Pangan Indonesia (database dari Excel) */
export default function TkpiSearch() {
  const { notify, customFoods, deleteFood, replaceFoods } = useApp();
  const { foods: FOODS, kelompok: KELOMPOK, custom } = useFoods();
  const [origin, setOrigin] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [q, setQ] = useState("");
  const [kel, setKel] = useState("all");
  const [sub, setSub] = useState("all");
  const [sort, setSort] = useState("kode");
  const [extra, setExtra] = useState("serat");
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState(null);
  const [portion, setPortion] = useState("100");
  const [gross, setGross] = useState(false);

  const rows = useMemo(() => {
    const list = FOODS.filter(
      (f) =>
        (kel === "all" || f.kelompok === kel) &&
        (sub === "all" || f.sub === sub) &&
        (origin === "all" || (origin === "custom" ? f.custom : !f.custom)) &&
        matchFood(f, q),
    );
    if (sort === "kode") return list;
    if (sort === "nama") return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    return [...list].sort((a, b) => (b.gizi[sort] ?? -1) - (a.gizi[sort] ?? -1));
  }, [q, kel, sub, sort, origin, FOODS]);

  const reset = (fn) => (v) => {
    fn(v);
    setLimit(PAGE);
  };

  const exportRows = async () => {
    try {
      await exportTableExcel({
        sheet: "TKPI",
        filename: `TKPI_hasil_pencarian_${new Date().toISOString().slice(0, 10)}.xlsx`,
        columns: ["Kode", "Nama bahan", "Kelompok", "Sub-kelompok", "Sumber", "Asal data", "BDD (%)", ...NUTRIENT_KEYS.map((k) => `${NUTRIENT_META[k].label} (${NUTRIENT_META[k].unit})`)],
        rows: rows.map((f) => [f.kode, f.nama, f.kelompok, f.sub, f.sumber, f.custom ? "Data pengguna" : "TKPI", f.bdd, ...NUTRIENT_KEYS.map((k) => f.gizi[k])]),
      });
      notify(`${rows.length} pangan diekspor ke Excel`);
    } catch {
      notify("Gagal mengekspor Excel", "error");
    }
  };

  const backup = () => {
    downloadJSON({ jenis: "nutri-nutrian-tkpi-pengguna", versi: 1, dibuat: new Date().toISOString(), items: customFoods }, `TKPI_data_pengguna_${new Date().toISOString().slice(0, 10)}.json`);
    notify(`${customFoods.length} data pengguna dicadangkan`);
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const items = (Array.isArray(json) ? json : json.items || []).map(normalizeCustomFood).filter((x) => x.kode && x.nama);
      if (!items.length) throw new Error("kosong");
      const tkpiCodes = new Set(FOODS.filter((x) => !x.custom).map((x) => x.kode));
      const valid = items.filter((x) => !tkpiCodes.has(x.kode));
      const merged = [...customFoods.filter((x) => !valid.some((v) => v.kode === x.kode)), ...valid];
      replaceFoods(merged);
      notify(`${valid.length} bahan pangan dipulihkan${items.length > valid.length ? `, ${items.length - valid.length} dilewati (kode bentrok dengan TKPI)` : ""}`);
    } catch {
      notify("File tidak valid. Pilih file JSON hasil Cadangkan.", "error");
    }
  };

  // Hitung per porsi: berat bersih = berat × BDD bila yang diisi berat kotor
  const grams = num(portion) || 0;
  const netto = detail && gross ? (grams * (detail.bdd ?? 100)) / 100 : grams;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <label className="input w-full">
          <LuSearch className="opacity-50" aria-hidden />
          <input type="search" placeholder="Cari nama atau kode, mis. bayam rebus, AR001" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
        </label>
        <select className="select w-full" value={kel} onChange={(e) => reset(setKel)(e.target.value)} aria-label="Kelompok pangan">
          <option value="all">Semua kelompok ({FOODS.length})</option>
          {KELOMPOK.map((k) => (
            <option key={k} value={k}>{`${k} (${FOODS.filter((f) => f.kelompok === k).length})`}</option>
          ))}
        </select>
        <select className="select w-full" value={sub} onChange={(e) => reset(setSub)(e.target.value)} aria-label="Sub-kelompok">
          <option value="all">Mentah & olahan</option>
          {SUB_KELOMPOK.filter((s) => s !== "Lainnya").map((s) => (
            <option key={s} value={s}>{s === "Tunggal/Single" ? "Tunggal (mentah/segar)" : "Olahan/produk"}</option>
          ))}
        </select>
        <select className="select w-full" value={sort} onChange={(e) => reset(setSort)(e.target.value)} aria-label="Urutkan">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{`Urutkan: ${s.label}`}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <LuPlus aria-hidden /> Tambah bahan pangan
        </button>
        <div className="join" role="group" aria-label="Sumber data">
          {[["all", "Semua"], ["tkpi", "TKPI"], ["custom", `Data pengguna (${custom.length})`]].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={origin === k} className={`btn btn-sm join-item ${origin === k ? "btn-active" : ""}`} onClick={() => reset(setOrigin)(k)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!custom.length} onClick={backup} title="Cadangkan data pengguna ke file JSON">
          <LuDownload aria-hidden /> Cadangkan
        </button>
        <label className="btn btn-ghost btn-sm" title="Pulihkan data pengguna dari file JSON">
          <LuUpload aria-hidden /> Pulihkan
          <input type="file" accept="application/json,.json" className="hidden" onChange={restore} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-base-content/70">
          {rows.length} dari {FOODS.length} pangan{custom.length ? ` (${custom.length} data pengguna)` : ""}. Nilai per 100 g BDD.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            Kolom tambahan
            <select className="select select-sm w-36" value={extra} onChange={(e) => setExtra(e.target.value)}>
              {NUTRIENT_KEYS.filter((k) => !["energi", "protein", "lemak", "karbohidrat"].includes(k)).map((k) => (
                <option key={k} value={k}>{NUTRIENT_META[k].label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-sm btn-outline btn-primary" onClick={exportRows} disabled={!rows.length}>
            <LuFileSpreadsheet aria-hidden /> Ekspor Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama bahan</th>
              <th className="hidden lg:table-cell">Kelompok</th>
              <th className="text-right">Energi</th>
              <th className="text-right">Protein</th>
              <th className="hidden text-right sm:table-cell">Lemak</th>
              <th className="hidden text-right sm:table-cell">KH</th>
              <th className="hidden text-right md:table-cell">{NUTRIENT_META[extra].label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((f) => (
              <tr key={f.kode} className="cursor-pointer hover:bg-base-200" onClick={() => setDetail(f)}>
                <td className="font-mono text-xs">{f.kode}</td>
                <td>
                  <button type="button" className="link link-hover text-left font-medium">{f.nama}</button>
                  {f.sub === "Olahan/Produk/Komposit" && <span className="badge badge-ghost badge-xs ml-1">olahan</span>}
                  {f.custom && <span className="badge badge-info badge-soft badge-xs ml-1">pengguna</span>}
                </td>
                <td className="hidden text-xs text-base-content/65 lg:table-cell">{f.kelompok}</td>
                <td className="text-right tabular-nums">{show(f.gizi.energi, 0)}</td>
                <td className="text-right tabular-nums">{show(f.gizi.protein, 1)}</td>
                <td className="hidden text-right tabular-nums sm:table-cell">{show(f.gizi.lemak, 1)}</td>
                <td className="hidden text-right tabular-nums sm:table-cell">{show(f.gizi.karbohidrat, 1)}</td>
                <td className="hidden text-right tabular-nums md:table-cell">{show(f.gizi[extra], NUTRIENT_META[extra].d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-base-content/60">Tidak ada pangan yang cocok. Ubah kata kunci atau filter.</p>}
      </div>
      {rows.length > limit && (
        <div className="text-center">
          <button type="button" className="btn btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
            Tampilkan {Math.min(PAGE, rows.length - limit)} lagi
          </button>
        </div>
      )}
      <p className="text-xs text-base-content/55">{TKPI_SOURCE} Tanda “–” berarti tidak ada data.</p>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.nama} wide>
        {detail && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge badge-ghost font-mono">{detail.kode}</span>
              <span className="badge badge-primary badge-soft">{detail.kelompok}</span>
              <span className="badge badge-ghost">{detail.sub}</span>
              <span className="badge badge-ghost">BDD {detail.bdd ?? "–"}%</span>
              <span className="badge badge-ghost">Sumber {detail.sumber || "–"}</span>
            </div>
            {detail.custom && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-info badge-soft">Data pengguna</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => { setEditing(detail); setDetail(null); setFormOpen(true); }}>
                  <LuPencil aria-hidden /> Ubah
                </button>
                <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => { setConfirmDel(detail); setDetail(null); }}>
                  <LuTrash2 aria-hidden /> Hapus
                </button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-box bg-base-200 p-3">
              <label className="text-sm">
                <span className="block text-xs font-semibold">Hitung untuk</span>
                <span className="input input-sm mt-1 w-32">
                  <input type="number" min="0" value={portion} onChange={(e) => setPortion(e.target.value)} className="tabular-nums" />
                  <span className="text-xs opacity-60">g</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm">
                <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={gross} onChange={(e) => setGross(e.target.checked)} />
                Berat kotor (dikali BDD {detail.bdd ?? 100}%)
              </label>
              <span className="pb-1 text-xs text-base-content/65">Berat bersih: {fmt(netto, 1)} g</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Zat gizi</th>
                    <th className="text-right">Per 100 g</th>
                    <th className="text-right">Per {fmt(netto, 1)} g</th>
                  </tr>
                </thead>
                <tbody>
                  {NUTRIENT_KEYS.map((k) => {
                    const v = detail.gizi[k];
                    const m = NUTRIENT_META[k];
                    return (
                      <tr key={k}>
                        <td>
                          {m.label} <span className="text-xs text-base-content/55">({m.unit})</span>
                          {detail.ditandai.includes(k) && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-info align-middle" title="Sel bertanda di TKPI" />}
                        </td>
                        <td className="text-right tabular-nums">{show(v, m.d)}</td>
                        <td className="text-right tabular-nums">{v === null ? "–" : fmt((v * netto) / 100, m.d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {detail.ditandai.length > 0 && (
              <p className="mt-2 text-xs text-base-content/60">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-info align-middle" />
                Sel bertanda warna di TKPI; lihat keterangan warna di pendahuluan TKPI.
              </p>
            )}
          </div>
        )}
      </Modal>

      <FoodForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Hapus bahan pangan?">
        <p className="mt-2 text-sm">
          {confirmDel?.nama} ({confirmDel?.kode}) akan dihapus dari data pengguna. Analisis asupan yang memakai bahan ini tidak lagi bisa menghitungnya.
        </p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Batal</button>
          <button type="button" className="btn btn-error" onClick={() => { deleteFood(confirmDel.kode); setConfirmDel(null); }}>Hapus</button>
        </div>
      </Modal>
    </div>
  );
}
