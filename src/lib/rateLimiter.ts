import { NextRequest } from "next/server";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

type AttemptEntry = {
  count: number;
  windowStartedAt: number;
  lastSeenAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const failedAttempts = new Map<string, AttemptEntry>();
let lastCleanupAt = Date.now();

function cleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of failedAttempts.entries()) {
    if (now - entry.lastSeenAt > WINDOW_MS * 2) {
      failedAttempts.delete(key);
    }
  }

  lastCleanupAt = now;
}

function getRateLimitKey(ip: string) {
  return ip || "unknown";
}

export function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");

  if (forwarded) {
    const firstForwardedIp = forwarded.split(",")[0]?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  const realIp = req.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  const cloudflareIp = req.headers.get("cf-connecting-ip");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  return "unknown";
}

export function checkLoginRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const key = getRateLimitKey(ip);

  cleanupExpiredEntries(now);

  const entry = failedAttempts.get(key);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (now - entry.windowStartedAt >= WINDOW_MS) {
    failedAttempts.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.windowStartedAt + WINDOW_MS - now) / 1000)
    );

    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(ip: string) {
  const now = Date.now();
  const key = getRateLimitKey(ip);

  cleanupExpiredEntries(now);

  const existingEntry = failedAttempts.get(key);

  if (!existingEntry || now - existingEntry.windowStartedAt >= WINDOW_MS) {
    failedAttempts.set(key, {
      count: 1,
      windowStartedAt: now,
      lastSeenAt: now,
    });

    return;
  }

  existingEntry.count += 1;
  existingEntry.lastSeenAt = now;
  failedAttempts.set(key, existingEntry);
}
