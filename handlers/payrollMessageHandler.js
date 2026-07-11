import { createLogger } from "../core/logger.js";
import { isSalaryChannel } from "./salaryHandler.js";
import {
  removePayrollInvoicesForDeletedMessage,
  trackDeletedPayrollUpload,
  getPayrollEmployeeByChannel,
} from "../utils/payrollStore.js";

const log = createLogger("payroll-delete");

async function resolveChannel(message) {
  if (message.channel && "guild" in message.channel) return message.channel;
  if (!message.channelId) return null;
  return message.client.channels.fetch(message.channelId).catch(() => null);
}

/** Når et billede/upload slettes i løn-kanal — træk faktura fra */
export async function handlePayrollMessageDelete(message) {
  const channel = await resolveChannel(message);
  if (!channel?.guild || !isSalaryChannel(channel)) return;

  const guildId = channel.guild.id;
  const channelId = channel.id;
  const messageId = message.id;
  const botId = message.client.user?.id;
  const isBotMessage = message.author?.bot && message.author.id === botId;

  if (isBotMessage) {
    const emp = removePayrollInvoicesForDeletedMessage(guildId, channelId, { botMessageId: messageId });
    if (emp) {
      log.info("Faktura fjernet (bot-embed slettet)", {
        channel: channel.name,
        messageId,
        pendingPay: emp.pendingPay,
      });
    }
    return;
  }

  // Bruger slettede upload — fjern tilknyttet faktura (virker også ved partial delete)
  trackDeletedPayrollUpload(guildId, channelId, messageId);
  removePayrollInvoicesForDeletedMessage(guildId, channelId, { sourceMessageId: messageId });

  if (botId) {
    try {
      const recent = await channel.messages.fetch({ limit: 100 });
      for (const msg of recent.values()) {
        if (msg.author.id !== botId || msg.reference?.messageId !== messageId) continue;
        removePayrollInvoicesForDeletedMessage(guildId, channelId, { botMessageId: msg.id });
        await msg.delete().catch(() => {});
      }
    } catch (err) {
      log.warn("Kunne ikke finde bot-svar på slettet upload", { error: err.message });
    }
  }

  const emp = getPayrollEmployeeByChannel(guildId, channelId);
  if (emp) {
    log.info("Faktura fjernet (upload slettet)", {
      channel: channel.name,
      messageId,
      pendingPay: emp.pendingPay,
    });
  }
}
