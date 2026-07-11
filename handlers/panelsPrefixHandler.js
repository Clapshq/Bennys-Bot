import { isLedelseMember } from "../utils/modHelpers.js";
import {
  refreshAllPanels,
  refreshOpenTicketControls,
  getPanelStatus,
} from "./panelsHandler.js";

const GROUPS = new Set(["alle", "tickets", "staff", "info"]);

function parseRefreshArgs(args) {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { action: "refresh", scope: "alle", updateTickets: true };

  const sub = parts[0].toLowerCase();
  if (sub === "help") return { action: "help" };
  if (sub === "status") return { action: "status" };

  const noTickets = parts.some((p) => p === "notickets" || p === "--notickets");

  if (sub === "refresh") {
    const scopePart = parts.slice(1).find((p) => p !== "notickets" && p !== "--notickets");
    const scope = scopePart?.toLowerCase() ?? "alle";
    return {
      action: "refresh",
      scope: GROUPS.has(scope) ? scope : "alle",
      updateTickets: !noTickets,
    };
  }

  if (GROUPS.has(sub)) {
    return { action: "refresh", scope: sub, updateTickets: !noTickets };
  }

  return { action: "help" };
}

export async function handlePanelsPrefix(message, args) {
  if (!isLedelseMember(message.member)) {
    await message.reply("❌ Kun **Stifter, Med-ejer eller Ledelse** kan bruge `,panels`.").catch(() => {});
    return true;
  }

  const parsed = parseRefreshArgs(args.trim() ? args : "refresh");

  if (parsed.action === "help") {
    await message
      .reply(
        "**`,panels`** — opdater paneler uden /setup\n\n" +
          "**,panels refresh** — alle paneler + åbne tickets\n" +
          "**,panels refresh tickets** — kun bestillinger, kontakt, ansøgning, fravær\n" +
          "**,panels refresh staff** — ledelse, logs, løn …\n" +
          "**,panels refresh info** — information, chat, priser …\n" +
          "**,panels refresh notickets** — paneler uden ticket-knapper\n" +
          "**,panels status** — vis gemte panel-ID'er\n\n" +
          "Data og pending ansøgninger **røres ikke**."
      )
      .catch(() => {});
    return true;
  }

  if (parsed.action === "status") {
    const rows = getPanelStatus(message.guild);
    const lines = rows.map((r) => {
      const ch = r.channelExists ? `\`${r.channelName}\`` : "⚠️ kanal mangler";
      const msg = r.messageId ? "✅ gemt" : "— ikke gemt";
      return `**${r.label}** · ${ch} · ${msg}`;
    });
    await message
      .reply("📋 **Panel-status**\n\n" + lines.join("\n") + "\n\nBrug `,panels refresh` for at opdatere.")
      .catch(() => {});
    return true;
  }

  const statusMsg = await message.reply("⏳ Opdaterer paneler…").catch(() => null);
  const edit = async (content) => {
    if (statusMsg) await statusMsg.edit(content).catch(() => message.channel.send(content).catch(() => {}));
  };

  try {
    const onProgress = async (msg) => edit(`⏳ ${msg}`);

    const results = await refreshAllPanels(message.guild, {
      group: parsed.scope === "alle" ? "alle" : parsed.scope,
      onProgress,
    });

    let ticketResult = null;
    if (parsed.updateTickets) {
      ticketResult = await refreshOpenTicketControls(message.guild, { onProgress });
    }

    const ok = results.filter((r) => r.ok);
    const fail = results.filter((r) => !r.ok);
    const lines = ok.map((r) => `✅ **${r.label}** — ${r.action === "edited" ? "opdateret" : "oprettet"}`);

    await edit(
      "**Paneler opdateret** — ingen /setup, ingen data slettet.\n\n" +
        (lines.length ? lines.join("\n") : "Ingen paneler matchede.") +
        (fail.length ? `\n\n${fail.map((r) => `❌ ${r.error}`).join("\n")}` : "") +
        (ticketResult ? `\n\n🎫 **${ticketResult.updated}** åbne tickets opdateret.` : "")
    );
  } catch (err) {
    await edit(`❌ Fejl: ${err.message}`);
  }

  return true;
}

export function isPanelsCommand(command) {
  return command === "panels";
}
