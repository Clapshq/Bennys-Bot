import { PermissionFlagsBits } from "discord.js";
import { moderation, normalizeText, loadDynamicWords } from "../config/moderation.js";
import { securityConfig } from "../config/security.js";
import { containsSuspiciousLink } from "../security/linkFilter.js";
import { checkMentionSpam } from "../security/mentionSpam.js";
import { checkZalgoSpam } from "../security/zalgoFilter.js";
import { logModAction } from "../services/modLogService.js";
import { createLogger } from "../core/logger.js";

const log = createLogger("automod");

const recentMessages = new Map();
const userStrikeCounts = new Map();
let cachedWords = null;
let cacheTime = 0;
const CACHE_MS = 5000;

async function getBlockedWordsList() {
  if (!cachedWords || Date.now() - cacheTime > CACHE_MS) {
    cachedWords = await loadDynamicWords();
    cacheTime = Date.now();
  }
  return cachedWords;
}

export function invalidateWordCache() {
  cachedWords = null;
}

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return moderation.staffRoles.some((name) => member.roles.cache.some((r) => r.name === name));
}

function isExemptChannel(channel) {
  if (!channel?.name) return false;
  if (moderation.exemptChannels.includes(channel.name)) return true;
  if (channel.name.startsWith("bestilling-") || channel.name.startsWith("henvendelse-") || channel.name.startsWith("ticket-")) return true;
  if (channel.name.startsWith("💰-løn-")) return true;
  if (channel.name.startsWith("løn-") || channel.name.startsWith("lon-")) return true;
  return false;
}

/** Multi-stage filter pipeline — hver stage returnerer grund eller null */
const FILTER_PIPELINE = [
  {
    name: "invite",
    enabled: () => moderation.blockInvites,
    check: (ctx) => (/discord(?:\.gg|app\.com\/invite)\/[a-z0-9]+/i.test(ctx.content) ? "Discord-invite links" : null),
  },
  {
    name: "blocked_words",
    enabled: () => true,
    check: async (ctx) => {
      const list = await getBlockedWordsList();
      const normalized = normalizeText(ctx.content);
      for (const blocked of list) {
        const b = normalizeText(blocked);
        if (normalized.includes(b)) return "Upassende sprog";
      }
      for (const pattern of moderation.blockedPatterns) {
        if (pattern.test(ctx.content)) return "Upassende sprog (mønster)";
      }
      return null;
    },
  },
  {
    name: "links",
    enabled: () => securityConfig.enabled,
    check: (ctx) => containsSuspiciousLink(ctx.content),
  },
  {
    name: "mentions",
    enabled: () => securityConfig.mentionSpam.enabled,
    check: (ctx) => checkMentionSpam(ctx.message),
  },
  {
    name: "zalgo",
    enabled: () => securityConfig.zalgo.enabled,
    check: (ctx) => checkZalgoSpam(ctx.content),
  },
  {
    name: "caps",
    enabled: () => moderation.maxCapsPercent > 0,
    check: (ctx) => {
      const letters = ctx.content.replace(/[^a-zA-ZæøåÆØÅ]/g, "");
      if (letters.length < moderation.minLengthForCaps) return null;
      const upper = letters.replace(/[^A-ZÆØÅ]/g, "").length;
      return (upper / letters.length) * 100 >= moderation.maxCapsPercent ? "For mange store bogstaver (caps)" : null;
    },
  },
  {
    name: "duplicate",
    enabled: () => moderation.duplicateWindowMs > 0,
    check: (ctx) => {
      const key = ctx.userId;
      const now = Date.now();
      const prev = recentMessages.get(key);
      if (prev && prev.content === ctx.content && now - prev.time < moderation.duplicateWindowMs) {
        return "Spam (gentaget besked)";
      }
      recentMessages.set(key, { content: ctx.content, time: now });
      return null;
    },
  },
];

async function runPipeline(message) {
  const ctx = {
    message,
    content: message.content ?? "",
    userId: message.author.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
  };

  for (const stage of FILTER_PIPELINE) {
    if (!stage.enabled()) continue;
    const reason = await stage.check(ctx);
    if (reason) {
      log.debug("Filter triggered", { stage: stage.name, user: message.author.tag, reason });
      return { reason, stage: stage.name };
    }
  }

  return null;
}

function incrementStrikes(userId) {
  const count = (userStrikeCounts.get(userId) ?? 0) + 1;
  userStrikeCounts.set(userId, count);
  return count;
}

export async function handleMessageModeration(message) {
  if (!moderation.enabled) return;
  if (!message.guild || message.author.bot) return;
  if (!message.content && message.attachments.size === 0) return;
  if (isExemptChannel(message.channel)) return;

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (isStaff(member)) return;

  const violation = await runPipeline(message);
  if (!violation) return;

  await message.delete().catch(() => {});

  const strikes = incrementStrikes(message.author.id);
  const warning = moderation.warnMessage.replace("{user}", `${message.author}`);

  const notice = await message.channel
    .send({ content: `${warning}\n*Strike ${strikes}/5*`, allowedMentions: { users: [message.author.id] } })
    .catch(() => null);

  if (notice) setTimeout(() => notice.delete().catch(() => {}), 8000);

  await logModAction(message.guild, {
    action: "automod",
    target: message.author,
    moderator: "Automoderation",
    reason: violation.reason,
    userId: message.author.id,
    evidence: message.content.slice(0, 500),
    fields: [
      { name: "Filter", value: violation.stage, inline: true },
      { name: "Strikes", value: `${strikes}`, inline: true },
      { name: "Kanal", value: `${message.channel}`, inline: true },
    ],
  });

  if (strikes >= 5 && member?.moderatable) {
    await member.timeout(30 * 60 * 1000, "Automod: 5 strikes").catch(() => {});
    userStrikeCounts.delete(message.author.id);
    log.warn("Auto-timeout efter 5 strikes", { user: message.author.tag });
  }
}

export async function purgeMessages(channel, amount, executor) {
  const deleted = await channel.bulkDelete(Math.min(amount, 100), true);

  await logModAction(channel.guild, {
    action: "purge",
    target: channel,
    moderator: executor,
    reason: `${deleted.size} beskeder slettet`,
    fields: [{ name: "Antal", value: `${deleted.size}`, inline: true }],
  });

  return deleted.size;
}
