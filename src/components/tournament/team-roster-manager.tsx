"use client";

import React, { useState } from "react";
import { StoredTeam } from "@/lib/store/tournament-store";
import { StatusBadge } from "../ui/status-badge";
import { Users, Search, CheckCircle2, XCircle, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";

interface TeamRosterManagerProps {
  initialTeams: StoredTeam[];
  tournamentId: string;
}

export function TeamRosterManager({ initialTeams, tournamentId }: TeamRosterManagerProps) {
  const [teams, setTeams] = useState<StoredTeam[]>(initialTeams);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<StoredTeam | null>(initialTeams[0] || null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleCheckIn = async (teamId: string) => {
    setTogglingId(teamId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.success) {
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? data.data : t))
        );
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(data.data);
        }
      }
    } catch (e) {
      console.error("Failed to toggle check in", e);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.institution.toLowerCase().includes(search.toLowerCase()) ||
      t.players.some((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.riotId.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRegistered = teams.length;
  const checkedInCount = teams.filter((t) => t.status === "CHECKED_IN").length;
  const readyCount = teams.filter((t) => t.status === "CHECKED_IN" && t.players.length >= 5).length;
  const incompleteCount = teams.filter((t) => t.players.length < 5).length;
  const absentCount = totalRegistered - checkedInCount;

  return (
    <div className="space-y-6">
      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-gray-400">Total Registered</div>
          <div className="text-xl font-black text-white mt-0.5">{totalRegistered} Teams</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-emerald-400">Checked In</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{checkedInCount} Teams</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-blue-400">Match Ready</div>
          <div className="text-xl font-black text-blue-400 mt-0.5">{readyCount} Teams</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-amber-400">Incomplete</div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{incompleteCount} Teams</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-rose-400">Absent / Pending</div>
          <div className="text-xl font-black text-rose-400 mt-0.5">{absentCount} Teams</div>
        </div>
      </div>

      {/* Main 2-Pane Team Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Teams */}
        <div className="lg:col-span-5 bg-[#17202a] border border-[#2b3844] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#ff4655]" />
              Team Roster ({teams.length})
            </h3>
            <span className="text-[11px] font-mono text-gray-400">5v5 VALORANT</span>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, player, Riot ID..."
              className="w-full bg-[#0f1923] border border-[#2b3844] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4655]"
            />
          </div>

          <div className="divide-y divide-[#2b3844]/60 max-h-[550px] overflow-y-auto pr-1">
            {filteredTeams.map((team) => {
              const isSelected = selectedTeam?.id === team.id;
              const isCheckedIn = team.status === "CHECKED_IN";

              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-[#1f2731] border border-[#ff4655]/50"
                      : "hover:bg-[#1f2731]/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-gray-500">
                      #{team.seed}
                    </span>
                    <div>
                      <div className="font-bold text-white text-xs">{team.name}</div>
                      <div className="text-[10px] text-gray-400">{team.institution}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={team.status} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheckIn(team.id);
                      }}
                      disabled={togglingId === team.id}
                      className={`p-1.5 rounded transition-colors text-xs font-bold ${
                        isCheckedIn
                          ? "bg-emerald-950/60 text-emerald-400 hover:bg-rose-950/60 hover:text-rose-400"
                          : "bg-rose-950/60 text-rose-400 hover:bg-emerald-950/60 hover:text-emerald-400"
                      }`}
                      title={isCheckedIn ? "Click to revoke check-in" : "Click to check in"}
                    >
                      {isCheckedIn ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 bg-[#17202a] border border-[#2b3844] rounded-lg p-5">
          {selectedTeam ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2b3844] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedTeam.name}</h3>
                    <StatusBadge status={selectedTeam.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Seed #{selectedTeam.seed} • {selectedTeam.institution} • Captain: {selectedTeam.captain} ({selectedTeam.captainContact})
                  </p>
                </div>

                <button
                  onClick={() => toggleCheckIn(selectedTeam.id)}
                  disabled={togglingId === selectedTeam.id}
                  className={`px-4 py-2 rounded text-xs font-black uppercase tracking-wider transition-colors ${
                    selectedTeam.status === "CHECKED_IN"
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {selectedTeam.status === "CHECKED_IN" ? "Revoke Check-In" : "Check In Team"}
                </button>
              </div>

              {/* Starting Players Roster */}
              <div>
                <h4 className="text-xs uppercase font-black tracking-wider text-gray-300 mb-3 flex items-center justify-between">
                  <span>Starting Lineup (5 Players)</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {selectedTeam.players.length} / 5 Registered
                  </span>
                </h4>

                <div className="space-y-2">
                  {selectedTeam.players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0f1923] border border-[#2b3844] text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded bg-[#1f2731] text-gray-300 font-mono font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {player.name}
                            {player.role === "CAPTAIN" && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                            Riot ID: <span className="text-gray-200">{player.riotId}#{player.riotTag}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              Select a team from the list to view and manage roster.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
