import { parsePrefixMessage, toArgTokens } from "../utils/prefixParse.js";
import { getGuildPrefix } from "../utils/guildMessageStore.js";
import { isStaffMember, hasModPermission } from "../utils/modHelpers.js";
import { handleEmbedPrefix, isEmbedCommand } from "./embedPrefixHandler.js";
import { handleReactionRolePrefix, isReactionRoleCommand } from "./reactionRoleHandler.js";
import {
  handleSystemMessagePrefix,
  isWelcomeCommand,
  isGoodbyeCommand,
  isBoostCommand,
} from "./welcomeHandler.js";
import {
  handlePollPrefix,
  handleRolePrefix,
  handleSayPrefix,
  handleSnipePrefix,
  handleAutoresponderPrefix,
  handleStickyPrefix,
  handleReactionPrefix,
  handleNicknamePrefix,
  checkAutoresponder,
  checkReactionTrigger,
  repostSticky,
} from "./utilityPrefixHandler.js";
import { handleGiveawayPrefix, isGiveawayCommand } from "./giveawayHandler.js";
import { handleHelpPrefix, isHelpCommand } from "./prefixHelpHandler.js";
import { handleThreadPrefix } from "./threadPrefixHandler.js";
import { handleButtonRolePrefix, isButtonRoleCommand } from "./buttonRoleHandler.js";
import { handleProfilPrefix, isProfilCommand } from "./botProfileHandler.js";
import { handlePrefixSettings, isPrefixCommand } from "./prefixSettingsHandler.js";
import { handlePanelsPrefix, isPanelsCommand } from "./panelsPrefixHandler.js";
import {
  handlePrisPrefix,
  handleTilbudPrefix,
  isPrisCommand,
  isTilbudCommand,
} from "./partsPriceHandler.js";
import { handleTicketAi, isAiCommand } from "./ticketAiHandler.js";

export { DEFAULT_PREFIX as COMMAND_PREFIX } from "../utils/prefixParse.js";

export async function handlePrefixMessage(message) {
  if (!message.guild || message.author.bot || message.author.id === message.client.user?.id) {
    return false;
  }

  const prefix = getGuildPrefix(message.guild.id);
  const parsed = parsePrefixMessage(message.content, prefix);
  if (!parsed) return false;

  const { command, args, tokens } = parsed;
  if (!command) return false;

  const argTokens = toArgTokens(tokens.slice(1));

  const staff = message.member && isStaffMember(message.member);
  const mod = message.member && hasModPermission(message.member);

  if (command === "tl") {
    if (!staff && !mod) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleThreadPrefix(message, true, args);
  }

  if (command === "tu") {
    if (!staff && !mod) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleThreadPrefix(message, false, args);
  }

  if (isHelpCommand(command)) return handleHelpPrefix(message);
  if (isProfilCommand(command)) return handleProfilPrefix(message, args);
  if (isPrefixCommand(command)) return handlePrefixSettings(message, args);
  if (isPanelsCommand(command)) return handlePanelsPrefix(message, args);
  if (isAiCommand(command)) return handleTicketAi(message, argTokens);
  if (isPrisCommand(command)) return handlePrisPrefix(message, argTokens);
  if (isTilbudCommand(command)) return handleTilbudPrefix(message, argTokens);
  if (isEmbedCommand(command)) return handleEmbedPrefix(message, args);

  if (isReactionRoleCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleReactionRolePrefix(message, args);
  }

  if (isButtonRoleCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleButtonRolePrefix(message, args);
  }

  if (isWelcomeCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleSystemMessagePrefix(message, args, "welcome");
  }

  if (isGoodbyeCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleSystemMessagePrefix(message, args, "goodbye");
  }

  if (isBoostCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleSystemMessagePrefix(message, args, "boost");
  }

  if (isGiveawayCommand(command)) {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleGiveawayPrefix(message, args);
  }

  if (command === "poll") {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handlePollPrefix(message, args);
  }

  if (command === "role") return handleRolePrefix(message, args);

  if (command === "nickname" || command === "nick") {
    if (!mod) {
      await message.reply("❌ Kun moderation.").catch(() => {});
      return true;
    }
    return handleNicknamePrefix(message, args);
  }

  if (command === "say") {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleSayPrefix(message, args);
  }

  if (command === "snipe") {
    if (!mod) {
      await message.reply("❌ Kun moderation.").catch(() => {});
      return true;
    }
    return handleSnipePrefix(message);
  }

  if (command === "autoresponder") {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleAutoresponderPrefix(message, args);
  }

  if (command === "sticky") {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleStickyPrefix(message, args);
  }

  if (command === "reaction") {
    if (!staff) {
      await message.reply("❌ Kun staff.").catch(() => {});
      return true;
    }
    return handleReactionPrefix(message, args);
  }

  return false;
}

export async function handlePrefixSideEffects(message) {
  if (!message.guild || message.author.bot) return;

  const prefix = getGuildPrefix(message.guild.id);
  const parsed = parsePrefixMessage(message.content, prefix);
  if (parsed?.command) return;

  await checkAutoresponder(message);
  await checkReactionTrigger(message);

  const { getStickyConfig } = await import("../utils/guildMessageStore.js");
  if (getStickyConfig(message.guild.id, message.channel.id)) {
    const key = `${message.guild.id}:${message.channel.id}`;
    const now = Date.now();
    if (!handlePrefixSideEffects._stickyLast) handlePrefixSideEffects._stickyLast = new Map();
    if (now - (handlePrefixSideEffects._stickyLast.get(key) ?? 0) >= 30_000) {
      handlePrefixSideEffects._stickyLast.set(key, now);
      await repostSticky(message.guild, message.channel.id);
    }
  }
}
