import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
