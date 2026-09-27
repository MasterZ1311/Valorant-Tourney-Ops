"use client";

import React, { useState } from "react";
import Image from "next/image";
import { DomainLab, PCStatus, VenueCapacityMetrics } from "@/lib/scheduling/types";
import { StatusBadge } from "../ui/status-badge";
import { Monitor, AlertTriangle, CheckCircle2, RefreshCw, Cpu, HardDrive } from "lucide-react";
import { soundFX } from "@/lib/sound/audio";

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
    soundFX.playClick();
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
        <div className="bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
          <div className="text-[10px] uppercase font-mono tracking-wider text-valorant-slate font-semibold flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-valorant-slate" /> TOTAL RIGS
          </div>
          <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">
            {metrics.totalConfiguredPCs}
          </div>
          <div className="text-xs font-mono text-valorant-slate mt-0.5">ACROSS {metrics.totalLabs} PHYSICAL LABS</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
          <div className="text-[10px] uppercase font-mono tracking-wider text-valorant-slate font-semibold flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-valorant-mint" /> OPERATIONAL RIGS
          </div>
          <div className="text-3xl font-display uppercase tracking-wider text-valorant-mint mt-1">
            {metrics.totalWorkingPCs}
          </div>
          <div className="text-xs font-mono text-valorant-slate mt-0.5">{metrics.totalOfflinePCs} OFFLINE / MAINT</div>
        </div>

        <div className="bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
          <div className="text-[10px] uppercase font-mono tracking-wider text-valorant-slate font-semibold flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-valorant-cyan" /> ACTIVE STATIONS
          </div>
          <div className="text-3xl font-display uppercase tracking-wider text-valorant-cyan mt-1">
            {metrics.operationalStations} / {metrics.totalStations}
          </div>
          <div className="text-xs font-mono text-valorant-slate mt-0.5">10 WORKING RIGS / MATCH</div>
        </div>

        <div className="bg-valorant-surface border-2 border-valorant-red p-4 val-chamfer-btn relative overflow-hidden">
          <div className="text-[10px] uppercase font-mono tracking-wider text-valorant-red font-semibold">
            SIMULTANEOUS CAPACITY
          </div>
          <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">
            {metrics.maxSimultaneousMatches} MATCHES
          </div>
          <div className="text-xs font-mono text-valorant-slate mt-0.5">DYNAMIC HARDWARE CALCULATION</div>
        </div>
      </div>

      {/* Labs Layout Display */}
      {labs.map((lab) => (
        <div key={lab.id} className="bg-valorant-surface border border-valorant-border p-5 val-chamfer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-5">
            <Image
              src="/images/sentinel.svg"
              alt="Sentinel"
              width={128}
              height={128}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-valorant-border pb-4 mb-4">
            <div>
              <div className="text-[10px] font-mono text-valorant-red uppercase tracking-widest font-bold">
                PHYSICAL VENUE SECTOR // {lab.name.toUpperCase()}
              </div>
              <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2 mt-0.5">
                <Monitor className="h-5 w-5 text-valorant-red" />
                {lab.name}
              </h3>
              <p className="text-xs font-mono text-valorant-slate mt-0.5">
                {lab.totalPcs} PCs installed • {lab.workingPcCount} functional • {lab.operationalStationsCount} of {lab.stations.length} stations operational
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 bg-valorant-dark text-valorant-ivory border border-valorant-border">
                {lab.operationalStationsCount} COMBAT SLOTS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {lab.stations.map((st) => (
              <div
                key={st.id}
                className={`border p-4 transition-colors val-chamfer-btn ${
                  st.isOperational
                    ? "bg-valorant-dark/80 border-valorant-mint/50"
                    : "bg-rose-950/20 border-valorant-red/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-heading font-bold text-valorant-ivory flex items-center gap-1.5 text-sm uppercase">
                    {st.isOperational ? (
                      <CheckCircle2 className="h-4 w-4 text-valorant-mint" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-valorant-red" />
                    )}
                    {st.name}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                      st.isOperational
                        ? "bg-valorant-mint/10 text-valorant-mint border-valorant-mint/30"
                        : "bg-valorant-red/10 text-valorant-red border-valorant-red/30"
                    }`}
                  >
                    {st.isOperational ? "OPERATIONAL" : "DEFICIENT"}
                  </span>
                </div>

                <div className="text-xs font-mono text-valorant-slate mb-3 flex justify-between">
                  <span>STATION INTEGRITY:</span>
                  <span className="font-mono font-bold text-valorant-ivory">
                    {st.workingPcCount} / {st.requiredPCs} RIGS ONLINE
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
                        className={`h-9 flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all border ${
                          isWorking
                            ? "bg-valorant-mint/10 border-valorant-mint/40 text-valorant-mint hover:border-valorant-red hover:bg-valorant-red/20 hover:text-valorant-red"
                            : "bg-valorant-red/20 border-valorant-red/60 text-valorant-red hover:border-valorant-mint hover:bg-valorant-mint/20 hover:text-valorant-mint"
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

                <p className="text-[10px] font-mono text-valorant-slate mt-2 text-center">
                  ◈ Click rig to toggle fault / repair
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
