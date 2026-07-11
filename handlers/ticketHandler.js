import {
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { ticketWelcomeEmbed, ticketClosedEmbed } from "../utils/embeds.js";
import { ticketControlButtons } from "../utils/components.js";
import { createEmbed } from "../utils/brand.js";
import { brand } from "../config/brand.js";
import {
  nextTicketNumber,
  registerTicket,
  updateTicketRegistry,
  closeTicketRegistry,
  getOpenTicketsForUser,
  getOpenTicketOfType,
  registerWorkshopBanDecision,
  addTicketInternalNote,
  savePendingRating,
  getPendingRating,
  deletePendingRating,
  getAllPendingRatings,
  touchTicketActivity,
} from "../utils/dataStore.js";
import {
  ticketConfig,
  getTicketCategory,
  categoryNeedsModal,
  isStaffOnlyTicketType,
  isNoRatingTicketType,
} from "../config/tickets.js";
import { checkCooldown } from "../core/cooldowns.js";
import { ticketRatingButtons } from "../utils/components.js";
import { generateTranscriptAttachment } from "../utils/transcript.js";
import { getTicketLogChannel, isStaffMember, isLedelseMember } from "../utils/modHelpers.js";
import { requestDashboardSync } from "../services/dashboardSync.js";
import { getStaffRoles, getLedelseRoles } from "../config/roles.js";
import {
  saveTranscript,
  canSyncTranscriptsToCloud,
  formatTranscriptUserLine,
  resolveTranscriptPublicUrl,
} from "../services/dashboardStore.js";
import { rootLogger } from "../core/logger.js";

async function logTicketEvent(guild, { title, fields = [], color = "accent" }) {
  const logChannel = getTicketLogChannel(guild);
  if (!logChannel) return;

  const embed = createEmbed(color).setTitle(title).addFields(fields).setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

export const TICKET_CATEGORY = "🎫 Tickets";

const TOPIC_RE = /#(\d+)\s*\|\s*type:(\w+)\s*\|\s*opener:(\d+)/;
const TOPIC_LEGACY_RE = /#(\d+)\s*\|\s*type:(\w+)\s*\|\s*priority:\w+\s*\|\s*opener:(\d+)/;

const pendingRatings = new Map();

function persistPendingRating(userId, data) {
  pendingRatings.set(userId, data);
  savePendingRating(userId, data);
}

function clearPendingRating(userId) {
  pendingRatings.delete(userId);
  deletePendingRating(userId);
}

export function loadPendingRatingsFromDisk() {
  for (const entry of getAllPendingRatings()) {
    pendingRatings.set(entry.userId, entry.data);
  }
}

async function updateTicketLogRating(guild, logMessageId, ratingText) {
  const logChannel = getTicketLogChannel(guild);
  if (!logChannel || !logMessageId) return;

  try {
    const msg = await logChannel.messages.fetch(logMessageId);
    if (!msg.embeds[0]) return;

    const embed = EmbedBuilder.from(msg.embeds[0]);
    const fields = embed.data.fields.map((f) =>
      f.name === "Rating" ? { name: f.name, value: ratingText, inline: f.inline } : f
    );
    embed.setFields(fields);
    await msg.edit({ embeds: [embed] });
  } catch {
    /* log-besked kan være slettet */
  }
}

export function isTicketChannel(channel) {
  if (!channel?.name) return false;
  return (
    channel.name.startsWith("ticket-") ||
    channel.name.startsWith("bestilling-") ||
    channel.name.startsWith("henvendelse-")
  );
}

export function getTicketMeta(channel) {
  const topic = channel.topic ?? "";
  const match = topic.match(TOPIC_RE) ?? topic.match(TOPIC_LEGACY_RE);
  if (match) {
    return {
      number: parseInt(match[1], 10),
      type: match[2],
      openerId: match[3],
    };
  }

  const legacyType = channel.name.startsWith("bestilling-") ? "order" : "contact";
  return { number: "?", type: legacyType, openerId: null };
}

function buildTopic(number, type, openerId) {
  return `#${number} | type:${type} | opener:${openerId}`;
}

export function touchTicketChannelActivity(channel) {
  if (!channel?.guild || !isTicketChannel(channel)) return;
  touchTicketActivity(channel.guild.id, channel.id);
}

export async function ensureTicketCategory(guild) {
  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY
  );
  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }],
    });
  }
  return category;
}

function slug(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
}

