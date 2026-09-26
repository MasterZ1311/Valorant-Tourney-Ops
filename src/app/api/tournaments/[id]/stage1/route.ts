import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = store.getStage1Schedule(params.id);
    return NextResponse.json({ success: true, data: schedule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load Stage 1 schedule";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "FIXTURE_GENERATE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const schedule = store.regenerateStage1Schedule(
      params.id,
      body.customByeTeamId,
      body.customPairings
    );
    return NextResponse.json({ success: true, data: schedule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate Stage 1 schedule";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "FIXTURE_OVERWRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    if (body.action === "SWAP") {
      const schedule = store.swapStage1Teams(
        params.id,
        body.matchIdA,
        body.slotA,
        body.matchIdB,
        body.slotB
      );
      return NextResponse.json({ success: true, data: schedule });
    } else if (body.action === "SET_BYE") {
      const schedule = store.setStage1ByeTeam(params.id, body.teamId);
      return NextResponse.json({ success: true, data: schedule });
    }
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update Stage 1 schedule";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
