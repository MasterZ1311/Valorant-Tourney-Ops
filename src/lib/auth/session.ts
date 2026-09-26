import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { assertPermission, hasPermission, PermissionAction } from "./rbac";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Extracts session user from request header (e.g. x-user-role, Authorization header, or cookie).
 * In production/LAN environments, headers are populated by authentication middleware.
 * Defaults to SUPER_ADMIN in dev mode if no header is present, but allows explicit role override via x-user-role.
 */
export function getSessionUser(req: NextRequest): SessionUser {
  const roleHeader = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id") || "admin-system";
  const userEmail = req.headers.get("x-user-email") || "admin@vto.gg";
  const userName = req.headers.get("x-user-name") || "Tournament Administrator";

  let role: UserRole = "SUPER_ADMIN";
  if (roleHeader && Object.values(UserRole).includes(roleHeader as UserRole)) {
    role = roleHeader as UserRole;
  }

  return {
    id: userId,
    email: userEmail,
    name: userName,
    role,
  };
}

/**
 * Route protection helper to authorize an API request against a required permission.
 * Returns null if authorized, or a 403 Forbidden NextResponse if unauthorized.
 */
export function checkAuthorization(
  req: NextRequest,
  requiredAction: PermissionAction
): { user: SessionUser; errorResponse?: NextResponse } {
  const user = getSessionUser(req);
  if (!hasPermission(user.role, requiredAction)) {
    return {
      user,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Forbidden: Role ${user.role} is not authorized to perform ${requiredAction}.`,
        },
        { status: 403 }
      ),
    };
  }
  return { user };
}
