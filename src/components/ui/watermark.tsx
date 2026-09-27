"use client";

import React from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { soundFX } from "@/lib/sound/audio";

export function Watermark() {
  return (
    <aside
      aria-label="Developer Watermark"
      className="fixed bottom-4 left-4 md:bottom-5 md:left-5 z-40 select-none print:hidden"
    >
      <a
        href="https://thenappant-portfolio.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => soundFX.playClick()}
        className="group relative flex items-center"
        title="Created by MasterZ — View Developer Portfolio"
      >
        {/* Outer Glow Ring on Hover */}
        <span
          className="absolute inset-0 rounded-full bg-valorant-red/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        />

        {/* Circular Avatar Container */}
        <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-valorant-border bg-black/90 p-0.5 overflow-hidden transition-all duration-300 group-hover:border-valorant-red group-hover:scale-110 shadow-lg shadow-black/60 group-hover:shadow-valorant-red/30 flex items-center justify-center">
          <Image
            src="/images/MZ_logo.svg"
            alt="MasterZ Logo"
            width={36}
            height={36}
            className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:rotate-6"
            priority
          />
        </div>

        {/* Tactical Hover Tooltip Badge */}
        <div
          role="tooltip"
          className="pointer-events-none absolute left-full ml-3 hidden sm:flex items-center gap-2 px-2.5 py-1 bg-valorant-dark/95 border border-valorant-border shadow-xl backdrop-blur-md opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-valorant-red animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-valorant-ivory uppercase font-bold">
            DEV // MASTERZ
          </span>
          <ExternalLink className="h-3 w-3 text-valorant-slate group-hover:text-valorant-red transition-colors" />
        </div>
      </a>
    </aside>
  );
}
