import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

export async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    throw new Error("Mangler DISCORD_TOKEN eller DISCORD_CLIENT_ID i .env");
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = commands.map((c) => c.data.toJSON());
  const names = body.map((c) => c.name).join(", ");

  if (guildId) {
    console.log(`[deploy] Registrerer ${body.length} kommandoer på guild ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  } else {
    console.log(`[deploy] Registrerer ${body.length} globale kommandoer...`);
    await rest.put(Routes.applicationCommands(clientId), { body });
  }

  console.log(`[deploy] OK — ${body.length} kommandoer: ${names}`);
  return { count: body.length, names: body.map((c) => c.name) };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("deploy-commands.js");
if (isDirectRun) {
  registerSlashCommands().catch((err) => {
    console.error("[deploy] Fejl:", err);
    process.exit(1);
  });
}
