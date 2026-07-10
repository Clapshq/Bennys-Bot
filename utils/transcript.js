import { AttachmentBuilder } from "discord.js";
import { brand } from "../config/brand.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function embedColorHex(color) {
  if (color == null) return "#e67e22";
  if (typeof color === "number") return `#${color.toString(16).padStart(6, "0")}`;
  const s = String(color);
  if (s.startsWith("#")) return s;
  return s;
}

function renderEmbedHtml(embed) {
  const data = embed.data ?? embed;
  const color = embedColorHex(data.color);
  const title = data.title ? escapeHtml(data.title) : "";
  const url = data.url ? escapeHtml(data.url) : "";
  const description = data.description ? escapeHtml(data.description).replace(/\n/g, "<br>") : "";
  const author = data.author;
  const footer = data.footer;
  const fields = data.fields ?? [];
  const thumbnail = data.thumbnail?.url ?? data.thumbnail?.proxyURL;
  const image = data.image?.url ?? data.image?.proxyURL;
  const timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })
    : "";

  const fieldsHtml = fields
    .map((f) => {
      const inline = f.inline ? "inline" : "block";
      return `<div class="embed-field ${inline}">
        <div class="embed-field-name">${escapeHtml(f.name)}</div>
        <div class="embed-field-value">${escapeHtml(f.value).replace(/\n/g, "<br>")}</div>
      </div>`;
    })
    .join("");

  return `
    <div class="discord-embed">
      <div class="embed-color-bar" style="background:${color}"></div>
      <div class="embed-inner">
        ${author?.name ? `<div class="embed-author">${author.icon_url || author.iconURL ? `<img src="${escapeHtml(author.icon_url || author.iconURL)}" alt="" class="embed-author-icon" />` : ""}<span>${escapeHtml(author.name)}</span></div>` : ""}
        ${title ? (url ? `<a class="embed-title" href="${url}" target="_blank" rel="noopener">${title}</a>` : `<div class="embed-title">${title}</div>`) : ""}
        ${description ? `<div class="embed-description">${description}</div>` : ""}
        ${fieldsHtml ? `<div class="embed-fields">${fieldsHtml}</div>` : ""}
        ${thumbnail ? `<img class="embed-thumbnail" src="${escapeHtml(thumbnail)}" alt="" />` : ""}
        ${image ? `<img class="embed-image" src="${escapeHtml(image)}" alt="" />` : ""}
        ${footer?.text || timestamp ? `<div class="embed-footer">${footer?.icon_url || footer?.iconURL ? `<img src="${escapeHtml(footer.icon_url || footer.iconURL)}" alt="" class="embed-footer-icon" />` : ""}<span>${escapeHtml(footer?.text ?? "")}${footer?.text && timestamp ? " · " : ""}${timestamp ? escapeHtml(timestamp) : ""}</span></div>` : ""}
      </div>
    </div>`;
}

export function serializeMessage(msg) {
  return {
    id: msg.id,
    author: {
      id: msg.author?.id,
      tag: msg.author?.tag ?? "Ukendt",
      username: msg.author?.username ?? "ukendt",
      avatar: msg.author?.displayAvatarURL?.({ size: 128 }) ?? "",
      bot: Boolean(msg.author?.bot),
    },
    content: msg.content ?? "",
    embeds: msg.embeds?.map((e) => e.toJSON?.() ?? e.data ?? e) ?? [],
    attachments: [...(msg.attachments?.values?.() ?? [])].map((a) => ({
      url: a.url,
      name: a.name,
      contentType: a.contentType ?? null,
      width: a.width ?? null,
      height: a.height ?? null,
    })),
    createdAt: msg.createdAt?.toISOString?.() ?? new Date().toISOString(),
    editedAt: msg.editedAt?.toISOString?.() ?? null,
    system: msg.system ?? false,
  };
}

