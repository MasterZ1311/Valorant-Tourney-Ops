import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const logs = store.getAuditLogs(params.id);
  return NextResponse.json({ success: true, data: logs });
}
