// @vitest-environment node

import { describe, it, expect } from "vitest";
import { signToken, verifyToken, extractToken } from "@/lib/auth";

process.env.JWT_SECRET = "test_secret_for_vitest_must_be_long_enough_32chars";

describe("auth utils", () => {
  it("signs and verifies a token", async () => {
    const token = await signToken();
    const payload = await verifyToken(token);
    expect(payload?.auth).toBe(true);
  });

  it("returns null for an invalid token", async () => {
    expect(await verifyToken("bad.token.here")).toBeNull();
  });

  it("extracts a Bearer token from an auth header", async () => {
    const token = await signToken();
    expect(extractToken(`Bearer ${token}`)).toBe(token);
  });

  it("returns null if header is missing or malformed", () => {
    expect(extractToken(null)).toBeNull();
    expect(extractToken("Token abc123")).toBeNull();
  });
});
