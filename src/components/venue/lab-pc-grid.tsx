"use client";

import React, { useState } from "react";
import { DomainLab, PCStatus, VenueCapacityMetrics } from "@/lib/scheduling/types";
import { StatusBadge } from "../ui/status-badge";
import { Monitor, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface LabPcGridProps {
  initialLabs: DomainLab[];
  initialMetrics: VenueCapacityMetrics;
  tournamentId: string;
}

export function LabPcGrid({ initialLabs, initialMetrics, tournamentId }: LabPcGridProps) {
  const [labs, setLabs] = useState<DomainLab[]>(initialLabs);
  const [metrics, setMetrics] = useState<VenueCapacityMetrics>(initialMetrics);
  const [loadingPc, setLoadingPc] = useState<string | null>(null);

  const togglePcStatus = async (labId: string, pcId: string, currentStatus: PCStatus) => {
    const nextStatus: PCStatus = currentStatus === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    setLoadingPc(pcId);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/venues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, pcId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setLabs((prevLabs) =>
          prevLabs.map((l) => {
            if (l.id !== labId) return l;
            const updatedStations = l.stations.map((st) => {
              const updatedPcs = st.pcs.map((p) =>
                p.id === pcId ? { ...p, status: nextStatus } : p
              );
              const workingCount = updatedPcs.filter((p) => p.status === "AVAILABLE").length;
              return {
                ...st,
                pcs: updatedPcs,
                workingPcCount: workingCount,
                isOperational: workingCount >= st.requiredPCs,
              };
            });
            const labWorking = updatedStations.flatMap((s) => s.pcs).filter((p) => p.status === "AVAILABLE").length;
            const opStations = updatedStations.filter((s) => s.isOperational).length;
            return {
              ...l,
              stations: updatedStations,
              workingPcCount: labWorking,
              operationalStationsCount: opStations,
            };
          })
        );
        setMetrics(data.data.metrics);
      }
    } catch (e) {
      console.error("Failed to toggle PC status:", e);
    } finally {
      setLoadingPc(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Capacity Metric Banners */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1f2731] border border-[#2b3844] rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Total Configured PCs</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.totalConfiguredPCs}</div>
          <div className="text-xs text-gray-500 mt-0.5">Across {metrics.totalLabs} Labs</div>
        </div>

        <div className="bg-[#1f2731] border border-[#2b3844] rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Operational PCs</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.totalWorkingPCs}</div>
          <div className="text-xs text-gray-500 mt-0.5">{metrics.totalOfflinePCs} offline / maintenance</div>
        </div>

        <div className="bg-[#1f2731] border border-[#2b3844] rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Active Stations</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {metrics.operationalStations} / {metrics.totalStations}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">10 working PCs required per station</div>
        </div>

        <div className="bg-[#1f2731] border border-[#ff4655]/40 rounded-lg p-4 bg-gradient-to-br from-[#1f2731] to-[#ff4655]/10">
          <div className="text-xs uppercase tracking-wider text-[#ff4655] font-semibold">Simultaneous Capacity</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.maxSimultaneousMatches} Matches</div>
          <div className="text-xs text-gray-400 mt-0.5">Dynamic hardware calculation</div>
        </div>
      </div>

      {/* Labs Layout Display */}
      {labs.map((lab) => (
        <div key={lab.id} className="bg-[#17202a] border border-[#2b3844] rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2b3844] pb-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Monitor className="h-5 w-5 text-[#ff4655]" />
                {lab.name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {lab.totalPcs} PCs installed • {lab.workingPcCount} functional • {lab.operationalStationsCount} of {lab.stations.length} stations operational
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#0f1923] text-gray-300 border border-[#2b3844]">
                {lab.operationalStationsCount} Match Slots
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {lab.stations.map((st) => (
              <div
                key={st.id}
                className={`rounded-lg border p-4 transition-colors ${
                  st.isOperational
                    ? "bg-[#1f2731]/70 border-emerald-500/40"
                    : "bg-rose-950/20 border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {st.isOperational ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    {st.name}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      st.isOperational
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {st.isOperational ? "Operational" : "Offline"}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mb-3 flex justify-between">
                  <span>Hardware Health:</span>
                  <span className="font-mono font-bold text-gray-200">
                    {st.workingPcCount} / {st.requiredPCs} PCs Working
                  </span>
                </div>

                {/* Individual PCs Clickable Grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {st.pcs.map((pc) => {
                    const isWorking = pc.status === "AVAILABLE";
                    const isUpdating = loadingPc === pc.id;

                    return (
                      <button
                        key={pc.id}
                        disabled={isUpdating}
                        onClick={() => togglePcStatus(lab.id, pc.id, pc.status)}
                        title={`Click to toggle PC status (Current: ${pc.status})`}
                        className={`h-9 rounded flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all border ${
                          isWorking
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-rose-400 hover:bg-rose-950/40 hover:text-rose-200"
                            : "bg-rose-950/60 border-rose-500/60 text-rose-300 hover:border-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-200"
                        }`}
                      >
                        {isUpdating ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <span>{pc.pcNumber.replace("PC-", "#")}</span>
                            <span className="text-[8px] uppercase tracking-tighter opacity-80">
                              {isWorking ? "OK" : "OFF"}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  💡 Click any PC button to toggle failure / repair
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
