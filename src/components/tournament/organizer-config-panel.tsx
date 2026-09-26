"use client";

import React, { useState } from "react";
import { Monitor, Settings2, CheckCircle2, Plus, Sliders } from "lucide-react";
import { DomainLab } from "@/lib/scheduling/types";

interface OrganizerConfigPanelProps {
  initialLabs: DomainLab[];
  tournamentId: string;
}

export function OrganizerConfigPanel({
  initialLabs,
  tournamentId,
}: OrganizerConfigPanelProps) {
  const [labs, setLabs] = useState<DomainLab[]>(initialLabs);
  const [matchDuration, setMatchDuration] = useState(45);
  const [bufferDuration, setBufferDuration] = useState(15);
  const [gracePeriod, setGracePeriod] = useState(10);
  const [systemsPerMatch, setSystemsPerMatch] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateLab = async (labId: string, totalPcs: number, name?: string) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/labs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, totalPcs, name }),
      });
      const data = await res.json();
      if (data.success) {
        setLabs(data.data.labs);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to update lab", e);
    } finally {
      setIsSaving(false);
    }
  };

  const totalSystems = labs.reduce((sum, l) => sum + l.totalPcs, 0);
  const totalMatchSlots = labs.reduce(
    (sum, l) => sum + Math.floor(l.totalPcs / systemsPerMatch),
    0
  );

  return (
    <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2b3844]/60 pb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#ff4655]" />
            Organizer Hardware & Timing Configuration
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Dynamic lab systems allocation • Automatic capacity recalculation per time slot
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Configuration Saved & Capacity Recalculated
          </div>
        )}
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f1923] p-4 rounded-xl border border-[#2b3844]">
          <div className="text-[10px] uppercase font-bold text-gray-400">Total Systems Configured</div>
          <div className="text-2xl font-black text-white mt-1">{totalSystems} PCs</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Across {labs.length} computer halls</div>
        </div>

        <div className="bg-[#0f1923] p-4 rounded-xl border border-[#2b3844]">
          <div className="text-[10px] uppercase font-bold text-[#ff4655]">Simultaneous Capacity</div>
          <div className="text-2xl font-black text-[#ff4655] mt-1">{totalMatchSlots} Matches / Slot</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Requires 10 PCs per match station</div>
        </div>

        <div className="bg-[#0f1923] p-4 rounded-xl border border-[#2b3844]">
          <div className="text-[10px] uppercase font-bold text-gray-400">Time Slot Window</div>
          <div className="text-2xl font-black text-white mt-1">
            {matchDuration + bufferDuration} Minutes
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {matchDuration}m match + {bufferDuration}m buffer
          </div>
        </div>
      </div>

      {/* Labs Configuration Editor */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-400" />
          Active Computer Labs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labs.map((lab) => {
            const currentMatches = Math.floor(lab.totalPcs / systemsPerMatch);

            return (
              <div
                key={lab.id}
                className="bg-[#0f1923] border border-[#2b3844] rounded-xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-white text-sm flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                    {lab.name}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    {currentMatches} Match Slots
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">
                      Lab Name:
                    </label>
                    <input
                      type="text"
                      defaultValue={lab.name}
                      onBlur={(e) => {
                        if (e.target.value !== lab.name) {
                          handleUpdateLab(lab.id, lab.totalPcs, e.target.value);
                        }
                      }}
                      className="w-full bg-[#17202a] border border-[#2b3844] rounded px-3 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">
                      Total Working Systems:
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="10"
                      defaultValue={lab.totalPcs}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 10 && val !== lab.totalPcs) {
                          handleUpdateLab(lab.id, val, lab.name);
                        }
                      }}
                      className="w-full bg-[#17202a] border border-[#2b3844] rounded px-3 py-1.5 text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 border-t border-[#2b3844]/60 pt-2 flex items-center justify-between">
                  <span>Capacity Formula:</span>
                  <span className="font-mono text-gray-300">
                    floor({lab.totalPcs} / {systemsPerMatch}) = {currentMatches} simultaneous matches
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timing and Attendance Rule Controls */}
      <div className="space-y-4 pt-2 border-t border-[#2b3844]/60">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#ff4655]" />
          Match Flow & Attendance Timing
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-gray-400 font-bold mb-1">Match Duration:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="15"
                max="90"
                value={matchDuration}
                onChange={(e) => setMatchDuration(Number(e.target.value))}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-white font-mono font-bold"
              />
              <span className="text-gray-400">min</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">Station Buffer:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="30"
                value={bufferDuration}
                onChange={(e) => setBufferDuration(Number(e.target.value))}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-white font-mono font-bold"
              />
              <span className="text-gray-400">min</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">Forfeit Grace Period:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="30"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(Number(e.target.value))}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-white font-mono font-bold"
              />
              <span className="text-gray-400">min</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-bold mb-1">Systems Per Match:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="10"
                disabled
                value={systemsPerMatch}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-gray-400 font-mono font-bold cursor-not-allowed"
              />
              <span className="text-gray-400">PCs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
