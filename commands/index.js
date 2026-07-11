import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { runFullSetup, setupCompleteEmbed, welcomeAnnouncementEmbed } from "../handlers/setupHandler.js";
import { purgeMessages } from "../handlers/moderationHandler.js";
import { ADMIN_COMMAND_PERMISSIONS, STAFF_PURGE_PERMISSIONS } from "../config/commandPermissions.js";

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Slet og genopbyg hele Benny's Discord")
    .setDefaultMemberPermissions(ADMIN_COMMAND_PERMISSIONS)
    .addBooleanOption((opt) =>
      opt.setName("medarbejdere").setDescription("Inkl. medarbejder- og løn-kanaler (standard: ja)").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const onProgress = async (msg) => {
      console.log(`[setup] ${msg}`);
      await interaction.editReply({ content: `⏳ ${msg}` }).catch(() => {});
    };

    try {
      const { results } = await runFullSetup(interaction.guild, {
        includeStaff: interaction.options.getBoolean("medarbejdere") ?? true,
        fullReset: true,
        onProgress,
      });

      await interaction.editReply({
          content: "✅ Setup fuldført!",
          embeds: [setupCompleteEmbed(results)],
        });

      const info = interaction.guild.channels.cache.find((c) => c.name === "📣-information");
      if (info) await info.send({ embeds: [welcomeAnnouncementEmbed()] }).catch(() => {});
    } catch (err) {
      await interaction.editReply({ content: `❌ Setup fejlede: ${err.message}` }).catch(() => {});
    }
  },
};

export const purgeCommand = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Slet de seneste beskeder i kanalen")
    .setDefaultMemberPermissions(STAFF_PURGE_PERMISSIONS)
    .addIntegerOption((opt) =>
      opt.setName("antal").setDescription("Antal beskeder (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger("antal");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const count = await purgeMessages(interaction.channel, amount, interaction.user);
    await interaction.editReply({ content: `🗑️ Slettede **${count}** beskeder.` });
  },
};

import { modCommand } from "./moderation.js";
import { ticketCommand } from "./tickets.js";
import { statsCommand } from "./stats.js";
import { lonCommandExport, lonOpretCommand, udbetalCommand } from "./payroll.js";
import { rolesCommand } from "./roles.js";
import { threadCommand } from "./threads.js";
import { embedCommand } from "./embed.js";
import { helpCommand } from "./help.js";
import { botProfilCommand } from "./botprofile.js";

export { modCommand, ticketCommand, statsCommand, lonOpretCommand, udbetalCommand, rolesCommand, threadCommand, embedCommand, helpCommand, botProfilCommand };

export const commands = [
  setupCommand,
  purgeCommand,
  modCommand,
  ticketCommand,
  statsCommand,
  lonCommandExport,
  udbetalCommand,
  lonOpretCommand,
  rolesCommand,
  threadCommand,
  embedCommand,
  helpCommand,
  botProfilCommand,
];
