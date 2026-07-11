import { AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { securityConfig } from "../config/security.js";
import { createLogger } from "../core/logger.js";
import { logSecurityEvent } from "../services/modLogService.js";

const log = createLogger("antiNuke");

const actionBuckets = new Map();

const AUDIT_MAP = {
  channelDelete: AuditLogEvent.ChannelDelete,
  roleDelete: AuditLogEvent.RoleDelete,
  guildBanAdd: AuditLogEvent.MemberBanAdd,
};

async function fetchExecutor(guild, auditType) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 1 });
    const entry = logs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 5000) return null;
    return entry.executor;
  } catch {
    return null;
  }
}

function recordAction(guildId, userId, actionType) {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const cfg = securityConfig.antiNuke;
  let bucket = actionBuckets.get(key) ?? [];

  bucket = bucket.filter((e) => now - e.time < cfg.windowMs);
  bucket.push({ time: now, action: actionType });
  actionBuckets.set(key, bucket);

  const destructive = bucket.filter((e) =>
    ["channelDelete", "roleDelete", "guildBanAdd"].includes(e.action)
  );

  return {
    total: bucket.length,
    destructive: destructive.length,
    triggered: destructive.length >= cfg.actionThreshold,
  };
}

async function punishExecutor(guild, executor, reason) {
  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return false;

  if (member.id === guild.ownerId) return false;
  if (!member.bannable) {
    await logSecurityEvent(guild, {
      type: "antinuke",
      description: `Kunne ikke banne ${executor.tag} — manglende rettigheder`,
      fields: [{ name: "Grund", value: reason }],
    });
    return false;
  }

  await member.ban({ reason: `[Anti-Nuke] ${reason}` });
  return true;
}

export async function handleAntiNuke(guild, actionType, targetName = "") {
  if (!securityConfig.antiNuke.enabled) return;

  const auditType = AUDIT_MAP[actionType];
  if (!auditType) return;

  const executor = await fetchExecutor(guild, auditType);
  if (!executor || executor.bot) return;

  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (member?.permissions.has(PermissionFlagsBits.Administrator)) return;

  const stats = recordAction(guild.id, executor.id, actionType);

  log.warn("Destruktiv handling registreret", {
    guild: guild.id,
    executor: executor.tag,
    action: actionType,
    destructive: stats.destructive,
  });

  if (stats.triggered) {
    const reason = `${stats.destructive} destruktive handlinger på ${securityConfig.antiNuke.windowMs / 1000}s (${actionType}: ${targetName})`;

    await logSecurityEvent(guild, {
      type: "antinuke",
      description: reason,
      fields: [
        { name: "Executor", value: `${executor}`, inline: true },
        { name: "Handling", value: actionType, inline: true },
        { name: "Mål", value: targetName || "N/A", inline: true },
      ],
    });

    if (securityConfig.antiNuke.punishAction === "ban") {
      await punishExecutor(guild, executor, reason);
    }
  }
}

export function getActionStats(guildId, userId) {
  const key = `${guildId}:${userId}`;
  return actionBuckets.get(key) ?? [];
}
