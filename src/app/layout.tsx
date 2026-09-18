import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { appEnvironmentOrNull, nomAffiche } from "@/shared/env";
import "@/styles/globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EJAH - Ecosysteme de Jonction et d'Assistance Humaine",
  description: "Plateforme agentique personnelle - Cockpit & Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const environment = appEnvironmentOrNull();

  return (
    <html
      lang="fr"
      className={`${sora.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--canvas)] font-[var(--font-plus-jakarta-sans)] text-[var(--ink)] antialiased">
        <Header environment={environment} nomAffiche={nomAffiche()} />
        {children}
      </body>
    </html>
  );
}
