import { PermissionFlagsBits } from "discord.js";
import { memberHasStaffRole, memberHasLedelseRole } from "../config/roles.js";
import { createEmbed } from "./brand.js";

export function isStaffMember(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return memberHasStaffRole(member);
}

export function isLedelseMember(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return memberHasLedelseRole(member);
}

export function hasModPermission(member) {
  if (!member) return false;
  return (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    isStaffMember(member)
  );
}

export function canModerate(executorMember, targetMember) {
  if (!executorMember || !targetMember) return { ok: false, error: "Medlem ikke fundet" };
  if (targetMember.id === executorMember.id) return { ok: false, error: "Du kan ikke moderere dig selv" };
  if (targetMember.id === executorMember.guild.ownerId) return { ok: false, error: "Du kan ikke moderere serverejeren" };
  if (targetMember.user?.bot && targetMember.id === executorMember.guild.members.me?.id) {
    return { ok: false, error: "Du kan ikke moderere botten" };
  }

  if (
    executorMember.roles.highest.position <= targetMember.roles.highest.position &&
    executorMember.id !== executorMember.guild.ownerId
  ) {
    return { ok: false, error: "Du har ikke høj nok rolle til at moderere denne bruger" };
  }

  return { ok: true };
}

export function getModLogChannel(guild) {
  return guild.channels.cache.find((c) => c.name === "📋-mod-log");
}

export function getTicketLogChannel(guild) {
  return guild.channels.cache.find((c) => c.name === "📜-ticket-logs");
}

export async function sendModLog(guild, embed) {
  const channel = getModLogChannel(guild);
  if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
}

export function modActionEmbed(action, { target, moderator, reason, extra = [] }) {
  const colors = {
    kick: "warning",
    ban: "error",
    unban: "success",
    mute: "warning",
    unmute: "success",
    warn: "warning",
    purge: "dark",
    addword: "blue",
    removeword: "blue",
    lock: "error",
    unlock: "success",
    slowmode: "blue",
  };

  const embed = createEmbed(colors[action] ?? "dark")
    .setTitle(`🛡️ ${action.toUpperCase()}`)
    .addFields(
      { name: "Bruger", value: `${target}`, inline: true },
      { name: "Moderator", value: `${moderator}`, inline: true },
      { name: "Grund", value: reason || "Ingen angivet", inline: false }
    )
    .setTimestamp();

  for (const field of extra) embed.addFields(field);
  return embed;
}

export function parseDuration(input) {
  if (!input) return null;
  const match = input.trim().match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  const ms = amount * multipliers[unit];
  if (ms < 1000 || ms > 28 * 24 * 60 * 60 * 1000) return null;
  return ms;
}

export function formatDuration(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)} sek`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} timer`;
  return `${Math.round(ms / 86_400_000)} dage`;
}
