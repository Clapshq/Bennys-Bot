import { EmbedBuilder } from "discord.js";
import {
  addAutoresponder,
  removeAutoresponder,
  listAutoresponders,
  resetAutoresponders,
  getStickyConfig,
  setStickyConfig,
  clearStickyConfig,
  updateStickyMessageId,
} from "../utils/guildMessageStore.js";
import { parseChannelMention, parseRoleMention, parseUserMention, resolveGuildMember } from "../utils/discordLinks.js";
import { parseEmbedCode } from "../utils/embedCodeParser.js";
import { applyBleedVariables, applyBleedVariablesToEmbed } from "../utils/bleedVariables.js";
import { formatDuration, hasModPermission } from "../utils/modHelpers.js";
import { modSetNick } from "./manualModerationHandler.js";
import { createEmbed } from "../utils/brand.js";
import { getSnipe } from "./snipeHandler.js";

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function bleedCtx(message) {
  return { member: message.member, guild: message.guild, channel: message.channel };
}

function buildBleedPayload(embedResult, ctx) {
  const payload = {};
  if (embedResult.content) payload.content = applyBleedVariables(embedResult.content, ctx);
  if (embedResult.embed) payload.embeds = [applyBleedVariablesToEmbed(embedResult.embed, ctx)];
  return payload;
}

export async function handlePollPrefix(message, args) {
  const parts = args.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) {
    await message.reply("❌ Brug: `,poll Spørgsmål | Valg 1 | Valg 2` (op til 10 valg).").catch(() => {});
    return true;
  }

  const question = parts[0];
  const options = parts.slice(1, 11);
  const desc = options.map((o, i) => `${POLL_EMOJIS[i]} ${o}`).join("\n");

  const embed = createEmbed("blue").setTitle(`📊 ${question}`).setDescription(desc);
  const pollMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
  if (!pollMsg) return true;

  for (let i = 0; i < options.length; i++) {
    await pollMsg.react(POLL_EMOJIS[i]).catch(() => {});
  }
  await message.delete().catch(() => {});
  return true;
}

export async function handleRolePrefix(message, args) {
  if (!hasModPermission(message.member)) {
    await message.reply("❌ Du har ikke tilladelse.").catch(() => {});
    return true;
  }

  const parts = args.split(/\s+/);
  const sub = parts[0]?.toLowerCase();
  const user = parseUserMention(parts[1], message.guild);
  const role = parseRoleMention(parts.slice(2).join(" "), message.guild);

  if (!sub || !["add", "remove", "give", "take"].includes(sub)) {
    await message.reply("❌ Brug: `,role add @bruger @rolle` eller `,role remove @bruger @rolle`.").catch(() => {});
    return true;
  }

  if (!user || !role) {
    await message.reply("❌ Brug @mention for bruger og rolle.").catch(() => {});
    return true;
  }

  const adding = sub === "add" || sub === "give";
  if (adding) await user.roles.add(role, `Prefix role af ${message.author.tag}`).catch(() => {});
  else await user.roles.remove(role, `Prefix role af ${message.author.tag}`).catch(() => {});

  await message.reply(`✅ **${role.name}** ${adding ? "givet til" : "fjernet fra"} ${user}.`).catch(() => {});
  return true;
}

export async function handleNicknamePrefix(message, args) {
  if (!hasModPermission(message.member)) {
    await message.reply("❌ Du har ikke tilladelse.").catch(() => {});
    return true;
  }

  const parts = args.trim().split(/\s+/);
  const idOrMention = parts[0];
  const nickname = parts.slice(1).join(" ").trim();

  if (!idOrMention) {
    await message
      .reply("❌ Brug: `,nickname <discord-id> <nyt navn>` — fx `,nickname 123456789012345678 Benny Mekaniker`.")
      .catch(() => {});
    return true;
  }

  const member = await resolveGuildMember(idOrMention, message.guild);
  if (!member) {
    await message.reply("❌ Medlem ikke fundet — tjek Discord-ID eller @mention.").catch(() => {});
    return true;
  }

  if (!nickname) {
    await message.reply("❌ Angiv et nyt navn efter ID'et.").catch(() => {});
    return true;
  }

  if (nickname.length > 32) {
    await message.reply("❌ Nickname må max være 32 tegn.").catch(() => {});
    return true;
  }

  const resetWords = ["reset", "clear", "fjern", "none"];
  const newNick = resetWords.includes(nickname.toLowerCase()) ? null : nickname;

  const result = await modSetNick(
    message.guild,
    message.member,
    member.user,
    newNick,
    `Prefix nickname af ${message.author.tag}`
  );

  if (!result.ok) {
    await message.reply(`❌ ${result.error}`).catch(() => {});
    return true;
  }

  await message
    .reply(`✏️ Nickname for **${member.user.tag}** sat til **${newNick ?? "(fjernet)"}**.`)
    .catch(() => {});
  return true;
}

