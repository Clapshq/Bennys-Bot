import fs from "fs";
import path from "path";
import { DATA_DIR } from "./paths.js";
const FILE = "saved-embeds.json";

function readStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, FILE);
  if (!fs.existsSync(filePath)) {
    const empty = { guilds: {} };
    fs.writeFileSync(filePath, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return { guilds: {} };
  }
}

function writeStore(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, FILE), JSON.stringify(data, null, 2), "utf8");
}

function guildBucket(data, guildId) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  return data.guilds[guildId];
}

export function normalizeEmbedName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_æøå]/gi, "")
    .slice(0, 48);
}

export function listEmbeds(guildId) {
  const bucket = guildBucket(readStore(), guildId);
  return Object.entries(bucket)
    .map(([name, meta]) => ({ name, ...meta }))
    .sort((a, b) => a.name.localeCompare(b.name, "da"));
}

export function getEmbed(guildId, name) {
  const key = normalizeEmbedName(name);
  const bucket = guildBucket(readStore(), guildId);
  return bucket[key] ?? null;
}

export function saveEmbed(guildId, name, embedData, userId) {
  const key = normalizeEmbedName(name);
  if (!key) return { ok: false, error: "Ugyldigt navn" };

  const data = readStore();
  const bucket = guildBucket(data, guildId);

  bucket[key] = {
    data: embedData,
    createdBy: userId,
    updatedAt: new Date().toISOString(),
  };
  writeStore(data);
  return { ok: true, name: key };
}

export function deleteEmbed(guildId, name) {
  const key = normalizeEmbedName(name);
  const data = readStore();
  const bucket = guildBucket(data, guildId);
  if (!bucket[key]) return { ok: false, error: "Embed findes ikke" };
  delete bucket[key];
  writeStore(data);
  return { ok: true, name: key };
}
