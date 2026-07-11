import { env } from "./env.js";
import { rootLogger } from "./logger.js";

const RETRY_DELAYS_MS = [0, 3000, 8000];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Registrerer slash-kommandoer ved bot-start (kører altid).
 */
export async function deploySlashCommandsOnStartup() {
  if (!env.autoDeployCommands) {
    rootLogger.warn(
      "[deploy] AUTO_DEPLOY_COMMANDS=false i .env — slash-kommandoer registreres alligevel (/løn, /udbetal)"
    );
  }
  if (!env.token || !env.clientId) {
    rootLogger.warn("[deploy] Springer over — mangler DISCORD_TOKEN eller DISCORD_CLIENT_ID");
    return { ok: false, skipped: true };
  }

  const { registerSlashCommands } = await import("../deploy-commands.js");

  let lastError;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      rootLogger.warn(`[deploy] Forsøg ${attempt + 1}/${RETRY_DELAYS_MS.length}…`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      const result = await registerSlashCommands();
      rootLogger.info("[deploy] Slash-kommandoer registreret ved opstart", {
        count: result.count,
        commands: result.names.join(", "),
      });
      return { ok: true, ...result };
    } catch (err) {
      lastError = err;
      rootLogger.error("[deploy] Forsøg fejlede", { error: err.message, attempt: attempt + 1 });
    }
  }

  rootLogger.error("[deploy] Kunne ikke registrere slash-kommandoer efter flere forsøg", {
    error: lastError?.message,
  });
  return { ok: false, error: lastError?.message };
}
