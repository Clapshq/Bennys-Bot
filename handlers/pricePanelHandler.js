import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { JG_MARKUP_PERCENT, jgPartsCatalog, getPartById } from "../config/jgParts.js";
import { createEmbed } from "../utils/brand.js";
import { formatKr } from "../utils/quoteBuilder.js";
import {
  getPartsPriceStore,
  getPartPrice,
  setPartPrices,
  isPriceDataStale,
  onAfterPricesSave,
} from "../utils/partsPriceStore.js";
import { setPanelMessageId, getPanelMessageId } from "../utils/guildMessageStore.js";
import { isLedelseMember } from "../utils/modHelpers.js";
import { company } from "../config/company.js";

export const PRIS_PANEL_KEY = "pris_panel";

export const PRIS_CATEGORIES = [
  { id: "motor", label: "Motorer", emoji: "⚙️" },
  { id: "tuning", label: "Tuning", emoji: "🔩" },
  { id: "nitrous", label: "Nitrous", emoji: "💨" },
  { id: "dæk", label: "Dæk", emoji: "🛞" },
  { id: "service", label: "Service", emoji: "🔧" },
  { id: "styling", label: "Styling", emoji: "🎨" },
  { id: "værktøj", label: "Værktøj", emoji: "🛠️" },
  { id: "ekstra", label: "Ekstra", emoji: "➕" },
];

function assertLedelse(interaction) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({
      content: "❌ Kun **ledelse & ejere** kan redigere priser.",
      ephemeral: true,
    });
  }
  return null;
}

function partsInCategory(category) {
  return jgPartsCatalog.filter((p) => p.category === category);
}

function formatPartLine(part, store) {
  const buy = getPartPrice(part.id, store);
  if (buy == null) return `❌ **${part.label}** — *ikke sat*`;
  const sell = Math.round(buy * (1 + JG_MARKUP_PERCENT / 100));
  return `▸ **${part.label}** — indkøb **${formatKr(buy)}** → kunde **${formatKr(sell)}**`;
}

function buildOverviewEmbed(store) {
  const stale = isPriceDataStale(store);
  const updated = store.updatedAt
    ? `<t:${Math.floor(new Date(store.updatedAt).getTime() / 1000)}:R>`
    : "ukendt";

  const motorLines = partsInCategory("motor").map((p) => formatPartLine(p, store)).join("\n");
  const missingMotors = partsInCategory("motor").filter((p) => getPartPrice(p.id, store) == null).length;

  const summary = PRIS_CATEGORIES.map((cat) => {
    const parts = partsInCategory(cat.id);
    const priced = parts.filter((p) => getPartPrice(p.id, store) != null).length;
    return `${cat.emoji} **${cat.label}** — ${priced}/${parts.length} sat`;
  }).join("\n");

  return createEmbed(missingMotors ? "warning" : stale ? "warning" : "success")
    .setTitle("💲 Prisstyring — Benny's JG-indkøb")
    .setDescription(
      (missingMotors ? "⚠️ **Motorer mangler pris** — opdater dem ofte lige nu.\n\n" : "") +
        (stale ? "⚠️ Shop-priser er ældre end 24 timer.\n\n" : "") +
        "**Opdater pris:** Vælg kategori → vælg del → indtast ny indkøbspris.\n" +
        `Regel: indkøb **+${JG_MARKUP_PERCENT}%** = kundepris · Profitmål **${formatKr(company.profitTarget)}**`
    )
    .addFields(
      { name: "⚙️ Motorer", value: motorLines || "—", inline: false },
      { name: "Oversigt", value: summary, inline: false },
      { name: "Sidst opdateret", value: `${updated}${store.updatedBy ? ` · <@${store.updatedBy}>` : ""}`, inline: false }
    );
}

function buildCategoryEmbed(category, store) {
  const cat = PRIS_CATEGORIES.find((c) => c.id === category) ?? { label: category, emoji: "📦" };
  const parts = partsInCategory(category);
  const lines = parts.map((p) => formatPartLine(p, store)).join("\n");
  const missing = parts.filter((p) => getPartPrice(p.id, store) == null).length;

  return createEmbed(missing ? "warning" : "accent")
    .setTitle(`${cat.emoji} ${cat.label} — indkøbspriser`)
    .setDescription(
      `${lines}\n\n*Vælg en del nedenfor → modal → gem.*\n` +
        `${parts.length - missing}/${parts.length} har pris · +${JG_MARKUP_PERCENT}% til kunde`
    );
}

export function buildPricePanelPayload(category = null) {
  const store = getPartsPriceStore();
  const embed = category ? buildCategoryEmbed(category, store) : buildOverviewEmbed(store);
  const editCategory = category ?? "motor";

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId("pris_cat_select")
    .setPlaceholder("📂 Vælg kategori")
    .addOptions(
      PRIS_CATEGORIES.map((c) => {
        const parts = partsInCategory(c.id);
        const missing = parts.filter((p) => getPartPrice(p.id, store) == null).length;
        return {
          label: c.label,
          value: c.id,
          emoji: c.emoji,
          description: missing ? `${missing} mangler pris` : `${parts.length} dele`,
          default: editCategory === c.id,
        };
      })
    );

  const rows = [new ActionRowBuilder().addComponents(categorySelect)];

  const parts = partsInCategory(editCategory);
  if (parts.length) {
    const partSelect = new StringSelectMenuBuilder()
      .setCustomId(`pris_part_select:${editCategory}`)
      .setPlaceholder(`✏️ Klik del for at ændre pris`)
      .addOptions(
        parts.slice(0, 25).map((p) => {
          const buy = getPartPrice(p.id, store);
          return {
            label: p.label.slice(0, 100),
            value: p.id,
            description:
              buy != null
                ? `${formatKr(buy)} → kunde ${formatKr(Math.round(buy * (1 + JG_MARKUP_PERCENT / 100)))}`
                : "Sæt pris nu",
          };
        })
      );
    rows.push(new ActionRowBuilder().addComponents(partSelect));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("pris_panel_motor").setLabel("Motorer").setEmoji("⚙️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("pris_panel_overview").setLabel("Oversigt").setEmoji("📋").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pris_panel_refresh").setLabel("Opdater").setEmoji("🔄").setStyle(ButtonStyle.Secondary)
    )
  );

  return { embeds: [embed], components: rows };
}

