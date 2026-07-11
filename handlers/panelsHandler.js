import {
  applicationEmbed,
  applicationsReviewEmbed,
  contactEmbed,
  ordersEmbed,
  absenceTicketEmbed,
  informationEmbed,
  reactionRolesEmbed,
  pricesEmbeds,
  chatRulesEmbed,
  staffGuidelinesEmbed,
  payrollEmbed,
  modLogIntroEmbed,
  ticketLogIntroEmbed,
  ledelsePanelEmbed,
  moderationEmbed,
  salarySystemEmbed,
} from "../utils/embeds.js";
import {
  applicationPanelComponents,
  contactTicketPanelComponents,
  orderPanelComponents,
  absencePanelComponents,
  roleSelectMenu,
} from "../utils/components.js";
import {
  getPanelMessageId,
  setPanelMessageId,
  clearPanelMessageId,
  listPanelMessageIds,
} from "../utils/guildMessageStore.js";
import { PANEL_CHANNEL_MAP, panelKeysForGroup, channelNameForPanelKey } from "../config/panels.js";
import { isTicketChannel, getTicketMeta } from "./ticketHandler.js";
import { ticketControlButtons } from "../utils/components.js";

/** Kanalnavn → panel-definition */
export const PANEL_DEFINITIONS = {
  "📋-bestillinger": {
    key: "bestillinger",
    label: "Bestillinger",
    build: () => ({ embeds: [ordersEmbed()], components: orderPanelComponents() }),
  },
  "📞-kontakt": {
    key: "kontakt",
    label: "Kontakt",
    build: () => ({ embeds: [contactEmbed()], components: contactTicketPanelComponents() }),
  },
  "📋-ansøgning": {
    key: "ansogning",
    label: "Ansøgning",
    build: () => ({ embeds: [applicationEmbed()], components: [applicationPanelComponents()] }),
  },
  "📋-fravær": {
    key: "fravaer",
    label: "Fravær",
    build: () => ({ embeds: [absenceTicketEmbed()], components: [absencePanelComponents()] }),
  },
  "📋-ansøgninger": {
    key: "ansogninger_review",
    label: "Ansøgnings-review",
    build: () => ({ embeds: [applicationsReviewEmbed()], components: [] }),
  },
  "📣-information": {
    key: "information",
    label: "Information",
    build: () => ({ embeds: [informationEmbed()], components: [] }),
  },
  "⏳-reaktions-roller": {
    key: "reaktions_roller",
    label: "Reaktions-roller",
    build: () => ({ embeds: [reactionRolesEmbed()], components: [roleSelectMenu()] }),
  },
  "💲-priser": {
    key: "priser",
    label: "Priser",
    build: () => ({ embeds: [pricesEmbeds()[0]], components: [] }),
    note: "Opdaterer første pris-embed — resten kan genpostes manuelt",
  },
  "👨-chat": {
    key: "chat",
    label: "Chat-regler",
    build: () => ({ embeds: [chatRulesEmbed()], components: [] }),
  },
  "🔧-ansatte-chat": {
    key: "ansatte_chat",
    label: "Ansatte-chat",
    build: () => ({ embeds: [staffGuidelinesEmbed()], components: [] }),
  },
  "📦-ordrer-og-løn": {
    key: "ordrer_lon",
    label: "Ordrer & løn",
    build: () => ({ embeds: [payrollEmbed()], components: [] }),
  },
  "📋-mod-log": {
    key: "mod_log",
    label: "Mod-log intro",
    build: () => ({ embeds: [modLogIntroEmbed()], components: [] }),
  },
  "📜-ticket-logs": {
    key: "ticket_logs",
    label: "Ticket-logs intro",
    build: () => ({ embeds: [ticketLogIntroEmbed()], components: [] }),
  },
  "👔-ledelse": {
    key: "ledelse",
    label: "Ledelse-panel",
    build: () => ({ embeds: [ledelsePanelEmbed(), moderationEmbed()], components: [] }),
  },
  "📋-løn-system": {
    key: "lon_system",
    label: "Løn-system",
    build: () => ({ embeds: [salarySystemEmbed()], components: [] }),
  },
};

