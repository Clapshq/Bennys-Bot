import { env } from "./env.js";
import { createLogger } from "./logger.js";

const log = createLogger("cooldowns");
const buckets = new Map();

/**
 * Simpel in-memory rate limiter per bruger + nøgle.
 * Bruges til at forhindre spam af slash commands og ticket-oprettelse.
 */
export function checkCooldown(userId, key, durationMs = env.cooldownMs) {
  const bucketKey = `${userId}:${key}`;
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (existing && now < existing.until) {
    const remaining = Math.ceil((existing.until - now) / 1000);
    log.debug("Cooldown aktiv", { userId, key, remaining });
    return { allowed: false, remainingSeconds: remaining };
  }

  buckets.set(bucketKey, { until: now + durationMs });
  return { allowed: true, remainingSeconds: 0 };
}

export function resetCooldown(userId, key) {
  buckets.delete(`${userId}:${key}`);
}

export function sweepCooldowns() {
  const now = Date.now();
  let removed = 0;
  for (const [k, v] of buckets.entries()) {
    if (v.until <= now) {
      buckets.delete(k);
      removed++;
    }
  }
  return removed;
}

setInterval(() => sweepCooldowns(), 5 * 60 * 1000).unref?.();
