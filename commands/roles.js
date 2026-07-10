import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { setupRoles } from "../handlers/rolesHandler.js";
import { isLedelseMember } from "../utils/modHelpers.js";
import { LEDelse_COMMAND_PERMISSIONS } from "../config/commandPermissions.js";
import { getLedelseRoleNames } from "../config/roles.js";

export const rolesCommand = {
  data: new SlashCommandBuilder()
    .setName("roller")
    .setDescription("Synkronisér Benny's roller og permissions — uden at røre kanaler")
    .setDefaultMemberPermissions(LEDelse_COMMAND_PERMISSIONS)
    .addSubcommand((sub) =>
      sub
        .setName("sync")
        .setDescription("Opdater rolle-farver, permissions og hierarki (Stifter, Med-ejer, Ledelse …)")
    ),

  async execute(interaction) {
    if (!isLedelseMember(interaction.member)) {
      return interaction.reply({
        content: `❌ Kun **${getLedelseRoleNames().join(", ")}** kan synkronisere roller.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { roles, results } = await setupRoles(interaction.guild, async (msg) => {
        await interaction.editReply({ content: `⏳ ${msg}` }).catch(() => {});
      });

      const roleList = Object.keys(roles)
        .map((n) => `\`${n}\``)
        .join(", ");

      await interaction.editReply({
        content:
          `✅ **Roller synkroniseret** — kanaler er ikke rørt.\n\n` +
          `Roller: ${roleList}\n` +
          `Oprettet: **${results.created}** · Migreret: **${results.migrated}** · Kunde tildelt: **${results.assigned}**\n\n` +
          `Giv **Med-ejer** rollen under Serverindstillinger → Medlemmer.`,
      });
    } catch (err) {
      await interaction.editReply({ content: `❌ Fejl: ${err.message}` });
    }
  },
};
