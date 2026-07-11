import { dispatchRichMessage, buildEmbedFromPayload } from "../utils/embedSend.js";
import { createEmbed } from "../utils/brand.js";
import {
  listWelcomeMessages,
  listGoodbyeMessages,
  listBoostMessages,
  addWelcomeMessage,
  addGoodbyeMessage,
  addBoostMessage,
  removeWelcomeMessage,
  removeGoodbyeMessage,
  removeBoostMessage,
  listAutoresponders,
  addAutoresponder,
  removeAutoresponder,
  getStickyConfig,
  setStickyConfig,
  clearStickyConfig,
} from "../utils/guildMessageStore.js";
import {
  listReactionTriggers,
  addReactionTrigger,
  removeReactionTrigger,
} from "../utils/reactionTriggerStore.js";
import {
  modKick,
  modBan,
  modUnban,
  modMute,
  modUnmute,
  modWarn,
  modClearWarns,
  modSetNick,
  modSoftban,
  modAddNote,
} from "../handlers/manualModerationHandler.js";
import { purgeMessages } from "../handlers/moderationHandler.js";
import { modLock, modUnlock, modSlowmode } from "../handlers/manualModerationHandler.js";
import { parseDuration } from "../utils/modHelpers.js";
import { startGiveawayInChannel, endGiveaway } from "../handlers/giveawayHandler.js";
import { getGiveaway } from "../utils/giveawayStore.js";
import { runProfilAction } from "../handlers/botProfileHandler.js";
import { requestDashboardSync } from "./dashboardSync.js";

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const SYSTEM = {
  welcome: { add: addWelcomeMessage, remove: removeWelcomeMessage, list: listWelcomeMessages },
  goodbye: { add: addGoodbyeMessage, remove: removeGoodbyeMessage, list: listGoodbyeMessages },
  boost: { add: addBoostMessage, remove: removeBoostMessage, list: listBoostMessages },
};

async function fetchChannel(guild, channelId) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) throw new Error("Kanal ikke fundet eller understøtter ikke beskeder");
  return channel;
}

async function fetchExecutor(guild, reviewerId, client) {
  const member = await guild.members.fetch(reviewerId).catch(() => null);
  if (member) return member;
  const user = await client.users.fetch(reviewerId).catch(() => null);
  if (!user) throw new Error("Kunne ikke finde staff-bruger på serveren");
  return user;
}

async function fetchTargetUser(guild, userId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) return member.user;
  return { id: userId, tag: userId };
}

export async function sendPlainMessage(channel, content) {
  if (!content?.trim()) throw new Error("Besked må ikke være tom");
  const msg = await channel.send({ content: String(content).slice(0, 2000) });
  return { messageId: msg.id, channelId: channel.id };
}

export async function sendPollMessage(channel, question, options) {
  const opts = (options ?? []).map((o) => String(o).trim()).filter(Boolean);
  if (!question?.trim() || opts.length < 2) throw new Error("Poll kræver spørgsmål og mindst 2 valg");
  if (opts.length > 10) throw new Error("Max 10 valg");

  const desc = opts.map((o, i) => `${POLL_EMOJIS[i]} ${o}`).join("\n");
  const embed = createEmbed("blue").setTitle(`📊 ${question.trim()}`).setDescription(desc);
  const pollMsg = await channel.send({ embeds: [embed] });
  for (let i = 0; i < opts.length; i++) {
    await pollMsg.react(POLL_EMOJIS[i]).catch(() => {});
  }
  return { messageId: pollMsg.id, channelId: channel.id };
}

function systemConfigFromPayload(payload) {
  const config = { content: payload.content ?? null, embedData: null, raw: payload.content ?? "" };
  if (payload.embed && (payload.embed.title || payload.embed.description)) {
    config.embedData = buildEmbedFromPayload(payload.embed).toJSON();
  }
  return config;
}

