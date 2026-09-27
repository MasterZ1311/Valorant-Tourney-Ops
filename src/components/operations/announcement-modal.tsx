"use client";

import React, { useState } from "react";
import { ANNOUNCEMENT_TEMPLATES } from "@/lib/announcements/templates";
import { Megaphone, Copy, Check, X } from "lucide-react";
import { playButtonClick } from "@/lib/sound/audio";
import { ValorantButton } from "../ui/valorant-button";

interface AnnouncementModalProps {
  tournamentName: string;
  venueName: string;
  triggerClassName?: string;
}

export function AnnouncementModal({
  tournamentName,
  venueName,
  triggerClassName,
}: AnnouncementModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(ANNOUNCEMENT_TEMPLATES[0]);
  const [matchCode, setMatchCode] = useState("M01");
  const [teamA, setTeamA] = useState("Sentinels Academy");
  const [teamB, setTeamB] = useState("Fnatic Rising");
  const [stationName, setStationName] = useState("Station 1");
  const [labName, setLabName] = useState("Lab 1 (North Arena)");
  const [scoreA, setScoreA] = useState("13");
  const [scoreB, setScoreB] = useState("9");
  const [winner, setWinner] = useState("Sentinels Academy");
  const [loser, setLoser] = useState("Fnatic Rising");
  const [reason, setReason] = useState("network switch reboot");
  const [copied, setCopied] = useState(false);

  const renderedContent = selectedTemplate.template({
    tournamentName,
    venueName,
    matchCode,
    teamA,
    teamB,
    stationName,
    labName,
    scoreA,
    scoreB,
    winner,
    loser,
    reason,
    champion: winner,
    deadline: "10:00 AM",
    roundName: "Quarterfinals",
    nextRound: "Semifinals",
    duration: "30 minutes",
    resumeTime: "1:30 PM",
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => {
          playButtonClick();
          setIsOpen(true);
        }}
        className={
          triggerClassName ||
          "val-chamfer-btn h-8 flex items-center gap-1.5 px-2.5 text-[11px] font-heading font-bold uppercase tracking-wider bg-valorant-surface hover:bg-valorant-elevated text-valorant-slate hover:text-valorant-ivory border border-valorant-border hover:border-valorant-slate transition-colors"
        }
        title="Broadcast Announcement Desk"
      >
        <Megaphone className="h-3.5 w-3.5 text-blue-400" />
        <span className="hidden xl:inline">Announce</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto val-chamfer shadow-2xl shadow-valorant-red/30">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-valorant-red" />
                Tournament Operations Broadcast Desk
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="font-mono text-xs">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-valorant-slate mb-1">
                Announcement Template
              </label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => {
                  const t = ANNOUNCEMENT_TEMPLATES.find((tpl) => tpl.id === e.target.value);
                  if (t) setSelectedTemplate(t);
                }}
                className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-xs text-valorant-ivory focus:border-valorant-red focus:outline-none"
              >
                {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.category}] {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-bold uppercase text-valorant-slate mb-0.5">Match Code</label>
                <input
                  type="text"
                  value={matchCode}
                  onChange={(e) => setMatchCode(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-2.5 py-1 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-valorant-slate mb-0.5">Station & Lab</label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-2.5 py-1 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-valorant-slate mb-0.5">Team A</label>
                <input
                  type="text"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-2.5 py-1 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-valorant-slate mb-0.5">Team B</label>
                <input
                  type="text"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-2.5 py-1 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>
            </div>

            {/* Generated Preview */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                Rendered Broadcast Message
              </label>
              <div className="bg-valorant-dark border border-valorant-border p-3.5 text-xs text-valorant-ivory font-mono whitespace-pre-wrap leading-relaxed">
                {renderedContent}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-valorant-slate">
                Ready for Discord, WhatsApp, or LAN PA announcement.
              </span>
              <ValorantButton
                onClick={handleCopy}
                variant="primary"
                size="sm"
              >
                {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied to Clipboard!" : "Copy Announcement"}
              </ValorantButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
