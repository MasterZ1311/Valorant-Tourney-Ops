import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { PCStatus } from "@/lib/scheduling/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const labs = store.getLabs(params.id);
  const metrics = store.getVenueMetrics(params.id);
  return NextResponse.json({ success: true, data: { labs, metrics } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { labId, pcId, status } = await req.json();
    if (!labId || !pcId || !status) {
      return NextResponse.json(
        { success: false, error: "labId, pcId, and status are required" },
        { status: 400 }
      );
    }
    store.updatePCStatus(params.id, labId, pcId, status as PCStatus);
    const metrics = store.getVenueMetrics(params.id);
    return NextResponse.json({ success: true, data: { metrics } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update PC status";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
