import { createLogger } from "../core/logger.js";

import { checkCooldown } from "../core/cooldowns.js";

import { commands } from "../commands/index.js";

import {

  createTicket,

  closeTicket,

  buildOrderModal,

  submitOrderModal,

  handleTicketCategorySelect,

  handleTicketNoteModal,

  handleTicketRating,

  handleTicketCloseConfirm,

  buildTicketNoteModal,

  handleAppealApprove,

  handleAppealDeny,

  handleAppealDenySubmit,

  handleTicketEscalate,

  touchTicketChannelActivity,

  isTicketChannel,

} from "../handlers/ticketHandler.js";

import { submitTypeModal } from "../handlers/ticketModals.js";

import { handleRoleSelect } from "../handlers/interactionHandler.js";

import { handleEmbedCreateModal } from "../handlers/embedHandler.js";

import { handleButtonRoleClick } from "../handlers/buttonRoleHandler.js";

import { isStaffMember } from "../utils/modHelpers.js";

import {

  startMechanicApplication,

  handleApplicationApprove,

  handleApplicationDenyButton,

  handleApplicationDenySubmit,

  parseApplicationButtonId,

} from "../handlers/applicationHandler.js";

import {
  handlePrisCategorySelect,
  handlePrisPartSelect,
  handlePrisEditModal,
  handlePrisPanelButton,
} from "../handlers/pricePanelHandler.js";



const log = createLogger("router");



const commandMap = new Map(commands.map((c) => [c.data.name, c]));



function maybeTouchTicket(interaction) {

  if (interaction.channel && isTicketChannel(interaction.channel)) {

    touchTicketChannelActivity(interaction.channel);

  }

}



const BUTTON_HANDLERS = {

  ticket_order: (i) => createTicket(i, "order"),

  application_start: (i) => startMechanicApplication(i),

  ticket_absence: async (i) => {

    if (!isStaffMember(i.member)) {

      return i.reply({ content: "❌ Kun medarbejdere kan oprette fraværs-tickets.", ephemeral: true });

    }

    const { buildTypeModal } = await import("../handlers/ticketModals.js");

    return i.showModal(buildTypeModal("absence"));

  },

  order_modal: (i) => i.showModal(buildOrderModal()),

  ticket_close: (i) => closeTicket(i),

  ticket_note: (i) => {

    if (!isStaffMember(i.member)) {

      return i.reply({ content: "❌ Kun staff kan tilføje interne notes.", ephemeral: true });

    }

    return i.showModal(buildTicketNoteModal());

  },

  ticket_close_confirm: (i) => handleTicketCloseConfirm(i),

  ticket_appeal_approve: (i) => handleAppealApprove(i),

  ticket_appeal_deny: (i) => handleAppealDeny(i),

  ticket_escalate: (i) => {

    if (!isStaffMember(i.member)) {

      return i.reply({ content: "❌ Kun staff kan eskalere tickets.", ephemeral: true });

    }

    return handleTicketEscalate(i);

  },

  ticket_rate_1: (i) => handleTicketRating(i, 1),

  ticket_rate_2: (i) => handleTicketRating(i, 2),

  ticket_rate_3: (i) => handleTicketRating(i, 3),

  ticket_rate_4: (i) => handleTicketRating(i, 4),

  ticket_rate_5: (i) => handleTicketRating(i, 5),

};



const SELECT_HANDLERS = {

  role_select: handleRoleSelect,

  ticket_category: handleTicketCategorySelect,

};



const MODAL_HANDLERS = {

  order_modal_submit: submitOrderModal,

  ticket_note_submit: handleTicketNoteModal,

  ticket_appeal_deny_submit: handleAppealDenySubmit,

};



export async function routeInteraction(interaction) {

  if (interaction.isAutocomplete()) {

    const cmd = commandMap.get(interaction.commandName);

    if (cmd?.autocomplete) return cmd.autocomplete(interaction);

    return;

  }



  if (interaction.isChatInputCommand()) {

    const cmd = commandMap.get(interaction.commandName);

    if (!cmd) return;



    const cd = checkCooldown(interaction.user.id, `cmd:${interaction.commandName}`, 2000);

    if (!cd.allowed) {

      return interaction.reply({

        content: `⏳ Vent **${cd.remainingSeconds}s** før du bruger denne kommando igen.`,

        ephemeral: true,

      });

    }



    log.interaction(interaction, "command");

    return cmd.execute(interaction);

  }



  if (interaction.isButton()) {

    if (interaction.customId.startsWith("btnrole_")) {

      log.interaction(interaction, "button");

      return handleButtonRoleClick(interaction);

    }



    const appBtn = parseApplicationButtonId(interaction.customId);

    if (appBtn) {

      log.interaction(interaction, "button");

      if (appBtn.action === "approve") return handleApplicationApprove(interaction, appBtn.id);

      if (appBtn.action === "deny") return handleApplicationDenyButton(interaction, appBtn.id);

    }



    const handler = BUTTON_HANDLERS[interaction.customId];

    if (handler) {
      log.interaction(interaction, "button");
      maybeTouchTicket(interaction);
      return handler(interaction);
    }

    const prisPanelBtn = handlePrisPanelButton(interaction);
    if (prisPanelBtn) {
      log.interaction(interaction, "button");
      return prisPanelBtn;
    }

    if (interaction.customId.startsWith("ticket_") || interaction.customId.startsWith("application_")) {
      return interaction.reply({
        content: "❌ Denne knap er udløbet. Bed ledelsen køre `,panels refresh`.",
        ephemeral: true,
      }).catch(() => {});
    }
    return;
  }



  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "pris_cat_select") {
      log.interaction(interaction, "select");
      return handlePrisCategorySelect(interaction);
    }

    if (interaction.customId.startsWith("pris_part_select:")) {
      log.interaction(interaction, "select");
      return handlePrisPartSelect(interaction);
    }

    const handler = SELECT_HANDLERS[interaction.customId];

    if (handler) {

      log.interaction(interaction, "select");

      maybeTouchTicket(interaction);

      return handler(interaction);

    }

    return;

  }



  if (interaction.isModalSubmit()) {

    if (interaction.customId.startsWith("ticket_modal_")) {

      const type = interaction.customId.replace("ticket_modal_", "");

      log.interaction(interaction, "modal");

      maybeTouchTicket(interaction);

      return submitTypeModal(interaction, type);

    }

    if (interaction.customId.startsWith("embed_create_")) {

      log.interaction(interaction, "modal");

      return handleEmbedCreateModal(interaction);

    }

    if (interaction.customId.startsWith("application_deny_submit_")) {

      const applicationId = interaction.customId.replace("application_deny_submit_", "");

      log.interaction(interaction, "modal");

      return handleApplicationDenySubmit(interaction, applicationId);

    }

    if (interaction.customId.startsWith("pris_edit_modal:")) {
      log.interaction(interaction, "modal");
      return handlePrisEditModal(interaction);
    }

    const handler = MODAL_HANDLERS[interaction.customId];

    if (handler) {

      log.interaction(interaction, "modal");

      maybeTouchTicket(interaction);

      return handler(interaction);

    }

  }

}



export async function safeRouteInteraction(interaction) {

  try {

    await routeInteraction(interaction);

  } catch (err) {

    log.error("Interaction fejl", { error: err.message, stack: err.stack?.slice(0, 300) });

    const reply = { content: "Der opstod en fejl — prøv igen eller kontakt ledelsen.", ephemeral: true };

    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});

    else await interaction.reply(reply).catch(() => {});

  }

}



export { commandMap };