function buildStaffPing(guild, category) {
  const parts = getStaffRoles(guild).map((r) => r.toString());
  if (category.pingLedelse) {
    for (const role of getLedelseRoles(guild)) {
      const mention = role.toString();
      if (!parts.includes(mention)) parts.push(mention);
    }
  }
  return parts.join(" ");
}

function baseOverwrites(guild, userId) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  for (const role of getStaffRoles(guild)) {
    overwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  return overwrites;
}

async function findOpenTicket(guild, userId, type) {
  const category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY
  );
  if (!category) return null;

  return guild.channels.cache.find((c) => {
    if (c.parentId !== category.id || c.type !== ChannelType.GuildText) return false;
    const meta = getTicketMeta(c);
    return meta.openerId === userId && meta.type === type;
  });
}

export async function buildTicketChannel(guild, user, type) {
  const cat = getTicketCategory(type);

  if (cat.onePerUser) {
    const existingEntry = getOpenTicketOfType(guild.id, user.id, type);
    if (existingEntry?.channelId) {
      const ch = guild.channels.cache.get(existingEntry.channelId);
      if (ch) return { channel: ch, created: false, duplicateType: true };
    }
  }

  const openTickets = getOpenTicketsForUser(guild.id, user.id);
  if (openTickets.length >= ticketConfig.maxOpenTicketsPerUser) {
    const existing = guild.channels.cache.get(openTickets[0]?.channelId);
    if (existing) return { channel: existing, created: false, limitReached: true };
  }

  const existing = await findOpenTicket(guild, user.id, type);
  if (existing) return { channel: existing, created: false };

  const category = await ensureTicketCategory(guild);
  const ticketNumber = nextTicketNumber(guild.id);
  const name = `ticket-${String(ticketNumber).padStart(4, "0")}-${type}-${slug(user.username)}`;

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: buildTopic(ticketNumber, type, user.id),
    permissionOverwrites: baseOverwrites(guild, user.id),
  });

  registerTicket(guild.id, channel.id, {
    number: ticketNumber,
    type,
    openerId: user.id,
    openerTag: user.tag,
  });

  const ping = buildStaffPing(guild, cat);

  await channel.send({
      content: `${user}${ping ? ` | ${ping}` : ""}`,
      embeds: [ticketWelcomeEmbed(type, user, ticketNumber)],
      components: ticketControlButtons(type),
    }).then((msg) => {
      updateTicketRegistry(guild.id, channel.id, { controlMessageId: msg.id });
    });

  await logTicketEvent(channel.guild, {
    title: `🎫 Ticket #${ticketNumber} oprettet`,
    fields: [
      { name: "Type", value: cat.label, inline: true },
      { name: "Kanal", value: `${channel}`, inline: true },
      { name: "Oprettet af", value: `${user}`, inline: false },
    ],
  });

  requestDashboardSync(guild.client);

  return { channel, created: true, ticketNumber };
}

