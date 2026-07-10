import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import {
  modKick,
  modBan,
  modUnban,
  modMute,
  modUnmute,
  modWarn,
  modClearWarns,
  modAddWord,
  modRemoveWord,
  modListWords,
  modSlowmode,
  modLock,
  modUnlock,
  modSoftban,
  modSetNick,
  modGetHistory,
  modLookupCase,
  modAddNote,
  getWarnings,
  parseDuration,
  formatDuration,
} from "../handlers/manualModerationHandler.js";
import { invalidateWordCache } from "../handlers/moderationHandler.js";

const modPerms = PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.KickMembers;

function userOpt(name = "bruger", desc = "Medlemmet") {
  return (opt) => opt.setName(name).setDescription(desc).setRequired(true);
}

function reasonOpt(required = false) {
  return (opt) => opt.setName("grund").setDescription("Grund").setRequired(required).setMaxLength(500);
}

export const modCommand = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderations-kommandoer for Benny's staff")
    .setDefaultMemberPermissions(modPerms)
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Kick et medlem fra serveren")
        .addUserOption(userOpt())
        .addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Ban et medlem")
        .addUserOption(userOpt())
        .addStringOption(reasonOpt())
        .addIntegerOption((opt) =>
          opt.setName("slet_beskeder").setDescription("Slet beskeder fra de sidste X dage (0-7)").setMinValue(0).setMaxValue(7)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unban")
        .setDescription("Ophæv ban på bruger-ID")
        .addStringOption((opt) => opt.setName("bruger_id").setDescription("Discord bruger-ID").setRequired(true))
        .addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("mute")
        .setDescription("Timeout / mute et medlem")
        .addUserOption(userOpt())
        .addStringOption((opt) =>
          opt.setName("varighed").setDescription("Fx 10m, 1h, 1d, 1w").setRequired(true)
        )
        .addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("unmute")
        .setDescription("Fjern timeout fra medlem")
        .addUserOption(userOpt())
        .addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("warn")
        .setDescription("Giv en advarsel (3 advarsler = auto-mute 1 time)")
        .addUserOption(userOpt())
        .addStringOption(reasonOpt(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("warnings")
        .setDescription("Se advarsler for et medlem")
        .addUserOption(userOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("clearwarns")
        .setDescription("Slet alle advarsler for et medlem")
        .addUserOption(userOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("addword")
        .setDescription("Tilføj ord til auto-filter")
        .addStringOption((opt) => opt.setName("ord").setDescription("Ord der skal filtreres").setRequired(true).setMaxLength(64))
    )
    .addSubcommand((sub) =>
      sub
        .setName("removeword")
        .setDescription("Fjern ord fra auto-filter (kun dynamiske ord)")
        .addStringOption((opt) => opt.setName("ord").setDescription("Ord der skal fjernes").setRequired(true).setMaxLength(64))
    )
    .addSubcommand((sub) => sub.setName("words").setDescription("Vis antal filtrerede ord"))
    .addSubcommand((sub) =>
      sub
        .setName("slowmode")
        .setDescription("Sæt slowmode i denne kanal")
        .addIntegerOption((opt) =>
          opt.setName("sekunder").setDescription("0 = slå fra").setRequired(true).setMinValue(0).setMaxValue(21600)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("lock").setDescription("Lås kanalen — ingen kan skrive").addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub.setName("unlock").setDescription("Lås kanalen op").addStringOption(reasonOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("history")
        .setDescription("Fuld moderations-historik for et medlem")
        .addUserOption(userOpt())
    )
    .addSubcommand((sub) =>
      sub
        .setName("case")
        .setDescription("Slå en case op via ID")
        .addIntegerOption((opt) => opt.setName("id").setDescription("Case ID").setRequired(true).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub
        .setName("note")
        .setDescription("Tilføj intern staff-note på medlem")
        .addUserOption(userOpt())
        .addStringOption((opt) => opt.setName("note").setDescription("Note").setRequired(true).setMaxLength(1000))
    )
    .addSubcommand((sub) =>
      sub
        .setName("softban")
        .setDescription("Ban i 24 timer (auto unban)")
        .addUserOption(userOpt())
        .addStringOption(reasonOpt(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("nick")
        .setDescription("Ændr et medlems nickname")
        .addUserOption(userOpt())
        .addStringOption((opt) => opt.setName("navn").setDescription("Nyt nickname (tom = reset)").setRequired(false).setMaxLength(32))
        .addStringOption(reasonOpt())
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const reason = interaction.options.getString("grund") ?? "Ingen grund angivet";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      switch (sub) {
        case "kick": {
          const user = interaction.options.getUser("bruger");
          const result = await modKick(guild, interaction.user, user, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `👢 **${user.tag}** er blevet kick'et.\n📝 ${reason}` });
        }
        case "ban": {
          const user = interaction.options.getUser("bruger");
          const days = interaction.options.getInteger("slet_beskeder") ?? 0;
          const result = await modBan(guild, interaction.user, user, reason, days);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `🔨 **${user.tag}** er banned.\n📝 ${reason}` });
        }
        case "unban": {
          const userId = interaction.options.getString("bruger_id");
          await modUnban(guild, interaction.user, userId, reason);
          return interaction.editReply({ content: `✅ Ban ophævet for \`${userId}\`.` });
        }
        case "mute": {
          const user = interaction.options.getUser("bruger");
          const durStr = interaction.options.getString("varighed");
          const ms = parseDuration(durStr);
          if (!ms) return interaction.editReply({ content: "❌ Ugyldig varighed. Brug fx `10m`, `1h`, `1d`, `1w`." });
          const result = await modMute(guild, interaction.user, user, ms, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `🔇 **${user.tag}** muted i **${formatDuration(ms)}**.\n📝 ${reason}` });
        }
        case "unmute": {
          const user = interaction.options.getUser("bruger");
          const result = await modUnmute(guild, interaction.user, user, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `🔊 Timeout fjernet fra **${user.tag}**.` });
        }
        case "warn": {
          const user = interaction.options.getUser("bruger");
          const result = await modWarn(guild, interaction.user, user, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          let msg = `⚠️ Advarsel givet til **${user.tag}** (total: **${result.total}**).\n📝 ${reason}`;
          if (result.autoMuted) msg += "\n\n🔇 **Auto-mute:** 3 advarsler nået — muted i 1 time.";
          return interaction.editReply({ content: msg });
        }
        case "warnings": {
          const user = interaction.options.getUser("bruger");
          const warns = getWarnings(guild.id, user.id);
          if (!warns.length) return interaction.editReply({ content: `✅ **${user.tag}** har ingen advarsler.` });
          const embed = new EmbedBuilder()
            .setTitle(`⚠️ Advarsler — ${user.tag}`)
            .setColor(0xe67e22)
            .setDescription(
              warns
                .map(
                  (w) =>
                    `**#${w.id}** · <t:${Math.floor(new Date(w.date).getTime() / 1000)}:f>\n` +
                    `Mod: ${w.moderatorTag}\n` +
                    `Grund: ${w.reason}`
                )
                .join("\n\n")
            );
          return interaction.editReply({ embeds: [embed] });
        }
        case "clearwarns": {
          const user = interaction.options.getUser("bruger");
          const result = await modClearWarns(guild, interaction.user, user);
          return interaction.editReply({ content: `🗑️ Slettede **${result.count}** advarsler for **${user.tag}**.` });
        }
        case "addword": {
          const word = interaction.options.getString("ord");
          const result = await modAddWord(word);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          invalidateWordCache();
          return interaction.editReply({ content: `✅ **${result.word}** tilføjet til filter.` });
        }
        case "removeword": {
          const word = interaction.options.getString("ord");
          const result = await modRemoveWord(word);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          invalidateWordCache();
          return interaction.editReply({ content: `✅ **${result.word}** fjernet fra dynamisk filter.` });
        }
        case "words": {
          const { base, extra, total } = modListWords();
          return interaction.editReply({
            content: `📋 **${total}** ord filtreres (${base.length} standard + ${extra.length} tilføjet via \`/mod addword\`).`,
          });
        }
        case "slowmode": {
          const sec = interaction.options.getInteger("sekunder");
          await modSlowmode(interaction.channel, sec, interaction.user);
          return interaction.editReply({
            content: sec ? `🐢 Slowmode sat til **${sec}** sekunder.` : "✅ Slowmode slået fra.",
          });
        }
        case "lock": {
          await modLock(interaction.channel, interaction.user, reason);
          return interaction.editReply({ content: "🔒 Kanalen er låst." });
        }
        case "unlock": {
          await modUnlock(interaction.channel, interaction.user, reason);
          return interaction.editReply({ content: "🔓 Kanalen er låst op." });
        }
        case "history": {
          const user = interaction.options.getUser("bruger");
          const { warnings, cases, notes } = modGetHistory(guild.id, user.id);
          const embed = new EmbedBuilder()
            .setTitle(`📋 Historik — ${user.tag}`)
            .setColor(0xe67e22)
            .addFields(
              { name: "Advarsler", value: warnings.length ? warnings.map((w) => `#${w.id}: ${w.reason}`).join("\n").slice(0, 1024) : "Ingen", inline: false },
              { name: "Cases", value: cases.length ? cases.map((c) => `#${c.id} ${c.action}: ${c.reason}`).join("\n").slice(0, 1024) : "Ingen", inline: false },
              { name: "Staff notes", value: notes.length ? notes.map((n) => `#${n.id}: ${n.note}`).join("\n").slice(0, 1024) : "Ingen", inline: false }
            );
          return interaction.editReply({ embeds: [embed] });
        }
        case "case": {
          const id = interaction.options.getInteger("id");
          const c = modLookupCase(guild.id, id);
          if (!c) return interaction.editReply({ content: `❌ Case #${id} ikke fundet.` });
          const embed = new EmbedBuilder()
            .setTitle(`Case #${c.id}`)
            .setColor(0x5865f2)
            .addFields(
              { name: "Action", value: c.action, inline: true },
              { name: "Mål", value: c.targetTag ?? c.targetId ?? "?", inline: true },
              { name: "Moderator", value: c.moderatorTag ?? "?", inline: true },
              { name: "Grund", value: c.reason ?? "?", inline: false },
              { name: "Tid", value: c.timestamp ?? "?", inline: false }
            );
          return interaction.editReply({ embeds: [embed] });
        }
        case "note": {
          const user = interaction.options.getUser("bruger");
          const note = interaction.options.getString("note");
          await modAddNote(guild, interaction.user, user, note);
          return interaction.editReply({ content: `📌 Note tilføjet på **${user.tag}**.` });
        }
        case "softban": {
          const user = interaction.options.getUser("bruger");
          const result = await modSoftban(guild, interaction.user, user, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `🔨 **${user.tag}** softbannet i 24 timer.` });
        }
        case "nick": {
          const user = interaction.options.getUser("bruger");
          const navn = interaction.options.getString("navn");
          const result = await modSetNick(guild, interaction.user, user, navn, reason);
          if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
          return interaction.editReply({ content: `✏️ Nickname opdateret for **${user.tag}**.` });
        }
        default:
          return interaction.editReply({ content: "Ukendt underkommando." });
      }
    } catch (err) {
      console.error("[mod]", err);
      return interaction.editReply({ content: `❌ Fejl: ${err.message}` });
    }
  },
};
