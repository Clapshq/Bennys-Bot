import { EmbedBuilder } from "discord.js";
import { brand } from "../config/brand.js";

const colorMap = {
  default: brand.colors.primary,
  dark: brand.colors.dark,
  accent: brand.colors.accent,
  success: brand.colors.success,
  warning: brand.colors.warning,
  error: brand.colors.error,
  gold: brand.colors.gold,
  blue: brand.colors.blue,
  discord: brand.colors.discord,
};

export function createEmbed(variant = "default") {
  return new EmbedBuilder()
    .setColor(colorMap[variant] ?? brand.colors.primary)
    .setAuthor({ name: `${brand.shortName} · ${brand.tagline}` })
    .setFooter({ text: `${brand.bolt} ${brand.name} ${brand.bolt}` });
}

export function headerBlock(title, subtitle) {
  return `## ${title}\n${subtitle ? `*${subtitle}*\n` : ""}${brand.divider}`;
}

export function fieldBlock(emoji, title, lines) {
  const body = Array.isArray(lines) ? lines.map((l) => `▸ ${l}`).join("\n") : lines;
  return `${emoji} **${title}**\n${body}`;
}

export function stars(rating) {
  const filled = "⭐".repeat(Math.min(5, Math.max(0, rating)));
  const empty = "☆".repeat(5 - Math.min(5, Math.max(0, rating)));
  return filled + empty;
}
