import { SlashCommandBuilder } from "discord.js";
import { buildCommandsEmbeds } from "../utils/commandsEmbed.js";

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Vis alle bot-kommandoer"),

  async execute(interaction) {
    await interaction.reply({ embeds: buildCommandsEmbeds(), ephemeral: true });
  },
};
