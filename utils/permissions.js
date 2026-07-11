import { PermissionFlagsBits } from "discord.js";

/** Permissions til personlig løn-kanal — medarbejder + ledelse/ejere + bot */
export function buildPersonalSalaryPermissions(guild, memberId, ledelseRoleIds = [], botId) {
  const everyone = guild.roles.everyone.id;
  const P = PermissionFlagsBits;

  const access = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];
  const ids = (Array.isArray(ledelseRoleIds) ? ledelseRoleIds : [ledelseRoleIds]).filter(Boolean);

  return [
    { id: everyone, deny: [P.ViewChannel] },
    { id: memberId, allow: access },
    ...ids.map((id) => ({ id, allow: [...access, P.ManageMessages] })),
    ...(botId ? [{ id: botId, allow: [...access, P.ManageChannels, P.ManageMessages] }] : []),
  ];
}