export async function createTicket(interaction, type) {
  if (isStaffOnlyTicketType(type) && !isStaffMember(interaction.member)) {
    return interaction.reply({
      content: "❌ Kun medarbejdere kan oprette denne ticket-type.",
      ephemeral: true,
    });
  }

  const cd = checkCooldown(interaction.user.id, "ticket_create", 5000);
  if (!cd.allowed) {
    return interaction.reply({ content: `⏳ Vent ${cd.remainingSeconds}s`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const { channel, created, limitReached, duplicateType } = await buildTicketChannel(
    interaction.guild,
    interaction.user,
    type
  );

  if (limitReached) {
    return interaction.editReply({
      content: `❌ Du har allerede **${ticketConfig.maxOpenTicketsPerUser}** åbne tickets. Luk en først: ${channel}`,
    });
  }

  if (duplicateType) {
    const cat = getTicketCategory(type);
    return interaction.editReply({
      content: `ℹ️ Du har allerede en åben **${cat.label}**-ticket: ${channel}`,
    });
  }

  await interaction.editReply({
    content: created ? `✅ Ticket oprettet: ${channel}` : `ℹ️ Du har allerede en åben ticket: ${channel}`,
  });
}

export async function handleTicketCategorySelect(interaction) {
  const type = interaction.values[0];
  if (isStaffOnlyTicketType(type) && !isStaffMember(interaction.member)) {
    return interaction.reply({
      content: "❌ Kun medarbejdere kan oprette denne ticket-type.",
      ephemeral: true,
    });
  }
  if (categoryNeedsModal(type)) {
    const { buildTypeModal } = await import("./ticketModals.js");
    return interaction.showModal(buildTypeModal(type));
  }
  return createTicket(interaction, type);
}

export async function createTicketForUser(guild, user, type, staffUser) {
  const { channel, created } = await buildTicketChannel(guild, user, type);
  if (created) {
    await channel.send(`📋 Ticket oprettet af ${staffUser} for ${user}.`).catch(() => {});
  }
  return { channel, created };
}

export async function addUserToTicket(channel, user, staffUser) {
  if (!isStaffMember(staffUser)) return { ok: false, error: "Kun staff kan tilføje brugere" };

  await channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });

  await channel.send(`➕ ${user} tilføjet af ${staffUser}.`);
  return { ok: true };
}

export async function removeUserFromTicket(channel, user, staffUser) {
  if (!isStaffMember(staffUser)) return { ok: false, error: "Kun staff kan fjerne brugere" };

  const meta = getTicketMeta(channel);
  if (user.id === meta.openerId) return { ok: false, error: "Kan ikke fjerne ticket-opretteren" };

  await channel.permissionOverwrites.delete(user.id);
  await channel.send(`➖ ${user} fjernet af ${staffUser}.`);
  return { ok: true };
}

export async function renameTicketChannel(channel, newName, staffUser) {
  if (!isStaffMember(staffUser)) return { ok: false, error: "Kun staff kan omdøbe tickets" };

  const safe = newName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  await channel.setName(safe);
  return { ok: true, name: safe };
}

async function deliverTranscript(channel, closedBy, reason, rating = null) {
  const meta = getTicketMeta(channel);
  let openerTag = meta.openerId ? `<@${meta.openerId}>` : "Ukendt";

  if (meta.openerId) {
    const opener = await channel.guild.members.fetch(meta.openerId).catch(() => null);
    if (opener) openerTag = opener.user.tag;
  }

  const { attachment, messageCount, html, messages } = await generateTranscriptAttachment(channel, {
    ticketNumber: meta.number,
    type: meta.type,
    openerTag,
    closedByTag: closedBy.tag ?? closedBy.username,
  });

  const cat = getTicketCategory(meta.type);

  let transcriptUrl = null;
  if (canSyncTranscriptsToCloud()) {
    const saved = await saveTranscript({
      guildId: channel.guild.id,
      ticketNumber: meta.number,
      channelName: channel.name,
      ticketType: meta.type,
      openerId: meta.openerId,
      openerTag,
      closedById: closedBy.id,
      closedByTag: closedBy.tag ?? closedBy.username,
      reason,
      rating,
      messageCount,
      html,
      messages: messages ?? [],
    }).catch((err) => {
      rootLogger.warn("saveTranscript fejlede", { error: err?.message ?? String(err) });
      return null;
    });
    transcriptUrl = resolveTranscriptPublicUrl(saved);
    if (saved?.syncError && !transcriptUrl) {
      rootLogger.warn("Transcript uden offentligt link", { syncError: saved.syncError });
    }
  }

  const logEmbed = createEmbed("accent")
    .setTitle(`📜 Ticket #${meta.number} lukket`)
    .addFields(
      { name: "Kanal", value: `#${channel.name}`, inline: true },
      { name: "Type", value: cat.label, inline: true },
      { name: "Beskeder", value: `${messageCount}`, inline: true },
      { name: "Lukket af", value: `${closedBy}`, inline: true },
      { name: "Rating", value: rating ? `${rating}/5 ⭐` : "Afventer", inline: true },
      { name: "Grund", value: reason || "Ingen", inline: false }
    )
    .setTimestamp();

  if (transcriptUrl) {
    logEmbed.addFields({ name: "Transcript", value: `[Åbn transcript](${transcriptUrl})`, inline: false });
  }

  closeTicketRegistry(channel.guild.id, channel.id, {
    closedBy: closedBy.id,
    rating,
    reason,
  });

  const logChannel = getTicketLogChannel(channel.guild);
  let logMessageId = null;
  if (logChannel) {
    const logPayload = { embeds: [logEmbed] };
    if (!transcriptUrl) logPayload.files = [attachment];
    const logMsg = await logChannel.send(logPayload).catch(() => null);
    logMessageId = logMsg?.id ?? null;
  }

  const transcriptLine = formatTranscriptUserLine(transcriptUrl);

  const wantsRating =
    rating === null &&
    ticketConfig.ratingEnabled &&
    meta.openerId &&
    !isNoRatingTicketType(meta.type);

  if (meta.openerId) {
    const openerUser = await channel.client.users.fetch(meta.openerId).catch(() => null);
    if (openerUser) {
      if (wantsRating) {
        const pendingData = {
          guildId: channel.guild.id,
          channelId: channel.id,
          ticketNumber: meta.number,
          type: meta.type,
          reason,
          logMessageId,
          transcriptUrl,
        };
        persistPendingRating(meta.openerId, pendingData);

        const dm = await openerUser
          .send({
            content:
              `🎫 Din ticket **#${meta.number}** (${cat.label}) hos Benny's er lukket.${transcriptLine}\n\nHvordan var din oplevelse?`,
            components: ticketRatingButtons(),
          })
          .catch(() => null);

        if (!dm) {
          clearPendingRating(meta.openerId);
        } else {
          pendingData.dmMessageId = dm.id;
          persistPendingRating(meta.openerId, pendingData);
        }
      } else {
        const ratingNote = rating !== null ? `\n⭐ Du ratede: **${rating}/5**` : "";
        await openerUser
          .send({
            content: `Din ticket **#${meta.number}** (${cat.label}) hos Benny's er lukket.${ratingNote}${transcriptLine}`,
          })
          .catch(() => {});
      }
    }
  }

  return { messageCount, transcriptUrl };
}

export async function sendTranscriptOnly(channel, requester) {
  if (!isStaffMember(requester)) return { ok: false, error: "Kun staff kan generere transcripts" };

  const meta = getTicketMeta(channel);
  let openerTag = meta.openerId ? `<@${meta.openerId}>` : "?";
  if (meta.openerId) {
    const opener = await channel.guild.members.fetch(meta.openerId).catch(() => null);
    if (opener) openerTag = opener.user.tag;
  }

  const { attachment, messageCount, html, messages } = await generateTranscriptAttachment(channel, {
    ticketNumber: meta.number,
    type: meta.type,
    openerTag,
    closedByTag: requester.tag,
  });

  let transcriptUrl = null;
  if (canSyncTranscriptsToCloud()) {
    const saved = await saveTranscript({
      guildId: channel.guild.id,
      ticketNumber: meta.number,
      channelName: channel.name,
      ticketType: meta.type,
      openerId: meta.openerId,
      openerTag,
      closedById: requester.id,
      closedByTag: requester.tag ?? requester.username,
      reason: "Manuelt transcript",
      rating: null,
      messageCount,
      html,
      messages: messages ?? [],
    }).catch((err) => {
      rootLogger.warn("saveTranscript fejlede", { error: err?.message ?? String(err) });
      return null;
    });
    transcriptUrl = resolveTranscriptPublicUrl(saved);
  }

  const linkLine = transcriptUrl ? transcriptUrl : null;

  const logChannel = getTicketLogChannel(channel.guild);
  if (logChannel) {
    if (transcriptUrl) {
      await logChannel.send({
        content: `📜 Manuelt transcript anmodet af ${requester}\n${linkLine}`,
      });
    } else {
      await logChannel.send({
        content: `📜 Manuelt transcript anmodet af ${requester}`,
        files: [attachment],
      });
    }
  }

  if (transcriptUrl) {
    await requester.send({ content: `Her er ticket-transcript:\n${linkLine}` }).catch(() => {});
  } else {
    await requester
      .send({
        content:
          "Kunne ikke oprette online transcript-link — tjek at DASHBOARD_APP_URL og Supabase er sat i bot .env.",
      })
      .catch(() => {});
  }

  return { ok: true, messageCount, transcriptUrl };
}

export async function finalizeTicketClose(channel, closedBy, reason, rating = null) {
  await channel.send({ embeds: [ticketClosedEmbed(closedBy, reason)], components: [] });
  await deliverTranscript(channel, closedBy, reason, rating);
  requestDashboardSync(channel.client);

  setTimeout(() => channel.delete("Ticket lukket").catch(() => {}), 10000);
}

export async function closeTicketFromDashboard(channel, closedByUser, reason = "Lukket via dashboard", rating = null) {
  if (!isTicketChannel(channel)) throw new Error("Ikke en ticket-kanal");
  await finalizeTicketClose(channel, closedByUser, reason, rating);
  return { ok: true };
}

export async function closeTicketWithTranscript(interaction, reason = "Lukket", rating = null) {
  const ch = interaction.channel;
  if (!isTicketChannel(ch)) return { ok: false, error: "Dette er ikke en ticket" };

  const member = interaction.member;
  const meta = getTicketMeta(ch);
  const isStaff = isStaffMember(member);
  const isOwner = meta.openerId === interaction.user.id;

  if (!isStaff && !isOwner) return { ok: false, error: "Kun staff eller ticket-ejer kan lukke" };

  await finalizeTicketClose(ch, interaction.user, reason, rating);
  return { ok: true };
}

export async function closeTicket(interaction) {
  await interaction.deferUpdate().catch(() => interaction.deferReply({ ephemeral: true }).catch(() => {}));

  const result = await closeTicketWithTranscript(interaction, "Lukket via knap");
  if (!result.ok) {
    await interaction.followUp({ content: `❌ ${result.error}`, ephemeral: true }).catch(() => {});
  }
}

async function editRatingMessage(interaction, content) {
  if (interaction.message && !interaction.guild) {
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.edit({ content, components: [] }).catch(() => {});
    return;
  }
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, components: [] }).catch(() => {});
  } else {
    await interaction.reply({ content, ephemeral: true }).catch(() => {});
  }
}

