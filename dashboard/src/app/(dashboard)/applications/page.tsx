"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";

export default function ApplicationsPage() {
  const { snapshot, refresh } = useSnapshot();
  const [busy, setBusy] = useState<string | null>(null);

  const pending = (snapshot?.applications ?? []).filter((a: Record<string, unknown>) => a.status === "pending");
  const rest = (snapshot?.applications ?? []).filter((a: Record<string, unknown>) => a.status !== "pending");

  async function approve(id: string) {
    setBusy(id);
    try {
      await sendCommand("APPROVE_APPLICATION", { applicationId: id });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(null);
    }
  }

  async function deny(id: string) {
    const reason = prompt("Afvisningsgrund:") ?? "Afvist via dashboard";
    setBusy(id);
    try {
      await sendCommand("DENY_APPLICATION", { applicationId: id, reason });
      setTimeout(refresh, 2000);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header title="Ansøgninger" subtitle={`${pending.length} afventer gennemgang`} snapshot={snapshot} onRefresh={refresh} />

      <div className="space-y-4">
        {pending.map((app: Record<string, unknown>) => (
          <div key={String(app.id)} className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{String(app.userTag ?? app.userId)}</p>
                <p className="mt-1 text-sm text-benny-muted">
                  Ansøgt {app.submittedAt ? new Date(String(app.submittedAt)).toLocaleString("da-DK") : ""}
                </p>
                {Array.isArray(app.answers) && (
                  <div className="mt-3 max-h-40 overflow-y-auto text-sm text-white/80">
                    {(app.answers as string[]).slice(0, 3).map((a, i) => (
                      <p key={i} className="mt-1 line-clamp-2">
                        <span className="text-benny-muted">Svar {i + 1}:</span> {a}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary text-xs" disabled={busy === String(app.id)} onClick={() => approve(String(app.id))}>
                  <Check className="h-3.5 w-3.5" />
                  Godkend
                </button>
                <button type="button" className="btn-ghost text-xs text-red-400" disabled={busy === String(app.id)} onClick={() => deny(String(app.id))}>
                  <X className="h-3.5 w-3.5" />
                  Afvis
                </button>
              </div>
            </div>
          </div>
        ))}
        {!pending.length && <p className="text-benny-muted">Ingen ventende ansøgninger</p>}
      </div>

      {rest.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">Historik</h2>
          <div className="glass-panel divide-y divide-benny-border/30">
            {rest.slice(0, 15).map((app: Record<string, unknown>) => (
              <div key={String(app.id)} className="flex justify-between px-5 py-3 text-sm">
                <span>{String(app.userTag)}</span>
                <span className={app.status === "approved" ? "text-emerald-400" : "text-red-400"}>
                  {String(app.status)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
