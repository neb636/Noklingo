import type { Metadata } from "next";
import { Manrope, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
});

const assetPrefix = process.env.ASSET_PREFIX ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const assetPath = (path: string) => `${assetPrefix}${path}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Noklingo — Remember the Thai you learn",
  description:
    "Short Thai video lessons, cue cards, and next-day memory checks.",
  applicationName: "Noklingo",
  manifest: assetPath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noklingo",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Noklingo — Remember the Thai you learn",
    description: "Video lessons and delayed recall for conversational Thai.",
    type: "website",
    images: [
      {
        url: assetPath("/og-course-one.png"),
        width: 1536,
        height: 1024,
        alt: "Noklingo conversational Thai for real life",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Noklingo — Remember the Thai you learn",
    description: "Video lessons and delayed recall for conversational Thai.",
    images: [assetPath("/og-course-one.png")],
  },
  icons: {
    icon: [
      {
        url: assetPath("/icon-32.png"),
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: assetPath("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: assetPath("/icon-32.png"),
    apple: {
      url: assetPath("/apple-touch-icon.png"),
      sizes: "180x180",
      type: "image/png",
    },
  },
};

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
