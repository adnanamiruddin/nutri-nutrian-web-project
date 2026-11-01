import Link from "next/link";
import { useRouter } from "next/router";
import BrandMark from "@/components/layouts/generals/general-layout/BrandMark";
import { APP_NAME, APP_TAGLINE } from "@/const/app";
import { NAV } from "@/const/navigation";

export default function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useRouter();
  return (
    <aside className="flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100">
      <Link href="/" className="flex items-center gap-3 px-5 pb-4 pt-5" onClick={onNavigate}>
        <BrandMark />
        <span>
          <span className="block text-lg font-extrabold leading-tight tracking-tight">{APP_NAME}</span>
          <span className="block text-xs text-base-content/60">{APP_TAGLINE}</span>
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
