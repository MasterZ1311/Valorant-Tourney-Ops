"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  HelpCircle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Monitor,
  Users,
  Calendar,
  Activity,
  Trophy,
  Smartphone,
  Tv,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserGuideModalProps {
  tournamentId?: string;
  triggerVariant?: "navbar" | "floating" | "inline";
}

export function UserGuideModal({
  tournamentId = "vto-tourney-1",
  triggerVariant = "navbar",
}: UserGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tour" | "rules" | "ipl" | "data">("tour");
  const [currentStep, setCurrentStep] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const router = useRouter();

  // Keyboard shortcut listener: Press '?' to toggle guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleResetData = async () => {
    if (
      !confirm(
        "Are you sure you want to clean all tournament data? All teams, brackets, fixtures, and match results will be cleared to a clean slate."
      )
    ) {
      return;
    }

    setIsResetting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("Tournament cleaned! You now have a fresh, clean workspace.");
        router.refresh();
      } else {
        setActionMessage(`Error: ${data.error || "Failed to reset"}`);
      }
    } catch {
      setActionMessage("Error: Failed to connect to server.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (
      !confirm(
        "Load demo tournament data? This will populate 13 teams, brackets, and fixtures so you can explore all features."
      )
    ) {
      return;
    }

    setIsResetting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEED_DEMO" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("Sample demo tournament loaded with 13 teams and fixtures!");
        router.refresh();
      } else {
        setActionMessage(`Error: ${data.error || "Failed to load demo"}`);
      }
    } catch {
      setActionMessage("Error: Failed to connect to server.");
    } finally {
      setIsResetting(false);
    }
  };

  const steps = [
    {
      title: "1. Hardware & Labs Setup",
      subtitle: "Physical resource allocation",
      icon: Monitor,
      href: "/admin/venues",
      actionLabel: "Configure Labs",
      description:
        "Every VALORANT 5v5 match requires exactly 10 working PCs. In the Labs & PCs desk, verify your venue systems across AI Lab and Meta lab.",
      tips: [
        "10 PCs = 1 match station. Station capacity = floor(PCs / 10).",
        "If a PC experiences a technical issue, toggle its status to OFFLINE to protect match integrity.",
        "Buffer duration (15 min) between matches on the same station is automatically scheduled.",
      ],
    },
    {
      title: "2. Register Teams & Players",
      subtitle: "Rosters & attendance check-in",
      icon: Users,
      href: "/admin/teams",
      actionLabel: "Open Teams Desk",
      description:
        "Register competing teams, assign team captains, configure player rosters (5 starters + substitutes), and verify Riot IDs (Name#TAG).",
      tips: [
        "Click '+ Add Team' to register new squads with captain contact details.",
        "Add players with their verified Riot ID and role (Starter/Captain).",
        "When teams arrive at the venue, mark them as 'CHECKED IN' to enable bracket seeding.",
      ],
    },
    {
      title: "3. Generate Brackets & Fixtures",
      subtitle: "Preliminary slots & Knockout tree",
      icon: Calendar,
      href: "/admin/fixtures",
      actionLabel: "View Fixtures Console",
      description:
        "Generate your Single Elimination Knockout bracket and Stage 1 Time Slot Fixtures allocating physical match stations across labs.",
      tips: [
        "Stage 1 pairs teams into Time Slots (Slot 1 and Slot 2) across AI Lab (3 stations) and Meta lab (1 station).",
        "If there are an odd number of teams, an automatic Stage 1 BYE is assigned.",
        "Organizers can swap teams between stations or change the assigned BYE with 1 click in the Fixtures console.",
      ],
    },
    {
      title: "4. Live Match Operation Desk",
      subtitle: "6-stage attendance and live scoring",
      icon: Activity,
      href: "/admin/matches",
      actionLabel: "Open Live Desk",
      description:
        "Follow the standard 6-step match lifecycle on the Live Control Desk for each simultaneous station.",
      tips: [
        "1. Call Teams → 2. Waiting (Seating) → 3. Ready (10 players verified) → 4. Live (In-game).",
        "5. Finished: Enter final match score (e.g., 13-9).",
        "6. Verified: Results officially lock and trigger winner advancement in the bracket tree.",
      ],
    },
    {
      title: "5. Mobile Marshals & Projector TV",
      subtitle: "Field staff and spectator screens",
      icon: Tv,
      href: "/volunteer",
      actionLabel: "Open Marshal Mobile",
      description:
        "VTO provides dedicated views for floor marshals and spectator monitors without requiring full admin access.",
      tips: [
        "Floor Volunteers: Use /volunteer on smartphones for large touch buttons to update station match statuses.",
        "Spectator Projectors: Open /display/vto-tourney-1 on venue displays for live auto-refreshing match scores and rankings.",
        "Audit Trail: Every score verification and manual override is logged at /admin/audit.",
      ],
    },
  ];

  return (
    <>
      {/* Trigger Button Variants */}
      {triggerVariant === "navbar" && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-red-600 to-[#ff4655] hover:from-red-500 hover:to-[#ff5865] text-white shadow-md shadow-red-500/20 transition-all border border-red-400/30"
          title="Open User & Operator Guide (Shortcut: ?)"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Guide</span>
          <span className="hidden xl:inline-block px-1 py-0.2 text-[9px] font-mono bg-black/30 rounded text-red-200">
            ?
          </span>
        </button>
      )}

      {triggerVariant === "floating" && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#17202a] border border-[#ff4655] text-white text-xs font-black uppercase tracking-wider shadow-2xl shadow-red-500/30 hover:bg-[#ff4655] hover:text-black transition-all group"
          title="Open User Guide & Onboarding (Shortcut: ?)"
        >
          <HelpCircle className="h-4 w-4 text-[#ff4655] group-hover:text-black transition-colors" />
          <span>Operator Guide</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      )}

      {/* Guide Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121b24] border border-[#2b3844] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#17202a] border-b border-[#2b3844] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#ff4655] flex items-center justify-center text-black font-black text-sm shadow-md">
                  VTO
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    VALORANT Tournament Operations Guide
                  </h2>
                  <p className="text-xs text-gray-400">
                    Quick-start walkthrough, tournament invariants, and clean slate controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2b3844] transition-colors"
                  title="Close Guide (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex border-b border-[#2b3844] bg-[#0f1923] px-6 py-2 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("tour")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "tour"
                    ? "bg-[#ff4655] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1a232f]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quick-Start Walkthrough
              </button>

              <button
                onClick={() => setActiveTab("rules")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "rules"
                    ? "bg-[#ff4655] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1a232f]"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Tournament Invariants
              </button>

              <button
                onClick={() => setActiveTab("ipl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "ipl"
                    ? "bg-[#ff4655] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1a232f]"
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                IPL 3-Place Playoffs
              </button>

              <button
                onClick={() => setActiveTab("data")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "data"
                    ? "bg-[#ff4655] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1a232f]"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Data Controls (Reset / Demo)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span>{actionMessage}</span>
                  <button
                    onClick={() => setActionMessage(null)}
                    className="text-emerald-400 hover:text-white ml-2 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* TAB 1: QUICK START TOUR */}
              {activeTab === "tour" && (
                <div className="space-y-6">
                  {/* Step Indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {steps.map((s, idx) => {
                      const Icon = s.icon;
                      const isCurrent = currentStep === idx;
                      const isDone = currentStep > idx;

                      return (
                        <button
                          key={s.title}
                          onClick={() => setCurrentStep(idx)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isCurrent
                              ? "bg-[#1f2731] border-[#ff4655] shadow-md shadow-[#ff4655]/10"
                              : isDone
                              ? "bg-[#17202a] border-emerald-500/40 text-gray-400"
                              : "bg-[#17202a] border-[#2b3844] text-gray-500"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold">
                              Step {idx + 1}
                            </span>
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Icon
                                className={`h-3.5 w-3.5 ${
                                  isCurrent ? "text-[#ff4655]" : "text-gray-500"
                                }`}
                              />
                            )}
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {s.title.split(". ")[1]}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Step Hero Card */}
                  {(() => {
                    const step = steps[currentStep];
                    const Icon = step.icon;

                    return (
                      <div className="bg-[#17202a] border border-[#2b3844] rounded-2xl p-6 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2b3844] pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/30 flex items-center justify-center text-[#ff4655]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-white">{step.title}</h3>
                              <p className="text-xs text-gray-400">{step.subtitle}</p>
                            </div>
                          </div>

                          <Link
                            href={step.href}
                            onClick={() => setIsOpen(false)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                          >
                            <span>{step.actionLabel}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <p className="text-sm text-gray-300 leading-relaxed">
                          {step.description}
                        </p>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                            Key Rules & Guidelines:
                          </span>
                          <ul className="space-y-1.5">
                            {step.tips.map((tip, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-300 flex items-start gap-2 bg-[#0f1923] p-2.5 rounded-lg border border-[#2b3844]"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step Navigation Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Previous Step
                    </button>

                    <span className="text-xs font-mono text-gray-400">
                      Step {currentStep + 1} of {steps.length}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
                      }
                      disabled={currentStep === steps.length - 1}
                      className="px-4 py-2 rounded-lg bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    >
                      Next Step <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TOURNAMENT INVARIANTS */}
              {activeTab === "rules" && (
                <div className="space-y-5">
                  <div className="bg-[#17202a] border border-[#2b3844] rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#ff4655]" />
                      Core Physical & Operational Invariants
                    </h3>
                    <p className="text-xs text-gray-300">
                      The tournament operations system enforces deterministic rules to guarantee fair play and prevent scheduling conflicts:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-[#ff4655]" />
                          10 PCs = 1 Match Station
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          1 VALORANT match requires exactly 2 teams, 10 active players, and 10 operational PCs. An unavailable PC will immediately drop station operational status.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          No Simultaneous Overlap
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          A team cannot be scheduled in two places at once. A station cannot host two matches simultaneously. Buffer duration between matches is enforced.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          10-Minute Grace Period
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          When teams are called to a station, a 10-minute grace timer begins. Failure to seat 5 verified players enables the coordinator to record an official Forfeit.
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-purple-400" />
                          Cryptographic Audit Logs
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          Every score submission, status transition, team forfeit, and hardware re-allocation creates an immutable audit trail entry visible in /admin/audit.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: IPL PLAYOFFS */}
              {activeTab === "ipl" && (
                <div className="space-y-5">
                  <div className="bg-[#17202a] border border-[#2b3844] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <h3 className="text-base font-black text-white">
                        IPL / Page Playoff System (3-Place Prize Decider)
                      </h3>
                    </div>

                    <p className="text-xs text-gray-300">
                      Standard single elimination cannot determine a definitive 3rd place without a bronze decider. VTO implements the verified 4-match Page Playoff structure:
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">Qualifier 1 (Rank 1 vs Rank 2):</span>
                          <span className="text-gray-400 ml-2">Winner reaches Grand Final. Loser gets a second chance in Qualifier 2.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">Eliminator (Rank 3 vs Rank 4):</span>
                          <span className="text-gray-400 ml-2">Winner advances to Qualifier 2. Loser finishes in 4th place.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-[#2b3844] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-amber-500">Qualifier 2 (Loser Q1 vs Winner Eliminator):</span>
                          <span className="text-gray-400 ml-2">Winner advances to Grand Final. <strong>Loser officially earns 3rd Place (Bronze Prize)</strong>.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0f1923] rounded-xl border border-amber-500/40 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-amber-400">Grand Final (Winner Q1 vs Winner Q2):</span>
                          <span className="text-gray-400 ml-2">Winner is <strong>1st Place (Champion)</strong>; Loser is <strong>2nd Place (Silver)</strong>.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATA MANAGEMENT (RESET / DEMO) */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div className="bg-[#17202a] border border-[#2b3844] rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-[#ff4655]" />
                        Workspace Data Management
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Switch between a clean slate for real-world tournaments and sample demo data for rehearsals.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Clean Slate Action */}
                      <div className="p-4 rounded-xl bg-[#0f1923] border border-[#2b3844] space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                            Reset to Clean Slate
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Wipes all teams, rosters, brackets, fixtures, and match results. Keeps physical labs ready for fresh entry.
                          </p>
                        </div>

                        <button
                          onClick={handleResetData}
                          disabled={isResetting}
                          className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-600 border border-gray-700 text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors disabled:opacity-50"
                        >
                          {isResetting ? "Processing..." : "Wipe All Data (Clean Book)"}
                        </button>
                      </div>

                      {/* Load Demo Action */}
                      <div className="p-4 rounded-xl bg-[#0f1923] border border-[#2b3844] space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                            Load 13 Teams Demo
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Populates 13 campus teams, Stage 1 pairings across AI Lab & Meta lab, and seeded brackets for training and inspection.
                          </p>
                        </div>

                        <button
                          onClick={handleLoadDemoData}
                          disabled={isResetting}
                          className="w-full py-2.5 rounded-lg bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                          {isResetting ? "Processing..." : "Load Demo Tournament"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#17202a] border-t border-[#2b3844] px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-gray-500">Shortcut: Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#0f1923] border border-[#2b3844] text-[10px] font-mono text-gray-300">
                  ?
                </kbd>
                <span className="font-mono text-[11px] text-gray-500">to toggle this guide anywhere.</span>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0f1923] hover:bg-[#1f2731] border border-[#2b3844] text-xs font-bold text-white transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
