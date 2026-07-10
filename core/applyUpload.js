import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { ROOT } from "../utils/paths.js";
import { createLogger } from "./logger.js";

const log = createLogger("update");

/** Filnavne brugeren kan uploade via File Manager */
const ARCHIVE_NAMES = [
  "bennys-upload-linux-LATEST.tar.gz",
  "bennys-upload-linux.tar.gz",
  "update.tar.gz",
  "bennys-update.tar.gz",
];

/** Kode-mapper der slettes og genopbygges ved upload (data/ og .env bevares) */
const CODE_DIRS = ["handlers", "commands", "utils", "core", "services", "security", "config", "scripts"];

const PRESERVE_FILES = new Set([".env", ".env.local", "package-lock.json"]);

function findPendingArchive() {
  for (const name of ARCHIVE_NAMES) {
    const full = path.join(ROOT, name);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

/** Fjern forkerte Windows-uploads (handlers\fil.js) og gammel bot-struktur */
function cleanupLegacyFiles() {
  let removed = 0;

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name.includes("\\")) {
        fs.rmSync(full, { recursive: true, force: true });
        removed++;
        continue;
      }
      if (entry.isDirectory()) walk(full);
    }
  };

  walk(ROOT);

  const slashCommands = path.join(ROOT, "commands", "slashcommands");
  if (fs.existsSync(slashCommands)) {
    fs.rmSync(slashCommands, { recursive: true, force: true });
    removed++;
    log.info("Slettede gammel commands/slashcommands (forkert bot)");
  }

  return removed;
}

function wipeCodeDirs() {
  for (const dir of CODE_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
      log.info(`Slettede ${dir}/`);
    }
  }

  for (const file of ["bot.js", "deploy-commands.js", "start.js", "BENNYS-BOT.txt", "START-HER.txt", "UPLOAD-UDEN-KONSOL.txt", "DEPLOY-COLORNODES.txt", "DOWNLOAD.txt", "README.md", "CYBRANCEE-UPLOAD.txt"]) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full) && !PRESERVE_FILES.has(file)) {
      fs.rmSync(full, { force: true });
    }
  }
}

function extractArchive(archivePath) {
  const name = path.basename(archivePath);
  log.info(`Udpakker ${name} — overskriver handlers, commands, osv.`);

  try {
    execSync(`tar -xzf ${JSON.stringify(archivePath)} --overwrite`, {
      cwd: ROOT,
      stdio: "pipe",
    });
  } catch {
    execSync(`tar -xzf ${JSON.stringify(archivePath)}`, { cwd: ROOT, stdio: "pipe" });
  }

  fs.rmSync(archivePath, { force: true });
  log.info("Upload fuldført — tar.gz fjernet");
}

function restartBot() {
  const script = "index.js";
  const child = spawn(process.execPath, [path.join(ROOT, script), "--no-update"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  child.unref();
  process.exit(0);
}

/**
 * Hvis brugeren har uploadet tar.gz i File Manager, slet gammel kode og udpak.
 * Kaldes fra start.js FØR index.js loades.
 */
export function applyPendingUpload() {
  if (process.argv.includes("--no-update")) return false;

  const archive = findPendingArchive();
  if (!archive) return false;

  cleanupLegacyFiles();
  wipeCodeDirs();
  extractArchive(archive);

  if (!fs.existsSync(path.join(ROOT, "bot.js"))) {
    log.error("Udpakning fejlede — bot.js mangler. Upload tar.gz igen.");
    process.exit(1);
  }

  log.info("Genstarter med ny kode…");
  restartBot();
  return true;
}
