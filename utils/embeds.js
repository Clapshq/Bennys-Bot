import { mechanicApplication } from "../config/applications.js";
import { getTicketCategory, ticketConfig } from "../config/tickets.js";
import { company } from "../config/company.js";
import { rolesConfig, getLedelseRoleNames } from "../config/roles.js";
import { permissionSummary } from "../config/channels.js";
import { brand } from "../config/brand.js";
import { createEmbed, headerBlock, fieldBlock, stars } from "./brand.js";

// ─── Information ────────────────────────────────────────────────────────────

export function informationEmbed() {
  return createEmbed("dark")
    .setTitle("Benny's Original Motor Works")
    .setDescription(
      `Velkommen til **Benny's** — dit værksted på serveren.\n\n` +
        `📍 ${company.location}\n\n` +
        `🔧 Reparation · Tuning · Styling · Bugsering\n` +
        `🏁 Biltræf & mekaniker-RP for alle borgere\n\n` +
        `➡️ **#priser** · **#bestillinger** · **#ansøgning** · **#reaktions-roller** · **#kontakt**`
    );
}

export function workshopStatusEmbed() {
  return createEmbed("success")
    .setTitle("🟢 Værkstedet")
    .setDescription(
      headerBlock("Status", "Opdateres af ledelsen") +
        `\n\n📍 ${company.location}\n\n` +
        "*Ledelse kan poste åben/lukket-beskeder her, eller bruge en status-bot.*"
    )
}

// ─── Ansøgning ──────────────────────────────────────────────────────────────

export function applicationEmbed() {
  return createEmbed("blue")
    .setTitle("Bliv en del af holdet")
    .setDescription(
      headerBlock("📋 Mekaniker-ansøgning", "Vi søger dedikerede RP-mekanikere") +
        "\n\n" +
        "Hele vores hold har erfaring som mekanikere — vi ved hvad godt RP kræver.\n\n" +
        fieldBlock("📝", "7 spørgsmål i DM", mechanicApplication.questions.map((q, i) => `${i + 1}. ${q}`)) +
        "\n\n" +
        fieldBlock("✅", "Vi forventer", [
          "Respektfuldt RP overfor kunder og kollegaer",
          "Aktiv deltagelse når du er på vagt",
          "Overholdelse af serverens regler",
        ]) +
        "\n\n" +
        fieldBlock("📋", "Sådan ansøger du", [
          "Klik **Start ansøgning** nedenfor",
          "Botten sender dig **7 spørgsmål i DM** — svar ét ad gangen",
          "Gennemse og skriv **bekræft** for at sende til ledelsen",
          "Du har **3 timer** — brug mindst **5 minutter** på dine svar",
          "Ved godkendelse oprettes en interview-ticket automatisk",
        ])
    );
}

export function applicationsReviewEmbed() {
  return createEmbed("discord")
    .setTitle("Mekaniker-ansøgninger")
    .setDescription(
      "Indkomne ansøgninger fra DM-flowet vises **herunder** (nyeste øverst).\n\n" +
        "✅ **Godkend** — opretter interview-ticket + tillykke-DM\n" +
        "❌ **Afvis** — DM med grund (30 min ventetid før ny ansøgning)\n\n" +
        "💡 Opdater paneler uden /setup: `,panels refresh`"
    );
}

// ─── Kontakt ─────────────────────────────────────────────────────────────────

export function contactEmbed() {
  return createEmbed("success")
    .setTitle("Kontakt Benny's")
    .setDescription(
      headerBlock("📞 Support & henvendelser", "Vælg type i menuen — vi opretter en privat ticket") +
        "\n\n" +
        fieldBlock("📋", "Hvad kan du vælge?", [
          "💬 **Generelt support** — spørgsmål, hjælp eller andet",
          "🚫 **Banlyst — søg adgang** — ansøg om at komme tilbage til værkstedet",
          "😤 **Klage over service** — utilfreds med en oplevelse (behandles af ledelsen)",
          "💲 **Prisoverslag** — få et tilbud inden du booker",
        ]) +
        "\n\n" +
        fieldBlock("🔧", "Bestillinger", "Reparation & tuning → **#bestillinger**") +
        "\n\n" +
        fieldBlock("📋", "Job som mekaniker", "Ansøg via **#ansøgning** (DM-flow)") +
        "\n\n" +
        fieldBlock("💲", "Priser", "Fuld prisliste → **#priser**") +
        `\n\n📍 ${company.location}`
    );
}

