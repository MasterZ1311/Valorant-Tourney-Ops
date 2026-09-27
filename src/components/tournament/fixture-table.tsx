"use client";

import React, { useState } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { StatusBadge } from "../ui/status-badge";
import { ValorantButton } from "../ui/valorant-button";
import { TacticalCard } from "../ui/tactical-card";
import { soundFX } from "@/lib/sound/audio";
import { Calendar, Monitor, RefreshCw, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface FixtureTableProps {
  initialFixtures: ScheduledFixture[];
  tournamentId: string;
}

export function FixtureTable({ initialFixtures, tournamentId }: FixtureTableProps) {
  const [fixtures, setFixtures] = useState<ScheduledFixture[]>(initialFixtures);
  const [filterRound, setFilterRound] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerateFixtures = async () => {
    if (!confirm("Regenerate fixtures? This recalculates all time slots and station allocations.")) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fixtures`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playClick();
        setFixtures(data.data);
      }
    } catch (e) {
      console.error("Failed to regenerate fixtures", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const filteredFixtures = fixtures.filter((f) => {
    if (filterRound !== "ALL" && f.roundNumber.toString() !== filterRound) return false;
    if (filterStatus !== "ALL" && f.status !== filterStatus) return false;
    return true;
  });

  const rounds = Array.from(new Set(fixtures.map((f) => f.roundNumber))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Controls & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
              Round Filter
            </label>
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
              className="bg-valorant-dark border border-valorant-border px-3 py-1.5 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
            >
              <option value="ALL">All Combat Rounds</option>
              {rounds.map((r) => (
                <option key={r} value={r.toString()}>
                  Round {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-valorant-dark border border-valorant-border px-3 py-1.5 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
        </div>

        <ValorantButton
          onClick={handleRegenerateFixtures}
          disabled={isRegenerating}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
          Recalculate Hardware Schedule
        </ValorantButton>
      </div>

      {/* Table */}
      <TacticalCard telemetry="CHRONOLOGICAL FIXTURE REGISTRY">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-valorant-dark border-b border-valorant-border text-[10px] uppercase font-bold tracking-wider text-valorant-slate">
              <tr>
                <th className="py-3 px-4">MATCH</th>
                <th className="py-3 px-4">ROUND</th>
                <th className="py-3 px-4">COMBAT SQUADS</th>
                <th className="py-3 px-4">STATION & SECTOR</th>
                <th className="py-3 px-4">SCHEDULED WINDOW</th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-valorant-border/60">
              {filteredFixtures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-valorant-slate text-xs">
                    NO FIXTURES MATCH SPECIFIED RADAR FILTERS.
                  </td>
                </tr>
              ) : (
                filteredFixtures.map((f) => (
                  <tr key={f.matchId} className="hover:bg-valorant-elevated/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-valorant-ivory flex items-center gap-1.5">
                      <span className="text-valorant-red">◈</span>
                      {f.matchCode}
                    </td>
                    <td className="py-3 px-4 text-valorant-slate font-medium">{f.roundName}</td>
                    <td className="py-3 px-4">
                      {f.isBye ? (
                        <span className="text-valorant-slate font-medium">
                          {f.teamAName} (Automatic BYE Advance)
                        </span>
                      ) : (
                        <div className="font-heading font-bold text-valorant-ivory uppercase flex items-center gap-2">
                          <span className="text-valorant-mint">{f.teamAName}</span>
                          <span className="text-valorant-slate font-mono text-[10px]">vs</span>
                          <span className="text-valorant-cyan">{f.teamBName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {f.isBye ? (
                        <span className="text-valorant-slate">—</span>
                      ) : f.stationName ? (
                        <div className="flex items-center gap-1.5 text-valorant-ivory">
                          <Monitor className="h-3.5 w-3.5 text-valorant-red" />
                          <span className="font-semibold text-valorant-ivory">{f.stationName}</span>
                          <span className="text-valorant-slate">({f.labName})</span>
                        </div>
                      ) : (
                        <span className="text-valorant-red font-bold">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-valorant-slate">
                      {f.isBye ? (
                        <span className="text-valorant-slate">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-valorant-slate" />
                          <span className="text-valorant-ivory">{formatTime(f.startTime)}</span>
                          <span>–</span>
                          <span>{formatTime(f.estimatedEndTime)}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TacticalCard>
    </div>
  );
}
