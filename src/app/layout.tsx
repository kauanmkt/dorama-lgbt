import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/config/site";
import { NoZoom } from "@/components/pwa/NoZoom";
import "./globals.css";

// Fontes ficam dentro do projeto (sem depender do Google Fonts):
// carregam mais rápido e funcionam offline no PWA.
const sora = localFont({
  src: "../fonts/sora-latin-wght-normal.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
});

// Fonte da marca (só a logo "amora.")
const unbounded = localFont({
  src: "../fonts/unbounded-latin-800-normal.woff2",
  variable: "--font-unbounded",
  weight: "800",
  display: "swap",
});

const manrope = localFont({
  src: "../fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  // Faz o app abrir em tela cheia quando instalado no iPhone
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.background,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // App sem zoom (pinça e toque duplo), como um app nativo
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${manrope.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NoZoom />
        {children}
      </body>
    </html>
  );
}
