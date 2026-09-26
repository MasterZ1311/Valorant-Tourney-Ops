import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { MatchStatus } from "@/lib/tournament/types";
import { checkAuthorization } from "@/lib/auth/session";
import { PermissionAction } from "@/lib/auth/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json(
        { success: false, error: "status is required" },
        { status: 400 }
      );
    }

    let requiredAction: PermissionAction = "MATCH_START";
    if (status === "CALLED") {
      requiredAction = "MATCH_CALL";
    } else if (status === "READY" || status === "LOBBY_READY" || status === "LIVE") {
      requiredAction = "MATCH_START";
    } else if (status === "PAUSED") {
      requiredAction = "MATCH_PAUSE";
    } else if (status === "FINISHED" || status === "RESULT_PENDING") {
      requiredAction = "MATCH_SUBMIT_RESULT";
    } else if (status === "VERIFIED") {
      requiredAction = "MATCH_VERIFY_RESULT";
    }

    const auth = checkAuthorization(req, requiredAction);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    store.updateMatchStatus(
      params.id,
      params.matchId,
      status as MatchStatus,
      auth.user.id,
      auth.user.role
    );

    return NextResponse.json({ success: true, message: `Match updated to ${status}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update match status";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
