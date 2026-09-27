import React from "react";
import { store } from "@/lib/store/tournament-store";
import { FileText, Shield, Clock } from "lucide-react";
import { TacticalCard } from "@/components/ui/tactical-card";

export const dynamic = "force-dynamic";

export default function AuditAdminPage() {
  const tournamentId = "vto-tourney-1";
  const logs = store.getAuditLogs(tournamentId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
        <div>
          <div className="text-[10px] font-mono text-valorant-red uppercase tracking-widest font-bold">
            CRYPTOGRAPHIC PROVENANCE // IMMUTABLE TRAIL
          </div>
          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
            <FileText className="h-7 w-7 text-valorant-red" />
            Immutable Audit Log Trail
          </h1>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Cryptographically recorded operator actions, score overrides, match states, and bracket transitions.
          </p>
        </div>
      </div>

      <TacticalCard telemetry="CRYPTOGRAPHIC AUDIT CHAIN">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-valorant-dark border-b border-valorant-border text-[10px] uppercase font-bold tracking-wider text-valorant-slate">
              <tr>
                <th className="py-3 px-4">TIMESTAMP [UTC/LOCAL]</th>
                <th className="py-3 px-4">AUTHORITY / ACTOR</th>
                <th className="py-3 px-4">TACTICAL ACTION</th>
                <th className="py-3 px-4">TARGET ENTITY</th>
                <th className="py-3 px-4">AUDIT LOG DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-valorant-border/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-valorant-slate text-xs">
                    ZERO AUDIT EVENTS LOGGED IN CURRENT PROTOCOL
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-valorant-elevated/40 transition-colors">
                    <td className="py-3 px-4 text-valorant-slate whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-heading font-bold text-valorant-ivory flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-purple-400" />
                        <span>{log.actorId}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-valorant-dark text-valorant-slate border border-valorant-border">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-valorant-red">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-valorant-ivory">
                      <span className="font-heading uppercase">{log.entity}</span>{" "}
                      <span className="font-mono text-valorant-slate text-[10px]">({log.entityId})</span>
                    </td>
                    <td className="py-3 px-4 text-valorant-slate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TacticalCard>
    </div>
  );
}
