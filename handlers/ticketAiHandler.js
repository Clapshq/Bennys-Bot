import { checkCooldown } from "../core/cooldowns.js";
import { rootLogger } from "../core/logger.js";
import { isTicketChannel, getTicketMeta } from "./ticketHandler.js";
import { isSalaryChannel, resolveSalaryChannelOwner } from "./salaryHandler.js";
import { isStaffMember } from "../utils/modHelpers.js";
import { createEmbed } from "../utils/brand.js";
import { groqChat, groqVision, parseJsonFromAi, isGroqConfigured } from "../services/groqChat.js";
import {
  buildTicketAiSystemPrompt,
  buildGeneralAiSystemPrompt,
  EXTRACT_WORK_PROMPT,
  INVOICE_SCAN_PROMPT,
} from "../utils/aiContext.js";
import {
  buildCombinedQuote,
  tilbudEmbed,
  formatKr,
} from "../utils/quoteBuilder.js";
import { getPartsPriceStore } from "../utils/partsPriceStore.js";
import { collectMessageImageUrls } from "../utils/messageImages.js";
import { addPayrollInvoice } from "../utils/payrollStore.js";
import { JG_MARKUP_PERCENT } from "../config/jgParts.js";

const AI_COOLDOWN_MS = 12_000;

function aiHelpEmbed() {
  return createEmbed("accent")
    .setTitle("🤖 Benny's AI")
    .setDescription("Spørg kun om **Benny's** — priser, ydelser, regler og mekaniker-RP.")
    .addFields(
      { name: "Spørgsmål", value: "`,ai Hvad koster bugsering?`\n`,ai Forklar JG tuning`", inline: false },
      { name: "Beregn tilbud", value: "`,ai tilbud V8 motor og keramiske bremser`", inline: false },
      { name: "Faktura (staff)", value: "Upload i løn-kanal — brug `/løn stats` for oversigt (ingen beskeder i kanalen)", inline: false },
      { name: "Staff", value: "`,tilbud smart <beskrivelse>`", inline: false }
    );
}

async function extractWorkItems(description) {
  const raw = await groqChat(
    [{ role: "user", content: EXTRACT_WORK_PROMPT(description) }],
    { json: true, maxTokens: 512, temperature: 0.1 }
  );
  return parseJsonFromAi(raw);
}

function buildQuoteFromExtracted(extracted) {
  const partLines = [...(extracted.parts ?? [])];
  for (const m of extracted.manualParts ?? []) {
    if (m?.id && m?.price) partLines.push(`${m.id}=${m.price}`);
  }
  return buildCombinedQuote({
    partLines,
    fixedServiceKeys: extracted.services ?? [],
  });
}

export async function handleAiTilbud(message, description, { reply = true } = {}) {
  const text = description?.trim();
  if (!text) {
    if (reply) await message.reply("❌ Brug: `,ai tilbud V8 og keramiske bremser`").catch(() => {});
    return null;
  }

  const loading = reply ? await message.reply("🧮 Beregner tilbud…").catch(() => null) : null;

  try {
    const extracted = await extractWorkItems(text);
    const quote = buildQuoteFromExtracted(extracted);
    const embed = tilbudEmbed(quote, getPartsPriceStore(), { aiNote: extracted.note || undefined });

    if (loading) await loading.edit({ content: null, embeds: [embed] }).catch(() => message.reply({ embeds: [embed] }));
    else if (reply) await message.reply({ embeds: [embed] }).catch(() => {});

    return quote;
  } catch (err) {
    rootLogger.error("AI tilbud fejlede", { error: err.message });
    const msg = `❌ Kunne ikke beregne tilbud: ${err.message}`;
    if (loading) await loading.edit({ content: msg, embeds: [] }).catch(() => message.reply(msg));
    else if (reply) await message.reply(msg).catch(() => {});
    return null;
  }
}

function resolveInvoiceTotal(data) {
  return Math.round(Number(data.total ?? data.invoiceTotal ?? data.amount) || 0);
}

function resolveEmployeePay(data) {
  const total = resolveInvoiceTotal(data);
  if (total <= 0) return 0;
  return Math.round(total * (JG_MARKUP_PERCENT / 100));
}

