import fs from "fs";
import path from "path";
import { env } from "../core/env.js";
import { rootLogger } from "../core/logger.js";
import { DATA_DIR, dataFile } from "../utils/paths.js";
import { readCachedJson, writeCachedJson } from "../utils/jsonCache.js";

const TRANSCRIPTS_DIR = path.join(DATA_DIR, "transcripts");
const LOCAL_INDEX = dataFile("dashboard-transcripts.json");

function ensureDirs() {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

function getSupabase() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  if (!getSupabase._client) {
    getSupabase._client = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } })
    );
  }
  return getSupabase._client;
}

export function isDashboardEnabled() {
  return env.dashboardEnabled;
}

/** Supabase er konfigureret — transcripts kan gemmes i skyen */
export function canSyncTranscriptsToCloud() {
  return env.dashboardEnabled && Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

/** Fuld konfiguration til offentlige /t/[id]-links i DM */
export function canPublishTranscripts() {
  return canSyncTranscriptsToCloud() && Boolean(env.dashboardAppUrl);
}

export function getDashboardTranscriptWarnings() {
  if (!env.dashboardEnabled) return [];
  const warnings = [];
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    warnings.push(
      "DASHBOARD_ENABLED=true men SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY mangler — transcripts gemmes kun som fil"
    );
  }
  if (!env.dashboardAppUrl) {
    warnings.push(
      "DASHBOARD_APP_URL mangler i bot .env — tilføj din Vercel-URL (f.eks. https://project-jg1cq.vercel.app) for online transcript-links"
    );
  }
  return warnings;
}

function getTranscriptBaseUrl() {
  if (env.dashboardAppUrl) return env.dashboardAppUrl;
  const raw = process.env.DASHBOARD_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!raw) return "";
  if (raw.startsWith("http")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function buildTranscriptPublicUrl(id) {
  const base = getTranscriptBaseUrl();
  if (!base || !id) return null;
  return `${base}/t/${id}`;
}

/** Brug efter saveTranscript — sikrer link hvis Supabase-id findes */
export function resolveTranscriptPublicUrl(saved) {
  if (!saved) return null;
  if (saved.publicUrl) return saved.publicUrl;
  if (saved.supabaseId) return buildTranscriptPublicUrl(saved.supabaseId);
  if (saved.id && /^[0-9a-f-]{36}$/i.test(String(saved.id))) {
    return buildTranscriptPublicUrl(saved.id);
  }
  return null;
}

export function formatTranscriptUserLine(publicUrl) {
  if (publicUrl) {
    return `\n\n📜 **Se dit transcript:**\n${publicUrl}`;
  }
  return "\n\n📜 Transcriptet er gemt hos Benny's — skriv i serveren hvis du mangler linket.";
}

export async function saveTranscript(record) {
  ensureDirs();
  const id = `${record.guildId}-${record.ticketNumber}-${Date.now()}`;
  const filePath = path.join(TRANSCRIPTS_DIR, `${id}.html`);
  fs.writeFileSync(filePath, record.html, "utf8");

  const entry = {
    id,
    guildId: record.guildId,
    ticketNumber: record.ticketNumber,
    channelName: record.channelName,
    ticketType: record.ticketType,
    openerId: record.openerId ?? null,
    openerTag: record.openerTag ?? null,
    closedById: record.closedById ?? null,
    closedByTag: record.closedByTag ?? null,
    reason: record.reason ?? null,
    rating: record.rating ?? null,
    messageCount: record.messageCount ?? 0,
    filePath,
    createdAt: new Date().toISOString(),
  };

  const index = readCachedJson(LOCAL_INDEX, { transcripts: [] });
  index.transcripts.unshift(entry);
  if (index.transcripts.length > 500) index.transcripts.length = 500;
  writeCachedJson(LOCAL_INDEX, index, { immediate: true });

  const sb = await getSupabase();
  let supabaseId = null;
  let publicUrl = null;
  let syncError = null;

  if (sb) {
    const ticketNumber = Number(record.ticketNumber);
    const { data, error } = await sb.from("transcripts").insert({
      guild_id: String(record.guildId),
      ticket_number: Number.isFinite(ticketNumber) ? ticketNumber : 0,
      channel_name: record.channelName,
      ticket_type: record.ticketType,
      opener_id: record.openerId,
      opener_tag: record.openerTag,
      closed_by_id: record.closedById,
      closed_by_tag: record.closedByTag,
      reason: record.reason,
      rating: record.rating,
      message_count: record.messageCount,
      html_content: record.html,
    }).select("id").single();

    if (error) {
      syncError = error.message;
      rootLogger.warn("Dashboard transcript sync fejlede", {
        error: error.message,
        ticketNumber: record.ticketNumber,
      });
    } else if (data?.id) {
      supabaseId = data.id;
      entry.supabaseId = data.id;
      entry.id = data.id;

      const idx = index.transcripts.findIndex((x) => x.filePath === entry.filePath);
      if (idx >= 0) {
        index.transcripts[idx] = { ...entry };
        writeCachedJson(LOCAL_INDEX, index, { immediate: true });
      }
    }
  } else if (canSyncTranscriptsToCloud()) {
    syncError = "Supabase-klient kunne ikke oprettes";
    rootLogger.warn("Supabase-klient utilgængelig ved transcript-gem");
  }

  if (supabaseId) {
    publicUrl = buildTranscriptPublicUrl(supabaseId);
    entry.publicUrl = publicUrl;
    if (!publicUrl) {
      rootLogger.warn("Transcript gemt i Supabase men DASHBOARD_APP_URL mangler", { id: supabaseId });
    }
  }

  return { ...entry, supabaseId, publicUrl, syncError };
}

export async function savePayrollLog(record) {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("payroll_logs").insert({
    guild_id: record.guildId,
    user_id: record.userId,
    user_name: record.userName,
    invoice_total: record.invoiceTotal,
    employee_pay: record.employeePay,
    channel_id: record.channelId,
  });
}

export async function pushSnapshot(guildId, data) {
  writeCachedJson(dataFile("dashboard-snapshot.json"), { guildId, data, updatedAt: new Date().toISOString() }, { immediate: true });

  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.from("bot_snapshots").upsert({
    guild_id: guildId,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) rootLogger.warn("Dashboard snapshot sync fejlede", { error: error.message });
}

export async function fetchPendingCommands(guildId, limit = 10) {
  const sb = await getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("bot_commands")
    .select("*")
    .eq("guild_id", guildId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    rootLogger.warn("Hent pending commands fejlede", { error: error.message });
    return [];
  }
  return data ?? [];
}

export async function completeCommand(id, { ok, result, error }) {
  const sb = await getSupabase();
  if (!sb) return;

  await sb
    .from("bot_commands")
    .update({
      status: ok ? "done" : "failed",
      result: result ?? null,
      error: error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
}
