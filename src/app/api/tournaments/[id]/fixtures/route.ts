import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const fixtures = store.getFixtures(params.id);
  return NextResponse.json({ success: true, data: fixtures });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtures = store.generateTournamentFixtures(params.id);
    return NextResponse.json({ success: true, data: fixtures });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate fixtures";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
