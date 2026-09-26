import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";
import { Stage1MatchStatus } from "@/lib/scheduling/stage1-fixtures";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const body = await req.json();

    if (body.action === "STATUS") {
      const auth = checkAuthorization(req, "MATCH_START");
      if (auth.errorResponse) return auth.errorResponse;

      const schedule = store.updateStage1MatchStatus(
        params.id,
        params.matchId,
        body.status as Stage1MatchStatus
      );
      return NextResponse.json({ success: true, data: schedule });
    }

    if (body.action === "RESULT") {
      const auth = checkAuthorization(req, "MATCH_VERIFY_RESULT");
      if (auth.errorResponse) return auth.errorResponse;

      const schedule = store.recordStage1MatchResult(
        params.id,
        params.matchId,
        body.scoreA,
        body.scoreB,
        body.winnerId
      );
      return NextResponse.json({ success: true, data: schedule });
    }

    if (body.action === "FORFEIT") {
      const auth = checkAuthorization(req, "TEAM_DISQUALIFY");
      if (auth.errorResponse) return auth.errorResponse;

      const schedule = store.forfeitStage1Match(
        params.id,
        params.matchId,
        body.forfeitingTeamId,
        body.reason || "Grace period expired / No show"
      );
      return NextResponse.json({ success: true, data: schedule });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update match";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
