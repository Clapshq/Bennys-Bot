import fs from "fs";
import path from "path";
import { DATA_DIR } from "./paths.js";
import { readCachedJson, writeCachedJson } from "./jsonCache.js";

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(file) {
  ensureDir();
  return path.join(DATA_DIR, file);
}

function readJson(file, defaultVal) {
  return readCachedJson(filePath(file), defaultVal);
}

function writeJson(file, data, immediate = false) {
  writeCachedJson(filePath(file), data, { immediate });
}

// ─── Blocked words (runtime) ─────────────────────────────────────────────────

export function getExtraBlockedWords() {
  const data = readJson("blocked-words.json", { words: [] });
  return data.words ?? [];
}

export function addBlockedWord(word) {
  const normalized = word.toLowerCase().trim();
  if (!normalized) return { ok: false, error: "Tomt ord" };

  const data = readJson("blocked-words.json", { words: [] });
  if (!data.words) data.words = [];
  if (data.words.includes(normalized)) return { ok: false, error: "Ord findes allerede" };

  data.words.push(normalized);
  writeJson("blocked-words.json", data);
  return { ok: true, word: normalized };
}

export function removeBlockedWord(word) {
  const normalized = word.toLowerCase().trim();
  const data = readJson("blocked-words.json", { words: [] });
  const before = data.words?.length ?? 0;
  data.words = (data.words ?? []).filter((w) => w !== normalized);
  if (data.words.length === before) return { ok: false, error: "Ord ikke fundet" };
  writeJson("blocked-words.json", data);
  return { ok: true, word: normalized };
}

// ─── Warnings ────────────────────────────────────────────────────────────────

function warnKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

export function getWarnings(guildId, userId) {
  const data = readJson("warnings.json", { cases: {} });
  return data.cases?.[warnKey(guildId, userId)] ?? [];
}

export function addWarning(guildId, userId, { reason, moderatorId, moderatorTag }) {
  const data = readJson("warnings.json", { cases: {}, nextId: 1 });
  if (!data.cases) data.cases = {};
  if (!data.nextId) data.nextId = 1;

  const key = warnKey(guildId, userId);
  const entry = {
    id: data.nextId++,
    reason,
    moderatorId,
    moderatorTag,
    date: new Date().toISOString(),
  };

  if (!data.cases[key]) data.cases[key] = [];
  data.cases[key].push(entry);
  writeJson("warnings.json", data);
  return { entry, total: data.cases[key].length };
}

export function clearWarnings(guildId, userId) {
  const data = readJson("warnings.json", { cases: {} });
  const key = warnKey(guildId, userId);
  const count = data.cases?.[key]?.length ?? 0;
  if (data.cases?.[key]) delete data.cases[key];
  writeJson("warnings.json", data);
  return count;
}

// ─── Ticket counter ──────────────────────────────────────────────────────────

export function nextTicketNumber(guildId) {
  const data = readJson("tickets.json", { counters: {} });
  if (!data.counters) data.counters = {};
  const next = (data.counters[guildId] ?? 0) + 1;
  data.counters[guildId] = next;
  writeJson("tickets.json", data, true);
  return next;
}

// ─── Mod cases (global audit trail) ──────────────────────────────────────────

export function createCase(guildId, payload) {
  const data = readJson("cases.json", { guilds: {} });
  if (!data.guilds[guildId]) data.guilds[guildId] = { nextId: 1, cases: [] };

  const entry = {
    id: data.guilds[guildId].nextId++,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  data.guilds[guildId].cases.push(entry);
  if (data.guilds[guildId].cases.length > 5000) {
    data.guilds[guildId].cases = data.guilds[guildId].cases.slice(-5000);
  }

  writeJson("cases.json", data);
  return entry;
}

export function getCase(guildId, caseId) {
  const data = readJson("cases.json", { guilds: {} });
  return data.guilds[guildId]?.cases?.find((c) => c.id === caseId) ?? null;
}

export function getUserCases(guildId, userId, limit = 25) {
  const data = readJson("cases.json", { guilds: {} });
  const cases = data.guilds[guildId]?.cases ?? [];
  return cases
    .filter((c) => c.targetId === userId || c.moderatorId === userId)
    .slice(-limit)
    .reverse();
}

export function getRecentCases(guildId, limit = 15) {
  const data = readJson("cases.json", { guilds: {} });
  return (data.guilds[guildId]?.cases ?? []).slice(-limit).reverse();
}

export function linkCaseToAction(caseId, meta) {
  return { caseId, ...meta };
}

// ─── Staff notes per bruger ──────────────────────────────────────────────────

export function addStaffNote(guildId, userId, { note, moderatorId, moderatorTag }) {
  const data = readJson("notes.json", { notes: {} });
  const key = `${guildId}:${userId}`;
  if (!data.notes[key]) data.notes[key] = [];

  const entry = {
    id: data.notes[key].length + 1,
    note,
    moderatorId,
    moderatorTag,
    date: new Date().toISOString(),
  };

  data.notes[key].push(entry);
  writeJson("notes.json", data);
  return entry;
}

export function getStaffNotes(guildId, userId) {
  const data = readJson("notes.json", { notes: {} });
  return data.notes[`${guildId}:${userId}`] ?? [];
}

export function clearStaffNotes(guildId, userId) {
  const data = readJson("notes.json", { notes: {} });
  const key = `${guildId}:${userId}`;
  const count = data.notes[key]?.length ?? 0;
  delete data.notes[key];
  writeJson("notes.json", data);
  return count;
}

// ─── Ticket registry (persistent metadata) ───────────────────────────────────

export function registerTicket(guildId, channelId, meta) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  const key = `${guildId}:${channelId}`;
  data.tickets[key] = {
    ...meta,
    channelId,
    guildId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    status: "open",
  };
  writeJson("ticket-registry.json", data);
  return data.tickets[key];
}

