import { PermissionFlagsBits } from "discord.js";
import {
  addReactionRole,
  removeReactionRole,
  removeAllReactionRoles,
  resetReactionRoles,
  listReactionRoles,
  findReactionRole,
} from "../utils/reactionRoleStore.js";
import {
  parseMessageLink,
  parseEmoji,
  parseRoleMention,
  emojiKey,
} from "../utils/discordLinks.js";
import { isStaffMember } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";

function canAssignRole(guild, role) {
  if (!role || role.managed || role.id === guild.id) {
    return { ok: false, error: "Ugyldig rolle." };
  }
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, error: "Botten mangler Manage Roles." };
  }
  if (role.position >= me.roles.highest.position) {
    return { ok: false, error: "Rollen er højere end botten kan give." };
  }
  return { ok: true };
}

async function fetchTargetMessage(guild, link) {
  const parsed = parseMessageLink(link);
  if (!parsed) return { ok: false, error: "Ugyldigt message link." };
  if (parsed.guildId !== guild.id) return { ok: false, error: "Beskeden er ikke fra denne server." };

  const channel = await guild.channels.fetch(parsed.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return { ok: false, error: "Kanal ikke fundet." };

  const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
  if (!message) return { ok: false, error: "Besked ikke fundet." };

  return { ok: true, parsed, message };
}

export async function handleReactionRolePrefix(message, args) {
  const sub = args.split(/\s+/)[0]?.toLowerCase();
  const rest = args.slice(sub?.length ?? 0).trim();

  if (!sub || sub === "help") {
    const embed = createEmbed("discord")
      .setTitle("🎭 Reaction Roles")
      .setDescription(
        "**`,reactionrole add`** `<link>` `<emoji>` `<rolle>`\n" +
          "**`,reactionrole remove`** `<link>` `<emoji>`\n" +
          "**`,reactionrole list`** — vis alle\n" +
          "**`,reactionrole removeall`** `<link>`\n" +
          "**`,reactionrole reset`** — slet alle (kan ikke fortrydes)\n\n" +
          "Reagér på beskeden for at få/fjerne rollen."
      );
    await message.reply({ embeds: [embed] }).catch(() => {});
    return true;
  }

  if (sub === "list") {
    const items = listReactionRoles(message.guild.id);
    if (items.length === 0) {
      await message.reply("📭 Ingen reaction roles endnu.").catch(() => {});
      return true;
    }

    const lines = items.map((e) => {
      const role = message.guild.roles.cache.get(e.roleId);
      return `• <#${e.channelId}> \`${e.emoji.name ?? e.emojiKey}\` → ${role ? role.name : "?"}`;
    });

    await message
      .reply({
        embeds: [createEmbed("accent").setTitle(`Reaction roles (${items.length})`).setDescription(lines.join("\n"))],
      })
      .catch(() => {});
    return true;
  }

  if (sub === "reset") {
    const result = resetReactionRoles(message.guild.id);
    await message.reply(result.ok ? `🗑️ ${result.count} besked(er) med reaction roles fjernet.` : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "removeall") {
    const link = rest.split(/\s+/)[0];
    const fetched = await fetchTargetMessage(message.guild, link);
    if (!fetched.ok) {
      await message.reply(`❌ ${fetched.error}`).catch(() => {});
      return true;
    }

    const result = removeAllReactionRoles(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId);
    await message.reply(result.ok ? "✅ Alle reaction roles fjernet fra beskeden." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "remove") {
    const parts = rest.split(/\s+/);
    const link = parts[0];
    const emojiRaw = parts[1];
    if (!link || !emojiRaw) {
      await message.reply("❌ Brug: `,reactionrole remove <link> <emoji>`").catch(() => {});
      return true;
    }

    const fetched = await fetchTargetMessage(message.guild, link);
    if (!fetched.ok) {
      await message.reply(`❌ ${fetched.error}`).catch(() => {});
      return true;
    }

    const emoji = parseEmoji(emojiRaw, message.guild);
    const result = removeReactionRole(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId, emoji);
    await message.reply(result.ok ? "✅ Reaction role fjernet." : `❌ ${result.error}`).catch(() => {});
    return true;
  }

  if (sub === "add") {
    const parts = rest.split(/\s+/);
    const link = parts[0];
    const emojiRaw = parts[1];
    const roleRaw = parts.slice(2).join(" ");
    if (!link || !emojiRaw || !roleRaw) {
      await message.reply("❌ Brug: `,reactionrole add <link> <emoji> <rolle>`").catch(() => {});
      return true;
    }

    const fetched = await fetchTargetMessage(message.guild, link);
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

    const emoji = parseEmoji(emojiRaw, message.guild);
    const result = addReactionRole(message.guild.id, fetched.parsed.channelId, fetched.parsed.messageId, emoji, role.id);
    if (!result.ok) {
      await message.reply(`❌ ${result.error}`).catch(() => {});
      return true;
    }

    await fetched.message.react(emoji).catch(() => {});
    await message.reply(`✅ Reaction role sat: ${emojiRaw} → **${role.name}**`).catch(() => {});
    return true;
  }

  await message.reply("❌ Ukendt underkommando. Brug `,reactionrole help`.").catch(() => {});
  return true;
}

export async function handleReactionRoleEvent(reaction, user, adding) {
  if (user.bot || !reaction.message.guild) return;

  const guild = reaction.message.guild;
  const partial = reaction.partial;
  if (partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!message) return;

  const entry = findReactionRole(guild.id, message.channel.id, message.id, reaction.emoji);
  if (!entry) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = guild.roles.cache.get(entry.roleId);
  if (!role) return;

  if (adding) {
    await member.roles.add(role, "Reaction role").catch(() => {});
  } else {
    await member.roles.remove(role, "Reaction role fjernet").catch(() => {});
  }
}

export function isReactionRoleCommand(command) {
  return command === "reactionrole";
}
