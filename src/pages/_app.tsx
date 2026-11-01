import "nprogress/nprogress.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import MainLayout from "@/components/MainLayout";
import { AppProvider } from "@/context/AppContext";
import useRouteProgress from "@/hooks/useRouteProgress";

export default function App({ Component, pageProps }: AppProps) {
  useRouteProgress();
  return (
    <AppProvider>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
    </AppProvider>
  );
}
