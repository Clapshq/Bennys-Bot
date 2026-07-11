import { company } from "../config/company.js";
import { JG_MARKUP_PERCENT, jgPartsCatalog } from "../config/jgParts.js";
import { getPartPrice, getPartsPriceStore, isPriceDataStale } from "./partsPriceStore.js";
import { resolvePart } from "../config/jgParts.js";
import { createEmbed } from "./brand.js";

const PROFIT_TARGET = company.profitTarget ?? 2000;

/** Faste kundepriser (ingen +20% — allerede listepris) */
export const fixedCustomerServices = {
  bugsering: { label: "Bugsering", price: 1950 },
  reparation: { label: "Reparation", price: 1450 },
  reparations_kit: { label: "Reparations-kit", price: 4850 },
  olieskift: { label: "Service / olieskift", price: 800 },
  carplay: { label: "CarPlay installation", price: 3000 },
  stance: { label: "Stance (affjedring)", price: 8000 },
  stance_kit: { label: "Stance-kit", price: 22000 },
  daek: { label: "Dæk (Slick/Semi/Offroad)", price: 13000 },
  styling: { label: "Styling / kosmetik", price: 500 },
};

export function formatKr(amount) {
  return `${Math.round(amount).toLocaleString("da-DK")} kr.`;
}

function parsePriceValue(raw) {
  const n = Number(String(raw).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function splitTilbudArgs(text) {
  return text
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildQuote(lines) {
  const items = [];
  const missing = [];
  let materialTotal = 0;

  for (const raw of lines) {
    const inline = raw.match(/^(.+?)[:=]\s*([\d.,\s$kr]+)$/i);
    if (inline) {
      const part = resolvePart(inline[1].trim());
      const price = parsePriceValue(inline[2]);
      if (part && price != null) {
        items.push({ part, price, source: "manuel" });
        materialTotal += price;
        continue;
      }
    }

    const part = resolvePart(raw);
    if (!part) {
      missing.push(raw);
      continue;
    }

    const price = getPartPrice(part.id);
    if (price == null) {
      missing.push(`${part.label} (ingen pris — brug del=pris)`);
      continue;
    }

    items.push({ part, price, source: "shop" });
    materialTotal += price;
  }

  const markupAmount = materialTotal * (JG_MARKUP_PERCENT / 100);
  const customerPrice = materialTotal + markupAmount;
  const marginOk = materialTotal === 0 || markupAmount >= PROFIT_TARGET;

  return { items, missing, materialTotal, markupAmount, customerPrice, marginOk, fixedItems: [] };
}

export function buildCombinedQuote({ partLines = [], fixedServiceKeys = [] }) {
  const quote = buildQuote(partLines);
  const fixedItems = [];

  for (const key of fixedServiceKeys) {
    const svc = fixedCustomerServices[key];
    if (svc) fixedItems.push({ ...svc, key });
  }

  const fixedTotal = fixedItems.reduce((s, f) => s + f.price, 0);

  return {
    ...quote,
    fixedItems,
    customerPrice: quote.customerPrice + fixedTotal,
    marginOk: quote.materialTotal === 0 ? true : quote.marginOk,
  };
}

export function tilbudEmbed(quote, store = getPartsPriceStore(), { aiNote } = {}) {
  if (!quote.items.length && !quote.fixedItems?.length) {
    return createEmbed("error")
      .setTitle("❌ Kunne ikke beregne tilbud")
      .setDescription(
        quote.missing?.length
          ? `Ukendt eller uden pris:\n${quote.missing.map((m) => `• ${m}`).join("\n")}\n\nBrug \`,pris idag\` eller \`del=pris\` fra tablet.`
          : "Angiv dele eller arbejde — fx `,ai tilbud V8 og keramiske bremser`"
      );
  }

  const partLines = quote.items
    .map(({ part, price, source }) => {
      const tag = source === "manuel" ? " (tablet)" : "";
      return `▸ **${part.label}** — ${formatKr(price)}${tag}`;
    })
    .join("\n");

  const fixedLines = (quote.fixedItems ?? [])
    .map((f) => `▸ **${f.label}** — ${formatKr(f.price)} *(listepris)*`)
    .join("\n");

  const staleNote = isPriceDataStale(store) ? "\n⚠️ Shop-priser er ikke opdateret i dag." : "";

  const embed = createEmbed(quote.marginOk ? "success" : "warning")
    .setTitle("🧾 Tilbud — anbefalet kundepris")
    .setDescription(`Regel: JG-dele = indkøb + ${JG_MARKUP_PERCENT}% · listeydelser = fast pris${staleNote}`);

  if (partLines) {
    embed.addFields({ name: "Dele (indkøb)", value: partLines, inline: false });
  }
  if (fixedLines) {
    embed.addFields({ name: "Ydelser (listepris)", value: fixedLines, inline: false });
  }

  const calcLines = [];
  if (quote.materialTotal > 0) {
    calcLines.push(`Indkøb dele: **${formatKr(quote.materialTotal)}**`);
    calcLines.push(`+ ${JG_MARKUP_PERCENT}% (løn & drift): **${formatKr(quote.markupAmount)}**`);
  }
  if (quote.fixedItems?.length) {
    calcLines.push(`Listeydelser: **${formatKr(quote.fixedItems.reduce((s, f) => s + f.price, 0))}**`);
  }
  calcLines.push(`**Anbefalet kundepris i alt: ${formatKr(quote.customerPrice)}**`);

  embed.addFields({ name: "Beregning", value: calcLines.join("\n"), inline: false });

  if (!quote.marginOk && quote.materialTotal > 0) {
    embed.addFields({
      name: "⚠️ Profit-advarsel",
      value: `${JG_MARKUP_PERCENT}%-puljen er kun **${formatKr(quote.markupAmount)}** — under firmamålet **${formatKr(PROFIT_TARGET)}**. Spørg ledelse.`,
      inline: false,
    });
  }

  if (quote.missing?.length) {
    embed.addFields({
      name: "Sprunget over",
      value: quote.missing.map((m) => `• ${m}`).join("\n"),
      inline: false,
    });
  }

  if (aiNote) {
    embed.addFields({ name: "💡 AI-note", value: aiNote, inline: false });
  }

  embed.setFooter({ text: "AI-beregning — mekaniker godkender endelig pris" });
  return embed;
}

/** Kompakt prisliste til AI-kontekst */
export function buildShopPriceContext(maxItems = 40) {
  const store = getPartsPriceStore();
  const lines = jgPartsCatalog
    .filter((p) => getPartPrice(p.id, store) != null)
    .slice(0, maxItems)
    .map((p) => `${p.label}: indkøb ${getPartPrice(p.id, store)} kr → kunde ~${Math.round(getPartPrice(p.id, store) * (1 + JG_MARKUP_PERCENT / 100))} kr`);

  const fixed = Object.entries(fixedCustomerServices)
    .map(([k, v]) => `${v.label} (${k}): ${v.price} kr listepris`);

  return {
    shopUpdated: store.updatedAt,
    shopStale: isPriceDataStale(store),
    shopLines: lines.join("\n"),
    fixedLines: fixed.join("\n"),
    listPrices: company.priceSections
      .flatMap((s) => s.lines.filter((l) => l.startsWith("**")))
      .slice(0, 20)
      .join("\n"),
  };
}
