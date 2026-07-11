import { randomBytes } from "crypto";
import { mechanicApplication } from "../config/applications.js";
import { dataFile } from "./paths.js";
import { readCachedJson, writeCachedJson } from "./jsonCache.js";

const FILE = dataFile("applications.json");

const {
  sessionTimeoutMs,
  reapplyCooldownMs,
  denyReapplyCooldownMs,
} = mechanicApplication;

const sessions = new Map();

function readStore() {
  const data = readCachedJson(FILE, { applications: {}, cooldowns: {} });
  if (!data.cooldowns) data.cooldowns = {};
  return data;
}

function writeStore(data, immediate = false) {
  writeCachedJson(FILE, data, { immediate });
}

export function createSession(userId, guildId) {
  const now = Date.now();
  const session = {
    userId,
    guildId,
    step: 0,
    answers: [],
    startedAt: now,
    lastActivityAt: now,
    submitting: false,
    awaitingConfirm: false,
  };
  sessions.set(userId, session);
  return session;
}

export function getSession(userId) {
  return sessions.get(userId) ?? null;
}

export function getAllSessions() {
  return [...sessions.values()];
}

export function clearSession(userId) {
  sessions.delete(userId);
}

export function isSessionExpired(session) {
  if (!session) return false;
  const now = Date.now();
  return (
    now - session.lastActivityAt > sessionTimeoutMs ||
    now - session.startedAt > sessionTimeoutMs
  );
}

export function recordApplicationCooldown(userId, ms = reapplyCooldownMs) {
  const data = readStore();
  data.cooldowns[userId] = Date.now();
  data.cooldowns[`${userId}:duration`] = ms;
  writeStore(data);
}

export function recordDenyCooldown(userId) {
  recordApplicationCooldown(userId, denyReapplyCooldownMs);
}

export function getReapplyCooldownRemaining(userId) {
  const data = readStore();
  const ended = data.cooldowns?.[userId];
  if (!ended) return 0;
  const duration = data.cooldowns?.[`${userId}:duration`] ?? reapplyCooldownMs;
  const remaining = duration - (Date.now() - ended);
  return remaining > 0 ? remaining : 0;
}

export function markSessionAwaitingConfirm(userId) {
  const session = sessions.get(userId);
  if (!session) return null;
  session.awaitingConfirm = true;
  session.lastActivityAt = Date.now();
  return session;
}

export function isSessionSubmitting(userId) {
  return sessions.get(userId)?.submitting === true;
}

export function lockSessionForSubmit(userId) {
  const session = sessions.get(userId);
  if (!session || session.submitting) return false;
  session.submitting = true;
  return true;
}

export function saveAnswer(userId, answer) {
  const session = sessions.get(userId);
  if (!session) return null;
  session.answers.push(answer.trim());
  session.step += 1;
  session.lastActivityAt = Date.now();
  return session;
}

export function generateApplicationId() {
  return randomBytes(4).toString("hex");
}

export function hasPendingApplication(userId) {
  const data = readStore();
  return Object.values(data.applications).some(
    (a) => a.userId === userId && a.status === "pending"
  );
}

export function getPendingApplications() {
  return Object.values(readStore().applications).filter((a) => a.status === "pending");
}

export function saveApplication(record) {
  const data = readStore();
  data.applications[record.id] = record;
  writeStore(data, true);
  clearSession(record.userId);
  return record;
}

export function getApplication(id) {
  return readStore().applications[id] ?? null;
}

export function updateApplication(id, patch) {
  const data = readStore();
  if (!data.applications[id]) return null;
  data.applications[id] = { ...data.applications[id], ...patch };
  writeStore(data, true);
  return data.applications[id];
}

export function removeApplication(id) {
  const data = readStore();
  if (!data.applications[id]) return false;
  delete data.applications[id];
  writeStore(data);
  return true;
}
