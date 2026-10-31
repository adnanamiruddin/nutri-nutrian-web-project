import Link from "next/link";
import { useRouter } from "next/router";
import {
  LuActivity, LuApple, LuBaby, LuBookOpen, LuCalculator, LuClipboardCheck, LuClipboardList, LuDroplets, LuFlaskConical,
  LuHeart, LuHeartPulse, LuHistory, LuLayoutDashboard, LuMessageSquareText, LuRuler, LuStethoscope, LuSyringe, LuUtensils,
} from "react-icons/lu";

/** Hanya halaman yang benar-benar ada di src/pages */
export const NAV = [
  { group: null, items: [{ href: "/", label: "Ringkasan", icon: LuLayoutDashboard }] },
  {
    group: "Database",
    items: [
      { href: "/search/tkpi", label: "Bahan Pangan (TKPI)", icon: LuApple },
      { href: "/search/antropometri", label: "Antropometri (AD)", icon: LuRuler },
      { href: "/search/biokimia", label: "Biokimia (BD)", icon: LuFlaskConical },
      { href: "/search/fisik-klinis", label: "Fisik/Klinis (PD)", icon: LuStethoscope },
      { href: "/search/ncp", label: "Diagnosis Gizi (NI/NC/NB)", icon: LuBookOpen },
    ],
  },
  {
    group: "Asesmen & kalkulator",
    items: [
      { href: "/asesmen", label: "Pengkajian Gizi", icon: LuClipboardCheck },
      { href: "/calculator", label: "Kalkulator Multi-Tab", icon: LuCalculator },
      { href: "/calculator/pediatrics", label: "Z-Score Anak", icon: LuBaby },
      { href: "/calculator/bmr-tee", label: "BMR & TEE", icon: LuActivity },
      { href: "/calculator/ckd", label: "Ginjal (CKD)", icon: LuDroplets },
      { href: "/calculator/diabetes", label: "Diabetes (PERKENI)", icon: LuHeartPulse },
      { href: "/calculator/enteral", label: "Enteral & Parenteral", icon: LuSyringe },
      { href: "/calculator/maternal", label: "Ibu Hamil & Menyusui", icon: LuHeart },
    ],
  },
  {
    group: "Diagnosis & intervensi",
    items: [
      { href: "/pes-generator", label: "Kalimat PES", icon: LuMessageSquareText },
      { href: "/intake", label: "Analisis Asupan", icon: LuUtensils },
      { href: "/history", label: "Riwayat & Laporan", icon: LuHistory },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const { pathname } = useRouter();
  return (
    <aside className="flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100">
      <Link href="/" className="flex items-center gap-3 px-5 pb-4 pt-5" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden>
          <LuClipboardList />
        </span>
        <span>
          <span className="block text-lg font-extrabold leading-tight tracking-tight">Nutri-Nutrian</span>
          <span className="block text-xs text-base-content/60">Alat bantu asuhan gizi</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Navigasi utama">
        {NAV.map((sec, i) => (
          <div key={i} className="mt-3">
            {sec.group && <p className="px-3 pb-1 text-xs font-semibold text-base-content/50">{sec.group}</p>}
            <ul className="menu w-full gap-0.5 p-0">
              {sec.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-field ${active ? "bg-primary/10 font-semibold text-primary" : ""}`}
                    >
                      <Icon className="text-base" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <p className="border-t border-base-300 px-5 py-3 text-[0.72rem] leading-snug text-base-content/50">
        Data tersimpan hanya di browser ini. Hasil kalkulasi adalah alat bantu; keputusan klinis tetap pada tenaga gizi.
      </p>
    </aside>
  );
}
