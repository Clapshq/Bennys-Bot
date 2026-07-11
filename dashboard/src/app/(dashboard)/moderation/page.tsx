"use client";

import { useState } from "react";
import { Shield, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function ModerationPage() {
  const { snapshot, refresh } = useSnapshot();
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  const blocked = snapshot?.blockedWords ?? [];
  const cases = (snapshot?.modCases ?? []).slice(0, 30);

  async function addWord() {
    if (!word.trim()) return;
    setBusy(true);
    try {
      await sendCommand("ADD_BLOCKED_WORD", { word: word.trim() });
      setWord("");
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  async function removeWord(w: string) {
    setBusy(true);
    try {
      await sendCommand("REMOVE_BLOCKED_WORD", { word: w });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Moderation" subtitle="Blokerede ord og mod-historik" snapshot={snapshot} onRefresh={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Shield className="h-4 w-4 text-benny-gold" />
            Blokerede ord
          </h2>
          <div className="mt-4 flex gap-2">
            <input className="input-field" placeholder="Nyt ord..." value={word} onChange={(e) => setWord(e.target.value)} />
            <button type="button" className="btn-primary" disabled={busy} onClick={addWord}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {blocked.map((w) => (
              <span key={w} className="badge-muted flex items-center gap-1">
                {w}
                <button type="button" onClick={() => removeWord(w)} className="hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel max-h-[400px] overflow-y-auto p-6">
          <h2 className="font-display font-semibold">Seneste mod-sager</h2>
          <div className="mt-4 space-y-2">
            {cases.map((c: Record<string, unknown>, i) => (
              <div key={i} className="rounded-lg bg-benny-card/50 px-3 py-2 text-sm">
                <span className="font-medium">{String(c.action ?? c.type ?? "sag")}</span>
                <span className="text-benny-muted"> — {String(c.targetTag ?? c.userId ?? "")}</span>
              </div>
            ))}
            {!cases.length && <p className="text-sm text-benny-muted">Ingen sager</p>}
          </div>
        </div>
      </div>
    </>
  );
}
