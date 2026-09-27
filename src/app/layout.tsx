import type { Metadata } from "next";
import "./globals.css";
import { Watermark } from "@/components/ui/watermark";

export const metadata: Metadata = {
  title: "VTO — VALORANT Tournament Operations System",
  description: "Enterprise LAN esports tournament operations platform for VALORANT",
  icons: {
    icon: "/images/valorant_v_logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-valorant-dark val-grid-bg text-valorant-ivory font-body antialiased selection:bg-valorant-red selection:text-white">
        {children}
        <Watermark />
      </body>
    </html>
  );
}
