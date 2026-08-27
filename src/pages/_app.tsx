import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { assetPath } from "@/lib/asset-path";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const focusedRoute = router.pathname === "/welcome" || router.pathname === "/study";

  return (
    <>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta key="theme-color-light" name="theme-color" content="#f7f8fc" media="(prefers-color-scheme: light)" />
        <meta key="theme-color-dark" name="theme-color" content="#111318" media="(prefers-color-scheme: dark)" />
        <meta name="application-name" content="NokLingo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NokLingo" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href={assetPath("/manifest.webmanifest")} />
        <link rel="icon" href={assetPath("/icon.svg")} type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href={assetPath("/apple-touch-icon.png")} sizes="180x180" />
        <title>NokLingo</title>
      </Head>
      <AppProviders>
        {focusedRoute ? (
          <main
            className={`focused-route focused-route--${router.pathname.slice(1)}`}
            id="main-content"
            tabIndex={-1}
          >
            <Component {...pageProps} />
          </main>
        ) : (
          <AppShell><Component {...pageProps} /></AppShell>
        )}
      </AppProviders>
    </>
  );
}
