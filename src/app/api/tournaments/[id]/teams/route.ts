import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teams = store.getTeams(params.id);
  return NextResponse.json({ success: true, data: teams });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const team = store.addTeam(params.id, body);
    return NextResponse.json({ success: true, data: team });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to add team";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId } = await req.json();
    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 }
      );
    }
    const updated = store.toggleTeamCheckIn(params.id, teamId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update team check-in";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
