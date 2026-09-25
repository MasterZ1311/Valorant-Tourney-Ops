import React from "react";
import { store } from "@/lib/store/tournament-store";
import { FileText, Shield, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuditAdminPage() {
  const tournamentId = "vto-tourney-1";
  const logs = store.getAuditLogs(tournamentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-[#ff4655]" />
          Immutable Audit Log Trail
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Cryptographically recorded actions, overrides, results, and system state transitions.
        </p>
      </div>

      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0f1923] border-b border-[#2b3844] text-[10px] uppercase font-bold tracking-wider text-gray-400">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b3844]/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#1f2731]/40 transition-colors">
                <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-purple-400" />
                    <span>{log.actorId}</span>
                    <span className="text-[9px] uppercase px-1 rounded bg-[#0f1923] text-gray-400 border border-[#2b3844]">
                      {log.actorRole}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono font-bold text-[#ff4655]">
                  {log.action}
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {log.entity} <span className="font-mono text-gray-500 text-[10px]">({log.entityId})</span>
                </td>
                <td className="py-3 px-4 text-gray-200">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
