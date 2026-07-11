import { DEFAULT_PREFIX } from "../utils/guildMessageStore.js";

export { DEFAULT_PREFIX };

export function parsePrefixMessage(content, prefix = DEFAULT_PREFIX) {
  const trimmed = content.trim();
  if (!prefix || !trimmed.startsWith(prefix)) return null;

  const body = trimmed.slice(prefix.length).trim();
  if (!body) return { command: "", args: "", tokens: [] };

  const tokens = body.split(/\s+/);
  const command = tokens[0].toLowerCase();
  const args = body.slice(tokens[0].length).trim();

  return { command, args, tokens, body };
}

/** Handlers that expect token arrays should use this — `args` from parse is a string. */
export function toArgTokens(args) {
  if (Array.isArray(args)) return args;
  return String(args ?? "").trim().split(/\s+/).filter(Boolean);
}
