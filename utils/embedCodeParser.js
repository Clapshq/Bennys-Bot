import { EmbedBuilder } from "discord.js";

function stripCodeFences(text) {
  return text
    .replace(/^```(?:json|embed)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function parseColor(value) {
  const raw = value.replace(/^#/, "").trim();
  if (/^[0-9a-f]{6}$/i.test(raw)) return parseInt(raw, 16);
  if (/^0x[0-9a-f]+$/i.test(value.trim())) return parseInt(value.trim(), 16);
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0) return num;
  return null;
}

function splitBleedParts(key, value) {
  const k = key.toLowerCase();
  if (["field", "author", "footer"].includes(k) && value.includes("&&")) {
    return value.split("&&").map((p) => p.trim());
  }
  if (value.includes("::")) return value.split("::").map((p) => p.trim());
  return [value.trim()];
}

function applyBlock(embed, key, value, out) {
  const k = key.toLowerCase();

  if (k === "message" || k === "content") {
    out.content = (out.content ? `${out.content}\n` : "") + value.replace(/\\n/g, "\n");
    return true;
  }

  switch (k) {
    case "title":
      embed.setTitle(value.slice(0, 256));
      break;
    case "description":
    case "desc":
      embed.setDescription(value.replace(/\\n/g, "\n").slice(0, 4096));
      break;
    case "url":
    case "link":
      embed.setURL(value);
      break;
    case "color":
    case "colour": {
      const color = parseColor(value);
      if (color !== null) embed.setColor(color);
      break;
    }
    case "footer": {
      const [text, iconUrl] = splitBleedParts(k, value);
      if (text) embed.setFooter(iconUrl ? { text, iconURL: iconUrl } : { text });
      break;
    }
    case "author": {
      const [name, iconUrl, url] = splitBleedParts(k, value);
      if (name) {
        embed.setAuthor({
          name,
          ...(iconUrl ? { iconURL: iconUrl } : {}),
          ...(url ? { url } : {}),
        });
      }
      break;
    }
    case "thumbnail":
    case "thumb":
      embed.setThumbnail(value);
      break;
    case "image":
    case "img":
      embed.setImage(value);
      break;
    case "timestamp":
      embed.setTimestamp(value === "now" || value === "true" || !value ? new Date() : undefined);
      break;
    case "field": {
      const parts = splitBleedParts(k, value);
      const [name, fieldValue, inlineRaw] = parts;
      if (name && fieldValue) {
        embed.addFields({
          name: name.slice(0, 256),
          value: fieldValue.replace(/\\n/g, "\n").slice(0, 1024),
          inline: inlineRaw?.toLowerCase() === "true" || inlineRaw === "1",
        });
      }
      break;
    }
    default:
      return false;
  }
  return true;
}

function fromJson(raw) {
  const parsed = JSON.parse(raw);
  const data = parsed.embeds?.[0] ?? parsed;
  if (!data || typeof data !== "object") return null;
  if (!data.title && !data.description && !data.fields?.length && !data.image && !data.thumbnail) {
    return null;
  }
  return { embed: EmbedBuilder.from(data), content: parsed.content ?? null };
}

function fromBlocks(raw) {
  const embed = new EmbedBuilder();
  const out = { content: null };
  let matched = false;

  const text = raw.replace(/^\{embed\}/i, "").trim();
  const blockRe = /(?:\$v)?\{([^:}]+):\s*([\s\S]*?)\}/gi;
  let match;

  while ((match = blockRe.exec(text)) !== null) {
    if (applyBlock(embed, match[1].trim(), match[2].trim(), out)) {
      matched = true;
    }
  }

  if (!matched) {
    for (const line of text.split("\n")) {
      const lineMatch = line.match(/^([a-z_.]+):\s*(.+)$/i);
      if (lineMatch && applyBlock(embed, lineMatch[1].trim(), lineMatch[2].trim(), out)) {
        matched = true;
      }
    }
  }

  if (!matched && !out.content) return null;

  const json = embed.toJSON();
  const hasEmbed = json.title || json.description || json.fields?.length;
  if (!hasEmbed && !out.content) return null;

  return { embed: hasEmbed ? embed : null, content: out.content };
}

export function parseEmbedCode(input) {
  const raw = stripCodeFences(input.trim());
  if (!raw) {
    return { ok: false, error: "Skriv embed-kode efter `,embed`." };
  }

  if (raw.startsWith("{") && (raw.includes('"title"') || raw.includes('"description"') || raw.includes('"embeds"'))) {
    try {
      const result = fromJson(raw);
      if (result) return { ok: true, embed: result.embed, content: result.content };
    } catch {
      // fall through
    }
  }

  try {
    const result = fromBlocks(raw);
    if (result) {
      return { ok: true, embed: result.embed, content: result.content };
    }
  } catch {
    // handled below
  }

  return {
    ok: false,
    error:
      "Kunne ikke læse koden. Bleed-format: `{embed}$v{title: Titel}$v{description: Tekst}$v{color: #e67e22}`",
  };
}

export function buildEmbedCodeHelp() {
  return (
    "**`,embed`** + embed-kode (Bleed-syntaks)\n\n" +
    "**Eksempel:**\n" +
    "`,embed {embed}$v{title: Velkommen}$v{description: Hej {user.mention}!}$v{color: #e67e22}`\n\n" +
    "**Parametre:** `$v` adskiller blokke · `&&` i fields\n" +
    "`{title:}` · `{description:}` · `{color: #hex}` · `{message: tekst}`\n" +
    "`{field: Navn && Værdi}` · `{author: Navn && iconUrl}` · `{footer: Tekst && icon}`\n" +
    "`{thumbnail: url}` · `{image: url}` · `{timestamp:}`\n\n" +
    "**Variabler:** `{user}` `{user.mention}` `{guild.name}` `{guild.count}`"
  );
}