export async function handleSayPrefix(message, args) {
  const channelToken = args.split(/\s+/)[0];
  const channel = parseChannelMention(channelToken, message.guild) ?? message.channel;
  const text = args.slice(channelToken.length).trim();

  if (!text) {
    await message.reply("❌ Brug: `,say #kanal besked`.").catch(() => {});
    return true;
  }

  const embedResult = parseEmbedCode(text);
  if (embedResult.ok) {
    await channel.send(buildBleedPayload(embedResult, bleedCtx(message))).catch(() => {});
  } else {
    await channel.send({ content: applyBleedVariables(text, bleedCtx(message)) }).catch(() => {});
  }
  await message.delete().catch(() => {});
  return true;
}

export async function handleSnipePrefix(message) {
  const snipe = getSnipe(message.channel.id);
  if (!snipe) {
    await message.reply("🔭 Intet at snipe i denne kanal.").catch(() => {});
    return true;
  }

  const embed = createEmbed("dark")
    .setAuthor({ name: snipe.authorTag })
    .setDescription(snipe.content || "*Ingen tekst*")
    .setFooter({ text: `Slettet for ${formatDuration(Date.now() - snipe.deletedAt)} siden` })
    .setTimestamp(snipe.createdAt);

  if (snipe.attachmentUrl) embed.setImage(snipe.attachmentUrl);

  await message.reply({ embeds: [embed] }).catch(() => {});
  return true;
}

