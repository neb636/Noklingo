import type { Metadata } from "next";
import { Manrope, Noto_Sans_Thai } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Noklingo — Speak Thai, little by little",
    description: "A playful, offline-first path to useful conversational Thai.",
    applicationName: "Noklingo",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Noklingo",
    },
    formatDetection: { telephone: false },
    openGraph: {
      title: "Noklingo — Speak Thai, little by little",
      description: "Short, playful lessons for useful conversational Thai.",
      type: "website",
      images: [
        {
          url: new URL("/og.png", base),
          width: 1734,
          height: 907,
          alt: "Noklingo conversational Thai learning path",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Noklingo — Speak Thai, little by little",
      description: "Short, playful lessons for useful conversational Thai.",
      images: [new URL("/og.png", base)],
    },
    icons: {
      icon: "/icon-192.png",
      shortcut: "/icon-192.png",
      apple: "/icon-192.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f77c63" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${manrope.variable} ${notoThai.variable}`}>
        {children}
      </body>
    </html>
  );
}
