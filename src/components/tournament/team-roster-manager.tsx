"use client";

import React, { useState } from "react";
import { StoredTeam } from "@/lib/store/tournament-store";
import { StatusBadge } from "../ui/status-badge";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  PlayCircle,
  Edit2,
} from "lucide-react";

interface TeamRosterManagerProps {
  initialTeams: StoredTeam[];
  tournamentId: string;
}

export function TeamRosterManager({ initialTeams, tournamentId }: TeamRosterManagerProps) {
  const [teams, setTeams] = useState<StoredTeam[]>(initialTeams);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<StoredTeam | null>(initialTeams[0] || null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newCaptain, setNewCaptain] = useState("");
  const [newContact, setNewContact] = useState("");

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

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          captain: newCaptain.trim() || "Captain",
          captainContact: newContact.trim() || "+1-555-0199",
          institution: "Campus Esports Club",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeams((prev) => [...prev, data.data]);
        setSelectedTeam(data.data);
        setIsAddTeamModalOpen(false);
        setNewTeamName("");
        setNewCaptain("");
        setNewContact("");
      }
    } catch (e) {
      console.error("Failed to add team", e);
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
  const playedCount = teams.filter((t) => t.hasPlayed).length;
  const awaitingMatchCount = totalRegistered - playedCount;

  return (
    <div className="space-y-6">
      {/* Attendance & Match Status Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-gray-400">Total Registered</div>
          <div className="text-xl font-black text-white mt-0.5">{totalRegistered} Teams</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Tournament Roster</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-emerald-400">Checked In</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{checkedInCount} Teams</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Attendance Verified</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-blue-400">Match Ready</div>
          <div className="text-xl font-black text-blue-400 mt-0.5">{readyCount} Teams</div>
          <div className="text-[10px] text-blue-500/80 mt-0.5">5 Starters Present</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-amber-400">Awaiting 1st Match</div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{awaitingMatchCount} Teams</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Yet to play in Stage 1</div>
        </div>

        <div className="bg-[#17202a] border border-[#2b3844] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-purple-400">Matches Played</div>
          <div className="text-xl font-black text-purple-400 mt-0.5">{playedCount} Teams</div>
          <div className="text-[10px] text-purple-500/80 mt-0.5">Completed Match 1</div>
        </div>
      </div>

      {/* Main 2-Pane Team Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Teams */}
        <div className="lg:col-span-5 bg-[#17202a] border border-[#2b3844] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#ff4655]" />
              Official Teams ({teams.length})
            </h3>
            <button
              onClick={() => setIsAddTeamModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-[11px] font-bold uppercase transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Team
            </button>
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
            {teams.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-3">
                <Users className="h-8 w-8 text-gray-500 mx-auto" />
                <div className="text-xs text-gray-400">No teams registered yet.</div>
                <button
                  onClick={() => setIsAddTeamModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" /> Add First Team
                </button>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No teams match &quot;{search}&quot;.
              </div>
            ) : (
              filteredTeams.map((team) => {
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
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        {team.hasPlayed ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5" /> Match 1 Completed
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> Awaiting 1st Match
                          </span>
                        )}
                      </div>
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
            }))}
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
                    Seed #{selectedTeam.seed} • Captain: {selectedTeam.captain} ({selectedTeam.captainContact})
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {selectedTeam.hasPlayed ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Has Played Stage 1 Match
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Yet to Play First Match
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCheckIn(selectedTeam.id)}
                    disabled={togglingId === selectedTeam.id}
                    className={`px-4 py-2 rounded text-xs font-black uppercase tracking-wider transition-colors ${
                      selectedTeam.status === "CHECKED_IN"
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {selectedTeam.status === "CHECKED_IN" ? "Revoke Attendance" : "Mark Present"}
                  </button>
                </div>
              </div>

              {/* Starting Players Roster (5 Players) */}
              <div>
                <h4 className="text-xs uppercase font-black tracking-wider text-gray-300 mb-3 flex items-center justify-between">
                  <span>Official Starting Lineup (5 Players)</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {selectedTeam.players.length} / 5 Starting Systems
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
                          Roster Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400 space-y-2">
              <Users className="h-10 w-10 text-gray-600 mx-auto" />
              <div className="text-sm font-bold text-gray-300">
                {teams.length === 0 ? "Ready for Registration" : "No Team Selected"}
              </div>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {teams.length === 0
                  ? "Register teams to manage 5v5 rosters, Riot IDs, and check-in status."
                  : "Select a team from the list to view and manage player roster."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      {isAddTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#ff4655]" />
              Register New Team
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Team Name:</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Kawai Strike"
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Captain Name:</label>
                <input
                  type="text"
                  value={newCaptain}
                  onChange={(e) => setNewCaptain(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Captain Phone:</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="+1-555-0199"
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3844]">
              <button
                onClick={() => setIsAddTeamModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                className="px-4 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-xs font-bold text-white disabled:opacity-50"
              >
                Register Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
