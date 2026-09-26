import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const report = store.validateTournament(params.id);
    return NextResponse.json({ success: true, data: report });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason } = await req.json();

    if (action === "FINALIZE") {
      const auth = checkAuthorization(req, "TOURNAMENT_FINALIZE");
      if (auth.errorResponse) return auth.errorResponse;

      const report = store.validateTournament(params.id);
      if (!report.canFinalize) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot finalize tournament due to critical validation failures.",
            report,
          },
          { status: 400 }
        );
      }
      const updated = store.updateTournamentStatus(
        params.id,
        "FINALIZED",
        reason,
        auth.user.id,
        auth.user.role
      );
      return NextResponse.json({ success: true, data: updated });
    } else if (action === "UNLOCK") {
      const auth = checkAuthorization(req, "TOURNAMENT_UNLOCK");
      if (auth.errorResponse) return auth.errorResponse;

      if (!reason || reason.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "A valid reason is required to unlock a tournament." },
          { status: 400 }
        );
      }
      const updated = store.updateTournamentStatus(
        params.id,
        "READY",
        reason,
        auth.user.id,
        auth.user.role
      );
      return NextResponse.json({ success: true, data: updated });
    } else if (action === "START_LIVE") {
      const auth = checkAuthorization(req, "TOURNAMENT_FINALIZE");
      if (auth.errorResponse) return auth.errorResponse;

      const updated = store.updateTournamentStatus(
        params.id,
        "LIVE",
        "Tournament started live",
        auth.user.id,
        auth.user.role
      );
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
