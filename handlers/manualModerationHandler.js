import { PermissionFlagsBits } from "discord.js";
import {
  addWarning,
  clearWarnings,
  getWarnings,
  addBlockedWord,
  removeBlockedWord,
  getExtraBlockedWords,
  getCase,
  getUserCases,
  addStaffNote,
  getStaffNotes,
} from "../utils/dataStore.js";
import { logModAction } from "../services/modLogService.js";
import { moderation, getAllBlockedWords } from "../config/moderation.js";
import {
  canModerate,
  formatDuration,
  modActionEmbed,
  parseDuration,
  sendModLog,
} from "../utils/modHelpers.js";

const WARN_MUTE_THRESHOLD = 3;
const WARN_MUTE_DURATION = 60 * 60 * 1000; // 1 time

async function resolveMember(guild, userOption) {
  const member = await guild.members.fetch(userOption.id).catch(() => null);
  return member;
}

async function resolveExecutor(guild, executor) {
  if (executor.roles) return executor;
  return guild.members.fetch(executor.id).catch(() => null);
}

export async function modKick(guild, executor, target, reason) {
  const execMember = await resolveExecutor(guild, executor);
  if (!execMember) return { ok: false, error: "Kunne ikke finde dig som medlem" };

  const member = await resolveMember(guild, target);
  if (!member) return { ok: false, error: "Medlem ikke fundet på serveren" };

  const check = canModerate(execMember, member);
  if (!check.ok) return check;

  if (!member.kickable) return { ok: false, error: "Kan ikke kick denne bruger (manglende rettigheder)" };

  await member.kick(reason);
  await logModAction(guild, {
    action: "kick",
    target,
    moderator: executor,
    reason,
    userId: target.id,
  });
  return { ok: true };
}

export async function modBan(guild, executor, target, reason, deleteDays = 0) {
  const execMember = await resolveExecutor(guild, executor);
  if (!execMember) return { ok: false, error: "Kunne ikke finde dig som medlem" };

  const member = await resolveMember(guild, target).catch(() => null);

  if (member) {
    const check = canModerate(execMember, member);
    if (!check.ok) return check;
    if (!member.bannable) return { ok: false, error: "Kan ikke banne denne bruger" };
  }

  await guild.members.ban(target.id, { reason, deleteMessageSeconds: deleteDays * 24 * 60 * 60 });
  await logModAction(guild, {
    action: "ban",
    target,
    moderator: executor,
    reason,
    userId: target.id,
  });
  return { ok: true };
}

export async function modUnban(guild, executor, userId, reason) {
  await guild.members.unban(userId, reason);
  await logModAction(guild, {
    action: "unban",
    target: `<@${userId}>`,
    moderator: executor,
    reason,
    userId,
  });
  return { ok: true };
}

export async function modMute(guild, executor, target, durationMs, reason) {
  const execMember = await resolveExecutor(guild, executor);
  if (!execMember) return { ok: false, error: "Kunne ikke finde dig som medlem" };

  const member = await resolveMember(guild, target);
  if (!member) return { ok: false, error: "Medlem ikke fundet" };

  const check = canModerate(execMember, member);
  if (!check.ok) return check;

  if (!member.moderatable) return { ok: false, error: "Kan ikke mute denne bruger" };

  await member.timeout(durationMs, reason);
  await logModAction(guild, {
    action: "mute",
    target,
    moderator: executor,
    reason,
    userId: target.id,
    fields: [{ name: "Varighed", value: formatDuration(durationMs), inline: true }],
  });
  return { ok: true };
}

export async function modUnmute(guild, executor, target, reason) {
  const execMember = await resolveExecutor(guild, executor);
  if (!execMember) return { ok: false, error: "Kunne ikke finde dig som medlem" };

  const member = await resolveMember(guild, target);
  if (!member) return { ok: false, error: "Medlem ikke fundet" };

  const check = canModerate(execMember, member);
  if (!check.ok) return check;

  await member.timeout(null, reason);
  await logModAction(guild, {
    action: "unmute",
    target,
    moderator: executor,
    reason,
    userId: target.id,
  });
  return { ok: true };
}

