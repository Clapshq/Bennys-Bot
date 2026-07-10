/** Automoderation — inspireret af filter-systemer som bleed.bot */
import { getStaffRoleNames } from "./roles.js";

export const moderation = {
  enabled: process.env.MODERATION !== "false",

  /** Kanaler hvor filter IKKE kører */
  exemptChannels: ["📦-ordrer-og-løn", "👔-ledelse", "📋-løn-system", "📋-mod-log"],

  /** Staff-roller — bypass filter (fra roles.js) */
  get staffRoles() {
    return getStaffRoleNames();
  },

  /** Bloker Discord-invite links */
  blockInvites: true,

  /** Max CAPS procent (0 = slået fra) */
  maxCapsPercent: 70,

  /** Min. tegn før caps-check */
  minLengthForCaps: 8,

  /** Anti-spam: samme besked inden for X ms */
  duplicateWindowMs: 8000,

  /** Ord der filtreres (tilføj flere i config efter behov) */
  blockedWords: [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "cunt",
    "nigger",
    "nigga",
    "faggot",
    "retard",
    "knep",
    "lort",
    "spasser",
    "perker",
    "neger",
    "kælling",
    "hore",
    "fisse",
    "pik",
    "cock",
    "dick",
    "pussy",
    "whore",
    "slut",
  ],

  /** Regex-mønstre (links, slurs med tegn imellem) */
  blockedPatterns: [
    /discord(?:\.gg|app\.com\/invite)\/[a-z0-9]+/gi,
    /n+[i!1l]+g+[e3a@]+r+/gi,
    /f+[u\*]+c+k+/gi,
  ],

  warnMessage: "⚠️ {user}, din besked blev fjernet — **upassende sprog eller links** er ikke tilladt hos Benny's.",
};

export function getAllBlockedWords() {
  // Lazy import to avoid circular deps at module load
  return moderation.blockedWords;
}

export async function loadDynamicWords() {
  try {
    const { getExtraBlockedWords } = await import("../utils/dataStore.js");
    return [...moderation.blockedWords, ...getExtraBlockedWords()];
  } catch {
    return [...moderation.blockedWords];
  }
}

export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zæøå0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
