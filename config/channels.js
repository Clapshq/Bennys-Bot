import { ChannelType, PermissionFlagsBits } from "discord.js";

/**
 * Kanal-adgang for Kunde-rollen:
 * - readonly     → se + læse (ingen beskeder; panel-knapper/menus virker)
 * - write        → se + skrive
 * - forum        → se + oprette tråde (anmeldelser)
 * - staff        → staff-roller (Mekaniker + ledelse/ejere)
 * - ledelse      → Stifter, Med-ejer & Ledelse
 */
export const customerCategories = [
  {
    name: "Information",
    defaultAccess: "readonly",
    channels: [
      { name: "📣-information", type: ChannelType.GuildText, topic: "Officielle nyheder og info om Benny's", access: "readonly" },
      { name: "📋-ansøgning", type: ChannelType.GuildText, topic: "Ansøg om job som mekaniker — brug knappen nedenfor", access: "readonly" },
      { name: "📞-kontakt", type: ChannelType.GuildText, topic: "Generelt support, ban-ansøgning, klage & prisoverslag — vælg type i menuen", access: "readonly" },
      { name: "⏳-reaktions-roller", type: ChannelType.GuildText, topic: "Vælg valgfrie roller i menuen nedenfor", access: "readonly" },
      { name: "📋-bestillinger", type: ChannelType.GuildText, topic: "Bestil reparation, tuning eller styling — brug knapperne", access: "readonly" },
      { name: "💲-priser", type: ChannelType.GuildText, topic: "Prisliste for Benny's services", access: "readonly" },
    ],
  },
  {
    name: "Borgere",
    defaultAccess: "write",
    channels: [
      { name: "👨-chat", type: ChannelType.GuildText, topic: "Generel chat for kunder og borgere", access: "write" },
      {
        name: "💬-anmeldelser",
        type: ChannelType.GuildForum,
        topic: "Del din oplevelse med Benny's — én tråd per besøg",
        access: "forum",
      },
    ],
  },
];

export const staffCategories = [
  {
    name: "Medarbejdere",
    defaultAccess: "staff",
    channels: [
      { name: "🔧-ansatte-chat", type: ChannelType.GuildText, topic: "Intern chat for Benny's medarbejdere", access: "staff" },
      { name: "📋-fravær", type: ChannelType.GuildText, topic: "Meld fravær til ledelsen — brug knappen nedenfor", access: "staff" },
      { name: "📦-ordrer-og-løn", type: ChannelType.GuildText, topic: "Lønsystem, profit-mål og ordre-info", access: "staff" },
      { name: "📋-mod-log", type: ChannelType.GuildText, topic: "Moderations-logs og automoderation", access: "staff" },
      { name: "📜-ticket-logs", type: ChannelType.GuildText, topic: "Ticket transcripts og luknings-logs", access: "staff" },
      { name: "👔-ledelse", type: ChannelType.GuildText, topic: "Ledelse & ejere — Stifter, Med-ejer, Ledelse", access: "ledelse" },
      { name: "📋-ansøgninger", type: ChannelType.GuildText, topic: "Indkomne mekaniker-ansøgninger — kun ledelse", access: "ledelse" },
    ],
  },
];

export const applicationChannelNames = {
  public: "📋-ansøgning",
  review: "📋-ansøgninger",
};

export const payrollCategories = [
  {
    name: "Løn & Faktura",
    defaultAccess: "staff",
    channels: [
      {
        name: "📋-løn-system",
        type: ChannelType.GuildText,
        topic: "Guide til personlige løn-kanaler og faktura-upload",
        access: "staff",
      },
    ],
  },
];

/** Alle kategori-navne Benny's setup styrer */
export function getAllCategoryConfigs(includeStaff = true, includePayroll = true) {
  return [
    ...customerCategories,
    ...(includeStaff ? staffCategories : []),
    ...(includeStaff && includePayroll ? payrollCategories : []),
  ];
}

const P = PermissionFlagsBits;

/** Oversigt til embeds / dokumentation */
export const permissionSummary = [
  { channel: "📣 information", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "📋 ansøgning", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "📞 kontakt", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "⏳ reaktions-roller", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "📋 bestillinger", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "💲 priser", kunde: "Kun læse", staff: "Kan skrive" },
  { channel: "👨 chat", kunde: "Kan skrive", staff: "Kan skrive" },
  { channel: "💬 anmeldelser", kunde: "Kan oprette tråde", staff: "Kan skrive" },
  { channel: "🔧 ansatte-chat", kunde: "Ingen adgang", staff: "Kun staff" },
  { channel: "📋 fravær", kunde: "Ingen adgang", staff: "Kun staff — fraværs-tickets" },
  { channel: "📦 ordrer-og-løn", kunde: "Ingen adgang", staff: "Kun staff" },
  { channel: "📋 løn-system", kunde: "Ingen adgang", staff: "Kun staff" },
  { channel: "💰 løn-[navn]", kunde: "Ingen adgang", staff: "Kun ejer + ledelse/ejere" },
  { channel: "👔 ledelse", kunde: "Ingen adgang", staff: "Stifter, Med-ejer & Ledelse" },
  { channel: "📋 ansøgninger", kunde: "Ingen adgang", staff: "Kun ledelse — DM-ansøgninger" },
  { channel: "📋 mod-log", kunde: "Ingen adgang", staff: "Kun staff" },
  { channel: "📜 ticket-logs", kunde: "Ingen adgang", staff: "Kun staff" },
];

