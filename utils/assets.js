import fs from "fs";
import path from "path";
import { ROOT } from "./paths.js";

/** Kun til bot-profilbillede — ikke embeds/bannere */
export const LOGO_PATH = path.join(ROOT, "assets/logo.png");

export function logoExists() {
  return fs.existsSync(LOGO_PATH);
}
