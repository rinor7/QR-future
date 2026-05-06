import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Window = `${number} ${"s" | "m" | "h" | "d"}`;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

function make(name: string, requests: number, window: Window): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `rl:${name}`,
    analytics: false,
  });
}

export const limiters = {
  scan:        make("scan",        60, "1 m"),
  interaction: make("interaction", 30, "1 m"),
  lead:        make("lead",         3, "1 h"),
  places:      make("places",      20, "1 m"),
};

export function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function rateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ ok: boolean }> {
  if (!limiter) return { ok: true };
  const result = await limiter.limit(identifier);
  return { ok: result.success };
}
