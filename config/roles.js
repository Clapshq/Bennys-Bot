import { PermissionFlagsBits } from "discord.js";

const P = PermissionFlagsBits;

/** Central rolle-konfiguration for Benny's Discord */
export const rolesConfig = {
  /** Standardrolle — alle medlemmer får denne ved join */
  defaultJoin: "Kunde",

  roles: [
    {
      name: "Kunde",
      color: 0xe67e22,
      hoist: false,
      mentionable: false,
      assignOnJoin: true,
      emoji: "🔧",
      description: "Standardrolle — alle medlemmer hos Benny's",
      permissions: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.AttachFiles, P.EmbedLinks, P.AddReactions, P.UseExternalEmojis],
    },
    {
      name: "Nyheder",
      color: 0x5865f2,
      hoist: false,
      mentionable: true,
      emoji: "🔔",
      description: "Ping ved announcements og events",
      permissions: [P.ViewChannel, P.ReadMessageHistory],
    },
    {
      name: "Biltræf",
      color: 0x57f287,
      hoist: false,
      mentionable: true,
      emoji: "🚗",
      description: "Ping ved biltræf og events",
      permissions: [P.ViewChannel, P.ReadMessageHistory],
    },
    {
      name: "Lærling",
      color: 0x3498db,
      hoist: true,
      mentionable: false,
      staff: true,
      emoji: "📚",
      description: "Lærling-mekaniker — adgang til interne kanaler",
      permissions: [
        P.ViewChannel,
        P.ReadMessageHistory,
        P.SendMessages,
        P.AttachFiles,
        P.EmbedLinks,
        P.AddReactions,
        P.UseExternalEmojis,
        P.UseApplicationCommands,
      ],
    },
    {
      name: "Mekaniker",
      color: 0xf1c40f,
      hoist: true,
      mentionable: false,
      staff: true,
      emoji: "🛠️",
      description: "Medarbejder — adgang til interne kanaler",
      permissions: [
        P.ViewChannel,
        P.ReadMessageHistory,
        P.SendMessages,
        P.AttachFiles,
        P.EmbedLinks,
        P.AddReactions,
        P.UseExternalEmojis,
        P.UseApplicationCommands,
        P.ManageMessages,
      ],
    },
    {
      name: "Ledelse",
      color: 0xed4245,
      hoist: true,
      mentionable: false,
      staff: true,
      ledelse: true,
      emoji: "👔",
      description: "Ledelse — administration og økonomi",
      permissions: [
        P.ViewChannel,
        P.ReadMessageHistory,
        P.SendMessages,
        P.AttachFiles,
        P.EmbedLinks,
        P.AddReactions,
        P.UseExternalEmojis,
        P.UseApplicationCommands,
        P.ManageMessages,
        P.ManageChannels,
        P.KickMembers,
        P.BanMembers,
        P.ModerateMembers,
        P.ViewAuditLog,
        P.MentionEveryone,
        P.ManageGuild,
      ],
    },
    {
      name: "Med-ejer",
      color: 0x992d22,
      hoist: true,
      mentionable: false,
      staff: true,
      ledelse: true,
      emoji: "💎",
      description: "Med-ejer — delt ejerskab og fuld ledelsesadgang",
      permissions: [
        P.ViewChannel,
        P.ReadMessageHistory,
        P.SendMessages,
        P.AttachFiles,
        P.EmbedLinks,
        P.AddReactions,
        P.UseExternalEmojis,
        P.UseApplicationCommands,
        P.ManageMessages,
        P.ManageChannels,
        P.KickMembers,
        P.BanMembers,
        P.ModerateMembers,
        P.ViewAuditLog,
        P.MentionEveryone,
        P.ManageGuild,
      ],
    },
    {
      name: "Stifter",
      color: 0x9b59b6,
      hoist: true,
      mentionable: false,
      staff: true,
      ledelse: true,
      emoji: "👑",
      description: "Stifter — højeste rank og fuld kontrol",
      permissions: [
        P.ViewChannel,
        P.ReadMessageHistory,
        P.SendMessages,
        P.AttachFiles,
        P.EmbedLinks,
        P.AddReactions,
        P.UseExternalEmojis,
        P.UseApplicationCommands,
        P.ManageMessages,
        P.ManageChannels,
        P.KickMembers,
        P.BanMembers,
        P.ModerateMembers,
        P.ViewAuditLog,
        P.MentionEveryone,
        P.ManageGuild,
      ],
    },
  ],

  /** Gamle rolle-navne der migreres ved setup */
  legacyNames: {
    "Benny's Kunde": "Kunde",
    "Benny's Nyheder": "Nyheder",
    "Benny's Biltræf": "Biltræf",
    "Benny's Mekaniker": "Mekaniker",
    "Benny's Ledelse": "Ledelse",
  },
};

/** Rolle-hierarki (højest først) */
export function getHierarchyOrder() {
  return ["Stifter", "Med-ejer", "Ledelse", "Mekaniker", "Lærling", "Biltræf", "Nyheder", "Kunde"];
}

export function getStaffRoleNames() {
  return rolesConfig.roles.filter((r) => r.staff).map((r) => r.name);
}

export function getLedelseRoleNames() {
  return rolesConfig.roles.filter((r) => r.ledelse).map((r) => r.name);
}

export function getOptionalRoleNames() {
  return rolesConfig.roles.filter((r) => !r.assignOnJoin && !r.staff).map((r) => r.name);
}

export function memberHasStaffRole(member) {
  const names = getStaffRoleNames();
  return member?.roles?.cache?.some((r) => names.includes(r.name)) ?? false;
}

export function memberHasLedelseRole(member) {
  const names = getLedelseRoleNames();
  return member?.roles?.cache?.some((r) => names.includes(r.name)) ?? false;
}

export function getStaffRoles(guild) {
  return getStaffRoleNames()
    .map((name) => guild.roles.cache.find((r) => r.name === name))
    .filter(Boolean);
}

export function getLedelseRoles(guild) {
  return getLedelseRoleNames()
    .map((name) => guild.roles.cache.find((r) => r.name === name))
    .filter(Boolean);
}

/** Rolle-ID'er til kanal-permissions efter setup */
export function buildRolePermissionIds(roles) {
  return {
    kundeId: roles.Kunde?.id,
    staffRoleIds: getStaffRoleNames().map((n) => roles[n]?.id).filter(Boolean),
    ledelseRoleIds: getLedelseRoleNames().map((n) => roles[n]?.id).filter(Boolean),
  };
}