export function buildChannelPermissions(_guild, { kundeId, staffRoleIds = [], ledelseRoleIds = [] } = {}) {
  const everyone = _guild.roles.everyone.id;
  const mechanicRoleIds = staffRoleIds.filter((id) => !ledelseRoleIds.includes(id));

  const view = [P.ViewChannel, P.ReadMessageHistory];
  const write = [...view, P.SendMessages, P.AttachFiles, P.EmbedLinks];
  const staffWrite = [...write, P.ManageMessages];
  const forumCustomer = [
    ...view,
    P.CreatePublicThreads,
    P.SendMessagesInThreads,
    P.AttachFiles,
    P.EmbedLinks,
  ];
  const forumStaff = [...forumCustomer, P.SendMessages, P.ManageThreads, P.ManageMessages];

  const denyView = [P.ViewChannel];
  const denyWrite = [P.SendMessages];

  function overwrite(id, { allow = [], deny = [] }) {
    return { id, allow, deny };
  }

  function staffWriteAccess(roleId, extraAllow = []) {
    if (!roleId) return [];
    return [overwrite(roleId, { allow: [...staffWrite, ...extraAllow] })];
  }

  function allStaffWriteAccess(extraAllow = []) {
    return staffRoleIds.flatMap((id) => staffWriteAccess(id, extraAllow));
  }

  function denyViewForRoles(roleIds) {
    return roleIds.flatMap((id) => [overwrite(id, { deny: denyView })]);
  }

  /** Kunder kan se — staff kan skrive (info-kanaler) */
  function readonlyChannel(extraForKunde = {}) {
    const { allow: kundeAllow = [], deny: kundeDeny = denyWrite } = extraForKunde;
    return [
      overwrite(everyone, { allow: view, deny: denyWrite }),
      ...(kundeId ? [overwrite(kundeId, { allow: [...view, ...kundeAllow], deny: kundeDeny })] : []),
      ...allStaffWriteAccess(),
    ];
  }

  /** Kunder og staff kan skrive */
  function writeChannel() {
    return [
      overwrite(everyone, { allow: write }),
      ...(kundeId ? [overwrite(kundeId, { allow: write })] : []),
      ...allStaffWriteAccess(),
    ];
  }

  /** Forum — kunder opretter tråde, ikke beskeder i hovedkanalen */
  function forumChannel() {
    return [
      overwrite(everyone, { allow: forumCustomer, deny: denyWrite }),
      ...(kundeId ? [overwrite(kundeId, { allow: forumCustomer, deny: denyWrite })] : []),
      ...allStaffWriteAccess([P.SendMessages, P.ManageThreads]),
    ];
  }

  /** Kun staff (mekanikere + ledelse/ejere) */
  function staffChannel() {
    return [
      overwrite(everyone, { deny: denyView }),
      ...(kundeId ? [overwrite(kundeId, { deny: denyView })] : []),
      ...allStaffWriteAccess(),
    ];
  }

  /** Kun ledelse & ejere (Stifter, Med-ejer, Ledelse) */
  function ledelseChannel() {
    return [
      overwrite(everyone, { deny: denyView }),
      ...(kundeId ? [overwrite(kundeId, { deny: denyView })] : []),
      ...denyViewForRoles(mechanicRoleIds),
      ...ledelseRoleIds.flatMap((id) => staffWriteAccess(id)),
    ];
  }

  const byAccess = {
    readonly: () => readonlyChannel(),
    readonlyReact: () => readonlyChannel({ allow: [P.AddReactions, P.UseExternalEmojis], deny: denyWrite }),
    write: () => writeChannel(),
    forum: () => forumChannel(),
    staff: () => staffChannel(),
    ledelse: () => ledelseChannel(),
  };

  const map = {};

  for (const cat of getAllCategoryConfigs(true, true)) {
    for (const ch of cat.channels) {
      const access = ch.access ?? cat.defaultAccess ?? "write";
      const builder = byAccess[access];
      map[ch.name] = builder ? builder() : writeChannel();
    }
  }

  return map;
}

/** Kategori-permissions (arves af kanaler medmindre overskrevet) */
export function buildCategoryPermissions(_guild, categoryName, roleIds = {}) {
  const cat = getAllCategoryConfigs(true, true).find((c) => c.name === categoryName);
  if (!cat) return [];

  const channelMap = buildChannelPermissions(_guild, roleIds);

  const sampleChannel = cat.channels[0]?.name;
  if (sampleChannel && channelMap[sampleChannel]) {
    return channelMap[sampleChannel];
  }

  return buildChannelPermissions(_guild, roleIds)[cat.channels[0]?.name] ?? [];
}