function formatMessage(msg) {
  const time = msg.createdAt.toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
  const author = escapeHtml(msg.author?.tag ?? "Ukendt");
  const avatar = msg.author?.displayAvatarURL?.({ size: 128 }) ?? "";
  const serialized = serializeMessage(msg);

  let contentHtml = "";
  if (msg.content) {
    contentHtml = `<div class="content">${escapeHtml(msg.content).replace(/\n/g, "<br>")}</div>`;
  }

  const embedsHtml = (msg.embeds ?? []).map((e) => renderEmbedHtml(e)).join("");
  const attachmentsHtml = [...msg.attachments.values()]
    .map((a) => {
      const isImage = a.contentType?.startsWith("image/");
      if (isImage) {
        return `<div class="attachment-image"><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name)}" loading="lazy" /></a><span class="attachment-name">${escapeHtml(a.name)}</span></div>`;
      }
      return `<div class="attachment-file"><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name)}</a></div>`;
    })
    .join("");

  if (!contentHtml && !embedsHtml && !attachmentsHtml) {
    contentHtml = `<div class="content empty"><em>(tom besked)</em></div>`;
  }

  return `
    <div class="message" data-message-id="${escapeHtml(msg.id)}">
      <img class="avatar" src="${avatar}" alt="" loading="lazy" />
      <div class="body">
        <div class="meta"><span class="author">${author}</span>${serialized.author.bot ? ' <span class="bot-tag">BOT</span>' : ""} <span class="time">${time}</span>${serialized.editedAt ? ' <span class="edited">(redigeret)</span>' : ""}</div>
        ${contentHtml}
        ${embedsHtml ? `<div class="embeds">${embedsHtml}</div>` : ""}
        ${attachmentsHtml ? `<div class="attachments">${attachmentsHtml}</div>` : ""}
      </div>
    </div>`;
}

export async function fetchAllMessages(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
    if (batch.size === 0) break;
    messages.push(...batch.values());
    lastId = batch.last()?.id;
    if (batch.size < 100) break;
    if (messages.length >= 2000) break;
  }

  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

