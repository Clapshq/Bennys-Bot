import { securityConfig } from "../config/security.js";
import { createLogger } from "../core/logger.js";
import { logSecurityEvent } from "../services/modLogService.js";

const log = createLogger("antiRaid");

const joinBuckets = new Map();
const lockdownGuilds = new Map();

function bucketKey(guildId) {
  return guildId;
}

export function recordJoin(guildId) {
  const key = bucketKey(guildId);
  const now = Date.now();
  const cfg = securityConfig.antiRaid;
  let bucket = joinBuckets.get(key) ?? [];

  bucket = bucket.filter((t) => now - t < cfg.windowMs);
  bucket.push(now);
  joinBuckets.set(key, bucket);

  return { count: bucket.length, threshold: cfg.joinThreshold, triggered: bucket.length >= cfg.joinThreshold };
}

export function isLockdownActive(guildId) {
  const until = lockdownGuilds.get(guildId);
  if (!until) return false;
  if (Date.now() > until) {
    lockdownGuilds.delete(guildId);
    return false;
  }
  return true;
}

export function activateLockdown(guildId) {
  const duration = securityConfig.antiRaid.lockdownDurationMs;
  lockdownGuilds.set(guildId, Date.now() + duration);
  return duration;
}

export function checkAccountAge(user) {
  const minDays = securityConfig.antiRaid.minAccountAgeDays;
  if (minDays <= 0) return null;

  const ageMs = Date.now() - user.createdTimestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < minDays) {
    return `Konto for ny (${Math.floor(ageDays)} dage — minimum ${minDays})`;
  }
  return null;
}

export async function handlePotentialRaid(member) {
  if (!securityConfig.antiRaid.enabled) return { action: null };

  const accountIssue = checkAccountAge(member.user);
  const { count, threshold, triggered } = recordJoin(member.guild.id);

  log.debug("Join registreret", {
    guild: member.guild.id,
    user: member.user.tag,
    count,
    threshold,
  });

  if (triggered && !isLockdownActive(member.guild.id)) {
    activateLockdown(member.guild.id);

    await logSecurityEvent(member.guild, {
      type: "antiraid",
      description: `Anti-raid aktiveret — ${count} joins på ${securityConfig.antiRaid.windowMs / 1000}s`,
      fields: [
        { name: "Seneste join", value: `${member.user}`, inline: true },
        { name: "Threshold", value: `${threshold}`, inline: true },
        { name: "Lockdown", value: "10 minutter", inline: true },
      ],
    });

    return { action: "lockdown", count, accountIssue };
  }

  if (accountIssue) return { action: "young_account", accountIssue };
  if (isLockdownActive(member.guild.id)) return { action: "lockdown_active" };

  return { action: null };
}

export async function applyRaidKick(member, reason) {
  if (!member.kickable) return false;
  await member.kick(reason).catch(() => {});
  return true;
}
