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
      <body className="min-h-screen bg-valorant-dark text-valorant-ivory font-body antialiased selection:bg-valorant-red selection:text-white relative">
        {/* Ambient Site Wallpaper Background — Increased visibility */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        >
          {/* Wallpaper Layer */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.35] pointer-events-none transition-opacity duration-300"
            style={{ backgroundImage: "url('/images/wallpaper-valo.jpg')" }}
          />
          {/* Tactical Coordinate Grid Overlay */}
          <div className="absolute inset-0 val-grid-bg opacity-40 pointer-events-none" />
          {/* Subtle edge vignette to keep border contrast */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(15,25,35,0.4)_100%)] pointer-events-none" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
        <Watermark />
      </body>
    </html>
  );
}
