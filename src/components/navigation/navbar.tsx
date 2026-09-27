"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Trophy,
  Users,
  Monitor,
  Calendar,
  Layers,
  Activity,
  Smartphone,
  Tv,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnouncementModal } from "../operations/announcement-modal";
import { UserGuideModal } from "../help/user-guide-modal";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Dashboard", icon: Trophy },
    { href: "/admin/bracket", label: "Bracket", icon: Layers },
    { href: "/admin/fixtures", label: "Fixtures", icon: Calendar },
    { href: "/admin/venues", label: "Labs & PCs", icon: Monitor },
    { href: "/admin/teams", label: "Teams & Roster", icon: Users },
    { href: "/admin/matches", label: "Live Control", icon: Activity },
    { href: "/admin/incidents", label: "Incidents", icon: ShieldAlert },
    { href: "/admin/audit", label: "Audit Log", icon: FileText },
    { href: "/admin/reports", label: "Reports", icon: Download },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2b3844] bg-[#0f1923]/95 backdrop-blur">
      <div className="flex h-16 items-center px-4 md:px-8 justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 font-black tracking-widest text-lg text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#ff4655] text-black font-black text-sm">
              VTO
            </span>
            <span className="hidden sm:inline-block">VALORANT OPS</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors",
                    isActive
                      ? "bg-[#ff4655] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#1f2731]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <UserGuideModal
            tournamentId="vto-tourney-1"
            triggerVariant="navbar"
          />

          <AnnouncementModal
            tournamentName="VALORANT Campus Championship 2026"
            venueName="University Esports Complex"
          />

          <Link
            href="/volunteer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marshal Mobile</span>
          </Link>

          <Link
            href="/display/vto-tourney-1"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Projector TV</span>
          </Link>
        </div>
      </div>
      
      {/* Mobile navigation bar */}
      <div className="lg:hidden flex overflow-x-auto border-t border-[#2b3844] px-2 py-1 gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium",
                isActive
                  ? "bg-[#ff4655] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#1f2731]"
              )}
            >
              <Icon className="h-3 w-3" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
