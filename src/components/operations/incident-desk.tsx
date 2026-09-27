"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { StoredIncident } from "@/lib/store/tournament-store";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, PlusCircle, X } from "lucide-react";
import { ValorantButton } from "../ui/valorant-button";
import { TacticalCard } from "../ui/tactical-card";
import { soundFX } from "@/lib/sound/audio";

interface IncidentDeskProps {
  initialIncidents: StoredIncident[];
  tournamentId: string;
}

export function IncidentDesk({ initialIncidents, tournamentId }: IncidentDeskProps) {
  const [incidents, setIncidents] = useState<StoredIncident[]>(initialIncidents);
  const [mounted, setMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState("TECHNICAL");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [matchCode, setMatchCode] = useState("M02");
  const [description, setDescription] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<StoredIncident | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        if (severity === "HIGH" || severity === "CRITICAL") {
          soundFX.playTechPause();
        } else {
          soundFX.playClick();
        }
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
        soundFX.playClick();
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
      {/* Control Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-valorant-red" />
            <h2 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
              Incident & Technical Pause Desk
            </h2>
          </div>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Real-time tracking of hardware, network, conduct, and match issues • LAN Marshal dispatch log.
          </p>
        </div>

        <ValorantButton
          onClick={() => {
            soundFX.playClick();
            setShowCreateModal(true);
          }}
          variant="primary"
          size="sm"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Report Incident / Tech Pause
        </ValorantButton>
      </div>

      {/* Incident List */}
      <TacticalCard telemetry="ACTIVE INCIDENT STREAM">
        {incidents.length === 0 ? (
          <div className="py-12 text-center text-valorant-slate">
            <CheckCircle2 className="h-10 w-10 text-valorant-mint mx-auto mb-2 opacity-80" />
            <div className="text-lg font-display uppercase tracking-wider text-valorant-ivory">
              Sector All Clear
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-1">
              Zero active technical pauses or hardware anomalies reported.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-valorant-border font-mono">
            {incidents.map((inc) => {
              const isResolved = inc.status === "RESOLVED";

              return (
                <div key={inc.id} className="p-4 hover:bg-valorant-elevated/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border ${
                          inc.severity === "CRITICAL"
                            ? "bg-valorant-red/20 text-valorant-red border-valorant-red"
                            : inc.severity === "HIGH"
                            ? "bg-amber-950/60 text-amber-400 border-amber-500"
                            : "bg-blue-950/60 text-blue-300 border-blue-600"
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-valorant-slate">
                        [{inc.category}] Match {inc.matchCode || "General"}
                      </span>
                      <span className="text-[10px] text-valorant-slate">
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-sm font-heading font-bold text-valorant-ivory uppercase tracking-wide">
                      {inc.description}
                    </div>
                    {inc.resolutionNotes && (
                      <div className="text-xs text-valorant-mint mt-1 flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolution: {inc.resolutionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <span className="text-[11px] font-mono font-bold text-valorant-mint uppercase tracking-wider px-3 py-1 bg-valorant-mint/10 border border-valorant-mint/40">
                        RESOLVED
                      </span>
                    ) : (
                      <ValorantButton
                        onClick={() => {
                          soundFX.playClick();
                          setSelectedIncident(inc);
                        }}
                        variant="mint"
                        size="sm"
                      >
                        Resolve Issue
                      </ValorantButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TacticalCard>

      {/* Report Modal */}
      {showCreateModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <form
              onSubmit={handleReport}
              className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30 my-auto"
            >
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
                Log Tournament Incident
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
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
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                Match Code
              </label>
              <input
                type="text"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value)}
                className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
                placeholder="e.g. M01"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                Description & Symptoms
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
                placeholder="Describe issue (e.g. Rig #04 disconnected during round 7)"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory"
              >
                Cancel
              </button>
              <ValorantButton
                type="submit"
                variant="primary"
                size="sm"
              >
                Submit Ticket
              </ValorantButton>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}

      {/* Resolution Modal */}
      {selectedIncident && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30 my-auto">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">
                Resolve Incident: {selectedIncident.id}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-valorant-slate bg-valorant-dark p-3 border border-valorant-border">
              {selectedIncident.description}
            </p>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate mb-1">
                Resolution Notes (Action Taken)
              </label>
              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                rows={3}
                className="w-full bg-valorant-dark border border-valorant-border p-2.5 text-xs text-valorant-ivory font-mono focus:border-valorant-red focus:outline-none"
                placeholder="e.g. Hot-swapped peripheral, verified Riot client, resumed game."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory"
              >
                Cancel
              </button>
              <ValorantButton
                onClick={() => handleResolve(selectedIncident.id)}
                variant="mint"
                size="sm"
              >
                Confirm Resolution
              </ValorantButton>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
