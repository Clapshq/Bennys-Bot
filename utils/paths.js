import path from "path";
import { fileURLToPath } from "url";

const utilsDir = path.dirname(fileURLToPath(import.meta.url));
const parentName = path.basename(path.resolve(utilsDir, ".."));

/** Projektrod — virker både med src/utils/ og flad utils/ (hosting) */
export const ROOT = parentName === "src" ? path.resolve(utilsDir, "../..") : path.resolve(utilsDir, "..");

export const DATA_DIR = path.join(ROOT, "data");

export function dataFile(name) {
  return path.join(DATA_DIR, name);
}
