"use client";

import React, { useState } from "react";
import { ANNOUNCEMENT_TEMPLATES } from "@/lib/announcements/templates";
import { Megaphone, Copy, Check, X } from "lucide-react";

interface AnnouncementModalProps {
  tournamentName: string;
  venueName: string;
}

export function AnnouncementModal({ tournamentName, venueName }: AnnouncementModalProps) {
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
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
      >
        <Megaphone className="h-3.5 w-3.5" />
        Announcements
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2b3844] pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-[#ff4655]" />
                Tournament Operations Broadcast Desk
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Announcement Template
              </label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => {
                  const t = ANNOUNCEMENT_TEMPLATES.find((tpl) => tpl.id === e.target.value);
                  if (t) setSelectedTemplate(t);
                }}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-xs text-white"
              >
                {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    [{tpl.category}] {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Match Code</label>
                <input
                  type="text"
                  value={matchCode}
                  onChange={(e) => setMatchCode(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-2.5 py-1 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Station & Lab</label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-2.5 py-1 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Team A</label>
                <input
                  type="text"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-2.5 py-1 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Team B</label>
                <input
                  type="text"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-2.5 py-1 text-white"
                />
              </div>
            </div>

            {/* Generated Preview */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Rendered Broadcast Message
              </label>
              <div className="bg-[#0f1923] border border-[#2b3844] rounded-lg p-3.5 text-xs text-gray-200 font-mono whitespace-pre-wrap leading-relaxed">
                {renderedContent}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-gray-500">
                Ready for Discord, WhatsApp, or LAN PA announcement.
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-emerald-600/20"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied to Clipboard!" : "Copy Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
