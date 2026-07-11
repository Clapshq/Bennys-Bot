const MESSAGE_LINK_RE =
  /^https?:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)\/?$/;

export function parseMessageLink(link) {
  const match = link.trim().match(MESSAGE_LINK_RE);
  if (!match) return null;
  return { guildId: match[1], channelId: match[2], messageId: match[3] };
}

export function parseChannelMention(input, guild) {
  const mention = input.match(/^<#(\d+)>$/);
  if (mention) return guild.channels.cache.get(mention[1]) ?? null;
  const byName = guild.channels.cache.find(
    (c) => c.name === input.replace(/^#/, "") || c.name === input
  );
  return byName ?? null;
}

export function parseRoleMention(input, guild) {
  const mention = input.match(/^<@&(\d+)>$/);
  if (mention) return guild.roles.cache.get(mention[1]) ?? null;
  const name = input.replace(/^@/, "").trim();
  return guild.roles.cache.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? null;
}

export function parseUserMention(input, guild) {
  const mention = input.match(/^<@!?(\d+)>$/);
  if (mention) return guild.members.cache.get(mention[1]) ?? null;
  return null;
}

/** @mention eller rå Discord-ID (17–20 cifre) */
export async function resolveGuildMember(input, guild) {
  if (!input) return null;
  const fromMention = parseUserMention(input, guild);
  if (fromMention) return fromMention;
  if (/^\d{17,20}$/.test(input.trim())) {
    return guild.members.fetch(input.trim()).catch(() => null);
  }
  return null;
}

export function parseEmoji(input, guild) {
  const trimmed = input.trim();
  const custom = trimmed.match(/^<(a)?:(\w+):(\d+)>$/);
  if (custom) return { id: custom[3], name: custom[2], animated: !!custom[1] };

  const idMatch = trimmed.match(/^(\w+):(\d+)$/);
  if (idMatch) return { id: idMatch[2], name: idMatch[1] };

  const byName = guild.emojis.cache.find((e) => e.name === trimmed.replace(/:/g, ""));
  if (byName) return byName;

  return trimmed;
}

export function emojiKey(emoji) {
  if (!emoji) return "";
  return emoji.id ?? emoji.name;
}