export async function handleTicketRating(interaction, stars) {
  const pending = pendingRatings.get(interaction.user.id) ?? getPendingRating(interaction.user.id)?.data;
  if (!pending) {
    const msg = { content: "❌ Ingen aktiv rating-anmodning.", ephemeral: true };
    if (interaction.replied || interaction.deferred) return interaction.followUp(msg).catch(() => {});
    return interaction.reply(msg).catch(() => {});
  }

  updateTicketRegistry(pending.guildId, pending.channelId, {
    rating: stars,
    ratedAt: new Date().toISOString(),
  });

  const guild = await interaction.client.guilds.fetch(pending.guildId).catch(() => null);
  if (guild && pending.logMessageId) {
    await updateTicketLogRating(guild, pending.logMessageId, `${stars}/5 ⭐`);
  }

  clearPendingRating(interaction.user.id);

  await editRatingMessage(
    interaction,
    `⭐ Tak for din rating: **${stars}/5**!\nVi sætter pris på din feedback hos Benny's Original Motor Works.`
  );
}

export async function handleTicketCloseConfirm(interaction) {
  const pending = pendingRatings.get(interaction.user.id) ?? getPendingRating(interaction.user.id)?.data;

  clearPendingRating(interaction.user.id);

  if (pending?.guildId && pending.logMessageId) {
    const guild = await interaction.client.guilds.fetch(pending.guildId).catch(() => null);
    if (guild) await updateTicketLogRating(guild, pending.logMessageId, "Sprunget over");
  }

  await editRatingMessage(interaction, "✅ Ticket lukket — tak fordi du brugte Benny's!");
}

