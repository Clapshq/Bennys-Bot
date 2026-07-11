import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import {
  THREAD_CHANNEL_TYPES,
  lockThread,
  unlockThread,
  addMemberToThread,
} from "../handlers/threadHandler.js";

function threadOpt(required = true) {
  return (opt) =>
    opt
      .setName("thread")
      .setDescription("Tråd eller forum-post")
      .setRequired(required)
      .addChannelTypes(...THREAD_CHANNEL_TYPES);
}

export const threadCommand = {
  data: new SlashCommandBuilder()
    .setName("thread")
    .setDescription("Administrér tråde og forum-posts")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
    .addSubcommand((sub) =>
      sub
        .setName("lock")
        .setDescription("Lås tråden — ingen kan skrive")
        .addChannelOption(threadOpt(false))
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Grund (valgfri)").setRequired(false).setMaxLength(500)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unlock")
        .setDescription("Lås en tråd eller forum-post op")
        .addChannelOption(threadOpt(false))
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Grund (valgfri)").setRequired(false).setMaxLength(500)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tilføj et medlem til en tråd")
        .addChannelOption(threadOpt())
        .addUserOption((opt) => opt.setName("member").setDescription("Medlemmet der skal tilføjes").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const thread = interaction.options.getChannel("thread") ?? (interaction.channel.isThread() ? interaction.channel : null);
    const reason = interaction.options.getString("reason") ?? undefined;

    if (!thread?.isThread?.()) {
      return interaction.reply({
        content: "❌ Vælg en tråd, eller brug kommandoen inde i en tråd.",
        ephemeral: true,
      });
    }

    if (sub === "lock") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await lockThread(interaction.member, thread, reason);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
      return interaction.editReply({ content: `🔒 **${thread.name}** er låst.` });
    }

    if (sub === "unlock") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await unlockThread(interaction.member, thread, reason);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
      return interaction.editReply({ content: `🔓 **${thread.name}** er låst op.` });
    }

    if (sub === "add") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const member = interaction.options.getMember("member");
      if (!member) return interaction.editReply({ content: "❌ Medlem ikke fundet på serveren." });

      const result = await addMemberToThread(interaction.member, thread, member);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
      return interaction.editReply({ content: `✅ ${member} tilføjet til **${thread.name}**.` });
    }
  },
};
