import { getModLogChannel } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";
import { createCase, linkCaseToAction } from "../utils/dataStore.js";
import { createLogger } from "../core/logger.js";

const log = createLogger("modlog");

const ACTION_TITLES = {
  kick: "👢 Kick",
  ban: "🔨 Ban",
  unban: "✅ Unban",
  mute: "🔇 Mute",
  unmute: "🔊 Unmute",
  warn: "⚠️ Advarsel",
  purge: "🗑️ Purge",
  addword: "📝 Ord tilføjet",
  removeword: "📝 Ord fjernet",
  lock: "🔒 Lock",
  unlock: "🔓 Unlock",
  slowmode: "🐢 Slowmode",
  softban: "🔨 Softban",
  nick: "✏️ Nickname",
  note: "📌 Staff note",
  antiraid: "🛡️ Anti-raid",
  antinuke: "🛡️ Anti-nuke",
  automod: "🤖 Automod",
  ticket: "🎫 Ticket",
};

const ACTION_COLORS = {
  kick: "warning",
  ban: "error",
  unban: "success",
  mute: "warning",
  unmute: "success",
  warn: "warning",
  antiraid: "error",
  antinuke: "error",
  automod: "error",
  ticket: "accent",
};

/**
 * Central moderations-log med case-ID, metadata og audit trail.
 */
export async function logModAction(guild, {
  action,
  target,
  moderator,
  reason = "Ingen grund angivet",
  fields = [],
  evidence = null,
  userId = null,
}) {
  const modCase = createCase(guild.id, {
    action,
    targetId: userId ?? target?.id ?? null,
    targetTag: target?.tag ?? target?.username ?? String(target),
    moderatorId: moderator?.id,
    moderatorTag: moderator?.tag ?? moderator?.username ?? "System",
    reason,
    evidence,
    fields,
  });

  const embed = createEmbed(ACTION_COLORS[action] ?? "dark")
    .setTitle(`${ACTION_TITLES[action] ?? action} · Case #${modCase.id}`)
    .addFields(
      { name: "Mål", value: String(target), inline: true },
      { name: "Moderator", value: String(moderator), inline: true },
      { name: "Grund", value: reason.slice(0, 1024), inline: false }
    )
    .setFooter({ text: `Case #${modCase.id} · Benny's Moderation` })
    .setTimestamp();

  for (const field of fields) embed.addFields(field);
  if (evidence) embed.addFields({ name: "Bevis", value: evidence.slice(0, 1024) });

  const channel = getModLogChannel(guild);
  if (channel) {
    await channel.send({ embeds: [embed] }).catch((err) => {
      log.error("Kunne ikke sende modlog", { error: err.message });
    });
  }

  log.info("Mod action logged", { caseId: modCase.id, action, guild: guild.id });
  return modCase;
}

export async function logSecurityEvent(guild, { type, description, fields = [], severity = "warn" }) {
  return logModAction(guild, {
    action: type,
    target: "Server",
    moderator: "Benny's Security",
    reason: description,
    fields,
  });
}

export { linkCaseToAction };
