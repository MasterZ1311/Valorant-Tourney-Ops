"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
import { soundFX } from "@/lib/sound/audio";
import { ValorantButton } from "../ui/valorant-button";

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
        soundFX.playClick();
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
        soundFX.playClick();
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
        soundFX.playMatchStart();
        setActionMessage("13-team demo tournament loaded successfully!");
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
      title: "1. Hardware & Physical Labs",
      subtitle: "Configure PCs, Labs, and Station boundaries",
      icon: Monitor,
      href: "/admin/venues",
      actionLabel: "Go to Labs Desk",
      description:
        "Every VALORANT match requires exactly 10 working PCs. VTO enforces this strictly: 30 PCs in AI Lab yields 3 stations; 10 PCs in Meta lab yields 1 station. If a PC goes offline, match capacity recalculates dynamically.",
      tips: [
        "Click any PC box in the Labs desk to simulate a hardware fault.",
        "Check how capacity drops if fewer than 10 PCs are available in a station.",
        "Buffer times between matches (default: 15 min) prevent lab congestion.",
      ],
    },
    {
      title: "2. Team Rosters & Attendance",
      subtitle: "Verify Riot IDs and check in 5-player rosters",
      icon: Users,
      href: "/admin/teams",
      actionLabel: "Go to Teams Desk",
      description:
        "Teams must have 5 verified starters with valid Riot IDs. When players arrive at the venue, mark them as 'Checked In'. Attendance status dictates whether a match can be called to an arena station.",
      tips: [
        "Teams must be CHECKED_IN before a station match can transition to READY.",
        "Captains receive direct mobile SMS or Discord notifications on call.",
        "Roster substitutions require coordinator audit approval.",
      ],
    },
    {
      title: "3. Stage 1 Match Radar",
      subtitle: "Scheduled fixtures & 4-station concurrent execution",
      icon: Calendar,
      href: "/admin/fixtures",
      actionLabel: "Go to Fixtures",
      description:
        "Stage 1 allocates the 13 teams across the 4 available stations (3 in AI Lab, 1 in Meta lab). Teams follow an attendance flow: Scheduled → Called → Ready → Live → Finished → Verified.",
      tips: [
        "10-Minute Grace Period: If a called team fails to seat 5 players, record a Forfeit.",
        "Slot Swaps: Organizers can swap slots between teams if venue logistics require.",
        "Live matches lock station hardware until verified by an official.",
      ],
    },
    {
      title: "4. Match Control & Attendance",
      subtitle: "Operate live matches with 1-click status transitions",
      icon: Activity,
      href: "/admin/matches",
      actionLabel: "Go to Match Control",
      description:
        "The match operations center is designed for high cadence. Call teams to stations, mark seating ready, launch live match timers, trigger tactical pauses, and verify official final round scores.",
      tips: [
        "Technical Pauses: Report network or hardware issues to freeze match timers.",
        "Only VERIFIED scores advance teams forward into the IPL Playoff tree.",
        "Audit logging cryptographically records the actor and timestamp for every score.",
      ],
    },
    {
      title: "5. IPL 3-Place Playoff Decider",
      subtitle: "Verified 1st, 2nd, and 3rd rank prizes",
      icon: Trophy,
      href: "/admin/bracket",
      actionLabel: "Go to Bracket Desk",
      description:
        "Standard knockout brackets fail to determine 3rd place without an extra match. VTO integrates the IPL Page Playoff format (Q1, Eliminator, Q2, Grand Final) to guarantee verified prize ranking.",
      tips: [
        "Qualifier 1 (Rank 1 vs 2): Winner reaches Grand Final; loser drops to Qualifier 2.",
        "Eliminator (Rank 3 vs 4): Loser finishes 4th; winner advances to Qualifier 2.",
        "Qualifier 2: Winner enters Grand Final; loser officially takes 3rd Place Bronze.",
      ],
    },
  ];

  return (
    <>
      {/* Trigger Button Variants */}
      {triggerVariant === "navbar" && (
        <button
          onClick={() => {
            soundFX.playClick();
            setIsOpen(true);
          }}
          className="val-chamfer-btn h-8 flex items-center gap-1.5 px-2.5 text-[11px] font-heading font-bold uppercase tracking-wider bg-valorant-surface hover:bg-valorant-elevated text-valorant-slate hover:text-valorant-ivory border border-valorant-border hover:border-valorant-slate transition-all"
          title="Open User & Operator Guide (Shortcut: ?)"
        >
          <BookOpen className="h-3.5 w-3.5 text-valorant-red" />
          <span>Guide</span>
          <span className="hidden xl:inline-block px-1 text-[9px] font-mono bg-valorant-dark text-valorant-slate border border-valorant-border">
            ?
          </span>
        </button>
      )}

      {triggerVariant === "floating" && (
        <button
          onClick={() => {
            soundFX.playClick();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-valorant-surface border-2 border-valorant-red text-valorant-ivory text-xs font-heading font-bold uppercase tracking-wider shadow-2xl shadow-valorant-red/30 hover:bg-valorant-red hover:text-valorant-ivory transition-all group val-chamfer-btn"
          title="Open User Guide & Onboarding (Shortcut: ?)"
        >
          <HelpCircle className="h-4 w-4 text-valorant-red group-hover:text-valorant-ivory transition-colors" />
          <span>Operator Guide</span>
          <span className="h-2 w-2 rounded-full bg-valorant-mint animate-pulse"></span>
        </button>
      )}

      {/* Guide Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden val-chamfer relative">
            {/* Modal Header */}
            <div className="bg-valorant-dark border-b border-valorant-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 border border-valorant-red p-1 bg-valorant-surface val-chamfer-btn">
                  <Image
                    src="/images/valorant_v_logo.svg"
                    alt="VALORANT"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">
                    VALORANT Tournament Operations Guide
                  </h2>
                  <p className="text-xs font-mono text-valorant-slate">
                    Quick-start walkthrough, tournament invariants, and clean slate controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-valorant-slate hover:text-valorant-ivory transition-colors"
                  title="Close Guide (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex border-b border-valorant-border bg-valorant-dark px-6 py-2 gap-2 overflow-x-auto font-mono text-xs">
              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab("tour");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap val-chamfer-btn ${
                  activeTab === "tour"
                    ? "bg-valorant-red text-valorant-ivory"
                    : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quick-Start Walkthrough
              </button>

              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab("rules");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap val-chamfer-btn ${
                  activeTab === "rules"
                    ? "bg-valorant-red text-valorant-ivory"
                    : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Tournament Invariants
              </button>

              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab("ipl");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap val-chamfer-btn ${
                  activeTab === "ipl"
                    ? "bg-valorant-red text-valorant-ivory"
                    : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                IPL 3-Place Playoffs
              </button>

              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab("data");
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap val-chamfer-btn ${
                  activeTab === "data"
                    ? "bg-valorant-red text-valorant-ivory"
                    : "text-valorant-slate hover:text-valorant-ivory hover:bg-valorant-elevated"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Data Controls (Reset / Demo)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionMessage && (
                <div className="p-3.5 bg-valorant-mint/10 border border-valorant-mint/40 text-valorant-mint text-xs font-mono font-bold flex items-center justify-between">
                  <span>{actionMessage}</span>
                  <button
                    onClick={() => setActionMessage(null)}
                    className="text-valorant-mint hover:text-valorant-ivory ml-2 text-xs font-mono"
                  >
                    DISMISS
                  </button>
                </div>
              )}

              {/* TAB 1: QUICK START TOUR */}
              {activeTab === "tour" && (
                <div className="space-y-6">
                  {/* Step Indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                    {steps.map((s, idx) => {
                      const Icon = s.icon;
                      const isCurrent = currentStep === idx;
                      const isDone = currentStep > idx;

                      return (
                        <button
                          key={s.title}
                          onClick={() => {
                            soundFX.playClick();
                            setCurrentStep(idx);
                          }}
                          className={`p-2.5 border text-left transition-all val-chamfer-btn ${
                            isCurrent
                              ? "bg-valorant-elevated border-valorant-red shadow-md shadow-valorant-red/10"
                              : isDone
                              ? "bg-valorant-surface border-valorant-mint/40 text-valorant-slate"
                              : "bg-valorant-surface border-valorant-border text-valorant-slate"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold">
                              Step {idx + 1}
                            </span>
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-valorant-mint" />
                            ) : (
                              <Icon
                                className={`h-3.5 w-3.5 ${
                                  isCurrent ? "text-valorant-red" : "text-valorant-slate"
                                }`}
                              />
                            )}
                          </div>
                          <div className="text-xs font-heading font-bold text-valorant-ivory truncate uppercase">
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
                      <div className="bg-valorant-dark border border-valorant-border p-6 space-y-5 val-chamfer">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-valorant-surface border border-valorant-red/40 flex items-center justify-center text-valorant-red val-chamfer-btn">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">
                                {step.title}
                              </h3>
                              <p className="text-xs font-mono text-valorant-slate">{step.subtitle}</p>
                            </div>
                          </div>

                          <Link
                            href={step.href}
                            onClick={() => {
                              soundFX.playClick();
                              setIsOpen(false);
                            }}
                            className="px-3.5 py-1.5 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors val-chamfer-btn shadow-md shadow-valorant-red/20"
                          >
                            <span>{step.actionLabel}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        <p className="text-sm text-valorant-slate leading-relaxed">
                          {step.description}
                        </p>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-valorant-slate">
                            Key Rules & Guidelines:
                          </span>
                          <ul className="space-y-1.5">
                            {step.tips.map((tip, i) => (
                              <li
                                key={i}
                                className="text-xs text-valorant-ivory flex items-start gap-2 bg-valorant-surface p-2.5 border border-valorant-border font-mono"
                              >
                                <CheckCircle2 className="h-4 w-4 text-valorant-mint shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step Navigation Controls */}
                  <div className="flex items-center justify-between pt-2 font-mono">
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        setCurrentStep((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={currentStep === 0}
                      className="px-4 py-2 bg-valorant-dark hover:bg-valorant-elevated text-valorant-slate text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors border border-valorant-border val-chamfer-btn"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> PREVIOUS STEP
                    </button>

                    <span className="text-xs text-valorant-slate">
                      STEP {currentStep + 1} OF {steps.length}
                    </span>

                    <button
                      onClick={() => {
                        soundFX.playClick();
                        setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
                      }}
                      disabled={currentStep === steps.length - 1}
                      className="px-4 py-2 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors val-chamfer-btn shadow-md shadow-valorant-red/20"
                    >
                      NEXT STEP <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TOURNAMENT INVARIANTS */}
              {activeTab === "rules" && (
                <div className="space-y-5">
                  <div className="bg-valorant-dark border border-valorant-border p-5 space-y-4 val-chamfer">
                    <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-valorant-red" />
                      Core Physical & Operational Invariants
                    </h3>
                    <p className="text-xs font-mono text-valorant-slate">
                      The tournament operations system enforces deterministic rules to guarantee fair play and prevent scheduling conflicts:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 bg-valorant-surface border border-valorant-border space-y-1 val-chamfer-btn">
                        <div className="font-heading font-bold text-valorant-ivory flex items-center gap-1.5 uppercase">
                          <Monitor className="h-3.5 w-3.5 text-valorant-red" />
                          10 PCs = 1 Match Station
                        </div>
                        <div className="text-valorant-slate text-[11px]">
                          1 VALORANT match requires exactly 2 teams, 10 active players, and 10 operational PCs. An unavailable PC will immediately drop station operational status.
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-border space-y-1 val-chamfer-btn">
                        <div className="font-heading font-bold text-valorant-ivory flex items-center gap-1.5 uppercase">
                          <Clock className="h-3.5 w-3.5 text-valorant-cyan" />
                          No Simultaneous Overlap
                        </div>
                        <div className="text-valorant-slate text-[11px]">
                          A team cannot be scheduled in two places at once. A station cannot host two matches simultaneously. Buffer duration between matches is enforced.
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-border space-y-1 val-chamfer-btn">
                        <div className="font-heading font-bold text-valorant-ivory flex items-center gap-1.5 uppercase">
                          <AlertTriangle className="h-3.5 w-3.5 text-valorant-gold" />
                          10-Minute Grace Period
                        </div>
                        <div className="text-valorant-slate text-[11px]">
                          When teams are called to a station, a 10-minute grace timer begins. Failure to seat 5 verified players enables the coordinator to record an official Forfeit.
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-border space-y-1 val-chamfer-btn">
                        <div className="font-heading font-bold text-valorant-ivory flex items-center gap-1.5 uppercase">
                          <FileText className="h-3.5 w-3.5 text-purple-400" />
                          Cryptographic Audit Logs
                        </div>
                        <div className="text-valorant-slate text-[11px]">
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
                  <div className="bg-valorant-dark border border-valorant-border p-5 space-y-4 val-chamfer">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-valorant-gold" />
                      <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">
                        IPL / Page Playoff System (3-Place Prize Decider)
                      </h3>
                    </div>

                    <p className="text-xs font-mono text-valorant-slate">
                      Standard single elimination cannot determine a definitive 3rd place without a bronze decider. VTO implements the verified 4-match Page Playoff structure:
                    </p>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="p-3 bg-valorant-surface border border-valorant-border flex items-center justify-between val-chamfer-btn">
                        <div>
                          <span className="font-heading font-bold text-valorant-ivory uppercase">Qualifier 1 (Rank 1 vs Rank 2):</span>
                          <span className="text-valorant-slate ml-2">Winner reaches Grand Final. Loser gets a second chance in Qualifier 2.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-border flex items-center justify-between val-chamfer-btn">
                        <div>
                          <span className="font-heading font-bold text-valorant-ivory uppercase">Eliminator (Rank 3 vs Rank 4):</span>
                          <span className="text-valorant-slate ml-2">Winner advances to Qualifier 2. Loser finishes in 4th place.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-border flex items-center justify-between val-chamfer-btn">
                        <div>
                          <span className="font-heading font-bold text-amber-500 uppercase">Qualifier 2 (Loser Q1 vs Winner Eliminator):</span>
                          <span className="text-valorant-slate ml-2">Winner advances to Grand Final. <strong className="text-amber-500">Loser officially earns 3rd Place (Bronze Prize)</strong>.</span>
                        </div>
                      </div>

                      <div className="p-3 bg-valorant-surface border border-valorant-gold/40 flex items-center justify-between val-chamfer-btn">
                        <div>
                          <span className="font-heading font-bold text-valorant-gold uppercase">Grand Final (Winner Q1 vs Winner Q2):</span>
                          <span className="text-valorant-slate ml-2">Winner is <strong className="text-valorant-gold">1st Place (Champion)</strong>; Loser is <strong className="text-slate-300">2nd Place (Silver)</strong>.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATA MANAGEMENT (RESET / DEMO) */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div className="bg-valorant-dark border border-valorant-border p-6 space-y-6 val-chamfer">
                    <div>
                      <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-valorant-red" />
                        Workspace Data Management
                      </h3>
                      <p className="text-xs font-mono text-valorant-slate mt-1">
                        Switch between a clean slate for real-world tournaments and sample demo data for rehearsals.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                      {/* Clean Slate Action */}
                      <div className="p-4 bg-valorant-surface border border-valorant-border space-y-3 flex flex-col justify-between val-chamfer-btn">
                        <div>
                          <div className="text-sm font-heading font-bold text-valorant-ivory flex items-center gap-2 uppercase">
                            <span className="h-2 w-2 rounded-full bg-valorant-mint"></span>
                            Reset to Clean Slate
                          </div>
                          <p className="text-xs text-valorant-slate mt-1">
                            Wipes all teams, rosters, brackets, fixtures, and match results. Keeps physical labs ready for fresh entry.
                          </p>
                        </div>

                        <button
                          onClick={handleResetData}
                          disabled={isResetting}
                          className="w-full py-2.5 bg-valorant-dark hover:bg-rose-950/60 hover:text-valorant-red border border-valorant-border text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate transition-colors disabled:opacity-50 val-chamfer-btn"
                        >
                          {isResetting ? "Processing..." : "Wipe All Data (Clean Slate)"}
                        </button>
                      </div>

                      {/* Load Demo Action */}
                      <div className="p-4 bg-valorant-surface border border-valorant-border space-y-3 flex flex-col justify-between val-chamfer-btn">
                        <div>
                          <div className="text-sm font-heading font-bold text-valorant-ivory flex items-center gap-2 uppercase">
                            <span className="h-2 w-2 rounded-full bg-valorant-gold"></span>
                            Load 13 Teams Demo
                          </div>
                          <p className="text-xs text-valorant-slate mt-1">
                            Populates 13 campus teams, Stage 1 pairings across AI Lab & Meta lab, and seeded brackets for training and inspection.
                          </p>
                        </div>

                        <button
                          onClick={handleLoadDemoData}
                          disabled={isResetting}
                          className="w-full py-2.5 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 val-chamfer-btn shadow-md shadow-valorant-red/20"
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
            <div className="bg-valorant-dark border-t border-valorant-border px-6 py-3.5 flex flex-wrap items-center justify-between text-xs font-mono text-valorant-slate gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Shortcut: Press</span>
                <kbd className="px-1.5 py-0.5 bg-valorant-surface border border-valorant-border text-[10px] font-mono text-valorant-ivory">
                  ?
                </kbd>
                <span className="text-[11px]">to toggle this guide anywhere.</span>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-valorant-surface hover:bg-valorant-elevated border border-valorant-border text-xs font-mono uppercase tracking-wider text-valorant-ivory transition-colors val-chamfer-btn"
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
