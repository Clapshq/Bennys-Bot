"use client";

import { useState } from "react";
import { Coins, UserPlus, Banknote, RefreshCw } from "lucide-react";
import { Header } from "@/components/header";
import { useSnapshot, sendCommand } from "@/hooks/useSnapshot";
import { displayNameFromChannel, formatKr } from "@/lib/types";

export default function PayrollPage() {
  const { snapshot, refresh } = useSnapshot();
  const [busy, setBusy] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const employees = [...(snapshot?.payroll ?? [])].sort((a, b) => (b.pendingPay ?? 0) - (a.pendingPay ?? 0));
  const totalPending = employees.reduce((s, e) => s + (e.pendingPay ?? 0), 0);

  async function payout(userId: string, name: string) {
    if (!confirm(`Udbetal løn til ${name}?`)) return;
    setBusy(userId);
    setMsg(null);
    try {
      await sendCommand("PAYOUT_EMPLOYEE", { userId });
      setMsg(`Udbetalings-kommando sendt for ${name}`);
      setTimeout(refresh, 2000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(null);
    }
  }

  async function createChannel() {
    if (!userId.trim()) return;
    setBusy("create");
    setMsg(null);
    try {
      await sendCommand("CREATE_SALARY_CHANNEL", { userId: userId.trim() });
      setMsg("Løn-kanal oprettes...");
      setUserId("");
      setTimeout(refresh, 3000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fejl");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header title="Løn" subtitle="Faktura → 20% udbetaling · live fra bot" snapshot={snapshot} onRefresh={refresh} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wider text-benny-muted">Total udestående</p>
          <p className="mt-2 font-display text-3xl font-bold text-benny-gold">{formatKr(totalPending)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wider text-benny-muted">Medarbejdere</p>
          <p className="mt-2 font-display text-3xl font-bold">{employees.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wider text-benny-muted">Auto-scan</p>
          <p className="mt-2 font-display text-3xl font-bold">{snapshot?.env?.payrollAutoScan ? "Aktiv" : "Fra"}</p>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-benny-gold/30 bg-benny-gold/10 px-4 py-3 text-sm text-benny-gold">
          {msg}
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-benny-border/60 bg-benny-card/50">
              <th className="px-5 py-3 font-medium text-benny-muted">Medarbejder</th>
              <th className="px-5 py-3 font-medium text-benny-muted">Kanal</th>
              <th className="px-5 py-3 font-medium text-benny-muted">Billeder</th>
              <th className="px-5 py-3 font-medium text-benny-muted">Udestående</th>
              <th className="px-5 py-3 font-medium text-benny-muted">Udbetalt i alt</th>
              <th className="px-5 py-3 font-medium text-benny-muted"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const name = displayNameFromChannel(emp.channelName) || emp.userTag?.split("#")[0] || emp.userId;
              return (
                <tr key={emp.userId} className="border-b border-benny-border/30 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-medium">{name}</td>
                  <td className="px-5 py-4 text-benny-muted">#{emp.channelName ?? "—"}</td>
                  <td className="px-5 py-4">{emp.invoiceCount ?? 0}</td>
                  <td className="px-5 py-4">
                    {emp.pendingPay > 0 ? (
                      <span className="font-semibold text-benny-gold">{formatKr(emp.pendingPay)}</span>
                    ) : (
                      <span className="text-benny-muted">Intet</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-benny-muted">{formatKr(emp.totalPaid ?? 0)}</td>
                  <td className="px-5 py-4">
                    {emp.pendingPay > 0 && (
                      <button
                        type="button"
                        disabled={busy === emp.userId}
                        onClick={() => payout(emp.userId, name)}
                        className="btn-ghost text-xs"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        Udbetal
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!employees.length && (
          <p className="p-8 text-center text-benny-muted">Ingen løn-data — tjek at botten kører med dashboard aktiveret</p>
        )}
      </div>

      <div className="mt-6 glass-panel p-6">
        <h3 className="flex items-center gap-2 font-display font-semibold">
          <UserPlus className="h-4 w-4 text-benny-gold" />
          Opret løn-kanal
        </h3>
        <div className="mt-4 flex gap-3">
          <input
            className="input-field max-w-xs"
            placeholder="Discord bruger-ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button type="button" className="btn-primary" disabled={busy === "create"} onClick={createChannel}>
            {busy === "create" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            Opret
          </button>
        </div>
      </div>
    </>
  );
}
