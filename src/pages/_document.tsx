// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" style={{ overflowY: 'visible', overflowX: 'hidden' }}>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Prata&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            html { overflow-y: visible !important; overflow-x: hidden !important; }
            body { overflow-y: visible !important; overflow-x: hidden !important; overflow: visible !important; }
          `
        }} />
      </Head>
      <body className="antialiased" style={{ overflowY: 'visible', overflowX: 'hidden', overflow: 'visible' }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
