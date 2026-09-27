"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnouncementModal } from "../operations/announcement-modal";
import { UserGuideModal } from "../help/user-guide-modal";
import { isAudioEnabled, toggleAudio, playButtonClick } from "@/lib/sound/audio";

export function Navbar() {
  const pathname = usePathname();
  const [audioActive, setAudioActive] = useState(true);

  useEffect(() => {
    setAudioActive(isAudioEnabled());
  }, []);

  const handleAudioToggle = () => {
    const newState = toggleAudio();
    setAudioActive(newState);
  };

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
    <header className="sticky top-0 z-50 w-full border-b border-valorant-border bg-valorant-dark/95 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-8 justify-between">
        {/* Left: Brand Crest & Title */}
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            onClick={() => playButtonClick()}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-8 h-8 flex items-center justify-center bg-valorant-red p-1.5 transition-transform group-hover:scale-105">
              <Image
                src="/images/valorant_v_logo.svg"
                alt="VALORANT"
                width={20}
                height={20}
                className="brightness-0 invert object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black tracking-widest text-lg text-valorant-ivory leading-none group-hover:text-valorant-red transition-colors">
                VALORANT OPS
              </span>
              <span className="text-[9px] font-mono tracking-widest text-valorant-slate uppercase -mt-0.5">
                LAN PROTOCOL // VTO
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => playButtonClick()}
                  className={cn(
                    "val-chamfer-tab relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-widest transition-all",
                    isActive
                      ? "bg-valorant-red text-white shadow-sm shadow-valorant-red/30"
                      : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Toolkit */}
        <div className="flex items-center gap-2">
          {/* Tactical Audio Toggle */}
          <button
            onClick={handleAudioToggle}
            title={audioActive ? "Mute Tactical Sound FX" : "Unmute Tactical Sound FX"}
            className={cn(
              "p-2 border transition-colors",
              audioActive
                ? "bg-valorant-surface border-valorant-border text-valorant-ivory hover:border-valorant-red"
                : "bg-valorant-dark border-valorant-border/60 text-valorant-slate"
            )}
          >
            {audioActive ? (
              <Volume2 className="h-3.5 w-3.5 text-valorant-red" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>

          <UserGuideModal
            tournamentId="vto-tourney-1"
            triggerVariant="navbar"
          />

          <AnnouncementModal
            tournamentName="VALORANT Campus Championship 2026"
            venueName="University Esports Complex"
          />

          {/* Quick External Views */}
          <Link
            href="/volunteer"
            onClick={() => playButtonClick()}
            className="val-chamfer-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marshal Mobile</span>
          </Link>

          <Link
            href="/display/vto-tourney-1"
            target="_blank"
            onClick={() => playButtonClick()}
            className="val-chamfer-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Projector HUD</span>
          </Link>
        </div>
      </div>

      {/* Mobile horizontal scrolling nav */}
      <div className="lg:hidden flex overflow-x-auto border-t border-valorant-border px-2 py-1 gap-1 bg-valorant-dark">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => playButtonClick()}
              className={cn(
                "val-chamfer-btn flex items-center gap-1 px-2.5 py-1 text-xs whitespace-nowrap font-heading font-bold uppercase tracking-wider",
                isActive
                  ? "bg-valorant-red text-white"
                  : "text-valorant-slate hover:text-white hover:bg-valorant-elevated"
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
