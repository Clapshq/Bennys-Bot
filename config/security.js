/** Avanceret sikkerhedskonfiguration — anti-raid, anti-nuke, link-filter */
export const securityConfig = {
  enabled: process.env.SECURITY !== "false",

  /** Domæner der altid er tilladt (RP-relevante) */
  allowedDomains: [
    "discord.com",
    "discordapp.com",
    "cdn.discordapp.com",
    "media.discordapp.net",
    "tenor.com",
    "giphy.com",
    "imgur.com",
    "youtube.com",
    "youtu.be",
    "twitch.tv",
    "fivem.net",
    "github.com",
  ],

  /** Domæner der altid blokeres */
  blockedDomains: [
    "grabify.link",
    "iplogger.org",
    "2no.co",
    "yip.su",
    "leancoding.co",
    "stopify.co",
    "freegiftcards.co",
  ],

  /** Bloker alle links undtagen whitelisted domæner */
  strictLinkMode: process.env.STRICT_LINKS === "true",

  /** Anti-raid: aktiver lockdown ved masse-joins */
  antiRaid: {
    enabled: true,
    joinThreshold: parseInt(process.env.ANTI_RAID_JOINS ?? "6", 10),
    windowMs: parseInt(process.env.ANTI_RAID_WINDOW_MS ?? "10000", 10),
    lockdownDurationMs: 10 * 60 * 1000,
    minAccountAgeDays: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS ?? "0", 10),
    actionOnRaid: "lockdown", // lockdown | alert
  },

  /** Anti-nuke: overvåg destruktive handlinger */
  antiNuke: {
    enabled: true,
    actionThreshold: parseInt(process.env.ANTI_NUKE_THRESHOLD ?? "4", 10),
    windowMs: parseInt(process.env.ANTI_NUKE_WINDOW_MS ?? "15000", 10),
    punishAction: "ban", // ban | strip | alert
    trackedActions: [
      "channelDelete",
      "roleDelete",
      "guildBanAdd",
      "guildMemberRemove",
    ],
  },

  mentionSpam: {
    enabled: true,
    maxMentions: parseInt(process.env.MAX_MENTIONS ?? "5", 10),
    maxRoleMentions: 3,
    maxEveryone: 0,
  },

  zalgo: {
    enabled: true,
    maxCombiningMarks: 12,
  },
};
