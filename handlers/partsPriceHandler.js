import { company } from "../config/company.js";
import {
  JG_MARKUP_PERCENT,
  JG_SHOP_LABEL,
  jgPartsCatalog,
  getPartById,
  resolvePart,
} from "../config/jgParts.js";
import { createEmbed } from "../utils/brand.js";
import { isLedelseMember, isStaffMember } from "../utils/modHelpers.js";
import { requestDashboardSync } from "../services/dashboardSync.js";
import {
  getPartsPriceStore,
  getPartPrice,
  setPartPrices,
  resetToCatalogDefaults,
  isPriceDataStale,
} from "../utils/partsPriceStore.js";
import {
  isVisionConfigured,
  scanShopImageUrls,
  matchExtractedItems,
} from "../services/priceVisionService.js";
import {
  formatKr,
  splitTilbudArgs,
  buildQuote,
  tilbudEmbed,
} from "../utils/quoteBuilder.js";
import { handleTilbudSmart } from "./ticketAiHandler.js";
import { collectMessageImageUrls } from "../utils/messageImages.js";
import { postPricePanel, refreshStoredPricePanel, PRIS_CATEGORIES } from "./pricePanelHandler.js";
import { env } from "../core/env.js";
import { rootLogger } from "../core/logger.js";

function helpEmbed() {
  const aiNote = isVisionConfigured()
    ? "📸 **Shop-priser:** skriv `,pris opdatering` og vedhæft screenshot fra JG vareshop (ledelse).\n\n"
    : "⚠️ Tilføj `GROQ_API_KEY` i `.env` for screenshot-scan (gratis på console.groq.com).\n\n";

  return createEmbed("accent")
    .setTitle("💲 JG-priser & tilbud")
    .setDescription(
      aiNote +
        `Indkøbspriser fra **${JG_SHOP_LABEL}** + **+${JG_MARKUP_PERCENT}%** til kundepris.\n` +
        `Firmaprofit-mål: **${formatKr(company.profitTarget ?? 2000)}** efter materialer og løn.`
    )
    .addFields(
      {
        name: "Opdater shop-priser",
        value:
          "1. Åbn JG vareshop ingame\n" +
          "2. Tag screenshot(s)\n" +
          "3. Skriv **`,pris opdatering`** og vedhæft billedet i **#ordrer-og-løn**",
        inline: false,
      },
      {
        name: "AI i tickets",
        value: "`,ai <spørgsmål>` · `,ai tilbud V8 og bremser` · `,tilbud smart …` (staff)",
        inline: false,
      },
      {
        name: "Se dagens priser",
        value: "`,pris idag` · `,pris idag tuning`",
        inline: false,
      },
      {
        name: "Tilbud (manuel)",
        value: "`,tilbud ceramic bremser, nitrous`",
        inline: false,
      },
      {
        name: "Prispanel (ledelse)",
        value: "`,pris panel` — klik del → ændre pris · `,pris panel motor` · `,pris panel opdater`",
        inline: false,
      },
      {
        name: "Backup",
        value: "`,pris opdatering` + billede · `,pris idag` · `,pris søg` · `,pris nulstil`",
        inline: false,
      }
    );
}

function idagEmbed(store, categoryFilter) {
  const stale = isPriceDataStale(store);
  const updated = store.updatedAt
    ? `<t:${Math.floor(new Date(store.updatedAt).getTime() / 1000)}:R>`
    : "ukendt";

  let parts = jgPartsCatalog.filter((p) => getPartPrice(p.id, store) != null);
  if (categoryFilter) {
    parts = parts.filter((p) => p.category === categoryFilter);
  }
  parts.sort((a, b) => a.label.localeCompare(b.label, "da"));

  const lines = parts.map((p) => {
    const buy = getPartPrice(p.id, store);
    const sell = Math.round(buy * (1 + JG_MARKUP_PERCENT / 100));
    return `**${p.label}** — indkøb ${formatKr(buy)} → kunde ~${formatKr(sell)}`;
  });

  const embed = createEmbed(stale ? "warning" : "success")
    .setTitle(`📦 Dagens JG-indkøbspriser${categoryFilter ? ` · ${categoryFilter}` : ""}`)
    .setDescription(
      (stale ? "⚠️ **Priser er ældre end 24 timer** — ledelse bør opdatere fra vareshop.\n\n" : "") +
        (lines.length ? lines.slice(0, 40).join("\n") : "Ingen dele med pris i denne kategori.")
    )
    .addFields({
      name: "Sidst opdateret",
      value: `${updated}${store.updatedBy ? ` · <@${store.updatedBy}>` : ""}\n${store.source ?? JG_SHOP_LABEL}`,
      inline: false,
    });

  if (lines.length > 40) {
    embed.setFooter({ text: `Viser 40 af ${lines.length} dele — brug ,pris søg <navn>` });
  }

  return embed;
}

function parsePriceLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const colon = trimmed.match(/^(.+?)[:=]\s*([\d.,\s$kr]+)$/i);
  if (colon) {
    const part = resolvePart(colon[1].trim());
    const price = Number(String(colon[2]).replace(/[^\d]/g, ""));
    if (part && Number.isFinite(price)) return { id: part.id, price };
    return null;
  }

  const space = trimmed.match(/^(\S+)\s+([\d.,\s$kr]+)$/);
  if (space) {
    const part = resolvePart(space[1]);
    const price = Number(String(space[2]).replace(/[^\d]/g, ""));
    if (part && Number.isFinite(price)) return { id: part.id, price };
  }

  return null;
}

export async function collectShopImageUrls(message) {
  return collectMessageImageUrls(message);
}

function scanResultEmbed({ matched, unmatched, imageCount, provider }) {
  const lines = matched
    .slice(0, 25)
    .map(({ part, price, rawName }) => {
      const note = rawName.toLowerCase() !== part.label.toLowerCase() ? ` ← *${rawName}*` : "";
      return `▸ **${part.label}** — ${formatKr(price)}${note}`;
    })
    .join("\n");

  const embed = createEmbed("success")
    .setTitle(`✅ ${matched.length} priser læst fra JG shop`)
    .setDescription(lines || "Ingen dele matched.")
    .addFields({
      name: "Kilde",
      value: `${imageCount} screenshot(s) · ${provider}\nMekanikere kan nu bruge \`,pris idag\`, \`,tilbud\` og \`,ai\` i tickets`,
      inline: false,
    });

  if (matched.length > 25) {
    embed.setFooter({ text: `+ ${matched.length - 25} flere dele opdateret` });
  }

  if (unmatched.length) {
    embed.addFields({
      name: `⚠️ ${unmatched.length} ukendte linjer (ignoreret)`,
      value: unmatched
        .slice(0, 8)
        .map((u) => `• ${u.name}: ${formatKr(u.price)}`)
        .join("\n"),
      inline: false,
    });
  }

  return embed;
}

export async function handlePrisScan(message, { auto = false } = {}) {
  if (!isLedelseMember(message.member)) {
    if (!auto) await message.reply("❌ Kun **ledelse & ejere** kan scanne shop-priser.").catch(() => {});
    return !auto;
  }

  if (!isVisionConfigured()) {
    const text =
      "❌ AI-vision er ikke sat op.\nTilføj **`GROQ_API_KEY`** i `.env` på serveren (gratis: [console.groq.com](https://console.groq.com))";
    await message.reply(text).catch(() => {});
    return true;
  }

  const urls = await collectMessageImageUrls(message);
  if (!urls.length) {
    if (!auto) {
      await message
        .reply("❌ Vedhæft shop-screenshot(s) eller svar på et billede med `,pris opdatering`.")
        .catch(() => {});
    }
    return !auto;
  }

  const loading = await message.reply(`🔍 Læser **${urls.length}** screenshot(s) fra JG shop…`).catch(() => null);

  try {
    const rawItems = await scanShopImageUrls(urls);
    const { matched, unmatched } = matchExtractedItems(rawItems);

    if (!matched.length) {
      const fail = createEmbed("error")
        .setTitle("❌ Kunne ikke læse priser")
        .setDescription(
          "AI fandt ingen genkendelige dele.\n" +
            (unmatched.length
              ? `Rå linjer: ${unmatched.map((u) => u.name).join(", ")}`
              : "Prøv tydeligere screenshot med fuld shop-grid.")
        );
      if (loading) await loading.edit({ content: null, embeds: [fail] }).catch(() => message.reply({ embeds: [fail] }));
      return true;
    }

    const updates = Object.fromEntries(matched.map(({ part, price }) => [part.id, price]));
    setPartPrices(updates, message.author.id, `${JG_SHOP_LABEL} — AI screenshot`);
    requestDashboardSync(message.client);

    const provider = env.groqApiKey ? "Groq Vision" : "Gemini Vision";
    const embed = scanResultEmbed({ matched, unmatched, imageCount: urls.length, provider });

    if (loading) await loading.edit({ content: null, embeds: [embed] }).catch(() => message.reply({ embeds: [embed] }));
    else await message.reply({ embeds: [embed] }).catch(() => {});

    return true;
  } catch (err) {
    rootLogger.error("Pris scan fejlede", { error: err.message });
    const msg = `❌ Scan fejlede: ${err.message}`;
    if (loading) await loading.edit({ content: msg, embeds: [] }).catch(() => message.reply(msg));
    else await message.reply(msg).catch(() => {});
    return true;
  }
}

export async function tryAutoScanPriceImages(message) {
  return false;
}

export function isPrisCommand(command) {
  return command === "pris" || command === "priser";
}

export function isTilbudCommand(command) {
  return command === "tilbud" || command === "tilbuds";
}

