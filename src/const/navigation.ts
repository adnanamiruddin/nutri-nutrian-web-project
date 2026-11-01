import type { IconType } from "react-icons";
import {
  LuActivity, LuApple, LuBaby, LuBookOpen, LuCalculator, LuClipboardCheck, LuDroplets, LuFlaskConical, LuHeart,
  LuHeartPulse, LuHistory, LuLayoutDashboard, LuMessageSquareText, LuRuler, LuStethoscope, LuSyringe, LuUtensils,
} from "react-icons/lu";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
}

export interface NavSection {
  group: string | null;
  items: NavItem[];
}

/** Menu samping; hanya halaman yang benar-benar ada di src/pages */
export const NAV: NavSection[] = [
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
    group: "Asesmen & Kalkulator",
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
    group: "Diagnosis & Intervensi",
    items: [
      { href: "/pes-generator", label: "Kalimat PES", icon: LuMessageSquareText },
      { href: "/intake", label: "Analisis Asupan", icon: LuUtensils },
      { href: "/history", label: "Riwayat & Laporan", icon: LuHistory },
    ],
  },
];
