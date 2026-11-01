import { Head, Html, Main, NextScript } from "next/document";
import { APP_DESCRIPTION } from "@/const/app";
import { THEME_COLORS } from "@/const/theme";

export default function Document() {
  return (
    <Html lang="id" data-theme="nutrinutrian">
      <Head>
        <meta name="description" content={APP_DESCRIPTION} />
        <meta name="theme-color" content={THEME_COLORS.primary} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