export async function handlePrisPrefix(message, rawArgs) {
  const args = Array.isArray(rawArgs) ? rawArgs : String(rawArgs ?? "").trim().split(/\s+/).filter(Boolean);
  if (!isStaffMember(message.member)) {
    await message.reply("❌ Kun staff.").catch(() => {});
    return true;
  }

  const sub = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1).join(" ").trim();
  const store = getPartsPriceStore();

  if (!sub || sub === "help") {
    await message.reply({ embeds: [helpEmbed()] }).catch(() => {});
    return true;
  }

  if (sub === "idag" || sub === "i-dag") {
    const category = rest.toLowerCase() || null;
    await message.reply({ embeds: [idagEmbed(store, category)] }).catch(() => {});
    return true;
  }

  if (sub === "søg" || sub === "sog" || sub === "find") {
    const q = rest || args.slice(1).join(" ");
    if (!q) {
      await message.reply("❌ Brug: `,pris søg bremser`").catch(() => {});
      return true;
    }
    const found = resolvePart(q);
    const list = found ? [found] : jgPartsCatalog.filter((p) => {
      const nq = q.toLowerCase();
      return p.label.toLowerCase().includes(nq) || p.aliases.some((a) => a.includes(nq)) || p.id.includes(nq.replace(/\s/g, "_"));
    }).slice(0, 15);

    if (!list.length) {
      await message.reply(`❌ Ingen dele fundet for **${q}**`).catch(() => {});
      return true;
    }

    const text = list
      .map((p) => {
        const buy = getPartPrice(p.id, store);
        return buy != null
          ? `**${p.label}** (\`${p.id}\`) — ${formatKr(buy)}`
          : `**${p.label}** (\`${p.id}\`) — *ingen pris*`;
      })
      .join("\n");

    await message.reply({ embeds: [createEmbed("blue").setTitle(`🔍 Søg: ${q}`).setDescription(text)] }).catch(() => {});
    return true;
  }

  if (sub === "opdatering") {
    if (!isLedelseMember(message.member)) {
      await message.reply("❌ Kun ledelse.").catch(() => {});
      return true;
    }
    return handlePrisScan(message);
  }

  if (sub === "scan" || sub === "screenshot" || sub === "billede") {
    return handlePrisScan(message);
  }

  if (sub === "panel") {
    if (!isLedelseMember(message.member)) {
      await message.reply("❌ Kun ledelse.").catch(() => {});
      return true;
    }
    const mode = (args[1] ?? "").toLowerCase();
    if (mode === "opdater" || mode === "refresh") {
      const ok = await refreshStoredPricePanel(message.guild);
      await message.reply(ok ? "✅ Prispanel opdateret." : "❌ Intet panel fundet — kør `,pris panel` først.").catch(() => {});
      return true;
    }
    const category = PRIS_CATEGORIES.some((c) => c.id === mode) ? mode : "motor";
    return postPricePanel(message, { category });
  }

  if (sub === "opdater" || sub === "update") {
    if (!isLedelseMember(message.member)) {
      await message.reply("❌ Kun **ledelse & ejere** kan opdatere shop-priser.").catch(() => {});
      return true;
    }

    const body = rest || message.content.split("\n").slice(1).join("\n");
    const lines = body.split(/\n|,/).map((l) => l.trim()).filter(Boolean);
    const updates = {};

    for (const line of lines) {
      const parsed = parsePriceLine(line);
      if (parsed) updates[parsed.id] = parsed.price;
    }

    if (!Object.keys(updates).length) {
      await message.reply({
        embeds: [
          createEmbed("warning")
            .setTitle("Ingen priser parsed")
            .setDescription("Brug `,pris opdatering` med vedhæftet shop-screenshot — eller skriv priser manuelt."),
        ],
      }).catch(() => {});
      return true;
    }

    setPartPrices(updates, message.author.id, JG_SHOP_LABEL);
    requestDashboardSync(message.client);
    const names = Object.entries(updates)
      .map(([id, price]) => `▸ ${getPartById(id)?.label ?? id}: ${formatKr(price)}`)
      .join("\n");

    await message.reply({
      embeds: [
        createEmbed("success")
          .setTitle(`✅ ${Object.keys(updates).length} priser opdateret`)
          .setDescription(names),
      ],
    }).catch(() => {});
    return true;
  }

  if (sub === "nulstil" || sub === "reset") {
    if (!isLedelseMember(message.member)) {
      await message.reply("❌ Kun ledelse.").catch(() => {});
      return true;
    }
    resetToCatalogDefaults(message.author.id);
    requestDashboardSync(message.client);
    await message.reply("✅ Priser nulstillet til katalog.").catch(() => {});
    return true;
  }

  await message.reply({ embeds: [helpEmbed()] }).catch(() => {});
  return true;
}

export async function handleTilbudPrefix(message, rawArgs) {
  const args = Array.isArray(rawArgs) ? rawArgs : String(rawArgs ?? "").trim().split(/\s+/).filter(Boolean);
  if (!isStaffMember(message.member)) {
    await message.reply("❌ Kun staff.").catch(() => {});
    return true;
  }

  const sub = (args[0] ?? "").toLowerCase();
  if (sub === "smart") {
    return handleTilbudSmart(message, args.slice(1).join(" "));
  }

  const text = args.join(" ").trim();
  if (!text) {
    await message.reply("❌ Brug: `,tilbud ceramic bremser` · `,tilbud smart V8 og bremser`").catch(() => {});
    return true;
  }

  const store = getPartsPriceStore();
  const quote = buildQuote(splitTilbudArgs(text));
  await message.reply({ embeds: [tilbudEmbed(quote, store)] }).catch(() => {});
  return true;
}
