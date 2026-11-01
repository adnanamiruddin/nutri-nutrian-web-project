import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { LuCopy, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { notify } from "@/components/utils/alerts/notify";
import Field from "@/components/utils/generals/Field";
import SaveBar from "@/components/utils/generals/SaveBar";
import { NCP, NCPT_TERMS } from "@/helpers/reference-data";
import type { AssessmentDomain, NcpDomainKey, NcptTerm } from "@/helpers/reference-data";
import type { ReportRecord } from "@/types";

const ncp = NCP;
const terms = NCPT_TERMS;
type StringListSetter = Dispatch<SetStateAction<string[]>>;

const DOMAIN_LABEL: Record<AssessmentDomain, string> = { AD: "Antropometri", BD: "Biokimia", PD: "Fisik/klinis" };

/** Huruf awal dikecilkan kecuali singkatan (mis. "IMT", "BB") agar kalimat mengalir */
const lowerFirst = (t: string) => (t.length > 1 && t[1] === t[1].toLowerCase() && /[A-Z]/.test(t[0]) ? t[0].toLowerCase() + t.slice(1) : t);

function joinList(arr: string[]) {
  const a = arr.filter(Boolean).map(lowerFirst);
  if (a.length <= 1) return a[0] || "";
  return `${a.slice(0, -1).join(", ")} dan ${a[a.length - 1]}`;
}

export function buildPes({ problem, etiology, signs }: { problem: string; etiology: string[]; signs: string[] }) {
  if (!problem) return "";
  const e = joinList(etiology);
  const s = joinList(signs);
  return `${problem}${e ? ` berkaitan dengan ${e}` : ""}${s ? ` ditandai dengan ${s}` : ""}.`;
}

/** Daftar pilihan dengan centang + tambahan teks bebas */
interface ChipPickerProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onAdd: (v: string) => void;
  placeholder?: string;
}

function ChipPicker({ label, options, selected, onToggle, onAdd, placeholder }: ChipPickerProps) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t) onAdd(t);
    setText("");
  };
  const custom = selected.filter((s) => !options.includes(s));
  return (
    <Field label={label}>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm mt-0.5" checked={selected.includes(o)} onChange={() => onToggle(o)} />
            <span>{o}</span>
          </label>
        ))}
        {custom.map((c) => (
          <span key={c} className="flex items-start gap-2 text-sm">
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => onToggle(c)} aria-label={`Hapus ${c}`}>
              <LuX />
            </button>
            <span>{c}</span>
          </span>
        ))}
      </div>
      <div className="join mt-2 w-full">
        <input
          className="input join-item w-full"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn join-item" onClick={add}>
          <LuPlus aria-hidden /> Tambah
        </button>
      </div>
    </Field>
  );
}