// ─── Roller ───────────────────────────────────────────────────────────────────

export function rolesOverviewEmbed() {
  const defaultRole = rolesConfig.roles.find((r) => r.assignOnJoin);
  const optional = rolesConfig.roles.filter((r) => !r.assignOnJoin && !r.staff);
  const leadership = rolesConfig.roles.filter((r) => r.ledelse);
  const mechanics = rolesConfig.roles.filter((r) => r.staff && !r.ledelse);

  const permLine = (r) => {
    if (r.ledelse) return "Kick/ban, moderation, kanaler & ledelses-kanaler";
    if (r.name === "Mekaniker") return "Interne kanaler, slet beskeder, tickets";
    if (r.staff) return "Interne kanaler & tickets (ingen moderation)";
    if (r.assignOnJoin) return "Offentlige kanaler — info-kanaler kun læse";
    return "Ping-rolle — ingen ekstra kanal-adgang";
  };

  return createEmbed("discord")
    .setTitle("Server-roller")
    .setDescription(
      headerBlock("👥 Roller hos Benny's", "Oversigt over alle roller og adgang") +
        "\n\n" +
        fieldBlock(defaultRole.emoji, `Standard — \`${defaultRole.name}\``, [
          defaultRole.description,
          "Alle medlemmer får denne rolle automatisk når de joiner",
          `Adgang: ${permLine(defaultRole)}`,
        ]) +
        "\n\n" +
        fieldBlock(
          "🔔",
          "Valgfrie roller",
          optional.map((r) => `${r.emoji} \`${r.name}\` — ${r.description}\n└ ${permLine(r)}`)
        ) +
        "\n\n" +
        fieldBlock(
          "👑",
          "Ledelse & ejere",
          leadership.map((r) => `${r.emoji} \`${r.name}\` — ${r.description}\n└ ${permLine(r)}`)
        ) +
        "\n\n" +
        fieldBlock(
          "🛠️",
          "Mekanikere",
          mechanics.map((r) => `${r.emoji} \`${r.name}\` — ${r.description}\n└ ${permLine(r)}`)
        ) +
        "\n\n" +
        fieldBlock("⚙️", "Auto-rolle", [
          "Alle nye medlemmer får automatisk `Kunde` når de joiner",
          "Kræver Server Members Intent i Developer Portal",
        ])
    );
}

