import { env } from "./env.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[env.logLevel] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function format(scope, level, message, meta) {
  const base = `[${timestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  if (meta && Object.keys(meta).length) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

function write(level, scope, message, meta) {
  if ((LEVELS[level] ?? 99) < currentLevel) return;
  const line = format(scope, level, message, meta);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(scope) {
  return {
    debug: (msg, meta) => write("debug", scope, msg, meta),
    info: (msg, meta) => write("info", scope, msg, meta),
    warn: (msg, meta) => write("warn", scope, msg, meta),
    error: (msg, meta) => write("error", scope, msg, meta),
    interaction: (interaction, action, meta) =>
      write("info", scope, `${action} — ${interaction.user?.tag ?? "?"} (${interaction.user?.id})`, {
        guild: interaction.guildId,
        channel: interaction.channelId,
        customId: interaction.customId,
        command: interaction.commandName,
        ...meta,
      }),
  };
}

export const rootLogger = createLogger("bennys");
