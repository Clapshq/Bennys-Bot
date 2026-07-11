/**
 * Benny's ticket-system — mekaniker-RP kategorier, modals og staff-flows.
 */
export const ticketConfig = {
  categories: [
    {
      id: "order",
      label: "Bestilling",
      emoji: "🔧",
      description: "Reparation, tuning, styling eller service",
      modal: null,
      pingLedelse: false,
      welcomeHint: "Beskriv køretøj, nummerplade og ønsket arbejde. Vedhæft gerne billeder.",
    },
    {
      id: "quote",
      label: "Prisoverslag",
      emoji: "💲",
      description: "Få et tilbud inden du booker",
      modal: "quote",
      pingLedelse: false,
      welcomeHint: "Vi vender tilbage med et estimat baseret på dine oplysninger.",
    },
    {
      id: "tow",
      label: "Bugsering",
      emoji: "🚛",
      description: "Køretøj skal hentes eller transporteres",
      modal: "tow",
      pingLedelse: false,
      welcomeHint: "Angiv lokation og køretøj — en mekaniker koordinerer bugsering.",
    },
    {
      id: "support",
      label: "Generelt support",
      emoji: "💬",
      description: "Spørgsmål, hjælp eller andet — vi hjælper dig",
      modal: null,
      pingLedelse: false,
      welcomeHint: "Beskriv dit spørgsmål — en mekaniker vender tilbage hurtigst muligt.",
    },
    {
      id: "contact",
      label: "Henvendelse",
      emoji: "📩",
      description: "Generelle spørgsmål om Benny's",
      modal: null,
      pingLedelse: false,
      staffOpenOnly: true,
      welcomeHint: "Stil dit spørgsmål — vi svarer så hurtigt vi kan.",
    },
    {
      id: "warranty",
      label: "Reklamation",
      emoji: "🛡️",
      description: "Problem med tidligere arbejde hos os",
      modal: "warranty",
      pingLedelse: false,
      welcomeHint: "Vi gennemgår din sag og finder en fair løsning.",
    },
    {
      id: "complaint",
      label: "Klage over service",
      emoji: "😤",
      description: "Utilfreds med en mekaniker eller oplevelse",
      modal: "complaint",
      pingLedelse: true,
      welcomeHint: "Din klage behandles fortroligt af ledelsen.",
    },
    {
      id: "workshop_ban",
      label: "Banlyst — søg adgang",
      emoji: "🚫",
      description: "Du er bandlyst fra værkstedet og vil ansøge om at komme tilbage",
      modal: "workshop_ban",
      pingLedelse: true,
      onePerUser: true,
      welcomeHint:
        "Ledelsen gennemgår din ansøgning. Vær ærlig og detaljeret — **Godkend/Afvis** knapperne nedenfor bruges af ledelse.",
    },
    {
      id: "report",
      label: "Anmeldelse",
      emoji: "🚨",
      description: "Regelbrud ved eller omkring værkstedet",
      modal: "report",
      pingLedelse: true,
      staffOpenOnly: true,
      welcomeHint: "Beskriv hvad der skete. Bevis (screenshots) er en stor hjælp.",
    },
    {
      id: "mechanic_apply",
      label: "Mekaniker-ansøgning",
      emoji: "📋",
      description: "Godkendt ansøgning — oprettes automatisk via DM-flow",
      modal: null,
      pingLedelse: true,
      onePerUser: true,
      staffOpenOnly: true,
      welcomeHint: "Ledelsen tager den videre her i ticketten efter godkendt DM-ansøgning.",
    },
    {
      id: "partnership",
      label: "Partnerskab",
      emoji: "🤝",
      description: "Samarbejde eller RP-partnerskab med Benny's",
      modal: null,
      pingLedelse: true,
      staffOpenOnly: true,
      welcomeHint: "Beskriv dit forslag til samarbejde.",
    },
    {
      id: "absence",
      label: "Fravær",
      emoji: "📅",
      description: "Meld fravær eller orlov — kun medarbejdere",
      modal: "absence",
      pingLedelse: true,
      onePerUser: true,
      staffOnly: true,
      welcomeHint: "Ledelsen modtager din fraværsanmeldelse og vender tilbage her i ticketten.",
    },
  ],

  inactiveAutoCloseHours: parseInt(process.env.TICKET_INACTIVE_HOURS ?? "72", 10),
  ratingEnabled: true,
  internalNotesEnabled: true,
  maxOpenTicketsPerUser: 3,

  /** Typer der kræver ledelse til godkendelse */
  ledelseDecisionTypes: ["workshop_ban"],

  /** Kun disse typer vises i #kontakt */
  kontaktIncludedTypes: ["support", "workshop_ban", "complaint", "quote"],

  /** Interne tickets uden kunde-rating ved lukning */
  noRatingTypes: ["absence"],

  /** Auto-luk ikke ban-ansøgninger før ledelse har taget stilling */
  autoCloseExemptUntilDecision: ["workshop_ban"],

  /** Advarsel X timer før auto-luk (0 = 24t før threshold) */
  inactiveWarningHoursBefore: 24,

  /** Modal-feltdefinitioner */
  modalFields: {
    workshop_ban: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true, placeholder: "Fx. John Doe" },
      { id: "ban_reason", label: "Hvorfor blev du bandlyst?", style: "paragraph", required: true, placeholder: "Hvad skete der? Hvornår?" },
      { id: "appeal_reason", label: "Hvorfor skal du have adgang igen?", style: "paragraph", required: true, placeholder: "Forklar din situation" },
      { id: "changed", label: "Hvad vil du gøre anderledes?", style: "paragraph", required: true, placeholder: "Vis at du tager det seriøst" },
    ],
    complaint: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "incident", label: "Hvad skete der?", style: "paragraph", required: true },
      { id: "staff_involved", label: "Hvilken mekaniker/staff? (hvis kendt)", style: "short", required: false },
      { id: "desired", label: "Hvad ønsker du som løsning?", style: "paragraph", required: true },
    ],
    warranty: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "plate", label: "Nummerplade", style: "short", required: true },
      { id: "original_work", label: "Hvad blev lavet tidligere?", style: "paragraph", required: true },
      { id: "issue", label: "Hvad er problemet nu?", style: "paragraph", required: true },
    ],
    tow: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "plate", label: "Nummerplade", style: "short", required: true },
      { id: "location", label: "Køretøjets lokation", style: "paragraph", required: true, placeholder: "Postnr / gade / landmark" },
      { id: "details", label: "Ekstra info", style: "short", required: false },
    ],
    quote: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "vehicle", label: "Køretøj", style: "short", required: true },
      { id: "work", label: "Ønsket arbejde", style: "paragraph", required: true },
      { id: "budget", label: "Budget (valgfrit)", style: "short", required: false },
    ],
    report: [
      { id: "ingame_name", label: "Dit ingame navn", style: "short", required: true },
      { id: "target", label: "Hvem/hvad anmeldes?", style: "short", required: true },
      { id: "details", label: "Beskrivelse af hændelsen", style: "paragraph", required: true },
    ],
    mechanic_apply: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "experience", label: "Erfaring som mekaniker", style: "paragraph", required: true },
      { id: "motivation", label: "Hvorfor Benny's?", style: "paragraph", required: true },
      { id: "availability", label: "Tilgængelighed", style: "short", required: true, placeholder: "Fx. hverdage 18-22" },
    ],
    absence: [
      { id: "ingame_name", label: "Ingame navn", style: "short", required: true },
      { id: "period", label: "Fraværsperiode", style: "short", required: true, placeholder: "Fx. 21/6 – 28/6" },
      { id: "reason", label: "Grund til fravær", style: "paragraph", required: true, placeholder: "Sygemelding, ferie, eksamen, osv." },
      { id: "notes", label: "Ekstra info (valgfri)", style: "paragraph", required: false, placeholder: "Dækning, vagter der skal byttes, osv." },
    ],
  },
};

export function getTicketCategory(id) {
  return ticketConfig.categories.find((c) => c.id === id) ?? ticketConfig.categories[0];
}

export function categoryNeedsModal(id) {
  const cat = getTicketCategory(id);
  return Boolean(cat.modal);
}

export function getModalFields(modalKey) {
  return ticketConfig.modalFields[modalKey] ?? [];
}

export function isLedelseDecisionType(type) {
  return ticketConfig.ledelseDecisionTypes.includes(type);
}

export function isStaffOnlyTicketType(type) {
  return ticketConfig.categories.find((c) => c.id === type)?.staffOnly === true;
}

export function isNoRatingTicketType(type) {
  return ticketConfig.noRatingTypes?.includes(type) ?? false;
}

export function getKontaktTicketTypes() {
  return ticketConfig.categories.filter((c) => ticketConfig.kontaktIncludedTypes.includes(c.id));
}

/** Typer staff kan oprette via `/ticket open` */
export function getStaffOpenableTicketTypes() {
  return ticketConfig.categories.filter((c) => !c.staffOnly && !c.staffOpenOnly);
}
