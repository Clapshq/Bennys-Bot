import { ChannelType, PermissionFlagsBits } from "discord.js";
import { buildPersonalSalaryPermissions } from "../utils/permissions.js";
import { personalSalaryEmbed } from "../utils/embeds.js";
import {
  getStaffRoleNames,
  getLedelseRoleNames,
  memberHasLedelseRole,
} from "../config/roles.js";
import {
  registerPayrollEmployee,
  removePayrollEmployee,
  getPayrollEmployee,
  getPayrollEmployeeByChannel,
  unlinkPayrollChannel,
} from "../utils/payrollStore.js";

export const SALARY_CHANNEL_PREFIX = "💰-løn-";
export const PAYROLL_CATEGORY = "Løn & Faktura";

function slugUsername(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

export function getSalaryChannelName(username) {
  return `${SALARY_CHANNEL_PREFIX}${slugUsername(username)}`;
}

export function isSalaryChannel(channel) {
  return Boolean(channel?.name?.startsWith(SALARY_CHANNEL_PREFIX));
}

export function isPayrollStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return memberHasLedelseRole(member);
}

function getLedelseRoleIds(guild) {
  return getLedelseRoleNames()
    .map((name) => guild.roles.cache.find((r) => r.name === name)?.id)
    .filter(Boolean);
}

/** Finder kanal-ejer ud fra løn-store eller kanal-permissions */
export function resolveSalaryChannelOwner(guild, channel) {
  if (!guild || !channel) return null;

  const fromStore = getPayrollEmployeeByChannel(guild.id, channel.id);
  if (fromStore) return fromStore;

  const ledelseIds = new Set(getLedelseRoleIds(guild));
  const botId = guild.client.user?.id;

  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    if (id === guild.roles.everyone.id) continue;
    if (id === botId) continue;
    if (ledelseIds.has(id)) continue;
    if (guild.roles.cache.has(id)) continue;

    const canSend = overwrite.allow.has(PermissionFlagsBits.SendMessages);
    if (canSend) {
      const member = guild.members.cache.get(id);
      return {
        userId: id,
        userTag: member?.user?.tag ?? id,
        channelId: channel.id,
        channelName: channel.name,
        pendingPay: 0,
      };
    }
  }

  return null;
}

export async function ensurePayrollCategory(guild) {
  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === PAYROLL_CATEGORY
  );

  if (!category) {
    category = await guild.channels.create({
      name: PAYROLL_CATEGORY,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }],
      reason: "Benny's — løn-kategori",
    });
  }

  return category;
}

/** Opretter (eller genopretter) en personlig løn-kanal. */
export async function createPersonalSalaryChannel(guild, member, { recreate = false } = {}) {
  if (member.user.bot) {
    return { ok: false, error: "Bots kan ikke få en løn-kanal." };
  }

  const ledelseRoleIds = getLedelseRoleIds(guild);
  const channelName = getSalaryChannelName(member.user.username);
  const existing = guild.channels.cache.find((c) => c.name === channelName);

  if (existing && !recreate) {
    registerPayrollEmployee(guild.id, {
      userId: member.id,
      userTag: member.user.tag,
      channelId: existing.id,
      channelName: existing.name,
    });

    return {
      ok: true,
      created: false,
      channel: existing,
      message: `ℹ️ Løn-kanal findes allerede: ${existing}`,
    };
  }

  if (existing && recreate) {
    unlinkPayrollChannel(guild.id, existing.id);
    await existing.delete("Genopretter løn-kanal").catch(() => {});
  }

  const category = await ensurePayrollCategory(guild);
  const perms = buildPersonalSalaryPermissions(guild, member.id, ledelseRoleIds, guild.client.user.id);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Personlig løn-kanal for ${member.user.tag} (${member.id})`,
    permissionOverwrites: perms,
    reason: `Løn-kanal oprettet for ${member.user.tag}`,
  });

  registerPayrollEmployee(guild.id, {
    userId: member.id,
    userTag: member.user.tag,
    channelId: channel.id,
    channelName: channel.name,
  });

  const emp = getPayrollEmployee(guild.id, member.id);
  await channel.send({ embeds: [personalSalaryEmbed(member, emp)] });

  return {
    ok: true,
    created: true,
    channel,
    message: `✅ Løn-kanal oprettet: ${channel}`,
  };
}

/** Fjerner løn-kanal og sletter medarbejder fra lønsystemet */
export async function removePersonalSalaryChannel(guild, userId, { member, removedBy } = {}) {
  const emp = getPayrollEmployee(guild.id, userId);
  const channelName = member ? getSalaryChannelName(member.user.username) : null;

  let channel =
    (emp?.channelId ? guild.channels.cache.get(emp.channelId) : null) ??
    (channelName ? guild.channels.cache.find((c) => c.name === channelName) : null);

  const hadPendingPay = emp?.pendingPay ?? 0;

  if (channel) {
    unlinkPayrollChannel(guild.id, channel.id);
    await channel.delete(`Løn-kanal fjernet af ${removedBy?.tag ?? "ledelse"}`).catch(() => {});
  }

  if (emp) {
    removePayrollEmployee(guild.id, userId);
  } else if (!channel) {
    return { ok: false, error: "Medarbejder har ingen løn-kanal eller registrering i systemet." };
  }

  return {
    ok: true,
    channelDeleted: Boolean(channel),
    hadPendingPay,
  };
}

export async function createAllStaffSalaryChannels(guild, roles) {
  const staffNames = getStaffRoleNames();
  const members = new Map();

  for (const name of staffNames) {
    const role = roles[name] ?? guild.roles.cache.find((r) => r.name === name);
    if (!role) continue;
    for (const m of role.members.values()) {
      if (!m.user.bot) members.set(m.id, m);
    }
  }

  let created = 0;
  for (const m of members.values()) {
    const result = await createPersonalSalaryChannel(guild, m, { recreate: false });
    if (result.created) created++;
  }

  return created;
}

/** Synkroniser eksisterende løn-kanaler til payroll-store (ved bot-start) */
export function syncSalaryChannelsToStore(guild) {
  const channels = guild.channels.cache.filter((c) => isSalaryChannel(c));
  let synced = 0;

  for (const channel of channels.values()) {
    const owner = resolveSalaryChannelOwner(guild, channel);
    if (!owner?.userId) continue;

    registerPayrollEmployee(guild.id, {
      userId: owner.userId,
      userTag: owner.userTag,
      channelId: channel.id,
      channelName: channel.name,
    });
    synced++;
  }

  return synced;
}
