"use client";

import { RefreshCw } from "lucide-react";
import type { BotSnapshot } from "@/lib/types";

export function Header({
  title,
  subtitle,
  snapshot,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  snapshot: BotSnapshot | null;
  onRefresh?: () => void;
}) {
  const online = snapshot?.bot?.online;

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-benny-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="glass-card flex items-center gap-2 px-4 py-2">
          <span
            className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-400"}`}
          />
          <span className="text-sm text-white/80">{snapshot?.bot?.tag ?? "Bot offline"}</span>
        </div>
        {snapshot?.guild && (
          <div className="glass-card hidden px-4 py-2 sm:block">
            <span className="text-sm text-benny-muted">{snapshot.guild.name}</span>
          </div>
        )}
        {onRefresh && (
          <button type="button" onClick={onRefresh} className="btn-ghost" title="Opdater">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
