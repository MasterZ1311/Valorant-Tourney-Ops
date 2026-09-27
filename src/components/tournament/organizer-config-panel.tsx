"use client";

import React, { useState } from "react";
import { Monitor, Settings2, CheckCircle2, Sliders } from "lucide-react";
import { DomainLab } from "@/lib/scheduling/types";
import { TacticalCard } from "../ui/tactical-card";
import { soundFX } from "@/lib/sound/audio";

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
        soundFX.playClick();
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
    <TacticalCard
      title="Hardware & Timing Configuration"
      telemetry="VENUE TELEMETRY // TIMING PROTOCOL"
      variant="red"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
          <p className="text-xs font-mono text-valorant-slate">
            Dynamic lab systems allocation • Automatic capacity recalculation per time slot • 10 PCs/match invariant.
          </p>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-valorant-mint/10 border border-valorant-mint/40 text-valorant-mint text-xs font-mono font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CONFIGURATION SAVED & CAPACITY RECALCULATED
            </div>
          )}
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          <div className="bg-valorant-dark p-4 border border-valorant-border val-chamfer-btn">
            <div className="text-[10px] uppercase font-bold text-valorant-slate">TOTAL RIGS CONFIGURED</div>
            <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">{totalSystems} PCS</div>
            <div className="text-[10px] text-valorant-slate mt-0.5">ACROSS {labs.length} PHYSICAL LABS</div>
          </div>

          <div className="bg-valorant-dark p-4 border-2 border-valorant-red val-chamfer-btn">
            <div className="text-[10px] uppercase font-bold text-valorant-red">SIMULTANEOUS CAPACITY</div>
            <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">{totalMatchSlots} MATCHES / SLOT</div>
            <div className="text-[10px] text-valorant-slate mt-0.5">10 RIGS / MATCH STATION</div>
          </div>

          <div className="bg-valorant-dark p-4 border border-valorant-border val-chamfer-btn">
            <div className="text-[10px] uppercase font-bold text-valorant-slate">TIME SLOT WINDOW</div>
            <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">
              {matchDuration + bufferDuration} MIN
            </div>
            <div className="text-[10px] text-valorant-slate mt-0.5">
              {matchDuration}M COMBAT + {bufferDuration}M BUFFER
            </div>
          </div>
        </div>

        {/* Labs Configuration Editor */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
            <Monitor className="h-4 w-4 text-valorant-cyan" />
            Active Physical Sectors
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {labs.map((lab) => {
              const currentMatches = Math.floor(lab.totalPcs / systemsPerMatch);

              return (
                <div
                  key={lab.id}
                  className="bg-valorant-dark border border-valorant-border p-4 space-y-4 val-chamfer-btn"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-heading font-bold text-valorant-ivory text-sm uppercase flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-valorant-mint"></span>
                      {lab.name}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-valorant-mint/10 text-valorant-mint border border-valorant-mint/30 font-bold">
                      {currentMatches} COMBAT SLOTS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">
                        Sector Name:
                      </label>
                      <input
                        type="text"
                        defaultValue={lab.name}
                        onBlur={(e) => {
                          if (e.target.value !== lab.name) {
                            handleUpdateLab(lab.id, lab.totalPcs, e.target.value);
                          }
                        }}
                        className="w-full bg-valorant-surface border border-valorant-border px-3 py-1.5 text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">
                        Total Working Rigs:
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
                        className="w-full bg-valorant-surface border border-valorant-border px-3 py-1.5 text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-valorant-slate border-t border-valorant-border pt-2 flex items-center justify-between">
                    <span>CAPACITY FORMULA:</span>
                    <span className="text-valorant-ivory">
                      floor({lab.totalPcs} / {systemsPerMatch}) = {currentMatches} simultaneous matches
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timing and Attendance Rule Controls */}
        <div className="space-y-4 pt-2 border-t border-valorant-border">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
            <Sliders className="h-4 w-4 text-valorant-red" />
            Combat Flow & Attendance Timing Protocols
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">Match Duration:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="15"
                  max="90"
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(Number(e.target.value))}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-1.5 text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                />
                <span className="text-valorant-slate">min</span>
              </div>
            </div>

            <div>
              <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">Station Buffer:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={bufferDuration}
                  onChange={(e) => setBufferDuration(Number(e.target.value))}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-1.5 text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                />
                <span className="text-valorant-slate">min</span>
              </div>
            </div>

            <div>
              <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">Forfeit Grace Period:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-1.5 text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                />
                <span className="text-valorant-slate">min</span>
              </div>
            </div>

            <div>
              <label className="block text-valorant-slate font-bold mb-1 uppercase text-[10px]">Rigs Per Match:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="10"
                  max="10"
                  disabled
                  value={systemsPerMatch}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-1.5 text-valorant-slate font-mono font-bold cursor-not-allowed opacity-60"
                />
                <span className="text-valorant-slate">PCs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TacticalCard>
  );
}
