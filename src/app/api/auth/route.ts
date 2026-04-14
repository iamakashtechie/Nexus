import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { signToken } from "@/lib/auth";
import {
  checkLoginRateLimit,
  getClientIp,
  recordFailedLoginAttempt,
} from "@/lib/rateLimiter";
import { loginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimitResult = checkLoginRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) },
        }
      );
    }

    const adminPasswordHash = process.env.APP_PASSWORD_HASH;

    if (!adminPasswordHash) {
      return NextResponse.json(
        { success: false, error: "Server auth configuration is missing." },
        { status: 500 }
      );
    }

    const passwordMatches = await compare(parsed.data.password, adminPasswordHash);

    if (!passwordMatches) {
      recordFailedLoginAttempt(clientIp);
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = await signToken();

    const response = NextResponse.json({ success: true, token });

    // Also set as httpOnly cookie for page route protection
    response.cookies.set("nexus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
