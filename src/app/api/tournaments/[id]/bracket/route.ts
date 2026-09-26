import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

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
      const auth = checkAuthorization(req, "MATCH_VERIFY_RESULT");
      if (auth.errorResponse) return auth.errorResponse;

      const { matchId, winnerId, scoreA, scoreB } = body;
      const updatedBracket = store.submitAndVerifyResult(
        params.id,
        matchId,
        winnerId,
        scoreA,
        scoreB,
        auth.user.id,
        auth.user.role
      );
      return NextResponse.json({ success: true, data: updatedBracket });
    }

    // Default action: Generate new bracket
    const auth = checkAuthorization(req, "BRACKET_GENERATE");
    if (auth.errorResponse) return auth.errorResponse;

    const bracket = store.generateBracket(params.id, auth.user.id, auth.user.role);
    return NextResponse.json({ success: true, data: bracket });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process bracket request";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