export async function modWarn(guild, executor, target, reason) {
  const execMember = await resolveExecutor(guild, executor);
  if (!execMember) return { ok: false, error: "Kunne ikke finde dig som medlem" };

  const member = await resolveMember(guild, target);
  if (!member) return { ok: false, error: "Medlem ikke fundet" };

  const check = canModerate(execMember, member);
  if (!check.ok) return check;

  const { entry, total } = addWarning(guild.id, target.id, {
    reason,
    moderatorId: executor.id,
    moderatorTag: execMember.user?.tag ?? executor.tag ?? "Ukendt",
  });

  await logModAction(guild, {
    action: "warn",
    target,
    moderator: executor,
    reason,
    userId: target.id,
    fields: [
      { name: "Advarsel #", value: `${entry.id}`, inline: true },
      { name: "Total", value: `${total}`, inline: true },
    ],
  });

  let autoMuted = false;
  if (total >= WARN_MUTE_THRESHOLD && member.moderatable && !member.communicationDisabledUntil) {
    await member.timeout(WARN_MUTE_DURATION, `Auto-mute: ${total} advarsler`);
    autoMuted = true;
  }

  return { ok: true, total, autoMuted };
}

export async function modClearWarns(guild, executor, target) {
  const count = clearWarnings(guild.id, target.id);
  await logModAction(guild, {
    action: "warn",
    target,
    moderator: executor,
    reason: `Alle advarsler slettet (${count} stk.)`,
    userId: target.id,
  });
  return { ok: true, count };
}

export async function modAddWord(word) {
  return addBlockedWord(word);
}

export async function modRemoveWord(word) {
  return removeBlockedWord(word);
}

export function modListWords() {
  const base = moderation.blockedWords;
  const extra = getExtraBlockedWords();
  return { base, extra, total: base.length + extra.length };
}

export async function modSlowmode(channel, seconds, executor) {
  await channel.setRateLimitPerUser(seconds, `Slowmode af ${executor.tag}`);
  await sendModLog(
    channel.guild,
    modActionEmbed("slowmode", {
      target: `${channel}`,
      moderator: `${executor}`,
      reason: seconds ? `${seconds} sekunder` : "Slået fra",
    })
  );
  return { ok: true };
}

export async function modLock(channel, executor, reason) {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: false,
  });
  await sendModLog(
    channel.guild,
    modActionEmbed("lock", { target: `${channel}`, moderator: `${executor}`, reason })
  );
  return { ok: true };
}

export async function modUnlock(channel, executor, reason) {
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: null,
  });
  await sendModLog(
    channel.guild,
    modActionEmbed("unlock", { target: `${channel}`, moderator: `${executor}`, reason })
  );
  return { ok: true };
}

export async function modSoftban(guild, executor, target, reason, deleteDays = 1) {
  const result = await modBan(guild, executor, target, `[Softban] ${reason}`, deleteDays);
  if (!result.ok) return result;
  setTimeout(async () => {
    await guild.members.unban(target.id, "Softban udløbet").catch(() => {});
  }, 24 * 60 * 60 * 1000);
  return { ok: true };
}

export async function modSetNick(guild, executor, target, nickname, reason) {
  const execMember = await resolveExecutor(guild, executor);
  const member = await resolveMember(guild, target);
  if (!execMember || !member) return { ok: false, error: "Medlem ikke fundet" };
  const check = canModerate(execMember, member);
  if (!check.ok) return check;
  if (!member.manageable) return { ok: false, error: "Kan ikke ændre nickname" };

  await member.setNickname(nickname, reason);
  await logModAction(guild, {
    action: "nick",
    target,
    moderator: executor,
    reason,
    userId: target.id,
    fields: [{ name: "Nyt navn", value: nickname || "(fjernet)", inline: true }],
  });
  return { ok: true };
}

export function modGetHistory(guildId, userId) {
  return {
    warnings: getWarnings(guildId, userId),
    cases: getUserCases(guildId, userId),
    notes: getStaffNotes(guildId, userId),
  };
}

export function modLookupCase(guildId, caseId) {
  return getCase(guildId, caseId);
}

export async function modAddNote(guild, executor, target, note) {
  const entry = addStaffNote(guild.id, target.id, {
    note,
    moderatorId: executor.id,
    moderatorTag: executor.tag ?? "Ukendt",
  });
  await logModAction(guild, {
    action: "note",
    target,
    moderator: executor,
    reason: note,
    userId: target.id,
    fields: [{ name: "Note #", value: `${entry.id}`, inline: true }],
  });
  return { ok: true, entry };
}

export { getWarnings, parseDuration, formatDuration };
