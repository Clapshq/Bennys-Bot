import { ChannelType, PermissionFlagsBits } from "discord.js";
import {
  getAllCategoryConfigs,
  buildChannelPermissions,
  buildCategoryPermissions,
} from "../config/channels.js";
import {
  informationEmbed,
  rolesOverviewEmbed,
  channelPermissionsEmbed,
  applicationEmbed,
  contactEmbed,
  reactionRolesEmbed,
  ordersEmbed,
  pricesEmbeds,
  chatRulesEmbed,
  modLogIntroEmbed,
  ticketLogIntroEmbed,
  ledelsePanelEmbed,
  moderationEmbed,
  reviewsForumGuidelines,
  payrollEmbed,
  staffGuidelinesEmbed,
  salarySystemEmbed,
  absenceTicketEmbed,
  applicationsReviewEmbed,
} from "../utils/embeds.js";
import { setupRoles } from "./rolesHandler.js";
import { buildRolePermissionIds } from "../config/roles.js";
import { createAllStaffSalaryChannels, SALARY_CHANNEL_PREFIX } from "./salaryHandler.js";
import {
  contactTicketPanelComponents,
  orderPanelComponents,
  applicationPanelComponents,
  absencePanelComponents,
  roleSelectMenu,
} from "../utils/components.js";
import { TICKET_CATEGORY } from "./ticketHandler.js";
import { recordPanelMessage } from "../core/startupHealth.js";

async function createPersonalSalaryChannels(guild, roles, onProgress) {
  onProgress?.("Opretter personlige løn-kanaler...");
  return createAllStaffSalaryChannels(guild, roles);
}

async function wipeBennyStructure(guild, onProgress) {
  onProgress?.("Sletter eksisterende Benny's kanaler...");

  const categoryNames = getAllCategoryConfigs(true, true).map((c) => c.name);
  categoryNames.push(TICKET_CATEGORY);

  for (const ch of guild.channels.cache.values()) {
    const parent = ch.parentId ? guild.channels.cache.get(ch.parentId) : null;
    const inBennyCategory = parent && categoryNames.includes(parent.name);
    const isSalaryChannel = ch.name?.startsWith(SALARY_CHANNEL_PREFIX);
    const isTicketChannel =
      ch.name?.startsWith("bestilling-") ||
      ch.name?.startsWith("henvendelse-") ||
      ch.name?.startsWith("ticket-");

    if (inBennyCategory || isSalaryChannel || isTicketChannel) {
      await ch.delete("Benny's setup — genopbygning").catch(() => {});
      await sleep(150);
    }
  }
}

async function findOrCreateCategory(guild, name, permissionOverwrites = []) {
  let existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name);
  if (existing) {
    if (permissionOverwrites.length) {
      await existing.edit({ permissionOverwrites }).catch(() => {});
    }
    return existing;
  }
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
  });
}

async function findOrCreateChannel(guild, category, config, permissionOverwrites) {
  let existing = guild.channels.cache.find(
    (c) => c.parentId === category.id && c.name === config.name
  );

  const options = {
    name: config.name,
    type: config.type,
    parent: category.id,
    topic: config.topic,
    permissionOverwrites,
  };

  if (existing) {
    await existing.edit({ topic: config.topic, permissionOverwrites, parent: category.id }).catch(() => {});
    return existing;
  }

  try {
    return await guild.channels.create(options);
  } catch (err) {
    if (config.type === ChannelType.GuildForum) {
      console.warn(`Forum fejlede (${config.name}), opretter text:`, err.message);
      return guild.channels.create({ ...options, type: ChannelType.GuildText });
    }
    throw err;
  }
}

async function sendPanelMessage(channel, payload, { forumThreadName = "📋 Info" } = {}) {
  if (channel.type === ChannelType.GuildForum) {
    return channel.threads.create({
      name: forumThreadName.slice(0, 100),
      message: payload,
    });
  }
  return channel.send(payload);
}

