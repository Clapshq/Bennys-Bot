import { createLogger } from "../core/logger.js";
import { env } from "../core/env.js";
import { isGroqConfigured } from "../services/groqChat.js";
import {
  isSalaryChannel,
  resolveSalaryChannelOwner,
  syncSalaryChannelsToStore,
} from "./salaryHandler.js";
import {
  registerPayrollEmployee,
  setEmployeeInvoices,
  getPayrollEmployee,
} from "../utils/payrollStore.js";
import { messageHasImages } from "../utils/messageImages.js";
import {
  scanInvoiceForPayroll,
  parsePayrollFromBotEmbed,
} from "./ticketAiHandler.js";

const log = createLogger("payroll-backfill");
const SCAN_DELAY_MS = 2500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllMessages(channel) {
  const all = [];
  let before;

  for (let page = 0; page < 50; page++) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/** Find faktura-beskeder via eksisterende bot-svar i kanalen */
function collectInvoicesFromBotHistory(messages, botId) {
  const invoices = new Map();
  const sorted = [...messages].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    if (msg.author.id !== botId) continue;

    const embed = msg.embeds.find((e) => e.title?.includes("Løn") || e.title?.includes("💰"));
    if (!embed) continue;

    const parsed = parsePayrollFromBotEmbed(embed);
    if (!parsed || parsed.employeePay <= 0) continue;

    let sourceMsg = null;
    for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
      const prev = sorted[j];
      if (prev.author.bot) continue;
      if (messageHasImages(prev)) {
        sourceMsg = prev;
        break;
      }
    }

    if (!sourceMsg) continue;

    invoices.set(sourceMsg.id, {
      messageId: sourceMsg.id,
      invoiceTotal: parsed.invoiceTotal,
      employeePay: parsed.employeePay,
      scannedById: "backfill-embed",
      scannedByTag: "Historik (bot-svar)",
      date: new Date(sourceMsg.createdTimestamp).toISOString(),
    });
  }

  return invoices;
}

/** Scan hele én løn-kanal og opdater payroll-store */
export async function backfillSalaryChannel(channel, { useAi = true } = {}) {
  const guild = channel.guild;
  if (!guild || !isSalaryChannel(channel)) {
    return { ok: false, error: "Ikke en løn-kanal" };
  }

  const owner = resolveSalaryChannelOwner(guild, channel);
  if (!owner?.userId) {
    return { ok: false, error: `Ingen ejer fundet for #${channel.name}` };
  }

  registerPayrollEmployee(guild.id, {
    userId: owner.userId,
    userTag: owner.userTag,
    channelId: channel.id,
    channelName: channel.name,
  });

  const messages = await fetchAllMessages(channel);
  const invoiceMap = collectInvoicesFromBotHistory(messages, guild.client.user.id);

  let aiScanned = 0;
  let aiFailed = 0;

  if (useAi && isGroqConfigured()) {
    for (const msg of messages) {
      if (msg.author.bot) continue;
      if (!messageHasImages(msg)) continue;
      if (invoiceMap.has(msg.id)) continue;

      try {
        const result = await scanInvoiceForPayroll(msg, { silent: true });
        if (result?.employeePay > 0) {
          invoiceMap.set(msg.id, {
            messageId: msg.id,
            invoiceTotal: result.invoiceTotal,
            employeePay: result.employeePay,
            scannedById: msg.author.id,
            scannedByTag: msg.author.tag,
            date: new Date(msg.createdTimestamp).toISOString(),
          });
          aiScanned++;
        }
        await sleep(SCAN_DELAY_MS);
      } catch (err) {
        aiFailed++;
        log.warn(`AI-scan fejlede i #${channel.name}`, { messageId: msg.id, error: err.message });
      }
    }
  }

  const invoices = [...invoiceMap.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const emp = setEmployeeInvoices(guild.id, owner.userId, invoices, { preservePaid: true });

  return {
    ok: true,
    channel: channel.name,
    owner: owner.userTag,
    invoices: invoices.length,
    aiScanned,
    aiFailed,
    pendingPay: emp?.pendingPay ?? 0,
  };
}

/** Scan alle løn-kanaler på serveren */
export async function backfillAllSalaryChannels(guild, { useAi = true } = {}) {
  syncSalaryChannelsToStore(guild);

  const channels = guild.channels.cache.filter((c) => isSalaryChannel(c));
  const results = [];

  for (const channel of channels.values()) {
    try {
      const result = await backfillSalaryChannel(channel, { useAi });
      results.push(result);
      if (result.ok) {
        log.info(`#${result.channel}: ${result.invoices} fakturaer → ${result.pendingPay.toLocaleString("da-DK")} kr. udestående`);
      } else {
        log.warn(`#${channel.name}: ${result.error}`);
      }
    } catch (err) {
      log.error(`#${channel.name} fejlede`, { error: err.message });
      results.push({ ok: false, channel: channel.name, error: err.message });
    }
  }

  const ok = results.filter((r) => r.ok);
  return {
    channels: results.length,
    synced: ok.length,
    totalInvoices: ok.reduce((s, r) => s + (r.invoices ?? 0), 0),
    results,
  };
}

/** Kør baggrundsscan efter bot-start */
export function startPayrollBackfillOnReady(client) {
  if (!env.payrollBackfillOnStart) return;

  const guildId = env.guildId;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (!guild) return;

  setTimeout(() => {
    backfillAllSalaryChannels(guild, { useAi: isGroqConfigured() })
      .then((summary) => {
        log.info("Løn-historik opdateret", {
          kanaler: summary.synced,
          fakturaer: summary.totalInvoices,
        });
      })
      .catch((err) => log.error("Backfill fejlede", { error: err.message }));
  }, 15_000);
}
