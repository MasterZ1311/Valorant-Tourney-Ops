import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let playoffs = store.getIPLPlayoffs(params.id);
    if (!playoffs) {
      playoffs = store.initIPLPlayoffs(params.id);
    }
    return NextResponse.json({ success: true, data: playoffs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load IPL playoffs";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "BRACKET_GENERATE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const playoffs = store.initIPLPlayoffs(params.id, body.top4TeamIds);
    return NextResponse.json({ success: true, data: playoffs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initialize IPL playoffs";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "MATCH_VERIFY_RESULT");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const playoffs = store.recordIPLResult(
      params.id,
      body.matchCode,
      body.winnerId,
      body.scoreA,
      body.scoreB
    );
    return NextResponse.json({ success: true, data: playoffs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record IPL result";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
