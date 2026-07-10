import { env } from "../core/env.js";
import { rootLogger } from "../core/logger.js";
import { jgPartsCatalog, resolvePart } from "../config/jgParts.js";

const EXTRACTION_PROMPT = `Du analyserer screenshots af en FiveM JG Mechanic vareshop ("Bennys mekaniker").
Hver vare viser: vægt øverst til venstre, grøn pris øverst til højre (fx $18,150), navn nederst.
Udtræk ALLE synlige varer fra billedet/billederne. Returner KUN valid JSON:
{"items":[{"name":"Ceramic Brakes","price":18150}]}
Regler:
- price: heltal uden $, komma eller "kr"
- name: præcis label fra UI (dansk eller engelsk)
- ignorer shop-header, vægt og ikoner
- medtag delvist synlige varer hvis navn og pris kan læses`;

export function isVisionConfigured() {
  return Boolean(env.groqApiKey || env.geminiApiKey);
}

function parseVisionJson(text) {
  const raw = String(text ?? "").trim();
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const payload = jsonBlock ? jsonBlock[1] : raw;
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returnerede ikke JSON");
  const parsed = JSON.parse(payload.slice(start, end + 1));
  const items = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  return items
    .map((row) => ({
      name: String(row.name ?? row.label ?? row.item ?? "").trim(),
      price: Number(String(row.price ?? row.cost ?? 0).replace(/[^\d]/g, "")),
    }))
    .filter((row) => row.name && row.price > 0);
}

async function scanWithGroq(imageUrls) {
  const content = [{ type: "text", text: EXTRACTION_PROMPT }];
  for (const url of imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.groqVisionModel,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return parseVisionJson(data.choices?.[0]?.message?.content ?? "");
}

async function fetchImageBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kunne ikke hente billede (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) throw new Error("Billede over 4 MB — brug mindre screenshot");
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
  return { mime, data: buf.toString("base64") };
}

async function scanWithGemini(imageUrls) {
  const parts = [{ text: EXTRACTION_PROMPT }];
  for (const url of imageUrls) {
    const { mime, data } = await fetchImageBase64(url);
    parts.push({ inline_data: { mime_type: mime, data } });
  }

  const model = env.geminiVisionModel;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  return parseVisionJson(text);
}

/** Matcher AI-navn til JG-katalog */
export function matchVisionItemName(name) {
  let part = resolvePart(name);
  if (part) return part;

  const clean = String(name)
    .replace(/[^\w\sæøåÆØÅ-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  part = resolvePart(clean);
  if (part) return part;

  const lower = clean.toLowerCase();
  for (const p of jgPartsCatalog) {
    if (p.label.toLowerCase() === lower) return p;
  }
  for (const p of jgPartsCatalog) {
    const pl = p.label.toLowerCase();
    if (pl.includes(lower) || lower.includes(pl)) return p;
  }
  for (const p of jgPartsCatalog) {
    if (p.aliases.some((a) => lower.includes(a) || a.includes(lower))) return p;
  }
  return null;
}

export function matchExtractedItems(rawItems) {
  const matched = [];
  const unmatched = [];
  const seen = new Map();

  for (const item of rawItems) {
    const part = matchVisionItemName(item.name);
    if (part) {
      seen.set(part.id, { part, price: item.price, rawName: item.name });
    } else {
      unmatched.push(item);
    }
  }

  return { matched: [...seen.values()], unmatched };
}

/** Læs shop-screenshot(s) via Groq (primær) eller Gemini (fallback) */
export async function scanShopImageUrls(imageUrls) {
  if (!imageUrls.length) throw new Error("Ingen billeder");
  const urls = imageUrls.slice(0, 5);

  if (env.groqApiKey) {
    try {
      return await scanWithGroq(urls);
    } catch (err) {
      rootLogger.warn("Groq vision fejlede", { error: err.message });
      if (!env.geminiApiKey) throw err;
    }
  }

  if (env.geminiApiKey) {
    return scanWithGemini(urls);
  }

  throw new Error("Ingen AI-nøgle — sæt GROQ_API_KEY eller GEMINI_API_KEY i .env");
}
