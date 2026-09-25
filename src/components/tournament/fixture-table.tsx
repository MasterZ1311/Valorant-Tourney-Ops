"use client";

import React, { useState } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { StatusBadge } from "../ui/status-badge";
import { Calendar, Monitor, RefreshCw, CheckCircle, Clock } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Round Filter
            </label>
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
              className="bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Rounds</option>
              {rounds.map((r) => (
                <option key={r} value={r.toString()}>
                  Round {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleRegenerateFixtures}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          Recalculate Hardware Schedule
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#17202a] border border-[#2b3844] rounded-lg overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0f1923] border-b border-[#2b3844] text-[10px] uppercase font-bold tracking-wider text-gray-400">
            <tr>
              <th className="py-3 px-4">Match</th>
              <th className="py-3 px-4">Round</th>
              <th className="py-3 px-4">Teams</th>
              <th className="py-3 px-4">Station & Lab</th>
              <th className="py-3 px-4">Scheduled Window</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b3844]/60">
            {filteredFixtures.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No fixtures match the selected filters.
                </td>
              </tr>
            ) : (
              filteredFixtures.map((f) => (
                <tr key={f.matchId} className="hover:bg-[#1f2731]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {f.matchCode}
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-medium">{f.roundName}</td>
                  <td className="py-3 px-4">
                    {f.isBye ? (
                      <span className="text-gray-400 font-medium">
                        {f.teamAName} (Automatic BYE Advance)
                      </span>
                    ) : (
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="text-emerald-400">{f.teamAName}</span>
                        <span className="text-gray-500 text-[10px]">vs</span>
                        <span className="text-blue-400">{f.teamBName}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {f.isBye ? (
                      <span className="text-gray-500">—</span>
                    ) : f.stationName ? (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Monitor className="h-3.5 w-3.5 text-[#ff4655]" />
                        <span className="font-semibold text-white">{f.stationName}</span>
                        <span className="text-gray-500">({f.labName})</span>
                      </div>
                    ) : (
                      <span className="text-rose-400 font-bold">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-300">
                    {f.isBye ? (
                      <span className="text-gray-500">—</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span>{formatTime(f.startTime)}</span>
                        <span className="text-gray-500">–</span>
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
    </div>
  );
}
