/** Panel-nøgler til kanalnavne — bruges af setup og /panels refresh */
export const PANEL_CHANNEL_MAP = {
  "📣-information": "information",
  "📋-ansøgning": "ansogning",
  "📞-kontakt": "kontakt",
  "⏳-reaktions-roller": "reaktions_roller",
  "📋-bestillinger": "bestillinger",
  "💲-priser": "priser",
  "👨-chat": "chat",
  "🔧-ansatte-chat": "ansatte_chat",
  "📋-fravær": "fravaer",
  "📦-ordrer-og-løn": "ordrer_lon",
  "📋-mod-log": "mod_log",
  "📜-ticket-logs": "ticket_logs",
  "👔-ledelse": "ledelse",
  "📋-ansøgninger": "ansogninger_review",
  "📋-løn-system": "lon_system",
};

export const PANEL_GROUPS = {
  tickets: ["bestillinger", "kontakt", "ansogning", "fravaer"],
  staff: ["ansogninger_review", "ledelse", "ticket_logs", "mod_log", "fravaer", "ordrer_lon", "lon_system", "ansatte_chat"],
  info: ["information", "chat", "priser", "reaktions_roller"],
};

export function panelKeysForGroup(group) {
  if (!group || group === "alle") return Object.values(PANEL_CHANNEL_MAP);
  return PANEL_GROUPS[group] ?? null;
}

export function channelNameForPanelKey(key) {
  return Object.entries(PANEL_CHANNEL_MAP).find(([, v]) => v === key)?.[0] ?? null;
}