function buildInvoiceEmbed(data, { ownerTag, pendingPay } = {}) {
  const total = resolveInvoiceTotal(data);
  const employeePay = resolveEmployeePay(data);
  const confidence = data.confidence ?? "medium";

  const ownerLine = ownerTag ? `\n👤 Løn-kanal: **${ownerTag}**` : "";

  const embed = createEmbed(employeePay ? "gold" : confidence === "low" ? "warning" : "gold")
    .setTitle("💰 Løn")
    .setDescription(
      employeePay
        ? `**${formatKr(employeePay)}** tilføjet til lønsaldo (**${JG_MARKUP_PERCENT}%** af faktura på ${formatKr(total)}).${ownerLine}`
        : "❌ Kunne ikke aflæse fakturabeløb — tjek screenshot manuelt."
    );

  if (employeePay && pendingPay != null) {
    embed.addFields({
      name: "Udestående løn",
      value: `**${formatKr(pendingPay)}**`,
      inline: true,
    });
  }

  return embed;
}

/** Læs faktura-screenshot — i løn-kanaler skrives der ikke (brug /løn stats til embeds) */
export async function processInvoiceImages(message, { loadingMessage = null } = {}) {
  if (isSalaryChannel(message.channel)) {
    if (loadingMessage) await loadingMessage.delete().catch(() => {});
    return null;
  }

  const urls = await collectMessageImageUrls(message);
  if (!urls.length) return null;

  const owner = resolveSalaryChannelOwner(message.guild, message.channel);
  if (!owner?.userId) {
    const errEmbed = createEmbed("warning")
      .setTitle("💰 Løn")
      .setDescription("❌ Kunne ikke finde ejer af denne løn-kanal — kontakt ledelse.");
    if (loadingMessage) {
      await loadingMessage.edit({ content: null, embeds: [errEmbed] }).catch(() => message.reply({ embeds: [errEmbed] }));
    } else {
      await message.reply({ embeds: [errEmbed] }).catch(() => {});
    }
    return null;
  }

  const raw = await groqVision(INVOICE_SCAN_PROMPT, urls, { json: true });
  const data = parseJsonFromAi(raw);
  const employeePay = resolveEmployeePay(data);

  const updated = addPayrollInvoice(message.guild.id, message.channel.id, {
    invoiceTotal: resolveInvoiceTotal(data),
    employeePay,
    scannedById: message.author.id,
    scannedByTag: message.author.tag,
    messageId: message.id,
    messageDate: new Date(message.createdTimestamp).toISOString(),
  });

  const embed = buildInvoiceEmbed(data, {
    ownerTag: owner.userTag,
    pendingPay: updated?.pendingPay ?? owner.pendingPay,
  });

  await logPayrollToDashboard(message, data, employeePay, owner);

  if (loadingMessage) {
    await loadingMessage.edit({ content: null, embeds: [embed] }).catch(() => message.reply({ embeds: [embed] }));
  } else {
    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  return { data, employeePay, owner, pendingPay: updated?.pendingPay ?? 0 };
}

/** Velkomst-besked ved oprettelse af løn-kanal — ikke en faktura */
function isWelcomeSalaryEmbed(title, text) {
  if (/løn-kanal\s*—/i.test(title)) return true;
  if (/personlige faktura-kanal|upload faktura her|profit per ordre|kun dig og ledelsen/i.test(text)) {
    return true;
  }
  return false;
}

function isPayoutSalaryEmbed(title, text) {
  if (/^💰\s*udbetaling/i.test(title)) return true;
  if (/er udbetalt|løntælleren er nulstillet|udbetalt af/i.test(text)) return true;
  if (/ingen udbetaling/i.test(text)) return true;
  return false;
}

/** Parse lønbeløb fra eksisterende bot-embed i kanal-historik */
export function parsePayrollFromBotEmbed(embed) {
  const fieldsText = (embed.fields ?? []).map((f) => `${f.name}\n${f.value}`).join("\n");
  const text = `${embed.title ?? ""}\n${embed.description ?? ""}\n${fieldsText}`;
  const title = (embed.title ?? "").trim();

  if (isWelcomeSalaryEmbed(title, text)) return null;
  if (isPayoutSalaryEmbed(title, text)) return null;

  const parseKr = (raw) => {
    const n = String(raw)
      .replace(/\*\*/g, "")
      .replace(/kr\.?/gi, "")
      .trim()
      .replace(/\./g, "")
      .replace(",", ".");
    return Math.round(Number(n) || 0);
  };

  // Faktura-embed: "1.500 kr. tilføjet til lønsaldo" (med eller uden Discord-markdown)
  const addedMatch =
    text.match(/\*\*([\d.,]+)\s*kr\.?\*\*\s*tilføjet/i) ||
    text.match(/([\d.,]+)\s*kr\.?\s*tilføjet\s+til\s+lønsaldo/i);

  if (addedMatch) {
    const employeePay = parseKr(addedMatch[1]);
    let invoiceTotal = 0;
    const totalMatch =
      text.match(/faktura\s+på\s+\*\*([\d.,]+)\s*kr\.?\*\*/i) ||
      text.match(/faktura\s+på\s+([\d.,]+)\s*kr\.?/i);
    if (totalMatch) invoiceTotal = parseKr(totalMatch[1]);
    else if (employeePay > 0) invoiceTotal = Math.round(employeePay / (JG_MARKUP_PERCENT / 100));
    if (employeePay > 0) return { employeePay, invoiceTotal };
  }

  // Ældre/alternative faktura-embeds med titel "💰 Løn"
  if (/^💰\s*løn$/i.test(title) && /faktura|lønsaldo|lønbeløb/i.test(text)) {
    const payMatch = text.match(/(?:\*\*)?([\d.,]+)\s*kr\.?(?:\*\*)?/i);
    if (payMatch) {
      const employeePay = parseKr(payMatch[1]);
      let invoiceTotal = 0;
      const totalMatch = text.match(/faktura\s+på\s+(?:\*\*)?([\d.,]+)\s*kr\.?(?:\*\*)?/i);
      if (totalMatch) invoiceTotal = parseKr(totalMatch[1]);
      else if (employeePay > 0) invoiceTotal = Math.round(employeePay / (JG_MARKUP_PERCENT / 100));
      if (employeePay > 0) return { employeePay, invoiceTotal };
    }
  }

  return null;
}

async function logPayrollToDashboard(message, data, employeePay, owner) {
  const total = resolveInvoiceTotal(data);
  if (!message.guild || employeePay <= 0 || !owner?.userId) return;
  try {
    const { savePayrollLog } = await import("../services/dashboardStore.js");
    await savePayrollLog({
      guildId: message.guild.id,
      userId: owner.userId,
      userName: owner.userTag,
      invoiceTotal: total,
      employeePay,
      channelId: message.channel.id,
      scannedById: message.author.id,
      scannedByTag: message.author.tag,
    });
  } catch {
    /* optional */
  }
}

async function handleAiFaktura(message) {
  if (isSalaryChannel(message.channel)) return true;

  if (!isStaffMember(message.member)) {
    await message.reply("❌ Kun staff kan tjekke faktura-screenshots.").catch(() => {});
    return true;
  }

  const urls = await collectMessageImageUrls(message);
  if (!urls.length) {
    await message.reply("❌ Vedhæft faktura-screenshot eller svar på et billede med `,ai faktura`.").catch(() => {});
    return true;
  }

  const loading = await message.reply("💰 Aflæser lønbeløb…").catch(() => null);

  try {
    const result = await processInvoiceImages(message, { loadingMessage: loading });
    if (!result) {
      const msg = "❌ Kunne ikke læse faktura.";
      if (loading) await loading.edit({ content: msg, embeds: [] }).catch(() => message.reply(msg));
    }
    return true;
  } catch (err) {
    rootLogger.error("AI faktura fejlede", { error: err.message });
    const msg = `❌ Faktura-scan fejlede: ${err.message}`;
    if (loading) await loading.edit({ content: msg, embeds: [] }).catch(() => message.reply(msg));
    else await message.reply(msg).catch(() => {});
    return true;
  }
}

async function handleAiQuestion(message, question) {
  const inTicket = isTicketChannel(message.channel);
  const system = inTicket
    ? buildTicketAiSystemPrompt(getTicketMeta(message.channel))
    : buildGeneralAiSystemPrompt();

  const answer = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    { maxTokens: 800, temperature: 0.45 }
  );

  const embed = createEmbed("blue")
    .setAuthor({ name: "Benny's AI-assistent" })
    .setDescription(answer.slice(0, 4000))
    .setFooter({
      text: inTicket
        ? "Kun Benny's-spørgsmål · ved tvivl venter en mekaniker"
        : "Kun Benny's-spørgsmål · tjek vigtige oplysninger hos staff",
    });

  await message.reply({ embeds: [embed] }).catch(() => {});
}

