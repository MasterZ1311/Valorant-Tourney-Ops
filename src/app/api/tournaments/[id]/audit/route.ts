import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import { checkAuthorization } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = checkAuthorization(req, "AUDIT_VIEW");
  if (auth.errorResponse) return auth.errorResponse;

  const logs = store.getAuditLogs(params.id);
  return NextResponse.json({ success: true, data: logs });
}
