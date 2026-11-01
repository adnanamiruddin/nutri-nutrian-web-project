import Head from "next/head";
import type { ReactNode } from "react";
import { closeDrawer } from "@/components/layouts/generals/functions/drawer";
import Navbar from "@/components/layouts/generals/general-layout/Navbar";
import Sidebar from "@/components/layouts/generals/general-layout/Sidebar";
import { APP_NAME, DRAWER_ID } from "@/const/app";

/** Kerangka utama: navbar, sidebar (drawer), dan konten halaman. Judul tab statis. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{APP_NAME}</title>
      </Head>
      <div className="drawer lg:drawer-open">
        <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex min-h-screen flex-col bg-base-200">
          <Navbar drawerId={DRAWER_ID} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
        <div className="drawer-side z-40 print:hidden">
          <label htmlFor={DRAWER_ID} aria-label="Tutup menu" className="drawer-overlay" />
          <Sidebar onNavigate={closeDrawer} />
        </div>
      </div>
    </>
  );
}
