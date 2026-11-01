import { LuClipboardList } from "react-icons/lu";

/** Ikon aplikasi (dipakai di sidebar dan navbar mobile) */
export default function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? " brand-mark-sm" : ""}`} aria-hidden>
      <LuClipboardList />
    </span>
  );
}
