import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import { createEmbed } from "../utils/brand.js";
import {
  listEmbeds,
  getEmbed,
  saveEmbed,
  deleteEmbed,
  normalizeEmbedName,
} from "../utils/embedStore.js";
import { isStaffMember } from "../utils/modHelpers.js";

import { parseMessageLink } from "../utils/discordLinks.js";

export function buildEmbedHelp() {
  return createEmbed("discord")
    .setTitle("📋 Embed-kommandoer")
    .setDescription(
      "Gem og genbrug embeds til announcements og info-kanaler.\n\n" +
        "**`,embed`** + embed-kode — send embed direkte i chatten (staff)\n" +
        "**`,help`** — alle kommandoer (Bleed-stil)\n\n" +
        "**`/embed list`** — vis alle gemte embeds\n" +
        "**`/embed preview navn:`** — forhåndsvis en embed\n" +
        "**`/embed create navn:`** — opret ny embed (modal)\n" +
        "**`/embed copy messagelink:`** — kopiér embed fra en besked\n" +
        "**`/embed delete navn:`** — slet en gemt embed"
    );
}

function requireStaff(interaction) {
  if (!isStaffMember(interaction.member)) {
    return "❌ Kun staff kan bruge embed-kommandoer.";
  }
  return null;
}

function toEmbedBuilder(stored) {
  if (!stored?.data) return null;
  return EmbedBuilder.from(stored.data);
}

export function buildEmbedCreateModal(name) {
  return new ModalBuilder()
    .setCustomId(`embed_create_${normalizeEmbedName(name)}`)
    .setTitle(`Opret embed: ${name}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_title")
          .setLabel("Titel")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_description")
          .setLabel("Beskrivelse")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_color")
          .setLabel("Farve (hex uden #, fx e67e22)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(6)
          .setPlaceholder("e67e22")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("embed_footer")
          .setLabel("Footer (valgfri)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(2048)
      )
    );
}

export async function handleEmbedCreateModal(interaction) {
  const staffErr = requireStaff(interaction);
  if (staffErr) return interaction.reply({ content: staffErr, flags: MessageFlags.Ephemeral });

  const name = interaction.customId.replace("embed_create_", "");
  const title = interaction.fields.getTextInputValue("embed_title") || undefined;
  const description = interaction.fields.getTextInputValue("embed_description");
  const colorRaw = interaction.fields.getTextInputValue("embed_color").replace("#", "").trim();
  const footer = interaction.fields.getTextInputValue("embed_footer") || undefined;

  const embed = createEmbed("default").setDescription(description);
  if (title) embed.setTitle(title);
  if (footer) embed.setFooter({ text: footer });

  if (/^[0-9a-fA-F]{6}$/.test(colorRaw)) {
    embed.setColor(parseInt(colorRaw, 16));
  }

  const result = saveEmbed(interaction.guild.id, name, embed.toJSON(), interaction.user.id);
  if (!result.ok) {
    return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({
    content: `✅ Embed **${result.name}** gemt.`,
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleEmbedCommand(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "help") {
    return interaction.reply({ embeds: [buildEmbedHelp()], flags: MessageFlags.Ephemeral });
  }

  const staffErr = requireStaff(interaction);
  if (staffErr) return interaction.reply({ content: staffErr, flags: MessageFlags.Ephemeral });

  if (sub === "list") {
    const items = listEmbeds(interaction.guild.id);
    if (items.length === 0) {
      return interaction.reply({ content: "📭 Ingen gemte embeds endnu. Brug `/embed create`.", flags: MessageFlags.Ephemeral });
    }

    const embed = createEmbed("accent")
      .setTitle(`Gemte embeds (${items.length})`)
      .setDescription(items.map((e) => `• \`${e.name}\` — opdateret <t:${Math.floor(new Date(e.updatedAt).getTime() / 1000)}:R>`).join("\n"));

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (sub === "preview") {
    const name = interaction.options.getString("navn", true);
    const stored = getEmbed(interaction.guild.id, name);
    if (!stored) {
      return interaction.reply({ content: `❌ Ingen embed med navnet \`${normalizeEmbedName(name)}\`.`, flags: MessageFlags.Ephemeral });
    }

    const embed = toEmbedBuilder(stored);
    return interaction.reply({
      content: `👁️ Preview: **${normalizeEmbedName(name)}**`,
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (sub === "create") {
    const name = interaction.options.getString("navn", true);
    const key = normalizeEmbedName(name);
    if (!key) {
      return interaction.reply({ content: "❌ Ugyldigt navn.", flags: MessageFlags.Ephemeral });
    }

    if (getEmbed(interaction.guild.id, key)) {
      return interaction.reply({
        content: `❌ \`${key}\` findes allerede — brug \`/embed delete\` først eller vælg et andet navn.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.showModal(buildEmbedCreateModal(key));
  }

  if (sub === "copy") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const link = interaction.options.getString("messagelink", true);
    const parsed = parseMessageLink(link);
    if (!parsed) {
      return interaction.editReply({ content: "❌ Ugyldigt message link." });
    }

    const channel = await interaction.client.channels.fetch(parsed.channelId).catch(() => null);
    if (!channel?.isTextBased?.()) {
      return interaction.editReply({ content: "❌ Kanalen blev ikke fundet." });
    }

    const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
    if (!message) {
      return interaction.editReply({ content: "❌ Beskeden blev ikke fundet." });
    }

    if (message.embeds.length === 0) {
      return interaction.editReply({ content: "❌ Beskeden har ingen embeds." });
    }

    const source = message.embeds[0];
    const autoName =
      normalizeEmbedName(source.title ?? "") ||
      `kopi-${parsed.messageId.slice(-6)}`;

    let saveName = autoName;
    let suffix = 1;
    while (getEmbed(interaction.guild.id, saveName)) {
      saveName = `${autoName}-${suffix++}`;
    }

    const result = saveEmbed(interaction.guild.id, saveName, source.toJSON(), interaction.user.id);
    if (!result.ok) {
      return interaction.editReply({ content: `❌ ${result.error}` });
    }

    return interaction.editReply({
      content: `✅ Embed kopieret som **${result.name}**`,
      embeds: [EmbedBuilder.from(source)],
    });
  }

  if (sub === "delete") {
    const name = interaction.options.getString("navn", true);
    const result = deleteEmbed(interaction.guild.id, name);
    if (!result.ok) {
      return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: `🗑️ Embed **${result.name}** slettet.`, flags: MessageFlags.Ephemeral });
  }
}
