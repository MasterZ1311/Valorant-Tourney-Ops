"use client";

import React, { useState } from "react";
import { BracketStructure } from "@/lib/tournament/types";
import { IPLPlayoffStructure } from "@/lib/tournament/ipl-playoffs";
import { Stage1ScheduleResult } from "@/lib/scheduling/stage1-fixtures";
import { IPLPlayoffBracket } from "./ipl-playoff-bracket";
import { Stage1SlotFixtureBoard } from "./stage1-slot-fixture-board";
import { BracketViewer } from "./bracket-viewer";
import { Trophy, Layers, GitFork } from "lucide-react";

interface BracketTabsViewProps {
  tournamentId: string;
  initialBracket: BracketStructure;
  initialIPLPlayoffs: IPLPlayoffStructure;
  initialStage1Schedule: Stage1ScheduleResult;
}

export function BracketTabsView({
  tournamentId,
  initialBracket,
  initialIPLPlayoffs,
  initialStage1Schedule,
}: BracketTabsViewProps) {
  const [activeTab, setActiveTab] = useState<"IPL" | "STAGE1" | "TREE">("IPL");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2b3844] pb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Tournament Structure & Brackets</h1>
          <p className="text-xs text-gray-400 mt-1">
            Stage 1 preliminary fixtures • IPL Playoff system determining verified 1st, 2nd, and 3rd prize places
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#0f1923] p-1.5 rounded-lg border border-[#2b3844]">
          <button
            onClick={() => setActiveTab("IPL")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "IPL"
                ? "bg-[#ff4655] text-white shadow-md shadow-[#ff4655]/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Trophy className="h-4 w-4" />
            IPL Playoffs (3 Prize Places)
          </button>

          <button
            onClick={() => setActiveTab("STAGE1")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "STAGE1"
                ? "bg-[#ff4655] text-white shadow-md shadow-[#ff4655]/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Stage 1 Fixtures (13 Teams)
          </button>

          <button
            onClick={() => setActiveTab("TREE")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "TREE"
                ? "bg-[#ff4655] text-white shadow-md shadow-[#ff4655]/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <GitFork className="h-4 w-4" />
            Knockout Tree
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "IPL" && (
        <IPLPlayoffBracket
          initialPlayoffs={initialIPLPlayoffs}
          tournamentId={tournamentId}
        />
      )}

      {activeTab === "STAGE1" && (
        <Stage1SlotFixtureBoard
          initialSchedule={initialStage1Schedule}
          tournamentId={tournamentId}
        />
      )}

      {activeTab === "TREE" && (
        <BracketViewer
          initialBracket={initialBracket}
          tournamentId={tournamentId}
        />
      )}
    </div>
  );
}
