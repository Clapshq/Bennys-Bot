import { SlashCommandBuilder, MessageFlags } from "discord.js";
import {
  closeTicketWithTranscript,
  addUserToTicket,
  removeUserFromTicket,
  renameTicketChannel,
  createTicketForUser,
  sendTranscriptOnly,
  isTicketChannel,
  getTicketMeta,
} from "../handlers/ticketHandler.js";
import { ticketConfig, getStaffOpenableTicketTypes, getTicketCategory } from "../config/tickets.js";
import { isStaffMember } from "../utils/modHelpers.js";
import { STAFF_TICKET_PERMISSIONS } from "../config/commandPermissions.js";

export const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket-system — opret, administrer og luk tickets")
    .setDefaultMemberPermissions(STAFF_TICKET_PERMISSIONS)
    .addSubcommand((sub) =>
      sub
        .setName("close")
        .setDescription("Luk ticket med transcript")
        .addStringOption((opt) => opt.setName("grund").setDescription("Grund for lukning").setMaxLength(300))
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tilføj bruger til ticket")
        .addUserOption((opt) => opt.setName("bruger").setDescription("Bruger der skal tilføjes").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Fjern bruger fra ticket")
        .addUserOption((opt) => opt.setName("bruger").setDescription("Bruger der skal fjernes").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("rename")
        .setDescription("Omdøb ticket-kanalen")
        .addStringOption((opt) =>
          opt.setName("navn").setDescription("Nyt kanalnavn").setRequired(true).setMaxLength(80)
        )
    )
    .addSubcommand((sub) => sub.setName("transcript").setDescription("Generer transcript uden at lukke"))
    .addSubcommand((sub) =>
      sub
        .setName("open")
        .setDescription("Opret ticket for en bruger (staff)")
        .addUserOption((opt) => opt.setName("bruger").setDescription("Bruger").setRequired(true))
        .addStringOption((opt) => {
          const o = opt.setName("type").setDescription("Ticket-type").setRequired(true);
          for (const c of getStaffOpenableTicketTypes()) {
            o.addChoices({ name: `${c.emoji} ${c.label}`, value: c.id });
          }
          return o;
        })
    )
    .addSubcommand((sub) => sub.setName("info").setDescription("Vis ticket-info for denne kanal")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "open") {
      if (!isStaffMember(interaction.member)) {
        return interaction.reply({ content: "❌ Kun staff.", flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const user = interaction.options.getUser("bruger");
      const type = interaction.options.getString("type");
      const result = await createTicketForUser(interaction.guild, user, type, interaction.user);
      return interaction.editReply({
        content: result.created
          ? `✅ Ticket oprettet: ${result.channel}`
          : `ℹ️ Brugeren har allerede en åben ticket: ${result.channel}`,
      });
    }

    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({
        content: "❌ Brug denne kommando i en ticket-kanal, eller brug `/ticket open`.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const staffOnly = ["close", "add", "remove", "rename", "transcript"];
    if (staffOnly.includes(sub) && !isStaffMember(interaction.member)) {
      return interaction.editReply({ content: "❌ Kun staff kan bruge denne underkommando." });
    }

    try {
      switch (sub) {
        case "close": {
          const reason = interaction.options.getString("grund") ?? "Lukket af staff";
          const result = await closeTicketWithTranscript(interaction, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: "🔒 Ticket lukkes — transcript gemt og sendt." });
        }
        case "add": {
          const user = interaction.options.getUser("bruger");
          const result = await addUserToTicket(interaction.channel, user, interaction.user);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `✅ ${user} tilføjet til ticket.` });
        }
        case "remove": {
          const user = interaction.options.getUser("bruger");
          const result = await removeUserFromTicket(interaction.channel, user, interaction.user);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `✅ ${user} fjernet fra ticket.` });
        }
        case "rename": {
          const name = interaction.options.getString("navn");
          const result = await renameTicketChannel(interaction.channel, name, interaction.user);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `✅ Kanal omdøbt til **${result.name}**.` });
        }
        case "transcript": {
          const result = await sendTranscriptOnly(interaction.channel, interaction.user);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `📜 Transcript genereret (**${result.messageCount}** beskeder).` });
        }
        case "info": {
          const meta = getTicketMeta(interaction.channel);
          const cat = getTicketCategory(meta.type);
          return interaction.editReply({
            content:
              `🎫 **Ticket #${meta.number}**\n` +
              `Type: ${cat.emoji} ${cat.label}\n` +
              `Opretter: <@${meta.openerId}>\n` +
              `Auto-luk: efter **${ticketConfig.inactiveAutoCloseHours}t** inaktivitet`,
          });
        }
        default:
          return interaction.editReply({ content: "Ukendt underkommando." });
      }
    } catch (err) {
      console.error("[ticket]", err);
      return interaction.editReply({ content: `❌ Fejl: ${err.message}` });
    }
  },
};