export function buildTicketNoteModal() {
  return new ModalBuilder()
    .setCustomId("ticket_note_submit")
    .setTitle("Intern staff-note")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("note_content")
          .setLabel("Note (logges i #ticket-logs — kunden ser den ikke)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
}

export async function handleTicketNoteModal(interaction) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: "Kun staff.", ephemeral: true });
  }

  const note = interaction.fields.getTextInputValue("note_content");
  const meta = getTicketMeta(interaction.channel);

  addTicketInternalNote(interaction.guild.id, interaction.channel.id, {
    note,
    authorId: interaction.user.id,
    authorTag: interaction.user.tag,
  });

  const noteEmbed = createEmbed("discord")
    .setTitle(`📌 Staff note — Ticket #${meta.number}`)
    .setDescription(note.slice(0, 4000))
    .addFields({ name: "Af", value: `${interaction.user}`, inline: true })
    .setTimestamp();

  await interaction.channel.send({ embeds: [noteEmbed] }).catch(() => {});

  await logTicketEvent(interaction.guild, {
    title: `📌 Staff note — Ticket #${meta.number}`,
    fields: [
      { name: "Kanal", value: `#${interaction.channel.name}`, inline: true },
      { name: "Af", value: `${interaction.user}`, inline: true },
      { name: "Note", value: note.slice(0, 1000), inline: false },
    ],
    color: "discord",
  });

  await interaction.reply({ content: "📌 Intern note gemt i ticketten og #ticket-logs.", ephemeral: true });
  touchTicketChannelActivity(interaction.channel);
}

