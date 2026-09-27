"use client";

import React, { useState } from "react";
import { BracketStructure } from "@/lib/tournament/types";
import { IPLPlayoffStructure } from "@/lib/tournament/ipl-playoffs";
import { Stage1ScheduleResult } from "@/lib/scheduling/stage1-fixtures";
import { IPLPlayoffBracket } from "./ipl-playoff-bracket";
import { Stage1SlotFixtureBoard } from "./stage1-slot-fixture-board";
import { BracketViewer } from "./bracket-viewer";
import { Trophy, Layers, GitFork } from "lucide-react";
import { soundFX } from "@/lib/sound/audio";

interface BracketTabsViewProps {
  tournamentId: string;
  initialBracket: BracketStructure | null;
  initialIPLPlayoffs: IPLPlayoffStructure | null;
  initialStage1Schedule: Stage1ScheduleResult | null;
}

export function BracketTabsView({
  tournamentId,
  initialBracket,
  initialIPLPlayoffs,
  initialStage1Schedule,
}: BracketTabsViewProps) {
  const [activeTab, setActiveTab] = useState<"IPL" | "STAGE1" | "TREE">("IPL");

  const switchTab = (tab: "IPL" | "STAGE1" | "TREE") => {
    soundFX.playClick();
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
        <div>
          <div className="text-[10px] font-mono text-valorant-red uppercase tracking-widest font-bold">
            TACTICAL TOURNAMENT BLUEPRINT // STAGES
          </div>
          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-valorant-ivory">
            Tournament Structure & Brackets
          </h1>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Stage 1 preliminary fixtures • IPL Playoff system determining verified 1st, 2nd, and 3rd prize places
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-valorant-surface p-1.5 border border-valorant-border">
          <button
            onClick={() => switchTab("IPL")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-heading uppercase font-bold tracking-wider transition-all val-chamfer-btn ${
              activeTab === "IPL"
                ? "bg-valorant-red text-valorant-ivory shadow-lg shadow-valorant-red/30"
                : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
            }`}
          >
            <Trophy className="h-4 w-4" />
            IPL Playoffs (3 Prizes)
          </button>

          <button
            onClick={() => switchTab("STAGE1")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-heading uppercase font-bold tracking-wider transition-all val-chamfer-btn ${
              activeTab === "STAGE1"
                ? "bg-valorant-red text-valorant-ivory shadow-lg shadow-valorant-red/30"
                : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
            }`}
          >
            <Layers className="h-4 w-4" />
            Stage 1 Fixtures
          </button>

          <button
            onClick={() => switchTab("TREE")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-heading uppercase font-bold tracking-wider transition-all val-chamfer-btn ${
              activeTab === "TREE"
                ? "bg-valorant-red text-valorant-ivory shadow-lg shadow-valorant-red/30"
                : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
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