function canUseAi(message) {
  if (isStaffMember(message.member)) return true;
  if (isTicketChannel(message.channel)) return true;
  return false;
}

export function isAiCommand(command) {
  return command === "ai" || command === "bot";
}

export async function handleTicketAi(message, rawArgs) {
  const args = Array.isArray(rawArgs) ? rawArgs : String(rawArgs ?? "").trim().split(/\s+/).filter(Boolean);
  if (!canUseAi(message)) {
    await message
      .reply("❌ `,ai` er for **staff** (alle kanaler) og **kunder i tickets**.")
      .catch(() => {});
    return true;
  }

  if (!isGroqConfigured()) {
    await message.reply("❌ AI er ikke sat op — tilføj `GROQ_API_KEY` i `.env`.").catch(() => {});
    return true;
  }

  const sub = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1).join(" ").trim();

  if (!sub || sub === "help" || sub === "hjælp") {
    await message.reply({ embeds: [aiHelpEmbed()] }).catch(() => {});
    return true;
  }

  if ((sub === "tilbud" || sub === "pris" || sub === "faktura") && !isStaffMember(message.member)) {
    await message.reply("❌ Kun **staff** kan bruge `,ai tilbud` og `,ai faktura`.").catch(() => {});
    return true;
  }

  const cdKey = sub === "faktura" ? "ai-faktura" : sub === "tilbud" ? "ai-tilbud" : "ai-ask";
  const cd = checkCooldown(message.author.id, cdKey, AI_COOLDOWN_MS);
  if (!cd.allowed) {
    await message.reply(`⏳ Vent **${cd.remainingSeconds}** sek. før næste AI-forespørgsel.`).catch(() => {});
    return true;
  }

  if (sub === "tilbud" || sub === "pris" || sub === "faktura") {
    if (sub === "faktura") return handleAiFaktura(message);
    const desc = rest || message.content.replace(/^,\s*ai\s+(tilbud|pris)\s*/i, "").trim();
    await handleAiTilbud(message, desc);
    return true;
  }

  const question = args.join(" ").trim();
  if (!question) {
    await message.reply({ embeds: [aiHelpEmbed()] }).catch(() => {});
    return true;
  }

  const loading = await message.reply("💭 Tænker…").catch(() => null);

  try {
    if (loading) await loading.delete().catch(() => {});
    await handleAiQuestion(message, question);
  } catch (err) {
    rootLogger.error("AI spørgsmål fejlede", { error: err.message });
    const msg = `❌ AI fejlede: ${err.message}`;
    if (loading) await loading.edit({ content: msg }).catch(() => message.reply(msg));
    else await message.reply(msg).catch(() => {});
  }

  return true;
}

/** Auto-scan i løn-kanaler er slået fra — brug /løn stats (læser bot-embeds) */
export async function tryAutoScanPayrollInvoice() {
  return false;
}

/** Staff: ,tilbud smart <beskrivelse> */
export async function handleTilbudSmart(message, description) {
  if (!isStaffMember(message.member)) {
    await message.reply("❌ Kun staff.").catch(() => {});
    return true;
  }
  if (!isGroqConfigured()) {
    await message.reply("❌ AI kræver `GROQ_API_KEY`.").catch(() => {});
    return true;
  }
  await handleAiTilbud(message, description);
  return true;
}