const TRANSCRIPT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'gg sans', 'Segoe UI', system-ui, sans-serif; background: #313338; color: #dbdee1; margin: 0; padding: 0; }
  .header { background: linear-gradient(135deg, #e67e22, #d35400); padding: 20px 24px; }
  .header h1 { margin: 0 0 8px; font-size: 1.35rem; color: #fff; }
  .header p { margin: 4px 0; opacity: 0.95; font-size: 0.88rem; color: #fff; }
  .messages { padding: 16px 16px 32px; max-width: 900px; margin: 0 auto; }
  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 0 -16px; border-radius: 4px; }
  .message:hover { background: #2e3035; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
  .author { font-weight: 600; color: #f2f3f5; font-size: 0.95rem; }
  .bot-tag { background: #5865f2; color: #fff; font-size: 0.65rem; font-weight: 600; padding: 2px 4px; border-radius: 3px; vertical-align: middle; margin-left: 4px; }
  .time { color: #949ba4; font-size: 0.72rem; font-weight: 400; margin-left: 6px; }
  .content { margin-top: 2px; line-height: 1.375; word-break: break-word; font-size: 0.95rem; white-space: pre-wrap; }
  .content.empty { color: #949ba4; font-style: italic; }
  .embeds { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
  .discord-embed { display: flex; max-width: 520px; border-radius: 4px; overflow: hidden; background: #2b2d31; }
  .embed-color-bar { width: 4px; flex-shrink: 0; }
  .embed-inner { padding: 8px 12px 10px; flex: 1; min-width: 0; position: relative; }
  .embed-author { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
  .embed-author-icon { width: 20px; height: 20px; border-radius: 50%; }
  .embed-title { font-size: 0.95rem; font-weight: 600; color: #00a8fc; text-decoration: none; display: block; margin-bottom: 4px; }
  .embed-title:hover { text-decoration: underline; }
  .embed-description { font-size: 0.875rem; line-height: 1.4; color: #dbdee1; }
  .embed-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .embed-field.block { grid-column: 1 / -1; }
  .embed-field-name { font-size: 0.78rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
  .embed-field-value { font-size: 0.78rem; color: #dbdee1; line-height: 1.35; white-space: pre-wrap; }
  .embed-thumbnail { position: absolute; top: 8px; right: 12px; width: 64px; height: 64px; border-radius: 4px; object-fit: cover; }
  .embed-image { max-width: 100%; max-height: 300px; border-radius: 4px; margin-top: 8px; display: block; }
  .embed-footer { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.7rem; color: #949ba4; }
  .embed-footer-icon { width: 16px; height: 16px; border-radius: 50%; }
  .attachments { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
  .attachment-image img { max-width: 400px; max-height: 300px; border-radius: 8px; display: block; }
  .attachment-name { font-size: 0.75rem; color: #949ba4; margin-top: 4px; }
  .attachment-file a { color: #00a8fc; font-size: 0.875rem; text-decoration: none; }
  .attachment-file a:hover { text-decoration: underline; }
  .footer { padding: 16px; text-align: center; color: #949ba4; font-size: 0.78rem; border-top: 1px solid #3f4147; }
  a { color: #00a8fc; }
`;

export function buildTranscriptHtml(channel, messages, meta = {}) {
  const serialized = messages.map(serializeMessage);
  const body = messages.map(formatMessage).join("\n");
  const jsonPayload = JSON.stringify(serialized).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Transcript — ${escapeHtml(channel.name)}</title>
  <style>${TRANSCRIPT_STYLES}</style>
</head>
<body>
  <div class="header">
    <h1>🎫 ${escapeHtml(brand.shortName)} — Ticket Transcript</h1>
    <p><strong>Kanal:</strong> #${escapeHtml(channel.name)}</p>
    <p><strong>Ticket #:</strong> ${meta.ticketNumber ?? "?"} · <strong>Type:</strong> ${escapeHtml(meta.type ?? "ukendt")}</p>
    <p><strong>Opretter:</strong> ${escapeHtml(meta.openerTag ?? "?")} · <strong>Lukket af:</strong> ${escapeHtml(meta.closedByTag ?? "?")}</p>
    <p><strong>Genereret:</strong> ${new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}</p>
  </div>
  <div class="messages">${body}</div>
  <div class="footer">${escapeHtml(brand.shortName)} · ${messages.length} beskeder</div>
  <script type="application/json" id="bennys-transcript-messages">${jsonPayload}</script>
</body>
</html>`;
}

export async function generateTranscriptAttachment(channel, meta = {}) {
  const messages = await fetchAllMessages(channel);
  const html = buildTranscriptHtml(channel, messages, meta);
  const buffer = Buffer.from(html, "utf8");
  const filename = `transcript-${channel.name}-${Date.now()}.html`;

  return {
    attachment: new AttachmentBuilder(buffer, { name: filename }),
    messageCount: messages.length,
    html,
    messages: messages.map(serializeMessage),
  };
}

/** Live beskeder til dashboard snapshot (åbne tickets) */
export async function buildLiveTicketTranscripts(guild, openTickets, { maxTickets = 12, maxMessages = 200 } = {}) {
  if (!guild || !openTickets?.length) return [];

  const results = [];
  for (const ticket of openTickets.slice(0, maxTickets)) {
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel?.isTextBased?.()) continue;

    try {
      const all = await fetchAllMessages(channel);
      const messages = all.slice(-maxMessages);
      results.push({
        channelId: ticket.channelId,
        ticketNumber: ticket.number ?? ticket.ticketNumber,
        channelName: channel.name,
        ticketType: ticket.type ?? "ukendt",
        openerTag: ticket.openerTag ?? null,
        openerId: ticket.openerId ?? null,
        messageCount: all.length,
        messages: messages.map(serializeMessage),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      /* kanal slettet eller ingen adgang */
    }
  }

  return results;
}

export { TRANSCRIPT_STYLES, renderEmbedHtml, formatMessage };