export async function handleAutoresponderPrefix(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!sub || sub === "help") {
    await message
      .reply(
        "**`,autoresponder add`** `trigger, svar` (Bleed)\n" +
          "**`,autoresponder remove`** `trigger`\n" +
          "**`,autoresponder list`** · **`,autoresponder reset`**"
      )
      .catch(() => {});
    return true;
  }

  if (sub === "reset") {
    const result = resetAutoresponders(message.guild.id);
    await message.reply(result.ok ? "🗑️ Alle autoresponders fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "list") {
    const items = listAutoresponders(message.guild.id);
    if (items.length === 0) {
      await message.reply("📭 Ingen autoresponders.").catch(() => {});
      return true;
    }
    await message.reply(items.map((a) => `• \`${a.trigger}\` → ${(a.response ?? a.content ?? "embed").slice(0, 60)}`).join("\n")).catch(() => {});
    return true;
  }

  if (sub === "remove") {
    const result = removeAutoresponder(message.guild.id, rest.split(/\s+/)[0]);
    await message.reply(result.ok ? "✅ Autoresponder fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "add") {
    const comma = rest.indexOf(",");
    const pipe = rest.indexOf("|");
    let trigger;
    let response;

    if (comma !== -1) {
      trigger = rest.slice(0, comma).trim();
      response = rest.slice(comma + 1).trim();
    } else if (pipe !== -1) {
      trigger = rest.slice(0, pipe).trim();
      response = rest.slice(pipe + 1).trim();
    } else {
      await message.reply("❌ Brug: `,autoresponder add trigger, svar`.").catch(() => {});
      return true;
    }

    const embedResult = parseEmbedCode(response.includes("{") ? response : response);
    const result = addAutoresponder(
      message.guild.id,
      trigger,
      embedResult.ok ? null : response,
      embedResult.ok ? embedResult.embed?.toJSON() ?? null : null,
      embedResult.ok ? embedResult.content ?? null : null
    );
    await message.reply(result.ok ? `✅ Autoresponder \`${trigger}\` oprettet.` : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  await message.reply("❌ Ukendt underkommando.").catch(() => {});
  return true;
}

export async function handleStickyPrefix(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!sub || sub === "help") {
    await message.reply("**,sticky set** `embed-kode eller tekst` · **,sticky remove**").catch(() => {});
    return true;
  }

  if (sub === "remove") {
    clearStickyConfig(message.guild.id, message.channel.id);
    await message.reply("✅ Sticky fjernet fra denne kanal.").catch(() => {});
    return true;
  }

  if (sub === "set") {
    if (!rest) {
      await message.reply("❌ Skriv besked eller embed-kode efter `set`.").catch(() => {});
      return true;
    }

    const embedResult = parseEmbedCode(rest);
    const config = embedResult.ok
      ? { embedData: embedResult.embed.toJSON(), content: null, messageId: null }
      : { content: rest, embedData: null, messageId: null };

    setStickyConfig(message.guild.id, message.channel.id, config);
    await repostSticky(message.guild, message.channel.id);
    await message.reply("✅ Sticky sat i denne kanal.").catch(() => {});
    return true;
  }

  return false;
}

export async function repostSticky(guild, channelId) {
  const config = getStickyConfig(guild.id, channelId);
  if (!config) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased?.()) return;

  if (config.messageId) {
    const old = await channel.messages.fetch(config.messageId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  let sent;
  const ctx = { guild, channel };
  if (config.embedData) {
    sent = await channel
      .send({ embeds: [applyBleedVariablesToEmbed(EmbedBuilder.from(config.embedData), ctx)] })
      .catch(() => null);
  } else if (config.content) {
    sent = await channel.send({ content: applyBleedVariables(config.content, ctx) }).catch(() => null);
  }

  if (sent) updateStickyMessageId(guild.id, channelId, sent.id);
}

export async function checkAutoresponder(message) {
  if (message.author.bot || !message.guild) return false;

  const content = message.content.toLowerCase();
  if (!content) return false;

  const responders = listAutoresponders(message.guild.id);
  const match = responders.find((a) => content.includes(a.trigger));
  if (!match) return false;

  if (match.embedData || match.content) {
    const ctx = bleedCtx(message);
    const payload = {};
    if (match.content) payload.content = applyBleedVariables(match.content, ctx);
    if (match.embedData) {
      payload.embeds = [applyBleedVariablesToEmbed(EmbedBuilder.from(match.embedData), ctx)];
    }
    await message.channel.send(payload).catch(() => {});
  } else if (match.response) {
    await message.channel.send({ content: applyBleedVariables(match.response, bleedCtx(message)) }).catch(() => {});
  }
  return true;
}

export async function handleReactionPrefix(message, args) {
  const parts = args.split(/\s+/);
  const sub = parts[0]?.toLowerCase();

  if (sub === "add" && parts.length >= 3) {
    const trigger = parts[1].toLowerCase();
    const emojiRaw = parts.slice(2).join(" ");
    if (trigger.length < 3) {
      await message.reply("❌ Trigger skal være mindst 3 tegn.").catch(() => {});
      return true;
    }
    const { parseEmoji } = await import("../utils/discordLinks.js");
    const emoji = parseEmoji(emojiRaw, message.guild);
    const { addReactionTrigger } = await import("../utils/reactionTriggerStore.js");
    const result = addReactionTrigger(message.guild.id, trigger, emoji);
    if (!result.ok) {
      await message.reply(`❌ ${result.error}`).catch(() => {});
      return true;
    }
    await message.reply(`✅ Bot reagerer med ${emojiRaw} når nogen skriver \`${trigger}\`.`).catch(() => {});
    return true;
  }

  if (sub === "list") {
    const { listReactionTriggers } = await import("../utils/reactionTriggerStore.js");
    const items = listReactionTriggers(message.guild.id);
    if (items.length === 0) {
      await message.reply("📭 Ingen reaction triggers.").catch(() => {});
      return true;
    }
    await message.reply(items.map((t) => `• \`${t.trigger}\` → ${t.emoji.name ?? t.emojiKey}`).join("\n")).catch(() => {});
    return true;
  }

  if (sub === "remove" && parts[1]) {
    const { removeReactionTrigger } = await import("../utils/reactionTriggerStore.js");
    const result = removeReactionTrigger(message.guild.id, parts[1]);
    await message.reply(result.ok ? "✅ Reaction trigger fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "reset") {
    const { resetReactionTriggers } = await import("../utils/reactionTriggerStore.js");
    resetReactionTriggers(message.guild.id);
    await message.reply("🗑️ Alle reaction triggers fjernet.").catch(() => {});
    return true;
  }

  await message
    .reply("**,reaction add** `ord emoji` · **,reaction list** · **,reaction remove** `ord` · **,reaction reset**")
    .catch(() => {});
  return true;
}

export async function checkReactionTrigger(message) {
  if (message.author.bot || !message.guild || !message.content) return false;

  const { findReactionTrigger } = await import("../utils/reactionTriggerStore.js");
  const match = findReactionTrigger(message.guild.id, message.content);
  if (!match) return false;

  await message.react(match.emoji).catch(() => {});
  return true;
}
