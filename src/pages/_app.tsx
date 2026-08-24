import type { AppProps } from "next/app";
import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f4efe6" />
        <link rel="manifest" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`} />
        <title>Thai Study</title>
      </Head>
      <AppShell><Component {...pageProps} /></AppShell>
    </>
  );
}
