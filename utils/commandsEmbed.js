import { createEmbed } from "./brand.js";
import { DEFAULT_PREFIX } from "./guildMessageStore.js";

export function buildCommandsEmbeds() {
  const overview = createEmbed("discord")
    .setTitle("📋 Benny's Bot — Kommandooversigt")
    .setDescription(
      "Prefix-bot i **Bleed-stil** — fulde kommando-navne med `,`\n\n" +
        "**Prefix:** `" +
        DEFAULT_PREFIX +
        "` — skift med `,prefix set`\n" +
        "**Slash:** `/` — Discord kommando-menu\n\n" +
        "Skriv `,help` eller `/help` for denne liste."
    )
    .addFields(
      {
        name: "👥 For medlemmer",
        value:
          "• **#bestillinger** · **#kontakt** · **#ansøgning**\n" +
          "• **#reaktions-roller** — dropdown roller",
        inline: false,
      },
      {
        name: "🔑 Staff",
        value: "Prefix-kommandoer nedenfor + `/ticket` + `/mod`",
        inline: false,
      }
    );

  const prefix = createEmbed("accent")
    .setTitle("⚡ Prefix-kommandoer (Bleed-stil)")
    .addFields(
      {
        name: "📋 Embeds",
        value:
          "`,embed {embed}$v{title: Titel}$v{description: Tekst}$v{color: #e67e22}`\n" +
          "`,embed help` · `,help`",
        inline: false,
      },
      {
        name: "🎭 Roller",
        value:
          "`,reactionrole add/remove/list/removeall/reset`\n" +
          "`,buttonrole add link rolle style emoji label`\n" +
          "Styles: green · blurple · gray · red",
        inline: false,
      },
      {
        name: "👋 Systembeskeder",
        value:
          "`,welcome add #kanal besked`\n" +
          "`,welcome remove/view/list #kanal`\n" +
          "`,goodbye` · `,boost` — samme syntaks",
        inline: false,
      },
      {
        name: "🧵 Tråde · community",
        value:
          "`,tl` / `,tu` — lås/op i tråd\n" +
          "`,poll` · `,giveaway` · `,autoresponder add trigger, svar`\n" +
          "`,reaction add` · `,sticky` · `,role` · `,nickname` · `,say` · `,snipe`",
        inline: false,
      },
      {
        name: "🤖 AI (,ai)",
        value:
          "Staff & kunder (tickets): spørg kun om **Benny's** — priser, ydelser, regler\n" +
          "`,ai tilbud …` · `#💰-løn-[navn]`: upload faktura → **lønbeløb**",
        inline: false,
      },
      {
        name: "💲 JG-priser (staff)",
        value:
          "`,pris panel` — interaktiv pris-editor (ledelse)\n" +
          "`,pris opdatering` + billede (ledelse) · `,pris idag` · `,tilbud`",
        inline: false,
      },
      {
        name: "⚙️ Server · ledelse",
        value:
          "`,prefix set` · `,prefix reset` · `,prefix`\n" +
          "`,panels refresh` — opdater paneler uden /setup (ledelse)\n" +
          "`,panels status` · `,panels help`\n" +
          "`,profil avatar/banner/beskrivelse/logo/vis` · `/botprofil` — bot-profil",
        inline: false,
      }
    );

  const modTicket = createEmbed("error")
    .setTitle("🛡️ /mod & /ticket")
    .addFields(
      {
        name: "/mod",
        value: "`kick` · `ban` · `mute` · `warn` · `nick` · `lock` · `slowmode` · m.fl.\n`,nickname <id> <navn>`",
        inline: true,
      },
      {
        name: "/ticket",
        value: "`close` · `transcript` · `add` · `remove` · m.fl.",
        inline: true,
      },
      {
        name: "/purge",
        value: "Slet 1–100 beskeder",
        inline: false,
      }
    );

  const slashRest = createEmbed("blue")
    .setTitle("⚙️ Slash & variabler")
    .addFields(
      { name: "/embed", value: "`create` · `preview` · `list` · `copy` · `delete`", inline: true },
      { name: "/thread", value: "`lock` · `unlock` · `add`", inline: true },
      { name: "/stats", value: "`type`: tickets · mod · security · all", inline: true },
      { name: "/lønopret", value: "Personlig løn-kanal (ledelse)", inline: true },
      { name: "/roller sync", value: "Opdater roller uden /setup", inline: true },
      { name: "/setup", value: "Genopbyg server (Administrator)", inline: true },
      {
        name: "Bleed-variabler",
        value: "`{user}` `{user.mention}` `{guild.name}` `{guild.count}`",
        inline: false,
      }
    )
    .setFooter({ text: "Benny's · Bleed-kompatibel prefix" })
    .setTimestamp();

  return [overview, prefix, modTicket, slashRest];
}
