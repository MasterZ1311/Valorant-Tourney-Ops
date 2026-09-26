import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "VENUE_CONFIG");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const updatedLabs = store.updateVenueLabConfig(
      params.id,
      body.labId,
      body.totalPcs,
      body.name
    );
    const metrics = store.getVenueMetrics(params.id);
    return NextResponse.json({ success: true, data: { labs: updatedLabs, metrics } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update lab hardware";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
