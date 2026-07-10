import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { brand } from "../config/brand.js";
import { getTicketCategory, getModalFields, isStaffOnlyTicketType } from "../config/tickets.js";
import { createEmbed } from "../utils/brand.js";
import { isStaffMember } from "../utils/modHelpers.js";
const STYLE_MAP = {
  short: TextInputStyle.Short,
  paragraph: TextInputStyle.Paragraph,
};

export function buildTypeModal(type) {
  const cat = getTicketCategory(type);
  const fields = getModalFields(cat.modal ?? type);
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(`${brand.shortName} — ${cat.label}`.slice(0, 45));

  for (const f of fields) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(f.id)
          .setLabel(f.label.slice(0, 45))
          .setStyle(STYLE_MAP[f.style] ?? TextInputStyle.Short)
          .setRequired(f.required ?? true)
          .setMaxLength(f.style === "paragraph" ? 1000 : 200)
          .setPlaceholder(f.placeholder?.slice(0, 100) ?? "")
      )
    );
  }

  return modal;
}

function collectModalData(interaction, type) {
  const cat = getTicketCategory(type);
  const fields = getModalFields(cat.modal ?? type);
  const data = {};
  for (const f of fields) {
    data[f.id] = interaction.fields.getTextInputValue(f.id);
  }
  return data;
}

function formDataEmbed(type, data) {
  const cat = getTicketCategory(type);
  const labels = Object.fromEntries(getModalFields(cat.modal ?? type).map((f) => [f.id, f.label]));

  const lines = Object.entries(data).map(([k, v]) => `**${labels[k] ?? k}:**\n${v}`);
  return createEmbed(type === "workshop_ban" ? "warning" : "accent")
    .setTitle(`${cat.emoji} ${cat.label} — oplysninger`)
    .setDescription(lines.join("\n\n"));
}

export async function submitTypeModal(interaction, type) {
  if (isStaffOnlyTicketType(type) && !isStaffMember(interaction.member)) {
    return interaction.reply({
      content: "❌ Kun medarbejdere kan oprette denne ticket-type.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const { buildTicketChannel } = await import("./ticketHandler.js");
  const data = collectModalData(interaction, type);
  const cat = getTicketCategory(type);
  const { channel, created, limitReached, duplicateType } = await buildTicketChannel(
    interaction.guild,
    interaction.user,
    type
  );

  if (limitReached) {
    return interaction.editReply({
      content: `❌ Du har for mange åbne tickets. Luk en først: ${channel}`,
    });
  }

  if (duplicateType) {
    return interaction.editReply({
      content: `ℹ️ Du har allerede en åben **${cat.label}**-ticket: ${channel}`,
    });
  }

  if (!created) {
    return interaction.editReply({
      content: `ℹ️ Du har allerede en åben ticket: ${channel}`,
    });
  }

  await channel.send({ embeds: [formDataEmbed(type, data)] });

  if (type === "workshop_ban") {
    await channel.send(
      "⏳ **Din ansøgning afventer gennemgang.** Ledelsen bruger knapperne nedenfor til at godkende eller afvise adgang til værkstedet."
    );
  }

  return interaction.editReply({
    content: `✅ **${cat.label}** oprettet: ${channel}`,
  });
}

export function buildAppealDenyModal() {
  return new ModalBuilder()
    .setCustomId("ticket_appeal_deny_submit")
    .setTitle("Afvis ban-ansøgning")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Grund til afvisning")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder("Forklar hvorfor adgang ikke gives...")
      )
    );
}
