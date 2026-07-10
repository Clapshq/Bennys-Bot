/**
 * Entry — panel bruger BOT_JS_FILE=index.js
 * 1) Udpak uploadet tar.gz og overskriv handlers/commands osv.
 * 2) Start botten (bot.js)
 */
import "dotenv/config";
import { applyPendingUpload } from "./core/applyUpload.js";

if (applyPendingUpload()) {
  // process.exit via restartBot()
}

await import("./bot.js");