export async function handleAppealApprove(interaction) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun **ledelse & ejere** kan godkende ban-ansøgninger.", ephemeral: true });
  }

  const meta = getTicketMeta(interaction.channel);
  if (meta.type !== "workshop_ban") {
    return interaction.reply({ content: "❌ Dette er ikke en ban-ansøgning.", ephemeral: true });
  }

  await interaction.deferUpdate();
  registerWorkshopBanDecision(interaction.guild.id, interaction.channel.id, {
    decision: "approved",
    staffId: interaction.user.id,
    staffTag: interaction.user.tag,
    reason: "Adgang til værkstedet godkendt",
  });

  const opener = meta.openerId ? `<@${meta.openerId}>` : "Kunden";
  await interaction.channel.send({
      embeds: [
        createEmbed("success")
          .setTitle("✅ Adgang godkendt")
          .setDescription(
            `${interaction.user} har **godkendt** ${opener}s ansøgning om adgang til Benny's værksted.\n\n` +
              "Du må igen komme på værkstedet — **respekter reglerne** fremover.\n" +
              "Ved gentagne overtrædelser bliver du bandlyst permanent."
          )
          .setTimestamp(),
      ],
    });

  await logTicketEvent(interaction.guild, {
    title: `✅ Ban-ansøgning godkendt — Ticket #${meta.number}`,
    fields: [{ name: "Af", value: `${interaction.user}`, inline: true }],
    color: "success",
  });
}

export async function handleAppealDeny(interaction) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun **ledelse & ejere** kan afvise ban-ansøgninger.", ephemeral: true });
  }

  const meta = getTicketMeta(interaction.channel);
  if (meta.type !== "workshop_ban") {
    return interaction.reply({ content: "❌ Dette er ikke en ban-ansøgning.", ephemeral: true });
  }

  const { buildAppealDenyModal } = await import("./ticketModals.js");
  return interaction.showModal(buildAppealDenyModal());
}

export async function handleAppealDenySubmit(interaction) {
  if (!isLedelseMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun ledelse & ejere.", ephemeral: true });
  }

  const reason = interaction.fields.getTextInputValue("deny_reason");
  const meta = getTicketMeta(interaction.channel);

  await interaction.deferReply({ ephemeral: true });

  registerWorkshopBanDecision(interaction.guild.id, interaction.channel.id, {
    decision: "denied",
    staffId: interaction.user.id,
    staffTag: interaction.user.tag,
    reason,
  });

  const opener = meta.openerId ? `<@${meta.openerId}>` : "Kunden";
  await interaction.channel.send({
      embeds: [
        createEmbed("error")
          .setTitle("❌ Adgang afvist")
          .setDescription(
            `${interaction.user} har **afvist** ${opener}s ansøgning.\n\n**Grund:** ${reason}\n\nDu kan ansøge igen om minimum **30 dage** hvis omstændighederne ændrer sig væsentligt.`
          )
          .setTimestamp(),
      ],
    });

  await logTicketEvent(interaction.guild, {
    title: `❌ Ban-ansøgning afvist — Ticket #${meta.number}`,
    fields: [
      { name: "Af", value: `${interaction.user}`, inline: true },
      { name: "Grund", value: reason.slice(0, 500), inline: false },
    ],
    color: "error",
  });

  await interaction.editReply({ content: "❌ Ansøgning afvist." });
}

export async function handleTicketEscalate(interaction) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: "❌ Kun staff.", ephemeral: true });
  }

  await interaction.deferUpdate();
  await escalateTicketChannel(interaction.channel, interaction.user);
}

export async function escalateTicketChannel(channel, staffUser) {
  const meta = getTicketMeta(channel);
  const ledelsePing = getLedelseRoles(channel.guild).map((r) => r.toString()).join(" ");

  updateTicketRegistry(channel.guild.id, channel.id, { escalated: true });
  touchTicketChannelActivity(channel);

  await channel.send(
    `${ledelsePing || "@Ledelse"} — Ticket #${meta.number} eskaleret af ${staffUser} 👔`
  );
  return { ok: true };
}

export function buildOrderModal() {
  const modal = new ModalBuilder().setCustomId("order_modal_submit").setTitle(`${brand.shortName} — Bestilling`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("order_name").setLabel("Ingame navn").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("order_plate").setLabel("Nummerplade").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(16)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("order_vehicle").setLabel("Køretøj").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("order_work").setLabel("Ønsket arbejde").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("order_extra").setLabel("Ekstra info").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200)
    )
  );

  return modal;
}

