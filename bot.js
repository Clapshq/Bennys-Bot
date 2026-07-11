import "dotenv/config";

import { Client, GatewayIntentBits, Events, Partials } from "discord.js";

import { env, validateEnv } from "./core/env.js";

import { rootLogger } from "./core/logger.js";

import { safeRouteInteraction } from "./core/interactionRouter.js";

import { configureBotIdentity } from "./handlers/identityHandler.js";

import { handleMemberJoin, handleMemberLeave, handleMemberBoost } from "./handlers/memberHandler.js";

import { handleMessageModeration } from "./handlers/moderationHandler.js";

import { handlePrefixMessage, handlePrefixSideEffects } from "./handlers/prefixHandler.js";
import { tryAutoScanPriceImages } from "./handlers/partsPriceHandler.js";
import { tryAutoScanPayrollInvoice } from "./handlers/ticketAiHandler.js";

import { handleReactionRoleEvent } from "./handlers/reactionRoleHandler.js";

import { restoreGiveaways } from "./handlers/giveawayHandler.js";

import { startApplicationSweep, handleApplicationDM } from "./handlers/applicationHandler.js";

import {
  startTicketInactiveSweep,
  loadPendingRatingsFromDisk,
  isTicketChannel,
} from "./handlers/ticketHandler.js";
import { touchTicketActivity } from "./utils/dataStore.js";
import { flushAllCachedJson } from "./utils/jsonCache.js";
import { runStartupHealthCheck } from "./core/startupHealth.js";

import { trackMessage, cacheDeletedMessage } from "./handlers/snipeHandler.js";

import { handleAntiNuke } from "./security/antiNuke.js";
import { registerPricePanelAutoRefresh, refreshStoredPricePanel } from "./handlers/pricePanelHandler.js";
import { syncSalaryChannelsToStore } from "./handlers/salaryHandler.js";
import { handlePayrollMessageDelete } from "./handlers/payrollMessageHandler.js";
import { startPayrollBackfillOnReady } from "./handlers/payrollBackfill.js";
import { startDashboardSync, requestDashboardSync } from "./services/dashboardSync.js";
import { startDashboardCommandProcessor } from "./services/dashboardCommands.js";
import { getDashboardTranscriptWarnings, canPublishTranscripts } from "./services/dashboardStore.js";
import { deploySlashCommandsOnStartup } from "./core/startupDeploy.js";



async function main() {
const validation = validateEnv();

if (!validation.ok) {

  for (const err of validation.errors) rootLogger.warn(err);

}



if (!env.token) {

  rootLogger.error("Mangler DISCORD_TOKEN i .env");

  process.exit(1);

}

await deploySlashCommandsOnStartup();

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildModeration,

    GatewayIntentBits.GuildMessageReactions,

    GatewayIntentBits.DirectMessages,

    ...(env.memberIntent ? [GatewayIntentBits.GuildMembers] : []),

    ...(env.messageContent ? [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] : []),

  ],

  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],

});



client.once(Events.ClientReady, async (c) => {

  await configureBotIdentity(c);

  restoreGiveaways(c);

  startApplicationSweep(c);

  loadPendingRatingsFromDisk();

  startTicketInactiveSweep(c);

  registerPricePanelAutoRefresh(c);
  for (const guild of c.guilds.cache.values()) {
    refreshStoredPricePanel(guild).catch(() => {});
    const synced = syncSalaryChannelsToStore(guild);
    if (synced > 0) rootLogger.info(`[payroll] Synkroniserede ${synced} løn-kanaler`, { guild: guild.id });
  }

  startDashboardSync(c);
  startDashboardCommandProcessor(c);
  startPayrollBackfillOnReady(c);

  if (env.dashboardEnabled) {
    for (const w of getDashboardTranscriptWarnings()) rootLogger.warn(`[dashboard] ${w}`);
    if (canPublishTranscripts()) {
      rootLogger.info("[dashboard] Online transcript-links aktive", { url: env.dashboardAppUrl });
    }
  }

  const health = runStartupHealthCheck(c);
  for (const w of health) rootLogger.warn(`[health] ${w}`);

  rootLogger.info(`Benny's bot online (build: løn/support)`, {

    guilds: c.guilds.cache.size,

    moderation: env.moderation,

    security: env.security,

  });



  if (!env.messageContent) {

    rootLogger.warn("MESSAGE_CONTENT slået fra — prefix-kommandoer og automoderation deaktiveret");

  }

  if (env.security && !env.memberIntent) {

    rootLogger.warn("MEMBER_INTENT slået fra — anti-raid deaktiveret");

  }

});



client.on(Events.GuildMemberAdd, (member) => {

  if (env.memberIntent) handleMemberJoin(member);

});



client.on(Events.GuildMemberRemove, (member) => {

  if (env.memberIntent) handleMemberLeave(member);

});



client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {

  if (env.memberIntent) handleMemberBoost(oldMember, newMember);

});



client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (!message.guild) {
    if (await handleApplicationDM(message)) return;
    return;
  }

  if (isTicketChannel(message.channel)) {
    touchTicketActivity(message.guild.id, message.channel.id);
    requestDashboardSync(message.client);
  }

  trackMessage(message);



  const handled = await handlePrefixMessage(message);

  if (handled) return;

  if (await tryAutoScanPriceImages(message)) return;

  if (await tryAutoScanPayrollInvoice(message)) return;



  await handlePrefixSideEffects(message);



  if (env.moderation) handleMessageModeration(message);

});



client.on(Events.MessageDelete, async (message) => {
  cacheDeletedMessage(message);
  await handlePayrollMessageDelete(message).catch(() => {});
});



client.on(Events.MessageReactionAdd, (reaction, user) => {

  handleReactionRoleEvent(reaction, user, true);

});



client.on(Events.MessageReactionRemove, (reaction, user) => {

  handleReactionRoleEvent(reaction, user, false);

});



client.on(Events.InteractionCreate, (interaction) => safeRouteInteraction(interaction));



if (env.security) {

  client.on(Events.ChannelDelete, (channel) => {

    if (channel.guild) handleAntiNuke(channel.guild, "channelDelete", channel.name);

  });



  client.on(Events.GuildRoleDelete, (role) => {

    handleAntiNuke(role.guild, "roleDelete", role.name);

  });



  client.on(Events.GuildBanAdd, (ban) => {

    handleAntiNuke(ban.guild, "guildBanAdd", ban.user.tag);

  });

}



process.on("SIGINT", () => {
  flushAllCachedJson();
  process.exit(0);
});

process.on("SIGTERM", () => {
  flushAllCachedJson();
  process.exit(0);
});

process.on("unhandledRejection", (err) => rootLogger.error("Unhandled rejection", { error: String(err) }));

process.on("uncaughtException", (err) => rootLogger.error("Uncaught exception", { error: String(err) }));

await client.login(env.token);
}

main().catch((err) => {
  rootLogger.error("Bot opstart fejlede", { error: String(err) });
  process.exit(1);
});

