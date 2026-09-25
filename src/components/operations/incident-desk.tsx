"use client";

import React, { useState } from "react";
import { StoredIncident } from "@/lib/store/tournament-store";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, PlusCircle } from "lucide-react";

interface IncidentDeskProps {
  initialIncidents: StoredIncident[];
  tournamentId: string;
}

export function IncidentDesk({ initialIncidents, tournamentId }: IncidentDeskProps) {
  const [incidents, setIncidents] = useState<StoredIncident[]>(initialIncidents);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState("TECHNICAL");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [matchCode, setMatchCode] = useState("M02");
  const [description, setDescription] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<StoredIncident | null>(null);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          severity,
          matchCode,
          reportedBy: "Station Marshal",
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents([data.data, ...incidents]);
        setShowCreateModal(false);
        setDescription("");
      }
    } catch (err) {
      console.error("Failed to report incident", err);
    }
  };

  const handleResolve = async (incidentId: string) => {
    if (!resolutionText.trim()) {
      alert("Please enter a resolution note.");
      return;
    }
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/incidents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          resolutionNotes: resolutionText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === incidentId
              ? { ...i, status: "RESOLVED", resolutionNotes: resolutionText, resolvedAt: new Date().toISOString() }
              : i
          )
        );
        setSelectedIncident(null);
        setResolutionText("");
      }
    } catch (err) {
      console.error("Failed to resolve incident", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-lg p-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-[#ff4655]" />
            Incident & Technical Pause Desk
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time tracking of hardware, network, conduct, and match issues.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Report New Incident
        </button>
      </div>

      {/* Incident List */}
      <div className="bg-[#17202a] border border-[#2b3844] rounded-lg overflow-hidden">
        {incidents.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-bold text-white">All Clear</div>
            <div className="text-xs text-gray-500 mt-0.5">No open technical or conduct incidents recorded.</div>
          </div>
        ) : (
          <div className="divide-y divide-[#2b3844]/60">
            {incidents.map((inc) => {
              const isResolved = inc.status === "RESOLVED";

              return (
                <div key={inc.id} className="p-4 hover:bg-[#1f2731]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          inc.severity === "CRITICAL"
                            ? "bg-rose-950/60 text-rose-300 border-rose-600"
                            : inc.severity === "HIGH"
                            ? "bg-amber-950/60 text-amber-300 border-amber-600"
                            : "bg-blue-950/60 text-blue-300 border-blue-600"
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-400">
                        [{inc.category}] Match {inc.matchCode || "General"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{inc.description}</div>
                    {inc.resolutionNotes && (
                      <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolution: {inc.resolutionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30">
                        Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider"
                      >
                        Resolve Issue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleReport}
            className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-black text-white">Log Tournament Incident</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-xs text-white"
                >
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="PC">PC HARDWARE</option>
                  <option value="NETWORK">NETWORK</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="CONDUCT">CONDUCT</option>
                  <option value="CHEATING">CHEATING</option>
                  <option value="LOBBY">LOBBY</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-xs text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Match Code
              </label>
              <input
                type="text"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value)}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-xs text-white"
                placeholder="e.g. M01"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Description & Symptoms
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-xs text-white"
                placeholder="Describe issue (e.g. Player PC disconnected during round 7)"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-white">Resolve Incident: {selectedIncident.id}</h3>
            <p className="text-xs text-gray-300 bg-[#0f1923] p-3 rounded border border-[#2b3844]">
              {selectedIncident.description}
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Resolution Notes (Action Taken)
              </label>
              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                rows={3}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded p-2.5 text-xs text-white"
                placeholder="e.g. Hot-swapped mouse, verified Riot client, resumed game."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedIncident.id)}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