export function buildPriceEditModal(partId) {
  const part = getPartById(partId);
  if (!part) return null;

  const current = getPartPrice(partId);
  const modal = new ModalBuilder()
    .setCustomId(`pris_edit_modal:${partId}`)
    .setTitle(`Pris — ${part.label}`.slice(0, 45));

  const input = new TextInputBuilder()
    .setCustomId("price")
    .setLabel("Ny indkøbspris (kr)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(12)
    .setPlaceholder(current ? String(current) : "fx 340000");

  if (current != null) input.setValue(String(current));

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function savePanelView(guildId, channelId, messageId, category) {
  setPanelMessageId(guildId, PRIS_PANEL_KEY, channelId, messageId, {
    category: category === null ? "overview" : (category ?? "motor"),
  });
}

function panelCategoryForPayload(storedCategory) {
  return storedCategory === "overview" ? null : (storedCategory ?? "motor");
}

export async function postPricePanel(message, { category = "motor" } = {}) {
  if (!isLedelseMember(message.member)) {
    await message.reply("❌ Kun **ledelse & ejere** kan åbne prispanelet.").catch(() => {});
    return true;
  }

  const payload = buildPricePanelPayload(category);
  const sent = await message.channel.send(payload).catch(() => null);
  if (!sent) {
    await message.reply("❌ Kunne ikke sende prispanel.").catch(() => {});
    return true;
  }

  savePanelView(message.guild.id, sent.channel.id, sent.id, category);
  await message
    .reply(`✅ **Prispanel** oprettet: ${sent.url}\nPin den i \`#ordrer-og-løn\` — klik del for at ændre pris.`)
    .catch(() => {});
  return true;
}

export async function handlePrisCategorySelect(interaction) {
  const denied = assertLedelse(interaction);
  if (denied) return denied;

  const category = interaction.values[0];
  savePanelView(interaction.guildId, interaction.channel.id, interaction.message.id, category);
  await interaction.update(buildPricePanelPayload(category));
}

export async function handlePrisPartSelect(interaction) {
  const denied = assertLedelse(interaction);
  if (denied) return denied;

  const partId = interaction.values[0];
  const modal = buildPriceEditModal(partId);
  if (!modal) {
    return interaction.reply({ content: "❌ Ukendt del.", ephemeral: true });
  }
  await interaction.showModal(modal);
}

export async function handlePrisEditModal(interaction) {
  const denied = assertLedelse(interaction);
  if (denied) return denied;

  const partId = interaction.customId.replace("pris_edit_modal:", "");
  const part = getPartById(partId);
  if (!part) {
    return interaction.reply({ content: "❌ Ukendt del.", ephemeral: true });
  }

  const raw = interaction.fields.getTextInputValue("price");
  const price = Number(String(raw).replace(/[^\d]/g, ""));
  if (!Number.isFinite(price) || price <= 0) {
    return interaction.reply({ content: "❌ Ugyldig pris — brug kun tal (fx 340000).", ephemeral: true });
  }

  setPartPrices({ [partId]: price }, interaction.user.id, "Manuel opdatering — prispanel");

  const sell = Math.round(price * (1 + JG_MARKUP_PERCENT / 100));

  return interaction.reply({
    content:
      `✅ **${part.label}** opdateret\n` +
      `Indkøb: **${formatKr(price)}** → Kundepris: **${formatKr(sell)}** (+${JG_MARKUP_PERCENT}%)`,
    ephemeral: true,
  });
}

async function handlePanelButton(interaction, category) {
  const denied = assertLedelse(interaction);
  if (denied) return denied;

  savePanelView(interaction.guildId, interaction.channel.id, interaction.message.id, category);
  await interaction.update(buildPricePanelPayload(category));
}

export function handlePrisPanelButton(interaction) {
  if (interaction.customId === "pris_panel_motor") return handlePanelButton(interaction, "motor");
  if (interaction.customId === "pris_panel_overview") return handlePanelButton(interaction, null);
  if (interaction.customId === "pris_panel_refresh") {
    const stored = getPanelMessageId(interaction.guildId, PRIS_PANEL_KEY);
    return handlePanelButton(interaction, panelCategoryForPayload(stored?.category ?? "motor"));
  }
  return null;
}

export async function refreshStoredPricePanel(guild) {
  const stored = getPanelMessageId(guild.id, PRIS_PANEL_KEY);
  if (!stored?.channelId || !stored?.messageId) return false;

  const channel = await guild.channels.fetch(stored.channelId).catch(() => null);
  if (!channel?.isTextBased()) return false;

  const msg = await channel.messages.fetch(stored.messageId).catch(() => null);
  if (!msg) return false;

  const category = panelCategoryForPayload(stored.category);
  await msg.edit(buildPricePanelPayload(category)).catch(() => {});
  return true;
}

let discordClient = null;

export function registerPricePanelAutoRefresh(client) {
  discordClient = client;
  onAfterPricesSave(async () => {
    if (!discordClient) return;
    for (const guild of discordClient.guilds.cache.values()) {
      await refreshStoredPricePanel(guild);
    }
  });
}
