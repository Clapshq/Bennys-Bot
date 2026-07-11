import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { mechanicApplication } from "../config/applications.js";
import { applicationChannelNames } from "../config/channels.js";
import { getLedelseRoles } from "../config/roles.js";
import {
  createSession,
  getSession,
  clearSession,
  saveAnswer,
  generateApplicationId,
  hasPendingApplication,
  saveApplication,
  getApplication,
  updateApplication,
  isSessionExpired,
  isSessionSubmitting,
  lockSessionForSubmit,
  getReapplyCooldownRemaining,
  recordApplicationCooldown,
  recordDenyCooldown,
  markSessionAwaitingConfirm,
  getAllSessions,
} from "../utils/applicationStore.js";
import { createEmbed } from "../utils/brand.js";
import { isLedelseMember, formatDuration } from "../utils/modHelpers.js";
import { requestDashboardSync } from "../services/dashboardSync.js";
import { brand } from "../config/brand.js";

const { questions, totalSteps, cancelKeyword, ticketType, minCompletionMs, confirmKeyword } =
  mechanicApplication;

export function getApplicationReviewChannel(guild) {
  return guild.channels.cache.find((c) => c.name === applicationChannelNames.review);
}

function ledelsePing(guild) {
  return getLedelseRoles(guild)
    .map((r) => r.toString())
    .join(" ");
}

function questionMessage(step) {
  return `**${step + 1}/${totalSteps}.** ${questions[step]}`;
}

function buildSummaryEmbed(app, statusLabel) {
  const fields = questions.map((q, i) => ({
    name: `${i + 1}. ${q}`,
    value: (app.answers[i] ?? "—").slice(0, 1024),
  }));

  const variant =
    statusLabel === "pending" ? "blue" : statusLabel.startsWith("Godkendt") ? "success" : "error";

  let description =
    `Ansøger: <@${app.userId}> · ID: \`${app.id}\`` +
    (statusLabel !== "pending" ? `\n**Status:** ${statusLabel}` : "");

  if (app.ticketChannelId && app.status === "approved") {
    description += `\n🎫 Ticket: <#${app.ticketChannelId}>`;
  }
  if (app.denyReason && app.status === "denied") {
    description += `\n📝 **Grund sendt til ansøger:** ${app.denyReason.slice(0, 500)}`;
  }

  return createEmbed(variant)
    .setTitle(`📋 Mekaniker-ansøgning — ${app.userTag}`)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp(new Date(app.createdAt ?? Date.now()));
}

function buildPreviewText(answers) {
  const lines = questions.map((q, i) => `**${i + 1}.** ${q}\n> ${(answers[i] ?? "—").slice(0, 400)}`);
  return (
    "📋 **Gennemse din ansøgning**\n\n" +
    lines.join("\n\n") +
    `\n\nSkriv \`${confirmKeyword}\` for at **sende** til ledelsen.\n` +
    `Skriv \`${cancelKeyword}\` for at annullere.`
  );
}

function reviewButtons(applicationId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`application_approve_${applicationId}`)
      .setLabel("Godkend")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`application_deny_${applicationId}`)
      .setLabel("Afvis")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
      .setDisabled(disabled)
  );
}

