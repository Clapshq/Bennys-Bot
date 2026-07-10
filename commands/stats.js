import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { getTicketStats } from "../utils/dataStore.js";
import { getRecentCases } from "../utils/dataStore.js";
import { securityConfig } from "../config/security.js";
import { isLockdownActive } from "../handlers/memberHandler.js";
import { isLedelseMember } from "../utils/modHelpers.js";
import { LEDelse_COMMAND_PERMISSIONS } from "../config/commandPermissions.js";

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Server-statistik for Benny's bot")
    .setDefaultMemberPermissions(LEDelse_COMMAND_PERMISSIONS)
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Statistik-type")
        .setRequired(true)
        .addChoices(
          { name: "Tickets", value: "tickets" },
          { name: "Moderation", value: "mod" },
          { name: "Sikkerhed", value: "security" },
          { name: "Alt", value: "all" }
        )
    ),

  async execute(interaction) {
    if (!isLedelseMember(interaction.member)) {
      return interaction.reply({
        content: "❌ Kun **ledelse & ejere** (Stifter, Med-ejer, Ledelse) kan se statistik.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const type = interaction.options.getString("type");
    const guild = interaction.guild;
    const embed = new EmbedBuilder().setColor(0xe67e22).setTitle("📊 Benny's Statistik").setTimestamp();

    if (type === "tickets" || type === "all") {
      const t = getTicketStats(guild.id);
      const typeLines = Object.entries(t.byType).map(([k, v]) => `${k}: ${v}`).join("\n") || "Ingen";
      embed.addFields({
        name: "🎫 Tickets",
        value: `Total: **${t.total}** · Åbne: **${t.open}** · Lukkede: **${t.closed}**\nGns. rating: **${t.avgRating}**\n${typeLines}`,
        inline: false,
      });
    }

    if (type === "mod" || type === "all") {
      const cases = getRecentCases(guild.id, 10);
      const lines = cases.map((c) => `#${c.id} **${c.action}** — ${c.targetTag ?? "?"} (${c.reason?.slice(0, 40) ?? "?"})`).join("\n") || "Ingen cases endnu";
      embed.addFields({ name: "🛡️ Seneste moderation", value: lines.slice(0, 1024), inline: false });
    }

    if (type === "security" || type === "all") {
      embed.addFields({
        name: "🔒 Sikkerhed",
        value:
          `Anti-raid: **${securityConfig.antiRaid.enabled ? "ON" : "OFF"}** (threshold: ${securityConfig.antiRaid.joinThreshold})\n` +
          `Anti-nuke: **${securityConfig.antiNuke.enabled ? "ON" : "OFF"}** (threshold: ${securityConfig.antiNuke.actionThreshold})\n` +
          `Link-filter: **${securityConfig.strictLinkMode ? "STRICT" : "NORMAL"}**\n` +
          `Lockdown: **${isLockdownActive(guild.id) ? "AKTIV" : "Inaktiv"}**`,
        inline: false,
      });
    }

    if (type === "all") {
      embed.setDescription(
        `**Medlemmer:** ${guild.memberCount}\n**Kanaler:** ${guild.channels.cache.size}\n**Roller:** ${guild.roles.cache.size}`
      );
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
