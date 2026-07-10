import { env } from "../core/env.js";
import { rootLogger } from "../core/logger.js";
import { fetchPendingCommands, completeCommand } from "./dashboardStore.js";
import { syncDashboardSnapshot } from "./dashboardSync.js";
import { runDashboardAction } from "./dashboardActions.js";
import { setPartPrices, resetToCatalogDefaults } from "../utils/partsPriceStore.js";
import { getPartById } from "../config/jgParts.js";
import { createPersonalSalaryChannel } from "../handlers/salaryHandler.js";
import { refreshAllPanels, refreshOpenTicketControls } from "../handlers/panelsHandler.js";
import { setGuildPrefix } from "../utils/guildMessageStore.js";
import {
  closeTicketFromDashboard,
  sendTranscriptOnly,
  escalateTicketChannel,
  addUserToTicket,
  removeUserFromTicket,
  renameTicketChannel,
} from "../handlers/ticketHandler.js";
import {
  approveApplicationDashboard,
  denyApplicationDashboard,
} from "../handlers/applicationHandler.js";
import { addBlockedWord, removeBlockedWord } from "../utils/dataStore.js";
import { invalidateWordCache } from "../handlers/moderationHandler.js";

async function runCommand(client, cmd) {
  const guild = client.guilds.cache.get(cmd.guild_id);
  if (!guild) throw new Error("Guild ikke fundet");

  const payload = cmd.payload ?? {};
  const type = cmd.command_type;
  const reviewerId = cmd.requested_by_id ?? "dashboard";

  const extended = await runDashboardAction(client, guild, reviewerId, type, payload);
  if (extended !== null) return extended;

  switch (type) {
    case "UPDATE_PRICE": {
      const { partId, price } = payload;
      if (!partId || price == null) throw new Error("partId og price kræves");
      if (!getPartById(partId)) throw new Error(`Ukendt del: ${partId}`);
      setPartPrices({ [partId]: Number(price) }, reviewerId, "Dashboard");
      return { partId, price: Number(price) };
    }

    case "RESET_PRICES": {
      resetToCatalogDefaults(reviewerId);
      return { ok: true };
    }

    case "SET_PREFIX": {
      const { prefix } = payload;
      if (!prefix || prefix.length > 5) throw new Error("Ugyldigt prefix");
      setGuildPrefix(guild.id, prefix);
      return { prefix };
    }

    case "REFRESH_PANELS": {
      const scope = payload.scope ?? "alle";
      await refreshAllPanels(guild, { group: scope });
      if (scope === "alle" || scope === "tickets") {
        await refreshOpenTicketControls(guild).catch(() => {});
      }
      return { scope };
    }

    case "CREATE_SALARY_CHANNEL": {
      const member = await guild.members.fetch(payload.userId).catch(() => null);
      if (!member) throw new Error("Medlem ikke fundet");
      const result = await createPersonalSalaryChannel(guild, member, { recreate: Boolean(payload.recreate) });
      if (!result.ok) throw new Error(result.error ?? "Kunne ikke oprette kanal");
      return { channelId: result.channel?.id, message: result.message };
    }

    case "CLOSE_TICKET": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Ticket-kanal ikke fundet");
      const user = await client.users.fetch(reviewerId).catch(() => client.user);
      await closeTicketFromDashboard(channel, user, payload.reason ?? "Lukket via dashboard", payload.rating ?? null);
      return { channelId: payload.channelId };
    }

    case "GENERATE_TRANSCRIPT": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Kanal ikke fundet");
      const requester = await guild.members.fetch(reviewerId).catch(() => null);
      if (!requester) throw new Error("Staff ikke fundet");
      const result = await sendTranscriptOnly(channel, requester);
      if (!result.ok) throw new Error(result.error ?? "Transcript fejlede");
      return { channelId: payload.channelId, messageCount: result.messageCount };
    }

    case "APPROVE_APPLICATION": {
      await approveApplicationDashboard(client, guild, payload.applicationId, reviewerId);
      return { applicationId: payload.applicationId };
    }

    case "DENY_APPLICATION": {
      await denyApplicationDashboard(client, guild, payload.applicationId, reviewerId, payload.reason ?? "Afvist via dashboard");
      return { applicationId: payload.applicationId };
    }

    case "SYNC_SNAPSHOT": {
      await syncDashboardSnapshot(client);
      return { ok: true };
    }

    case "ADD_BLOCKED_WORD": {
      const result = addBlockedWord(payload.word ?? "");
      if (!result.ok) throw new Error(result.error ?? "Kunne ikke tilføje ord");
      invalidateWordCache();
      return { word: result.word };
    }

    case "REMOVE_BLOCKED_WORD": {
      const result = removeBlockedWord(payload.word ?? "");
      if (!result.ok) throw new Error(result.error ?? "Kunne ikke fjerne ord");
      invalidateWordCache();
      return { word: result.word };
    }

    case "TICKET_ESCALATE": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Ticket-kanal ikke fundet");
      const staff = await guild.members.fetch(reviewerId).catch(() => null);
      if (!staff) throw new Error("Staff ikke fundet");
      return escalateTicketChannel(channel, staff.user);
    }

    case "TICKET_RENAME": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Ticket-kanal ikke fundet");
      const staff = await guild.members.fetch(reviewerId).catch(() => null);
      if (!staff) throw new Error("Staff ikke fundet");
      const result = await renameTicketChannel(channel, payload.name, staff.user);
      if (!result?.ok && result?.error) throw new Error(result.error);
      return { channelId: channel.id, name: payload.name };
    }

    case "TICKET_ADD_USER": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Ticket-kanal ikke fundet");
      const staff = await guild.members.fetch(reviewerId).catch(() => null);
      const user = await guild.members.fetch(payload.userId).catch(() => null);
      if (!staff || !user) throw new Error("Staff eller bruger ikke fundet");
      const result = await addUserToTicket(channel, user.user, staff.user);
      if (!result.ok) throw new Error(result.error ?? "Kunne ikke tilføje bruger");
      return { channelId: channel.id, userId: payload.userId };
    }

    case "TICKET_REMOVE_USER": {
      const channel = await guild.channels.fetch(payload.channelId).catch(() => null);
      if (!channel) throw new Error("Ticket-kanal ikke fundet");
      const staff = await guild.members.fetch(reviewerId).catch(() => null);
      const user = await guild.members.fetch(payload.userId).catch(() => null);
      if (!staff || !user) throw new Error("Staff eller bruger ikke fundet");
      const result = await removeUserFromTicket(channel, user.user, staff.user);
      if (!result.ok) throw new Error(result.error ?? "Kunne ikke fjerne bruger");
      return { channelId: channel.id, userId: payload.userId };
    }

    default:
      throw new Error(`Ukendt kommando: ${type}`);
  }
}

export function startDashboardCommandProcessor(client) {
  if (!env.dashboardEnabled || !env.supabaseUrl) return;

  const tick = async () => {
    const guildId = env.guildId || client.guilds.cache.first()?.id;
    if (!guildId) return;

    const pending = await fetchPendingCommands(guildId);
    for (const cmd of pending) {
      try {
        const result = await runCommand(client, cmd);
        await completeCommand(cmd.id, { ok: true, result });
        rootLogger.info("Dashboard kommando udført", { type: cmd.command_type, id: cmd.id });
        await syncDashboardSnapshot(client).catch(() => {});
      } catch (err) {
        await completeCommand(cmd.id, { ok: false, error: err.message });
        rootLogger.warn("Dashboard kommando fejlede", { type: cmd.command_type, error: err.message });
      }
    }
  };

  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), 4_000).unref?.();
}
