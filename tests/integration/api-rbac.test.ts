import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { store } from "../../src/lib/store/tournament-store";

// Route handlers
import { POST as createTournament } from "../../src/app/api/tournaments/route";
import { POST as handleValidate } from "../../src/app/api/tournaments/[id]/validate/route";
import { POST as handleBracket } from "../../src/app/api/tournaments/[id]/bracket/route";
import { POST as handleFixtures } from "../../src/app/api/tournaments/[id]/fixtures/route";
import { PATCH as handleVenues } from "../../src/app/api/tournaments/[id]/venues/route";
import { POST as handleAddTeam, PATCH as handleTeamCheckIn } from "../../src/app/api/tournaments/[id]/teams/route";
import { PATCH as handleMatchStatus } from "../../src/app/api/tournaments/[id]/matches/[matchId]/route";
import { GET as handleAuditLogs } from "../../src/app/api/tournaments/[id]/audit/route";
import { GET as handleExportReports } from "../../src/app/api/tournaments/[id]/export/route";

function makeRequest(
  url: string,
  options: {
    method?: string;
    role?: string;
    userId?: string;
    body?: any;
  } = {}
): NextRequest {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (options.role) {
    headers.set("x-user-role", options.role);
  }
  if (options.userId) {
    headers.set("x-user-id", options.userId);
  }

  const reqInit: RequestInit = {
    method: options.method || "GET",
    headers,
  };
  if (options.body) {
    reqInit.body = JSON.stringify(options.body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit as any);
}

describe("API Security & State Machine Enforcement", () => {
  const tournamentId = "vto-tourney-1";

  it("blocks VIEWER from creating a tournament (403 Forbidden)", async () => {
    const req = makeRequest("http://localhost:3000/api/tournaments", {
      method: "POST",
      role: "VIEWER",
      body: { name: "Illegal Tournament" },
    });
    const res = await createTournament(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Forbidden");
  });

  it("allows TOURNAMENT_ADMIN to create a tournament (200 OK)", async () => {
    const req = makeRequest("http://localhost:3000/api/tournaments", {
      method: "POST",
      role: "TOURNAMENT_ADMIN",
      body: { name: "Admin Cup" },
    });
    const res = await createTournament(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("strictly blocks TOURNAMENT_ADMIN and VOLUNTEER from unlocking a tournament (403 Forbidden)", async () => {
    // Attempt unlock as TOURNAMENT_ADMIN
    const adminReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/validate`, {
      method: "POST",
      role: "TOURNAMENT_ADMIN",
      body: { action: "UNLOCK", reason: "Need to re-seed" },
    });
    const adminRes = await handleValidate(adminReq, { params: { id: tournamentId } });
    expect(adminRes.status).toBe(403);
    const adminJson = await adminRes.json();
    expect(adminJson.error).toContain("Forbidden");

    // Attempt unlock as VOLUNTEER
    const volReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/validate`, {
      method: "POST",
      role: "VOLUNTEER",
      body: { action: "UNLOCK", reason: "Need to fix station" },
    });
    const volRes = await handleValidate(volReq, { params: { id: tournamentId } });
    expect(volRes.status).toBe(403);
  });

  it("permits SUPER_ADMIN to unlock a tournament with audit reason (200 OK)", async () => {
    const tourney = store.getTournament(tournamentId);
    if (tourney) {
      tourney.status = "FINALIZED";
    }

    const unlockReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/validate`, {
      method: "POST",
      role: "SUPER_ADMIN",
      body: { action: "UNLOCK", reason: "Emergency bracket adjustment by head organizer" },
    });
    const unlockRes = await handleValidate(unlockReq, { params: { id: tournamentId } });
    expect(unlockRes.status).toBe(200);
    const json = await unlockRes.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("READY");
  });

  it("blocks VOLUNTEER from generating brackets or fixtures (403 Forbidden)", async () => {
    const bracketReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/bracket`, {
      method: "POST",
      role: "VOLUNTEER",
      body: {},
    });
    const bracketRes = await handleBracket(bracketReq, { params: { id: tournamentId } });
    expect(bracketRes.status).toBe(403);

    const fixtureReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/fixtures`, {
      method: "POST",
      role: "VOLUNTEER",
    });
    const fixtureRes = await handleFixtures(fixtureReq, { params: { id: tournamentId } });
    expect(fixtureRes.status).toBe(403);
  });

  it("blocks VOLUNTEER from viewing audit logs (403 Forbidden)", async () => {
    const auditReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/audit`, {
      method: "GET",
      role: "VOLUNTEER",
    });
    const auditRes = await handleAuditLogs(auditReq, { params: { id: tournamentId } });
    expect(auditRes.status).toBe(403);
  });

  it("allows COORDINATOR and SUPER_ADMIN to view audit logs (200 OK)", async () => {
    const auditReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/audit`, {
      method: "GET",
      role: "COORDINATOR",
    });
    const auditRes = await handleAuditLogs(auditReq, { params: { id: tournamentId } });
    expect(auditRes.status).toBe(200);
    const json = await auditRes.json();
    expect(json.success).toBe(true);
  });

  it("blocks VOLUNTEER and VIEWER from exporting reports (403 Forbidden)", async () => {
    const volExportReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/export?type=teams`,
      { method: "GET", role: "VOLUNTEER" }
    );
    const volRes = await handleExportReports(volExportReq, { params: { id: tournamentId } });
    expect(volRes.status).toBe(403);

    const viewerExportReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/export?type=summary`,
      { method: "GET", role: "VIEWER" }
    );
    const viewerRes = await handleExportReports(viewerExportReq, { params: { id: tournamentId } });
    expect(viewerRes.status).toBe(403);
  });

  it("allows RESULTS_OFFICIAL to export reports (200 OK)", async () => {
    const exportReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/export?type=fixtures`,
      { method: "GET", role: "RESULTS_OFFICIAL" }
    );
    const res = await handleExportReports(exportReq, { params: { id: tournamentId } });
    expect(res.status).toBe(200);
  });

  it("enforces state machine sequence: blocks illegal skip directly from READY to LIVE", async () => {
    // Find a playable match in the store
    const fixtures = store.getFixtures(tournamentId);
    const match = fixtures.find((f) => !f.isBye);
    expect(match).toBeDefined();

    const matchId = match!.matchId;

    // Reset status to SCHEDULED
    match!.status = "SCHEDULED";
    const bracket = store.getBracket(tournamentId);
    for (const r of bracket!.rounds) {
      const bm = r.matches.find((m) => m.id === matchId);
      if (bm) bm.status = "SCHEDULED";
    }

    // Attempt illegal jump: SCHEDULED directly to LIVE (should fail 400)
    const illegalLiveReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "LIVE" },
      }
    );
    const illegalRes = await handleMatchStatus(illegalLiveReq, {
      params: { id: tournamentId, matchId },
    });
    expect(illegalRes.status).toBe(400);
    const illegalJson = await illegalRes.json();
    expect(illegalJson.error).toContain("Illegal match status transition");

    // Execute legal progression: SCHEDULED -> CALLED -> READY -> LOBBY_READY -> LIVE
    // 1. CALLED
    const calledReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "CALLED" },
      }
    );
    const calledRes = await handleMatchStatus(calledReq, {
      params: { id: tournamentId, matchId },
    });
    expect(calledRes.status).toBe(200);

    // 2. READY
    const readyReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "READY" },
      }
    );
    const readyRes = await handleMatchStatus(readyReq, {
      params: { id: tournamentId, matchId },
    });
    expect(readyRes.status).toBe(200);

    // Attempt illegal jump: READY directly to LIVE (bypassing LOBBY_READY) -> must fail 400!
    const skipLobbyReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "LIVE" },
      }
    );
    const skipLobbyRes = await handleMatchStatus(skipLobbyReq, {
      params: { id: tournamentId, matchId },
    });
    expect(skipLobbyRes.status).toBe(400);

    // 3. Legal step: READY -> LOBBY_READY
    const lobbyReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "LOBBY_READY" },
      }
    );
    const lobbyRes = await handleMatchStatus(lobbyReq, {
      params: { id: tournamentId, matchId },
    });
    expect(lobbyRes.status).toBe(200);

    // 4. Legal step: LOBBY_READY -> LIVE
    const liveReq = makeRequest(
      `http://localhost:3000/api/tournaments/${tournamentId}/matches/${matchId}`,
      {
        method: "PATCH",
        role: "VOLUNTEER",
        body: { status: "LIVE" },
      }
    );
    const liveRes = await handleMatchStatus(liveReq, {
      params: { id: tournamentId, matchId },
    });
    expect(liveRes.status).toBe(200);
  });

  it("blocks VOLUNTEER from verifying results and advancing bracket (403 Forbidden)", async () => {
    const fixtures = store.getFixtures(tournamentId);
    const match = fixtures.find((f) => !f.isBye);
    expect(match).toBeDefined();

    const advanceReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/bracket`, {
      method: "POST",
      role: "VOLUNTEER",
      body: {
        action: "ADVANCE",
        matchId: match!.matchId,
        winnerId: match!.teamAId,
        scoreA: 13,
        scoreB: 5,
      },
    });
    const advanceRes = await handleBracket(advanceReq, { params: { id: tournamentId } });
    expect(advanceRes.status).toBe(403);
  });

  it("allows RESULTS_OFFICIAL to verify results and advance bracket (200 OK)", async () => {
    const fixtures = store.getFixtures(tournamentId);
    const match = fixtures.find((f) => !f.isBye);
    expect(match).toBeDefined();

    const advanceReq = makeRequest(`http://localhost:3000/api/tournaments/${tournamentId}/bracket`, {
      method: "POST",
      role: "RESULTS_OFFICIAL",
      body: {
        action: "ADVANCE",
        matchId: match!.matchId,
        winnerId: match!.teamAId,
        scoreA: 13,
        scoreB: 7,
      },
    });
    const advanceRes = await handleBracket(advanceReq, { params: { id: tournamentId } });
    expect(advanceRes.status).toBe(200);
    const json = await advanceRes.json();
    expect(json.success).toBe(true);
  });
});
