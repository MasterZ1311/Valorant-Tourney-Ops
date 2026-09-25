import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { MatchStatus } from "@/lib/tournament/types";

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
    store.updateMatchStatus(params.id, params.matchId, status as MatchStatus);
    return NextResponse.json({ success: true, message: `Match updated to ${status}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update match status";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
