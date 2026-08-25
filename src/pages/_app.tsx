import type { AppProps } from "next/app";
import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { assetPath } from "@/lib/asset-path";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta key="theme-color-light" name="theme-color" content="#f4efe6" media="(prefers-color-scheme: light)" />
        <meta key="theme-color-dark" name="theme-color" content="#181b19" media="(prefers-color-scheme: dark)" />
        <meta name="application-name" content="Thai Study" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Thai Study" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href={assetPath("/manifest.webmanifest")} />
        <link rel="icon" href={assetPath("/icon.svg")} type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href={assetPath("/apple-touch-icon.png")} sizes="180x180" />
        <title>Thai Study</title>
      </Head>
      <AppShell><Component {...pageProps} /></AppShell>
    </>
  );
}