/** Pilih istilah asesmen AD/BD/PD dari database NCPT + nilai hasil ukur */
function AssessmentPicker({ onAdd }: { onAdd: (v: string) => void }) {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<"all" | AssessmentDomain>("all");
  const [picked, setPicked] = useState<NcptTerm | null>(null);
  const [value, setValue] = useState("");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return terms
      .filter((t) => (domain === "all" || t.domain === domain) && (t.term.toLowerCase().includes(s) || t.code.toLowerCase().includes(s)))
      .slice(0, 8);
  }, [q, domain]);

  const add = () => {
    if (!picked) return;
    onAdd(`${picked.term}${value.trim() ? ` ${value.trim()}` : ""} (${picked.code})`);
    setPicked(null);
    setValue("");
    setQ("");
  };

  return (
    <div className="rounded-box border border-dashed border-base-300 p-3">
      <p className="text-sm font-semibold">Ambil dari istilah asesmen NCPT</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <select className="select select-sm shrink-0 sm:w-48" value={domain} onChange={(e) => setDomain(e.target.value as "all" | AssessmentDomain)} aria-label="Domain asesmen">
          <option value="all">Semua domain</option>
          {Object.entries(DOMAIN_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{`${k} – ${v}`}</option>
          ))}
        </select>
        <input
          className="input input-sm w-full"
          placeholder="Cari istilah, mis. albumin, weight loss, edema"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPicked(null);
          }}
        />
      </div>
      {results.length > 0 && !picked && (
        <ul className="menu menu-sm mt-1 max-h-56 w-full flex-nowrap overflow-y-auto rounded-box bg-base-200 p-1">
          {results.map((t) => (
            <li key={t.code}>
              <button type="button" onClick={() => setPicked(t)}>
                <span className="badge badge-ghost badge-sm">{t.code}</span>
                {t.term}
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm">
            <span className="badge badge-primary badge-soft badge-sm mr-1">{picked.code}</span>
            {picked.term}
          </span>
          <input
            className="input input-sm w-full sm:flex-1"
            placeholder="Nilai / keterangan, mis. 2,8 g/dL"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={add}>
            Tambahkan ke tanda/gejala
          </button>
        </div>
      )}
    </div>
  );
}

export default function PesGenerator() {
  const [domain, setDomain] = useState<NcpDomainKey>("NI");
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [etiology, setEtiology] = useState<string[]>([]);
  const [signs, setSigns] = useState<string[]>([]);
  const [list, setList] = useState<{ code: string; domain: string; statement: string }[]>([]);

  const item = ncp.items.find((i) => i.code === code);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ncp.items.filter(
      (i) => i.domain === domain && (!s || `${i.code} ${i.problem} ${i.problemEn}`.toLowerCase().includes(s)),
    );
  }, [domain, q]);

  const toggle = (setter: StringListSetter) => (v: string) => setter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  const addTo = (setter: StringListSetter) => (v: string) => setter((arr) => (arr.includes(v) ? arr : [...arr, v]));

  const statement = buildPes({ problem: item ? `${item.problem} (${item.code})` : "", etiology, signs });
  const complete = !!item && etiology.length > 0 && signs.length > 0;

  const pick = (c: string) => {
    setCode(c);
    setEtiology([]);
    setSigns([]);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Kalimat PES disalin");
    } catch {
      notify("Gagal menyalin; salin manual dari layar", "error");
    }
  };

  const addToList = () => {
    if (!item) return;
    setList((l) => [...l, { code: item.code, domain: item.domain, statement }]);
    notify("Ditambahkan ke daftar diagnosis");
  };

  const pesRecord = (): ReportRecord => ({
    type: "pes",
    title: `${list.length} diagnosis gizi (PES)`,
    input: { "Jumlah diagnosis": list.length },
    output: Object.fromEntries(list.map((d, i) => [`Diagnosis ${i + 1}`, d.statement])),
    tables: [{ title: "Diagnosis gizi", columns: ["No", "Kode", "Domain", "Kalimat PES"], rows: list.map((d, i) => [i + 1, d.code, d.domain, d.statement]) }],
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Problem */}
      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-2">
          <h2 className="font-semibold">Pilih problem</h2>
          <div className="tabs tabs-box tabs-sm" role="tablist">
            {(Object.entries(ncp.domains) as [NcpDomainKey, string][]).map(([k, v]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={domain === k}
                className={`tab ${domain === k ? "tab-active" : ""}`}
                onClick={() => setDomain(k)}
                title={v}
              >
                {k}
              </button>
            ))}
          </div>
          <input className="input input-sm w-full" placeholder="Cari kode atau nama problem" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="menu menu-sm max-h-[26rem] w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 p-1">
            {filtered.map((i) => (
              <li key={i.code}>
                <button type="button" className={code === i.code ? "bg-primary/10 font-semibold text-primary" : ""} onClick={() => pick(i.code)}>
                  <span className="w-16 shrink-0 font-mono text-xs opacity-70">{i.code}</span>
                  <span>{i.problem}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="p-3 text-sm text-base-content/60">Tidak ada problem yang cocok.</li>}
          </ul>
        </div>
      </div>

      {/* Etiology & signs */}
      <div className="space-y-4">
        {item ? (
          <div className="card border border-base-300 bg-base-100">
            <div className="card-body gap-1">
              <h2 className="text-lg font-bold">
                {item.problem} <span className="font-mono text-sm font-medium text-base-content/60">{item.code}</span>
              </h2>
              <p className="text-sm text-base-content/70">{item.definition}</p>
              <ChipPicker
                label="Etiology (penyebab)"
                options={item.etiology}
                selected={etiology}
                onToggle={toggle(setEtiology)}
                onAdd={addTo(setEtiology)}
                placeholder="Tulis penyebab lain"
              />
              <ChipPicker
                label="Signs/symptoms (tanda & gejala)"
                options={item.signs}
                selected={signs}
                onToggle={toggle(setSigns)}
                onAdd={addTo(setSigns)}
                placeholder="mis. asupan energi 65% kebutuhan"
              />
              <AssessmentPicker onAdd={addTo(setSigns)} />
            </div>
          </div>
        ) : (
          <div className="rounded-box border border-dashed border-base-300 p-6 text-sm text-base-content/65">
            Pilih problem di daftar untuk mulai menyusun kalimat PES.
          </div>
        )}

        <section className="result-slip rounded-box border border-base-300 bg-base-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-base-content/70">Kalimat PES</h2>
          <p className="mt-2 text-[1.05rem] leading-relaxed">
            {statement || <span className="text-base-content/50">[Problem] berkaitan dengan [Etiology] ditandai dengan [Signs/Symptoms]</span>}
          </p>
          {item && !complete && <p className="mt-2 text-xs text-warning">Lengkapi minimal satu etiology dan satu tanda/gejala.</p>}
          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <button type="button" className="btn btn-primary btn-sm" disabled={!complete} onClick={addToList}>
              <LuPlus aria-hidden /> Tambah ke daftar
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!statement} onClick={() => copy(statement)}>
              <LuCopy aria-hidden /> Salin
            </button>
          </div>
        </section>

        {list.length > 0 && (
          <section className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <h2 className="font-semibold">Daftar diagnosis gizi</h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              {list.map((d, i) => (
                <li key={i}>
                  <span>{d.statement}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs ml-1 print:hidden"
                    onClick={() => setList((l) => l.filter((_, j) => j !== i))}
                    aria-label="Hapus diagnosis"
                  >
                    <LuTrash2 />
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2 print:hidden">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(list.map((d, i) => `${i + 1}. ${d.statement}`).join("\n"))}>
                <LuCopy aria-hidden /> Salin semua
              </button>
            </div>
            <SaveBar record={pesRecord} saveLabel="Simpan ke riwayat" />
          </section>
        )}
      </div>
    </div>
  );
}
