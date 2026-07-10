import { getSalaryChannelName } from "./salaryHandler.js";
import {
  getPayrollEmployee,
  registerPayrollEmployee,
  payoutPayrollEmployee,
} from "../utils/payrollStore.js";
import { formatKr } from "../utils/quoteBuilder.js";

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

  return {
    ok: true,
    amount,
    message:
      `✅ **${user.tag}** skal have **${formatKr(amount)}** udbetalt.\n` +
      `Løntælleren er nulstillet — næste fakturaer tæller fra **0 kr.**\n` +
      `Brug \`/løn stats\` for opdateret oversigt.`,
  };
}
