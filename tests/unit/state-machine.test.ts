import { describe, it, expect } from "vitest";
import {
  canTransitionTournament,
  canTransitionMatch,
  validateTournamentTransition,
  validateMatchTransition,
} from "../../src/lib/tournament/state-machine";

describe("State Machine — Tournament Transitions", () => {
  it("allows legal progression: DRAFT -> READY -> FINALIZED -> LIVE -> COMPLETED -> ARCHIVED", () => {
    expect(canTransitionTournament("DRAFT", "READY")).toBe(true);
    expect(canTransitionTournament("READY", "FINALIZED")).toBe(true);
    expect(canTransitionTournament("FINALIZED", "LIVE")).toBe(true);
    expect(canTransitionTournament("LIVE", "COMPLETED")).toBe(true);
    expect(canTransitionTournament("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("allows admin unlock: FINALIZED -> READY", () => {
    expect(canTransitionTournament("FINALIZED", "READY")).toBe(true);
  });

  it("blocks illegal transitions: DRAFT directly to LIVE", () => {
    expect(canTransitionTournament("DRAFT", "LIVE")).toBe(false);
    expect(() => validateTournamentTransition("DRAFT", "LIVE")).toThrow();
  });

  it("blocks illegal transitions: COMPLETED back to LIVE", () => {
    expect(canTransitionTournament("COMPLETED", "LIVE")).toBe(false);
  });
});

describe("State Machine — Match Transitions", () => {
  it("allows standard match lifecycle", () => {
    expect(canTransitionMatch("SCHEDULED", "CALLED")).toBe(true);
    expect(canTransitionMatch("CALLED", "READY")).toBe(true);
    expect(canTransitionMatch("READY", "LOBBY_READY")).toBe(true);
    expect(canTransitionMatch("LOBBY_READY", "LIVE")).toBe(true);
    expect(canTransitionMatch("LIVE", "FINISHED")).toBe(true);
    expect(canTransitionMatch("FINISHED", "RESULT_PENDING")).toBe(true);
    expect(canTransitionMatch("RESULT_PENDING", "VERIFIED")).toBe(true);
  });

  it("allows technical pause and resume during LIVE", () => {
    expect(canTransitionMatch("LIVE", "PAUSED")).toBe(true);
    expect(canTransitionMatch("PAUSED", "LIVE")).toBe(true);
  });

  it("blocks unverified scores from skipping RESULT_PENDING", () => {
    expect(canTransitionMatch("LIVE", "VERIFIED")).toBe(false);
    expect(canTransitionMatch("FINISHED", "VERIFIED")).toBe(false);
    expect(() => validateMatchTransition("LIVE", "VERIFIED")).toThrow();
  });
});
