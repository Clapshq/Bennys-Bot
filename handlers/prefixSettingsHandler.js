import { isStaffMember } from "../utils/modHelpers.js";
import { getGuildPrefix, setGuildPrefix, resetGuildPrefix, DEFAULT_PREFIX } from "../utils/guildMessageStore.js";
import { createEmbed } from "../utils/brand.js";

export async function handlePrefixSettings(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!isStaffMember(message.member)) {
    await message.reply("❌ Kun staff.").catch(() => {});
    return true;
  }

  if (!sub || sub === "help" || sub === "view") {
    const current = getGuildPrefix(message.guild.id);
    await message.reply(`Prefix: \`${current}\`\n\n**,prefix set** \`symbol\` · **,prefix reset**`).catch(() => {});
    return true;
  }

  if (sub === "set") {
    const sym = rest.split(/\s+/)[0];
    const result = setGuildPrefix(message.guild.id, sym);
    await message.reply(result.ok ? `✅ Prefix sat til \`${result.prefix}\`.` : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "reset") {
    const result = resetGuildPrefix(message.guild.id);
    await message.reply(`✅ Prefix nulstillet til \`${DEFAULT_PREFIX}\`.`).catch(() => {});
    return true;
  }

  await message.reply("❌ Brug `,prefix set` eller `,prefix reset`.").catch(() => {});
  return true;
}

export function isPrefixCommand(command) {
  return command === "prefix";
}
