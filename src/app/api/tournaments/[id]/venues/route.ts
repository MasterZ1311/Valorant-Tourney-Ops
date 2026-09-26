import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { PCStatus } from "@/lib/scheduling/types";
import { checkAuthorization } from "@/lib/auth/session";

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
  const auth = checkAuthorization(req, "PC_STATUS_TOGGLE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { labId, pcId, status } = await req.json();
    if (!labId || !pcId || !status) {
      return NextResponse.json(
        { success: false, error: "labId, pcId, and status are required" },
        { status: 400 }
      );
    }
    store.updatePCStatus(params.id, labId, pcId, status as PCStatus, auth.user.id, auth.user.role);
    const metrics = store.getVenueMetrics(params.id);
    return NextResponse.json({ success: true, data: { metrics } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update PC status";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