export function channelPermissionsEmbed() {
  const readOnly = permissionSummary
    .filter((p) => p.kunde.includes("Kun læse"))
    .map((p) => `\`${p.channel}\``)
    .join(" · ");

  const canWrite = permissionSummary
    .filter((p) => p.kunde.includes("Kan skrive") || p.kunde.includes("tråde"))
    .map((p) => `\`${p.channel}\``)
    .join(" · ");

  return createEmbed("gold")
    .setTitle("Kanal-adgang")
    .setDescription(
      headerBlock("🔒 Permissions", "Hvem kan gøre hvad") +
        "\n\n" +
        fieldBlock("👀", "Kun læse (ingen beskeder)", readOnly.split(" · ")) +
        "\n\n" +
        fieldBlock("✍️", "Kan skrive / oprette tråde", canWrite.split(" · ")) +
        "\n\n" +
        fieldBlock("🛠️", "Staff (Lærling & Mekaniker)", [
          "Kan skrive i info-kanaler og se medarbejder-kanaler",
          "Mekaniker kan slette beskeder (`Manage Messages`)",
          "Lærling har ingen kick/ban/moderation",
        ]) +
        "\n\n" +
        fieldBlock("👔", "Ledelse (Stifter, Med-ejer & Ledelse)", [
          "Fuld adgang til `#ledelse`, `#ansøgninger` og løn-kanaler",
          "Kick, ban, timeout & kanal-administration",
          `Kun ${getLedelseRoleNames().map((n) => `\`${n}\``).join(", ")}`,
        ])
    )
}

// ─── Reaktions-roller ───────────────────────────────────────────────────────

export function reactionRolesEmbed() {
  const optionalRoles = company.roles.filter((r) => !r.assignOnJoin && !r.staff);
  const roleList = optionalRoles
    .map((r) => `${r.emoji} \`${r.name}\`\n└ ${r.description}`)
    .join("\n\n");

  const kunde = company.roles.find((r) => r.assignOnJoin);

  return createEmbed("discord")
    .setTitle("Vælg dine roller")
    .setDescription(
      headerBlock("🔔 Valgfrie roller", "Tilpas din Benny's-oplevelse") +
        "\n\n" +
        fieldBlock(kunde.emoji, "Allerede tildelt", [
          `\`${kunde.name}\` — ${kunde.description}`,
          "Du får denne automatisk når du joiner serveren",
        ]) +
        "\n\n" +
        roleList +
        "\n\n" +
        "*Vælg roller i menuen nedenfor — vælg igen for at fjerne.*"
    );
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function ticketWelcomeEmbed(type, user, ticketNumber) {
  const cat = getTicketCategory(type);
  const isBan = type === "workshop_ban";

  return createEmbed(isBan ? "warning" : "accent")
    .setTitle(`${cat.emoji} ${cat.label} #${ticketNumber}`)
    .setDescription(
      `Oprettet af ${user}\n${brand.divider}\n\n` +
        `${cat.welcomeHint ?? "En mekaniker vender tilbage hurtigst muligt."}\n\n` +
        fieldBlock("🎫", "Ticket-kontrol", [
          "**Staff note** — intern note (kun staff)",
          isBan ? "**Godkend/Afvis** — kun ledelse & ejere" : null,
          "**Eskaler** — send til ledelse ved behov",
          "**Luk ticket** — transcript + rating i DM",
          "Alle staff kan hjælpe — ingen claim nødvendig",
        ].filter(Boolean)) +
        `\n\n📍 **${company.location}**`
    )
    .setTimestamp();
}

export function ticketClosedEmbed(closedBy, reason) {
  return createEmbed("error")
    .setTitle("Ticket lukket")
    .setDescription(
      `Lukket af ${closedBy}\n` +
        (reason ? `📝 ${reason}\n\n` : "\n") +
        "Transcript sendes til dig via DM.\n\nTak fordi du kontaktede Benny's!"
    )
    .setTimestamp();
}

// ─── Bestillinger ─────────────────────────────────────────────────────────────

export function ordersEmbed() {
  return createEmbed("accent")
    .setTitle("Bestil arbejde hos Benny's")
    .setDescription(
      headerBlock("🔧 Mekaniker-services", "Reparation · Tuning · Styling · Bugsering") +
        "\n\n" +
        fieldBlock("⚡", "Hurtig bestilling", "Udfyld formularen — ticket oprettes automatisk med alle detaljer") +
        "\n\n" +
        fieldBlock("1️⃣", "Kør til værkstedet", company.location) +
        "\n\n" +
        fieldBlock("2️⃣", "Opret bestilling", "Klik **Opret bestilling** eller **Hurtig bestilling**") +
        "\n\n" +
        fieldBlock("3️⃣", "Mekaniker svarer", "Hele staff-holdet kan se ticketten — du får svar i din private kanal")
    )
    .addFields(
      {
        name: "📝 Bestillingsskabelon",
        value:
          "```yaml\n" +
          "Navn: \n" +
          "Nummerplade: \n" +
          "Køretøj: \n" +
          "Ønsket arbejde: \n" +
          "Budget: \n" +
          "Ekstra info: \n" +
          "```",
      }
    )
}

// ─── Priser ───────────────────────────────────────────────────────────────────

export function pricesEmbeds() {
  return company.priceSections.map((section, i) =>
    createEmbed(i === 0 ? "gold" : "dark")
      .setTitle(i === 0 ? "💲 Prisliste — Benny's Original Motor Works" : section.title)
      .setDescription(
        (i === 0
          ? headerBlock("Konkurrencedygtige priser", `Postal ${company.postal} · Benny's Original Motor Works`) + "\n\n"
          : "") + section.lines.join("\n")
      )
      .setTimestamp(i === 0 ? new Date() : undefined)
  );
}

export function pricesEmbed() {
  return pricesEmbeds()[0];
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function chatRulesEmbed() {
  return createEmbed("blue")
    .setTitle("Borgernes chat")
    .setDescription(
      `Hyggelig snak for kunder og borgere.\n\n` +
        fieldBlock("📜", "Regler", [
          "Vær respektfuld — ingen toxicitet eller spam",
          "Ingen upassende sprog eller Discord-invite links",
          "Bestillinger → **#bestillinger** · Support → **#kontakt**",
        ])
    )
}

export function modLogIntroEmbed() {
  return createEmbed("dark")
    .setTitle("📋 Moderations-log")
    .setDescription("Automatiske logs fra automoderation og staff-handlinger vises her.");
}

export function ticketLogIntroEmbed() {
  const hours = ticketConfig.inactiveAutoCloseHours;
  return createEmbed("dark")
    .setTitle("📜 Ticket-logs")
    .setDescription(
      "Transcripts og luknings-logs fra tickets vises her automatisk.\n\n" +
        "• Oprettelse, lukning og interne notes logges\n" +
        `• Inaktive tickets får advarsel — auto-luk efter **${hours} timer** uden aktivitet\n` +
        "• Ban-ansøgninger lukkes **ikke** automatisk før ledelse har taget stilling"
    );
}

export function ledelsePanelEmbed() {
  return createEmbed("error")
    .setTitle("👔 Ledelse & ejere")
    .setDescription(
      headerBlock("Kun for Stifter, Med-ejer & Ledelse", "Moderation, tickets & økonomi") +
        "\n\n" +
        fieldBlock("🎫", "Tickets", [
          "`/ticket close` · `/ticket add` · `/ticket transcript`",
          "`,panels refresh` — opdater paneler uden /setup",
          "Godkend/afvis ban-ansøgninger i ticket-kanalen",
          "Fravær fra medarbejdere → **#fravær**",
          "Mekaniker-ansøgninger → **#ansøgninger**",
          "Logs & transcripts → **#ticket-logs**",
        ]) +
        "\n\n" +
        fieldBlock("💰", "Løn", ["`/lønopret @bruger` — opret personlig løn-kanal"]) +
        "\n\n" +
        fieldBlock("📊", "Statistik", ["`/stats` — tickets, moderation & sikkerhed"]) +
        "\n\n" +
        fieldBlock("📜", "Logs", [
          "Ticket-logs (oprettelse, lukning, notes) → **#ticket-logs**",
          "Moderation & automod → **#mod-log**",
        ])
    )
}

export function moderationEmbed() {
  return createEmbed("discord")
    .setTitle("🛡️ Automoderation & Sikkerhed")
    .setDescription(
      "Benny's kører et **multi-stage filter pipeline** med anti-raid, anti-nuke og case-baseret logging.\n\n" +
        fieldBlock("🚫", "Automod filtrerer", [
          "Upassende ord + dynamisk ordliste (`/mod addword`)",
          "Discord-invite links & mistænkelige URLs",
          "Mention-spam, zalgo/unicode spam, caps & dubletter",
          "5 strikes = auto-timeout 30 min",
        ]) +
        "\n\n" +
        fieldBlock("🔒", "Sikkerhed", [
          "Anti-raid — lockdown ved masse-joins",
          "Anti-nuke — ban ved masse channel/role sletning",
          "Konto-alder check (konfigurerbar)",
        ]) +
        "\n\n" +
        fieldBlock("✅", "Staff-kommandoer", [
          "`/mod kick` · `/mod ban` · `/mod mute` · `/mod warn` · `/mod softban`",
          "`/mod history` · `/mod case` · `/mod note` · `/mod addword`",
          "`/mod lock` · `/purge` · `/stats`",
        ])
    )
}

// ─── Anmeldelser ──────────────────────────────────────────────────────────────

export function reviewsForumGuidelines() {
  return createEmbed("success")
    .setTitle("Del din oplevelse")
    .setDescription(
      headerBlock("💬 Anmeldelser", "Én tråd per besøg — din feedback betyder alt") +
        "\n\n" +
        fieldBlock("📝", "Inkludér gerne", [
          "Hvad du fik lavet på køretøjet",
          "Hvilken mekaniker hjalp dig",
          "Rating fra 1-5 stjerner",
          "Screenshot fra besøget (valgfrit)",
        ]) +
        "\n\n" +
        `Eksempel: ${stars(5)}\n` +
        "*\"Fantastisk service — bilen kører som ny!\"*"
    );
}

// ─── Medarbejdere ─────────────────────────────────────────────────────────────

export function payrollEmbed() {
  return createEmbed("discord")
    .setTitle("Ordre- & lønsystem")
    .setDescription(
      headerBlock("📦 Internt — KUN medarbejdere", "Læs dette før du starter vagt") +
        "\n\n" +
        company.payroll
    )
    .addFields(
      {
        name: "🎯 Profit-mål",
        value: `Vi sigter **altid** efter minimum **${company.profitTarget.toLocaleString("da-DK")} kr.** i profit per ordre efter materialer og løn.`,
        inline: false,
      },
      {
        name: "✅ Ingame ordresystem",
        value: "Kunde bestiller via ordresystem → **automatisk udbetaling** til dig",
        inline: false,
      },
      {
        name: "📸 Uden ordre i system",
        value: "Upload **screenshot af faktura** i din personlige `#💰-løn-[dit-navn]` kanal",
        inline: false,
      },
      {
        name: "⚠️ VIGTIGT — Læs dette",
        value: company.staffGuidelines.map((g) => `▸ ${g}`).join("\n"),
        inline: false,
      },
      {
        name: "📋 Lønregler",
        value: company.payrollRules.map((r) => `▸ ${r}`).join("\n"),
        inline: false,
      }
    )
}

export function staffGuidelinesEmbed() {
  return createEmbed("warning")
    .setTitle("⚠️ Regler for mekanikere")
    .setDescription(
      headerBlock("Før du tager en ordre", "Profit og priser — ikke forhandlingsbart") +
        "\n\n" +
        company.staffGuidelines.map((g) => `▸ ${g}`).join("\n") +
        "\n\n" +
        `🎯 **Profit-mål:** Minimum **${company.profitTarget.toLocaleString("da-DK")} kr.** per ordre.\n` +
        `💲 **Priser:** Følg **#priser** — ved tvivl, spørg ledelse **før** du accepterer.`
    )
}

export function absenceTicketEmbed() {
  return createEmbed("blue")
    .setTitle("Fravær & orlov")
    .setDescription(
      headerBlock("📅 Medarbejder-fravær", "Kun for Lærling, Mekaniker & ledelse") +
        "\n\n" +
        "Skal du melde fravær? Opret en ticket — ledelsen får besked med det samme.\n\n" +
        fieldBlock("📝", "Angiv i ticketten", [
          "Ingame navn",
          "Fraværsperiode (fra–til)",
          "Grund (ferie, syg, eksamen, osv.)",
          "Evt. dækning eller vagtbytte",
        ]) +
        "\n\n" +
        "*Én åben fraværs-ticket ad gangen per medarbejder.*"
    );
}

export function salarySystemEmbed() {
  return createEmbed("accent")
    .setTitle("Personlige løn-kanaler")
    .setDescription(
      headerBlock("💰 Løn & Faktura", "Én privat kanal per medarbejder") +
        "\n\n" +
        fieldBlock("📁", "Din kanal", [
          "Hver mekaniker får `#💰-løn-[dit-navn]`",
          "Kun **du** og **ledelse/ejere** kan se kanalen",
          "Upload alle faktura-screenshots her",
        ]) +
        "\n\n" +
        fieldBlock("⚡", "Automatisk løn", [
          "Ordre via ingame system = automatisk betaling",
          "Ingen faktura nødvendig",
        ]) +
        "\n\n" +
        fieldBlock("📸", "Manuel faktura", [
          "Arbejde uden ordre → screenshot af faktura i din løn-kanal",
          "Ledelsen behandler det ved lønkørsel",
        ])
    )
}

export function personalSalaryEmbed(member, payroll = null) {
  const pending = payroll?.pendingPay ?? 0;
  const pendingField =
    pending > 0
      ? `\n\n💵 **Udestående løn:** ${pending.toLocaleString("da-DK")} kr.`
      : "\n\n💵 **Udestående løn:** 0 kr.";

  return createEmbed("gold")
    .setTitle(`💰 Løn-kanal — ${member.displayName}`)
    .setDescription(
      headerBlock("Din personlige faktura-kanal", "Kun dig og ledelsen har adgang") +
        "\n\n" +
        fieldBlock("📸", "Upload faktura her", [
          "Send screenshot af **alle fakturaer** for arbejde uden ingame ordre",
          "Én besked per faktura med tydeligt beløb og nummerplade",
          "Ordre via ingame system behøver **ikke** upload — betaling sker automatisk",
          "Løn tælles ud fra **din kanal** — ikke hvem der sender billedet",
        ]) +
        pendingField +
        "\n\n" +
        `🎯 Husk: Vi sigter efter min. **${company.profitTarget.toLocaleString("da-DK")} kr.** profit per ordre.`
    )
    .setThumbnail(member.displayAvatarURL({ size: 256 }));
}

// ─── Setup afslutning ─────────────────────────────────────────────────────────

export function setupCompleteEmbed(results) {
  return createEmbed("success")
    .setTitle("Setup fuldført!")
    .setDescription(
      headerBlock("✅ Benny's Discord er klar", "Serveren er sat op og klar til brug") +
        "\n\n" +
        fieldBlock("📊", "Oprettet", [
          `${results.categories} kategorier`,
          `${results.channels} kanaler`,
          `${results.messages} panel-beskeder`,
          `${results.roles} roller`,
          `${results.rolesAssigned ?? 0} medlemmer fik \`Kunde\``,
          `${results.salaryChannels ?? 0} personlige løn-kanaler`,
          "Fuld moderation (`/mod`) · tickets med transcripts · automoderation",
        ]) +
        "\n\n" +
        fieldBlock("📌", "Næste skridt", [
          "Tildel **`Lærling`**, **`Mekaniker`**, **`Ledelse`**, **`Med-ejer`** & **`Stifter`** efter behov",
          "Nye medlemmer får **`Kunde`** automatisk ved join (kræver MEMBER_INTENT)",
          "Hold botten online 24/7 — tickets, roller & moderation kører via denne bot",
        ])
    )
    .setTimestamp();
}

export function welcomeAnnouncementEmbed() {
  return createEmbed("dark")
    .setTitle("📣 Discord er live!")
    .setDescription(
      `${brand.divider}\n\n` +
        "Hele **Benny's Original Motor Works** Discord er nu sat op og klar!\n\n" +
        "Udforsk kanalerne, vælg dine roller og kig forbi Strawberry værkstedet.\n\n" +
        fieldBlock("📍", "Placering", company.location)
    )
    .setTimestamp();
}
