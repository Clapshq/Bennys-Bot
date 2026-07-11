import { parseEmbedCode, buildEmbedCodeHelp } from "../utils/embedCodeParser.js";
import { applyBleedVariables, applyBleedVariablesToEmbed } from "../utils/bleedVariables.js";
import { isStaffMember } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";

export async function handleEmbedPrefix(message, args) {
  if (!message.member || !isStaffMember(message.member)) {
    await message.reply("❌ Kun staff kan bruge `,embed`.").catch(() => {});
    return true;
  }

  if (!args || args.toLowerCase() === "help") {
    const helpEmbed = createEmbed("discord").setTitle("📋 ,embed").setDescription(buildEmbedCodeHelp());
    await message.reply({ embeds: [helpEmbed] }).catch(() => {});
    return true;
  }

  const result = parseEmbedCode(args);
  if (!result.ok) {
    await message.reply(`❌ ${result.error}`).catch(() => {});
    return true;
  }

  const ctx = { member: message.member, guild: message.guild, channel: message.channel };
  const payload = {};
  if (result.content) payload.content = applyBleedVariables(result.content, ctx);
  if (result.embed) payload.embeds = [applyBleedVariablesToEmbed(result.embed, ctx)];
  await message.channel.send(payload).catch(() => {});
  await message.delete().catch(() => {});
  return true;
}

export function isEmbedCommand(command) {
  return command === "embed";
}