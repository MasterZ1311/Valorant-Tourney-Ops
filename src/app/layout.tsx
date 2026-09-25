import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VTO — VALORANT Tournament Operations System",
  description: "Enterprise LAN esports tournament operations platform for VALORANT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f1923] text-gray-100 antialiased selection:bg-[#ff4655] selection:text-white">
        {children}
      </body>
    </html>
  );
}
