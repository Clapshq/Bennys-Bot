import fs from "fs";
import { emojiKey } from "./discordLinks.js";
import { dataFile } from "./paths.js";

const FILE = dataFile("reaction-triggers.json");

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

export function listReactionTriggers(guildId) {
  return readStore().guilds[guildId] ?? [];
}

export function findReactionTrigger(guildId, content) {
  const lower = content.toLowerCase();
  const triggers = listReactionTriggers(guildId);
  return triggers.find((t) => lower.includes(t.trigger)) ?? null;
}

export function addReactionTrigger(guildId, trigger, emoji) {
  const data = readStore();
  if (!data.guilds[guildId]) data.guilds[guildId] = [];
  const key = trigger.toLowerCase().trim();
  if (key.length < 3) return { ok: false, error: "Trigger skal være mindst 3 tegn." };
  if (data.guilds[guildId].some((t) => t.trigger === key)) {
    return { ok: false, error: "Trigger findes allerede." };
  }
  data.guilds[guildId].push({
    trigger: key,
    emojiKey: emojiKey(emoji),
    emoji: typeof emoji === "string" ? { name: emoji } : { id: emoji.id, name: emoji.name },
  });
  writeStore(data);
  return { ok: true };
}

export function removeReactionTrigger(guildId, trigger) {
  const data = readStore();
  const key = trigger.toLowerCase().trim();
  const before = data.guilds[guildId]?.length ?? 0;
  data.guilds[guildId] = (data.guilds[guildId] ?? []).filter((t) => t.trigger !== key);
  if (data.guilds[guildId].length === before) return { ok: false, error: "Trigger ikke fundet." };
  writeStore(data);
  return { ok: true };
}

export function resetReactionTriggers(guildId) {
  const data = readStore();
  delete data.guilds[guildId];
  writeStore(data);
}
