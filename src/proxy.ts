import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const token = extractToken(req.headers.get("authorization"));
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  const cookieToken = req.cookies.get("nexus_token")?.value ?? null;
  if (!cookieToken || !(await verifyToken(cookieToken))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
