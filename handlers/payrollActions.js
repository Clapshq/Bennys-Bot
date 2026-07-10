import { createEmbed } from "../utils/brand.js";
import { getSalaryChannelName, isSalaryChannel, resolveSalaryChannelOwner } from "./salaryHandler.js";
import { displayNameFromSalaryChannel } from "./payrollBackfill.js";
import {
  getPayrollEmployee,
  registerPayrollEmployee,
  payoutPayrollEmployee,
} from "../utils/payrollStore.js";
import { formatKr } from "../utils/quoteBuilder.js";
import { createLogger } from "../core/logger.js";

const log = createLogger("payroll-actions");

function buildPayoutChannelEmbed({ employeeName, amount, paidBy }) {
  return createEmbed("success")
    .setTitle("💰 Udbetaling")
    .setDescription(
      `**${formatKr(amount)}** er udbetalt til **${employeeName}**.\n\n` +
        `Udbetalt af **${paidBy.tag}**\n` +
        `Løntælleren er nulstillet — nye fakturaer tæller fra **0 kr.**`
    )
    .setTimestamp();
}

export async function payoutEmployee(guild, user, paidBy) {
  let existing = getPayrollEmployee(guild.id, user.id);

  if (!existing) {
    const channelName = getSalaryChannelName(user.username);
    const channel = guild.channels.cache.find((c) => c.name === channelName);
    if (channel) {
      registerPayrollEmployee(guild.id, {
        userId: user.id,
        userTag: user.tag,
        channelId: channel.id,
        channelName: channel.name,
      });
      existing = getPayrollEmployee(guild.id, user.id);
    }
  }

  const result = payoutPayrollEmployee(guild.id, user.id, {
    paidById: paidBy.id,
    paidByTag: paidBy.tag,
  });

  if (!result.ok) {
    return result;
  }

  const amount = result.amount;
  const emp = result.employee;

  let channel = emp?.channelId ? guild.channels.cache.get(emp.channelId) : null;
  if (!channel) {
    channel =
      guild.channels.cache.find((c) => c.name === getSalaryChannelName(user.username)) ??
      guild.channels.cache.find((c) => c.name === `løn-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
  }

  if (channel) {
    const owner = { userId: user.id, userTag: user.tag };
    const employeeName = displayNameFromSalaryChannel(channel, owner, guild);
    const embed = buildPayoutChannelEmbed({ employeeName, amount, paidBy });
    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      log.error("Kunne ikke sende udbetalings-embed", { channel: channel.name, error: err.message });
    }
  }

  return {
    ok: true,
    amount,
    message:
      `✅ **${user.tag}** — **${formatKr(amount)}** udbetalt.\n` +
      (channel ? `📨 Udbetalings-embed sendt i ${channel}.` : `⚠️ Ingen løn-kanal fundet — beløb er nulstillet i systemet.`),
  };
}
