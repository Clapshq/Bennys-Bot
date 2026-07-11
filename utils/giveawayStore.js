import fs from "fs";
import { dataFile } from "./paths.js";

const FILE = dataFile("giveaways.json");

function readStore() {
  if (!fs.existsSync(FILE)) {
    const empty = { active: [] };
    fs.writeFileSync(FILE, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { active: [] };
  }
}

function writeStore(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function listGiveaways(guildId) {
  return readStore().active.filter((g) => g.guildId === guildId);
}

export function getGiveaway(guildId, messageId) {
  return readStore().active.find((g) => g.guildId === guildId && g.messageId === messageId) ?? null;
}

export function addGiveaway(entry) {
  const data = readStore();
  data.active.push(entry);
  writeStore(data);
  return entry;
}

export function removeGiveaway(guildId, messageId) {
  const data = readStore();
  const before = data.active.length;
  data.active = data.active.filter((g) => !(g.guildId === guildId && g.messageId === messageId));
  if (data.active.length === before) return false;
  writeStore(data);
  return true;
}

export function listAllActiveGiveaways() {
  return readStore().active;
}
