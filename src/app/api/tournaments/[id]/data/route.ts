import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = checkAuthorization(req, "TOURNAMENT_UNLOCK");
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "RESET") {
      const cleanTourney = store.resetTournament(params.id);
      return NextResponse.json({
        success: true,
        message: "Tournament data completely reset to a clean slate.",
        data: cleanTourney,
      });
    }

    if (action === "SEED_DEMO") {
      store.loadDemoTournament(params.id);
      const tourney = store.getTournament(params.id);
      return NextResponse.json({
        success: true,
        message: "Demo tournament data loaded successfully.",
        data: tourney,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Expected 'RESET' or 'SEED_DEMO'." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to execute data action";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
