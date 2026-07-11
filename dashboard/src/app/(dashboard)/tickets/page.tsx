"use client";

import { useState } from "react";
import { Ticket, X, FileText, Star } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function TicketsPage() {
  const { snapshot, refresh } = useSnapshot();
  const [busy, setBusy] = useState<string | null>(null);

  const open = snapshot?.openTickets ?? [];
  const closed = (snapshot?.closedTickets ?? []).slice(0, 20);

  async function closeTicket(channelId: string) {
    const reason = prompt("Grund til lukning (valgfrit):") ?? "Lukket via dashboard";
    const ratingStr = prompt("Rating 1-5 (valgfrit, tom = ingen):");
    const rating = ratingStr ? Number(ratingStr) : null;
    setBusy(channelId);
    try {
      await sendCommand("CLOSE_TICKET", { channelId, reason, rating });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(null);
    }
  }

  async function transcript(channelId: string) {
    setBusy(`t-${channelId}`);
    try {
      await sendCommand("GENERATE_TRANSCRIPT", { channelId });
      alert("Transcript genereres — tjek transcripts om lidt");
      setTimeout(refresh, 3000);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header title="Tickets" subtitle={`${open.length} åbne · ${snapshot?.stats?.closedTickets ?? 0} lukkede`} snapshot={snapshot} onRefresh={refresh} />

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <Ticket className="h-5 w-5 text-blue-400" />
          Åbne tickets
        </h2>
        <div className="grid gap-3">
          {open.map((t: Record<string, unknown>) => (
            <div key={String(t.channelId)} className="glass-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">#{String(t.channelName ?? t.channelId)}</p>
                <p className="text-sm text-benny-muted">
                  {String(t.ticketType ?? "ticket")} · {String(t.openerTag ?? t.openerId ?? "")}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-xs" disabled={busy === String(t.channelId)} onClick={() => transcript(String(t.channelId))}>
                  <FileText className="h-3.5 w-3.5" />
                  Transcript
                </button>
                <button type="button" className="btn-ghost text-xs text-red-400" disabled={busy === String(t.channelId)} onClick={() => closeTicket(String(t.channelId))}>
                  <X className="h-3.5 w-3.5" />
                  Luk
                </button>
              </div>
            </div>
          ))}
          {!open.length && <p className="text-benny-muted">Ingen åbne tickets</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Senest lukkede</h2>
        <div className="glass-panel divide-y divide-benny-border/30">
          {closed.map((t: Record<string, unknown>) => (
            <div key={String(t.key ?? t.channelId)} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>#{String(t.channelName ?? "")}</span>
              <div className="flex items-center gap-3 text-benny-muted">
                {t.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-benny-gold" />
                    {String(t.rating)}
                  </span>
                )}
                <span>{t.closedAt ? new Date(String(t.closedAt)).toLocaleDateString("da-DK") : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
