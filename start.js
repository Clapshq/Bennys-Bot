/**
 * Entry point — udpakker uploadet tar.gz FØR bot-koden loades,
 * så handlers/commands osv. overskrives uden konsol.
 */
import { applyPendingUpload } from "./core/applyUpload.js";

if (applyPendingUpload()) {
  // process.exit via restartBot()
}

await import("./index.js");
