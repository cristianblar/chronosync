import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientRuntime } from "@/components/pwa/ClientRuntime";
import { AuthHydrator } from "@/components/AuthHydrator";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "ChronoSync — Optimiza tu ritmo circadiano",
    template: "%s | ChronoSync",
  },
  description: "Descubre tu cronotipo, define tus obligaciones y recibe un plan de sueño personalizado de 7 días basado en ciencia cronobiológica.",
  applicationName: "ChronoSync",
  authors: [{ name: "ChronoSync" }],
  keywords: ["sueño", "cronotipo", "MEQ", "circadiano", "ritmo biológico", "optimización"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChronoSync",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
          href="#main-content"
        >
          Saltar al contenido principal
        </a>
        <ClientRuntime />
        <AuthHydrator />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
