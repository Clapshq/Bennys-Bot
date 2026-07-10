import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { company } from "../config/company.js";
import { ticketConfig, isLedelseDecisionType, getKontaktTicketTypes } from "../config/tickets.js";

export function orderTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_order")
      .setLabel("Opret bestilling")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔧"),
    new ButtonBuilder()
      .setCustomId("order_modal")
      .setLabel("Hurtig bestilling")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⚡")
  );
}

export function ticketCategorySelect({ exclude = [], include = null, placeholder = "Vælg ticket-type..." } = {}) {
  let categories = ticketConfig.categories;
  if (include?.length) {
    categories = categories.filter((c) => include.includes(c.id));
  } else {
    categories = categories.filter((c) => !exclude.includes(c.id));
  }
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder(placeholder)
      .addOptions(
        categories.map((c) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(c.label)
            .setDescription(c.description.slice(0, 100))
            .setValue(c.id)
            .setEmoji(c.emoji)
        )
      )
  );
}

/** #kontakt — generelt support, ban-ansøgning, klage og prisoverslag */
export function contactTicketPanelComponents() {
  return [
    ticketCategorySelect({
      include: getKontaktTicketTypes().map((c) => c.id),
      placeholder: "Vælg henvendelsestype...",
    }),
  ];
}

/** #ansøgning — mekaniker-ansøgning via DM */
export function applicationPanelComponents() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("application_start")
      .setLabel("Start ansøgning")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📋")
  );
}

/** #fravær — medarbejder fraværs-ticket */
export function absencePanelComponents() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_absence")
      .setLabel("Opret fraværs-ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📅")
  );
}

/** #bestillinger — kun bestillings-knapper */
export function orderPanelComponents() {
  return [orderTicketButtons()];
}

export function ticketAppealDecisionButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_appeal_approve")
      .setLabel("Godkend adgang")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId("ticket_appeal_deny")
      .setLabel("Afvis ansøgning")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

export function ticketControlButtons(type = "order") {
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_note")
        .setLabel("Staff note")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📌"),
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Luk ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
      new ButtonBuilder()
        .setCustomId("ticket_escalate")
        .setLabel("Eskaler")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("👔")
    ),
  ];

  if (isLedelseDecisionType(type)) {
    rows.unshift(ticketAppealDecisionButtons());
  }

  return rows;
}

export function ticketRatingButtons() {
  return [
    new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map((n) =>
        new ButtonBuilder()
          .setCustomId(`ticket_rate_${n}`)
          .setLabel(`${n} ⭐`)
          .setStyle(n >= 4 ? ButtonStyle.Success : n >= 3 ? ButtonStyle.Primary : ButtonStyle.Secondary)
      )
    ),
    ticketCloseConfirmRow(),
  ];
}

export function ticketCloseConfirmRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close_confirm")
      .setLabel("Spring over")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⏭️")
  );
}

export function roleSelectMenu() {
  const optional = company.roles.filter((r) => !r.assignOnJoin && !r.staff);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_select")
      .setPlaceholder("Vælg valgfrie roller...")
      .setMinValues(0)
      .setMaxValues(optional.length)
      .addOptions(
        optional.map((r) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setDescription(r.description)
            .setValue(r.name)
            .setEmoji(r.emoji)
        )
      )
  );
}
