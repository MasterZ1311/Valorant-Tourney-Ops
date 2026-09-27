"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ValidationReport } from "@/lib/tournament/validator";
import { CheckCircle2, XCircle, AlertTriangle, Lock, Unlock, ShieldCheck, RefreshCw, X } from "lucide-react";
import { soundFX } from "@/lib/sound/audio";

interface ValidationModalProps {
  tournamentId: string;
  currentStatus: string;
  onStatusChanged?: () => void;
}

export function ValidationModal({
  tournamentId,
  currentStatus,
  onStatusChanged,
}: ValidationModalProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchValidation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/validate`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch validation", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    soundFX.playClick();
    setIsOpen(true);
    fetchValidation();
  };

  const handleFinalize = async () => {
    if (!confirm("Are you sure you want to FINALIZE this tournament? Fixtures, bracket structure, and team rosters will be locked.")) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FINALIZE", reason: "Pre-flight validation passed" }),
      });
      const data = await res.json();
      if (data.success) {
        setIsOpen(false);
        if (onStatusChanged) onStatusChanged();
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error("Failed to finalize", e);
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      alert("Please provide an official audit reason for unlocking.");
      return;
    }
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNLOCK", reason: unlockReason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowUnlockPrompt(false);
        setIsOpen(false);
        if (onStatusChanged) onStatusChanged();
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to unlock", e);
    }
  };

  const isFinalized = currentStatus === "FINALIZED" || currentStatus === "LIVE";

  return (
    <>
      <div className="flex items-center gap-2">
        {isFinalized ? (
          <button
            onClick={() => {
              soundFX.playClick();
              setShowUnlockPrompt(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-bold uppercase tracking-wider transition-colors val-chamfer-btn"
          >
            <Lock className="h-3.5 w-3.5" />
            Locked (Unlock)
          </button>
        ) : (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory text-xs font-heading font-bold uppercase tracking-wider transition-colors shadow-md shadow-valorant-red/30 val-chamfer-btn"
          >
            <ShieldCheck className="h-4 w-4" />
            Validate & Finalize
          </button>
        )}
      </div>

      {/* Validation Checklist Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-valorant-surface border-2 border-valorant-red max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto val-chamfer shadow-2xl shadow-valorant-red/30 my-auto">
              <div className="flex items-center justify-between border-b border-valorant-border pb-4">
                <div>
                  <h3 className="text-xl font-display font-black text-valorant-ivory uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-valorant-red" />
                    Pre-Flight Tournament Validation
                  </h3>
                  <p className="text-xs font-mono text-valorant-slate mt-0.5">
                    10-point checklist ensuring tournament correctness before locking.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      fetchValidation();
                    }}
                    disabled={loading}
                    className="p-1.5 bg-valorant-dark text-valorant-slate hover:text-valorant-ivory border border-valorant-border transition-colors val-chamfer-btn"
                    title="Refresh diagnostics"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-valorant-red" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      soundFX.playClick();
                      setIsOpen(false);
                    }}
                    className="p-1.5 text-valorant-slate hover:text-valorant-ivory transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {loading || !report ? (
                <div className="py-12 text-center text-valorant-slate flex flex-col items-center gap-2 font-mono text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin text-valorant-red" />
                  <span>Running diagnostic checklist...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`p-4 border flex items-center justify-between val-chamfer ${
                      report.canFinalize
                        ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                        : "bg-rose-950/40 border-valorant-red/60 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {report.canFinalize ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-valorant-red shrink-0" />
                      )}
                      <div>
                        <div className="font-heading font-black text-sm uppercase tracking-wider text-valorant-ivory">
                          {report.canFinalize ? "Ready for Finalization" : "Finalization Blocked"}
                        </div>
                        <div className="text-xs font-mono opacity-80 mt-0.5">
                          {report.summary.passedChecks} passed • {report.summary.warnings} warnings • {report.summary.criticalErrors} critical failures
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List of Checks */}
                  <div className="space-y-2 font-mono">
                    {report.checks.map((chk, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-valorant-dark/80 border border-valorant-border text-xs"
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                        ) : chk.severity === "CRITICAL" ? (
                          <XCircle className="h-4 w-4 text-valorant-red flex-none mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-400 flex-none mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-heading font-bold text-valorant-ivory flex items-center justify-between uppercase">
                            <span>{chk.name}</span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 font-mono ${
                                chk.passed
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-rose-950 text-rose-300 border border-valorant-red"
                              }`}
                            >
                              {chk.category}
                            </span>
                          </div>
                          <div className="text-valorant-slate mt-0.5">{chk.message}</div>
                          {chk.details && (
                            <div className="text-[11px] text-valorant-slate/70 mt-0.5">{chk.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-valorant-border">
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        setIsOpen(false);
                      }}
                      className="px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory transition-colors"
                    >
                      Close
                    </button>
                    <button
                      disabled={!report.canFinalize}
                      onClick={handleFinalize}
                      className="px-5 py-2.5 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory text-xs font-heading font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-valorant-red/30 val-chamfer-btn"
                    >
                      Lock & Finalize Tournament
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unlock Prompt Modal */}
      {showUnlockPrompt && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-valorant-surface border-2 border-amber-500 max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-amber-500/20 my-auto">
              <div className="flex items-center justify-between border-b border-valorant-border pb-3">
                <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-amber-400" />
                  Administrative Unlock
                </h3>
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setShowUnlockPrompt(false);
                  }}
                  className="p-1 text-valorant-slate hover:text-valorant-ivory"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs font-mono text-valorant-slate">
                Unlocking will allow changes to brackets, fixtures, and venues. An immutable entry will be recorded in the audit log.
              </p>

              <div>
                <label className="block text-xs font-heading font-bold text-valorant-ivory uppercase tracking-wider mb-1">
                  Reason for Unlock (Mandatory)
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Team withdrawal requires bracket reseeding"
                  rows={3}
                  className="w-full bg-valorant-dark border border-valorant-border p-2.5 text-xs text-valorant-ivory placeholder-valorant-slate focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    setShowUnlockPrompt(false);
                  }}
                  className="px-4 py-2 text-xs font-heading font-bold text-valorant-slate hover:text-valorant-ivory uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlock}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-valorant-ivory text-xs font-heading font-bold uppercase tracking-wider val-chamfer-btn"
                >
                  Confirm Unlock
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
