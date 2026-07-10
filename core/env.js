/**
 * Miljøvalidering og feature-flags for Benny's bot.
 * Centraliserer al .env-læsning så resten af kodebasen er type-sikker og dokumenteret.
 */

const truthy = new Set(["1", "true", "yes", "on"]);
const falsy = new Set(["0", "false", "no", "off"]);

function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const v = String(value).toLowerCase().trim();
  if (truthy.has(v)) return true;
  if (falsy.has(v)) return false;
  return defaultValue;
}

function parseIntEnv(value, defaultValue, { min, max } = {}) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return defaultValue;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export const env = Object.freeze({
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildId: process.env.DISCORD_GUILD_ID ?? "",

  memberIntent: parseBool(process.env.MEMBER_INTENT, true),
  messageContent: parseBool(process.env.MESSAGE_CONTENT, true),
  moderation: parseBool(process.env.MODERATION, true),
  security: parseBool(process.env.SECURITY, true),
  autoExit: parseBool(process.env.AUTO_EXIT, false),

  logLevel: process.env.LOG_LEVEL ?? "info",
  cooldownMs: parseIntEnv(process.env.COOLDOWN_MS, 3000, { min: 500, max: 60_000 }),

  antiRaidJoinThreshold: parseIntEnv(process.env.ANTI_RAID_JOINS, 6, { min: 3, max: 50 }),
  antiRaidWindowMs: parseIntEnv(process.env.ANTI_RAID_WINDOW_MS, 10_000, { min: 3000, max: 120_000 }),
  antiNukeActionThreshold: parseIntEnv(process.env.ANTI_NUKE_THRESHOLD, 4, { min: 2, max: 20 }),
  antiNukeWindowMs: parseIntEnv(process.env.ANTI_NUKE_WINDOW_MS, 15_000, { min: 5000, max: 120_000 }),

  ticketInactiveHours: parseIntEnv(process.env.TICKET_INACTIVE_HOURS, 72, { min: 12, max: 720 }),
  maxMentions: parseIntEnv(process.env.MAX_MENTIONS, 5, { min: 2, max: 20 }),
  minAccountAgeDays: parseIntEnv(process.env.MIN_ACCOUNT_AGE_DAYS, 0, { min: 0, max: 30 }),

  /** AI vision til JG shop-screenshots (gratis: console.groq.com) */
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqVisionModel:
    process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiVisionModel: process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash",
  groqChatModel: process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile",
  prisAutoScan: parseBool(process.env.PRIS_AUTO_SCAN, true),
  prisScanChannels: (process.env.PRIS_SCAN_CHANNELS ?? "ordrer-og-løn,ledelse")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  aiPayrollAutoScan: parseBool(process.env.AI_PAYROLL_AUTO_SCAN, true),

  /** Registrer slash-kommandoer automatisk ved hver bot-start (standard: ja) */
  autoDeployCommands: parseBool(process.env.AUTO_DEPLOY_COMMANDS, true),

  /** Dashboard (Vercel + Supabase) */
  dashboardEnabled: parseBool(process.env.DASHBOARD_ENABLED, false),
  dashboardAppUrl: (() => {
    const raw = process.env.DASHBOARD_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (!raw) return "";
    if (raw.startsWith("http")) return raw.replace(/\/$/, "");
    return `https://${raw.replace(/\/$/, "")}`;
  })(),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
  dashboardStaffRoleNames: (process.env.DASHBOARD_STAFF_ROLES ?? "Mekaniker,Lærling,Ledelse,Med-ejer,Stifter")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
});

export function validateEnv() {
  const errors = [];
  if (!env.token) errors.push("DISCORD_TOKEN mangler");
  if (!env.clientId) errors.push("DISCORD_CLIENT_ID mangler");
  if (env.autoDeployCommands && !env.guildId) {
    errors.push("DISCORD_GUILD_ID mangler — slash-kommandoer registreres ikke på din server (kun globalt)");
  }
  if (env.moderation && !env.messageContent) {
    errors.push("MESSAGE_CONTENT bør være true når moderation er aktiv");
  }
  if (env.security && !env.memberIntent) {
    errors.push("MEMBER_INTENT bør være true når security (anti-raid) er aktiv");
  }
  if (!env.memberIntent) {
    errors.push("MEMBER_INTENT bør være true for auto Kunde-rolle ved join");
  }
  if (!env.messageContent) {
    errors.push("MESSAGE_CONTENT bør være true for prefix-kommandoer, automod og læsning af DM-svar");
  }
  if (env.dashboardEnabled) {
    if (!env.supabaseUrl || !env.supabaseServiceKey) {
      errors.push("DASHBOARD_ENABLED=true men SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY mangler");
    }
    if (!env.dashboardAppUrl) {
      errors.push("DASHBOARD_APP_URL mangler — online transcript-links virker ikke uden Vercel-URL i bot .env");
    }
  }
  return { ok: errors.length === 0, errors };
}
