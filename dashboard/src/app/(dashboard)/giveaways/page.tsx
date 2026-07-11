"use client";

import { useState } from "react";
import { Gift, StopCircle } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function GiveawaysPage() {
  const { snapshot, refresh } = useSnapshot();
  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [duration, setDuration] = useState("1h");
  const [winners, setWinners] = useState("1");
  const [busy, setBusy] = useState(false);

  const active = snapshot?.giveaways ?? [];

  async function start() {
    if (!channelId || !prize) return;
    setBusy(true);
    try {
      await sendCommand("START_GIVEAWAY", {
        channelId,
        prize,
        duration,
        winners: Number(winners) || 1,
      });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  async function end(messageId: string) {
    setBusy(true);
    try {
      await sendCommand("END_GIVEAWAY", { messageId });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Giveaways" subtitle={`${active.length} aktive`} snapshot={snapshot} onRefresh={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="font-display font-semibold">Opret giveaway</h2>
          <div className="mt-4 space-y-3">
            <input className="input-field" placeholder="Kanal-ID" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            <input className="input-field" placeholder="Præmie" value={prize} onChange={(e) => setPrize(e.target.value)} />
            <div className="flex gap-3">
              <input className="input-field" placeholder="Varighed (fx 1h)" value={duration} onChange={(e) => setDuration(e.target.value)} />
              <input className="input-field w-24" placeholder="Vindere" value={winners} onChange={(e) => setWinners(e.target.value)} />
            </div>
            <button type="button" className="btn-primary" disabled={busy} onClick={start}>
              <Gift className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="font-display font-semibold">Aktive</h2>
          <div className="mt-4 space-y-3">
            {active.map((g: Record<string, unknown>) => (
              <div key={String(g.messageId)} className="flex items-center justify-between rounded-xl bg-benny-card/60 p-3">
                <div>
                  <p className="font-medium">{String(g.prize)}</p>
                  <p className="text-xs text-benny-muted">{String(g.hostTag ?? "")}</p>
                </div>
                <button type="button" className="btn-ghost text-xs text-red-400" disabled={busy} onClick={() => end(String(g.messageId))}>
                  <StopCircle className="h-3.5 w-3.5" />
                  Afslut
                </button>
              </div>
            ))}
            {!active.length && <p className="text-sm text-benny-muted">Ingen aktive giveaways</p>}
          </div>
        </div>
      </div>
    </>
  );
}
