/**
 * Entry — panel bruger BOT_JS_FILE=index.js
 * Udpak tar.gz → start bot.js (ingen top-level await — Cybrancee-kompatibel)
 */
import "dotenv/config";
import { applyPendingUpload } from "./core/applyUpload.js";

async function main() {
  if (applyPendingUpload()) return;
  await import("./bot.js");
}

main().catch((err) => {
  console.error("[bennys] Opstart fejlede:", err);
  process.exit(1);
});
