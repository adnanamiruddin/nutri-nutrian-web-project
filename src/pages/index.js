import Link from "next/link";
import {
  LuActivity, LuApple, LuBaby, LuClipboardCheck, LuDroplets, LuFlaskConical, LuMessageSquareText, LuUtensils,
} from "react-icons/lu";
import { useApp } from "@/context/AppContext";
import tkpiMeta from "@/data/tkpiMeta.json";
import terms from "@/data/ncptAssessment.json";
import { TYPE_LABEL } from "@/utils/storage";

const FLOW = [
  { title: "Asesmen", text: "Tabel AD, BD, PD dengan kode NCPT dan interpretasi", href: "/asesmen" },
  { title: "Diagnosis", text: "Susun kalimat PES dari domain NI, NC, NB", href: "/pes-generator" },
  { title: "Intervensi", text: "Preskripsi energi dan analisis menu", href: "/intake" },
  { title: "Monitoring & evaluasi", text: "Bandingkan hasil di riwayat perhitungan", href: "/history" },
];

const TOOLS = [
  { href: "/asesmen", icon: LuClipboardCheck, label: "Pengkajian gizi", text: "Tabel AD, BD, PD siap cetak" },
  { href: "/calculator/pediatrics", icon: LuBaby, label: "Z-score anak", text: "Tabel Permenkes 2/2020 + tren" },
  { href: "/calculator/bmr-tee", icon: LuActivity, label: "BMR & TEE", text: "Mifflin, Harris-Benedict, Schofield, Katch-McArdle" },
  { href: "/calculator/ckd", icon: LuDroplets, label: "Ginjal (CKD)", text: "eGFR CKD-EPI 2021, protein KDOQI" },
  { href: "/search/tkpi", icon: LuApple, label: "Database TKPI", text: "1.145 pangan + data Anda" },
  { href: "/search/biokimia", icon: LuFlaskConical, label: "Istilah biokimia", text: "246 istilah BD NCPT" },
  { href: "/intake", icon: LuUtensils, label: "Analisis asupan", text: "Recall 24 jam dan SQ-FFQ" },
  { href: "/pes-generator", icon: LuMessageSquareText, label: "Kalimat PES", text: "Problem, etiology, signs/symptoms" },
];

export default function Home() {
  const { records, patient, ready } = useApp();
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = records.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length;
  const last = records[0];

  return (
    <div className="space-y-8">
      <section className="hero-panel rounded-box px-6 py-7 md:px-8">
        <h1 className="max-w-xl text-[1.9rem] font-extrabold leading-tight tracking-tight md:text-4xl">
          Asuhan gizi terstandar, dihitung dalam hitungan detik.
        </h1>
        <p className="mt-2 max-w-xl text-base-content/75">
          Ikuti alur PAGT dari asesmen sampai monitoring. Setiap hasil menampilkan rumus dan langkah perhitungannya.
        </p>
        <ol className="steps steps-vertical mt-6 w-full md:steps-horizontal">
          {FLOW.map((f) => (
            <li key={f.title} className="step step-primary">
              <Link href={f.href} className="group block px-2 text-left md:text-center">
                <span className="block font-semibold group-hover:underline">{f.title}</span>
                <span className="block text-xs text-base-content/65">{f.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="stats stats-vertical w-full border border-base-300 bg-base-100 md:stats-horizontal">
        <div className="stat">
          <div className="stat-title">Perhitungan tersimpan</div>
          <div className="stat-value text-primary tabular-nums">{ready ? records.length : "–"}</div>
          <div className="stat-desc">{thisWeek} dalam 7 hari terakhir</div>
        </div>
        <div className="stat">
          <div className="stat-title">Terakhir disimpan</div>
          <div className="stat-value truncate text-lg">{last ? TYPE_LABEL[last.type] || last.type : "Belum ada"}</div>
          <div className="stat-desc truncate">{last ? last.title : "Simpan hasil dari kalkulator mana pun"}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Profil pasien aktif</div>
          <div className="stat-value text-lg">{patient.code || (patient.weight ? "Tanpa kode" : "Kosong")}</div>
          <div className="stat-desc">
            {patient.weight ? `${patient.sex === "male" ? "Laki-laki" : "Perempuan"}, ${patient.age || "?"} th, ${patient.weight} kg` : "Isi lewat tombol di kanan atas"}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Data referensi</div>
          <div className="stat-value text-lg tabular-nums">{tkpiMeta.jumlah + terms.length}</div>
          <div className="stat-desc">
            {tkpiMeta.jumlah} pangan TKPI, {terms.length} istilah AD/BD/PD
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Alat yang sering dipakai</h2>
        <ul className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ href, icon: Icon, label, text }) => (
            <li key={href} className="bg-base-100">
              <Link href={href} className="flex h-full gap-3 p-4 hover:bg-primary/5">
                <Icon className="mt-0.5 shrink-0 text-xl text-primary" aria-hidden />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-base-content/65">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
Home.title = "Ringkasan";
