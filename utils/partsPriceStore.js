import { jgPartsCatalog } from "../config/jgParts.js";
import { readCachedJson, writeCachedJson } from "./jsonCache.js";
import { dataFile } from "./paths.js";

const FILE = dataFile("jg-prices.json");

let afterPricesSave = null;

/** Kaldes efter hver pris-gemning — bruges til auto-opdatering af prispanel */
export function onAfterPricesSave(fn) {
  afterPricesSave = fn;
}

async function notifyPricesSaved() {
  try {
    await afterPricesSave?.();
  } catch {
    /* panel refresh må ikke blokere pris-gemning */
  }
}

function buildDefaultPrices() {
  const prices = {};
  for (const part of jgPartsCatalog) {
    if (part.defaultPrice != null) prices[part.id] = part.defaultPrice;
  }
  return prices;
}

function defaultStore() {
  return {
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    source: "JG shop — standardkatalog",
    prices: buildDefaultPrices(),
  };
}

export function getPartsPriceStore() {
  return readCachedJson(FILE, defaultStore());
}

export function savePartsPriceStore(store) {
  writeCachedJson(FILE, store, { immediate: true });
}

export function getPartPrice(partId, store = getPartsPriceStore()) {
  const id = String(partId).toLowerCase();
  if (store.prices[id] != null) return store.prices[id];
  const catalog = jgPartsCatalog.find((p) => p.id === id);
  return catalog?.defaultPrice ?? null;
}

export function setPartPrices(updates, userId, source = "JG shop") {
  const store = getPartsPriceStore();
  for (const [id, price] of Object.entries(updates)) {
    if (typeof price === "number" && price >= 0) store.prices[id] = price;
  }
  store.updatedAt = new Date().toISOString();
  store.updatedBy = userId;
  store.source = source;
  savePartsPriceStore(store);
  notifyPricesSaved();
  return store;
}

export function resetToCatalogDefaults(userId) {
  const store = {
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
    source: "JG shop — nulstillet til katalog",
    prices: buildDefaultPrices(),
  };
  savePartsPriceStore(store);
  notifyPricesSaved();
  return store;
}

export function isPriceDataStale(store, maxAgeHours = 24) {
  if (!store?.updatedAt) return true;
  const age = Date.now() - new Date(store.updatedAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