export const PANEL_KEYS = Object.fromEntries(
  Object.entries(PANEL_DEFINITIONS).map(([channelName, def]) => [def.key, channelName])
);

async function findExistingPanelMessage(channel, clientUserId, panelKey) {
  const stored = getPanelMessageId(channel.guild.id, panelKey);
  if (stored?.messageId && stored.channelId === channel.id) {
    const msg = await channel.messages.fetch(stored.messageId).catch(() => null);
    if (msg) return msg;
  }

  const recent = await channel.messages.fetch({ limit: 25 }).catch(() => null);
  if (!recent) return null;

  return (
    recent.find((m) => m.author.id === clientUserId && m.embeds.length > 0) ?? null
  );
}

export async function refreshPanel(guild, channelName, { onProgress } = {}) {
  const def = PANEL_DEFINITIONS[channelName];
  if (!def) return { ok: false, error: `Ukendt panel: ${channelName}` };

  const channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    return { ok: false, error: `Kanal **${channelName}** findes ikke` };
  }

  await onProgress?.(`Opdaterer **${def.label}**…`);

  const payload = def.build();
  const existing = await findExistingPanelMessage(channel, guild.client.user.id, def.key);

  if (existing) {
    await existing.edit(payload);
    setPanelMessageId(guild.id, def.key, channel.id, existing.id);
    return {
      ok: true,
      action: "edited",
      channel: channel.name,
      label: def.label,
      note: def.note,
    };
  }

  const msg = await channel.send(payload);
  setPanelMessageId(guild.id, def.key, channel.id, msg.id);
  return {
    ok: true,
    action: "created",
    channel: channel.name,
    label: def.label,
    note: def.note,
  };
}

export async function refreshAllPanels(guild, options = {}) {
  const { only = null, group = null, onProgress } = options;
  let keys = only;

  if (group && group !== "alle") {
    keys = panelKeysForGroup(group);
    if (!keys) return [{ ok: false, error: `Ukendt gruppe: ${group}` }];
  }

  const results = [];
  for (const [channelName, def] of Object.entries(PANEL_DEFINITIONS)) {
    if (keys?.length && !keys.includes(def.key)) continue;
    results.push(await refreshPanel(guild, channelName, { onProgress }));
  }
  return results;
}

export async function refreshOpenTicketControls(guild, { onProgress } = {}) {
  const { getAllOpenTickets } = await import("../utils/dataStore.js");
  const open = getAllOpenTickets(guild.id);
  let updated = 0;
  let skipped = 0;

  for (const ticket of open) {
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel || !isTicketChannel(channel)) {
      skipped++;
      continue;
    }

    const meta = getTicketMeta(channel);
    const storedId = ticket.controlMessageId;
    let controlMsg = storedId ? await channel.messages.fetch(storedId).catch(() => null) : null;

    if (!controlMsg) {
      const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      controlMsg = recent?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
    }

    if (controlMsg) {
      await controlMsg.edit({ components: ticketControlButtons(meta.type) }).catch(() => {});
      updated++;
    } else {
      skipped++;
    }
  }

  await onProgress?.(`Tickets: **${updated}** opdateret.`);
  return { updated, skipped, total: open.length };
}

export function getPanelStatus(guild) {
  const stored = listPanelMessageIds(guild.id);
  return Object.entries(PANEL_DEFINITIONS).map(([channelName, def]) => {
    const channel = guild.channels.cache.find((c) => c.name === channelName);
    const panel = stored[def.key];
    return {
      key: def.key,
      label: def.label,
      channelName,
      channelExists: !!channel,
      messageId: panel?.messageId ?? null,
      updatedAt: panel?.updatedAt ?? null,
    };
  });
}

export { PANEL_CHANNEL_MAP, channelNameForPanelKey, panelKeysForGroup };
