/**
 * Kører deploy-commands efter npm install (mange hosting-paneler gør dette automatisk).
 * Fejler stille hvis .env mangler — botten deployer igen ved start.
 */
import "dotenv/config";
import { env } from "../core/env.js";

if (!env.autoDeployCommands || !env.token || !env.clientId) {
  process.exit(0);
}

try {
  const { registerSlashCommands } = await import("../deploy-commands.js");
  await registerSlashCommands();
  console.log("[postinstall] Slash-kommandoer registreret");
} catch (err) {
  console.warn("[postinstall] Deploy fejlede — botten prøver igen ved start:", err.message);
  process.exit(0);
}
