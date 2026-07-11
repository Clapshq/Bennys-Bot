/** Mekaniker-ansøgning via DM (Apply-stil) */
export const mechanicApplication = {
  type: "mechanic",
  ticketType: "mechanic_apply",
  totalSteps: 7,
  cancelKeyword: "annuller",
  /** Max tid at færdiggøre DM-flow (fra sidste svar) */
  sessionTimeoutMs: 3 * 60 * 60 * 1000,
  /** Mindste tid fra start til indsendelse */
  minCompletionMs: 5 * 60 * 1000,
  reapplyCooldownMs: 5 * 60 * 1000,
  /** Ventetid efter afvisning */
  denyReapplyCooldownMs: 30 * 60 * 1000,
  /** Bekræft indsendelse efter sidste spørgsmål */
  confirmKeyword: "bekræft",
  questions: [
    "Hvad er dit navn?",
    "Hvad er din motivation?",
    "Hvad synes du er en god arbejdsplads?",
    "Hvorfor søger du ind lige præcis ved os?",
    "Har du tidligere erfaring? (hvis ja uddyb)",
    "Hvad synes du er god kunde service?",
    "Er der andet vi skal vide om dig?",
  ],
};
