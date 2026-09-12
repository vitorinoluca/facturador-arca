import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const description =
  "Facturá en ARCA sin abrir el portal — Factura C con CAE real para monotributistas. Delegás la facturación electrónica en dos clicks, sin certificados propios.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Facturador ARCA", template: "%s — Facturador ARCA" },
  description,
  keywords: ["factura electrónica", "monotributo", "ARCA", "AFIP", "WSFEv1", "factura C", "CAE"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Facturador ARCA",
    title: "Facturador ARCA",
    description,
    url: "/",
  },
  twitter: { card: "summary", title: "Facturador ARCA", description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
