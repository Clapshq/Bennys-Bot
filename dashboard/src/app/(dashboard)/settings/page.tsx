"use client";

import { RefreshCw, Zap, Shield, Bot } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function SettingsPage() {
  const { snapshot, refresh } = useSnapshot();
  const env = snapshot?.env;

  async function syncNow() {
    await sendCommand("SYNC_SNAPSHOT", {});
    setTimeout(refresh, 2000);
  }

  async function refreshPanels() {
    await sendCommand("REFRESH_PANELS", { scope: "alle" });
    alert("Panel-refresh sendt til bot");
  }

  return (
    <>
      <Header title="Indstillinger" subtitle="Bot-status og vedligehold" snapshot={snapshot} onRefresh={refresh} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card p-5">
          <Bot className="mb-2 h-5 w-5 text-benny-gold" />
          <p className="text-sm text-benny-muted">Bot</p>
          <p className="font-semibold">{snapshot?.bot?.tag ?? "—"}</p>
          <p className="mt-1 text-xs text-benny-muted">{snapshot?.bot?.online ? "Online" : "Offline"}</p>
        </div>
        <div className="glass-card p-5">
          <Shield className="mb-2 h-5 w-5 text-blue-400" />
          <p className="text-sm text-benny-muted">Moderation</p>
          <p className="font-semibold">{env?.moderation ? "Aktiv" : "Fra"}</p>
        </div>
        <div className="glass-card p-5">
          <Zap className="mb-2 h-5 w-5 text-emerald-400" />
          <p className="text-sm text-benny-muted">AI / Løn-scan</p>
          <p className="font-semibold">{env?.aiConfigured ? "Groq OK" : "Mangler API"}</p>
        </div>
      </div>

      <div className="mt-8 glass-panel p-6">
        <h2 className="font-display font-semibold">Handlinger</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={syncNow}>
            <RefreshCw className="h-4 w-4" />
            Tving snapshot-sync
          </button>
          <button type="button" className="btn-ghost" onClick={refreshPanels}>
            Opdater alle paneler
          </button>
        </div>
      </div>

      <div className="mt-6 glass-panel p-6">
        <h2 className="font-display font-semibold">Transcripts</h2>
        <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {(snapshot?.transcripts ?? []).slice(0, 10).map((t: Record<string, unknown>) => (
            <div key={String(t.id)} className="flex justify-between text-sm">
              <span>#{String(t.ticketNumber)} {String(t.channelName ?? "")}</span>
              {t.publicUrl ? (
                <a href={String(t.publicUrl)} target="_blank" rel="noreferrer" className="text-benny-gold hover:underline">
                  Åbn
                </a>
              ) : (
                <span className="text-benny-muted">Lokal</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
