import { createLogger } from "../core/logger.js";
import {
  isSalaryChannel,
  resolveSalaryChannelOwner,
  syncSalaryChannelsToStore,
} from "./salaryHandler.js";
import {
  registerPayrollEmployee,
  setEmployeeInvoices,
  getPayrollEmployee,
  listPayrollEmployees,
} from "../utils/payrollStore.js";
import { parsePayrollFromBotEmbed } from "./ticketAiHandler.js";
import { createEmbed } from "../utils/brand.js";
import { formatKr } from "../utils/quoteBuilder.js";

const log = createLogger("payroll-backfill");

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

function parseKr(raw) {
  const n = String(raw)
    .replace(/\*\*/g, "")
    .replace(/kr\.?/gi, "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.round(Number(n) || 0);
}

/** Læs alle bot-embeds med lønbeløb i kanal-historik (ingen AI, ingen beskeder) */
function collectInvoicesFromBotEmbeds(messages, botId) {
  const invoices = [];

  for (const msg of messages) {
    if (msg.author.id !== botId) continue;

    for (let i = 0; i < msg.embeds.length; i++) {
      const embed = msg.embeds[i];
      const parsed = parsePayrollFromBotEmbed(embed);
      if (!parsed || parsed.employeePay <= 0) continue;

      invoices.push({
        messageId: `embed:${msg.id}:${i}`,
        invoiceTotal: parsed.invoiceTotal,
        employeePay: parsed.employeePay,
        scannedById: "embed-historik",
        scannedByTag: "Bot-embed",
        date: new Date(msg.createdTimestamp).toISOString(),
      });
    }
  }

  return invoices;
}

export function displayNameFromSalaryChannel(channel, owner, guild) {
  const slug = (channel?.name ?? "")
    .replace(/^💰-?/i, "")
    .replace(/^løn-/i, "")
    .replace(/^lon-/i, "");

  if (slug) {
    return slug
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const member = owner?.userId ? guild.members.cache.get(owner.userId) : null;
  if (member?.displayName) return member.displayName;
  if (owner?.userTag) return owner.userTag.split("#")[0];
  return channel?.name ?? "Ukendt";
}

function formatBilleder(count) {
  if (count === 1) return "1 billede";
  return `${count} billeder`;
}

/** Læs bot-embeds i én løn-kanal og opdater store (skriver IKKE i kanalen) */
export async function backfillSalaryChannel(channel) {
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
  const invoices = collectInvoicesFromBotEmbeds(messages, guild.client.user.id);
  const emp = setEmployeeInvoices(guild.id, owner.userId, invoices, { preservePaid: true });

  return {
    ok: true,
    channel: channel.name,
    owner: owner.userTag,
    displayName: displayNameFromSalaryChannel(channel, owner, guild),
    invoices: invoices.length,
    pendingPay: emp?.pendingPay ?? 0,
  };
}

/** Læs alle løn-kanaler (kun embeds) */
export async function backfillAllSalaryChannels(guild) {
  syncSalaryChannelsToStore(guild);

  const channels = [...guild.channels.cache.filter((c) => isSalaryChannel(c)).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "da")
  );

  const results = [];

  for (const channel of channels) {
    try {
      const result = await backfillSalaryChannel(channel);
      results.push(result);
      if (result.ok) {
        log.info(`#${result.channel}: ${result.invoices} embeds → ${result.pendingPay.toLocaleString("da-DK")} kr.`);
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

/** Byg /løn stats embed */
export async function buildPayrollStats(guild) {
  const summary = await backfillAllSalaryChannels(guild);

  const channels = [...guild.channels.cache.filter((c) => isSalaryChannel(c)).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "da")
  );

  const lines = [];
  let totalPending = 0;

  for (const channel of channels) {
    const owner = resolveSalaryChannelOwner(guild, channel);
    const name = displayNameFromSalaryChannel(channel, owner, guild);
    const emp = owner ? getPayrollEmployee(guild.id, owner.userId) : null;
    const pending = emp?.pendingPay ?? 0;
    const count = emp?.invoices?.length ?? 0;

    totalPending += pending;

    if (pending > 0) {
      lines.push(`**${name}** — ${formatKr(pending)} (${formatBilleder(count)})`);
    } else {
      lines.push(`**${name}** — Intet`);
    }
  }

  if (!lines.length) {
    const stored = listPayrollEmployees(guild.id);
    for (const emp of stored) {
      const pending = emp.pendingPay ?? 0;
      totalPending += pending;
      const name = emp.userTag?.split("#")[0] ?? emp.userId;
      lines.push(pending > 0 ? `**${name}** — ${formatKr(pending)}` : `**${name}** — Intet`);
    }
  }

  const embed = createEmbed("gold")
    .setTitle("💰 Løn-oversigt")
    .setDescription(
      lines.length
        ? lines.join("\n")
        : "Ingen løn-kanaler fundet."
    )
    .addFields({
      name: "Total udestående",
      value: totalPending > 0 ? `**${formatKr(totalPending)}**` : "**Intet**",
      inline: false,
    })
    .setFooter({ text: `Opdateret · udbetalinger huskes i systemet` })
    .setTimestamp();

  return { embed, summary, totalPending };
}

/** Baggrundssync ved opstart — læser bot-embeds, skriver ikke i kanaler */
export function startPayrollBackfillOnReady(client) {
  const guilds = [...client.guilds.cache.values()];
  if (!guilds.length) return;

  log.info("Løn-sync planlagt ved opstart", { guilds: guilds.length });

  const run = () => {
    for (const guild of guilds) {
      backfillAllSalaryChannels(guild)
        .then((summary) => {
          log.info("Løn synket ved opstart", {
            guild: guild.id,
            kanaler: summary.synced,
            fakturaer: summary.totalInvoices,
          });
        })
        .catch((err) => log.error("Opstarts-sync fejlede", { guild: guild.id, error: err.message }));
    }
  };

  setTimeout(run, 2_000);
}
