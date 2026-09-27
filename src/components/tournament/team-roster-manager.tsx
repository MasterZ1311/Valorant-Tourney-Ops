"use client";

import React, { useState } from "react";
import Image from "next/image";
import { StoredTeam } from "@/lib/store/tournament-store";
import { StatusBadge } from "../ui/status-badge";
import { ValorantButton } from "../ui/valorant-button";
import { TacticalCard } from "../ui/tactical-card";
import { soundFX } from "@/lib/sound/audio";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  Clock,
  CheckCircle,
  Plus,
  X,
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
    soundFX.playClick();
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
        soundFX.playClick();
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
        <div className="bg-valorant-surface border border-valorant-border p-3 val-chamfer-btn">
          <div className="text-[10px] font-mono uppercase font-bold text-valorant-slate">TOTAL SQUADS</div>
          <div className="text-2xl font-display uppercase tracking-wider text-valorant-ivory mt-0.5">{totalRegistered} TEAMS</div>
          <div className="text-[10px] font-mono text-valorant-slate mt-0.5">ROSTER ARCHIVE</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-3 val-chamfer-btn">
          <div className="text-[10px] font-mono uppercase font-bold text-valorant-mint">CHECKED IN</div>
          <div className="text-2xl font-display uppercase tracking-wider text-valorant-mint mt-0.5">{checkedInCount} TEAMS</div>
          <div className="text-[10px] font-mono text-valorant-mint/80 mt-0.5">LAN VERIFIED</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-3 val-chamfer-btn">
          <div className="text-[10px] font-mono uppercase font-bold text-valorant-cyan">MATCH READY</div>
          <div className="text-2xl font-display uppercase tracking-wider text-valorant-cyan mt-0.5">{readyCount} TEAMS</div>
          <div className="text-[10px] font-mono text-valorant-cyan/80 mt-0.5">5 STARTERS PRESENT</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-3 val-chamfer-btn">
          <div className="text-[10px] font-mono uppercase font-bold text-valorant-gold">ON DECK</div>
          <div className="text-2xl font-display uppercase tracking-wider text-valorant-gold mt-0.5">{awaitingMatchCount} TEAMS</div>
          <div className="text-[10px] font-mono text-valorant-gold/80 mt-0.5">AWAITING 1ST FIXTURE</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-3 val-chamfer-btn">
          <div className="text-[10px] font-mono uppercase font-bold text-purple-400">PLAYED MATCH 1</div>
          <div className="text-2xl font-display uppercase tracking-wider text-purple-400 mt-0.5">{playedCount} TEAMS</div>
          <div className="text-[10px] font-mono text-purple-400/80 mt-0.5">STAGE 1 CONCLUDED</div>
        </div>
      </div>

      {/* Main 2-Pane Team Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Teams */}
        <div className="lg:col-span-5 bg-valorant-surface border border-valorant-border p-4 space-y-3 val-chamfer">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display text-valorant-ivory uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-valorant-red" />
              Official Squads ({teams.length})
            </h3>
            <ValorantButton
              onClick={() => {
                soundFX.playClick();
                setIsAddTeamModalOpen(true);
              }}
              variant="primary"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Squad
            </ValorantButton>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-valorant-slate" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, player, Riot ID..."
              className="w-full bg-valorant-dark border border-valorant-border pl-8 pr-3 py-1.5 text-xs text-valorant-ivory font-mono placeholder-valorant-slate focus:outline-none focus:border-valorant-red"
            />
          </div>

          <div className="divide-y divide-valorant-border/60 max-h-[550px] overflow-y-auto pr-1 font-mono">
            {teams.length === 0 ? (
              <div className="py-12 text-center text-valorant-slate space-y-3">
                <Users className="h-8 w-8 text-valorant-slate mx-auto opacity-60" />
                <div className="text-xs text-valorant-slate">No squads registered in this bracket.</div>
                <ValorantButton
                  onClick={() => setIsAddTeamModalOpen(true)}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add First Squad
                </ValorantButton>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="py-8 text-center text-valorant-slate text-xs">
                No teams match &quot;{search}&quot;.
              </div>
            ) : (
              filteredTeams.map((team) => {
                const isSelected = selectedTeam?.id === team.id;
                const isCheckedIn = team.status === "CHECKED_IN";

                return (
                  <div
                    key={team.id}
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedTeam(team);
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between val-chamfer-btn my-1 ${
                      isSelected
                        ? "bg-valorant-elevated border-l-4 border-l-valorant-red border-y border-r border-valorant-border"
                        : "hover:bg-valorant-elevated/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-valorant-slate">
                        #{team.seed}
                      </span>
                      <div>
                        <div className="font-heading font-bold text-valorant-ivory text-xs uppercase">{team.name}</div>
                        <div className="text-[10px] text-valorant-slate flex items-center gap-1.5 mt-0.5">
                          {team.hasPlayed ? (
                            <span className="text-valorant-mint font-bold flex items-center gap-0.5">
                              <CheckCircle className="h-2.5 w-2.5" /> Stage 1 Completed
                            </span>
                          ) : (
                            <span className="text-valorant-gold font-bold flex items-center gap-0.5">
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
                        className={`p-1.5 transition-colors text-xs font-bold border ${
                          isCheckedIn
                            ? "bg-valorant-mint/10 text-valorant-mint border-valorant-mint/30 hover:bg-valorant-red/20 hover:text-valorant-red hover:border-valorant-red"
                            : "bg-valorant-red/10 text-valorant-red border-valorant-red/30 hover:bg-valorant-mint/20 hover:text-valorant-mint hover:border-valorant-mint"
                        }`}
                        title={isCheckedIn ? "Click to revoke check-in" : "Click to mark checked in"}
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
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 bg-valorant-surface border border-valorant-border p-5 val-chamfer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-5">
            <Image
              src="/images/initiator.svg"
              alt="Initiator"
              width={128}
              height={128}
            />
          </div>

          {selectedTeam ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
                      {selectedTeam.name}
                    </h3>
                    <StatusBadge status={selectedTeam.status} />
                  </div>
                  <p className="text-xs font-mono text-valorant-slate mt-1">
                    Seed #{selectedTeam.seed} • Captain: <strong className="text-valorant-ivory">{selectedTeam.captain}</strong> ({selectedTeam.captainContact})
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {selectedTeam.hasPlayed ? (
                      <span className="text-[10px] font-mono font-bold text-valorant-mint bg-valorant-mint/10 px-2 py-0.5 border border-valorant-mint/30 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> STAGE 1 FIXTURE COMPLETE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-valorant-gold bg-valorant-gold/10 px-2 py-0.5 border border-valorant-gold/30 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> PENDING FIRST ARENA COMBAT
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ValorantButton
                    onClick={() => toggleCheckIn(selectedTeam.id)}
                    disabled={togglingId === selectedTeam.id}
                    variant={selectedTeam.status === "CHECKED_IN" ? "danger" : "mint"}
                    size="sm"
                  >
                    {selectedTeam.status === "CHECKED_IN" ? "Revoke Attendance" : "Mark Present"}
                  </ValorantButton>
                </div>
              </div>

              {/* Starting Players Roster (5 Players) */}
              <div>
                <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-valorant-slate mb-3 flex items-center justify-between">
                  <span>OFFICIAL STARTING LINEUP (5 ATHLETES)</span>
                  <span className="text-[10px] text-valorant-slate font-normal">
                    {selectedTeam.players.length} / 5 SYSTEMS ASSIGNED
                  </span>
                </h4>

                <div className="space-y-2">
                  {selectedTeam.players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-valorant-dark border border-valorant-border text-xs val-chamfer-btn"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 bg-valorant-surface text-valorant-ivory font-mono font-bold flex items-center justify-center text-[10px] border border-valorant-border">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-heading uppercase font-bold text-valorant-ivory flex items-center gap-2">
                            {player.name}
                            {player.role === "CAPTAIN" && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-valorant-gold/10 text-valorant-gold border border-valorant-gold/40">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-valorant-slate mt-0.5">
                            Riot ID: <span className="text-valorant-ivory font-bold">{player.riotId}#{player.riotTag}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase font-bold text-valorant-mint flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          VERIFIED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-valorant-slate space-y-2">
              <Users className="h-10 w-10 text-valorant-slate mx-auto opacity-50" />
              <div className="text-base font-display uppercase tracking-wider text-valorant-ivory">
                {teams.length === 0 ? "Ready for Registration" : "No Squad Selected"}
              </div>
              <p className="text-xs font-mono text-valorant-slate max-w-xs mx-auto">
                {teams.length === 0
                  ? "Register squads to manage 5v5 rosters, Riot IDs, and check-in status."
                  : "Select a squad from the list to view and manage player roster."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      {isAddTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                <Plus className="h-5 w-5 text-valorant-red" />
                Register New Squad
              </h3>
              <button
                onClick={() => setIsAddTeamModalOpen(false)}
                className="text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-valorant-slate font-bold mb-1 uppercase">Squad Name:</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Sentinels Prime"
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-valorant-slate font-bold mb-1 uppercase">Captain In-Game / Real Name:</label>
                <input
                  type="text"
                  value={newCaptain}
                  onChange={(e) => setNewCaptain(e.target.value)}
                  placeholder="e.g. ShahZaM"
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-valorant-slate font-bold mb-1 uppercase">Captain Contact / Discord:</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="+1-555-0199 or discord#1234"
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory focus:border-valorant-red focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-valorant-border">
              <button
                onClick={() => setIsAddTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory"
              >
                Cancel
              </button>
              <ValorantButton
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                variant="primary"
                size="sm"
              >
                Register Squad
              </ValorantButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