export function updateTicketRegistry(guildId, channelId, updates) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  const key = `${guildId}:${channelId}`;
  if (!data.tickets[key]) return null;
  data.tickets[key] = { ...data.tickets[key], ...updates, updatedAt: new Date().toISOString() };
  writeJson("ticket-registry.json", data);
  return data.tickets[key];
}

export function closeTicketRegistry(guildId, channelId, { closedBy, rating, reason }) {
  return updateTicketRegistry(guildId, channelId, {
    status: "closed",
    closedAt: new Date().toISOString(),
    closedBy,
    rating: rating ?? null,
    closeReason: reason ?? null,
  });
}

export function getOpenTicketsForUser(guildId, userId) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  return Object.values(data.tickets).filter(
    (t) => t.guildId === guildId && t.openerId === userId && t.status === "open"
  );
}

export function getAllOpenTickets(guildId = null) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  return Object.values(data.tickets).filter(
    (t) => t.status === "open" && (!guildId || t.guildId === guildId)
  );
}

export function touchTicketActivity(guildId, channelId) {
  const key = `${guildId}:${channelId}`;
  const now = Date.now();
  if (now - (touchTicketActivity._last?.get(key) ?? 0) < 45_000) return null;
  if (!touchTicketActivity._last) touchTicketActivity._last = new Map();
  touchTicketActivity._last.set(key, now);

  return updateTicketRegistry(guildId, channelId, {
    lastActivityAt: new Date().toISOString(),
    inactivityWarnedAt: null,
  });
}

export function getTicketStats(guildId) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  const all = Object.values(data.tickets).filter((t) => t.guildId === guildId);
  const open = all.filter((t) => t.status === "open");
  const closed = all.filter((t) => t.status === "closed");
  const rated = closed.filter((t) => t.rating);
  const avgRating =
    rated.length > 0 ? (rated.reduce((s, t) => s + t.rating, 0) / rated.length).toFixed(1) : "N/A";

  const byType = {};
  for (const t of all) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
  }

  return { total: all.length, open: open.length, closed: closed.length, avgRating, byType };
}

export function getOpenTicketOfType(guildId, userId, type) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  return Object.values(data.tickets).find(
    (t) => t.guildId === guildId && t.openerId === userId && t.type === type && t.status === "open"
  );
}

export function registerWorkshopBanDecision(guildId, channelId, { decision, staffId, staffTag, reason }) {
  return updateTicketRegistry(guildId, channelId, {
    banDecision: decision,
    banDecisionBy: staffId,
    banDecisionByTag: staffTag,
    banDecisionReason: reason,
    banDecisionAt: new Date().toISOString(),
  });
}

export function addTicketInternalNote(guildId, channelId, { note, authorId, authorTag }) {
  const data = readJson("ticket-registry.json", { tickets: {} });
  const key = `${guildId}:${channelId}`;
  if (!data.tickets[key]) {
    data.tickets[key] = {
      guildId,
      channelId,
      status: "open",
      createdAt: new Date().toISOString(),
      internalNotes: [],
    };
  }
  if (!data.tickets[key].internalNotes) data.tickets[key].internalNotes = [];
  data.tickets[key].internalNotes.push({
    note,
    authorId,
    authorTag,
    date: new Date().toISOString(),
  });
  data.tickets[key].updatedAt = new Date().toISOString();
  data.tickets[key].lastActivityAt = new Date().toISOString();
  writeJson("ticket-registry.json", data);
  return data.tickets[key].internalNotes;
}

// ─── Pending ticket ratings (overlever bot-genstart) ─────────────────────────

export function savePendingRating(userId, data) {
  const store = readJson("pending-ratings.json", { ratings: {} });
  store.ratings[userId] = { userId, data, savedAt: new Date().toISOString() };
  writeJson("pending-ratings.json", store);
}

export function getPendingRating(userId) {
  return readJson("pending-ratings.json", { ratings: {} }).ratings[userId] ?? null;
}

export function deletePendingRating(userId) {
  const store = readJson("pending-ratings.json", { ratings: {} });
  if (!store.ratings[userId]) return;
  delete store.ratings[userId];
  writeJson("pending-ratings.json", store);
}

export function getAllPendingRatings() {
  return Object.values(readJson("pending-ratings.json", { ratings: {} }).ratings ?? {});
}
