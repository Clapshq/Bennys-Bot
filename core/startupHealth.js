import { PANEL_CHANNEL_MAP } from "../config/panels.js";
import { setPanelMessageId } from "../utils/guildMessageStore.js";

/** Gem panel-besked-ID efter setup eller manuel post (ingen /setup nødvendig ved refresh) */
export function recordPanelMessage(guildId, channelName, channelId, message) {
  const key = PANEL_CHANNEL_MAP[channelName];
  if (!key || !message?.id) return;
  setPanelMessageId(guildId, key, channelId, message.id);
}

/** Tjek at vigtige kanaler findes ved opstart */
export function runStartupHealthCheck(client) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return [];

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return [`Guild ${guildId} ikke i cache — vent på Discord`];

  const warnings = [];
  const critical = ["📋-bestillinger", "📞-kontakt", "📋-ansøgning", "📋-ansøgninger"];

  for (const name of critical) {
    if (!guild.channels.cache.find((c) => c.name === name)) {
      warnings.push(`Mangler kanal \`${name}\``);
    }
  }

  if (!guild.channels.cache.find((c) => c.name === "📜-ticket-logs")) {
    warnings.push("Mangler `#📜-ticket-logs` — ticket-transcripts logges ikke");
  }

  return warnings;
}
