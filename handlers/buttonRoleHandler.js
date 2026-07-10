import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import {
  addButtonRole,
  removeButtonRole,
  removeAllButtonRoles,
  resetButtonRoles,
  listButtonRoles,
  getMessageButtonRoles,
} from "../utils/buttonRoleStore.js";
import { parseMessageLink, parseRoleMention, parseEmoji } from "../utils/discordLinks.js";
import { createEmbed } from "../utils/brand.js";

const STYLE_MAP = {
  green: ButtonStyle.Success,
  blurple: ButtonStyle.Primary,
  primary: ButtonStyle.Primary,
  blue: ButtonStyle.Primary,
  gray: ButtonStyle.Secondary,
  grey: ButtonStyle.Secondary,
  red: ButtonStyle.Danger,
  danger: ButtonStyle.Danger,
};

function canAssignRole(guild, role) {
  if (!role || role.managed || role.id === guild.id) return { ok: false, error: "Ugyldig rolle." };
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, error: "Botten mangler Manage Roles." };
  }
  if (role.position >= me.roles.highest.position) {
    return { ok: false, error: "Rollen er for høj til botten." };
  }
  return { ok: true };
}

async function fetchMessage(guild, link) {
  const parsed = parseMessageLink(link);
  if (!parsed) return { ok: false, error: "Ugyldigt message link." };
  if (parsed.guildId !== guild.id) return { ok: false, error: "Beskeden er ikke fra denne server." };
  const channel = await guild.channels.fetch(parsed.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return { ok: false, error: "Kanal ikke fundet." };
  const msg = await channel.messages.fetch(parsed.messageId).catch(() => null);
  if (!msg) return { ok: false, error: "Besked ikke fundet." };
  return { ok: true, parsed, message: msg };
}

function buildButtonRows(buttons) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const b of buttons.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(b.customId)
        .setLabel(b.label.slice(0, 80))
        .setStyle(STYLE_MAP[b.style] ?? ButtonStyle.Secondary);
      if (b.emoji) btn.setEmoji(b.emoji);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

export async function rebuildMessageButtons(message, guildId) {
  const buttons = getMessageButtonRoles(guildId, message.channel.id, message.id);
  if (!buttons.length) return;
  await message.edit({ components: buildButtonRows(buttons) }).catch(() => {});
}

export async function handleButtonRolePrefix(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!sub || sub === "help") {
    const embed = createEmbed("discord")
      .setTitle("🔘 Button Roles (Bleed-stil)")
      .setDescription(
        "**`,buttonrole add`** `link` `rolle` `style` `emoji` `label`\n" +
          "Styles: `green` · `blurple` · `gray` · `red`\n\n" +
          "**`,buttonrole remove`** `link` `nummer`\n" +
          "**`,buttonrole list`** · **`,buttonrole removeall`** `link` · **`,buttonrole reset`**"
      );
    await message.reply({ embeds: [embed] }).catch(() => {});
    return true;
  }

  if (sub === "list") {
    const items = listButtonRoles(message.guild.id);
    if (!items.length) {
      await message.reply("📭 Ingen button roles.").catch(() => {});
      return true;
    }
    await message
      .reply(items.map((b) => `• #${b.index} <#${b.channelId}> \`${b.label}\` → <@&${b.roleId}>`).join("\n"))
      .catch(() => {});
    return true;
  }

  if (sub === "reset") {
    resetButtonRoles(message.guild.id);
    await message.reply("🗑️ Alle button roles fjernet.").catch(() => {});
    return true;
  }

  if (sub === "removeall") {
    const link = rest.split(/\s+/)[0];
    const fetched = await fetchMessage(message.guild, link);
    if (!fetched.ok) {
      await message.reply(`❌ ${fetched.error}`).catch(() => {});
      return true;
    }
    const result = removeAllButtonRoles(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId);
    if (result.ok) await fetched.message.edit({ components: [] }).catch(() => {});
    await message.reply(result.ok ? "✅ Alle knapper fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "remove") {
    const parts = rest.split(/\s+/);
    const link = parts[0];
    const num = parseInt(parts[1], 10);
    const fetched = await fetchMessage(message.guild, link);
    if (!fetched.ok) {
      await message.reply(`❌ ${fetched.error}`).catch(() => {});
      return true;
    }
    const result = removeButtonRole(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId, num);
    if (result.ok) await rebuildMessageButtons(fetched.message, message.guild.id);
    await message.reply(result.ok ? "✅ Knap fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "add") {
    const parts = rest.split(/\s+/);
    const link = parts[0];
    const roleRaw = parts[1];
    const styleRaw = parts[2]?.toLowerCase();
    const emojiRaw = parts[3];
    const label = parts.slice(4).join(" ");

    if (!link || !roleRaw || !styleRaw || !emojiRaw || !label) {
      await message.reply("❌ Brug: `,buttonrole add link rolle style emoji label`").catch(() => {});
      return true;
    }

    const fetched = await fetchMessage(message.guild, link);
    if (!fetched.ok) {
      await message.reply(`❌ ${fetched.error}`).catch(() => {});
      return true;
    }

    const role = parseRoleMention(roleRaw, message.guild);
    const roleCheck = canAssignRole(message.guild, role);
    if (!roleCheck.ok) {
      await message.reply(`❌ ${roleCheck.error}`).catch(() => {});
      return true;
    }

    if (!STYLE_MAP[styleRaw]) {
      await message.reply("❌ Style skal være green, blurple, gray eller red.").catch(() => {});
      return true;
    }

    const emoji = parseEmoji(emojiRaw, message.guild);
    const customId = `btnrole_${message.guild.id}_${fetched.parsed.messageId}_${Date.now()}`;

    const result = addButtonRole(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId, {
      customId,
      roleId: role.id,
      label,
      style: styleRaw,
      emoji: typeof emoji === "string" ? emoji : { id: emoji.id, name: emoji.name },
    });

    if (!result.ok) {
      await message.reply(`❌ ${result.error}`).catch(() => {});
      return true;
    }

    await rebuildMessageButtons(fetched.message, message.guild.id);
    await message.reply(`✅ Button **${label}** → **${role.name}** (nr. ${result.index})`).catch(() => {});
    return true;
  }

  await message.reply("❌ Ukendt underkommando. Brug `,buttonrole help`.").catch(() => {});
  return true;
}

export async function handleButtonRoleClick(interaction) {
  if (!interaction.customId.startsWith("btnrole_")) return false;

  const entry = getMessageButtonRoles(
    interaction.guild.id,
    interaction.channel.id,
    interaction.message.id
  ).find((b) => b.customId === interaction.customId);

  if (!entry) {
    await interaction.reply({ content: "❌ Knap findes ikke længere.", ephemeral: true }).catch(() => {});
    return true;
  }

  const role = interaction.guild.roles.cache.get(entry.roleId);
  if (!role) {
    await interaction.reply({ content: "❌ Rollen findes ikke.", ephemeral: true }).catch(() => {});
    return true;
  }

  const member = interaction.member;
  const has = member.roles.cache.has(role.id);
  if (has) await member.roles.remove(role, "Button role").catch(() => {});
  else await member.roles.add(role, "Button role").catch(() => {});

  await interaction.reply({
    content: has ? `✅ **${role.name}** fjernet.` : `✅ **${role.name}** givet.`,
    ephemeral: true,
  }).catch(() => {});
  return true;
}

export function isButtonRoleCommand(command) {
  return command === "buttonrole";
}
