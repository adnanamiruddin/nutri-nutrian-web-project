import { useEffect } from "react";
import Router from "next/router";
import NProgress from "nprogress";

/** Bar progres NProgress saat berpindah halaman (warna diatur di globals.css) */
export default function useRouteProgress(): void {
  useEffect(() => {
    NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.15 });

    // Perpindahan shallow (mis. ganti tab kalkulator) tidak memuat halaman baru, jadi dilewati
    const start = (_url: string, { shallow }: { shallow: boolean }) => {
      if (!shallow) NProgress.start();
    };
    const done = () => NProgress.done();

    Router.events.on("routeChangeStart", start);
    Router.events.on("routeChangeComplete", done);
    Router.events.on("routeChangeError", done);
    return () => {
      Router.events.off("routeChangeStart", start);
      Router.events.off("routeChangeComplete", done);
      Router.events.off("routeChangeError", done);
    };
  }, []);
}