export async function startMechanicApplication(interaction) {
  const user = interaction.user;

  const cooldownMs = getReapplyCooldownRemaining(user.id);
  if (cooldownMs > 0) {
    return interaction.reply({
      content: `⏳ Du skal vente **${formatDuration(cooldownMs)}** før du kan starte en ny ansøgning.`,
      ephemeral: true,
    });
  }

  const existing = getSession(user.id);
  if (existing) {
    if (isSessionExpired(existing)) {
      await expireUserSession(interaction.client, user.id, "timeout");
    } else {
      return interaction.reply({
        content: "ℹ️ Du har allerede en ansøgning i gang — tjek dine **DM'er**.",
        ephemeral: true,
      });
    }
  }

  if (hasPendingApplication(user.id)) {
    return interaction.reply({
      content: "⏳ Du har allerede en ansøgning der afventer ledelsens vurdering.",
      ephemeral: true,
    });
  }

  createSession(user.id, interaction.guild.id);

  const intro =
    `**Velkommen til ${brand.name}!**\n\n` +
    `Du ansøger om at blive **mekaniker** hos os.\n` +
    `Svar på **${totalSteps} spørgsmål** her i DM — ét ad gangen.\n\n` +
    `⏱️ Du har **3 timer** til at færdiggøre — brug mindst **5 minutter** på dine svar.\n` +
    `Når du har svaret, skal du skrive \`${confirmKeyword}\` for at sende.\n` +
    `Skriv \`${cancelKeyword}\` for at annullere.\n\n` +
    questionMessage(0);

  try {
    await user.send(intro);
  } catch {
    clearSession(user.id);
    return interaction.reply({
      content:
        "❌ Jeg kan ikke sende dig en DM.\n\n" +
        "Tillad DMs fra servermedlemmer under **Privatliv** i serverindstillingerne.",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: "✅ **Tjek dine DM'er!** Svar på spørgsmålene én ad gangen.",
    ephemeral: true,
  });
}

export async function handleApplicationDM(message) {
  if (message.guild || message.author.bot) return false;

  const session = getSession(message.author.id);
  if (!session) return false;

  if (session.submitting || isSessionSubmitting(message.author.id)) {
    await message.reply("⏳ Din ansøgning behandles — vent et øjeblik.").catch(() => {});
    return true;
  }

  if (isSessionExpired(session)) {
    await expireUserSession(message.client, message.author.id, "timeout");
    return true;
  }

  const content = message.content?.trim();
  if (!content) {
    await message.reply(`Skriv et svar — eller \`${cancelKeyword}\` for at annullere.`).catch(() => {});
    return true;
  }

  if (content.toLowerCase() === cancelKeyword) {
    clearSession(message.author.id);
    recordApplicationCooldown(message.author.id);
    await message.reply("❌ Ansøgning annulleret. Du kan ansøge igen om **5 minutter**.").catch(() => {});
    return true;
  }

  if (session.awaitingConfirm) {
    if (content.toLowerCase() === confirmKeyword.toLowerCase()) {
      const elapsed = Date.now() - session.startedAt;
      if (elapsed < minCompletionMs) {
        clearSession(message.author.id);
        recordApplicationCooldown(message.author.id);
        await message
          .reply(
            "❌ Ansøgning **slettet** — du skal bruge mindst **5 minutter** på dine svar.\n\nPrøv igen om 5 minutter."
          )
          .catch(() => {});
        return true;
      }
      if (!lockSessionForSubmit(message.author.id)) {
        await message.reply("⏳ Din ansøgning behandles allerede.").catch(() => {});
        return true;
      }
      await finalizeApplication(message.client, message.author, session.guildId, session.answers);
      return true;
    }
    await message
      .reply(`Skriv \`${confirmKeyword}\` for at sende, eller \`${cancelKeyword}\` for at annullere.`)
      .catch(() => {});
    return true;
  }

  if (content.length > 2000) {
    await message.reply("❌ Svar for langt (max 2000 tegn).").catch(() => {});
    return true;
  }

  saveAnswer(message.author.id, content);
  const updated = getSession(message.author.id);

  if (updated.step < totalSteps) {
    await message.reply(questionMessage(updated.step)).catch(() => {});
    return true;
  }

  markSessionAwaitingConfirm(message.author.id);
  await message.reply(buildPreviewText(updated.answers)).catch(() => {});
  return true;
}

async function finalizeApplication(client, user, guildId, answers) {
  const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
  if (!guild) {
    clearSession(user.id);
    recordApplicationCooldown(user.id);
    await user.send("❌ Kunne ikke finde serveren.").catch(() => {});
    return;
  }

  const reviewChannel = getApplicationReviewChannel(guild);
  if (!reviewChannel) {
    clearSession(user.id);
    recordApplicationCooldown(user.id);
    await user.send("❌ Ansøgningskanalen findes ikke — bed ledelsen køre `,panels refresh`.").catch(() => {});
    return;
  }

  const appId = generateApplicationId();
  const record = {
    id: appId,
    userId: user.id,
    userTag: user.tag,
    guildId,
    answers,
    status: "pending",
    createdAt: Date.now(),
    reviewMessageId: null,
  };

  const reviewMsg = await reviewChannel
    .send({
      content: ledelsePing(guild) || null,
      embeds: [buildSummaryEmbed(record, "pending")],
      components: [reviewButtons(appId)],
    })
    .catch(() => null);

  if (!reviewMsg) {
    clearSession(user.id);
    recordApplicationCooldown(user.id);
    await user.send("❌ Kunne ikke sende ansøgning — prøv igen om 5 minutter.").catch(() => {});
    return;
  }

  record.reviewMessageId = reviewMsg.id;
  saveApplication(record);

  await user
    .send(
      "✅ **Tak for din ansøgning!**\n\n" +
        "Ledelsen har modtaget dine svar og vurderer dem snart.\n" +
        "Du får besked her i DM når der er en beslutning."
    )
    .catch(() => {});
  requestDashboardSync(client);
}

export async function handleApplicationApprove(interaction, applicationId) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun ledelse kan godkende ansøgninger.", ephemeral: true });
  }

  const app = getApplication(applicationId);
  if (!app) {
    return interaction.reply({ content: "❌ Ansøgning ikke fundet.", ephemeral: true });
  }
  if (app.status !== "pending") {
    return interaction.reply({ content: "❌ Denne ansøgning er allerede behandlet.", ephemeral: true });
  }

  await interaction.deferUpdate();

  const member = await interaction.guild.members.fetch(app.userId).catch(() => null);
  if (!member) {
    return interaction.followUp({ content: "❌ Ansøger er ikke længere på serveren.", ephemeral: true });
  }

  const { buildTicketChannel } = await import("./ticketHandler.js");
  const { channel, created, duplicateType, limitReached } = await buildTicketChannel(
    interaction.guild,
    member.user,
    ticketType
  );

  const summary = buildSummaryEmbed(app, `Godkendt af ${interaction.user.tag}`);
  await channel
    .send({
      content: `<@${app.userId}>`,
      embeds: [
        summary.setTitle("📋 Godkendt ansøgning — interview"),
        createEmbed("success").setDescription(
          "🎉 **Tillykke!** Din ansøgning er godkendt.\n\nLedelsen tager den videre her i ticketten."
        ),
      ],
    })
    .catch(() => {});

  let dmText =
    "🎉 **Tillykke!** Din ansøgning som mekaniker hos Benny's er **godkendt**.\n\n" +
    "Vi har oprettet en ticket til dig på serveren — tjek den for næste skridt.";
  if (!created) {
    if (duplicateType || limitReached) {
      dmText += `\n\n*(Du havde allerede en ticket: ${channel})*`;
    }
  } else {
    dmText += `\n\nTicket: ${channel}`;
  }

  await member.user.send(dmText).catch(() => {});

  updateApplication(applicationId, {
    status: "approved",
    reviewedBy: interaction.user.id,
    reviewedAt: Date.now(),
    ticketChannelId: channel.id,
  });

  const updatedApp = getApplication(applicationId);

  await interaction.message
    .edit({
      embeds: [buildSummaryEmbed(updatedApp, `Godkendt af ${interaction.user.tag}`)],
      components: [reviewButtons(applicationId, true)],
    })
    .catch(() => {});
  requestDashboardSync(interaction.client);
}