export async function runDashboardAction(client, guild, reviewerId, type, payload = {}) {
  switch (type) {
    case "SEND_MESSAGE": {
      const channel = await fetchChannel(guild, payload.channelId);
      return dispatchRichMessage(channel, {
        content: payload.content,
        embed: payload.embed,
        components: payload.components,
      });
    }

    case "SEND_POLL": {
      const channel = await fetchChannel(guild, payload.channelId);
      return sendPollMessage(channel, payload.question, payload.options);
    }

    case "SEND_EMBED": {
      if (payload.webhookUrl) {
        return dispatchRichMessage(null, payload);
      }
      const channel = await fetchChannel(guild, payload.channelId);
      return dispatchRichMessage(channel, {
        content: payload.content,
        embed: payload.embed ?? {},
        embeds: payload.embeds,
        components: payload.components,
        attachmentUrls: payload.attachmentUrls,
        messageId: payload.messageId,
        username: payload.username,
        avatarUrl: payload.avatarUrl,
        threadId: payload.threadId,
      });
    }

    case "PURGE_MESSAGES": {
      const channel = await fetchChannel(guild, payload.channelId);
      const amount = Math.min(100, Math.max(1, Number(payload.amount) || 10));
      const executor = await fetchExecutor(guild, reviewerId, client);
      const count = await purgeMessages(channel, amount, executor);
      return { purged: count, channelId: channel.id };
    }

    case "MOD_ACTION": {
      const executor = await fetchExecutor(guild, reviewerId, client);
      const target = await fetchTargetUser(guild, payload.userId);
      const action = String(payload.action ?? "").toLowerCase();
      const reason = payload.reason ?? "Via Benny's Dashboard";

      let result;
      switch (action) {
        case "kick":
          result = await modKick(guild, executor, target, reason);
          break;
        case "ban":
          result = await modBan(guild, executor, target, reason, Number(payload.deleteDays) || 0);
          break;
        case "unban":
          result = await modUnban(guild, executor, payload.userId, reason);
          break;
        case "mute":
          result = await modMute(
            guild,
            executor,
            target,
            parseDuration(payload.duration ?? "1h") ?? 3600000,
            reason
          );
          break;
        case "unmute":
          result = await modUnmute(guild, executor, target, reason);
          break;
        case "warn":
          result = await modWarn(guild, executor, target, reason);
          break;
        case "clearwarns":
          result = await modClearWarns(guild, executor, target);
          break;
        case "nick": {
          const nick = payload.nickname;
          result = await modSetNick(guild, executor, target, nick || null, reason);
          break;
        }
        case "softban":
          result = await modSoftban(guild, executor, target, reason, Number(payload.deleteDays) || 1);
          break;
        case "note":
          result = await modAddNote(guild, executor, target, payload.note ?? reason);
          break;
        default:
          throw new Error(`Ukendt mod-handling: ${action}`);
      }
      if (!result.ok) throw new Error(result.error ?? "Moderation fejlede");
      return { action, userId: payload.userId, ...result };
    }

    case "ASSIGN_ROLE": {
      const member = await guild.members.fetch(payload.userId).catch(() => null);
      if (!member) throw new Error("Medlem ikke fundet");
      const role = guild.roles.cache.get(payload.roleId);
      if (!role) throw new Error("Rolle ikke fundet");
      if (payload.remove) {
        await member.roles.remove(role, `Dashboard af ${reviewerId}`);
      } else {
        await member.roles.add(role, `Dashboard af ${reviewerId}`);
      }
      return { userId: payload.userId, roleId: payload.roleId, remove: Boolean(payload.remove) };
    }

    case "CHANNEL_LOCK": {
      const channel = await fetchChannel(guild, payload.channelId);
      const executor = await fetchExecutor(guild, reviewerId, client);
      const reason = "Via Benny's Dashboard";
      if (payload.lock) await modLock(channel, executor, reason);
      else await modUnlock(channel, executor, reason);
      return { channelId: channel.id, lock: Boolean(payload.lock) };
    }

    case "CHANNEL_SLOWMODE": {
      const channel = await fetchChannel(guild, payload.channelId);
      const executor = await fetchExecutor(guild, reviewerId, client);
      const seconds = Math.min(21600, Math.max(0, Number(payload.seconds) || 0));
      await modSlowmode(channel, seconds, executor);
      return { channelId: channel.id, seconds };
    }

    case "MANAGE_SYSTEM_MSG": {
      const kind = payload.kind;
      const cfg = SYSTEM[kind];
      if (!cfg) throw new Error("Ukendt type — brug welcome, goodbye eller boost");
      const action = payload.action ?? "add";
      if (action === "remove") {
        const r = cfg.remove(guild.id, payload.channelId);
        if (!r.ok) throw new Error(r.error ?? "Kunne ikke fjerne");
        return { kind, removed: payload.channelId };
      }
      if (!payload.channelId) throw new Error("channelId kræves");
      cfg.add(guild.id, payload.channelId, systemConfigFromPayload(payload));
      return { kind, channelId: payload.channelId };
    }

    case "MANAGE_AUTORESPONDER": {
      const action = payload.action ?? "add";
      if (action === "remove") {
        const r = removeAutoresponder(guild.id, payload.trigger);
        if (!r.ok) throw new Error(r.error ?? "Kunne ikke fjerne");
        return { trigger: payload.trigger };
      }
      const r = addAutoresponder(
        guild.id,
        payload.trigger,
        payload.response ?? payload.content,
        payload.embed ? buildEmbedFromPayload(payload.embed).toJSON() : null,
        payload.content ?? null
      );
      if (!r.ok) throw new Error(r.error ?? "Kunne ikke tilføje");
      return { trigger: payload.trigger };
    }

    case "MANAGE_STICKY": {
      const action = payload.action ?? "set";
      if (action === "remove") {
        clearStickyConfig(guild.id, payload.channelId);
        return { channelId: payload.channelId };
      }
      if (!payload.content?.trim()) throw new Error("Sticky-indhold kræves");
      setStickyConfig(guild.id, payload.channelId, {
        content: payload.content.trim(),
        embedData: payload.embed ? buildEmbedFromPayload(payload.embed).toJSON() : null,
      });
      return { channelId: payload.channelId };
    }

    case "MANAGE_REACTION": {
      const action = payload.action ?? "add";
      if (action === "remove") {
        const r = removeReactionTrigger(guild.id, payload.trigger);
        if (!r.ok) throw new Error(r.error ?? "Kunne ikke fjerne");
        return { trigger: payload.trigger };
      }
      const r = addReactionTrigger(guild.id, payload.trigger, payload.emoji);
      if (!r.ok) throw new Error(r.error ?? "Kunne ikke tilføje");
      return { trigger: payload.trigger, emoji: payload.emoji };
    }

    case "UPDATE_BOT_PROFILE": {
      return runProfilAction(client, payload.action ?? "vis", {
        description: payload.description,
        prefix: ",",
        buffer: null,
      });
    }

    case "START_GIVEAWAY": {
      const channel = await fetchChannel(guild, payload.channelId);
      const host = await client.users.fetch(reviewerId).catch(() => null);
      return startGiveawayInChannel(client, guild, channel, {
        duration: payload.duration,
        winners: payload.winners,
        prize: payload.prize,
        hostId: reviewerId,
        hostTag: host?.tag ?? "Dashboard",
      });
    }

    case "END_GIVEAWAY": {
      const entry = getGiveaway(guild.id, payload.messageId);
      if (!entry) throw new Error("Giveaway ikke fundet");
      const forcedBy = await client.users.fetch(reviewerId).catch(() => null);
      await endGiveaway(client, entry, forcedBy);
      return { messageId: payload.messageId };
    }

    default:
      return null;
  }
}

export function bumpSync(client) {
  requestDashboardSync(client);
}
