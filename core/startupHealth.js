import { PANEL_CHANNEL_MAP } from "../config/panels.js";
import { setPanelMessageId } from "../utils/guildMessageStore.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Gem panel-besked-ID efter setup eller manuel post (ingen /setup nødvendig ved refresh) */
export function recordPanelMessage(guildId, channelName, channelId, message) {
  const key = PANEL_CHANNEL_MAP[channelName];
  if (!key || !message?.id) return;
  setPanelMessageId(guildId, key, channelId, message.id);
}

/** Tjek at serveren kører rigtig Benny's build (ikke gammel/anden bot) */
export function runBuildHealthCheck() {
  const warnings = [];
  const required = [
    "handlers/payrollActions.js",
    "utils/payrollStore.js",
    "commands/payroll.js",
  ];

  for (const rel of required) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      warnings.push(`MANGLER ${rel} — upload er fejlet eller gammel bot kører stadig`);
    }
  }

  if (fs.existsSync(path.join(ROOT, "commands/slashcommands"))) {
    warnings.push(
      "commands/slashcommands findes — det er IKKE Benny's bot. Tjek startup-kommando (skal være index.js)"
    );
  }

  return warnings;
}

/** Tjek at vigtige kanaler findes ved opstart */
export function runStartupHealthCheck(client) {
  const buildWarnings = runBuildHealthCheck();
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return buildWarnings;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return [...buildWarnings, `Guild ${guildId} ikke i cache — vent på Discord`];

  const warnings = [...buildWarnings];
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
