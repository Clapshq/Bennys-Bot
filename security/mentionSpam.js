import { securityConfig } from "../config/security.js";

export function checkMentionSpam(message) {
  if (!securityConfig.mentionSpam.enabled) return null;

  const content = message.content ?? "";
  const userMentions = message.mentions.users.size;
  const roleMentions = message.mentions.roles.size;
  const everyone = message.mentions.everyone;
  const here = /@here/.test(content);

  const cfg = securityConfig.mentionSpam;

  if (everyone && cfg.maxEveryone <= 0) {
    return "Mass-mention (@everyone) er ikke tilladt";
  }
  if (here) {
    return "Mass-mention (@here) er ikke tilladt";
  }
  if (userMentions > cfg.maxMentions) {
    return `For mange bruger-mentions (${userMentions}/${cfg.maxMentions})`;
  }
  if (roleMentions > cfg.maxRoleMentions) {
    return `For mange rolle-mentions (${roleMentions}/${cfg.maxRoleMentions})`;
  }

  return null;
}

export function countMentions(message) {
  return {
    users: message.mentions.users.size,
    roles: message.mentions.roles.size,
    everyone: message.mentions.everyone,
    here: /@here/.test(message.content ?? ""),
  };
}