export async function submitOrderModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const data = {
    name: interaction.fields.getTextInputValue("order_name"),
    plate: interaction.fields.getTextInputValue("order_plate"),
    vehicle: interaction.fields.getTextInputValue("order_vehicle"),
    work: interaction.fields.getTextInputValue("order_work"),
    extra: interaction.fields.getTextInputValue("order_extra") || "Ingen",
  };

  const { channel, created, limitReached, duplicateType } = await buildTicketChannel(
    interaction.guild,
    interaction.user,
    "order"
  );

  if (limitReached) {
    return interaction.editReply({
      content: `❌ Du har for mange åbne tickets. Luk en først: ${channel}`,
    });
  }

  if (!created) {
    return interaction.editReply({
      content: duplicateType
        ? `ℹ️ Du har allerede en åben bestilling: ${channel}`
        : `ℹ️ Du har allerede en åben ticket: ${channel}`,
    });
  }

  const embed = createEmbed("accent")
    .setTitle("⚡ Hurtig bestilling")
    .addFields(
      { name: "👤 Navn", value: data.name, inline: true },
      { name: "🚗 Nummerplade", value: data.plate, inline: true },
      { name: "🏎️ Køretøj", value: data.vehicle, inline: true },
      { name: "🔧 Arbejde", value: data.work, inline: false },
      { name: "📝 Ekstra", value: data.extra, inline: false }
    );

  await channel.send({ embeds: [embed] });

  await interaction.editReply({
    content: `✅ Bestilling oprettet: ${channel}`,
  });
}

export function startTicketInactiveSweep(client) {
  const hours = ticketConfig.inactiveAutoCloseHours;
  const maxMs = hours * 60 * 60 * 1000;
  const warnBeforeMs =
    (ticketConfig.inactiveWarningHoursBefore > 0
      ? ticketConfig.inactiveWarningHoursBefore
      : Math.min(24, Math.floor(hours / 3))) *
    60 *
    60 *
    1000;
  const warnThresholdMs = Math.max(maxMs - warnBeforeMs, maxMs * 0.5);

  const tick = async () => {
    const { getAllOpenTickets } = await import("../utils/dataStore.js");
    const clientGuildIds = new Set(client.guilds.cache.keys());

    for (const ticket of getAllOpenTickets()) {
      if (!clientGuildIds.has(ticket.guildId)) continue;
      if (
        ticketConfig.autoCloseExemptUntilDecision?.includes(ticket.type) &&
        !ticket.banDecision
      ) {
        continue;
      }

      const last = ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt;
      const idleMs = Date.now() - new Date(last).getTime();

      const guild =
        client.guilds.cache.get(ticket.guildId) ??
        (await client.guilds.fetch(ticket.guildId).catch(() => null));
      if (!guild) continue;

      const channel =
        guild.channels.cache.get(ticket.channelId) ??
        (await guild.channels.fetch(ticket.channelId).catch(() => null));
      if (!channel || !isTicketChannel(channel)) continue;

      if (idleMs >= warnThresholdMs && idleMs < maxMs && !ticket.inactivityWarnedAt) {
        updateTicketRegistry(ticket.guildId, ticket.channelId, {
          inactivityWarnedAt: new Date().toISOString(),
        });
        const hoursLeft = Math.ceil((maxMs - idleMs) / (60 * 60 * 1000));
        await channel
          .send({
            embeds: [
              createEmbed("warning").setDescription(
                `⏱️ **Inaktivitet** — denne ticket lukkes automatisk om ca. **${hoursLeft} timer** hvis der ikke sker aktivitet.\n\nSkriv en besked for at holde ticketten åben.`
              ),
            ],
          })
          .catch(() => {});
        continue;
      }

      if (idleMs < maxMs) continue;

      const botUser = client.user;
      await channel
        .send({
          embeds: [
            createEmbed("warning").setDescription(
              `⏱️ Ticket lukket automatisk efter **${hours} timer** uden aktivitet.`
            ),
          ],
        })
        .catch(() => {});

      await finalizeTicketClose(channel, botUser, `Auto-lukket efter ${hours}t inaktivitet`);
    }
  };

  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), 15 * 60_000).unref?.();
}
