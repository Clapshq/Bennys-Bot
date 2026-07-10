import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  WebhookClient,
} from "discord.js";
import { brand } from "../config/brand.js";

const COLOR_MAP = {
  default: brand.colors.primary,
  accent: brand.colors.accent,
  success: brand.colors.success,
  warning: brand.colors.warning,
  error: brand.colors.error,
  gold: brand.colors.gold,
  blue: brand.colors.blue,
};

const STYLE_MAP = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link,
};

function parseColor(input) {
  if (!input) return brand.colors.accent;
  if (typeof input === "number") return input;
  const s = String(input).trim();
  if (COLOR_MAP[s]) return COLOR_MAP[s];
  if (s.startsWith("#")) return parseInt(s.slice(1), 16);
  if (/^\d+$/.test(s)) return Number(s);
  return brand.colors.accent;
}

function parseEmoji(raw) {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const m = s.match(/^<a?:(\w+):(\d+)>$/);
  if (m) return { name: m[1], id: m[2] };
  return { name: s.slice(0, 2) };
}

export function buildEmbedFromPayload(payload = {}) {
  const embed = new EmbedBuilder();

  if (payload.title) embed.setTitle(String(payload.title).slice(0, 256));
  if (payload.url) embed.setURL(String(payload.url));
  if (payload.description) embed.setDescription(String(payload.description).slice(0, 4096));
  embed.setColor(parseColor(payload.color));

  if (payload.author?.name) {
    embed.setAuthor({
      name: String(payload.author.name).slice(0, 256),
      iconURL: payload.author.iconUrl || undefined,
      url: payload.author.url || undefined,
    });
  }

  if (payload.thumbnail) embed.setThumbnail(String(payload.thumbnail));
  if (payload.image) embed.setImage(String(payload.image));

  if (payload.footer?.text) {
    embed.setFooter({
      text: String(payload.footer.text).slice(0, 2048),
      iconURL: payload.footer.iconUrl || undefined,
    });
  }

  if (Array.isArray(payload.fields)) {
    for (const f of payload.fields.slice(0, 25)) {
      if (!f?.name || !f?.value) continue;
      embed.addFields({
        name: String(f.name).slice(0, 256),
        value: String(f.value).slice(0, 1024),
        inline: Boolean(f.inline),
      });
    }
  }

  if (payload.timestamp) embed.setTimestamp(new Date());

  return embed;
}

export function buildComponentsFromPayload(rows = []) {
  const built = [];

  for (const row of rows.slice(0, 5)) {
    if (row?.type === "buttons" && Array.isArray(row.buttons)) {
      const actionRow = new ActionRowBuilder();
      for (const btn of row.buttons.slice(0, 5)) {
        if (!btn?.label) continue;
        const style = STYLE_MAP[btn.style] ?? ButtonStyle.Primary;
        const button = new ButtonBuilder().setLabel(String(btn.label).slice(0, 80)).setStyle(style).setDisabled(Boolean(btn.disabled));

        if (style === ButtonStyle.Link) {
          if (!btn.url) continue;
          button.setURL(String(btn.url).slice(0, 512));
        } else {
          button.setCustomId(String(btn.customId ?? btn.id ?? `btn_${Date.now()}`).slice(0, 100));
        }

        const emoji = parseEmoji(btn.emoji);
        if (emoji) button.setEmoji(emoji);

        actionRow.addComponents(button);
      }
      if (actionRow.components.length) built.push(actionRow);
    }

    if (row?.type === "select" && row.select) {
      const s = row.select;
      const menu = new StringSelectMenuBuilder()
        .setCustomId(String(s.customId ?? s.id ?? `select_${Date.now()}`).slice(0, 100))
        .setPlaceholder(String(s.placeholder ?? "Vælg…").slice(0, 150))
        .setMinValues(Math.min(25, Math.max(0, Number(s.minValues) || 0)))
        .setMaxValues(Math.min(25, Math.max(1, Number(s.maxValues) || 1)))
        .setDisabled(Boolean(s.disabled));

      for (const opt of (s.options ?? []).slice(0, 25)) {
        if (!opt?.label || !opt?.value) continue;
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(String(opt.label).slice(0, 100))
          .setValue(String(opt.value).slice(0, 100));
        if (opt.description) option.setDescription(String(opt.description).slice(0, 100));
        const emoji = parseEmoji(opt.emoji);
        if (emoji) option.setEmoji(emoji);
        menu.addOptions(option);
      }

      if (menu.options.length) {
        built.push(new ActionRowBuilder().addComponents(menu));
      }
    }
  }

  return built.length ? built : undefined;
}

