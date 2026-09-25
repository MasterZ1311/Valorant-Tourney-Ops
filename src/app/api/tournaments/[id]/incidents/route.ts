import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const incidents = store.getIncidents(params.id);
  return NextResponse.json({ success: true, data: incidents });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const incident = store.reportIncident({
      ...body,
      tournamentId: params.id,
    });
    return NextResponse.json({ success: true, data: incident });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to report incident";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { incidentId, resolutionNotes } = await req.json();
    if (!incidentId || !resolutionNotes) {
      return NextResponse.json(
        { success: false, error: "incidentId and resolutionNotes are required" },
        { status: 400 }
      );
    }
    store.resolveIncident(params.id, incidentId, resolutionNotes);
    return NextResponse.json({ success: true, message: "Incident resolved" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to resolve incident";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
