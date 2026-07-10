import { dataFile } from "./paths.js";
import { readCachedJson, writeCachedJson } from "./jsonCache.js";

const FILE = dataFile("guild-messages.json");
export const DEFAULT_PREFIX = ",";

function readStore() {
  return readCachedJson(FILE, { guilds: {} });
}

function writeStore(data, immediate = false) {
  writeCachedJson(FILE, data, { immediate });
}

function guild(guildId) {
  const data = readStore();
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  return { data, bucket: data.guilds[guildId] };
}

function normalizeSystemMap(raw) {
  if (!raw) return {};
  if (raw.channelId && typeof raw.channelId === "string" && !raw[raw.channelId]) {
    const { channelId, ...rest } = raw;
    return { [channelId]: rest };
  }
  return raw;
}

export function getGuildPrefix(guildId) {
  return readStore().guilds[guildId]?.prefix ?? DEFAULT_PREFIX;
}

export function setGuildPrefix(guildId, prefix) {
  const sym = prefix?.trim();
  if (!sym || sym.length > 3) return { ok: false, error: "Prefix skal være 1–3 tegn." };
  const { data, bucket } = guild(guildId);
  bucket.prefix = sym;
  writeStore(data);
  return { ok: true, prefix: sym };
}

export function resetGuildPrefix(guildId) {
  const { data, bucket } = guild(guildId);
  delete bucket.prefix;
  writeStore(data);
  return { ok: true, prefix: DEFAULT_PREFIX };
}

function listSystem(guildId, type) {
  const raw = readStore().guilds[guildId]?.[type];
  const map = normalizeSystemMap(raw);
  return Object.entries(map).map(([channelId, config]) => ({ channelId, ...config }));
}

function getSystem(guildId, type, channelId) {
  const map = normalizeSystemMap(readStore().guilds[guildId]?.[type]);
  return map[channelId] ?? null;
}

function addSystem(guildId, type, channelId, config) {
  const { data, bucket } = guild(guildId);
  const map = normalizeSystemMap(bucket[type]);
  map[channelId] = config;
  bucket[type] = map;
  writeStore(data);
  return { ok: true };
}

function removeSystem(guildId, type, channelId) {
  const { data, bucket } = guild(guildId);
  const map = normalizeSystemMap(bucket[type]);
  if (!map[channelId]) return { ok: false, error: "Ingen besked for den kanal." };
  delete map[channelId];
  bucket[type] = Object.keys(map).length ? map : undefined;
  if (!bucket[type]) delete bucket[type];
  writeStore(data);
  return { ok: true };
}

export const listWelcomeMessages = (id) => listSystem(id, "welcome");
export const getWelcomeMessage = (id, ch) => getSystem(id, "welcome", ch);
export const addWelcomeMessage = (id, ch, cfg) => addSystem(id, "welcome", ch, cfg);
export const removeWelcomeMessage = (id, ch) => removeSystem(id, "welcome", ch);

export const listGoodbyeMessages = (id) => listSystem(id, "goodbye");
export const getGoodbyeMessage = (id, ch) => getSystem(id, "goodbye", ch);
export const addGoodbyeMessage = (id, ch, cfg) => addSystem(id, "goodbye", ch, cfg);
export const removeGoodbyeMessage = (id, ch) => removeSystem(id, "goodbye", ch);

export const listBoostMessages = (id) => listSystem(id, "boost");
export const getBoostMessage = (id, ch) => getSystem(id, "boost", ch);
export const addBoostMessage = (id, ch, cfg) => addSystem(id, "boost", ch, cfg);
export const removeBoostMessage = (id, ch) => removeSystem(id, "boost", ch);

export function listAutoresponders(guildId) {
  return readStore().guilds[guildId]?.autoresponders ?? [];
}

export function addAutoresponder(guildId, trigger, response, embedData, content) {
  const { data, bucket } = guild(guildId);
  if (!bucket.autoresponders) bucket.autoresponders = [];
  const key = trigger.toLowerCase().trim();
  if (!key || key.length < 2) return { ok: false, error: "Trigger skal være mindst 2 tegn." };
  if (bucket.autoresponders.some((a) => a.trigger === key)) {
    return { ok: false, error: "Trigger findes allerede." };
  }
  bucket.autoresponders.push({ trigger: key, response, embedData: embedData ?? null, content: content ?? null });
  writeStore(data);
  return { ok: true };
}

export function removeAutoresponder(guildId, trigger) {
  const { data, bucket } = guild(guildId);
  const key = trigger.toLowerCase().trim();
  const before = bucket.autoresponders?.length ?? 0;
  bucket.autoresponders = (bucket.autoresponders ?? []).filter((a) => a.trigger !== key);
  if (bucket.autoresponders.length === before) return { ok: false, error: "Trigger ikke fundet." };
  writeStore(data);
  return { ok: true };
}

export function resetAutoresponders(guildId) {
  const { data, bucket } = guild(guildId);
  if (!bucket.autoresponders?.length) return { ok: false, error: "Ingen autoresponders." };
  delete bucket.autoresponders;
  writeStore(data);
  return { ok: true };
}

export function getStickyConfig(guildId, channelId) {
  return readStore().guilds[guildId]?.sticky?.[channelId] ?? null;
}

export function setStickyConfig(guildId, channelId, config) {
  const { data, bucket } = guild(guildId);
  if (!bucket.sticky) bucket.sticky = {};
  bucket.sticky[channelId] = config;
  writeStore(data);
}

export function clearStickyConfig(guildId, channelId) {
  const { data, bucket } = guild(guildId);
  if (bucket.sticky?.[channelId]) {
    delete bucket.sticky[channelId];
    writeStore(data);
  }
}

export function updateStickyMessageId(guildId, channelId, messageId) {
  const sticky = getStickyConfig(guildId, channelId);
  if (!sticky) return;
  setStickyConfig(guildId, channelId, { ...sticky, messageId });
}

// ─── Panel message IDs (ticket/ansøgning/prispanel) ─────────────────────────

export function getPanelMessageId(guildId, panelKey) {
  return readStore().guilds[guildId]?.panels?.[panelKey] ?? null;
}

export function setPanelMessageId(guildId, panelKey, channelId, messageId, extra = {}) {
  const { data, bucket } = guild(guildId);
  if (!bucket.panels) bucket.panels = {};
  bucket.panels[panelKey] = { channelId, messageId, updatedAt: Date.now(), ...extra };
  writeStore(data, true);
}

export function clearPanelMessageId(guildId, panelKey) {
  const { data, bucket } = guild(guildId);
  if (bucket.panels?.[panelKey]) {
    delete bucket.panels[panelKey];
    writeStore(data);
  }
}

export function listPanelMessageIds(guildId) {
  return readStore().guilds[guildId]?.panels ?? {};
}
