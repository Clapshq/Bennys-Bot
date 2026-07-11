"use client";

import { Ticket, ClipboardList, Gift, Coins, Users, AlertTriangle } from "lucide-react";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { useSnapshot } from "@/hooks/useSnapshot";
import { formatKr } from "@/lib/types";

export default function OverviewPage() {
  const { snapshot, loading, refresh } = useSnapshot();

  if (loading && !snapshot) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-benny-gold border-t-transparent" />
      </div>
    );
  }

  const stats = snapshot?.stats;
  const totalPending = (snapshot?.payroll ?? []).reduce((s, e) => s + (e.pendingPay ?? 0), 0);

  return (
    <>
      <Header
        title="Oversigt"
        subtitle="Live status fra Benny's bot"
        snapshot={snapshot}
        onRefresh={refresh}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Åbne tickets" value={stats?.openTickets ?? 0} icon={Ticket} accent="blue" />
        <StatCard
          label="Ansøgninger"
          value={stats?.pendingApplications ?? 0}
          icon={ClipboardList}
          accent="orange"
        />
        <StatCard label="Giveaways" value={stats?.activeGiveaways ?? 0} icon={Gift} accent="green" />
        <StatCard
          label="Udestående løn"
          value={formatKr(totalPending)}
          icon={Coins}
          accent="gold"
          trend={`${snapshot?.payroll?.length ?? 0} medarbejdere`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="font-display text-lg font-semibold">Server</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-benny-muted">Medlemmer</span>
              <span>{snapshot?.guild?.memberCount?.toLocaleString("da-DK") ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-benny-muted">Lukkede tickets</span>
              <span>{stats?.closedTickets ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-benny-muted">Mod-sager</span>
              <span>{stats?.modCases ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-benny-muted">AI konfigureret</span>
              <span>{snapshot?.env?.aiConfigured ? "Ja" : "Nej"}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="font-display text-lg font-semibold">Løn — hurtig oversigt</h2>
          <div className="mt-4 space-y-2">
            {(snapshot?.payroll ?? []).slice(0, 6).map((emp) => (
              <div key={emp.userId} className="flex items-center justify-between rounded-lg bg-benny-card/60 px-3 py-2 text-sm">
                <span>{emp.channelName?.replace(/^løn-|^💰-?løn-/i, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ?? emp.userTag}</span>
                <span className={emp.pendingPay > 0 ? "text-benny-gold font-medium" : "text-benny-muted"}>
                  {emp.pendingPay > 0 ? formatKr(emp.pendingPay) : "Intet"}
                </span>
              </div>
            ))}
            {!snapshot?.payroll?.length && (
              <p className="text-sm text-benny-muted">Ingen løn-data endnu</p>
            )}
          </div>
        </div>
      </div>

      {!snapshot?.bot?.online && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Botten ser offline ud — data kan være forældet.
        </div>
      )}
    </>
  );
}