export function buildApplicationDenyModal(applicationId) {
  return new ModalBuilder()
    .setCustomId(`application_deny_submit_${applicationId}`)
    .setTitle("Afvis ansøgning")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deny_reason")
          .setLabel("Grund (valgfri)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

export async function handleApplicationDenyButton(interaction, applicationId) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun ledelse kan afvise ansøgninger.", ephemeral: true });
  }

  const app = getApplication(applicationId);
  if (!app) {
    return interaction.reply({ content: "❌ Ansøgning ikke fundet.", ephemeral: true });
  }
  if (app.status !== "pending") {
    return interaction.reply({ content: "❌ Allerede behandlet.", ephemeral: true });
  }

  return interaction.showModal(buildApplicationDenyModal(applicationId));
}

export async function handleApplicationDenySubmit(interaction, applicationId) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun ledelse.", ephemeral: true });
  }

  const app = getApplication(applicationId);
  if (!app || app.status !== "pending") {
    return interaction.reply({ content: "❌ Ansøgning kan ikke afvises.", ephemeral: true });
  }

  const reason = interaction.fields.getTextInputValue("deny_reason")?.trim() || "Ingen angivet";

  const user = await interaction.client.users.fetch(app.userId).catch(() => null);
  if (user) {
    await user
      .send(
        "❌ Desværre er din ansøgning som mekaniker hos **Benny's** blevet **afvist**.\n\n" +
          `**Grund:** ${reason}\n\nDu kan ansøge igen om **30 minutter**.`
      )
      .catch(() => {});
  }

  updateApplication(applicationId, {
    status: "denied",
    reviewedBy: interaction.user.id,
    reviewedAt: Date.now(),
    denyReason: reason,
  });

  recordDenyCooldown(app.userId);

  const updatedApp = getApplication(applicationId);

  const reviewChannel = getApplicationReviewChannel(interaction.guild);
  const msg = reviewChannel
    ? await reviewChannel.messages.fetch(app.reviewMessageId).catch(() => null)
    : null;

  if (msg) {
    await msg
      .edit({
        embeds: [buildSummaryEmbed(updatedApp, `Afvist af ${interaction.user.tag}`)],
        components: [reviewButtons(applicationId, true)],
      })
      .catch(() => {});
  }

  requestDashboardSync(interaction.client);

  return interaction.reply({
    content: "✅ Ansøgning afvist — ansøger har fået DM med grunden.",
    ephemeral: true,
  });
}

export function parseApplicationButtonId(customId) {
  const approve = customId.match(/^application_approve_(.+)$/);
  if (approve) return { action: "approve", id: approve[1] };
  const deny = customId.match(/^application_deny_(.+)$/);
  if (deny) return { action: "deny", id: deny[1] };
  return null;
}

