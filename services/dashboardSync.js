import { env } from "../core/env.js";
import { pushSnapshot, isDashboardEnabled, buildTranscriptPublicUrl } from "./dashboardStore.js";
import { listReactionTriggers } from "../utils/reactionTriggerStore.js";
import { readCachedJson } from "../utils/jsonCache.js";
import { dataFile } from "../utils/paths.js";
import { getPartsPriceStore } from "../utils/partsPriceStore.js";
import { jgPartsCatalog } from "../config/jgParts.js";
import { getAllOpenTickets, updateTicketRegistry } from "../utils/dataStore.js";
import { modListWords } from "../handlers/manualModerationHandler.js";
import { listPayrollEmployees } from "../utils/payrollStore.js";

/** Hvor ofte botten pusher snapshot til Supabase (ms) */
export const DASHBOARD_SYNC_INTERVAL_MS = 20_000;

let debounceTimer = null;
let debounceClient = null;

export async function buildDashboardSnapshot(client) {
  const guildId = env.guildId;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();

  const applications = readCachedJson(dataFile("applications.json"), { applications: {}, cooldowns: {} });
  const ticketRegistry = readCachedJson(dataFile("ticket-registry.json"), { tickets: {} });
  const cases = readCachedJson(dataFile("cases.json"), { guilds: {} });
  const giveaways = readCachedJson(dataFile("giveaways.json"), { active: [] });
  const guildSettings = readCachedJson(dataFile("guild-messages.json"), { guilds: {} });
  const warnings = readCachedJson(dataFile("warnings.json"), { cases: {}, nextId: 1 });
  const blockedWords = readCachedJson(dataFile("blocked-words.json"), { words: [] });
  const prices = getPartsPriceStore();
  const transcripts = readCachedJson(dataFile("dashboard-transcripts.json"), { transcripts: [] });

  const openTicketsRaw = getAllOpenTickets(guild?.id).map((t) => ({
    key: `${t.guildId}:${t.channelId}`,
    ...t,
  }));

  const openTickets = [];
  for (const t of openTicketsRaw) {
    if (!guild) {
      openTickets.push(t);
      continue;
    }
    const ch = guild.channels.cache.get(t.channelId);
    if (ch) {
      openTickets.push(t);
    } else {
      updateTicketRegistry(guild.id, t.channelId, {
        status: "closed",
        reason: "Kanal slettet — auto-lukket af sync",
        closedAt: new Date().toISOString(),
      });
    }
  }

  const allClosedTickets = Object.entries(ticketRegistry.tickets ?? {})
    .filter(([, t]) => t.status === "closed")
    .map(([key, t]) => ({ key, ...t }))
    .sort((a, b) => new Date(b.closedAt ?? 0).getTime() - new Date(a.closedAt ?? 0).getTime());
  const closedTickets = allClosedTickets.slice(0, 100);

  let liveTicketTranscripts = [];
  if (guild && openTickets.length) {
    try {
      liveTicketTranscripts = await buildLiveTicketTranscripts(guild, openTickets);
    } catch {
      liveTicketTranscripts = [];
    }
  }

  return {
    bot: {
      tag: client.user?.tag ?? "offline",
      id: client.user?.id,
      online: true,
      guilds: client.guilds.cache.size,
    },
    guild: guild
      ? {
          id: guild.id,
          name: guild.name,
          memberCount: guild.memberCount,
          icon: guild.iconURL({ size: 128 }),
        }
      : null,
    stats: {
      openTickets: openTickets.length,
      closedTickets: allClosedTickets.length,
      pendingApplications: Object.values(applications.applications ?? {}).filter((a) => a.status === "pending").length,
      activeGiveaways: (giveaways.active ?? []).length,
      modCases: (cases.guilds?.[guild?.id]?.cases ?? []).length,
    },
    openTickets,
    closedTickets,
    liveTicketTranscripts,
    applications: Object.values(applications.applications ?? {}),
    giveaways: giveaways.active ?? [],
    modCases: (cases.guilds?.[guild?.id]?.cases ?? []).slice(-50).reverse(),
    warnings: warnings.cases ?? {},
    blockedWords: (() => {
      const { base, extra } = modListWords();
      return [...new Set([...base, ...extra])];
    })(),
    prices: {
      store: prices,
      catalog: jgPartsCatalog.map((p) => ({ id: p.id, label: p.label, category: p.category })),
    },
    settings: guild ? guildSettings.guilds?.[guild.id] ?? {} : {},
    payroll: guild
      ? listPayrollEmployees(guild.id).map((e) => ({
          userId: e.userId,
          userTag: e.userTag,
          channelId: e.channelId,
          channelName: e.channelName,
          pendingPay: e.pendingPay,
          totalEarned: e.totalEarned,
          totalPaid: e.totalPaid,
          lastPayout: e.lastPayout ?? null,
        }))
      : [],
    roles: guild
      ? [...guild.roles.cache.values()]
          .filter((r) => r.id !== guild.id && !r.managed)
          .sort((a, b) => b.position - a.position)
          .slice(0, 100)
          .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
      : [],
    reactionTriggers: guild ? listReactionTriggers(guild.id) : [],
    transcripts: (transcripts.transcripts ?? []).slice(0, 100).map((t) => {
      const linkId = t.supabaseId ?? t.id;
      return {
        ...t,
        id: linkId,
        publicUrl: t.publicUrl ?? (t.supabaseId ? buildTranscriptPublicUrl(t.supabaseId) : null),
      };
    }),
    channels: guild
      ? [...guild.channels.cache.values()]
          .filter((c) => c.isTextBased?.() && !c.isThread?.())
          .map((c) => ({
            id: c.id,
            name: c.name,
            parent: c.parent?.name ?? null,
            type: c.type,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "da"))
          .slice(0, 200)
      : [],
    env: {
      moderation: env.moderation,
      security: env.security,
      aiConfigured: Boolean(env.groqApiKey),
      payrollAutoScan: env.aiPayrollAutoScan,
    },
  };
}

export async function syncDashboardSnapshot(client) {
  if (!isDashboardEnabled()) return;
  const guildId = env.guildId || client.guilds.cache.first()?.id;
  if (!guildId) return;
  const data = await buildDashboardSnapshot(client);
  await pushSnapshot(guildId, data);
}

/** Push snapshot med det samme efter vigtige ændringer (debounced ~3 sek) */
export function requestDashboardSync(client) {
  if (!isDashboardEnabled()) return;
  debounceClient = client;
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (debounceClient) syncDashboardSnapshot(debounceClient).catch(() => {});
  }, 3000);
  debounceTimer.unref?.();
}

export function startDashboardSync(client) {
  if (!isDashboardEnabled()) return;
  syncDashboardSnapshot(client).catch(() => {});
  setInterval(() => syncDashboardSnapshot(client).catch(() => {}), DASHBOARD_SYNC_INTERVAL_MS).unref?.();
}
