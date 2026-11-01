import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/helpers/formulas";
import { matchFood } from "@/helpers/tkpi";
import useFoods from "@/hooks/useFoods";
import type { Food } from "@/types";

/** Kotak pencarian bahan pangan TKPI (combobox) */
export default function FoodPicker({ value, onChange, id }: { value: string; onChange: (kode: string) => void; id?: string }) {
  const { foods, byCode } = useFoods();
  const selected = value ? byCode[value] : null;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const listId = `${id ?? "food-picker"}-list`;

  const results = useMemo(() => (q.trim().length < 2 ? [] : foods.filter((f) => matchFood(f, q)).slice(0, 30)), [q, foods]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (f: Food) => {
    onChange(f.kode);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="input input-sm w-full"
        placeholder={selected ? `${selected.nama} (${selected.kode})` : "Ketik min. 2 huruf, mis. nasi, tempe"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            pick(results[active]);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {selected && !q && (
        <p className="mt-1 truncate text-xs text-base-content/70">
          {selected.nama} <span className="font-mono">({selected.kode})</span>
        </p>
      )}
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="menu menu-sm absolute z-30 mt-1 max-h-64 w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
          {results.map((f, i) => (
            <li key={f.kode} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? "bg-primary/10" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(f)}>
                <span className="w-12 shrink-0 font-mono text-[0.7rem] opacity-60">{f.kode}</span>
                <span className="flex-1">
                  {f.nama}
                  {f.custom && <span className="badge badge-info badge-soft badge-xs ml-1">pengguna</span>}
                </span>
                <span className="text-[0.7rem] tabular-nums opacity-60">{f.gizi.energi === null ? "–" : fmt(f.gizi.energi)} kkal</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-30 mt-1 w-full rounded-box border border-base-300 bg-base-100 p-3 text-xs shadow-lg">Tidak ada pangan yang cocok.</p>
      )}
    </div>
  );
}
