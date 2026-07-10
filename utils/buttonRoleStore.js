import fs from "fs";
import { dataFile } from "./paths.js";

const FILE = dataFile("button-roles.json");

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

export function listButtonRoles(guildId) {
  const bucket = readStore().guilds[guildId] ?? {};
  return Object.entries(bucket).flatMap(([key, buttons]) => {
    const [channelId, messageId] = key.split(":");
    return buttons.map((b, i) => ({ channelId, messageId, index: i + 1, ...b }));
  });
}

export function getMessageButtonRoles(guildId, channelId, messageId) {
  return readStore().guilds[guildId]?.[messageKey(channelId, messageId)] ?? [];
}

export function addButtonRole(guildId, channelId, messageId, entry) {
  const data = readStore();
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  const mk = messageKey(channelId, messageId);
  const buttons = data.guilds[guildId][mk] ?? [];
  if (buttons.length >= 25) return { ok: false, error: "Max 25 knapper per besked." };
  buttons.push(entry);
  data.guilds[guildId][mk] = buttons;
  writeStore(data);
  return { ok: true, index: buttons.length };
}

export function removeButtonRole(guildId, channelId, messageId, index) {
  const data = readStore();
  const mk = messageKey(channelId, messageId);
  const buttons = data.guilds[guildId]?.[mk];
  if (!buttons?.length) return { ok: false, error: "Ingen button roles på beskeden." };
  const idx = index - 1;
  if (idx < 0 || idx >= buttons.length) return { ok: false, error: "Ugyldigt knap-nummer." };
  buttons.splice(idx, 1);
  if (buttons.length === 0) delete data.guilds[guildId][mk];
  else data.guilds[guildId][mk] = buttons;
  writeStore(data);
  return { ok: true };
}

export function removeAllButtonRoles(guildId, channelId, messageId) {
  const data = readStore();
  const mk = messageKey(channelId, messageId);
  if (!data.guilds[guildId]?.[mk]) return { ok: false, error: "Ingen button roles på beskeden." };
  delete data.guilds[guildId][mk];
  writeStore(data);
  return { ok: true };
}

export function resetButtonRoles(guildId) {
  const data = readStore();
  if (!data.guilds[guildId]) return { ok: false, error: "Ingen button roles." };
  delete data.guilds[guildId];
  writeStore(data);
  return { ok: true };
}

export function findButtonRole(guildId, channelId, messageId, customId) {
  const buttons = getMessageButtonRoles(guildId, channelId, messageId);
  return buttons.find((b) => b.customId === customId) ?? null;
}
