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
    { href: "/admin/venues", label: "Venues", icon: Monitor },
    { href: "/admin/teams", label: "Teams", icon: Users },
    { href: "/admin/matches", label: "Live Ops", icon: Activity },
    { href: "/admin/incidents", label: "Incidents", icon: ShieldAlert },
    { href: "/admin/audit", label: "Audit", icon: FileText },
    { href: "/admin/reports", label: "Reports", icon: Download },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-valorant-border bg-valorant-dark/95 backdrop-blur-md">
      <div className="flex h-14 items-center px-4 md:px-6 justify-between max-w-[1920px] mx-auto">
        {/* Left: Brand Crest & Title */}
        <div className="flex items-center gap-3 shrink-0 mr-4">
          <Link
            href="/admin"
            onClick={() => playButtonClick()}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-7 h-7 flex items-center justify-center bg-valorant-red p-1 transition-transform group-hover:scale-105 val-chamfer-btn shadow-sm shadow-valorant-red/30">
              <Image
                src="/images/valorant_v_logo.svg"
                alt="VALORANT"
                width={18}
                height={18}
                className="brightness-0 invert object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black tracking-widest text-base text-valorant-ivory leading-none group-hover:text-valorant-red transition-colors">
                VALORANT OPS
              </span>
              <span className="text-[8px] font-mono tracking-widest text-valorant-slate uppercase -mt-0.5">
                LAN PROTOCOL // VTO
              </span>
            </div>
          </Link>

          <span className="hidden xl:block h-5 w-px bg-valorant-border/80 ml-2" />
        </div>

        {/* Center: Primary Navigation Links — Full-height bottom-anchored baseline */}
        <nav className="hidden lg:flex items-center h-full gap-0.5 xl:gap-1 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => playButtonClick()}
                className={cn(
                  "relative flex items-center gap-1.5 h-full px-2.5 xl:px-3 text-xs font-heading font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap",
                  isActive
                    ? "border-valorant-red text-valorant-ivory bg-valorant-surface/40 shadow-[inset_0_-2px_8px_rgba(255,70,85,0.15)]"
                    : "border-transparent text-valorant-slate hover:text-valorant-ivory hover:border-valorant-border hover:bg-valorant-surface/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isActive ? "text-valorant-red" : "text-valorant-slate"
                  )}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Operator Action Toolkit — Uniform 32px height */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Audio Sound Toggle */}
          <button
            onClick={handleAudioToggle}
            title={audioActive ? "Mute Tactical Sound FX" : "Unmute Tactical Sound FX"}
            className={cn(
              "val-chamfer-btn h-8 w-8 flex items-center justify-center border transition-colors",
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

          {/* User Guide */}
          <UserGuideModal
            tournamentId="vto-tourney-1"
            triggerVariant="navbar"
          />

          {/* Announcement Desk */}
          <AnnouncementModal
            tournamentName="VALORANT Campus Championship 2026"
            venueName="University Esports Complex"
          />

          {/* Marshal Mobile View */}
          <Link
            href="/volunteer"
            onClick={() => playButtonClick()}
            className="val-chamfer-btn h-8 flex items-center gap-1.5 px-2.5 text-[11px] font-heading font-bold uppercase tracking-wider bg-valorant-surface hover:bg-valorant-elevated text-valorant-mint border border-valorant-border hover:border-valorant-mint transition-colors"
            title="Field Marshal Mobile Desk"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Marshal</span>
          </Link>

          {/* Projector Broadcast HUD — Primary Action Highlight */}
          <Link
            href="/display/vto-tourney-1"
            target="_blank"
            onClick={() => playButtonClick()}
            className="val-chamfer-btn h-8 flex items-center gap-1.5 px-3 text-[11px] font-heading font-bold uppercase tracking-wider bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory transition-colors shadow-sm shadow-valorant-red/30"
            title="Open Projector Broadcast Screen"
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
