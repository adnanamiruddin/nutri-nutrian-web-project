import { useState } from "react";
import Link from "next/link";
import { LuMenu, LuUserRound } from "react-icons/lu";
import BrandMark from "@/components/layouts/generals/general-layout/BrandMark";
import PatientModal from "@/components/utils/modals/PatientModal";
import { APP_NAME } from "@/const/app";
import { useApp } from "@/context/AppContext";

export default function Navbar({ drawerId }: { drawerId: string }) {
  const { patient } = useApp();
  const [open, setOpen] = useState(false);
  const hasPatient = patient.code || patient.weight || patient.age;
  const summary = [
    patient.code,
    patient.sex === "male" ? "L" : "P",
    patient.age && `${patient.age} th`,
    patient.weight && `${patient.weight} kg`,
    patient.height && `${patient.height} cm`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="navbar sticky top-0 z-30 min-h-14 border-b border-base-300 bg-base-100/90 px-3 backdrop-blur print:hidden md:px-6">
        <div className="flex-none lg:hidden">
          <label htmlFor={drawerId} className="btn btn-square btn-ghost" aria-label="Buka menu">
            <LuMenu className="text-xl" />
          </label>
        </div>
        {/* Mobile: ikon aplikasi tetap tampil di kiri atas */}
        <Link href="/" className="flex flex-1 items-center gap-2 px-1 font-bold lg:hidden">
          <BrandMark small />
          <span className="truncate">{APP_NAME}</span>
        </Link>
        <div className="hidden flex-1 lg:block" />
        <button
          type="button"
          className={`btn btn-sm ${hasPatient ? "btn-soft btn-primary" : "btn-outline"} max-w-[60vw]`}
          onClick={() => setOpen(true)}
        >
          <LuUserRound aria-hidden />
          <span className="truncate">{hasPatient ? summary : "Isi profil pasien"}</span>
        </button>
      </div>
      <PatientModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
