import { buildCommandsEmbeds } from "../utils/commandsEmbed.js";

export async function handleHelpPrefix(message) {
  await message.reply({ embeds: buildCommandsEmbeds() }).catch(() => {});
  return true;
}

export function isHelpCommand(command) {
  return command === "help";
}
