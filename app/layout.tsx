import type { Metadata, Viewport } from "next";
import { Inter, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { Providers } from "./providers";

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
});

const deva = Tiro_Devanagari_Hindi({
  variable: "--font-deva-stack",
  weight: "400",
  subsets: ["devanagari", "latin"],
});

export const metadata: Metadata = {
  title: "Radhe Radhe — Naam Jaap",
  description: "A reverent counter for Radha naam jaap. Tap to chant. Count beads. Complete malas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Radhe Radhe",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${deva.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme will be applied by React after hydration from database */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t='lotus';var d=document.documentElement;if(t==='dark'){d.classList.add('theme-dark');}else if(t==='auto'){if(matchMedia('(prefers-color-scheme: dark)').matches)d.classList.add('theme-dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}
