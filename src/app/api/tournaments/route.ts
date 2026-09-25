import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET() {
  const tournaments = store.getTournaments();
  return NextResponse.json({ success: true, data: tournaments });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tournament = store.createTournament(body);
    return NextResponse.json({ success: true, data: tournament });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create tournament";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
