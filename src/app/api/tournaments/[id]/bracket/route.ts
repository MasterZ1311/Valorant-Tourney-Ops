import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bracket = store.getBracket(params.id);
  return NextResponse.json({ success: true, data: bracket });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "ADVANCE") {
      const { matchId, winnerId, scoreA, scoreB } = body;
      const updatedBracket = store.submitAndVerifyResult(
        params.id,
        matchId,
        winnerId,
        scoreA,
        scoreB
      );
      return NextResponse.json({ success: true, data: updatedBracket });
    }

    // Default action: Generate new bracket
    const bracket = store.generateBracket(params.id);
    return NextResponse.json({ success: true, data: bracket });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process bracket request";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
