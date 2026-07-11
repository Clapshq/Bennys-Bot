import fs from "fs";
import path from "path";

/** In-memory JSON cache med debounced disk-skrivning */
const cache = new Map();
const FLUSH_MS = 1500;

function scheduleFlush(filePath) {
  const entry = cache.get(filePath);
  if (!entry?.dirty) return;

  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    flushFile(filePath);
  }, FLUSH_MS);
  entry.timer.unref?.();
}

function flushFile(filePath) {
  const entry = cache.get(filePath);
  if (!entry?.dirty) return;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, JSON.stringify(entry.data, null, 2), "utf8");
  entry.dirty = false;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}

export function readCachedJson(filePath, defaultVal) {
  const entry = cache.get(filePath);
  if (entry) return structuredClone(entry.data);

  if (!fs.existsSync(filePath)) {
    const data = structuredClone(defaultVal);
    cache.set(filePath, { data, dirty: true, timer: null });
    scheduleFlush(filePath);
    return structuredClone(data);
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cache.set(filePath, { data, dirty: false, timer: null });
    return structuredClone(data);
  } catch {
    const data = structuredClone(defaultVal);
    cache.set(filePath, { data, dirty: true, timer: null });
    scheduleFlush(filePath);
    return structuredClone(data);
  }
}

export function writeCachedJson(filePath, data, { immediate = false } = {}) {
  cache.set(filePath, {
    data: structuredClone(data),
    dirty: true,
    timer: cache.get(filePath)?.timer ?? null,
  });

  if (immediate) flushFile(filePath);
  else scheduleFlush(filePath);
}

export function flushAllCachedJson() {
  for (const filePath of cache.keys()) {
    flushFile(filePath);
  }
}

export function invalidateCachedJson(filePath) {
  cache.delete(filePath);
}
