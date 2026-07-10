import fs from "fs";
import { emojiKey } from "./discordLinks.js";
import { dataFile } from "./paths.js";

const FILE = dataFile("reaction-roles.json");

function readStore() {
  if (!fs.existsSync(FILE)) {
    const empty = { guilds: {} };
    fs.writeFileSync(FILE, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { guilds: {} };
  }
}

function writeStore(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

function messageKey(channelId, messageId) {
  return `${channelId}:${messageId}`;
}

export function listReactionRoles(guildId) {
  const bucket = readStore().guilds[guildId] ?? {};
  return Object.entries(bucket).flatMap(([key, entries]) => {
    const [channelId, messageId] = key.split(":");
    return entries.map((e) => ({ channelId, messageId, ...e }));
  });
}

export function getMessageReactionRoles(guildId, channelId, messageId) {
  const bucket = readStore().guilds[guildId] ?? {};
  return bucket[messageKey(channelId, messageId)] ?? [];
}

export function findReactionRole(guildId, channelId, messageId, emoji) {
  const key = emojiKey(emoji);
  return getMessageReactionRoles(guildId, channelId, messageId).find((e) => e.emojiKey === key) ?? null;
}

export function addReactionRole(guildId, channelId, messageId, emoji, roleId) {
  const data = readStore();
  if (!data.guilds[guildId]) data.guilds[guildId] = {};

  const mk = messageKey(channelId, messageId);
  const entries = data.guilds[guildId][mk] ?? [];
  const eKey = emojiKey(emoji);

  if (entries.some((e) => e.emojiKey === eKey)) {
    return { ok: false, error: "Den emoji er allerede sat på den besked." };
  }

  entries.push({
    emojiKey: eKey,
    emoji: typeof emoji === "string" ? { name: emoji } : { id: emoji.id, name: emoji.name, animated: emoji.animated },
    roleId,
  });
  data.guilds[guildId][mk] = entries;
  writeStore(data);
  return { ok: true };
}

export function removeReactionRole(guildId, channelId, messageId, emoji) {
  const data = readStore();
  const mk = messageKey(channelId, messageId);
  const entries = data.guilds[guildId]?.[mk];
  if (!entries?.length) return { ok: false, error: "Ingen reaction roles på den besked." };

  const eKey = emojiKey(emoji);
  const filtered = entries.filter((e) => e.emojiKey !== eKey);
  if (filtered.length === entries.length) return { ok: false, error: "Emoji ikke fundet på beskeden." };

  if (filtered.length === 0) delete data.guilds[guildId][mk];
  else data.guilds[guildId][mk] = filtered;
  writeStore(data);
  return { ok: true };
}

export function removeAllReactionRoles(guildId, channelId, messageId) {
  const data = readStore();
  const mk = messageKey(channelId, messageId);
  if (!data.guilds[guildId]?.[mk]) return { ok: false, error: "Ingen reaction roles på den besked." };
  delete data.guilds[guildId][mk];
  writeStore(data);
  return { ok: true, count: 1 };
}

export function resetReactionRoles(guildId) {
  const data = readStore();
  const count = Object.keys(data.guilds[guildId] ?? {}).length;
  if (count === 0) return { ok: false, error: "Ingen reaction roles at nulstille." };
  delete data.guilds[guildId];
  writeStore(data);
  return { ok: true, count };
}
