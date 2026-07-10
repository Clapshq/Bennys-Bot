import { createEmbed } from "../utils/brand.js";
import { formatKr } from "../utils/quoteBuilder.js";
import {
  getPayrollEmployee,
  payoutPayrollEmployee,
  registerPayrollEmployee,
} from "../utils/payrollStore.js";
import { getSalaryChannelName } from "./salaryHandler.js";

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
  const channel =
    (existing?.channelId ? guild.channels.cache.get(existing.channelId) : null) ??
    guild.channels.cache.find((c) => c.name === getSalaryChannelName(user.username));

  const embed = createEmbed("gold")
    .setTitle("✅ Løn udbetalt")
    .setDescription(`**${formatKr(amount)}** er markeret som udbetalt til **${user.tag}**.`)
    .addFields(
      { name: "Udbetalt af", value: `${paidBy}`, inline: true },
      { name: "Ny saldo", value: "**0 kr.**", inline: true }
    )
    .setTimestamp();

  if (channel) {
    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  return {
    ok: true,
    amount,
    message:
      `✅ **${user.tag}** skal have **${formatKr(amount)}** udbetalt.\n` +
      `Løntælleren er nulstillet — næste fakturaer tæller fra **0 kr.**` +
      (channel ? `\n📢 Bekræftelse sendt i ${channel}.` : ""),
  };
}
