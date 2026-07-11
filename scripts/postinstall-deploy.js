/**
 * Kører deploy-commands efter npm install (mange hosting-paneler gør dette automatisk).
 */
import "dotenv/config";
import { env } from "../core/env.js";

async function main() {
  if (!env.token || !env.clientId) return;

  try {
    const { registerSlashCommands } = await import("../deploy-commands.js");
    await registerSlashCommands();
    console.log("[postinstall] Slash-kommandoer registreret");
  } catch (err) {
    console.warn("[postinstall] Deploy fejlede — botten prøver igen ved start:", err.message);
  }
}

main();
