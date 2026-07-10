import { SlashCommandBuilder, MessageFlags } from "discord.js";
import {
  createPersonalSalaryChannel,
  removePersonalSalaryChannel,
  isPayrollStaff,
} from "../handlers/salaryHandler.js";
import { payoutEmployee } from "../handlers/payrollActions.js";
import { buildPayrollStats } from "../handlers/payrollBackfill.js";
import { LEDelse_COMMAND_PERMISSIONS } from "../config/commandPermissions.js";

const lonCommand = new SlashCommandBuilder()
  .setName("løn")
  .setDescription("Administrer personlige løn-kanaler")
  .setDefaultMemberPermissions(LEDelse_COMMAND_PERMISSIONS)
  .addSubcommand((sub) =>
    sub
      .setName("opret")
      .setDescription("Opret personlig løn-kanal — kun medarbejderen og ledelse/ejere har adgang")
      .addUserOption((opt) =>
        opt.setName("medarbejder").setDescription("Personen der skal have løn-kanal").setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt.setName("genopret").setDescription("Slet og genopret kanalen hvis den findes (standard: nej)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Fjern medarbejderens løn-kanal og slet dem fra lønsystemet")
      .addUserOption((opt) =>
        opt.setName("medarbejder").setDescription("Medarbejder der skal fjernes").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Vis løn per medarbejder (læst fra bot-embeds i løn-kanaler)")
  );

export const lonCommandExport = {
  data: lonCommand,

  async execute(interaction) {
    if (!isPayrollStaff(interaction.member)) {
      return interaction.reply({
        content: "❌ Kun **ledelse & ejere** (Stifter, Med-ejer, Ledelse) kan administrere løn-kanaler.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "opret") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const user = interaction.options.getUser("medarbejder");
      const recreate = interaction.options.getBoolean("genopret") ?? false;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.editReply({ content: "❌ Medlemmet er ikke på serveren." });
      }

      const result = await createPersonalSalaryChannel(interaction.guild, member, { recreate });

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      return interaction.editReply({
        content:
          `${result.message}\n\n` +
          `👤 **${member.user.tag}**\n` +
          `🔒 Adgang: ${member} + ledelse/ejere`,
      });
    }

    if (sub === "remove") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const user = interaction.options.getUser("medarbejder");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const result = await removePersonalSalaryChannel(interaction.guild, user.id, {
        member: member ?? undefined,
        removedBy: interaction.user,
      });

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      const pendingNote =
        result.hadPendingPay > 0
          ? `\n⚠️ **${result.hadPendingPay.toLocaleString("da-DK")} kr.** udestående løn blev nulstillet ved fjernelse.`
          : "";

      return interaction.editReply({
        content:
          `✅ **${user.tag}** er fjernet fra lønsystemet.${pendingNote}\n` +
          (result.channelDeleted ? `🗑️ Løn-kanal slettet.` : `ℹ️ Ingen løn-kanal at slette.`),
      });
    }

    if (sub === "stats") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply({ content: "⏳ Læser bot-embeds fra alle løn-kanaler…" });

      const { embed } = await buildPayrollStats(interaction.guild);
      return interaction.editReply({ content: null, embeds: [embed] });
    }
  },
};

/** @deprecated Brug /løn opret — beholdes midlertidigt for bagudkompatibilitet */
export const lonOpretCommand = {
  data: new SlashCommandBuilder()
    .setName("lønopret")
    .setDescription("(Gammel) Opret personlig løn-kanal — brug /løn opret")
    .setDefaultMemberPermissions(LEDelse_COMMAND_PERMISSIONS)
    .addUserOption((opt) =>
      opt.setName("medarbejder").setDescription("Personen der skal have løn-kanal").setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt.setName("genopret").setDescription("Slet og genopret kanalen hvis den findes (standard: nej)").setRequired(false)
    ),

  async execute(interaction) {
    if (!isPayrollStaff(interaction.member)) {
      return interaction.reply({
        content: "❌ Kun **ledelse & ejere** (Stifter, Med-ejer, Ledelse) kan oprette løn-kanaler.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("medarbejder");
    const recreate = interaction.options.getBoolean("genopret") ?? false;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: "❌ Medlemmet er ikke på serveren." });
    }

    const result = await createPersonalSalaryChannel(interaction.guild, member, { recreate });

    if (!result.ok) {
      return interaction.editReply({ content: `❌ ${result.error}` });
    }

    return interaction.editReply({
      content:
        `${result.message}\n\n` +
        `👤 **${member.user.tag}**\n` +
        `🔒 Adgang: ${member} + ledelse/ejere`,
    });
  },
};

export const udbetalCommand = {
  data: new SlashCommandBuilder()
    .setName("udbetal")
    .setDescription("Vis udestående løn og nulstil tælleren efter udbetaling")
    .setDefaultMemberPermissions(LEDelse_COMMAND_PERMISSIONS)
    .addUserOption((opt) =>
      opt.setName("bruger").setDescription("Medarbejder der skal udbetales").setRequired(true)
    ),

  async execute(interaction) {
    if (!isPayrollStaff(interaction.member)) {
      return interaction.reply({
        content: "❌ Kun **ledelse & ejere** kan udbetale løn.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("bruger");
    const result = await payoutEmployee(interaction.guild, user, interaction.user);

    if (!result.ok) {
      return interaction.editReply({ content: `❌ ${result.error}` });
    }

    return interaction.editReply({ content: result.message });
  },
};