async function expireUserSession(client, userId, reason = "timeout") {
  const session = getSession(userId);
  if (!session) return;

  clearSession(userId);
  recordApplicationCooldown(userId);

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return;

  const text =
    reason === "timeout"
      ? "⏱️ Din ansøgning er **slettet** — du svarede ikke inden for **3 timer**.\n\nDu kan starte en ny om **5 minutter** i **#ansøgning**."
      : "❌ Din ansøgning er **slettet**.\n\nDu kan ansøge igen om **5 minutter**.";

  await user.send(text).catch(() => {});
}

/** Dashboard — godkend ansøgning uden Discord-interaction */
export async function approveApplicationDashboard(client, guild, applicationId, reviewerId) {
  const app = getApplication(applicationId);
  if (!app) throw new Error("Ansøgning ikke fundet");
  if (app.status !== "pending") throw new Error("Ansøgning er allerede behandlet");

  const reviewer = await client.users.fetch(reviewerId).catch(() => null);
  const member = await guild.members.fetch(app.userId).catch(() => null);
  if (!member) throw new Error("Ansøger er ikke på serveren");

  const { buildTicketChannel } = await import("./ticketHandler.js");
  const { channel, created, duplicateType, limitReached } = await buildTicketChannel(
    guild,
    member.user,
    ticketType
  );

  const summary = buildSummaryEmbed(app, `Godkendt af ${reviewer?.tag ?? reviewerId}`);
  await channel
    .send({
      content: `<@${app.userId}>`,
      embeds: [
        summary.setTitle("📋 Godkendt ansøgning — interview"),
        createEmbed("success").setDescription(
          "🎉 **Tillykke!** Din ansøgning er godkendt.\n\nLedelsen tager den videre her i ticketten."
        ),
      ],
    })
    .catch(() => {});

  let dmText =
    "🎉 **Tillykke!** Din ansøgning som mekaniker hos Benny's er **godkendt**.\n\n" +
    "Vi har oprettet en ticket til dig på serveren — tjek den for næste skridt.";
  if (!created && (duplicateType || limitReached)) {
    dmText += `\n\n*(Du havde allerede en ticket: ${channel})*`;
  } else if (created) {
    dmText += `\n\nTicket: ${channel}`;
  }
  await member.user.send(dmText).catch(() => {});

  updateApplication(applicationId, {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: Date.now(),
    ticketChannelId: channel.id,
  });

  const reviewChannel = getApplicationReviewChannel(guild);
  const msg = reviewChannel ? await reviewChannel.messages.fetch(app.reviewMessageId).catch(() => null) : null;
  const updatedApp = getApplication(applicationId);
  if (msg) {
    await msg
      .edit({
        embeds: [buildSummaryEmbed(updatedApp, `Godkendt af ${reviewer?.tag ?? reviewerId}`)],
        components: [reviewButtons(applicationId, true)],
      })
      .catch(() => {});
  }
  requestDashboardSync(client);
}

/** Dashboard — afvis ansøgning */
export async function denyApplicationDashboard(client, guild, applicationId, reviewerId, reason) {
  const app = getApplication(applicationId);
  if (!app) throw new Error("Ansøgning ikke fundet");
  if (app.status !== "pending") throw new Error("Ansøgning kan ikke afvises");

  const reviewer = await client.users.fetch(reviewerId).catch(() => null);
  const user = await client.users.fetch(app.userId).catch(() => null);
  if (user) {
    await user
      .send(
        "❌ Desværre er din ansøgning som mekaniker hos **Benny's** blevet **afvist**.\n\n" +
          `**Grund:** ${reason}\n\nDu kan ansøge igen om **30 minutter**.`
      )
      .catch(() => {});
  }

  updateApplication(applicationId, {
    status: "denied",
    reviewedBy: reviewerId,
    reviewedAt: Date.now(),
    denyReason: reason,
  });
  recordDenyCooldown(app.userId);

  const reviewChannel = getApplicationReviewChannel(guild);
  const msg = reviewChannel ? await reviewChannel.messages.fetch(app.reviewMessageId).catch(() => null) : null;
  const updatedApp = getApplication(applicationId);
  if (msg) {
    await msg
      .edit({
        embeds: [buildSummaryEmbed(updatedApp, `Afvist af ${reviewer?.tag ?? reviewerId}`)],
        components: [reviewButtons(applicationId, true)],
      })
      .catch(() => {});
  }
  requestDashboardSync(client);
}

export function startApplicationSweep(client) {
  const tick = async () => {
    for (const session of getAllSessions()) {
      if (isSessionExpired(session)) {
        await expireUserSession(client, session.userId, "timeout");
      }
    }
  };

  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), 60_000).unref?.();
}