async function postChannelContent(channel, force = false) {
  const panels = {
    "📣-information": async () => {
      const intro = await channel.send({ embeds: [informationEmbed()] });
      await channel.send({ embeds: [rolesOverviewEmbed(), channelPermissionsEmbed()] });
      return intro;
    },
    "📋-ansøgning": () =>
      channel.send({ embeds: [applicationEmbed()], components: [applicationPanelComponents()] }),
    "📞-kontakt": () =>
      channel.send({ embeds: [contactEmbed()], components: contactTicketPanelComponents() }),
    "⏳-reaktions-roller": () =>
      channel.send({
        embeds: [reactionRolesEmbed()],
        components: [roleSelectMenu()],
      }),
    "📋-bestillinger": () =>
      channel.send({ embeds: [ordersEmbed()], components: orderPanelComponents() }),
    "💲-priser": async () => {
      const sent = [];
      for (const embed of pricesEmbeds()) {
        sent.push(await channel.send({ embeds: [embed] }));
      }
      return sent[0];
    },
    "👨-chat": () => channel.send({ embeds: [chatRulesEmbed()] }),
    "💬-anmeldelser": () =>
      sendPanelMessage(channel, { embeds: [reviewsForumGuidelines()] }, {
        forumThreadName: "📋 Læs før du anmelder",
      }),
    "🔧-ansatte-chat": () => channel.send({ embeds: [staffGuidelinesEmbed()] }),
    "📋-fravær": () =>
      channel.send({ embeds: [absenceTicketEmbed()], components: [absencePanelComponents()] }),
    "📦-ordrer-og-løn": () => channel.send({ embeds: [payrollEmbed()] }),
    "📋-mod-log": () => channel.send({ embeds: [modLogIntroEmbed()] }),
    "📜-ticket-logs": () => channel.send({ embeds: [ticketLogIntroEmbed()] }),
    "👔-ledelse": () =>
      channel.send({ embeds: [ledelsePanelEmbed(), moderationEmbed()] }),
    "📋-ansøgninger": () => channel.send({ embeds: [applicationsReviewEmbed()] }),
    "📋-løn-system": () => channel.send({ embeds: [salarySystemEmbed()] }),
  };

  const poster = panels[channel.name];
  if (!poster) return null;

  if (!force) {
    if (channel.type === ChannelType.GuildForum) {
      const active = await channel.threads.fetchActive().catch(() => null);
      const existing = active?.threads?.find((t) => t.ownerId === channel.client.user.id);
      if (existing) return existing;
    } else {
      const recent = await channel.messages.fetch({ limit: 5 }).catch(() => null);
      const botMessages = recent?.filter((m) => m.author.id === channel.client.user.id);
      if (botMessages?.size > 0) return botMessages.first();
    }
  }

  return poster();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runFullSetup(guild, options = {}) {
  const { includeStaff = true, fullReset = true, onProgress } = options;
  const results = {
    categories: 0,
    channels: 0,
    messages: 0,
    roles: 0,
    rolesAssigned: 0,
    salaryChannels: 0,
    errors: [],
  };

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.Administrator)) {
    throw new Error("Botten mangler Administrator — giv den admin og prøv igen.");
  }

  if (fullReset) {
    await wipeBennyStructure(guild, onProgress);
    await guild.channels.fetch().catch(() => {});
  }

  const { roles, results: roleResults } = await setupRoles(guild, onProgress);
  results.roles = Object.keys(roles).length;
  results.rolesAssigned = roleResults.assigned;

  const roleIds = buildRolePermissionIds(roles);
  const permissionMap = buildChannelPermissions(guild, roleIds);

  const allCategories = getAllCategoryConfigs(includeStaff, includeStaff);

  for (const catConfig of allCategories) {
    onProgress?.(`Opretter kategori: ${catConfig.name}...`);

    try {
      const categoryPerms = buildCategoryPermissions(guild, catConfig.name, roleIds);
      const category = await findOrCreateCategory(guild, catConfig.name, categoryPerms);
      results.categories++;

      for (const chConfig of catConfig.channels) {
        onProgress?.(`Opretter kanal: ${chConfig.name}...`);

        try {
          const overwrites = permissionMap[chConfig.name] ?? [];
          const channel = await findOrCreateChannel(guild, category, chConfig, overwrites);
          results.channels++;

          onProgress?.(`Poster panel: ${chConfig.name}...`);
          const posted = await postChannelContent(channel, true);
          if (posted) {
            results.messages++;
            recordPanelMessage(guild.id, channel.name, channel.id, posted);
          }
        } catch (err) {
          console.error(`Kanal fejl (${chConfig.name}):`, err);
          results.errors.push(`${chConfig.name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`Kategori fejl (${catConfig.name}):`, err);
      results.errors.push(`${catConfig.name}: ${err.message}`);
    }
  }

  if (includeStaff) {
    try {
      onProgress?.("Opretter ticket-kategori...");
      const { ensureTicketCategory } = await import("./ticketHandler.js");
      await ensureTicketCategory(guild);

      results.salaryChannels = await createPersonalSalaryChannels(guild, roles, onProgress);
      results.channels += results.salaryChannels;
    } catch (err) {
      console.error("Løn-kanal fejl:", err);
      results.errors.push(`Løn-kanaler: ${err.message}`);
    }
  }

  return { results, roles };
}

export { setupCompleteEmbed, welcomeAnnouncementEmbed } from "../utils/embeds.js";
