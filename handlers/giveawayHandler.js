import { EmbedBuilder } from "discord.js";
import {
  addGiveaway,
  getGiveaway,
  listGiveaways,
  listAllActiveGiveaways,
  removeGiveaway,
} from "../utils/giveawayStore.js";
import { parseDuration } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";
import { createLogger } from "../core/logger.js";
import { requestDashboardSync } from "../services/dashboardSync.js";

const log = createLogger("giveaway");
export const GIVEAWAY_EMOJI = "🎉";
const scheduled = new Map();

function pickWinners(users, count) {
  const pool = [...users.values()].filter((u) => !u.bot);
  const winners = [];
  while (pool.length > 0 && winners.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

export async function endGiveaway(client, entry, forcedBy) {
  if (!entry) return;

  scheduled.delete(entry.messageId);
  removeGiveaway(entry.guildId, entry.messageId);

  const guild = await client.guilds.fetch(entry.guildId).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(entry.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const message = await channel.messages.fetch(entry.messageId).catch(() => null);
  if (!message) return;

  const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
  const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
  const winners = users ? pickWinners(users, entry.winners) : [];

  const endedEmbed = createEmbed(winners.length ? "success" : "warning")
    .setTitle("🎉 Giveaway afsluttet")
    .setDescription(entry.prize)
    .addFields(
      { name: "Vindere", value: winners.length ? winners.map((w) => `<@${w.id}>`).join(", ") : "Ingen deltagere" },
      { name: "Afsluttet", value: forcedBy ? `Manuelt af ${forcedBy}` : "Automatisk", inline: true }
    )
    .setTimestamp();

  await message
    .edit({
      embeds: [endedEmbed],
      content: winners.length ? `🎊 Tillykke ${winners.map((w) => `<@${w.id}>`).join(", ")}!` : null,
    })
    .catch(() => {});
  requestDashboardSync(client);
}

export function scheduleGiveaway(client, entry) {
  const delay = entry.endAt - Date.now();
  if (delay <= 0) {
    endGiveaway(client, entry);
    return;
  }

  const timer = setTimeout(() => endGiveaway(client, entry), delay);
  scheduled.set(entry.messageId, timer);
}

export function restoreGiveaways(client) {
  for (const entry of listAllActiveGiveaways()) {
    if (entry.endAt <= Date.now()) endGiveaway(client, entry);
    else scheduleGiveaway(client, entry);
  }
  log.info(`Gendannet ${listAllActiveGiveaways().length} giveaway(s)`);
}

/** Start giveaway from dashboard or prefix command */
export async function startGiveawayInChannel(client, guild, channel, { duration, winners, prize, hostId, hostTag }) {
  const ms = typeof duration === "number" ? duration : parseDuration(String(duration));
  const winnerCount = Number(winners);

  if (!ms || !winnerCount || winnerCount < 1 || winnerCount > 20 || !prize?.trim()) {
    throw new Error("Ugyldig varighed, vindere eller præmie");
  }

  if (!channel?.isTextBased?.()) {
    throw new Error("Kanalen understøtter ikke beskeder");
  }

  const endAt = Date.now() + ms;
  const embed = createEmbed("gold")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(prize.trim())
    .addFields(
      { name: "Vindere", value: String(winnerCount), inline: true },
      { name: "Slutter", value: `<t:${Math.floor(endAt / 1000)}:R>`, inline: true },
      { name: "Deltag", value: `Reagér med ${GIVEAWAY_EMOJI}`, inline: false }
    )
    .setFooter({ text: hostTag ? `Oprettet af ${hostTag}` : "Oprettet via dashboard" })
    .setTimestamp(endAt);

  const giveawayMsg = await channel.send({ embeds: [embed] }).catch(() => null);
  if (!giveawayMsg) throw new Error("Kunne ikke sende giveaway-besked");

  await giveawayMsg.react(GIVEAWAY_EMOJI).catch(() => {});

  const entry = {
    guildId: guild.id,
    channelId: channel.id,
    messageId: giveawayMsg.id,
    prize: prize.trim(),
    winners: winnerCount,
    endAt,
    hostId: hostId ?? client.user.id,
  };

  addGiveaway(entry);
  scheduleGiveaway(client, entry);
  requestDashboardSync(client);

  return { messageId: giveawayMsg.id, channelId: channel.id, endAt };
}

export async function handleGiveawayPrefix(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!sub || sub === "help") {
    await message
      .reply(
        "**`,giveaway start`** `varighed vindere præmie`\n" +
          "Fx: `,giveaway start 24h 1 Gratis reparation`\n\n" +
          "**`,giveaway end`** `<besked-id>`\n" +
          "**`,giveaway list`**"
      )
      .catch(() => {});
    return true;
  }

  if (sub === "list") {
    const items = listGiveaways(message.guild.id);
    if (items.length === 0) {
      await message.reply("📭 Ingen aktive giveaways.").catch(() => {});
      return true;
    }
    await message
      .reply(items.map((g) => `• \`${g.messageId}\` — ${g.prize} (slutter <t:${Math.floor(g.endAt / 1000)}:R>)`).join("\n"))
      .catch(() => {});
    return true;
  }

  if (sub === "end") {
    const messageId = rest.split(/\s+/)[0];
    const entry = getGiveaway(message.guild.id, messageId);
    if (!entry) {
      await message.reply("❌ Giveaway ikke fundet.").catch(() => {});
      return true;
    }
    await endGiveaway(message.client, entry, message.author.tag);
    await message.reply("✅ Giveaway afsluttet.").catch(() => {});
    return true;
  }

  if (sub === "start") {
    const parts = rest.split(/\s+/);
    const durationRaw = parts[0];
    const winnersRaw = parts[1];
    const prize = parts.slice(2).join(" ");

    try {
      const result = await startGiveawayInChannel(message.client, message.guild, message.channel, {
        duration: durationRaw,
        winners: winnersRaw,
        prize,
        hostId: message.author.id,
        hostTag: message.author.tag,
      });
      await message.reply(`✅ Giveaway startet — ID: \`${result.messageId}\``).catch(() => {});
    } catch (err) {
      await message.reply(`❌ ${err.message}`).catch(() => {});
    }
    return true;
  }

  await message.reply("❌ Ukendt underkommando.").catch(() => {});
  return true;
}

export function isGiveawayCommand(command) {
  return command === "giveaway";
}
