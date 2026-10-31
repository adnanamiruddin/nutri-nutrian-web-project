import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="id" data-theme="nutrinutrian">
      <Head>
        <meta name="description" content="Nutri-Nutrian: alat bantu kalkulasi dan analisis gizi untuk ahli gizi dan dietisien." />
        <meta name="theme-color" content="#0f766e" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
