"use client";

import React, { useState } from "react";
import { ValidationReport } from "@/lib/tournament/validator";
import { CheckCircle2, XCircle, AlertTriangle, Lock, Unlock, ShieldCheck, RefreshCw } from "lucide-react";

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
            onClick={() => setShowUnlockPrompt(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Locked (Unlock)
          </button>
        ) : (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-[#ff4655]/20"
          >
            <ShieldCheck className="h-4 w-4" />
            Validate & Finalize
          </button>
        )}
      </div>

      {/* Validation Checklist Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2b3844] pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#ff4655]" />
                  Pre-Flight Tournament Validation
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  10-point checklist ensuring tournament correctness before locking.
                </p>
              </div>
              <button
                onClick={fetchValidation}
                disabled={loading}
                className="p-2 rounded bg-[#0f1923] text-gray-400 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loading || !report ? (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-[#ff4655]" />
                <span>Running diagnostic checklist...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border flex items-center justify-between ${
                    report.canFinalize
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {report.canFinalize ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-400" />
                    )}
                    <div>
                      <div className="font-black text-sm uppercase tracking-wider">
                        {report.canFinalize ? "Ready for Finalization" : "Finalization Blocked"}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5">
                        {report.summary.passedChecks} passed • {report.summary.warnings} warnings • {report.summary.criticalErrors} critical failures
                      </div>
                    </div>
                  </div>
                </div>

                {/* List of Checks */}
                <div className="space-y-2">
                  {report.checks.map((chk, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded bg-[#0f1923] border border-[#2b3844] text-xs"
                    >
                      {chk.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                      ) : chk.severity === "CRITICAL" ? (
                        <XCircle className="h-4 w-4 text-rose-400 flex-none mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400 flex-none mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-white flex items-center justify-between">
                          <span>{chk.name}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                              chk.passed
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-rose-950 text-rose-300 border border-rose-800"
                            }`}
                          >
                            {chk.category}
                          </span>
                        </div>
                        <div className="text-gray-300 mt-0.5">{chk.message}</div>
                        {chk.details && (
                          <div className="text-[11px] text-gray-500 mt-0.5">{chk.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2b3844]">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    disabled={!report.canFinalize}
                    onClick={handleFinalize}
                    className="px-5 py-2.5 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#ff4655]/20"
                  >
                    Lock & Finalize Tournament
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlock Prompt Modal */}
      {showUnlockPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Unlock className="h-5 w-5 text-amber-400" />
              Administrative Unlock
            </h3>
            <p className="text-xs text-gray-400">
              Unlocking will allow changes to brackets, fixtures, and venues. An immutable entry will be recorded in the audit log.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Reason for Unlock (Mandatory)
              </label>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g. Team withdrawal requires bracket reseeding"
                rows={3}
                className="w-full bg-[#0f1923] border border-[#2b3844] rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUnlockPrompt(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider"
              >
                Confirm Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
