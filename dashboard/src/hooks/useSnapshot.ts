"use client";

import { useCallback, useEffect, useState } from "react";
import type { BotSnapshot } from "@/lib/types";

export function useSnapshot(pollMs = 15_000) {
  const [snapshot, setSnapshot] = useState<BotSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot");
      if (!res.ok) throw new Error("Kunne ikke hente data");
      const data = await res.json();
      setSnapshot(data.snapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { snapshot, loading, error, refresh };
}

export async function sendCommand(commandType: string, payload: Record<string, unknown> = {}) {
  const res = await fetch("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandType, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Kommando fejlede");
  }
  return res.json();
}
