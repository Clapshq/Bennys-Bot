import { EmbedBuilder } from "discord.js";
import {
  listWelcomeMessages,
  listGoodbyeMessages,
  listBoostMessages,
  addWelcomeMessage,
  addGoodbyeMessage,
  addBoostMessage,
  removeWelcomeMessage,
  removeGoodbyeMessage,
  removeBoostMessage,
  getWelcomeMessage,
  getGoodbyeMessage,
  getBoostMessage,
} from "../utils/guildMessageStore.js";
import { parseChannelMention } from "../utils/discordLinks.js";
import { parseEmbedCode } from "../utils/embedCodeParser.js";
import { applyBleedVariables, applyBleedVariablesToEmbed } from "../utils/bleedVariables.js";
import { createEmbed } from "../utils/brand.js";

const SYSTEM_TYPES = {
  welcome: {
    label: "Velkommen",
    list: listWelcomeMessages,
    get: getWelcomeMessage,
    add: addWelcomeMessage,
    remove: removeWelcomeMessage,
  },
  goodbye: {
    label: "Farvel",
    list: listGoodbyeMessages,
    get: getGoodbyeMessage,
    add: addGoodbyeMessage,
    remove: removeGoodbyeMessage,
  },
  boost: {
    label: "Boost",
    list: listBoostMessages,
    get: getBoostMessage,
    add: addBoostMessage,
    remove: removeBoostMessage,
  },
};

function parseSubArgs(args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();
  return { sub, rest };
}

async function sendSystemMessage(channel, config, context) {
  if (!channel || !config) return;

  const ctx = { ...context, channel };
  let content = config.content ? applyBleedVariables(config.content, ctx) : null;

  if (config.embedData) {
    const embed = applyBleedVariablesToEmbed(EmbedBuilder.from(config.embedData), ctx);
    await channel.send({ content, embeds: [embed] }).catch(() => {});
    return;
  }

  if (content) await channel.send({ content }).catch(() => {});
}

function parseAddPayload(rest, guild) {
  const channelToken = rest.split(/\s+/)[0];
  const channel = parseChannelMention(channelToken, guild);
  if (!channel) return { ok: false, error: "Kanal ikke fundet. Brug #kanal." };

  const messagePart = rest.slice(channelToken.length).trim();
  if (!messagePart) return { ok: false, error: "Skriv besked eller `{embed}$v{...}` efter kanalen." };

  if (messagePart.includes("{")) {
    const embedResult = parseEmbedCode(messagePart);
    if (embedResult.ok) {
      return {
        ok: true,
        channel,
        config: {
          content: embedResult.content ?? null,
          embedData: embedResult.embed?.toJSON() ?? null,
          raw: messagePart,
        },
      };
    }
  }

  return {
    ok: true,
    channel,
    config: { content: messagePart, embedData: null, raw: messagePart },
  };
}

export async function handleSystemMessagePrefix(message, args, type) {
  const cfg = SYSTEM_TYPES[type];
  const { sub, rest } = parseSubArgs(args);

  if (!sub || sub === "help") {
    const embed = createEmbed("discord")
      .setTitle(`👋 ${cfg.label} (Bleed-stil)`)
      .setDescription(
        `**,${type} add** \`#kanal\` \`besked eller {embed}$v{...}\`\n` +
          `**,${type} remove** \`#kanal\`\n` +
          `**,${type} view** \`#kanal\`\n` +
          `**,${type} list**\n\n` +
          "Variabler: `{user}` `{user.mention}` `{guild.name}` `{guild.count}`"
      );
    await message.reply({ embeds: [embed] }).catch(() => {});
    return true;
  }

  if (sub === "list") {
    const items = cfg.list(message.guild.id);
    if (items.length === 0) {
      await message.reply(`📭 Ingen ${type}-beskeder.`).catch(() => {});
      return true;
    }
    await message
      .reply(items.map((i) => `• <#${i.channelId}>`).join("\n"))
      .catch(() => {});
    return true;
  }

  if (sub === "view") {
    const channel = parseChannelMention(rest.split(/\s+/)[0], message.guild);
    if (!channel) {
      await message.reply("❌ Angiv #kanal.").catch(() => {});
      return true;
    }
    const entry = cfg.get(message.guild.id, channel.id);
    if (!entry) {
      await message.reply("❌ Ingen besked for den kanal.").catch(() => {});
      return true;
    }
    await message.reply(`\`\`\`${entry.raw ?? entry.content ?? "(embed)"}\`\`\``).catch(() => {});
    return true;
  }

  if (sub === "remove") {
    const channel = parseChannelMention(rest.split(/\s+/)[0], message.guild);
    if (!channel) {
      await message.reply("❌ Angiv #kanal.").catch(() => {});
      return true;
    }
    const result = cfg.remove(message.guild.id, channel.id);
    await message.reply(result.ok ? `✅ ${cfg.label} fjernet fra ${channel}.` : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "add" || sub === "set") {
    const parsed = parseAddPayload(rest, message.guild);
    if (!parsed.ok) {
      await message.reply(`❌ ${parsed.error}`).catch(() => {});
      return true;
    }
    cfg.add(message.guild.id, parsed.channel.id, parsed.config);
    await message.reply(`✅ ${cfg.label} tilføjet i ${parsed.channel}.`).catch(() => {});
    return true;
  }

  await message.reply(`❌ Brug \`,${type} help\`.`).catch(() => {});
  return true;
}

export async function dispatchSystemMessages(guildId, type, member) {
  const cfg = SYSTEM_TYPES[type];
  const entries = cfg.list(guildId);
  for (const entry of entries) {
    const channel = member.guild.channels.cache.get(entry.channelId);
    await sendSystemMessage(channel, entry, { member, guild: member.guild });
  }
}

export function isWelcomeCommand(command) {
  return command === "welcome";
}

export function isGoodbyeCommand(command) {
  return command === "goodbye";
}

export function isBoostCommand(command) {
  return command === "boost";
}