function buildEmbedsList(embedPayload, embedsPayload) {
  const list = Array.isArray(embedsPayload) && embedsPayload.length
    ? embedsPayload.slice(0, 10)
    : embedPayload
      ? [embedPayload]
      : [];
  return list.map((p) => buildEmbedFromPayload(p));
}

function buildFiles(attachmentUrls = []) {
  return attachmentUrls
    .slice(0, 10)
    .filter(Boolean)
    .map((url, i) => {
      const name = String(url).split("/").pop()?.split("?")[0] || `attachment-${i + 1}`;
      return new AttachmentBuilder(String(url), { name: name.slice(0, 100) });
    });
}

function buildSendOptions({ content, embed, embeds, components, attachmentUrls }) {
  const builtEmbeds = buildEmbedsList(embed, embeds);
  const builtComponents = buildComponentsFromPayload(components);
  const files = buildFiles(attachmentUrls);

  const hasContent = Boolean(content?.trim());
  if (!hasContent && !builtEmbeds.length && !files.length && !builtComponents) {
    throw new Error("Intet indhold at sende");
  }

  return {
    content: hasContent ? String(content).slice(0, 2000) : undefined,
    embeds: builtEmbeds.length ? builtEmbeds : undefined,
    components: builtComponents,
    files: files.length ? files : undefined,
  };
}

export async function sendEmbedFromDashboard(channel, payload = {}) {
  if (!channel?.isTextBased?.()) throw new Error("Kanalen understøtter ikke beskeder");

  const options = buildSendOptions(payload);
  const msg = await channel.send(options);

  return {
    messageId: msg.id,
    channelId: channel.id,
    embedCount: options.embeds?.length ?? 0,
    componentRows: options.components?.length ?? 0,
  };
}

export async function editEmbedFromDashboard(channel, messageId, payload = {}) {
  if (!channel?.isTextBased?.()) throw new Error("Kanalen understøtter ikke beskeder");
  if (!messageId) throw new Error("Message ID mangler");

  const msg = await channel.messages.fetch(String(messageId)).catch(() => null);
  if (!msg) throw new Error("Besked ikke fundet — tjek Message ID");

  const options = buildSendOptions(payload);
  await msg.edit(options);

  return {
    messageId: msg.id,
    channelId: channel.id,
    edited: true,
  };
}

export async function sendViaWebhook(webhookUrl, payload = {}) {
  if (!webhookUrl?.trim()) throw new Error("Webhook URL mangler");

  const client = new WebhookClient({ url: String(webhookUrl).trim() });
  const options = buildSendOptions(payload);

  const sendOpts = {
    ...options,
    username: payload.username ? String(payload.username).slice(0, 80) : undefined,
    avatarURL: payload.avatarUrl ? String(payload.avatarUrl) : undefined,
    threadId: payload.threadId ? String(payload.threadId) : undefined,
  };

  let msg;
  if (payload.messageId) {
    msg = await client.editMessage(String(payload.messageId), sendOpts);
  } else {
    msg = await client.send(sendOpts);
  }

  return {
    messageId: msg.id,
    webhook: true,
    edited: Boolean(payload.messageId),
  };
}

export async function dispatchRichMessage(channel, payload = {}) {
  if (payload.webhookUrl) {
    return sendViaWebhook(payload.webhookUrl, payload);
  }
  if (payload.messageId && channel) {
    return editEmbedFromDashboard(channel, payload.messageId, payload);
  }
  if (channel) {
    return sendEmbedFromDashboard(channel, payload);
  }
  throw new Error("Vælg kanal eller webhook URL");
}
