import Head from "next/head";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const DRAWER_ID = "main-drawer";

export default function Layout({ title, children }) {
  const close = () => {
    const el = typeof document !== "undefined" && document.getElementById(DRAWER_ID);
    if (el) el.checked = false;
  };
  return (
    <>
      <Head>
        <title>{title ? `${title} – Nutri-Nutrian` : "Nutri-Nutrian"}</title>
      </Head>
      <div className="drawer lg:drawer-open">
        <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex min-h-screen flex-col bg-base-200">
          <Navbar drawerId={DRAWER_ID} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
        <div className="drawer-side z-40 print:hidden">
          <label htmlFor={DRAWER_ID} aria-label="Tutup menu" className="drawer-overlay" />
          <Sidebar onNavigate={close} />
        </div>
      </div>
    </>
  );
}
